import re

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)
    display_name: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=8)
    turnstile_token: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError("Username must contain only alphanumeric characters and underscores")
        return v

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        categories = 0
        if re.search(r"[a-z]", v):
            categories += 1
        if re.search(r"[A-Z]", v):
            categories += 1
        if re.search(r"[0-9]", v):
            categories += 1
        if re.search(r"[^a-zA-Z0-9]", v):
            categories += 1
        if categories < 3:
            raise ValueError(
                "Password must contain at least 3 of: lowercase, uppercase, digits, special characters"
            )
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    turnstile_token: str


class AuthResponse(BaseModel):
    access_token: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    display_name: str
    avatar_url: str | None
    bio: str | None
    locale: str
    role: str
    is_active: bool
    is_profile_public: bool
    created_at: str

    model_config = {"from_attributes": True}

    @field_validator("id", "created_at", mode="before")
    @classmethod
    def stringify(cls, v):  # type: ignore[no-untyped-def]
        return str(v)


class RefreshResponse(BaseModel):
    access_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        categories = 0
        if re.search(r"[a-z]", v):
            categories += 1
        if re.search(r"[A-Z]", v):
            categories += 1
        if re.search(r"[0-9]", v):
            categories += 1
        if re.search(r"[^a-zA-Z0-9]", v):
            categories += 1
        if categories < 3:
            raise ValueError(
                "Password must contain at least 3 of: lowercase, uppercase, digits, special characters"
            )
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        categories = 0
        if re.search(r"[a-z]", v):
            categories += 1
        if re.search(r"[A-Z]", v):
            categories += 1
        if re.search(r"[0-9]", v):
            categories += 1
        if re.search(r"[^a-zA-Z0-9]", v):
            categories += 1
        if categories < 3:
            raise ValueError(
                "Password must contain at least 3 of: lowercase, uppercase, digits, special characters"
            )
        return v
