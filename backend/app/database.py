import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env", override=False)


def _sanitize_url(url: str) -> str:
    if not url:
        return "<unset>"
    if "://" not in url:
        return "<invalid-url>"
    scheme, remainder = url.split("://", 1)
    if "@" in remainder:
        authority, hostinfo = remainder.rsplit("@", 1)
        username = authority.split(":", 1)[0] if ":" in authority else authority
        if not username:
            return f"{scheme}://***@{hostinfo}"
        return f"{scheme}://{username}:***@{hostinfo}"
    return f"{scheme}://***"


def _require_env(name: str, db_type: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(
            f"Missing required environment variable '{name}' for DB_TYPE={db_type}. "
            "Set it in backend/.env or the current environment before starting the app."
        )
    return value


def _build_oracle_url(db_type: str) -> str:
    user = _require_env("ORACLE_USER", db_type)
    password = _require_env("ORACLE_PASSWORD", db_type)
    host = os.getenv("ORACLE_HOST", "127.0.0.1").strip() or "127.0.0.1"
    port = os.getenv("ORACLE_PORT", "1521").strip() or "1521"
    service = os.getenv("ORACLE_SERVICE_NAME", "FREEPDB1").strip() or "FREEPDB1"
    return f"oracle+oracledb://{user}:{password}@{host}:{port}/?service_name={service}"


def _build_cockroach_url(db_type: str) -> str:
    url = os.getenv("COCKROACH_DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError(
            "Missing required environment variable 'COCKROACH_DATABASE_URL' for DB_TYPE=cockroachdb. "
            "Set a PostgreSQL-compatible SQLAlchemy URL configured for your CockroachDB deployment."
        )
    if not url.startswith("postgresql+"):
        raise RuntimeError(
            "COCKROACH_DATABASE_URL must be a PostgreSQL-compatible SQLAlchemy URL."
        )
    return url


def validate_database_configuration(db_type: str | None = None) -> str:
    db_type = (db_type or os.getenv("DB_TYPE", "oracle") or "oracle").strip().lower()
    if db_type not in {"oracle", "cockroachdb"}:
        raise RuntimeError(
            "Unsupported DB_TYPE value. Use 'oracle' or 'cockroachdb'."
        )

    if db_type == "oracle":
        return _build_oracle_url(db_type)
    return _build_cockroach_url(db_type)


DB_TYPE = (os.getenv("DB_TYPE", "oracle") or "oracle").strip().lower()
DATABASE_URL = validate_database_configuration(DB_TYPE)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def commit_with_retry(db, max_retries: int = 3):
    if DB_TYPE != "cockroachdb":
        db.commit()
        return

    for attempt in range(max_retries):
        try:
            db.commit()
            return
        except OperationalError as exc:
            message = str(exc).lower()
            if ("40001" in message or "40p01" in message or "serialization" in message or "retry" in message) and attempt < max_retries - 1:
                db.rollback()
                continue
            raise
        except Exception:
            raise

    raise RuntimeError("CockroachDB transaction commit failed after retries.")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
