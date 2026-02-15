"""タグAPI"""
import uuid

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.dependencies import CurrentUser, DBSession
from app.models.tag import Tag
from app.utils.exceptions import AlreadyExistsException, NotFoundException

router = APIRouter(prefix="/me/tags", tags=["tags"])


class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=30)


class TagUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=30)


@router.get("")
async def list_tags(
    current_user: CurrentUser,
    db: DBSession,
):
    """自分のタグ一覧"""
    result = await db.execute(
        select(Tag)
        .where(Tag.user_id == current_user.id)
        .order_by(Tag.name)
    )
    tags = result.scalars().all()
    return {
        "data": [{"id": str(t.id), "name": t.name} for t in tags]
    }


@router.post("")
async def create_tag(
    body: TagCreate,
    current_user: CurrentUser,
    db: DBSession,
):
    """タグ作成"""
    # 重複チェック
    result = await db.execute(
        select(Tag).where(
            Tag.user_id == current_user.id,
            Tag.name == body.name,
        )
    )
    if result.scalar_one_or_none():
        raise AlreadyExistsException("Tag already exists")

    tag = Tag(user_id=current_user.id, name=body.name)
    db.add(tag)
    await db.flush()

    return {"data": {"id": str(tag.id), "name": tag.name}}


@router.patch("/{tag_id}")
async def update_tag(
    tag_id: uuid.UUID,
    body: TagUpdate,
    current_user: CurrentUser,
    db: DBSession,
):
    """タグ名変更"""
    result = await db.execute(
        select(Tag).where(
            Tag.id == tag_id, Tag.user_id == current_user.id
        )
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise NotFoundException("Tag not found")

    tag.name = body.name
    return {"data": {"id": str(tag.id), "name": tag.name}}


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """タグ削除"""
    result = await db.execute(
        select(Tag).where(
            Tag.id == tag_id, Tag.user_id == current_user.id
        )
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise NotFoundException("Tag not found")

    await db.delete(tag)
