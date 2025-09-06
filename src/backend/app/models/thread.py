from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class ProjectThread(Base):
    __tablename__ = "project_threads"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    project = relationship("Project", back_populates="threads")
    messages = relationship("ThreadMessage", back_populates="thread", cascade="all, delete-orphan")

Index("ix_project_threads_project_title", ProjectThread.project_id, ProjectThread.title)

class ThreadMessage(Base):
    __tablename__ = "thread_messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("project_threads.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    parent_message_id: Mapped[int | None] = mapped_column(ForeignKey("thread_messages.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(String(4000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    thread = relationship("ProjectThread", back_populates="messages")
