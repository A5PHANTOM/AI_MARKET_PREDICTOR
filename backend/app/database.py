import os
from contextlib import asynccontextmanager

import aiosqlite


async def _ensure_initialized(conn: aiosqlite.Connection) -> None:
    cursor = await conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users_profile'"
    )
    row = await cursor.fetchone()

    if row is None:
        base = os.path.dirname(__file__)
        schema_path = os.path.join(base, "db", "schema.sql")
        with open(schema_path) as f:
            await conn.executescript(f.read())

        seed_path = os.path.join(base, "db", "seed.sql")
        if os.path.exists(seed_path):
            with open(seed_path) as f:
                await conn.executescript(f.read())


@asynccontextmanager
async def get_db():
    db_path = os.environ.get("DB_PATH", "db/finally.db")
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    conn = await aiosqlite.connect(db_path)
    conn.row_factory = aiosqlite.Row
    try:
        await _ensure_initialized(conn)
        yield conn
    finally:
        await conn.close()
