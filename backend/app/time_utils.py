from datetime import datetime, timezone


def now_utc() -> datetime:
    """返回 naive UTC 时间（tzinfo=None），避免 naive/aware 比较崩溃。"""
    return datetime.utcnow()


def to_utc_naive(dt: datetime) -> datetime:
    """把 datetime 规范化为 naive UTC。"""
    if dt.tzinfo is None:
        return dt  # 约定：naive 就是 UTC
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def parse_iso_to_utc_naive(s: str) -> datetime:
    """解析 ISO 时间字符串 -> naive UTC。
    支持 'Z' 结尾或带 '+09:00' 等 offset。
    """
    ss = s.strip()
    if ss.endswith("Z"):
        ss = ss[:-1] + "+00:00"
    dt = datetime.fromisoformat(ss)
    return to_utc_naive(dt)


def iso_utc_z(dt: datetime) -> str:
    """把 naive UTC 输出成带 Z 的 ISO（前端最友好）。"""
    dt2 = to_utc_naive(dt).replace(tzinfo=timezone.utc)
    return dt2.isoformat().replace("+00:00", "Z")
