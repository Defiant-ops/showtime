from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import DB_TYPE, DATABASE_URL, engine, validate_database_configuration
from .routers import auth, bookings, database_admin, events, payments, query, tickets

app = FastAPI(
    title="Showtime API",
    version="1.0.0",
    description="Showtime event booking & management backend using FastAPI and SQLAlchemy with Oracle or CockroachDB support.",
)


@app.on_event("startup")
def startup_validation() -> None:
    validate_database_configuration(DB_TYPE)
    with engine.connect() as connection:
        query = "SELECT 1 FROM dual" if DB_TYPE == "oracle" else "SELECT 1"
        connection.execute(text(query))
    print(f"Database backend ready: {DB_TYPE}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(bookings.router)
app.include_router(payments.router)
app.include_router(tickets.router)
app.include_router(query.router)
app.include_router(database_admin.router)


@app.get("/")
def root():
    return {"message": "Showtime API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
