from fastapi import HTTPException, status


class AppException(HTTPException):
    """アプリケーション共通例外"""

    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: list | None = None,
    ):
        self.error_code = error_code
        self.error_message = message
        self.error_details = details or []
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": error_code,
                    "message": message,
                    "details": self.error_details,
                }
            },
        )


# 認証系
class UnauthorizedException(AppException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(status.HTTP_401_UNAUTHORIZED, "UNAUTHORIZED", message)


class TokenExpiredException(AppException):
    def __init__(self):
        super().__init__(
            status.HTTP_401_UNAUTHORIZED, "TOKEN_EXPIRED", "Access token has expired"
        )


class InvalidCredentialsException(AppException):
    def __init__(self):
        super().__init__(
            status.HTTP_401_UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "Invalid email or password",
        )


class ForbiddenException(AppException):
    def __init__(self, message: str = "Access denied"):
        super().__init__(status.HTTP_403_FORBIDDEN, "FORBIDDEN", message)


class CustomBookRestrictedException(AppException):
    def __init__(self):
        super().__init__(
            status.HTTP_403_FORBIDDEN,
            "CUSTOM_BOOK_RESTRICTED",
            "Custom books can only be added by their creator",
        )


# リソース系
class NotFoundException(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(status.HTTP_404_NOT_FOUND, "RESOURCE_NOT_FOUND", message)


class AlreadyExistsException(AppException):
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(status.HTTP_409_CONFLICT, "ALREADY_EXISTS", message)


# バリデーション系
class ValidationException(AppException):
    def __init__(self, message: str, details: list | None = None):
        super().__init__(
            status.HTTP_400_BAD_REQUEST, "VALIDATION_ERROR", message, details
        )


class InvalidISBNException(AppException):
    def __init__(self):
        super().__init__(
            status.HTTP_400_BAD_REQUEST, "INVALID_ISBN", "Invalid ISBN format"
        )


# ファイル系
class FileTooLargeException(AppException):
    def __init__(self):
        super().__init__(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "FILE_TOO_LARGE",
            "File size exceeds the maximum limit",
        )


class UnsupportedMediaTypeException(AppException):
    def __init__(self):
        super().__init__(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "UNSUPPORTED_MEDIA_TYPE",
            "Unsupported file format",
        )


# レートリミット
class RateLimitExceededException(AppException):
    def __init__(self):
        super().__init__(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "RATE_LIMIT_EXCEEDED",
            "Too many requests. Please try again later.",
        )


# 外部API
class ExternalAPIException(AppException):
    def __init__(self, message: str = "External API call failed"):
        super().__init__(status.HTTP_502_BAD_GATEWAY, "EXTERNAL_API_ERROR", message)
