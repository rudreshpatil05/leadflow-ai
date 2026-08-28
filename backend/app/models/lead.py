from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, Numeric
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
        index=True,
        default="new"
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

    property_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    configuration: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    location: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    budget_min: Mapped[float | None] = mapped_column(
        Numeric(15, 2),
        nullable=True
    )

    budget_max: Mapped[float | None] = mapped_column(
        Numeric(15, 2),
        nullable=True
    )

    currency: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True
    )

    timeline: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    purpose: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    down_payment: Mapped[float | None] = mapped_column(
        Numeric(15, 2),
        nullable=True
    )

    financing_required: Mapped[bool | None] = mapped_column(
        Boolean,
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
        nullable=False,
        default=datetime.utcnow
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )