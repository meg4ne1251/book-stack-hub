"""シリーズ自動抽出のテスト"""
from app.utils.series import extract_series_info


def test_parentheses_volume():
    title, vol = extract_series_info("進撃の巨人（12）")
    assert title == "進撃の巨人"
    assert vol == "00012"


def test_half_width_parentheses():
    title, vol = extract_series_info("ワンピース(100)")
    assert title == "ワンピース"
    assert vol == "00100"


def test_volume_suffix():
    title, vol = extract_series_info("ワンピース 第12巻")
    assert title == "ワンピース"
    assert vol == "00012"


def test_vol_dot():
    title, vol = extract_series_info("Title Vol.3")
    assert title == "Title"
    assert vol == "00003"


def test_hash_volume():
    title, vol = extract_series_info("Series #5")
    assert title == "Series"
    assert vol == "00005"


def test_no_volume():
    title, vol = extract_series_info("単独タイトル")
    assert title is None
    assert vol is None


def test_trailing_number():
    title, vol = extract_series_info("Series Name 42")
    assert title == "Series Name"
    assert vol == "00042"
