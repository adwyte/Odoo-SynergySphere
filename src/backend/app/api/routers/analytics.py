from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.db.session import get_db
from app.models.events import TaskEvent, TaskEventType
from app.models.user import User
from app.models.project import Project

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/leaderboard/{project_id}")
def leaderboard(project_id: int, db: Session = Depends(get_db)):
    if not db.query(Project).filter(Project.id == project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")

    score_expr = func.sum(
        case(
            (TaskEvent.type == TaskEventType.completed, 5),
            (TaskEvent.type == TaskEventType.status_changed, 1),
            (TaskEvent.type == TaskEventType.reassigned, 1),
            (TaskEvent.type == TaskEventType.comment_added, 0.5),
            else_=0,
        )
    ).label("score")

    rows = (
        db.query(User.id, User.name, User.avatar_url, score_expr)
        .join(User, User.id == TaskEvent.actor_id)
        .filter(TaskEvent.project_id == project_id)
        .group_by(User.id, User.name, User.avatar_url)
        .order_by(score_expr.desc())
        .all()
    )
    return [
        {
            "userId": str(r.id),
            "name": r.name or "Member",
            "avatar": r.avatar_url or "",
            "score": float(r.score or 0),
        }
        for r in rows
    ]
