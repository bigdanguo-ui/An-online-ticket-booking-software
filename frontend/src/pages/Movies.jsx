import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Link } from "react-router-dom";

// 定义大类（顶部菜单）
const APP_TYPES = [
    { id: "movie", label: "电影" },
    { id: "concert", label: "演唱会" },
    { id: "exhibition", label: "漫展" }
];

// 定义题材分类（搜索栏下方）
// 实际项目中这些可能也需要从后台获取
const CATEGORIES = ["全部", "动作", "喜剧", "科幻", "爱情", "悬疑", "动画", "惊悚", "记录片"];

export default function Movies() {
    const [q, setQ] = useState("");
    const [activeType, setActiveType] = useState("movie"); // 当前大类：默认电影
    const [activeCategory, setActiveCategory] = useState("全部"); // 当前题材

    const [items, setItems] = useState([]); // 主列表数据
    const [recommended, setRecommended] = useState([]); // 推荐数据

    // 加载数据（整合了搜索、大类切换、题材筛选）
    async function loadData() {
        // 构建参数对象
        const params = {
            q,
            type: activeType,
            category: activeCategory === "全部" ? undefined : activeCategory
        };

        // 注意：这里假设后端接口支持 type 和 category 参数
        // 如果后端路径不同（如 /movies, /concerts），需根据 activeType 动态修改 URL
        const r = await api.get("/movies", { params });
        setItems(r.data);
    }

    // 加载推荐（每次切换大类时刷新推荐）
    async function loadRecommendations() {
        try {
            const r = await api.get("/movies", {
                params: { type: activeType, recommend: true }
            });
            setRecommended(r.data.slice(0, 8));
        } catch (e) {
            console.error("加载推荐失败", e);
        }
    }

    // 当 大类、题材 或 挂载时 触发加载
    useEffect(() => {
        setQ(""); // 切换大类时清空搜索词
        loadRecommendations();
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeType]);

    // 当 题材 变化时仅重新加载主列表
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategory]);

    // 样式组件：海报图片
    const PosterImage = ({ src, alt }) => (
        <img
            alt={alt}
            src={src}
            style={{
                width: "100%",
                aspectRatio: "2/3",
                objectFit: "cover",
                borderRadius: 8,
                backgroundColor: "#eee"
            }}
        />
    );

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>

            {/* --- 1. 顶部大类切换菜单 (Tabs) --- */}
            <div style={{
                display: "flex",
                justifyContent: "center",
                gap: 40,
                padding: "20px 0",
                marginBottom: 20,
                borderBottom: "1px solid #eee"
            }}>
                {APP_TYPES.map(type => (
                    <div
                        key={type.id}
                        onClick={() => setActiveType(type.id)}
                        style={{
                            fontSize: "1.1rem",
                            fontWeight: activeType === type.id ? "bold" : "normal",
                            color: activeType === type.id ? "#ff4757" : "#333",
                            cursor: "pointer",
                            paddingBottom: 8,
                            borderBottom: activeType === type.id ? "3px solid #ff4757" : "3px solid transparent",
                            transition: "all 0.2s"
                        }}
                    >
                        {type.label}
                    </div>
                ))}
            </div>

            {/* --- 2. 滑动推荐栏 (根据大类显示不同推荐) --- */}
            <section style={{ marginBottom: 30 }}>
                <h3 style={{ marginLeft: 5, marginBottom: 15, borderLeft: "4px solid #ff4757", paddingLeft: 10 }}>
                    🔥 热门{APP_TYPES.find(t=>t.id === activeType)?.label}
                </h3>
                <div className="hide-scrollbar" style={{
                    display: "flex",
                    gap: 16,
                    overflowX: "auto",
                    padding: "4px 4px 20px 4px",
                    scrollBehavior: "smooth"
                }}>
                    {recommended.map(m => (
                        <Link key={m.id} to={`/${activeType}/${m.id}`} style={{ flex: "0 0 140px", textDecoration: "none", color: "inherit" }}>
                            <div className="card movie-hover" style={{ padding: 8, height: "100%" }}>
                                <PosterImage src={m.poster_url} alt={m.title} />
                                <div style={{ marginTop: 8, fontWeight: "bold", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {m.title}
                                </div>
                            </div>
                        </Link>
                    ))}
                    {recommended.length === 0 && <div className="small" style={{padding:10}}>暂无推荐</div>}
                </div>
            </section>

            {/* --- 3. 搜索与筛选区域 --- */}
            <div className="card" style={{ marginBottom: 24, padding: "1.5rem" }}>
                {/* 搜索框 */}
                <div className="row" style={{ alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <input
                        className="input"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder={`搜索${APP_TYPES.find(t=>t.id === activeType)?.label}名称…`}
                        style={{ flex: 1, padding: "10px 14px" }}
                        onKeyDown={e => e.key === 'Enter' && loadData()}
                    />
                    <button className="btn" onClick={loadData} style={{ padding: "10px 24px" }}>搜索</button>
                </div>

                {/* 4. 搜索框下方的题材分类 (Chips) */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                border: activeCategory === cat ? "1px solid #ff4757" : "1px solid #ddd",
                                backgroundColor: activeCategory === cat ? "#ff4757" : "#fff",
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

            {/* --- 列表 Grid 布局 --- */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 20
            }}>
                {items.map(m => (
                    <div key={m.id} className="card movie" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                            <PosterImage src={m.poster_url} alt={m.title} />
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginTop: 10 }}>
                                <b style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</b>
                                <span className="badge" style={{ backgroundColor: "#ff4757", color: "white" }}>
                                    {m.rating || "待定"}
                                </span>
                            </div>
                            <div className="small" style={{ margin: "6px 0", color: "#666", display: "flex", justifyContent: "space-between" }}>
                                <span>{m.duration_min ? `${m.duration_min} 分钟` : "时长未知"}</span>
                                {/* 根据类型显示不同标签 */}
                                {activeType !== 'movie' && <span style={{color:"#888"}}>{activeType === 'concert' ? '演出' : '展览'}</span>}
                            </div>
                        </div>
                        <Link className="btn" to={`/${activeType}/${m.id}`} style={{ display: "block", textAlign: "center", marginTop: 10 }}>
                            {activeType === 'movie' ? '查看场次' : '立即购票'}
                        </Link>
                    </div>
                ))}
            </div>

            {items.length === 0 && (
                <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
                    没有找到相关{APP_TYPES.find(t=>t.id === activeType)?.label}
                </div>
            )}
        </div>
    );
}