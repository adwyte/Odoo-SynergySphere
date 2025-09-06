from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, case
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.routers.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.membership import ProjectMember, ProjectRole
from app.models.task import Task, TaskStatus

from pydantic import BaseModel, Field

router = APIRouter(prefix="/projects", tags=["projects"])

# ---------- Schemas ----------

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    due_date: date | None = None

class ProjectCardOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    members: int
    tasksCompleted: int
    totalTasks: int
    dueDate: date | None = None
    status: Literal["active", "completed", "overdue"]
    color: str

    class Config:
        from_attributes = True


# ---------- Helpers ----------

def compute_status(total: int, done: int, due: date | None) -> Literal["active", "completed", "overdue"]:
    if total > 0 and done >= total:
        return "completed"
    if due and due < date.today():
        return "overdue"
    return "active"


# ---------- Endpoints ----------

@router.get("", response_model=list[ProjectCardOut])
def list_my_projects(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    """
    Return only projects where the current user is a member,
    shaped exactly like the dashboard expects.
    """
    # members count per project
    members_ct = (
        select(ProjectMember.project_id, func.count(ProjectMember.user_id).label("members"))
        .group_by(ProjectMember.project_id)
        .subquery()
    )

    # tasks summary per project
    tasks_sum = (
        select(
            Task.project_id,
            func.count(Task.id).label("total"),
            func.sum(
                case((Task.status == TaskStatus.done, 1), else_=0)
            ).label("done"),
        )
        .group_by(Task.project_id)
        .subquery()
    )

    q = (
        select(
            Project.id,
            Project.name,
            Project.description,
            Project.due_date,
            members_ct.c.members,
            func.coalesce(tasks_sum.c.done, 0).label("tasksCompleted"),
            func.coalesce(tasks_sum.c.total, 0).label("totalTasks"),
        )
        .select_from(Project)  # be explicit about the FROM root
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .join(members_ct, members_ct.c.project_id == Project.id, isouter=True)
        .join(tasks_sum, tasks_sum.c.project_id == Project.id, isouter=True)
        .where(ProjectMember.user_id == me.id)
        .order_by(Project.id.desc())
    )

    rows = db.execute(q).all()

    # map to response
    out: list[ProjectCardOut] = []
    palette = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"]
    for idx, r in enumerate(rows):
        due = r.due_date
        total = int(r.totalTasks or 0)
        done = int(r.tasksCompleted or 0)
        out.append(ProjectCardOut(
            id=int(r.id),
            name=r.name,
            description=r.description or "",
            members=int(r.members or 1),
            tasksCompleted=done,
            totalTasks=total,
            dueDate=due,
            status=compute_status(total, done, due),
            color=palette[idx % len(palette)],
        ))
    return out


@router.post("", response_model=ProjectCardOut, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    p = Project(name=payload.name, description=payload.description or "", due_date=payload.due_date)
    db.add(p); db.flush()

    # add creator as owner
    db.add(ProjectMember(project_id=p.id, user_id=me.id, role=ProjectRole.owner))
    db.commit(); db.refresh(p)

    # return shaped card (empty counts)
    return ProjectCardOut(
        id=p.id,
        name=p.name,
        description=p.description or "",
        members=1,
        tasksCompleted=0,
        totalTasks=0,
        dueDate=p.due_date,
        status="active",
        color="bg-blue-500",
    )


@router.post("/{project_id}/join", status_code=204)
def join_project(project_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    exists = db.scalar(
        select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == me.id)
    )
    if exists:
        return
    db.add(ProjectMember(project_id=project_id, user_id=me.id, role=ProjectRole.member))
    db.commit()
