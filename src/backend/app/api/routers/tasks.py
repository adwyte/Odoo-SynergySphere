from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.user import User
from app.models.comment import TaskComment
from app.models.events import TaskEvent, TaskEventType

router = APIRouter(prefix="/tasks", tags=["tasks"])

def _status_to_front(s: TaskStatus) -> str:
    return "in-progress" if s == TaskStatus.in_progress else s.value

@router.get("/by-project/{project_id}")
def list_tasks(project_id: int, db: Session = Depends(get_db)):
    tasks = (
        db.query(
            Task,
            User.name.label("assignee_name"),
            User.avatar_url.label("assignee_avatar"),
            func.count(TaskComment.id).label("comments_count"),
        )
        .outerjoin(User, User.id == Task.assignee_id)
        .outerjoin(TaskComment, TaskComment.task_id == Task.id)
        .filter(Task.project_id == project_id)
        .group_by(Task.id, User.name, User.avatar_url)
        .order_by(Task.created_at.desc())
        .all()
    )

    out = []
    for t, assignee_name, assignee_avatar, comments_count in tasks:
        out.append({
            "id": str(t.id),
            "title": t.title,
            "description": t.description,
            "assignee": assignee_name or "Unassigned",
            "assigneeAvatar": assignee_avatar or "",
            "status": _status_to_front(t.status),       # "todo"|"in-progress"|"done"
            "priority": t.priority.value,
            "dueDate": t.due_date.isoformat() if t.due_date else None,
            "createdAt": t.created_at.isoformat(),
            "comments": int(comments_count or 0),
            "attachments": int(t.attachments_count or 0),
        })
    return out

@router.post("/")
def create_task(payload: dict, db: Session = Depends(get_db)):
    required = ["project_id", "title"]
    if any(not payload.get(k) for k in required):
        raise HTTPException(status_code=400, detail="project_id and title are required")
    t = Task(
        project_id=payload["project_id"],
        title=payload["title"],
        description=payload.get("description"),
        status=TaskStatus.todo,
        priority=TaskPriority(payload.get("priority","medium")),
        assignee_id=payload.get("assignee_id"),
        created_by_id=payload.get("created_by_id"),
        due_date=payload.get("due_date"),
        attachments_count=payload.get("attachments", 0),
    )
    db.add(t); db.flush()
    db.add(TaskEvent(task_id=t.id, project_id=t.project_id, actor_id=payload.get("created_by_id"), type=TaskEventType.created))
    db.commit(); db.refresh(t)
    return {"id": str(t.id), "title": t.title, "status": _status_to_front(t.status)}

@router.patch("/{task_id}")
def update_task(task_id: int, payload: dict, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    prev_status = t.status
    for field in ["title", "description", "due_date", "attachments_count"]:
        if field in payload: setattr(t, field, payload[field])
    if "priority" in payload:
        t.priority = TaskPriority(payload["priority"])
    if "status" in payload:
        # map "in-progress" -> in_progress
        new = payload["status"].replace("-", "_")
        t.status = TaskStatus(new)
    if "assignee_id" in payload:
        t.assignee_id = payload["assignee_id"]

    db.flush()
    # events
    if "status" in payload and t.status != prev_status:
        db.add(TaskEvent(
            task_id=t.id, project_id=t.project_id,
            actor_id=payload.get("actor_id"),
            type=TaskEventType.status_changed,
            from_status=prev_status.value, to_status=t.status.value
        ))
        if t.status == TaskStatus.done:
            db.add(TaskEvent(task_id=t.id, project_id=t.project_id, actor_id=payload.get("actor_id"), type=TaskEventType.completed))
    db.commit(); db.refresh(t)
    return {"id": str(t.id), "status": t.status.value}
