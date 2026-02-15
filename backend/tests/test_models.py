"""モデル定義のインポートが正常に動作することを確認するテスト"""


def test_models_import():
    """全モデルが正常にインポートできること"""
    from app.models import (
        Book,
        Playlist,
        PlaylistItem,
        ReadingLog,
        Review,
        Tag,
        User,
        UserBook,
        RefreshToken,
        PasswordResetToken,
    )

    assert User.__tablename__ == "users"
    assert Book.__tablename__ == "books"
    assert UserBook.__tablename__ == "user_books"
    assert ReadingLog.__tablename__ == "reading_logs"
    assert Review.__tablename__ == "reviews"
    assert Playlist.__tablename__ == "playlists"
    assert PlaylistItem.__tablename__ == "playlist_items"
    assert Tag.__tablename__ == "tags"
    assert RefreshToken.__tablename__ == "refresh_tokens"
    assert PasswordResetToken.__tablename__ == "password_reset_tokens"


def test_user_model_columns():
    """Userモデルに要件定義書で指定された全カラムが存在すること"""
    from app.models import User

    columns = {c.name for c in User.__table__.columns}
    expected = {
        "id", "email", "username", "display_name", "password_hash",
        "avatar_url", "bio", "locale", "role", "is_active",
        "is_profile_public", "deactivated_at", "created_at", "updated_at",
    }
    assert expected.issubset(columns)


def test_book_model_columns():
    """Bookモデルに要件定義書で指定された全カラムが存在すること"""
    from app.models import Book

    columns = {c.name for c in Book.__table__.columns}
    expected = {
        "id", "isbn_10", "isbn_13", "title", "subtitle",
        "series_title", "volume_number", "authors", "publisher",
        "published_date", "description", "page_count",
        "cover_image_path", "cover_image_original_url", "categories",
        "language", "source", "source_id", "is_custom", "created_by",
        "created_at", "updated_at",
    }
    assert expected.issubset(columns)


def test_user_book_model_columns():
    """UserBookモデルに要件定義書で指定された全カラムが存在すること"""
    from app.models import UserBook

    columns = {c.name for c in UserBook.__table__.columns}
    expected = {
        "id", "user_id", "book_id", "status", "rating",
        "private_memo", "is_owned", "purchase_price",
        "started_reading_at", "finished_reading_at",
        "created_at", "updated_at",
    }
    assert expected.issubset(columns)
