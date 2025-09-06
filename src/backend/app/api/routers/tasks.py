from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.routers.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.membership import ProjectMember
from app.models.task import Task, TaskStatus

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
  project_id: int
  title: str
  description: Optional[str] = None
  assignee_id: Optional[int] = None
  due_date: Optional[date] = None
  priority: Literal["low", "medium", "high"] = "medium"
  status: Literal["todo", "in_progress", "done"] = "todo"


class TaskOut(BaseModel):
  id: int
  project_id: int
  title: str
  description: Optional[str]
  assignee_id: Optional[int]
  due_date: Optional[date]
  priority: Literal["low", "medium", "high"]
  status: Literal["todo", "in_progress", "done"]

  class Config:
    from_attributes = True


class TaskUpdate(BaseModel):
  title: Optional[str] = None
  description: Optional[str] = None
  assignee_id: Optional[int] = None
  due_date: Optional[date] = None
  priority: Optional[Literal["low", "medium", "high"]] = None
  status: Optional[Literal["todo", "in_progress", "done"]] = None


def ensure_member(db: Session, project_id: int, user_id: int):
  if not db.get(Project, project_id):
    raise HTTPException(404, "Project not found")
  mem = db.scalar(select(ProjectMember).where(
    ProjectMember.project_id == project_id,
    ProjectMember.user_id == user_id
  ))
  if not mem:
    raise HTTPException(403, "Not a member of this project")


@router.get("/by-project/{project_id}", response_model=list[TaskOut])
def list_by_project(project_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
  ensure_member(db, project_id, me.id)
  rows = db.scalars(select(Task).where(Task.project_id == project_id).order_by(Task.id.desc())).all()
  return rows


@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
  ensure_member(db, payload.project_id, me.id)

  status_map = {
    "todo": TaskStatus.todo,
    "in_progress": TaskStatus.in_progress,
    "done": TaskStatus.done,
  }

  t = Task(
    project_id=payload.project_id,
    title=payload.title,
    description=payload.description or "",
    assignee_id=payload.assignee_id,
    due_date=payload.due_date,
    priority=payload.priority,
    status=status_map[payload.status],
    created_by_id=me.id,
  )
  db.add(t)
  db.commit()
  db.refresh(t)
  return t


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
  t = db.get(Task, task_id)
  if not t:
    raise HTTPException(404, "Task not found")
  ensure_member(db, t.project_id, me.id)

  if payload.title is not None:
    t.title = payload.title
  if payload.description is not None:
    t.description = payload.description
  if payload.assignee_id is not None:
    t.assignee_id = payload.assignee_id
  if payload.due_date is not None:
    t.due_date = payload.due_date
  if payload.priority is not None:
    t.priority = payload.priority
  if payload.status is not None:
    if payload.status == "todo":
      t.status = TaskStatus.todo
    elif payload.status == "in_progress":
      t.status = TaskStatus.in_progress
    elif payload.status == "done":
      t.status = TaskStatus.done

  db.commit()
  db.refresh(t)
  return t
