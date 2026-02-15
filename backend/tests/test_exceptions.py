"""例外クラスのテスト"""
from app.utils.exceptions import (
    UnauthorizedException,
    InvalidCredentialsException,
    ForbiddenException,
    NotFoundException,
    AlreadyExistsException,
    ValidationException,
    RateLimitExceededException,
    ExternalAPIException,
)


def test_unauthorized_exception():
    exc = UnauthorizedException()
    assert exc.status_code == 401
    assert exc.error_code == "UNAUTHORIZED"


def test_invalid_credentials_exception():
    exc = InvalidCredentialsException()
    assert exc.status_code == 401
    assert exc.error_code == "INVALID_CREDENTIALS"


def test_forbidden_exception():
    exc = ForbiddenException()
    assert exc.status_code == 403
    assert exc.error_code == "FORBIDDEN"


def test_not_found_exception():
    exc = NotFoundException("Book not found")
    assert exc.status_code == 404
    assert exc.error_code == "RESOURCE_NOT_FOUND"
    assert exc.error_message == "Book not found"


def test_already_exists_exception():
    exc = AlreadyExistsException()
    assert exc.status_code == 409
    assert exc.error_code == "ALREADY_EXISTS"


def test_validation_exception_with_details():
    details = [{"field": "email", "message": "Invalid format"}]
    exc = ValidationException("Validation failed", details)
    assert exc.status_code == 400
    assert exc.error_details == details


def test_rate_limit_exceeded():
    exc = RateLimitExceededException()
    assert exc.status_code == 429


def test_external_api_exception():
    exc = ExternalAPIException("Google Books API timeout")
    assert exc.status_code == 502
    assert exc.error_message == "Google Books API timeout"
