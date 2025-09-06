# src/backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers
from app.api.routers.health import router as health_router
from app.api.routers.projects import router as projects_router
from app.api.routers.tasks import router as tasks_router
from app.api.routers.messages import router as messages_router
from app.api.routers.members import router as members_router
from app.api.routers.analytics import router as analytics_router
from app.api.routers.auth import router as auth_router
from app.api.routers.demo import router as demo_router


app = FastAPI(
    title="SynergySphere API",
    version="0.1.0",
    description="Backend for SynergySphere Hackathon MVP",
)

# Allow CORS (open for hackathon; restrict later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # update with frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(health_router)
app.include_router(projects_router, prefix="/api/v1", tags=["projects"])
app.include_router(tasks_router, prefix="/api/v1", tags=["tasks"])
app.include_router(auth_router, prefix="/api/v1")
app.include_router(messages_router, prefix="/api/v1", tags=["messages"])
app.include_router(members_router, prefix="/api/v1", tags=["members"])
app.include_router(analytics_router, prefix="/api/v1", tags=["analytics"])
app.include_router(demo_router, prefix="/api/v1", tags=["demo"])

@app.get("/")
def root():
    return {"message": "Welcome to SynergySphere API"}
