# app/api/routers/analytics.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.routers.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.membership import ProjectMember
from app.models.task import Task, TaskStatus

router = APIRouter(prefix="/analytics", tags=["analytics"])

class LeaderOut(BaseModel):
    userId: int
    name: str
    avatar: str | None = None
    score: float

def ensure_member(db: Session, project_id: int, user_id: int):
    exists = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        )
    )
    if not exists:
        raise HTTPException(status_code=403, detail="Not a member of this project")

@router.get("/leaderboard/{project_id}", response_model=list[LeaderOut])
def leaderboard(project_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    ensure_member(db, project_id, me.id)

    rows = db.execute(
        select(
            User.id,
            User.name,
            User.avatar_url,
            func.count(Task.id).label("done_ct"),
        )
        .select_from(ProjectMember)
        .join(User, User.id == ProjectMember.user_id)
        .join(Task, (Task.project_id == ProjectMember.project_id) & (Task.assignee_id == User.id), isouter=True)
        .where(ProjectMember.project_id == project_id, Task.status == TaskStatus.done)
        .group_by(User.id, User.name, User.avatar_url)
        .order_by(func.count(Task.id).desc())
    ).all()

    # include members with 0 if needed
    # quick pass: collect existing ids
    have = {r.id for r in rows}
    zeros = db.execute(
        select(User.id, User.name, User.avatar_url)
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .where(ProjectMember.project_id == project_id, User.id.not_in(have))
    ).all()

    out: list[LeaderOut] = []
    for r in rows:
        out.append(LeaderOut(userId=r.id, name=r.name or "Member", avatar=r.avatar_url, score=float(r.done_ct)))
    for z in zeros:
        out.append(LeaderOut(userId=z.id, name=z.name or "Member", avatar=z.avatar_url, score=0.0))

    # final sort
    out.sort(key=lambda x: x.score, reverse=True)
    return out
