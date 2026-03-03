from pydantic import BaseModel, Field, field_validator


class BookResponse(BaseModel):
    id: str
    isbn_10: str | None
    isbn_13: str | None
    title: str
    subtitle: str | None
    series_title: str | None
    volume_number: str | None
    authors: list[str]
    publisher: str | None
    published_date: str | None
    description: str | None
    page_count: int | None
    cover_image_url: str | None  # 署名付きURL
    categories: list[str]
    language: str | None
    source: str
    is_custom: bool

    model_config = {"from_attributes": True}


class BookSearchResultResponse(BaseModel):
    """外部API検索結果のレスポンス"""
    isbn_10: str | None = None
    isbn_13: str | None = None
    title: str
    subtitle: str | None = None
    authors: list[str] | None = None
    publisher: str | None = None
    published_date: str | None = None
    description: str | None = None
    page_count: int | None = None
    cover_image_url: str | None = None
    categories: list[str] | None = None
    language: str | None = None
    source: str
    source_id: str | None = None


class CustomBookCreate(BaseModel):
    title: str = Field(max_length=200)
    authors: list[str] = Field(default_factory=list)
    publisher: str | None = Field(default=None, max_length=100)
    published_date: str | None = None
    isbn: str | None = None
    description: str | None = Field(default=None, max_length=2000)
    page_count: int | None = Field(default=None, ge=1, le=99999)

    @field_validator("authors")
    @classmethod
    def validate_authors(cls, v: list[str]) -> list[str]:
        if len(v) > 5:
            raise ValueError("Maximum 5 authors allowed")
        for author in v:
            if len(author) > 100:
                raise ValueError("Each author name must be 100 characters or less")
        return v
