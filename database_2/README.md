# CockroachDB Setup for Showtime

This project supports either the existing Oracle database or a CockroachDB PostgreSQL-compatible database. The selected backend is controlled by the `DB_TYPE` environment variable in the backend configuration.

## Prerequisites

- Python 3.10+
- A running CockroachDB cluster or a local single-node instance
- TLS certificates for secure connections when required by your deployment
- The Python dependency from `backend/requirements.txt` installed in the backend virtual environment

For a local test deployment, you can start CockroachDB with the official binary:

```bash
# Example: local single-node database on 127.0.0.1:26257
cockroach start-single-node \
  --insecure \
  --listen-addr=localhost:26257 \
  --http-addr=localhost:8080
```

For secure deployments, prefer a certificate-backed configuration and set `sslmode=verify-full` or another supported PostgreSQL TLS mode.

## Create or select a database

Create a database and user in CockroachDB, or use an existing database:

```sql
CREATE DATABASE showtime;
CREATE USER showtime_user WITH PASSWORD 'change_me';
GRANT ALL ON DATABASE showtime TO showtime_user;
```

If using a different database name, update `COCKROACH_DATABASE_URL` accordingly.

## Configure the connection URL

Set the backend environment variables in `backend/.env`:

```env
DB_TYPE=cockroachdb
COCKROACH_DATABASE_URL=postgresql+psycopg://showtime_user:change_me@localhost:26257/showtime?sslmode=verify-full
```

The connection string must be a PostgreSQL-compatible SQLAlchemy URL. For secure CockroachDB deployments, do not disable TLS verification in production. Use certificates and the proper SSL mode for your cluster.

## Apply the schema

From the repository root:

```bash
cd backend
source .venv/bin/activate
cockroach sql --url 'postgresql://showtime_user:change_me@localhost:26257/showtime?sslmode=verify-full' < ../database_2/schema.sql
```

If you are using the `psql` PostgreSQL-compatible client instead of `cockroach sql`, the SQL is compatible with CockroachDB and can be run with a PostgreSQL client that supports the database.

## Load seed data

```bash
cd backend
source .venv/bin/activate
cockroach sql --url 'postgresql://showtime_user:change_me@localhost:26257/showtime?sslmode=verify-full' < ../database_2/seed.sql
```

The seed scripts assume a fresh CockroachDB database or a database without conflicting user email values. The SQL uses `ON CONFLICT` guards so repeated runs do not duplicate the same rows unnecessarily.

## Configure the backend

The backend uses `DB_TYPE` to decide which connection to create at startup. Oracle remains the default so existing setups keep working without changes:

```env
DB_TYPE=oracle
# or
DB_TYPE=cockroachdb
```

After changing `DB_TYPE` or the connection string, restart the FastAPI backend process.

## Start the FastAPI backend

From the backend directory:

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API remains on the same routes and payloads regardless of the selected database backend.

## Start the frontend

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

The frontend continues to use the same API endpoint contract, and the backend selection is transparent to the browser.

## Switch back to Oracle

Set the environment variables back to the Oracle settings and restart the FastAPI server:

```env
DB_TYPE=oracle
ORACLE_USER=system
ORACLE_PASSWORD=password
ORACLE_HOST=127.0.0.1
ORACLE_PORT=1521
ORACLE_SERVICE_NAME=xepdb1
```

## Validate connectivity

```bash
cd backend
source .venv/bin/activate
python test_db.py
```

This script checks the active `DB_TYPE`, validates the required environment variables, and verifies a simple `SELECT 1` query without printing secret values.

## Troubleshooting

- `Missing required environment variable 'COCKROACH_DATABASE_URL'`: update `backend/.env` or export the variable before starting the backend.
- `Unsupported DB_TYPE value`: use `oracle` or `cockroachdb` exactly.
- TLS handshake or certificate errors: ensure your CockroachDB client certificates and `sslmode` match the cluster configuration.
- `Connection refused` or `timed out`: verify the cluster is running and the host, port, and database name are correct.
- `READ ONLY`-related errors from the admin query endpoint: the backend only uses the transaction-read-only pattern for Oracle, which matches the existing implementation.

The project intentionally does not silently fall back between databases. If the selected database is unavailable, the backend fails clearly instead of switching to a different engine.
