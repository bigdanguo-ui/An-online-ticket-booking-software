from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from ..database import db
from ..models import Hall, Order, OrderSeat, Seat, SeatHold, Showtime, User
from ..schemas import SeatState
from ..security import current_user
from ..time_utils import now_utc
from ..utils import cleanup_expired_holds

router = APIRouter()


@router.get("/showtimes/{showtime_id}/seats", response_model=List[SeatState])
def showtime_seats(showtime_id: int, sess: Session = Depends(db)):
    show = sess.get(Showtime, showtime_id)
    if not show:
        raise HTTPException(404, "场次不存在")

    cleanup_expired_holds(sess, showtime_id=showtime_id)
    sess.commit()

    hall = sess.get(Hall, show.hall_id)
    seats = sess.scalars(select(Seat).where(Seat.hall_id == hall.id)).all()

    sold = set(
        sess.scalars(
            select(OrderSeat.seat_id)
            .join(Order, OrderSeat.order_id == Order.id)
            .where(and_(OrderSeat.showtime_id == showtime_id, Order.status == "PAID"))
        ).all()
    )

    holds = sess.execute(
        select(SeatHold.seat_id, SeatHold.user_id).where(
            and_(SeatHold.showtime_id == showtime_id, SeatHold.expires_at >= now_utc())
        )
    ).all()
    hold_map: Dict[int, int] = {sid: uid for sid, uid in holds}

    out = []
    for s in seats:
        if s.id in sold:
            state = "SOLD"
        elif s.id in hold_map:
            state = "HELD"
        else:
            state = "AVAILABLE"
        out.append(SeatState(seat_id=s.id, label=s.label, row=s.row, col=s.col, state=state))
    return out


@router.get("/showtimes/{showtime_id}/seats/me", response_model=List[SeatState])
def showtime_seats_me(showtime_id: int, sess: Session = Depends(db), u: User = Depends(current_user)):
    show = sess.get(Showtime, showtime_id)
    if not show:
        raise HTTPException(404, "场次不存在")

    cleanup_expired_holds(sess, showtime_id=showtime_id)
    sess.commit()

    hall = sess.get(Hall, show.hall_id)
    seats = sess.scalars(select(Seat).where(Seat.hall_id == hall.id)).all()

    sold = set(
        sess.scalars(
            select(OrderSeat.seat_id)
            .join(Order, OrderSeat.order_id == Order.id)
            .where(and_(OrderSeat.showtime_id == showtime_id, Order.status == "PAID"))
        ).all()
    )

    holds = sess.execute(
        select(SeatHold.seat_id, SeatHold.user_id).where(
            and_(SeatHold.showtime_id == showtime_id, SeatHold.expires_at >= now_utc())
        )
    ).all()
    hold_map: Dict[int, int] = {sid: uid for sid, uid in holds}

    out = []
    for s in seats:
        if s.id in sold:
            state = "SOLD"
        elif s.id in hold_map:
            state = "HELD_BY_ME" if hold_map[s.id] == u.id else "HELD"
        else:
            state = "AVAILABLE"
        out.append(SeatState(seat_id=s.id, label=s.label, row=s.row, col=s.col, state=state))
    return out
