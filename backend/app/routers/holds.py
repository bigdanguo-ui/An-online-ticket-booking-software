import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import HOLD_MINUTES
from ..database import db
from ..models import Hall, HoldGroup, Order, OrderSeat, Seat, SeatHold, Showtime, User
from ..schemas import HoldIn, HoldOut
from ..security import current_user
from ..time_utils import iso_utc_z, now_utc
from ..utils import cleanup_expired_holds

router = APIRouter()


@router.post("/showtimes/{showtime_id}/hold", response_model=HoldOut)
def hold_seats(showtime_id: int, body: HoldIn, sess: Session = Depends(db), u: User = Depends(current_user)):
    show = sess.get(Showtime, showtime_id)
    if not show:
        raise HTTPException(404, "场次不存在")
    if not body.seat_ids:
        raise HTTPException(400, "请选择座位")

    cleanup_expired_holds(sess, showtime_id=showtime_id)
    sess.flush()

    hall = sess.get(Hall, show.hall_id)
    valid_seat_ids = set(sess.scalars(select(Seat.id).where(Seat.hall_id == hall.id)).all())
    for sid in body.seat_ids:
        if sid not in valid_seat_ids:
            raise HTTPException(400, f"非法座位: {sid}")

    sold = set(
        sess.scalars(
            select(OrderSeat.seat_id)
            .join(Order, OrderSeat.order_id == Order.id)
            .where(and_(OrderSeat.showtime_id == showtime_id, Order.status == "PAID"))
        ).all()
    )
    if any(sid in sold for sid in body.seat_ids):
        raise HTTPException(409, "包含已售座位，请刷新")

    hold_token = uuid.uuid4().hex
    expires_at = now_utc() + timedelta(minutes=HOLD_MINUTES)

    hg = HoldGroup(id=hold_token, user_id=u.id, showtime_id=showtime_id, expires_at=expires_at)
    sess.add(hg)
    sess.flush()

    try:
        for sid in body.seat_ids:
            sess.add(
                SeatHold(
                    hold_group_id=hold_token,
                    showtime_id=showtime_id,
                    seat_id=sid,
                    user_id=u.id,
                    expires_at=expires_at,
                )
            )
        sess.commit()
    except IntegrityError:
        sess.rollback()
        raise HTTPException(409, "座位已被他人锁定，请换座或刷新")

    return HoldOut(hold_token=hold_token, expires_at=iso_utc_z(expires_at), seat_ids=body.seat_ids)


@router.post("/holds/{hold_token}/release")
def release_hold(hold_token: str, sess: Session = Depends(db), u: User = Depends(current_user)):
    hg = sess.get(HoldGroup, hold_token)
    if not hg or hg.user_id != u.id:
        raise HTTPException(404, "锁座不存在")
    sess.execute(delete(SeatHold).where(SeatHold.hold_group_id == hold_token))
    sess.execute(delete(HoldGroup).where(HoldGroup.id == hold_token))
    sess.commit()
    return {"ok": True}
