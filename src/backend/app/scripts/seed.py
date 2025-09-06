import random
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from app.core.config import settings
from app.db.base import Base
from app.models.user import User
from app.models.project import Project
from app.models.membership import ProjectMember, ProjectRole
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.comment import TaskComment
from app.models.thread import ProjectThread, ThreadMessage
from app.models.events import TaskEvent, TaskEventType

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

def run():
    print("Seeding database…")
    with Session(engine) as db:
        # Users
        alice = User(name="Alice Patel", email="alice@example.com", avatar_url="https://i.pravatar.cc/100?img=1")
        bob   = User(name="Bob Singh",   email="bob@example.com",   avatar_url="https://i.pravatar.cc/100?img=2")
        cara  = User(name="Cara Rao",    email="cara@example.com",  avatar_url="https://i.pravatar.cc/100?img=3")
        db.add_all([alice, bob, cara]); db.flush()

        # Project
        proj = Project(name="SynergySphere MVP", description="Hackathon project", due_date=date.today()+timedelta(days=14))
        db.add(proj); db.flush()

        # Memberships
        db.add_all([
            ProjectMember(project_id=proj.id, user_id=alice.id, role=ProjectRole.owner),
            ProjectMember(project_id=proj.id, user_id=bob.id,   role=ProjectRole.member),
            ProjectMember(project_id=proj.id, user_id=cara.id,  role=ProjectRole.member),
        ])

        # Tasks
        titles = [
            "Design login screen",
            "Implement project list API",
            "Task board drag-n-drop",
            "Threaded messages UI",
            "Basic notifications",
            "Deploy to Vercel/Render",
        ]
        assignees = [alice, bob, cara]
        tasks = []
        for i, title in enumerate(titles, start=1):
            assignee = random.choice(assignees)
            status = random.choice([TaskStatus.todo, TaskStatus.in_progress, TaskStatus.done])
            t = Task(
                project_id=proj.id,
                title=title,
                description=f"{title} description…",
                status=status,
                priority=random.choice([TaskPriority.low, TaskPriority.medium, TaskPriority.high]),
                due_date=date.today() + timedelta(days=random.randint(1, 10)),
                assignee_id=assignee.id,
                created_by_id=alice.id,
                attachments_count=random.randint(0, 3),
            )
            db.add(t); db.flush()
            tasks.append(t)
            # events
            db.add(TaskEvent(task_id=t.id, project_id=proj.id, actor_id=alice.id, type=TaskEventType.created))
            if status != TaskStatus.todo:
                db.add(TaskEvent(task_id=t.id, project_id=proj.id, actor_id=assignee.id,
                                 type=TaskEventType.status_changed, from_status="todo", to_status=status.value))
            if status == TaskStatus.done:
                db.add(TaskEvent(task_id=t.id, project_id=proj.id, actor_id=assignee.id, type=TaskEventType.completed))

            # comment
            db.add(TaskComment(task_id=t.id, author_id=assignee.id, body="Looks good, starting now."))

        # Thread + messages
        thr = ProjectThread(project_id=proj.id, title="General")
        db.add(thr); db.flush()
        db.add_all([
            ThreadMessage(thread_id=thr.id, author_id=alice.id, body="Welcome to the project!"),
            ThreadMessage(thread_id=thr.id, author_id=bob.id, body="I’ll take the API tasks."),
            ThreadMessage(thread_id=thr.id, author_id=cara.id, body="I’m on the UI."),
        ])

        db.commit()
        print("Seed complete.")
        print(f"Project id: {proj.id}")

if __name__ == "__main__":
    run()
