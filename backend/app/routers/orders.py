import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import db
# ✅ 1. 引入所有活动相关的模型
from ..models import Cinema, Hall, HoldGroup, Movie, Order, OrderSeat, Seat, SeatHold, Showtime, User, Event
from ..schemas import CheckoutIn, OrderOut
from ..security import current_user
from ..time_utils import iso_utc_z, now_utc
from ..utils import cleanup_expired_holds

router = APIRouter()

# ✅ 辅助函数：根据排期信息获取活动标题
def get_event_title(sess: Session, show: Showtime) -> str:
    title = "未知活动"
    if show.event_kind == "movie":
        m = sess.get(Movie, show.target_id)
        if m: title = m.title
    elif show.event_kind == "concert":
        c = sess.get(Event, show.target_id)
        if c: title = c.title
    elif show.event_kind == "exhibition":
        e = sess.get(Event, show.target_id)
        if e: title = e.title
    return title

@router.post("/orders/checkout", response_model=OrderOut)
def checkout(body: CheckoutIn, sess: Session = Depends(db), u: User = Depends(current_user)):
    hg = sess.get(HoldGroup, body.hold_token)
    if not hg or hg.user_id != u.id:
        raise HTTPException(404, "锁座不存在")

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

    # ✅ 2. 修复：不再硬编码 Movie，而是动态获取标题
    event_title = get_event_title(sess, show)

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
        movie_title=event_title, # 这里填入通用标题
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

    # ✅ 3. 修复：这里原来有 show.movie_id，已修改为动态获取
    event_title = get_event_title(sess, show)

    seat_ids = [x.seat_id for x in order.seats]
    seats = sess.scalars(select(Seat).where(Seat.id.in_(seat_ids))).all()
    seat_labels = [s.label for s in sorted(seats, key=lambda x: (x.row, x.col))]

    return OrderOut(
        id=order.id,
        status=order.status,
        total_cents=order.total_cents,
        created_at=iso_utc_z(order.created_at),
        movie_title=event_title,
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
    # ✅ 4. 修复：移除 .join(Movie, ...)
    # 以前是强制 JOIN Movie，现在 showtime 可能是 concert，JOIN Movie 会过滤掉非电影订单或报错
    stmt = (
        select(Order, Showtime, Hall, Cinema)
        .join(Showtime, Order.showtime_id == Showtime.id)
        .join(Hall, Showtime.hall_id == Hall.id)
        .join(Cinema, Hall.cinema_id == Cinema.id)
        .where(Order.user_id == u.id)
        .order_by(Order.created_at.desc())
    )
    rows = sess.execute(stmt).all()

    out = []
    # 结果不再包含 movie 对象，需要手动获取 title
    for order, show, hall, cinema in rows:
        seat_ids = sess.scalars(select(OrderSeat.seat_id).where(OrderSeat.order_id == order.id)).all()
        seats = sess.scalars(select(Seat).where(Seat.id.in_(seat_ids))).all()
        seat_labels = [s.label for s in sorted(seats, key=lambda x: (x.row, x.col))]

        # ✅ 5. 动态获取标题
        event_title = get_event_title(sess, show)

        out.append(
            OrderOut(
                id=order.id,
                status=order.status,
                total_cents=order.total_cents,
                created_at=iso_utc_z(order.created_at),
                movie_title=event_title, # 前端字段名没变，但内容是动态的
                start_time=iso_utc_z(show.start_time),
                hall_name=hall.name,
                cinema_name=cinema.name,
                seats=seat_labels,
                ticket_code=order.ticket_code,
            )
        )
    return out