import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import db
from ..models import Cinema, Hall, HoldGroup, Movie, Order, OrderSeat, Seat, SeatHold, Showtime, User
from ..schemas import CheckoutIn, OrderOut
from ..security import current_user
from ..time_utils import iso_utc_z, now_utc
from ..utils import cleanup_expired_holds

router = APIRouter()


@router.post("/orders/checkout", response_model=OrderOut)
def checkout(body: CheckoutIn, sess: Session = Depends(db), u: User = Depends(current_user)):
    hg = sess.get(HoldGroup, body.hold_token)
    if not hg or hg.user_id != u.id:
        raise HTTPException(404, "锁座不存在")

    # 这里是你之前崩溃的点：hg.expires_at 与 now_utc() 必须同类（现在都 naive UTC）
    if hg.expires_at < now_utc():
        raise HTTPException(409, "锁座已过期，请重新选座")

    cleanup_expired_holds(sess, showtime_id=hg.showtime_id)
    sess.flush()

    holds = sess.scalars(select(SeatHold).where(SeatHold.hold_group_id == body.hold_token)).all()
    if not holds:
        raise HTTPException(409, "锁座已失效，请重新选座")

    show = sess.get(Showtime, hg.showtime_id)
    hall = sess.get(Hall, show.hall_id)
    cinema = sess.get(Cinema, hall.cinema_id)
    movie = sess.get(Movie, show.movie_id)

    seat_ids = [h.seat_id for h in holds]
    seats = sess.scalars(select(Seat).where(Seat.id.in_(seat_ids))).all()
    seat_labels = [s.label for s in sorted(seats, key=lambda x: (x.row, x.col))]

    order_id = uuid.uuid4().hex
    total = show.price_cents * len(seat_ids)

    order = Order(
        id=order_id,
        user_id=u.id,
        showtime_id=show.id,
        status="CREATED",
        total_cents=total,
        ticket_code="",
    )
    sess.add(order)
    sess.flush()

    try:
        for sid in seat_ids:
            sess.add(OrderSeat(order_id=order_id, showtime_id=show.id, seat_id=sid))

        sess.execute(delete(SeatHold).where(SeatHold.hold_group_id == body.hold_token))
        sess.execute(delete(HoldGroup).where(HoldGroup.id == body.hold_token))
        sess.commit()
    except IntegrityError:
        sess.rollback()
        raise HTTPException(409, "座位已被抢，请重新选座")

    return OrderOut(
        id=order.id,
        status=order.status,
        total_cents=order.total_cents,
        created_at=iso_utc_z(order.created_at),
        movie_title=movie.title,
        start_time=iso_utc_z(show.start_time),
        hall_name=hall.name,
        cinema_name=cinema.name,
        seats=seat_labels,
        ticket_code=order.ticket_code,
    )


@router.post("/orders/{order_id}/mock_pay", response_model=OrderOut)
def mock_pay(order_id: str, sess: Session = Depends(db), u: User = Depends(current_user)):
    order = sess.get(Order, order_id)
    if not order or order.user_id != u.id:
        raise HTTPException(404, "订单不存在")

    if order.status == "PAID":
        pass
    elif order.status != "CREATED":
        raise HTTPException(409, f"订单状态不可支付：{order.status}")

    order.status = "PAID"
    order.ticket_code = f"TKT-{uuid.uuid4().hex[:10].upper()}"
    sess.commit()

    show = sess.get(Showtime, order.showtime_id)
    hall = sess.get(Hall, show.hall_id)
    cinema = sess.get(Cinema, hall.cinema_id)
    movie = sess.get(Movie, show.movie_id)

    seat_ids = [x.seat_id for x in order.seats]
    seats = sess.scalars(select(Seat).where(Seat.id.in_(seat_ids))).all()
    seat_labels = [s.label for s in sorted(seats, key=lambda x: (x.row, x.col))]

    return OrderOut(
        id=order.id,
        status=order.status,
        total_cents=order.total_cents,
        created_at=iso_utc_z(order.created_at),
        movie_title=movie.title,
        start_time=iso_utc_z(show.start_time),
        hall_name=hall.name,
        cinema_name=cinema.name,
        seats=seat_labels,
        ticket_code=order.ticket_code,
    )


@router.post("/orders/{order_id}/cancel")
def cancel_order(order_id: str, sess: Session = Depends(db), u: User = Depends(current_user)):
    order = sess.get(Order, order_id)
    if not order or order.user_id != u.id:
        raise HTTPException(404, "订单不存在")
    if order.status == "PAID":
        raise HTTPException(409, "已支付订单请走退款流程（此MVP未实现自动退款）")
    if order.status != "CREATED":
        return {"ok": True}

    sess.execute(delete(OrderSeat).where(OrderSeat.order_id == order_id))
    order.status = "CANCELED"
    sess.commit()
    return {"ok": True}


@router.get("/orders", response_model=List[OrderOut])
def list_orders(sess: Session = Depends(db), u: User = Depends(current_user)):
    stmt = (
        select(Order, Showtime, Hall, Cinema, Movie)
        .join(Showtime, Order.showtime_id == Showtime.id)
        .join(Hall, Showtime.hall_id == Hall.id)
        .join(Cinema, Hall.cinema_id == Cinema.id)
        .join(Movie, Showtime.movie_id == Movie.id)
        .where(Order.user_id == u.id)
        .order_by(Order.created_at.desc())
    )
    rows = sess.execute(stmt).all()

    out = []
    for order, show, hall, cinema, movie in rows:
        seat_ids = sess.scalars(select(OrderSeat.seat_id).where(OrderSeat.order_id == order.id)).all()
        seats = sess.scalars(select(Seat).where(Seat.id.in_(seat_ids))).all()
        seat_labels = [s.label for s in sorted(seats, key=lambda x: (x.row, x.col))]

        out.append(
            OrderOut(
                id=order.id,
                status=order.status,
                total_cents=order.total_cents,
                created_at=iso_utc_z(order.created_at),
                movie_title=movie.title,
                start_time=iso_utc_z(show.start_time),
                hall_name=hall.name,
                cinema_name=cinema.name,
                seats=seat_labels,
                ticket_code=order.ticket_code,
            )
        )
    return out
