from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from pydantic import BaseModel, Field

from app.db.session import get_db
from app.api.routers.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.membership import ProjectMember, ProjectRole
from app.models.task import Task, TaskStatus

router = APIRouter(prefix="/projects", tags=["projects"])


class MemberPreview(BaseModel):
    name: str | None = None
    email: str


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
    membersPreview: list[MemberPreview] = []

    class Config:
        from_attributes = True


def compute_status(total: int, done: int, due: date | None) -> Literal["active", "completed", "overdue"]:
    if total > 0 and done >= total:
        return "completed"
    if due and due < date.today():
        return "overdue"
    return "active"


@router.get("", response_model=list[ProjectCardOut])
def list_my_projects(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    members_ct = (
        select(ProjectMember.project_id, func.count(ProjectMember.user_id).label("members"))
        .group_by(ProjectMember.project_id)
        .subquery()
    )

    tasks_sum = (
        select(
            Task.project_id,
            func.count(Task.id).label("total"),
            func.sum(func.case((Task.status == TaskStatus.done, 1), else_=0)).label("done"),
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
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .join(members_ct, members_ct.c.project_id == Project.id, isouter=True)
        .join(tasks_sum, tasks_sum.c.project_id == Project.id, isouter=True)
        .where(ProjectMember.user_id == me.id)
        .order_by(Project.id.desc())
    )

    rows = db.execute(q).all()
    project_ids = [int(r.id) for r in rows]

    preview_map: dict[int, list[MemberPreview]] = {pid: [] for pid in project_ids}
    if project_ids:
        pv = db.execute(
            select(ProjectMember.project_id, User.name, User.email)
            .join(User, User.id == ProjectMember.user_id)
            .where(ProjectMember.project_id.in_(project_ids))
            .order_by(ProjectMember.project_id, User.id)
        ).all()
        seen: dict[int, int] = {}
        for pid, name, email in pv:
            pid = int(pid)
            seen.setdefault(pid, 0)
            if seen[pid] < 3:
                preview_map[pid].append(MemberPreview(name=name, email=email))
                seen[pid] += 1

    out: list[ProjectCardOut] = []
    palette = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"]
    for idx, r in enumerate(rows):
        due = r.due_date
        total = int(r.totalTasks or 0)
        done = int(r.tasksCompleted or 0)
        out.append(
            ProjectCardOut(
                id=int(r.id),
                name=r.name,
                description=r.description or "",
                members=int(r.members or 1),
                tasksCompleted=done,
                totalTasks=total,
                dueDate=due,
                status=compute_status(total, done, due),
                color=palette[idx % len(palette)],
                membersPreview=preview_map.get(int(r.id), []),
            )
        )
    return out


@router.post("", response_model=ProjectCardOut, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    p = Project(name=payload.name, description=payload.description or "", due_date=payload.due_date)
    db.add(p)
    db.flush()
    db.add(ProjectMember(project_id=p.id, user_id=me.id, role=ProjectRole.owner))
    db.commit()
    db.refresh(p)

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
        membersPreview=[MemberPreview(name=me.name, email=me.email)],
    )


@router.post("/{project_id}/join", status_code=204)
def join_project(project_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")

    exists = db.scalar(
        select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == me.id)
    )
    if exists:
        return
    db.add(ProjectMember(project_id=project_id, user_id=me.id, role=ProjectRole.member))
    db.commit()
