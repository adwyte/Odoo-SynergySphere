# app/api/routers/tasks.py
from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.routers.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.membership import ProjectMember
from app.models.task import Task, TaskStatus, TaskPriority

router = APIRouter(prefix="/tasks", tags=["tasks"])

# ---------- Schemas ----------

TaskStatusLiteral = Literal["todo", "in-progress", "done"]
TaskPriorityLiteral = Literal["low", "medium", "high"]

class TaskOut(BaseModel):
    id: int
    title: str
    description: str | None = None
    assignee: str
    assigneeAvatar: str | None = None
    status: TaskStatusLiteral
    priority: TaskPriorityLiteral
    dueDate: date | None = None
    createdAt: datetime
    comments: int = 0
    attachments: int = 0

class TaskCreate(BaseModel):
    project_id: int
    title: str = Field(..., min_length=1, max_length=300)
    description: str = ""
    assignee_id: int | None = None
    priority: TaskPriorityLiteral = "medium"
    due_date: date | None = None

class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee_id: int | None = None
    status: TaskStatusLiteral | None = None
    priority: TaskPriorityLiteral | None = None
    due_date: date | None = None

def ensure_member(db: Session, project_id: int, user_id: int):
    exists = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        )
    )
    if not exists:
        raise HTTPException(status_code=403, detail="Not a member of this project")

def to_task_out(t: Task, assignee: User | None) -> TaskOut:
    return TaskOut(
        id=t.id,
        title=t.title,
        description=t.description or "",
        assignee=(assignee.name or assignee.email) if assignee else "Unassigned",
        assigneeAvatar=(assignee.avatar_url if assignee else None),
        status=t.status.value,
        priority=t.priority.value,
        dueDate=t.due_date,
        createdAt=t.created_at,
        comments=0,
        attachments=0,
    )

@router.get("/by-project/{project_id}", response_model=list[TaskOut])
def list_tasks(project_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    ensure_member(db, project_id, me.id)

    rows = db.execute(
        select(Task, User)
        .join(User, User.id == Task.assignee_id, isouter=True)
        .where(Task.project_id == project_id)
        .order_by(Task.id.desc())
    ).all()

    out: list[TaskOut] = []
    for t, assignee in rows:
        out.append(to_task_out(t, assignee))
    return out

@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    p = db.get(Project, payload.project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    ensure_member(db, payload.project_id, me.id)

    assignee: User | None = None
    if payload.assignee_id:
        assignee = db.get(User, payload.assignee_id)
        if not assignee:
            raise HTTPException(status_code=400, detail="Assignee not found")
        # Ensure assignee is in project
        ensure_member(db, payload.project_id, payload.assignee_id)

    t = Task(
        project_id=payload.project_id,
        title=payload.title,
        description=payload.description or "",
        assignee_id=payload.assignee_id,
        status=TaskStatus.todo,
        priority=TaskPriority(payload.priority),
        due_date=payload.due_date,
        created_by_id=me.id,
    )
    db.add(t); db.commit(); db.refresh(t)

    return to_task_out(t, assignee)

@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    t = db.get(Task, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    ensure_member(db, t.project_id, me.id)

    if payload.title is not None:
        t.title = payload.title
    if payload.description is not None:
        t.description = payload.description
    if payload.status is not None:
        t.status = TaskStatus(payload.status)
    if payload.priority is not None:
        t.priority = TaskPriority(payload.priority)
    if payload.due_date is not None:
        t.due_date = payload.due_date
    if payload.assignee_id is not None:
        if payload.assignee_id == 0:
            t.assignee_id = None
        else:
            assignee = db.get(User, payload.assignee_id)
            if not assignee:
                raise HTTPException(status_code=400, detail="Assignee not found")
            ensure_member(db, t.project_id, payload.assignee_id)
            t.assignee_id = payload.assignee_id

    db.commit(); db.refresh(t)
    assignee = db.get(User, t.assignee_id) if t.assignee_id else None
    return to_task_out(t, assignee)
