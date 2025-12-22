import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Link, useLocation } from "react-router-dom";

// --- 1. 修改配置中心：为每个分类添加 endpoint 字段 ---
const PAGE_CONFIG = {
    "/movies": {
        type: "movie",
        endpoint: "/movies", // 👈 电影请求 /movies
        title: "电影",
        btnText: "查看场次",
        categories: ["全部", "动作", "喜剧", "科幻", "爱情", "悬疑", "动画"],
        color: "#ff4757"
    },
    "/concerts": {
        type: "concert",
        endpoint: "/concerts", // 👈 演唱会请求 /concerts
        title: "演唱会",
        btnText: "立即购票",
        categories: ["全部", "流行", "摇滚", "民谣", "爵士", "古典", "K-POP"],
        color: "#a55eea"
    },
    "/exhibitions": {
        type: "exhibition",
        endpoint: "/exhibitions", // 👈 漫展请求 /exhibitions
        title: "漫展展览",
        btnText: "预约入场",
        categories: ["全部", "二次元", "游戏展", "艺术展", "科技展", "车展"],
        color: "#2ed573"
    }
};

const DEFAULT_CONFIG = PAGE_CONFIG["/movies"];

export default function EventList() {
    const location = useLocation();
    // 兼容根路径 "/"
    const currentPath = location.pathname === "/" ? "/movies" : location.pathname;
    const config = PAGE_CONFIG[currentPath] || DEFAULT_CONFIG;

    const [q, setQ] = useState("");
    const [activeCategory, setActiveCategory] = useState("全部");
    const [items, setItems] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [loading, setLoading] = useState(false); // 增加一个 loading 状态优化体验

    // --- 2. 修改加载数据函数 ---
    async function loadData() {
        setLoading(true);
        const params = {
            q,
            // 依然可以传 type，防止后端某些接口共用逻辑需要它
            type: config.type,
            category: activeCategory === "全部" ? undefined : activeCategory
        };

        try {
            console.log(`正在请求: ${config.endpoint}`, params); // 调试日志

            // 🔥 关键修改：使用 config.endpoint 替代写死的 "/movies"
            // 如果后端接口还没写好，可以用 "/movies" 暂时顶替，但数据会一样
            const r = await api.get(config.endpoint, { params });
            setItems(r.data);
        } catch (e) {
            console.error("加载列表失败", e);
            setItems([]); // 失败时清空列表
        } finally {
            setLoading(false);
        }
    }

    async function loadRecommendations() {
        try {
            // 推荐接口同理，也应该根据分类请求不同路径
            const r = await api.get(config.endpoint, {
                params: { recommend: true }
            });
            setRecommended(r.data.slice(0, 8));
        } catch (e) { console.error(e); }
    }


    // 监听 config.type (路径变化) 重新加载
    useEffect(() => {
        async function fetchAllData() {
            setLoading(true);

            // 🔥 关键点：切换类别时，先清空旧数据，避免视觉上残留上个页面的图
            setRecommended([]);
            setItems([]);

            try {
                // 构造参数
                const params = {
                    q,
                    type: config.type,
                    category: activeCategory === "全部" ? undefined : activeCategory
                };

                console.log("正在加载:", config.title, config.endpoint);

                // 并行请求：推荐列表 + 主列表
                // 注意：这里显式使用了 config.endpoint，确保请求路径正确
                const [recRes, listRes] = await Promise.all([
                    api.get(config.endpoint, { params: { recommend: true, type: config.type } }),
                    api.get(config.endpoint, { params })
                ]);

                if (isMounted) {
                    setRecommended(recRes.data.slice(0, 8));
                    setItems(listRes.data);
                }
            } catch (e) {
                console.error("加载失败", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchAllData();

        setQ("");
        setActiveCategory("全部");
        loadRecommendations();
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.type]);

    // 监听分类筛选变化
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategory]);

    const PosterImage = ({ src, alt }) => (
        <img alt={alt} src={src} style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 8, backgroundColor: "#eee" }} />
    );

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 20px 40px 20px" }}>

            {/* 推荐栏 */}
            <section style={{ marginBottom: 30 }}>
                <h3 style={{ marginLeft: 5, marginBottom: 15, borderLeft: `4px solid ${config.color}`, paddingLeft: 10 }}>
                    🔥 热门{config.title}
                </h3>
                <div className="hide-scrollbar" style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 10 }}>
                    {recommended.map(m => (
                        <Link key={m.id} to={`/${config.type}/${m.id}`} style={{ flex: "0 0 140px", textDecoration: "none", color: "inherit" }}>
                            <div className="card movie-hover" style={{ padding: 8, height: "100%" }}>
                                <PosterImage src={m.poster_url || "https://via.placeholder.com/150"} alt={m.title} />
                                <div style={{ marginTop: 8, fontWeight: "bold", fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                            </div>
                        </Link>
                    ))}
                    {recommended.length === 0 && <div className="small">暂无推荐</div>}
                </div>
            </section>

            {/* 搜索栏 */}
            <div className="card" style={{ marginBottom: 24, padding: "1.5rem" }}>
                <div className="row" style={{ alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <input
                        className="input"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder={`搜索${config.title}名称…`}
                        style={{ flex: 1, padding: "10px 14px" }}
                        onKeyDown={e => e.key === 'Enter' && loadData()}
                    />
                    <button className="btn" onClick={loadData} style={{ padding: "10px 24px", backgroundColor: config.color }}>搜索</button>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {config.categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                border: activeCategory === cat ? `1px solid ${config.color}` : "1px solid #ddd",
                                backgroundColor: activeCategory === cat ? config.color : "#fff",
                                color: activeCategory === cat ? "#fff" : "#666",
                                borderRadius: 20,
                                padding: "6px 16px",
                                fontSize: "0.9rem",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* 数据列表 */}
            {loading ? (
                <div style={{textAlign: "center", padding: 50, color: "#999"}}>加载中...</div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 20 }}>
                    {items.map(m => (
                        <div key={m.id} className="card movie" style={{ display: "flex", flexDirection: "column" }}>
                            <PosterImage src={m.poster_url || "https://via.placeholder.com/150"} alt={m.title} />
                            <div style={{ marginTop: 10, flex: 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                    <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{m.title}</b>
                                    <span className="badge" style={{ backgroundColor: config.color, color: "white", fontSize: "0.8rem" }}>
                                        {m.rating || "热售"}
                                    </span>
                                </div>
                                <div className="small" style={{ color: "#666" }}>{m.date || "近期上演"}</div>
                            </div>
                            <Link
                                to={`/${config.type}/${m.id}`} // 这里会自动生成 /concert/123 或 /movie/123
                                className="btn"
                                style={{ display: "block", textAlign: "center", marginTop: 15, backgroundColor: config.color }}
                            >
                                {config.btnText}
                            </Link>
                        </div>
                    ))}
                </div>
            )}

            {!loading && items.length === 0 && (
                <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
                    <div style={{fontSize: "2rem", marginBottom: 10}}>🕵️‍♂️</div>
                    暂无{config.title}数据<br/>
                    <span className="small">请检查后端接口 GET {config.endpoint} 是否正常工作</span>
                </div>
            )}
        </div>
    );
}