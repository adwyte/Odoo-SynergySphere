from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.membership import ProjectMember
from app.models.user import User
from app.models.project import Project
from app.models.task import Task, TaskStatus

router = APIRouter(prefix="/projects", tags=["members"])

@router.get("/{project_id}/members")
def list_members(project_id: int, db: Session = Depends(get_db)):
    if not db.query(Project).filter(Project.id == project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")
    rows = (
        db.query(
            User.id, User.name, User.email, User.avatar_url,
            func.count(Task.id).filter(Task.status == TaskStatus.done).label("tasks_completed"),
            func.count(Task.id).label("tasks_total"),
        )
        .join(ProjectMember, ProjectMember.user_id == User.id)
        .outerjoin(Task, (Task.assignee_id == User.id) & (Task.project_id == project_id))
        .filter(ProjectMember.project_id == project_id)
        .group_by(User.id, User.name, User.email, User.avatar_url)
        .all()
    )
    return [
        {
            "id": str(r.id),
            "name": r.name or "Member",
            "email": r.email,
            "role": "member",             # MVP
            "status": "online",           # MVP presence
            "tasksCompleted": int(r.tasks_completed or 0),
            "currentProjects": 1,         # MVP
            "avatar": r.avatar_url or "",
        }
        for r in rows
    ]
