from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from sqlmodel import Session, SQLModel, create_engine


DB_PATH = Path(__file__).resolve().parent.parent / "data" / "chores.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

database_url = f"sqlite:///{DB_PATH}"
engine = create_engine(database_url, echo=False, connect_args={"check_same_thread": False})


def init_db() -> None:
    """Create database tables if they don't exist."""
    SQLModel.metadata.create_all(engine)


@contextmanager
def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
