from fastapi import Query


class PaginationParams:
    """共通ページネーションパラメータ"""

    def __init__(
        self,
        page: int = Query(default=1, ge=1, description="ページ番号"),
        per_page: int = Query(
            default=20, ge=1, le=50, description="1ページあたりの件数"
        ),
    ):
        self.page = page
        self.per_page = per_page

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page
