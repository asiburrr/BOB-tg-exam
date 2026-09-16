from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.dependencies import get_db
from app.db.session import engine, init_db_and_tables
import app.models
from app.api.v1.auth import router as auth_router
from app.api.v1.admins import router as admins_router
from app.api.v1.questions import router as questions_router
from app.api.v1.telegram import router as telegram_router, track_promotion_click

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db_and_tables()
    yield
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.ENABLE_DOCS else None,
    docs_url=f"{settings.API_V1_STR}/docs" if settings.ENABLE_DOCS else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if settings.ENABLE_DOCS else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
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
