import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class UserBook(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_books"
    __table_args__ = (
        UniqueConstraint("user_id", "book_id", name="uq_user_books_user_book"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    rating: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    private_memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_owned: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    purchase_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_reading_at: Mapped[date | None] = mapped_column(
        Date, nullable=True
    )
    finished_reading_at: Mapped[date | None] = mapped_column(
        Date, nullable=True
    )

    # Relationships
    user = relationship("User", back_populates="user_books")
    book = relationship("Book", back_populates="user_books")
    tags = relationship(
        "Tag",
        secondary="user_book_tags",
        back_populates="user_books",
    )
