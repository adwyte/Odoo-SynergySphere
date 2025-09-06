# app/api/routers/members.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.routers.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.membership import ProjectMember, ProjectRole

router = APIRouter(prefix="/projects", tags=["members"])

class MemberOut(BaseModel):
    id: int
    name: str | None
    email: EmailStr
    role: str = "member"
    status: str = "online"
    tasksCompleted: int = 0
    currentProjects: int = 1
    avatar: str | None = None

class AddMemberIn(BaseModel):
    email: EmailStr
    name: str | None = None

def require_member(db: Session, project_id: int, user_id: int):
    exists = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        )
    )
    if not exists:
        raise HTTPException(status_code=403, detail="Not a member of this project")

@router.get("/{project_id}/members", response_model=list[MemberOut])
def list_members(project_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    require_member(db, project_id, me.id)

    rows = db.execute(
        select(User, ProjectMember.role)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .where(ProjectMember.project_id == project_id)
    ).all()

    out: list[MemberOut] = []
    for u, role in rows:
        out.append(MemberOut(
            id=u.id,
            name=u.name,
            email=u.email,
            role=role.value if hasattr(role, "value") else str(role),
            status="online",
            tasksCompleted=0,           # you can compute later if you want
            currentProjects=1,
            avatar=u.avatar_url,
        ))
    return out

@router.post("/{project_id}/members", response_model=MemberOut, status_code=201)
def add_member(project_id: int, payload: AddMemberIn, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    require_member(db, project_id, me.id)

    # find or create user by email (hackathon-friendly)
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user:
        user = User(email=payload.email, name=payload.name or payload.email.split("@")[0], is_active=True)
        db.add(user); db.flush()

    # add membership if not exists
    exists = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id
        )
    )
    if not exists:
        db.add(ProjectMember(project_id=project_id, user_id=user.id, role=ProjectRole.member))
        db.commit()
    else:
        db.rollback()

    return MemberOut(
        id=user.id, name=user.name, email=user.email, role="member",
        status="online", tasksCompleted=0, currentProjects=1, avatar=user.avatar_url
    )
