import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.dependencies import get_db
from app.db.session import engine, init_db_and_tables
import app.models
from app.api.v1.auth import router as auth_router
from app.api.v1.admins import router as admins_router
from app.api.v1.questions import router as questions_router
from app.api.v1.telegram import router as telegram_router, track_promotion_click

is_lambda = bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME") or os.getenv("LAMBDA_TASK_ROOT"))

async def run_quiz_scheduler_worker():
    while True:
        try:
            await asyncio.sleep(15)
            from app.db.session import AsyncSessionLocal
            from app.services.telegram_engine import TelegramEngine
            async with AsyncSessionLocal() as db:
                await TelegramEngine.sync_quiz_schedules(db)
                await db.commit()
        except asyncio.CancelledError:
            break
        except Exception:
            pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db_and_tables()
    except Exception:
        pass

    worker_task = None
    if not is_lambda:
        worker_task = asyncio.create_task(run_quiz_scheduler_worker())

    yield

    if worker_task:
        worker_task.cancel()
        try:
            await worker_task
        except (asyncio.CancelledError, Exception):
            pass

    try:
        await engine.dispose()
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.ENABLE_DOCS else None,
    docs_url=f"{settings.API_V1_STR}/docs" if settings.ENABLE_DOCS else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if settings.ENABLE_DOCS else None,
    lifespan=lifespan,
)

cors_origins = settings.BACKEND_CORS_ORIGINS if isinstance(settings.BACKEND_CORS_ORIGINS, list) and "*" not in settings.BACKEND_CORS_ORIGINS else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True if "*" not in cors_origins else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(admins_router, prefix=settings.API_V1_STR)
app.include_router(questions_router, prefix=settings.API_V1_STR)
app.include_router(telegram_router, prefix=settings.API_V1_STR)

@app.get("/c/{promo_id}", include_in_schema=False)
@app.get("/r/{promo_id}", include_in_schema=False)
async def root_promo_redirect(promo_id: int, db = Depends(get_db)):
    return await track_promotion_click(promo_id, db)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
    }

try:
    from mangum import Mangum
    mangum_handler = Mangum(app, lifespan="auto")
except Exception:
    mangum_handler = None

async def _execute_scheduled_quiz_sync():
    from app.db.session import AsyncSessionLocal
    from app.services.telegram_engine import TelegramEngine
    async with AsyncSessionLocal() as db:
        await TelegramEngine.sync_quiz_schedules(db)
        await db.commit()

def handler(event, context):
    if isinstance(event, dict) and (
        event.get("source") == "aws.events"
        or event.get("detail-type") == "Scheduled Event"
        or event.get("action") == "sync_quiz_schedules"
        or event.get("task") == "sync_quiz_schedules"
    ):
        asyncio.run(_execute_scheduled_quiz_sync())
        return {"statusCode": 200, "body": '{"status":"ok","action":"sync_quiz_schedules"}'}

    if mangum_handler:
        return mangum_handler(event, context)
    return {"statusCode": 500, "body": '{"status":"error","message":"Handler not configured"}'}
