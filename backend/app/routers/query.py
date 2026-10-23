from decimal import Decimal
from datetime import date, datetime

import sqlglot
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlglot import exp
from sqlglot.errors import ParseError
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import DB_TYPE, engine, get_db
from ..models import User
from ..schemas import ReadQuery

router = APIRouter(prefix="/api/query", tags=["query"])
PUBLIC_TABLES = {"EVENTS", "TICKET_TYPE"}
ADMIN_TABLES = PUBLIC_TABLES | {"USERS", "BOOKINGS", "PAYMENTS", "TICKET"}
MAX_QUERY_LENGTH = 4000
MAX_RESULT_ROWS = 100


def _json_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


@router.post("")
def run_read_query(
    data: ReadQuery,
    x_user_id: int = Header(...),
    db: Session = Depends(get_db),
):
    query = data.query.strip()
    if not query or len(query) > MAX_QUERY_LENGTH:
        raise HTTPException(status_code=400, detail="Enter a query of 1 to 4000 characters")
    if ";" in query or "--" in query or "/*" in query or "*/" in query:
        raise HTTPException(status_code=400, detail="Run one SELECT statement without comments")

    try:
        parsed = sqlglot.parse(query, read="oracle")
    except ParseError:
        try:
            parsed = sqlglot.parse(query, read="postgres")
        except ParseError as exc:
            raise HTTPException(status_code=400, detail="Invalid SQL syntax") from exc
    if len(parsed) != 1 or not isinstance(parsed[0], exp.Select):
        raise HTTPException(status_code=400, detail="Only one SELECT statement is allowed")

    statement = parsed[0]
    tables = list(statement.find_all(exp.Table))
    if any(table.db or table.catalog for table in tables):
        raise HTTPException(status_code=400, detail="Schema-qualified table names are not allowed")
    if any(isinstance(node, exp.Anonymous) for node in statement.walk()):
        raise HTTPException(status_code=400, detail="Custom and package functions are not allowed")
    if statement.args.get("into") or statement.args.get("locks"):
        raise HTTPException(status_code=400, detail="SELECT INTO and locking queries are not allowed")

    with engine.connect() as connection:
        try:
            if DB_TYPE == "oracle":
                connection.exec_driver_sql("SET TRANSACTION READ ONLY")
                connection.connection.driver_connection.call_timeout = 5000
            user = connection.execute(
                text("SELECT role FROM users WHERE user_id = :user_id"),
                {"user_id": x_user_id},
            ).first()
            if not user:
                raise HTTPException(status_code=401, detail="User not found")

            allowed_tables = ADMIN_TABLES if user.role == "ADMIN" else PUBLIC_TABLES
            invalid_tables = sorted(
                {table.name.upper() for table in tables} - allowed_tables
            )
            if invalid_tables:
                raise HTTPException(
                    status_code=403,
                    detail="Tables unavailable to your role: " + ", ".join(invalid_tables),
                )

            result = connection.exec_driver_sql(query)
            rows = result.fetchmany(MAX_RESULT_ROWS + 1)
            truncated = len(rows) > MAX_RESULT_ROWS
            rows = rows[:MAX_RESULT_ROWS]
            return {
                "columns": list(result.keys()),
                "rows": [
                    {key: _json_value(value) for key, value in row._mapping.items()}
                    for row in rows
                ],
                "truncated": truncated,
            }
        finally:
            connection.rollback()