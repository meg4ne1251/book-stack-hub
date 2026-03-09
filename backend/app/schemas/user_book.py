from typing import Literal

from pydantic import BaseModel, Field

ValidStatus = Literal[
    "want_to_read", "unread", "reading", "suspended", "finished"
]


class UserBookCreate(BaseModel):
    book_id: str
    status: ValidStatus = "want_to_read"
    is_owned: bool = False


class UserBookUpdate(BaseModel):
    status: ValidStatus | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    private_memo: str | None = Field(default=None, max_length=5000)
    is_owned: bool | None = None
    purchase_price: int | None = Field(default=None, ge=0, le=9999999)
    started_reading_at: str | None = None
    finished_reading_at: str | None = None


class UserBookResponse(BaseModel):
    id: str
    book: dict
    status: str
    rating: int | None
    private_memo: str | None
    is_owned: bool
    purchase_price: int | None
    started_reading_at: str | None
    finished_reading_at: str | None
    tags: list[dict]
    created_at: str
    updated_at: str
