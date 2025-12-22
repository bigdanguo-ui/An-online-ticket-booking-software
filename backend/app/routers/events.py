# routers/events.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import db
# 确保引入了相关的模型和Schema
# 注意：这里假设 Showtime 模型中有一个 event_id 字段来关联 Event 表
# 如果你的数据库还在用 movie_id，请将下文的 Showtime.event_id 改为 Showtime.movie_id
from ..models import Event, User, Showtime, Hall, Cinema, Movie
from ..schemas import EventOut, EventCreate, EventUpdate, ShowtimeOut
from ..security import admin_user
from ..time_utils import iso_utc_z # 确保你有这个工具函数，如果没有请手动处理时间

router = APIRouter()

# ==========================================
# 0. 通用逻辑辅助函数 (Helper Functions)
# ==========================================

def list_events_by_kind(kind: str, sess: Session, q: str = "", category: Optional[str] = None):
    """按类型查询列表，支持标题搜索"""
    stmt = select(Event).where(Event.kind == kind).where(Event.status == "ON")
    if q and q.strip():
        stmt = stmt.where(Event.title.contains(q.strip()))
    if category and category.strip():
        stmt = stmt.where(Event.category == category)
    # 按 ID 倒序排列
    items = sess.scalars(stmt.order_by(Event.id.desc())).all()
    return items

def get_event_by_id(kind: str, id: int, sess: Session):
    """查询单个事件，校验类型"""
    item = sess.get(Event, id)
    # 既要存在，类型也要匹配 (防止用电影ID去查演唱会)
    if not item or item.kind != kind:
        raise HTTPException(404, f"{kind} not found")
    return item

def get_event_showtimes(id: int, sess: Session):
    """查询事件关联的场次 (关联 Hall 和 Cinema)"""
    stmt = (
        select(Showtime, Hall, Cinema)
        .join(Hall, Showtime.hall_id == Hall.id)
        .join(Cinema, Hall.cinema_id == Cinema.id)
        # 🔥 注意：这里假设 Showtime 表里有一个 event_id 字段关联 Event 表
        # 如果你的数据库 Showtime 表里还是 movie_id，请改为: .where(Showtime.movie_id == id)
        # 或者为了兼容性，确保 models.py 里 Showtime 定义了正确的 ForeignKey
        .where(Showtime.movie_id == id)
        .order_by(Showtime.start_time.asc())
    )
    rows = sess.execute(stmt).all()
    out = []
    for st, hall, cinema in rows:
        out.append(
            ShowtimeOut(
                id=st.id,
                # 统一返回 event_id，Schema 中可能叫 movie_id，需注意兼容
                movie_id=st.event_id,
                hall_id=st.hall_id,
                start_time=iso_utc_z(st.start_time),
                price_cents=st.price_cents,
                hall_name=hall.name,
                cinema_name=cinema.name,
            )
        )
    return out

def create_event_by_kind(kind: str, body: EventCreate, sess: Session):
    """创建逻辑"""
    # 强制将 kind 写入数据库
    data = body.dict()
    db_event = Event(**data, kind=kind)
    sess.add(db_event)
    sess.commit()
    sess.refresh(db_event)
    return db_event

def update_event_logic(id: int, body: EventUpdate, sess: Session):
    """更新逻辑"""
    event = sess.get(Event, id)
    if not event:
        raise HTTPException(404, "Event not found")

    data = body.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(event, key, value)

    sess.commit()
    sess.refresh(event)
    return event

def delete_event_logic(id: int, sess: Session):
    """删除逻辑"""
    event = sess.get(Event, id)
    if not event:
        raise HTTPException(404, "Event not found")
    sess.delete(event)
    sess.commit()
    return {"ok": True}


# ==========================================
# 1. 电影 (Movies) 接口 - 独立逻辑 (操作 Movie 表)
# ==========================================

@router.get("/movies", response_model=List[EventOut])
def list_movies(q: str = "", category: Optional[str] = None, sess: Session = Depends(db)):
    """
    查询电影列表
    - 支持按标题搜索 (q)
    - 支持按分类筛选 (category)
    """
    # 1. 查询 Movie 表
    stmt = select(Movie).where(Movie.status == "ON")

    # 2. 标题搜索
    if q and q.strip():
        stmt = stmt.where(Movie.title.contains(q.strip()))

    # 3. ✅ 分类筛选 (确保 Movie 模型里有 category 字段)
    if category and category.strip():
        stmt = stmt.where(Movie.category == category)

    # 4. 执行查询
    items = sess.scalars(stmt.order_by(Movie.id.desc())).all()

    # 5. 返回数据 (手动补充 kind="movie")
    return [EventOut(**m.__dict__, kind="movie") for m in items]


@router.get("/movies/{id}", response_model=EventOut)
def get_movie(id: int, sess: Session = Depends(db)):
    """查询单个电影详情"""
    m = sess.get(Movie, id)
    if not m or m.status != "ON":
        raise HTTPException(404, "电影不存在")
    return EventOut(**m.__dict__, kind="movie")


@router.get("/movies/{id}/showtimes", response_model=List[ShowtimeOut])
def movie_showtimes(id: int, sess: Session = Depends(db)):
    """查询电影场次"""
    stmt = (
        select(Showtime, Hall, Cinema)
        .join(Hall, Showtime.hall_id == Hall.id)
        .join(Cinema, Hall.cinema_id == Cinema.id)
        .where(Showtime.movie_id == id) # 电影表使用 movie_id 关联
        .order_by(Showtime.start_time.asc())
    )
    rows = sess.execute(stmt).all()
    out = []
    for st, hall, cinema in rows:
        out.append(ShowtimeOut(
            id=st.id, movie_id=st.movie_id, hall_id=st.hall_id,
            start_time=iso_utc_z(st.start_time), price_cents=st.price_cents,
            hall_name=hall.name, cinema_name=cinema.name
        ))
    return out


# --- 电影管理接口 (独立逻辑) ---

@router.post("/admin/movies", response_model=EventOut)
def create_movie(body: EventCreate, sess: Session = Depends(db), _: User = Depends(admin_user)):
    """
    新增电影
    ✅ 明确接收 category 并写入 Movie 表
    """
    # 1. 转为字典，排除不需要的字段
    # exclude={"kind"} 是因为 Movie 表里通常没有 kind 列，kind 是前端用的
    data = body.dict(exclude={"kind"}, exclude_unset=True)

    # 2. 创建 Movie 对象
    # 注意：这里会自动包含 category，只要 schemas.py 里的 EventCreate 定义了它
    new_movie = Movie(**data)

    sess.add(new_movie)
    sess.commit()
    sess.refresh(new_movie)

    return EventOut(**new_movie.__dict__, kind="movie")


@router.put("/admin/movies/{id}", response_model=EventOut)
def update_movie(id: int, body: EventUpdate, sess: Session = Depends(db), _: User = Depends(admin_user)):
    """
    修改电影
    ✅ 明确更新 category 字段
    """
    m = sess.get(Movie, id)
    if not m:
        raise HTTPException(404, "电影不存在")

    # 1. 获取要更新的数据
    data = body.dict(exclude_unset=True)

    # 2. 遍历更新字段
    for k, v in data.items():
        # 只要 Movie 模型里有这个字段（包括 category），就会被更新
        if hasattr(m, k):
            setattr(m, k, v)

    sess.commit()
    sess.refresh(m)
    return EventOut(**m.__dict__, kind="movie")


@router.delete("/admin/movies/{id}")
def delete_movie(id: int, sess: Session = Depends(db), _: User = Depends(admin_user)):
    """删除电影"""
    m = sess.get(Movie, id)
    if not m:
        raise HTTPException(404, "电影不存在")
    sess.delete(m)
    sess.commit()
    return {"ok": True}


# ==========================================
# 2. 演唱会 (Concerts) 接口 - 完整 CRUD
# ==========================================

@router.get("/concerts", response_model=List[EventOut])
def list_concerts(q: str = "", category: Optional[str] = None, sess: Session = Depends(db)):

    return list_events_by_kind("concert", sess, q, category)

@router.get("/concerts/{id}", response_model=EventOut)
def get_concert(id: int, sess: Session = Depends(db)):
    return get_event_by_id("concert", id, sess)

@router.get("/concerts/{id}/showtimes", response_model=List[ShowtimeOut])
def concert_showtimes(id: int, sess: Session = Depends(db)):
    return get_event_showtimes(id, sess)

@router.post("/admin/concerts", response_model=EventOut)
def create_concert(body: EventCreate, sess: Session = Depends(db), _: User = Depends(admin_user)):
    return create_event_by_kind("concert", body, sess)

@router.put("/admin/concerts/{id}", response_model=EventOut)
def update_concert(id: int, body: EventUpdate, sess: Session = Depends(db), _: User = Depends(admin_user)):
    return update_event_logic(id, body, sess)

@router.delete("/admin/concerts/{id}")
def delete_concert(id: int, sess: Session = Depends(db), _: User = Depends(admin_user)):
    return delete_event_logic(id, sess)


# ==========================================
# 3. 漫展 (Exhibitions) 接口 - 完整 CRUD
# ==========================================

@router.get("/exhibitions", response_model=List[EventOut])
def list_exhibitions(q: str = "", category: Optional[str] = None, sess: Session = Depends(db)):
    return list_events_by_kind("exhibition", sess, q, category)

@router.get("/exhibitions/{id}", response_model=EventOut)
def get_exhibition(id: int, sess: Session = Depends(db)):
    return get_event_by_id("exhibition", id, sess)

@router.get("/exhibitions/{id}/showtimes", response_model=List[ShowtimeOut])
def exhibition_showtimes(id: int, sess: Session = Depends(db)):
    return get_event_showtimes(id, sess)

@router.post("/admin/exhibitions", response_model=EventOut)
def create_exhibition(body: EventCreate, sess: Session = Depends(db), _: User = Depends(admin_user)):
    return create_event_by_kind("exhibition", body, sess)

@router.put("/admin/exhibitions/{id}", response_model=EventOut)
def update_exhibition(id: int, body: EventUpdate, sess: Session = Depends(db), _: User = Depends(admin_user)):
    return update_event_logic(id, body, sess)

@router.delete("/admin/exhibitions/{id}")
def delete_exhibition(id: int, sess: Session = Depends(db), _: User = Depends(admin_user)):
    return delete_event_logic(id, sess)