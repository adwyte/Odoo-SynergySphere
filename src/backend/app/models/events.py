# app/models/events.py
from __future__ import annotations

from sqlalchemy import ForeignKey, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # NOTE: this requires Project.messages to exist (we added it above)
    project = relationship("Project", back_populates="messages")
    author = relationship("User")
