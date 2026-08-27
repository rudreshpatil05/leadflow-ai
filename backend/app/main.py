from fastapi import FastAPI
from sqlalchemy import text

from backend.app.api.v1.leads import router as leads_router
from backend.app.db.database import engine


app = FastAPI(
    title="LeadFlow AI",
    description="AI-powered sales automation and lead intelligence platform",
    version="0.1.0",
)


app.include_router(
    leads_router,
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