# app/api/routers/demo.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.api.routers.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.membership import ProjectMember, ProjectRole
from app.models.task import Task, TaskStatus, TaskPriority

router = APIRouter(prefix="/demo", tags=["demo"])

USERS = [
    {"email": "adwyte@gmail.com", "name": "Adwyte Karandikar"},
    {"email": "sanskar@gmail.com", "name": "Sanskar Kulkarni"},
    {"email": "swarada@gmail.com", "name": "Swarada Joshi"},
    {"email": "jay@gmail.com", "name": "Jay Gadre"},
]


@router.post("/bootstrap", status_code=201)
def bootstrap_demo(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    """
    Create demo users, a project, memberships, and tasks.
    """
    # --- ensure users exist ---
    user_map: dict[str, User] = {}
    for u in USERS:
        existing = db.scalar(select(User).where(User.email == u["email"]))
        if existing:
            user_map[u["email"]] = existing
        else:
            new_user = User(email=u["email"], name=u["name"], hashed_password="demo", is_active=True)
            db.add(new_user)
            db.flush()
            user_map[u["email"]] = new_user

    # --- create demo project ---
    project = Project(name="Hackathon Demo Project", description="Demo collaboration project")
    db.add(project)
    db.flush()

    # --- add members (all 4 demo users + me) ---
    added = set()
    for u in user_map.values():
        if not db.scalar(select(ProjectMember).where(ProjectMember.project_id == project.id, ProjectMember.user_id == u.id)):
            db.add(ProjectMember(project_id=project.id, user_id=u.id, role=ProjectRole.member))
            added.add(u.id)

    if not db.scalar(select(ProjectMember).where(ProjectMember.project_id == project.id, ProjectMember.user_id == me.id)):
        db.add(ProjectMember(project_id=project.id, user_id=me.id, role=ProjectRole.owner))
        added.add(me.id)

    db.flush()

    # --- create tasks ---
    tasks = [
        {"title": "Setup repo & environment", "assignee": user_map["adwyte@gmail.com"]},
        {"title": "Implement authentication", "assignee": user_map["sanskar@gmail.com"]},
        {"title": "Design UI mockups", "assignee": user_map["swarada@gmail.com"]},
        {"title": "Write project docs", "assignee": user_map["jay@gmail.com"]},
    ]

    for t in tasks:
        db.add(
            Task(
                project_id=project.id,
                title=t["title"],
                status=TaskStatus.todo,
                priority=TaskPriority.medium,
                assignee_id=t["assignee"].id,
                created_by_id=me.id,
            )
        )

    db.commit()
    return {"message": "Demo data created", "project_id": project.id}
