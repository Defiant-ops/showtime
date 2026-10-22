from app.database import engine
from sqlalchemy import text

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1 FROM dual"))
        print("Oracle connection successful:", result.scalar())
except Exception as exc:
    print("Oracle connection failed.")
    print(exc)
conn = oracledb.connect(user='system', password='password', dsn='127.0.0.1:1521/xepdb1')
cur = conn.cursor()

