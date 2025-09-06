from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.api.routers.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.membership import ProjectMember
from app.models.events import Message  # make sure this model exists

router = APIRouter(prefix="/projects", tags=["messages"])


class MessageIn(BaseModel):
    content: str


class MessageOut(BaseModel):
    id: int
    author: str
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True


def ensure_member(db: Session, project_id: int, user_id: int):
    if not db.get(Project, project_id):
        raise HTTPException(404, "Project not found")
    mem = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    if not mem:
        raise HTTPException(403, "Not a member of this project")


@router.get("/{project_id}/messages", response_model=list[MessageOut])
def list_messages(project_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    ensure_member(db, project_id, me.id)
    rows = db.execute(
        select(Message.id, Message.content, Message.created_at, User.name, User.email)
        .join(User, User.id == Message.author_id)
        .where(Message.project_id == project_id)
        .order_by(Message.id.desc())
    ).all()
    out = []
    for r in rows:
        out.append(
            MessageOut(
                id=int(r.id),
                content=r.content,
                timestamp=r.created_at,
                author=r.name or r.email or "Member",
            )
        )
    return out


@router.post("/{project_id}/messages", response_model=MessageOut, status_code=201)
def create_message(project_id: int, payload: MessageIn, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    ensure_member(db, project_id, me.id)
    m = Message(project_id=project_id, author_id=me.id, content=payload.content)
    db.add(m)
    db.commit()
    db.refresh(m)
    return MessageOut(id=m.id, content=m.content, timestamp=m.created_at, author=me.name or me.email or "Member")
