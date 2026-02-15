"""画像サービスのテスト（署名付きURL等）"""
import time

from app.services.image_service import (
    _is_allowed_domain,
    generate_signed_url,
    verify_signed_url,
)


def test_allowed_domains():
    assert _is_allowed_domain("https://books.google.com/thumb.jpg")
    assert _is_allowed_domain("https://thumbnail.image.rakuten.co.jp/img.jpg")
    assert not _is_allowed_domain("https://evil.com/payload.jpg")
    assert not _is_allowed_domain("https://books.google.com.evil.com/x.jpg")


def test_signed_url_generation_and_verification():
    url = generate_signed_url("test.webp")
    # Parse the URL
    assert "/api/v1/images/test.webp?" in url
    assert "token=" in url
    assert "expires=" in url

    # Extract token and expires
    params = {}
    query_string = url.split("?")[1]
    for param in query_string.split("&"):
        key, value = param.split("=")
        params[key] = value

    assert verify_signed_url("test.webp", params["token"], int(params["expires"]))


def test_signed_url_expired():
    expired_time = int(time.time()) - 100
    # Generate a token for an already-expired timestamp
    import hashlib
    import hmac
    from app.config import settings

    signature_string = f"test.webp:{expired_time}"
    token = hmac.new(
        settings.SECRET_KEY.encode(),
        signature_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    assert not verify_signed_url("test.webp", token, expired_time)


def test_signed_url_wrong_filename():
    url = generate_signed_url("correct.webp")
    params = {}
    query_string = url.split("?")[1]
    for param in query_string.split("&"):
        key, value = param.split("=")
        params[key] = value

    assert not verify_signed_url("wrong.webp", params["token"], int(params["expires"]))
