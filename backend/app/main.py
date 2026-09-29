from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from backend.app.db.database import engine

# =========================================================
# API ROUTERS
# =========================================================

from backend.app.api.v1.dashboard import router as dashboard_router
from backend.app.api.v1.activities import router as activities_router
from backend.app.api.v1.leads import router as leads_router
from backend.app.api.v1.follow_ups import router as follow_ups_router
from backend.app.api.v1.next_actions import router as next_actions_router
from backend.app.api.v1.production import router as production_router
from backend.app.api.v1.automation import router as automation_v1_router
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.duplicates import router as duplicates_router

from backend.app.routers.sales_assistant import (
    router as sales_assistant_router
)

from backend.app.routers.automation import (
    router as automation_router
)


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="LeadFlow AI",
    description=(
        "AI-powered sales automation and "
        "lead intelligence platform"
    ),
    version="0.1.0",
)


# =========================================================
# CORS
# =========================================================

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


# =========================================================
# API ROUTERS
# =========================================================

# Dashboard
app.include_router(
    dashboard_router,
    prefix="/api/v1",
)


# Leads
app.include_router(
    leads_router,
    prefix="/api/v1",
)


# Lead Activities
app.include_router(
    activities_router,
    prefix="/api/v1",
)


# Follow-ups
app.include_router(
    follow_ups_router,
    prefix="/api/v1",
)


# Next Best Actions
app.include_router(
    next_actions_router,
    prefix="/api/v1",
)


# Sales Assistant
app.include_router(
    sales_assistant_router,
    prefix="/api/v1",
)


# Legacy / existing automation router
app.include_router(
    automation_router,
    prefix="/api/v1",
)


# Phase 7/8 automation router
app.include_router(
    automation_v1_router,
    prefix="/api/v1",
)


# Production Control
app.include_router(
    production_router,
    prefix="/api/v1",
)


# Authentication
app.include_router(
    auth_router,
    prefix="/api/v1",
)


# Duplicate Lead Management
app.include_router(
    duplicates_router,
    prefix="/api/v1",
)


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "leadflow-ai",
        "version": "0.1.0",
    }


# =========================================================
# DATABASE HEALTH
# =========================================================

@app.get("/health/database")
def database_health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "status": "healthy",
        "database": "mysql",
    }