# CockroachDB Setup for Showtime

Showtime uses the same FastAPI backend and React frontend with Oracle or CockroachDB. Select the backend with `DB_TYPE`; only the selected database needs to be running. The backend does not silently fall back to another database.

For the complete application runbook, including Oracle, see the repository [README](../README.md).

## Local development with Docker on Linux

Prerequisites: Docker Engine, a working Docker service, Python 3.10+, and Node.js/npm. CockroachDB does not need to be installed on the host.

Start a single-node, loopback-only local cluster. `--insecure` disables authentication and TLS, so this configuration is strictly for local development and must not be exposed to a network. Linux host networking is used so the loopback listener is reachable at `localhost:26257`. The admin UI uses port `18080` to avoid a common port conflict.

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

The admin UI is at `http://localhost:18080`. Confirm the container is running with:

```bash
docker ps --filter name=showtime-cockroach-dev
```

To stop and later restart this database without losing its volume data:

```bash
docker stop showtime-cockroach-dev
docker start showtime-cockroach-dev
```

If `26257` is already in use, stop the conflicting service or select another SQL port and use the same port in both the container's `--listen-addr` and the backend URL. If `18080` is occupied, change only `--http-addr`.

## Initialize the schema and seed data

From the repository root, create tables and load demo data:

```bash
docker exec -i showtime-cockroach-dev cockroach sql \
  --insecure --host=localhost:26257 --database=defaultdb \
  < database_2/schema.sql

docker exec -i showtime-cockroach-dev cockroach sql \
  --insecure --host=localhost:26257 --database=defaultdb \
  < database_2/seed.sql
```

The schema creates the Showtime tables, foreign keys, checks, unique constraints, and indexes. The seed data is intended for a fresh database. It uses fixed IDs for related demo records; don't use this seed script to initialize a database that already contains application records.

The demo accounts are:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `password123` |
| User | `raghav@example.com` | `password123` |

These are development credentials only.

## Configure the backend

Create `backend/.env` from the example if needed, then configure:

```env
DB_TYPE=cockroachdb
COCKROACH_DATABASE_URL=postgresql+psycopg://root@localhost:26257/defaultdb?sslmode=disable
```

The app maps the PostgreSQL-compatible URL to CockroachDB's SQLAlchemy dialect. The `sslmode=disable` setting is only valid for the local insecure development cluster described above.

Install dependencies and check connectivity from the `backend/` directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python test_db.py
python -m pytest -q test_db.py
```

## Start the app

From `backend/`, with the virtual environment active:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal, from `frontend/`:

```bash
npm install
npm run dev
```

Open the local Vite URL printed by npm, normally `http://localhost:5173`. The frontend uses the existing API and does not need a CockroachDB-specific build or configuration.

## Secure CockroachDB deployments

For CockroachDB Cloud or another secure cluster:

1. Create/select a cluster and SQL database/user with the provider's supported process.
2. Obtain the provider's connection string and CA certificate using its documented secure connection workflow.
3. Set `DB_TYPE=cockroachdb` and set `COCKROACH_DATABASE_URL` to the SQLAlchemy-compatible URL. Preserve TLS verification, such as `sslmode=verify-full`, and include the provider's CA certificate path if required.
4. Apply `schema.sql` and `seed.sql` using the provider's `cockroach sql --url ...` command or its documented PostgreSQL-compatible SQL client.
5. Run `python test_db.py`, then start the API and frontend as above.

Never use `--insecure` or `sslmode=disable` for a production or network-accessible database. Keep credentials and certificate files out of source control and logs. Do not paste credential-bearing URLs into issue reports.

## Troubleshooting

- `Connection refused`: confirm the container/cluster is running, port and host match, and local firewall/network configuration permits access.
- `Missing required environment variable 'COCKROACH_DATABASE_URL'`: set it in `backend/.env`; restart the backend after configuration changes.
- `Unsupported DB_TYPE`: use `oracle` or `cockroachdb`.
- TLS/certificate errors: use the CA certificate and SSL parameters supplied for your cluster; do not bypass verification in production.
- SQL object already exists: the schema script is for a fresh database. Do not drop production tables to rerun it.
- Seed conflicts: the seed file is for a fresh database and uses fixed IDs. Avoid rerunning it after modifying those records.

For a secure public deployment, also address the application's documented authentication and authorization limitations in the root README before exposing the API.
