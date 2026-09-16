import os
from urllib.parse import urlparse
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from sqlalchemy import text, inspect, select
import asyncpg
from app.core.config import settings
from app.core.security import hash_password

class Base(DeclarativeBase):
    pass

is_lambda = bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME") or os.getenv("LAMBDA_TASK_ROOT"))
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

if is_lambda:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        connect_args=connect_args,
        poolclass=NullPool,
    )
else:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_size=10 if not is_sqlite else 5,
        max_overflow=20 if not is_sqlite else 0,
        pool_recycle=300,
    )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_db_session():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def ensure_database_exists():
    if is_sqlite or is_lambda:
        return
    parsed = urlparse(settings.DATABASE_URL.replace("+asyncpg", ""))
    user = parsed.username or "postgres"
    password = parsed.password or ""
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    target_db = parsed.path.lstrip("/")

    try:
        sys_conn = await asyncpg.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database="postgres",
        )
        exists = await sys_conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", 
            target_db
        )
        if not exists:
            await sys_conn.execute(f'CREATE DATABASE "{target_db}"')
        await sys_conn.close()
    except Exception:
        pass

def sync_schema_non_destructive(conn):
    renames = [
        ("audit_logs", "admins_audit_logs"),
        ("login_attempts", "admins_login_attempts"),
        ("sessions", "admins_sessions"),
        ("user_permissions", "admins_permissions"),
    ]
    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    for old_name, new_name in renames:
        if old_name in existing_tables and new_name not in existing_tables:
            conn.execute(text(f'ALTER TABLE "{old_name}" RENAME TO "{new_name}"'))

    Base.metadata.create_all(bind=conn, checkfirst=True)
    
    if is_sqlite:
        return

    inspector = inspect(conn)
    existing_tables = inspector.get_table_names()

    for table_name, table in Base.metadata.tables.items():
        if table_name in existing_tables:
            existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
            for col in table.columns:
                if col.name not in existing_columns:
                    col_type = col.type.compile(dialect=conn.dialect)
                    conn.execute(
                        text(f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{col.name}" {col_type}')
                    )
    if "telegram_bot_settings" in existing_tables:
        try:
            conn.execute(text('UPDATE "telegram_bot_settings" SET "force_join_enabled" = false WHERE "force_join_enabled" IS NULL'))
            conn.execute(text('UPDATE "telegram_bot_settings" SET "group_access_mode" = \'all_blocked\' WHERE "group_access_mode" IS NULL'))
            conn.execute(text('UPDATE "telegram_bot_settings" SET "group_commands_in_private" = false WHERE "group_commands_in_private" IS NULL'))
        except Exception:
            pass

async def ensure_default_administration():
    from app.models.admin import Admin
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Admin.id).limit(1))
        if res.first() is None:
            admin = Admin(
                name=settings.DEFAULT_ADMIN_NAME,
                email=settings.DEFAULT_ADMIN_EMAIL.lower().strip(),
                role="Administration",
                password_hash=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
                status="active",
            )
            db.add(admin)
            await db.commit()

async def init_db_and_tables():
    try:
        await ensure_database_exists()
        async with engine.begin() as conn:
            await conn.run_sync(sync_schema_non_destructive)
        await ensure_default_administration()
    except Exception:
        pass
