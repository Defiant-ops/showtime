import sys

from sqlalchemy import text

from app.database import engine


def main() -> int:
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1 FROM dual"))
            print("Oracle connection successful:", result.scalar())
    except Exception as exc:
        print("Oracle connection failed.")
        print(exc)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

