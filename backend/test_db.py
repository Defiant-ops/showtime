import os
import sys

import pytest
from sqlalchemy import text

from app.database import DB_TYPE, DATABASE_URL, _sanitize_url, engine, validate_database_configuration


def test_validate_oracle_configuration(monkeypatch):
    monkeypatch.setenv("DB_TYPE", "oracle")
    monkeypatch.setenv("ORACLE_USER", "system")
    monkeypatch.setenv("ORACLE_PASSWORD", "password")
    monkeypatch.setenv("ORACLE_HOST", "127.0.0.1")
    monkeypatch.setenv("ORACLE_PORT", "1521")
    monkeypatch.setenv("ORACLE_SERVICE_NAME", "xepdb1")
    url = validate_database_configuration("oracle")
    assert "oracle+oracledb://system:password@127.0.0.1:1521" in url
    assert "service_name=xepdb1" in url


def test_validate_cockroach_configuration(monkeypatch):
    monkeypatch.setenv("DB_TYPE", "cockroachdb")
    monkeypatch.setenv(
        "COCKROACH_DATABASE_URL",
        "postgresql+psycopg://user:password@localhost:26257/defaultdb?sslmode=verify-full",
    )
    url = validate_database_configuration("cockroachdb")
    assert url.startswith("postgresql+")
    assert "sslmode=verify-full" in url


def test_validate_invalid_db_type(monkeypatch):
    monkeypatch.setenv("DB_TYPE", "sqlite")
    with pytest.raises(RuntimeError, match="Unsupported DB_TYPE"):
        validate_database_configuration("sqlite")


def run_checks() -> None:
    validate_database_configuration(DB_TYPE)

    if DB_TYPE not in {"oracle", "cockroachdb"}:
        raise ValueError(f"Unsupported DB_TYPE: {DB_TYPE}")

    if DB_TYPE == "oracle":
        assert "oracle+oracledb" in DATABASE_URL
    else:
        assert "postgresql+psycopg" in DATABASE_URL

    with engine.connect() as connection:
        query = "SELECT 1 FROM dual" if DB_TYPE == "oracle" else "SELECT 1"
        result = connection.execute(text(query))
        value = result.scalar()
        if value != 1:
            raise AssertionError(f"Unexpected scalar result for {DB_TYPE}: {value!r}")

    print(f"Database selection OK: {DB_TYPE}")
    print(f"Connection URL configured: {_sanitize_url(DATABASE_URL)}")


def main() -> int:
    try:
        run_checks()
        return 0
    except Exception as exc:
        print(f"Database verification failed for DB_TYPE={os.getenv('DB_TYPE', 'oracle')}.")
        print(exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())

