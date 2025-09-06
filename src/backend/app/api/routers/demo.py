from datetime import date, timedelta
from random import choice, randint
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.session import get_db
from app.api.routers.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.membership import ProjectMember, ProjectRole
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.comment import TaskComment
from app.models.thread import ProjectThread, ThreadMessage
from app.models.events import TaskEvent, TaskEventType

router = APIRouter(prefix="/demo", tags=["demo"])

@router.post("/bootstrap")
def bootstrap_demo(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    # If the user already has a project, just return it (idempotent)
    existing = db.scalar(select(Project).join(ProjectMember).where(ProjectMember.user_id == me.id))
    if existing:
        return {"project_id": existing.id, "created": False}

    # Create a project and membership
    proj = Project(
        name="SynergySphere Demo",
        description="Pre-populated demo project",
        due_date=date.today() + timedelta(days=10),
    )
    db.add(proj); db.flush()
    db.add(ProjectMember(project_id=proj.id, user_id=me.id, role=ProjectRole.owner))

    # Optional: add 2 teammate placeholders
    teammate1 = User(name="Bob Singh", email=f"bob+{me.id}@example.com", hashed_password=None, is_active=True, avatar_url=None)
    teammate2 = User(name="Cara Rao", email=f"cara+{me.id}@example.com", hashed_password=None, is_active=True, avatar_url=None)
    db.add_all([teammate1, teammate2]); db.flush()
    db.add_all([
        ProjectMember(project_id=proj.id, user_id=teammate1.id, role=ProjectRole.member),
        ProjectMember(project_id=proj.id, user_id=teammate2.id, role=ProjectRole.member),
    ])

    # Tasks
    titles = [
        "Design login screen",
        "Implement projects API",
        "Threaded messages UI",
        "Task board swimlanes",
        "Notifications MVP",
        "Deploy to demo host",
    ]
    members = [me, teammate1, teammate2]
    for title in titles:
        assignee = choice(members)
        status = choice([TaskStatus.todo, TaskStatus.in_progress, TaskStatus.done])
        t = Task(
            project_id=proj.id,
            title=title,
            description=f"{title} details…",
            status=status,
            priority=choice([TaskPriority.low, TaskPriority.medium, TaskPriority.high]),
            due_date=date.today() + timedelta(days=randint(1, 8)),
            assignee_id=assignee.id,
            created_by_id=me.id,
            attachments_count=randint(0, 2),
        )
        db.add(t); db.flush()
        db.add(TaskEvent(task_id=t.id, project_id=proj.id, actor_id=me.id, type=TaskEventType.created))
        if status != TaskStatus.todo:
            db.add(TaskEvent(task_id=t.id, project_id=proj.id, actor_id=assignee.id,
                             type=TaskEventType.status_changed, from_status="todo", to_status=status.value))
        if status == TaskStatus.done:
            db.add(TaskEvent(task_id=t.id, project_id=proj.id, actor_id=assignee.id, type=TaskEventType.completed))
        db.add(TaskComment(task_id=t.id, author_id=assignee.id, body="Looks good, starting now."))

    # General thread with a few messages
    thr = ProjectThread(project_id=proj.id, title="General")
    db.add(thr); db.flush()
    db.add_all([
        ThreadMessage(thread_id=thr.id, author_id=me.id, body="Welcome to the demo project!"),
        ThreadMessage(thread_id=thr.id, author_id=teammate1.id, body="I’ll cover the API side."),
        ThreadMessage(thread_id=thr.id, author_id=teammate2.id, body="I’ll take the UI."),
    ])

    db.commit()
    return {"project_id": proj.id, "created": True}
