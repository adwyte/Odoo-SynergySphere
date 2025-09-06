from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.db.session import get_db
from app.models.project import Project
from app.models.membership import ProjectMember
from app.models.task import Task, TaskStatus

router = APIRouter(prefix="/projects", tags=["projects"])

def _project_status_expr():
    # completed if all done, overdue if any overdue, else active
    return case(
        (func.bool_and(Task.status == TaskStatus.done), "completed"),
        (func.bool_or((Task.status != TaskStatus.done) & (Task.due_date < func.current_date())), "overdue"),
        else_="active"
    )

@router.get("/")
def list_projects(db: Session = Depends(get_db)):
    q = (
        db.query(
            Project.id,
            Project.name,
            Project.description,
            Project.due_date,
            func.count(ProjectMember.user_id).label("members"),
            func.sum(case((Task.status == TaskStatus.done, 1), else_=0)).label("tasks_completed"),
            func.count(Task.id).label("total_tasks"),
            _project_status_expr().label("status")
        )
        .outerjoin(ProjectMember, ProjectMember.project_id == Project.id)
        .outerjoin(Task, Task.project_id == Project.id)
        .group_by(Project.id)
        .order_by(Project.created_at.desc())
    )
    out = []
    palette = ["bg-blue-500","bg-green-500","bg-purple-500","bg-red-500","bg-yellow-500"]
    for i, r in enumerate(q.all()):
        out.append({
            "id": str(r.id),
            "name": r.name,
            "description": r.description,
            "members": int(r.members or 0),
            "tasksCompleted": int(r.tasks_completed or 0),
            "totalTasks": int(r.total_tasks or 0),
            "dueDate": r.due_date.isoformat() if r.due_date else None,
            "status": r.status,                # "active" | "completed" | "overdue"
            "color": palette[i % len(palette)] # UI sugar
        })
    return out

@router.post("/")
def create_project(payload: dict, db: Session = Depends(get_db)):
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    p = Project(name=name, description=payload.get("description"), due_date=payload.get("due_date"))
    db.add(p); db.commit(); db.refresh(p)
    return {"id": str(p.id), "name": p.name}

@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    # reuse list logic for a single project
    return list_projects(db=[db])  # quick path; or compute same aggregates here
