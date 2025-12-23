import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { Link, useLocation } from "react-router-dom";

const PAGE_CONFIG = {
    "/movies": {
        type: "movie",
        endpoint: "/movies",
        title: "电影",
        subtitle: "银幕光影与沉浸大场面",
        btnText: "查看场次",
        categories: ["全部", "动作", "喜剧", "科幻", "爱情", "悬疑", "动画"],
        color: "#1c4d47"
    },
    "/concerts": {
        type: "concert",
        endpoint: "/concerts",
        title: "演唱会",
        subtitle: "城市舞台与现场震撼",
        btnText: "立即购票",
        categories: ["全部", "流行", "摇滚", "民谣", "爵士", "古典", "K-POP"],
        color: "#7a5640"
    },
    "/exhibitions": {
        type: "exhibition",
        endpoint: "/exhibitions",
        title: "漫展展览",
        subtitle: "多元展览与灵感碰撞",
        btnText: "预约入场",
        categories: ["全部", "二次元", "游戏展", "艺术展", "科技展", "车展"],
        color: "#29596a"
    }
};

const DEFAULT_CONFIG = PAGE_CONFIG["/movies"];

export default function EventList() {
    const location = useLocation();
    const currentPath = location.pathname === "/" ? "/movies" : location.pathname;
    const config = PAGE_CONFIG[currentPath] || DEFAULT_CONFIG;

    const [q, setQ] = useState("");
    const [activeCategory, setActiveCategory] = useState("全部");
    const [items, setItems] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const carouselRef = useRef(null);
    const pauseRef = useRef(false);

    const normalizedCategory = config.categories.includes(activeCategory) ? activeCategory : "全部";
    const isMovie = config.type === "movie";

    useEffect(() => {
        setQ("");
        setActiveCategory("全部");
        setSearchTerm("");
    }, [config.type]);

    useEffect(() => {
        let active = true;
        setRecommended([]);

        async function loadRecommendations() {
            try {
                const r = await api.get(config.endpoint, {
                    params: { recommend: true, type: config.type }
                });
                if (!active) return;
                setRecommended(r.data.slice(0, 10));
            } catch (e) {
                console.error("加载推荐失败", e);
                if (active) setRecommended([]);
            }
        }

        loadRecommendations();
        return () => { active = false; };
    }, [config.endpoint, config.type]);

    useEffect(() => {
        let active = true;
        setLoading(true);

        async function loadList() {
            try {
                const params = {
                    q: searchTerm.trim() || undefined,
                    type: config.type,
                    category: normalizedCategory === "全部" ? undefined : normalizedCategory
                };
                const r = await api.get(config.endpoint, { params });
                if (!active) return;
                setItems(r.data);
            } catch (e) {
                console.error("加载列表失败", e);
                if (active) setItems([]);
            } finally {
                if (active) setLoading(false);
            }
        }

        loadList();
        return () => { active = false; };
    }, [config.endpoint, config.type, normalizedCategory, searchTerm]);

    useEffect(() => {
        const container = carouselRef.current;
        if (!container || recommended.length < 2 || !isMovie) return;

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion) return;

        container.scrollTo({ left: 0, behavior: "auto" });
        let index = 0;

        const tick = () => {
            if (pauseRef.current) return;
            const nodes = container.querySelectorAll("[data-carousel-item='true']");
            if (!nodes.length) return;
            index = (index + 1) % nodes.length;
            nodes[index].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
        };

        const timer = setInterval(tick, 3200);
        return () => clearInterval(timer);
    }, [recommended, isMovie]);

    function handleSearch() {
        setSearchTerm(q.trim());
    }

    const PosterImage = ({ src, alt }) => (
        <img alt={alt} src={src} className="poster" loading="lazy" />
    );

    const heroMetric = recommended.length || items.length || 0;
    const heroFoot = isMovie ? "热门电影自动滑动" : "精选推荐滚动查看";

    return (
        <div className="page" style={{ "--accent": config.color }}>
            <header className="page-hero reveal">
                <div>
                    <div className="eyebrow">精选票务</div>
                    <h1 className="page-title">{config.title}</h1>
                    <p className="page-subtitle">{config.subtitle}</p>
                </div>
                <div className="hero-panel">
                    <div className="hero-label">本周上新</div>
                    <div className="hero-metric">{heroMetric}</div>
                    <div className="hero-foot">{heroFoot}</div>
                </div>
            </header>

            <section className="section">
                <div className="section-header">
                    <div>
                        <div className="section-kicker">热门</div>
                        <h3 className="section-title">热门{config.title}</h3>
                    </div>
                    {isMovie && <div className="section-note">AUTO SLIDE</div>}
                </div>
                <div
                    ref={carouselRef}
                    className="carousel hide-scrollbar"
                    onMouseEnter={() => { pauseRef.current = true; }}
                    onMouseLeave={() => { pauseRef.current = false; }}
                >
                    {recommended.map((m) => (
                        <Link
                            key={m.id}
                            to={`/${config.type}/${m.id}`}
                            className="carousel-item"
                            data-carousel-item="true"
                        >
                            <div className="carousel-card movie-hover">
                                <PosterImage src={m.poster_url || "https://via.placeholder.com/150"} alt={m.title} />
                                <div className="card-title">{m.title}</div>
                            </div>
                        </Link>
                    ))}
                    {recommended.length === 0 && <div className="small">暂无推荐</div>}
                </div>
            </section>

            <div className="card filter-card">
                <div className="filter-row">
                    <input
                        className="input"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={`搜索${config.title}名称...`}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <button className="btn" onClick={handleSearch}>搜索</button>
                </div>

                <div className="chips">
                    {config.categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`chip ${normalizedCategory === cat ? "is-active" : ""}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="empty-state">加载中...</div>
            ) : (
                <div className="list-grid">
                    {items.map((m, idx) => (
                        <div
                            key={m.id}
                            className="card media-card reveal"
                            style={{ animationDelay: `${idx * 40}ms` }}
                        >
                            <PosterImage src={m.poster_url || "https://via.placeholder.com/150"} alt={m.title} />
                            <div className="media-meta">
                                <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                                    {m.title}
                                </b>
                                <span className="badge badge-solid">{m.rating || "热售"}</span>
                            </div>
                            <div className="small">{m.date || "近期上演"}</div>
                            <div className="media-footer">
                                <Link to={`/${config.type}/${m.id}`} className="btn btn-block">
                                    {config.btnText}
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && items.length === 0 && (
                <div className="empty-state">
                    暂无{config.title}数据
                    <div className="small" style={{ marginTop: 8 }}>
                        请检查后端接口 GET {config.endpoint} 是否正常工作
                    </div>
                </div>
            )}
        </div>
    );
}
