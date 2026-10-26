# Showtime — Event Booking & Management Platform

**Showtime** is a full-stack event discovery, booking, and demo payment management system built with **React**, **FastAPI**, and **SQLAlchemy**. The backend can connect to either Oracle Database or CockroachDB; choose one with `DB_TYPE`.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router DOM, Lucide Icons, Vanilla CSS design system.
- **Backend**: Python 3, FastAPI, SQLAlchemy ORM, Oracle `oracledb` and CockroachDB dialect drivers, Pydantic v2.
- **Database**: Oracle Database XE or CockroachDB. Run only the selected database.

---

## Features

- **User Authentication**: Sign In and User Registration (Sign Up) endpoints with persistent sessions.
- **Event Discovery**: Search and filter upcoming college and tech events by category or keyword.
- **Event Reservation**: Reserve tickets with real-time availability checks.
- **Demo Payment Gateway**: Interactive simulated checkout dialog supporting Card, UPI / QR, and NetBanking modes with instant database transaction recording.
- **Payment Receipts & History**: View transaction receipts and payment statuses linked to active bookings.

---

## Repository Structure

```
showtime/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application & middleware
│   │   ├── database.py      # DB_TYPE selection and SQLAlchemy session configuration
│   │   ├── models.py        # SQLAlchemy ORM models (User, Event, Booking, Payment)
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   └── routers/         # API Route Handlers (auth, events, bookings, payments)
│   ├── .env                 # Local database configuration; do not commit credentials
│   ├── test_db.py           # Connectivity verification script
│   └── requirements.txt     # Python dependencies
├── database/
│   ├── schema.sql           # Oracle DDL
│   └── seed.sql             # Oracle sample data
├── database_2/
│   ├── schema.sql           # CockroachDB DDL
│   ├── seed.sql             # CockroachDB sample data
│   └── README.md            # CockroachDB-specific notes
└── frontend/
    ├── src/
    │   ├── pages/           # React pages (Login, Signup, Events, Bookings, Payments)
    │   ├── lib/api.ts       # Typed API client
    │   ├── App.tsx          # Router layout & topbar navigation
    │   └── styles.css       # Unified CSS design system
    ├── index.html           # Document head & title
    └── package.json         # Node.js dependencies
```

---

## Local Setup

### Prerequisites

Install Docker Engine, Python 3.10 or newer, Node.js 18 or newer, and npm. On Arch Linux, install Docker using your usual package-management workflow, enable/start the Docker service, and ensure your account can run `docker` commands. These are local development instructions; production requirements are described below.

### 1. Configure the Python environment

From the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp -n .env.example .env
```

Edit `backend/.env` for exactly one database backend. Keep this file private and do not commit real credentials. The selected database must be reachable before starting the API; the backend does not fall back to the other database.

### 2A. Run with Oracle

Start a local Oracle XE container. This example is for development only:

```bash
docker run -d \
   --name showtime-oracle \
   -p 1521:1521 \
   -e ORACLE_PASSWORD='replace-with-a-local-password' \
   gvenzl/oracle-xe:21-slim
```

Wait for the database to finish initializing:

```bash
docker logs -f showtime-oracle
```

Stop following the logs after the database reports that it is ready. Set the backend configuration to the credentials and service name for that container:

```env
DB_TYPE=oracle
ORACLE_USER=showtime
ORACLE_PASSWORD=replace-with-an-app-password
ORACLE_HOST=127.0.0.1
ORACLE_PORT=1521
ORACLE_SERVICE_NAME=XEPDB1
```

Create a dedicated application schema user. Connect as SYSTEM:

```bash
docker exec -it showtime-oracle sqlplus system@//localhost:1521/XEPDB1
```

At the SQL*Plus prompt, create the user. Use the same password in `backend/.env`:

```sql
CREATE USER showtime IDENTIFIED BY "replace-with-an-app-password";
GRANT CREATE SESSION, CREATE TABLE TO showtime;
ALTER USER showtime QUOTA UNLIMITED ON USERS;
EXIT
```

Initialize a fresh schema. Copy the Oracle scripts into the container:

```bash
cd ..
docker cp database/schema.sql showtime-oracle:/tmp/showtime-schema.sql
docker cp database/seed.sql showtime-oracle:/tmp/showtime-seed.sql
```

Connect as the application user; SQL*Plus will prompt for its password. Then execute both scripts:

```bash
docker exec -it showtime-oracle sqlplus showtime@//localhost:1521/XEPDB1
```

At the SQL*Plus prompt:

```sql
@/tmp/showtime-schema.sql
@/tmp/showtime-seed.sql
EXIT
```

These scripts create objects in the connected user's schema. The `showtime` account owns only this application's objects. For production, review and restrict privileges further according to your Oracle deployment policies.

### 2B. Run with CockroachDB

CockroachDB does not need to be installed on Arch when using Docker. This local-only single-node setup uses Linux host networking and binds its SQL listener to loopback. The web UI uses port `18080` to avoid the common `8080` conflict:

```bash
docker run -d \
   --name showtime-cockroach-dev \
   --network host \
   -v showtime-cockroach-data:/cockroach/cockroach-data \
   cockroachdb/cockroach:latest \
   start-single-node \
   --insecure \
   --listen-addr=localhost:26257 \
   --http-addr=localhost:18080
```

This insecure configuration is for local development only. It must not be exposed to a network. If port `26257` is occupied, stop the service using it or choose another port and update the connection URL. Start the saved container again later with `docker start showtime-cockroach-dev`.

Set `backend/.env`:

```env
DB_TYPE=cockroachdb
COCKROACH_DATABASE_URL=postgresql+psycopg://root@localhost:26257/defaultdb?sslmode=disable
```

The backend maps this PostgreSQL-compatible URL to CockroachDB's SQLAlchemy dialect. `sslmode=disable` is only for the local insecure cluster; use certificate verification for a secure cluster.

From the repository root, apply the CockroachDB DDL and seed scripts to `defaultdb`:

```bash
docker exec -i showtime-cockroach-dev cockroach sql \
   --insecure --host=localhost:26257 --database=defaultdb \
   < database_2/schema.sql

docker exec -i showtime-cockroach-dev cockroach sql \
   --insecure --host=localhost:26257 --database=defaultdb \
   < database_2/seed.sql
```

The seed script is intended for a fresh database. It inserts fixed IDs for related demo rows; do not use it to populate an existing production database. For cloud CockroachDB, use the provider's secure connection string and certificate, and apply the same SQL files with its `cockroach sql --url ...` command. See [database_2/README.md](database_2/README.md) for more CockroachDB details.

### 3. Verify the selected database

With the backend virtual environment active, run from `backend/`:

```bash
python test_db.py
python -m pytest -q test_db.py
```

`python test_db.py` connects to the selected live database. Pytest checks DB selection and configuration logic. Both commands must pass for the selected database; tests against a real server require that server to be running.

### 4. Start the API

From `backend/`, with the virtual environment active:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API is at `http://127.0.0.1:8000`; interactive API docs are at `http://127.0.0.1:8000/docs`. Keep this terminal running.

### 5. Start the shared React frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`. The frontend uses the same API routes for Oracle and CockroachDB; no frontend database setting is needed. For a deployed frontend, set `VITE_API_URL` to the deployed API origin before building.

### Switch database backends

Stop and restart the backend after changing `DB_TYPE` and its settings in `backend/.env`:

- Oracle: `DB_TYPE=oracle` and configure the `ORACLE_*` variables.
- CockroachDB: `DB_TYPE=cockroachdb` and configure `COCKROACH_DATABASE_URL`.

The two databases contain separate data. Switching the setting does not migrate or copy records.

### Production deployment notes

The commands above are local development procedures, not a production deployment recipe. For production, use a managed or securely configured database, TLS with certificate verification, secret management instead of a committed `.env`, backups, restricted network access, and a process manager/container platform with health monitoring. Do not use CockroachDB's `--insecure` mode or Oracle SYSTEM as the application user.

The current application also has security limitations that must be addressed before exposing it publicly: authentication compares stored passwords directly, admin authorization trusts a user ID request header, and CORS origins are currently hard-coded to localhost. The payment workflow is a demo and does not process real transactions. No production security should be inferred from the local setup.

---

## Demo Login Credentials

You can log in using pre-seeded test accounts or create a new account via the **Create Account** signup form:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `password123` |
| **User** | `raghav@example.com` | `password123` |

---

## API Routes Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Authenticate existing user |
| `GET` | `/api/events` | List all available events |
| `GET` | `/api/events/{id}` | Get event details |
| `POST` | `/api/bookings` | Reserve a ticket for an event |
| `GET` | `/api/bookings/user/{user_id}` | List bookings by user |
| `POST` | `/api/payments/demo/{booking_id}` | Process & record a demo payment |
| `GET` | `/api/payments/user/{user_id}` | List payment transaction records |
