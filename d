[1mdiff --git a/backend/app/main.py b/backend/app/main.py[m
[1mindex 924031a..77e20d5 100644[m
[1m--- a/backend/app/main.py[m
[1m+++ b/backend/app/main.py[m
[36m@@ -1,9 +1,12 @@[m
 from fastapi import FastAPI[m
 from sqlalchemy import text[m
[31m-[m
[32m+[m[32mfrom backend.app.api.v1.dashboard import router as dashboard_router[m
 from backend.app.api.v1.activities import router as activities_router[m
 from backend.app.api.v1.leads import router as leads_router[m
 from backend.app.db.database import engine[m
[32m+[m[32mfrom fastapi.middleware.cors import CORSMiddleware[m
[32m+[m[32mfrom backend.app.api.v1.follow_ups import router as follow_ups_router[m
[32m+[m[32mfrom backend.app.api.v1.next_actions import router as next_actions_router[m
 [m
 [m
 app = FastAPI([m
[36m@@ -11,7 +14,30 @@[m [mapp = FastAPI([m
     description="AI-powered sales automation and lead intelligence platform",[m
     version="0.1.0",[m
 )[m
[32m+[m[32mapp.include_router([m
[32m+[m[32m    follow_ups_router,[m
[32m+[m[32m    prefix="/api/v1",[m
[32m+[m[32m)[m
 [m
[32m+[m[32mapp.include_router([m
[32m+[m[32m    next_actions_router,[m
[32m+[m[32m    prefix="/api/v1",[m
[32m+[m[32m)[m
[32m+[m[32mapp.add_middleware([m
[32m+[m[32m    CORSMiddleware,[m
[32m+[m[32m    allow_origins=[[m
[32m+[m[32m        "http://localhost:5173",[m
[32m+[m[32m        "http://127.0.0.1:5173",[m
[32m+[m[32m    ],[m
[32m+[m[32m    allow_credentials=True,[m
[32m+[m[32m    allow_methods=["*"],[m
[32m+[m[32m    allow_headers=["*"],[m
[32m+[m[32m)[m
[32m+[m
[32m+[m[32mapp.include_router([m
[32m+[m[32m    dashboard_router,[m
[32m+[m[32m    prefix="/api/v1"[m
[32m+[m[32m)[m
 [m
 app.include_router([m
     leads_router,[m
