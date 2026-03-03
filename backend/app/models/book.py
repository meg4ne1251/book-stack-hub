import uuid

import sqlalchemy as sa
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class Book(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "books"

    isbn_10: Mapped[str | None] = mapped_column(
        String(10), nullable=True, index=True
    )
    isbn_13: Mapped[str | None] = mapped_column(
        String(13), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(500), nullable=True)
    series_title: Mapped[str | None] = mapped_column(
        String(500), nullable=True, index=True
    )
    volume_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    authors: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")
    )
    publisher: Mapped[str | None] = mapped_column(String(200), nullable=True)
    published_date: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    categories: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")
    )
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    source: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default="manual"
    )
    is_custom: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    user_books = relationship("UserBook", back_populates="book")
    reviews = relationship("Review", back_populates="book")
    reading_logs = relationship("ReadingLog", back_populates="book")
