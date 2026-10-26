from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import MetaData, Table, inspect, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..admin import require_admin
from ..database import engine, get_db
from ..models import User

router = APIRouter(prefix="/api/admin/database", tags=["database-admin"])
APP_TABLES = ("users", "events", "bookings", "payments", "ticket_type", "ticket")
SENSITIVE_COLUMNS = {"password"}
MAX_PAGE_SIZE = 100


def _get_table(table_name: str) -> Table:
    if table_name not in APP_TABLES:
        raise HTTPException(status_code=404, detail="Table not found")
    if table_name not in inspect(engine).get_table_names():
        raise HTTPException(status_code=404, detail="Table is not initialized in the selected database")
    return Table(table_name, MetaData(), autoload_with=engine)


def _json_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


def _column_value(column, value: Any) -> Any:
    if value is None:
        if not column.nullable:
            raise HTTPException(status_code=400, detail=f"'{column.name}' cannot be null")
        return None

    try:
        python_type = column.type.python_type
        if python_type is datetime and isinstance(value, str):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        if python_type is date and isinstance(value, str):
            return date.fromisoformat(value)
        if python_type is Decimal:
            return Decimal(str(value))
        if python_type is bool and isinstance(value, str):
            if value.lower() not in {"true", "false"}:
                raise ValueError
            return value.lower() == "true"
        if python_type in {int, float, str, bool}:
            return python_type(value)
        return value
    except (ValueError, TypeError, InvalidOperation, OverflowError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid value for '{column.name}'") from exc


def _primary_key(table: Table, row: dict[str, Any]) -> dict[str, Any]:
    return {column.name: _json_value(row[column.name]) for column in table.primary_key.columns}


@router.get("/tables")
def list_tables(_: User = Depends(require_admin)):
    inspector = inspect(engine)
    initialized = set(inspector.get_table_names())
    return [
        {"name": table_name, "available": table_name in initialized}
        for table_name in APP_TABLES
    ]


@router.get("/tables/{table_name}/rows")
def list_rows(
    table_name: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=MAX_PAGE_SIZE),
    _: User = Depends(require_admin),
):
    table = _get_table(table_name)
    if not table.primary_key.columns:
        raise HTTPException(status_code=400, detail="Table has no primary key and cannot be edited")

    columns = [
        {
            "name": column.name,
            "type": str(column.type),
            "nullable": column.nullable,
            "primary_key": column.primary_key,
            "sensitive": column.name in SENSITIVE_COLUMNS,
        }
        for column in table.columns
    ]
    ordering = list(table.primary_key.columns)
    with engine.connect() as connection:
        statement = select(table).order_by(*ordering).offset(offset).limit(limit + 1)
        result = connection.execute(statement)
        fetched = result.mappings().all()

    has_more = len(fetched) > limit
    rows = fetched[:limit]
    return {
        "table": table_name,
        "columns": columns,
        "rows": [
            {
                "primary_key": _primary_key(table, dict(row)),
                "values": {
                    column.name: None if column.name in SENSITIVE_COLUMNS else _json_value(row[column.name])
                    for column in table.columns
                },
            }
            for row in rows
        ],
        "offset": offset,
        "limit": limit,
        "has_more": has_more,
    }


@router.patch("/tables/{table_name}/rows")
def update_row(
    table_name: str,
    payload: dict[str, Any],
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    table = _get_table(table_name)
    primary_key = payload.get("primary_key")
    values = payload.get("values")
    pk_columns = list(table.primary_key.columns)

    if not isinstance(primary_key, dict) or set(primary_key) != {column.name for column in pk_columns}:
        raise HTTPException(status_code=400, detail="Provide the complete primary key for this row")
    if not isinstance(values, dict) or not values:
        raise HTTPException(status_code=400, detail="Provide at least one field to update")
    if any(name not in table.c for name in values):
        raise HTTPException(status_code=400, detail="One or more fields do not exist in this table")
    if any(table.c[name].primary_key for name in values):
        raise HTTPException(status_code=400, detail="Primary keys cannot be edited")

    predicates = [
        column == _column_value(column, primary_key[column.name])
        for column in pk_columns
    ]
    converted = {
        table.c[name]: _column_value(table.c[name], value)
        for name, value in values.items()
    }

    try:
        result = db.execute(update(table).where(*predicates).values(converted))
        if result.rowcount != 1:
            db.rollback()
            raise HTTPException(status_code=404, detail="Row not found")
        db.commit()
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Update rejected by database constraints") from exc

    return {"updated": True, "primary_key": primary_key}
