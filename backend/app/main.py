from fastapi import FastAPI
from sqlalchemy import text
from backend.app.api.v1.dashboard import router as dashboard_router
from backend.app.api.v1.activities import router as activities_router
from backend.app.api.v1.leads import router as leads_router
from backend.app.db.database import engine
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.v1.follow_ups import router as follow_ups_router
from backend.app.api.v1.next_actions import router as next_actions_router


app = FastAPI(
    title="LeadFlow AI",
    description="AI-powered sales automation and lead intelligence platform",
    version="0.1.0",
)
app.include_router(
    follow_ups_router,
    prefix="/api/v1",
)

app.include_router(
    next_actions_router,
    prefix="/api/v1",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    dashboard_router,
    prefix="/api/v1"
)

app.include_router(
    leads_router,
    prefix="/api/v1",
)

app.include_router(
    activities_router,
    prefix="/api/v1",
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "leadflow-ai",
        "version": "0.1.0",
    }


@app.get("/health/database")
def database_health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "status": "healthy",
        "database": "mysql",
    }