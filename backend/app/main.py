import os
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

import asyncio

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

is_lambda = bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME") or os.getenv("LAMBDA_TASK_ROOT"))
if not is_lambda:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
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
    handler = Mangum(app, lifespan="auto")
except Exception:
    handler = None
