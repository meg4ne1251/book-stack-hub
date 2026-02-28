"""署名付きURL生成・検証のテスト"""
import time

import pytest

from app.services.image_service import (
    generate_signed_url,
    validate_image_magic_bytes,
    verify_signed_url,
)


class TestSignedUrl:
    """署名付きURL生成・検証"""

    def test_generate_and_verify_valid(self):
        """正常な署名付きURLが生成・検証できる"""
        filename = "test-uuid-1234.webp"
        url = generate_signed_url(filename)

        assert f"/api/v1/images/{filename}" in url
        assert "token=" in url
        assert "expires=" in url

        # URLからtoken, expiresを抽出
        parts = url.split("?")[1].split("&")
        token = parts[0].split("=")[1]
        expires = int(parts[1].split("=")[1])

        assert verify_signed_url(filename, token, expires)

    def test_verify_with_wrong_filename(self):
        """ファイル名が異なると検証失敗"""
        filename = "test-uuid-1234.webp"
        url = generate_signed_url(filename)

        parts = url.split("?")[1].split("&")
        token = parts[0].split("=")[1]
        expires = int(parts[1].split("=")[1])

        assert not verify_signed_url("wrong-file.webp", token, expires)

    def test_verify_with_wrong_token(self):
        """トークンが異なると検証失敗"""
        filename = "test-uuid-1234.webp"
        url = generate_signed_url(filename)

        parts = url.split("?")[1].split("&")
        expires = int(parts[1].split("=")[1])

        assert not verify_signed_url(filename, "invalid-token", expires)

    def test_verify_expired(self):
        """有効期限切れで検証失敗"""
        filename = "test-uuid-1234.webp"
        expired_time = int(time.time()) - 100  # 過去

        assert not verify_signed_url(filename, "any-token", expired_time)

    def test_verify_tampered_expires(self):
        """expiresを改ざんすると検証失敗"""
        filename = "test-uuid-1234.webp"
        url = generate_signed_url(filename)

        parts = url.split("?")[1].split("&")
        token = parts[0].split("=")[1]
        expires = int(parts[1].split("=")[1])

        # expiresを1秒ずらす
        assert not verify_signed_url(filename, token, expires + 1)


class TestMagicByteValidation:
    """画像マジックバイト検証"""

    def test_valid_jpeg(self):
        """JPEG形式のマジックバイトを検出"""
        jpeg_data = b'\xff\xd8\xff\xe0' + b'\x00' * 100
        assert validate_image_magic_bytes(jpeg_data)

    def test_valid_png(self):
        """PNG形式のマジックバイトを検出"""
        png_data = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100
        assert validate_image_magic_bytes(png_data)

    def test_valid_webp(self):
        """WebP形式のマジックバイトを検出"""
        webp_data = b'RIFF\x00\x00\x00\x00WEBP' + b'\x00' * 100
        assert validate_image_magic_bytes(webp_data)

    def test_invalid_data(self):
        """不正なデータは拒否"""
        assert not validate_image_magic_bytes(b'\x00\x00\x00\x00' * 10)

    def test_empty_data(self):
        """空データは拒否"""
        assert not validate_image_magic_bytes(b'')

    def test_too_short(self):
        """短すぎるデータは拒否"""
        assert not validate_image_magic_bytes(b'\xff\xd8')

    def test_riff_but_not_webp(self):
        """RIFF形式だがWebPでないデータは拒否"""
        riff_data = b'RIFF\x00\x00\x00\x00WAVE' + b'\x00' * 100
        assert not validate_image_magic_bytes(riff_data)

    def test_pdf_disguised_as_image(self):
        """PDFファイルは拒否"""
        pdf_data = b'%PDF-1.4' + b'\x00' * 100
        assert not validate_image_magic_bytes(pdf_data)

    def test_html_disguised_as_image(self):
        """HTMLファイルは拒否"""
        html_data = b'<html>' + b'\x00' * 100
        assert not validate_image_magic_bytes(html_data)
