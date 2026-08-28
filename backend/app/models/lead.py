from datetime import datetime

from sqlalchemy import String, Text, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.database import Base


class Lead(Base):

    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    phone: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True
    )

    email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    source: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="new",
        index=True
    )

    temperature: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
        index=True
    )

    score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    qualification_reasons: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    intent: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    next_best_action: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )