from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import db
from ..models import EventCategory, User
from ..schemas import EventCategoryOut, EventCategoryUpsertIn
from ..security import admin_user

router = APIRouter()


def _to_out(item: EventCategory) -> EventCategoryOut:
    return EventCategoryOut(
        id=item.id,
        kind=item.kind,
        name=item.name,
        description=item.description,
        status=item.status,
    )


@router.get("/event-categories", response_model=List[EventCategoryOut])
def list_event_categories(kind: Literal["concerts", "exhibitions"] | None = None, sess: Session = Depends(db)):
    stmt = select(EventCategory)
    if kind:
        stmt = stmt.where(EventCategory.kind == kind)
    items = sess.scalars(stmt.order_by(EventCategory.id.desc())).all()
    return [_to_out(item) for item in items]


@router.post("/admin/event-categories", response_model=List[EventCategoryOut])
def upsert_event_categories(
    body: EventCategoryUpsertIn,
    sess: Session = Depends(db),
    _: User = Depends(admin_user),
):
    seen_names = set()
    for item in body.items:
        name = item.name.strip()
        if not name:
            raise HTTPException(422, "Category name required")
        if name in seen_names:
            raise HTTPException(409, "Duplicate category name in request")
        seen_names.add(name)

    results: List[EventCategory] = []
    for item in body.items:
        name = item.name.strip()
        if item.id is not None:
            cat = sess.get(EventCategory, item.id)
            if not cat or cat.kind != body.kind:
                raise HTTPException(404, "Category not found")
            conflict = sess.scalar(
                select(EventCategory).where(
                    EventCategory.kind == body.kind,
                    EventCategory.name == name,
                    EventCategory.id != cat.id,
                )
            )
            if conflict:
                raise HTTPException(409, "Category name already exists")
            cat.name = name
            cat.description = item.description
            cat.status = item.status
        else:
            existing = sess.scalar(
                select(EventCategory).where(
                    EventCategory.kind == body.kind,
                    EventCategory.name == name,
                )
            )
            if existing:
                raise HTTPException(409, "Category name already exists")
            cat = EventCategory(
                kind=body.kind,
                name=name,
                description=item.description,
                status=item.status,
            )
            sess.add(cat)
        results.append(cat)
    sess.commit()
    for cat in results:
        sess.refresh(cat)
    return [_to_out(cat) for cat in results]
