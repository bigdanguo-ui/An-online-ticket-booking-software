from sqlalchemy import delete
from sqlalchemy.orm import Session

from .models import HoldGroup, SeatHold
from .time_utils import now_utc


def seat_label(r: int, c: int) -> str:
    return f"{chr(ord('A') + r)}{c + 1}"


def cleanup_expired_holds(sess: Session, showtime_id: int | None = None):
    q = delete(SeatHold).where(SeatHold.expires_at < now_utc())
    if showtime_id is not None:
        q = q.where(SeatHold.showtime_id == showtime_id)
    sess.execute(q)

    qg = delete(HoldGroup).where(HoldGroup.expires_at < now_utc())
    if showtime_id is not None:
        qg = qg.where(HoldGroup.showtime_id == showtime_id)
    sess.execute(qg)
