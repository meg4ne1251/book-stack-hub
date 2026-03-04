"""書籍API - 検索・詳細・カスタム書籍登録"""
import logging
import uuid
from datetime import date

from fastapi import APIRouter, File, Form, Query, UploadFile

from app.dependencies import CurrentUser, DBSession
from app.models.book import Book
from app.schemas.book import BookResponse, BookSearchResultResponse, CustomBookCreate, ExternalBookRegister
from app.services.book_search import search_external, search_internal
from app.services.image_service import (
    convert_and_save_image,
    download_and_convert_cover,
    generate_signed_url,
    validate_image_magic_bytes,
)
from app.utils.exceptions import (
    AlreadyExistsException,
    FileTooLargeException,
    ForbiddenException,
    NotFoundException,
    UnsupportedMediaTypeException,
    ValidationException,
)
from app.utils.response import paginated_response
from app.utils.series import extract_series_info

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/books", tags=["books"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


def _book_to_response(book: Book) -> dict:
    """Bookモデルをレスポンスdictに変換（署名付きURL付き）"""
    cover_url = book.cover_image_url

    # ローカル保存の画像（カスタム書籍など）は署名付きURLに変換
    if cover_url and not cover_url.startswith(("http://", "https://")):
        cover_url = generate_signed_url(cover_url)

    return {
        "id": str(book.id),
        "isbn_10": book.isbn_10,
        "isbn_13": book.isbn_13,
        "title": book.title,
        "subtitle": book.subtitle,
        "series_title": book.series_title,
        "volume_number": book.volume_number,
        "authors": book.authors or [],
        "publisher": book.publisher,
        "published_date": str(book.published_date) if book.published_date else None,
        "description": book.description,
        "page_count": book.page_count,
        "cover_image_url": cover_url,
        "categories": book.categories or [],
        "language": book.language,
        "source": book.source,
        "is_custom": book.is_custom,
    }


@router.get("/search")
async def search_books(
    current_user: CurrentUser,
    db: DBSession,
    q: str | None = Query(default=None, max_length=200, description="検索キーワード"),
    isbn: str | None = Query(default=None, max_length=20, description="ISBN-10 or ISBN-13"),
    source: str = Query(default="all", description="internal|external|all"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=40),
):
    """書籍検索（内部/外部/統合）"""
    results = []

    if source in ("internal", "all"):
        books, total = await search_internal(
            db, query=q, isbn=isbn, user_id=str(current_user.id),
            page=page, per_page=per_page,
        )
        internal_results = [_book_to_response(b) for b in books]
        if source == "internal":
            return paginated_response(internal_results, page, per_page, total)
        results.extend(internal_results)

    if source in ("external", "all"):
        external_results = await search_external(
            query=q, isbn=isbn, page=page, per_page=per_page,
        )
        for r in external_results:
            results.append(BookSearchResultResponse(
                isbn_10=r.isbn_10,
                isbn_13=r.isbn_13,
                title=r.title,
                subtitle=r.subtitle,
                authors=r.authors,
                publisher=r.publisher,
                published_date=r.published_date,
                description=r.description,
                page_count=r.page_count,
                cover_image_url=r.cover_image_url,
                categories=r.categories,
                language=r.language,
                source=r.source,
                source_id=r.source_id,
            ).model_dump())

    return paginated_response(results, page, per_page, len(results))


@router.get("/{book_id}")
async def get_book(
    book_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """書籍詳細取得"""
    from sqlalchemy import select

    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    if not book:
        raise NotFoundException("Book not found")

    # カスタム書籍は作成者のみ閲覧可能
    if book.is_custom and book.created_by != current_user.id:
        raise ForbiddenException("Cannot access this custom book")

    return {"data": _book_to_response(book)}


@router.post("/register")
async def register_external_book(
    current_user: CurrentUser,
    db: DBSession,
    body: ExternalBookRegister,
):
    """外部検索結果の書籍をマスターDBに登録する（既存ならそのまま返す）"""
    from sqlalchemy import select, or_

    # ISBN で既存チェック
    if body.isbn_10 or body.isbn_13:
        conditions = []
        if body.isbn_13:
            conditions.append(Book.isbn_13 == body.isbn_13)
        if body.isbn_10:
            conditions.append(Book.isbn_10 == body.isbn_10)
        result = await db.execute(
            select(Book).where(or_(*conditions), Book.is_custom.is_(False))
        )
        existing = result.scalar_one_or_none()
        if existing:
            return {"data": _book_to_response(existing)}

    # シリーズ情報抽出
    series_title, volume_number = extract_series_info(body.title)

    # 表紙画像ダウンロード
    cover_path = None
    if body.cover_image_url:
        try:
            cover_path = download_and_convert_cover(body.cover_image_url)
        except Exception:
            logger.warning("Failed to download cover image: %s", body.cover_image_url)

    book = Book(
        isbn_10=body.isbn_10,
        isbn_13=body.isbn_13,
        title=body.title,
        subtitle=body.subtitle,
        series_title=series_title,
        volume_number=volume_number,
        authors=body.authors or [],
        publisher=body.publisher,
        published_date=body.published_date,
        description=body.description,
        page_count=body.page_count,
        cover_image_url=body.cover_image_url,
        categories=body.categories or [],
        language=body.language,
        source=body.source,
        is_custom=False,
    )
    db.add(book)
    await db.flush()

    return {"data": _book_to_response(book)}


@router.post("/custom")
async def create_custom_book(
    current_user: CurrentUser,
    db: DBSession,
    title: str = Form(..., max_length=200),
    authors: str = Form(default=""),
    publisher: str | None = Form(default=None, max_length=100),
    published_date: str | None = Form(default=None),
    isbn: str | None = Form(default=None),
    description: str | None = Form(default=None, max_length=2000),
    page_count: int | None = Form(default=None, ge=1, le=99999),
    cover_image: UploadFile | None = File(default=None),
):
    """カスタム書籍の手動登録（multipart/form-data）"""
    from sqlalchemy import select, or_

    # ISBN重複チェック
    if isbn:
        isbn = isbn.replace("-", "")
        # マスター書籍との重複
        result = await db.execute(
            select(Book).where(
                or_(Book.isbn_13 == isbn, Book.isbn_10 == isbn),
                Book.is_custom.is_(False),
            )
        )
        if result.scalar_one_or_none():
            raise AlreadyExistsException(
                "A master book with this ISBN already exists"
            )

        # 自分のカスタム書籍との重複
        result = await db.execute(
            select(Book).where(
                or_(Book.isbn_13 == isbn, Book.isbn_10 == isbn),
                Book.is_custom.is_(True),
                Book.created_by == current_user.id,
            )
        )
        if result.scalar_one_or_none():
            raise AlreadyExistsException(
                "You already have a custom book with this ISBN"
            )

    # 表紙画像処理
    cover_path = None
    if cover_image and cover_image.filename:
        if cover_image.content_type not in ALLOWED_IMAGE_TYPES:
            raise UnsupportedMediaTypeException()

        image_data = await cover_image.read()
        if len(image_data) > MAX_IMAGE_SIZE:
            raise FileTooLargeException()

        # マジックバイト検証（Content-Type偽装対策）
        if not validate_image_magic_bytes(image_data):
            raise UnsupportedMediaTypeException()

        cover_path = convert_and_save_image(image_data)

    # 著者リストパース
    authors_list = [a.strip() for a in authors.split(",") if a.strip()] if authors else []

    # ISBN判定
    isbn_10 = isbn if isbn and len(isbn) == 10 else None
    isbn_13 = isbn if isbn and len(isbn) == 13 else None

    # シリーズ情報抽出
    series_title, volume_number = extract_series_info(title)

    if published_date:
        try:
            date.fromisoformat(published_date)
        except ValueError:
            raise ValidationException("Invalid date format. Use YYYY-MM-DD.")

    book = Book(
        title=title,
        authors=authors_list,
        publisher=publisher,
        published_date=published_date,
        isbn_10=isbn_10,
        isbn_13=isbn_13,
        description=description,
        page_count=page_count,
        cover_image_url=cover_path,
        series_title=series_title,
        volume_number=volume_number,
        source="custom",
        is_custom=True,
        created_by=current_user.id,
    )
    db.add(book)
    await db.flush()

    return {"data": _book_to_response(book)}
