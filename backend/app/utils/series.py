"""書籍タイトルからシリーズ名と巻数を自動抽出"""
import re


def extract_series_info(title: str) -> tuple[str | None, str | None]:
    """
    タイトルからシリーズ名と巻数を抽出。
    Returns: (series_title, volume_number) or (None, None)
    """
    patterns = [
        # 「進撃の巨人（12）」「進撃の巨人(12)」
        r"^(.*?)[\s　]*[（(](\d+)[)）]$",
        # 「ワンピース 第12巻」
        r"^(.*?)[\s　]*第?(\d+)巻$",
        # 「ワンピース Vol.12」「ワンピース Vol12」
        r"^(.*?)[\s　]*[Vv]ol\.?\s*(\d+)$",
        # 「ワンピース #12」
        r"^(.*?)[\s　]*#(\d+)$",
        # 「ワンピース 12」（末尾数字）
        r"^(.*?)[\s　]+(\d+)$",
    ]

    for pattern in patterns:
        match = re.match(pattern, title.strip())
        if match:
            series_title = match.group(1).strip()
            volume_str = match.group(2)
            if series_title and volume_str:
                # 巻数を左ゼロ埋め（ソート用、最大5桁）
                volume_number = volume_str.zfill(5)
                return series_title, volume_number

    return None, None
