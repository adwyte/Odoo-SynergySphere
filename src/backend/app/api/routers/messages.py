from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.thread import ProjectThread, ThreadMessage
from app.models.project import Project
from app.models.user import User

router = APIRouter(prefix="/projects", tags=["messages"])

def _ensure_general_thread(db: Session, project_id: int) -> ProjectThread:
    thr = (
        db.query(ProjectThread)
        .filter(ProjectThread.project_id == project_id, ProjectThread.title == "General")
        .first()
    )
    if thr:
        return thr
    thr = ProjectThread(project_id=project_id, title="General")
    db.add(thr); db.flush()
    return thr

@router.get("/{project_id}/messages")
def list_messages(project_id: int, db: Session = Depends(get_db)):
    if not db.query(Project).filter(Project.id == project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")
    thr = _ensure_general_thread(db, project_id)
    rows = (
        db.query(ThreadMessage, User.name, User.avatar_url)
        .outerjoin(User, User.id == ThreadMessage.author_id)
        .filter(ThreadMessage.thread_id == thr.id)
        .order_by(ThreadMessage.created_at.asc())
        .all()
    )
    return [
        {
            "id": str(m.id),
            "author": name or "Member",
            "authorAvatar": avatar or "",
            "content": m.body,
            "timestamp": m.created_at.isoformat(),
            "isReply": m.parent_message_id is not None,
            "replyTo": str(m.parent_message_id) if m.parent_message_id else None,
        }
        for (m, name, avatar) in rows
    ]

@router.post("/{project_id}/messages")
def post_message(project_id: int, payload: dict, db: Session = Depends(get_db)):
    if not db.query(Project).filter(Project.id == project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")
    thr = _ensure_general_thread(db, project_id)
    body = (payload.get("content") or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="content required")
    msg = ThreadMessage(
        thread_id=thr.id,
        author_id=payload.get("author_id"),
        parent_message_id=payload.get("reply_to_id"),
        body=body,
    )
    db.add(msg); db.commit(); db.refresh(msg)
    return {"id": str(msg.id)}
