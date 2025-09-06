# app/models/user.py
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    # only for type hints; avoids circular import at runtime
    from app.models.task import Task

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(120))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    hashed_password: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    memberships = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")

    # ✅ disambiguate: this relationship uses Task.assignee_id
    tasks_assigned = relationship(
        "Task",
        back_populates="assignee",
        foreign_keys="Task.assignee_id",
    )

    # (optional) also expose tasks the user created, via created_by_id
    tasks_created = relationship(
        "Task",
        foreign_keys="Task.created_by_id",
        viewonly=True,
    )
