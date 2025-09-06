import enum
from sqlalchemy import ForeignKey, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class ProjectRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    member = "member"
    viewer = "viewer"

class ProjectMember(Base):
    __tablename__ = "project_members"
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[ProjectRole] = mapped_column(Enum(ProjectRole), default=ProjectRole.member, nullable=False)
    notify_mentions: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_due_soon: Mapped[bool] = mapped_column(Boolean, default=True)

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="memberships")
