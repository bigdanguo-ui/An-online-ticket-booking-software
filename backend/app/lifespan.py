from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import FastAPI
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Cinema, Event, Hall, Movie, Seat, Showtime, User
from .security import hash_pw
from .time_utils import now_utc
from .utils import seat_label

MOVIE_SEEDS = [
    {
        "title": "星际摆烂：重启",
        "description": "一部关于在宇宙里摸鱼的史诗。",
        "category": "科幻",
        "duration_min": 128,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie01/400/600",
        "status": "ON",
    },
    {
        "title": "代码与月光",
        "description": "Debug 到凌晨，月光照进终端。",
        "category": "爱情",
        "duration_min": 108,
        "rating": "PG",
        "poster_url": "https://picsum.photos/seed/movie02/400/600",
        "status": "ON",
    },
    {
        "title": "霓虹追光",
        "description": "在赛博都市里追逐最后的真相。",
        "category": "动作",
        "duration_min": 118,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie03/400/600",
        "status": "ON",
    },
    {
        "title": "时间折叠",
        "description": "一次实验，把时间折成了两半。",
        "category": "科幻",
        "duration_min": 132,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie04/400/600",
        "status": "ON",
    },
    {
        "title": "深海信号",
        "description": "来自深海的信号引发一连串谜团。",
        "category": "悬疑",
        "duration_min": 110,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie05/400/600",
        "status": "ON",
    },
    {
        "title": "风起海岸",
        "description": "海岸线边的相遇，写下新的篇章。",
        "category": "爱情",
        "duration_min": 104,
        "rating": "PG",
        "poster_url": "https://picsum.photos/seed/movie06/400/600",
        "status": "ON",
    },
    {
        "title": "纸鸢计划",
        "description": "一场关于飞翔与守护的温暖冒险。",
        "category": "动画",
        "duration_min": 96,
        "rating": "G",
        "poster_url": "https://picsum.photos/seed/movie07/400/600",
        "status": "ON",
    },
    {
        "title": "漫游火星",
        "description": "人类在火星上的第一次长驻任务。",
        "category": "科幻",
        "duration_min": 124,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie08/400/600",
        "status": "ON",
    },
    {
        "title": "暗夜侦探",
        "description": "被遗忘的案件，在雨夜重启。",
        "category": "悬疑",
        "duration_min": 115,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie09/400/600",
        "status": "ON",
    },
    {
        "title": "末日花园",
        "description": "末世之后，人类在温室里重建生活。",
        "category": "科幻",
        "duration_min": 130,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie10/400/600",
        "status": "ON",
    },
    {
        "title": "迷雾之城",
        "description": "城市被迷雾吞没，只能靠直觉破局。",
        "category": "悬疑",
        "duration_min": 112,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie11/400/600",
        "status": "ON",
    },
    {
        "title": "量子回声",
        "description": "每一次选择都会留下回声。",
        "category": "科幻",
        "duration_min": 126,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie12/400/600",
        "status": "ON",
    },
    {
        "title": "夏日漂流",
        "description": "一次误入小镇的暑期喜剧。",
        "category": "喜剧",
        "duration_min": 98,
        "rating": "PG",
        "poster_url": "https://picsum.photos/seed/movie13/400/600",
        "status": "ON",
    },
    {
        "title": "秋叶来信",
        "description": "一封旧信牵动两个人的心。",
        "category": "爱情",
        "duration_min": 102,
        "rating": "PG",
        "poster_url": "https://picsum.photos/seed/movie14/400/600",
        "status": "ON",
    },
    {
        "title": "冰川之下",
        "description": "冰川深处的秘密即将暴露。",
        "category": "动作",
        "duration_min": 120,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie15/400/600",
        "status": "ON",
    },
    {
        "title": "影子与花",
        "description": "关于失去与重逢的浪漫故事。",
        "category": "爱情",
        "duration_min": 109,
        "rating": "PG",
        "poster_url": "https://picsum.photos/seed/movie16/400/600",
        "status": "ON",
    },
    {
        "title": "逆风开场",
        "description": "新生代赛车手的逆袭之路。",
        "category": "动作",
        "duration_min": 116,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie17/400/600",
        "status": "ON",
    },
    {
        "title": "零号记忆",
        "description": "一段被删除的记忆重回现实。",
        "category": "科幻",
        "duration_min": 122,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie18/400/600",
        "status": "ON",
    },
    {
        "title": "孤岛直播",
        "description": "求生直播背后隐藏的真相。",
        "category": "悬疑",
        "duration_min": 111,
        "rating": "PG-13",
        "poster_url": "https://picsum.photos/seed/movie19/400/600",
        "status": "ON",
    },
    {
        "title": "星海电台",
        "description": "一档宇宙电台连接了不同的灵魂。",
        "category": "动画",
        "duration_min": 94,
        "rating": "G",
        "poster_url": "https://picsum.photos/seed/movie20/400/600",
        "status": "ON",
    },
]

CONCERT_SEEDS = [
    {
        "title": "星河巡航流行夜",
        "description": "流行金曲与宇宙主题舞台的结合。",
        "category": "流行",
        "poster_url": "https://picsum.photos/seed/concert01/400/600",
        "venue": "上海梅赛德斯奔驰文化中心",
        "price_info": "￥180-980",
        "status": "ON",
    },
    {
        "title": "霓虹摇滚现场",
        "description": "霓虹灯下的硬核摇滚之夜。",
        "category": "摇滚",
        "poster_url": "https://picsum.photos/seed/concert02/400/600",
        "venue": "北京工人体育场",
        "price_info": "￥220-1080",
        "status": "ON",
    },
    {
        "title": "岛屿民谣集",
        "description": "民谣歌手们带来温柔海风。",
        "category": "民谣",
        "poster_url": "https://picsum.photos/seed/concert03/400/600",
        "venue": "厦门海沧体育馆",
        "price_info": "￥160-680",
        "status": "ON",
    },
    {
        "title": "午夜爵士计划",
        "description": "深夜爵士乐队的城市巡演。",
        "category": "爵士",
        "poster_url": "https://picsum.photos/seed/concert04/400/600",
        "venue": "广州体育馆",
        "price_info": "￥200-880",
        "status": "ON",
    },
    {
        "title": "城市交响之夜",
        "description": "经典交响乐与现代灯光秀。",
        "category": "古典",
        "poster_url": "https://picsum.photos/seed/concert05/400/600",
        "venue": "国家大剧院音乐厅",
        "price_info": "￥280-1280",
        "status": "ON",
    },
    {
        "title": "K-POP闪耀舞台",
        "description": "顶级K-POP舞团燃爆现场。",
        "category": "K-POP",
        "poster_url": "https://picsum.photos/seed/concert06/400/600",
        "venue": "深圳湾体育中心",
        "price_info": "￥260-1380",
        "status": "ON",
    },
    {
        "title": "时光电台音乐会",
        "description": "复古流行与胶片氛围。",
        "category": "流行",
        "poster_url": "https://picsum.photos/seed/concert07/400/600",
        "venue": "成都露天音乐公园",
        "price_info": "￥180-880",
        "status": "ON",
    },
    {
        "title": "逆光摇滚节",
        "description": "摇滚乐队集结的城市节日。",
        "category": "摇滚",
        "poster_url": "https://picsum.photos/seed/concert08/400/600",
        "venue": "杭州奥体中心",
        "price_info": "￥240-980",
        "status": "ON",
    },
    {
        "title": "蓝调与星光",
        "description": "爵士蓝调与星空主题舞台。",
        "category": "爵士",
        "poster_url": "https://picsum.photos/seed/concert09/400/600",
        "venue": "南京青奥体育馆",
        "price_info": "￥200-820",
        "status": "ON",
    },
    {
        "title": "山野民谣会",
        "description": "自然与吉他交织的夜晚。",
        "category": "民谣",
        "poster_url": "https://picsum.photos/seed/concert10/400/600",
        "venue": "昆明拓东体育馆",
        "price_info": "￥150-620",
        "status": "ON",
    },
    {
        "title": "复古磁带派对",
        "description": "回到80年代的流行派对。",
        "category": "流行",
        "poster_url": "https://picsum.photos/seed/concert11/400/600",
        "venue": "武汉国际博览中心",
        "price_info": "￥180-760",
        "status": "ON",
    },
    {
        "title": "未来电音狂欢",
        "description": "电音与流行跨界现场。",
        "category": "流行",
        "poster_url": "https://picsum.photos/seed/concert12/400/600",
        "venue": "长沙贺龙体育馆",
        "price_info": "￥220-980",
        "status": "ON",
    },
    {
        "title": "萤火合唱夜",
        "description": "合唱团带来古典与现代混编。",
        "category": "古典",
        "poster_url": "https://picsum.photos/seed/concert13/400/600",
        "venue": "天津大剧院",
        "price_info": "￥200-980",
        "status": "ON",
    },
    {
        "title": "日落露台音乐节",
        "description": "落日时分的城市露台演出。",
        "category": "流行",
        "poster_url": "https://picsum.photos/seed/concert14/400/600",
        "venue": "西安国际会展中心",
        "price_info": "￥160-720",
        "status": "ON",
    },
    {
        "title": "北岸重金属现场",
        "description": "硬核摇滚与金属狂潮。",
        "category": "摇滚",
        "poster_url": "https://picsum.photos/seed/concert15/400/600",
        "venue": "青岛体育中心",
        "price_info": "￥240-980",
        "status": "ON",
    },
    {
        "title": "城市弦乐之旅",
        "description": "弦乐四重奏的城市巡礼。",
        "category": "古典",
        "poster_url": "https://picsum.photos/seed/concert16/400/600",
        "venue": "重庆大剧院",
        "price_info": "￥180-820",
        "status": "ON",
    },
    {
        "title": "星潮K-POP巡演",
        "description": "最热舞台编排与视觉特效。",
        "category": "K-POP",
        "poster_url": "https://picsum.photos/seed/concert17/400/600",
        "venue": "郑州奥体中心",
        "price_info": "￥260-1480",
        "status": "ON",
    },
    {
        "title": "蓝鲸爵士夜",
        "description": "蓝鲸乐队的爵士新专场。",
        "category": "爵士",
        "poster_url": "https://picsum.photos/seed/concert18/400/600",
        "venue": "苏州文化艺术中心",
        "price_info": "￥180-780",
        "status": "ON",
    },
    {
        "title": "木吉他公路记",
        "description": "民谣歌手公路巡演。",
        "category": "民谣",
        "poster_url": "https://picsum.photos/seed/concert19/400/600",
        "venue": "大连体育中心",
        "price_info": "￥150-620",
        "status": "ON",
    },
    {
        "title": "南风音乐节",
        "description": "热带风情与流行乐的融合。",
        "category": "流行",
        "poster_url": "https://picsum.photos/seed/concert20/400/600",
        "venue": "海口五源河体育场",
        "price_info": "￥180-880",
        "status": "ON",
    },
]

EXHIBITION_SEEDS = [
    {
        "title": "未来感城市艺术展",
        "description": "城市装置艺术与光影互动。",
        "category": "艺术展",
        "poster_url": "https://picsum.photos/seed/exhibit01/400/600",
        "venue": "上海当代艺术馆",
        "price_info": "￥60-120",
        "status": "ON",
    },
    {
        "title": "像素世界游戏展",
        "description": "经典像素游戏回顾与试玩。",
        "category": "游戏展",
        "poster_url": "https://picsum.photos/seed/exhibit02/400/600",
        "venue": "广州保利世贸博览馆",
        "price_info": "￥80-160",
        "status": "ON",
    },
    {
        "title": "星际机甲二次元展",
        "description": "机甲主题二次元IP合集。",
        "category": "二次元",
        "poster_url": "https://picsum.photos/seed/exhibit03/400/600",
        "venue": "深圳会展中心",
        "price_info": "￥90-180",
        "status": "ON",
    },
    {
        "title": "机能美学科技展",
        "description": "科技美学与新材料展示。",
        "category": "科技展",
        "poster_url": "https://picsum.photos/seed/exhibit04/400/600",
        "venue": "成都世纪城新会展中心",
        "price_info": "￥60-150",
        "status": "ON",
    },
    {
        "title": "速度与设计车展",
        "description": "概念车与设计趋势集合。",
        "category": "车展",
        "poster_url": "https://picsum.photos/seed/exhibit05/400/600",
        "venue": "北京国家会议中心",
        "price_info": "￥80-200",
        "status": "ON",
    },
    {
        "title": "光影剧场艺术展",
        "description": "沉浸式光影艺术空间。",
        "category": "艺术展",
        "poster_url": "https://picsum.photos/seed/exhibit06/400/600",
        "venue": "南京国际博览中心",
        "price_info": "￥70-160",
        "status": "ON",
    },
    {
        "title": "VR次元展",
        "description": "虚拟现实与二次元融合体验。",
        "category": "二次元",
        "poster_url": "https://picsum.photos/seed/exhibit07/400/600",
        "venue": "杭州国际博览中心",
        "price_info": "￥90-180",
        "status": "ON",
    },
    {
        "title": "复古街机展",
        "description": "街机文化与游戏历史回顾。",
        "category": "游戏展",
        "poster_url": "https://picsum.photos/seed/exhibit08/400/600",
        "venue": "武汉国际博览中心",
        "price_info": "￥60-140",
        "status": "ON",
    },
    {
        "title": "智能生活科技展",
        "description": "智能家居与AI新生活。",
        "category": "科技展",
        "poster_url": "https://picsum.photos/seed/exhibit09/400/600",
        "venue": "重庆悦来会展中心",
        "price_info": "￥60-150",
        "status": "ON",
    },
    {
        "title": "概念车未来展",
        "description": "未来出行概念车首发。",
        "category": "车展",
        "poster_url": "https://picsum.photos/seed/exhibit10/400/600",
        "venue": "青岛国际会展中心",
        "price_info": "￥90-220",
        "status": "ON",
    },
    {
        "title": "插画之森艺术展",
        "description": "当代插画师作品汇集。",
        "category": "艺术展",
        "poster_url": "https://picsum.photos/seed/exhibit11/400/600",
        "venue": "苏州文化艺术中心",
        "price_info": "￥60-120",
        "status": "ON",
    },
    {
        "title": "幻境Cosplay嘉年华",
        "description": "沉浸式二次元嘉年华。",
        "category": "二次元",
        "poster_url": "https://picsum.photos/seed/exhibit12/400/600",
        "venue": "西安国际会展中心",
        "price_info": "￥90-200",
        "status": "ON",
    },
    {
        "title": "独立游戏制作展",
        "description": "独立游戏开发者的展示舞台。",
        "category": "游戏展",
        "poster_url": "https://picsum.photos/seed/exhibit13/400/600",
        "venue": "长沙国际会展中心",
        "price_info": "￥70-150",
        "status": "ON",
    },
    {
        "title": "量子实验室科技展",
        "description": "前沿科技实验装置体验。",
        "category": "科技展",
        "poster_url": "https://picsum.photos/seed/exhibit14/400/600",
        "venue": "合肥滨湖国际会展中心",
        "price_info": "￥60-160",
        "status": "ON",
    },
    {
        "title": "城市车文化展",
        "description": "城市改装车文化展示。",
        "category": "车展",
        "poster_url": "https://picsum.photos/seed/exhibit15/400/600",
        "venue": "天津梅江会展中心",
        "price_info": "￥80-180",
        "status": "ON",
    },
    {
        "title": "国际摄影双年展",
        "description": "全球摄影作品精选。",
        "category": "艺术展",
        "poster_url": "https://picsum.photos/seed/exhibit16/400/600",
        "venue": "宁波国际会议展览中心",
        "price_info": "￥70-140",
        "status": "ON",
    },
    {
        "title": "次元音乐会展",
        "description": "动漫音乐与舞台互动体验。",
        "category": "二次元",
        "poster_url": "https://picsum.photos/seed/exhibit17/400/600",
        "venue": "郑州国际会展中心",
        "price_info": "￥90-180",
        "status": "ON",
    },
    {
        "title": "桌游创意展",
        "description": "桌游设计与试玩专区。",
        "category": "游戏展",
        "poster_url": "https://picsum.photos/seed/exhibit18/400/600",
        "venue": "昆明国际会展中心",
        "price_info": "￥60-120",
        "status": "ON",
    },
    {
        "title": "绿色科技创新展",
        "description": "绿色能源与创新科技展示。",
        "category": "科技展",
        "poster_url": "https://picsum.photos/seed/exhibit19/400/600",
        "venue": "福州海峡国际会展中心",
        "price_info": "￥60-150",
        "status": "ON",
    },
    {
        "title": "极境越野车展",
        "description": "越野车与户外装备集结。",
        "category": "车展",
        "poster_url": "https://picsum.photos/seed/exhibit20/400/600",
        "venue": "哈尔滨国际会展中心",
        "price_info": "￥90-200",
        "status": "ON",
    },
]


def _seed_movies(sess: Session, target: int = 20):
    movie_count = sess.scalar(select(func.count(Movie.id))) or 0
    if movie_count >= target:
        return []

    existing_titles = set(sess.scalars(select(Movie.title)).all())
    need = target - movie_count
    candidates = [m for m in MOVIE_SEEDS if m["title"] not in existing_titles]
    new_movies = [Movie(**data) for data in candidates[:need]]
    if new_movies:
        sess.add_all(new_movies)
        sess.flush()
    return new_movies


def _seed_events(sess: Session, kind: str, seeds: list[dict], target: int = 20):
    count = sess.scalar(select(func.count(Event.id)).where(Event.kind == kind)) or 0
    if count >= target:
        return []

    existing_titles = set(sess.scalars(select(Event.title).where(Event.kind == kind)).all())
    need = target - count
    candidates = [e for e in seeds if e["title"] not in existing_titles]
    new_events = [Event(kind=kind, **data) for data in candidates[:need]]
    if new_events:
        sess.add_all(new_events)
    return new_events


def _seed_showtimes(sess: Session, movies: list[Movie]):
    if not movies:
        return

    halls = sess.scalars(select(Hall)).all()
    if not halls:
        return

    base = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    hours = [11, 15, 20]
    for idx, movie in enumerate(movies):
        hall = halls[idx % len(halls)]
        price_cents = 3600 + (idx % 4) * 400
        for d in range(2):
            for hour in hours:
                sess.add(
                    Showtime(
                        movie_id=movie.id,
                        hall_id=hall.id,
                        start_time=base + timedelta(days=d, hours=hour),
                        price_cents=price_cents,
                    )
                )


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)

    with SessionLocal() as sess:
        if not sess.scalar(select(func.count(User.id))):
            admin = User(email="admin@example.com", name="管理员", hashed_password=hash_pw("admin123"), is_admin=True)
            u = User(email="user@example.com", name="小明", hashed_password=hash_pw("user1234"), is_admin=False)
            sess.add_all([admin, u])

        if not sess.scalar(select(func.count(Cinema.id))):
            c1 = Cinema(name="OpenAI 影城（新宿）", address="东京新宿xx路", city="Tokyo")
            sess.add(c1)
            sess.flush()

            h1 = Hall(cinema_id=c1.id, name="IMAX 1号厅", rows=8, cols=12)
            h2 = Hall(cinema_id=c1.id, name="杜比 2号厅", rows=10, cols=14)
            sess.add_all([h1, h2])
            sess.flush()

            for hall in [h1, h2]:
                for r in range(hall.rows):
                    for c in range(hall.cols):
                        sess.add(Seat(hall_id=hall.id, row=r, col=c, label=seat_label(r, c)))

        new_movies = _seed_movies(sess, target=20)
        _seed_showtimes(sess, new_movies)

        _seed_events(sess, "concert", CONCERT_SEEDS, target=20)
        _seed_events(sess, "exhibition", EXHIBITION_SEEDS, target=20)

        sess.commit()

    yield
