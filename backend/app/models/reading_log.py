import uuid
from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import UUIDPrimaryKeyMixin


class ReadingLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "reading_logs"
    __table_args__ = (
        Index("idx_reading_logs_user_date", "user_id", "read_date"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
    )
    read_date: Mapped[date] = mapped_column(Date, nullable=False)
    pages_read: Mapped[int | None] = mapped_column(Integer, nullable=True)
    minutes_read: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default="now()",
    )

    # Relationships
    user = relationship("User", back_populates="reading_logs")
    book = relationship("Book", back_populates="reading_logs")
