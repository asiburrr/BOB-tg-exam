import asyncio
from app.db.session import init_db_and_tables

if __name__ == "__main__":
    asyncio.run(init_db_and_tables())
    print("Database synchronized")
