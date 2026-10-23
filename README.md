# Showtime — Event Booking & Management Platform

**Showtime** is a full-stack event discovery, booking, and payment management system built with **React**, **FastAPI**, **SQLAlchemy**, and an **Oracle Database XE** running in Docker.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router DOM, Lucide Icons, Vanilla CSS design system.
- **Backend**: Python 3, FastAPI, SQLAlchemy ORM, `oracledb` driver, Pydantic v2.
- **Database**: Oracle Database XE (21c containerized via Docker).

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
│   │   ├── database.py      # SQLAlchemy engine & Oracle session configuration
│   │   ├── models.py        # SQLAlchemy ORM models (User, Event, Booking, Payment)
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   └── routers/         # API Route Handlers (auth, events, bookings, payments)
│   ├── .env                 # Oracle DB credentials & environment config
│   ├── test_db.py           # Connectivity verification script
│   └── requirements.txt     # Python dependencies
├── database/
│   ├── schema.sql           # DDL script (tables, primary key identity sequences, FKs)
│   └── seed.sql             # Initial seed data for users and events
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

## Setup & How to Run

### Prerequisites

Ensure the following tools are installed on your machine:
- **Docker** (or Docker Desktop / Podman)
- **Python 3.10+**
- **Node.js 18+** and `npm`

---

### Step 1: Start the Oracle XE Docker Container

Start the official Oracle Database XE container and expose port `1521`:

```bash
docker run -d \
  --name oracle-xe \
  -p 1521:1521 \
  -e ORACLE_PASSWORD=password \
  gvenzl/oracle-xe
```

Verify that the container is running and healthy:

```bash
docker ps
```

---

### Step 2: Set Up Backend Environment & Initialize Database

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create a Python virtual environment and activate it:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create/Verify your `backend/.env` file with the following database credentials:
   ```env
   ORACLE_USER=system
   ORACLE_PASSWORD=password
   ORACLE_HOST=127.0.0.1
   ORACLE_PORT=1521
   ORACLE_SERVICE_NAME=xepdb1
   ```

5. Test database connectivity and execute schema/seed scripts:
   ```bash
   # Test DB connectivity
   python test_db.py

   # Initialize tables & seed data
   python -c "
   import oracledb
   conn = oracledb.connect(user='system', password='password', dsn='127.0.0.1:1521/xepdb1')
   cur = conn.cursor()

   # Run Schema DDL
   with open('../database/schema.sql') as f:
       for stmt in [s.strip() for s in f.read().split(';') if s.strip()]:
           cur.execute(stmt)

   # Run Seed Data
   with open('../database/seed.sql') as f:
       for stmt in [s.strip() for s in f.read().split(';') if s.strip() and s.strip().upper() != 'COMMIT']:
           cur.execute(stmt)

   conn.commit()
   conn.close()
   print('Database initialized successfully!')
   "
   ```

---

### Step 3: Run Backend API Server

With your virtual environment activated in `backend/`:

```bash
c
```

- API Base URL: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

---

### Step 4: Run Frontend Application

In a new terminal window, navigate to the `frontend/` directory:

```bash
cd frontend
```

Install Node dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

- Web App URL: `http://localhost:5173`

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
