import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useParams, useNavigate } from "react-router-dom";

export default function MovieDetail({ me }) {
    const { id } = useParams();
    const nav = useNavigate();

    const [movie, setMovie] = useState(null);
    const [showtimes, setShowtimes] = useState([]);

    // 新增：当前选中的日期（格式：YYYY-MM-DD）
    const [selectedDate, setSelectedDate] = useState("");
    // 新增：所有有排期的日期列表
    const [dates, setDates] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                // 并行加载电影详情和场次
                const [mRes, stRes] = await Promise.all([
                    api.get(`/movies/${id}`),
                    api.get(`/movies/${id}/showtimes`)
                ]);

                setMovie(mRes.data);

                const allShowtimes = stRes.data;
                setShowtimes(allShowtimes);

                // --- 核心逻辑：提取所有不重复的日期 ---
                const uniqueDates = [];
                const dateSet = new Set();

                allShowtimes.forEach(st => {
                    const d = new Date(st.start_time);
                    // 生成 key: 2023-12-25
                    const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

                    if (!dateSet.has(dateKey)) {
                        dateSet.add(dateKey);
                        uniqueDates.push({
                            key: dateKey,
                            // 显示文本：12月25日 (周一)
                            label: `${d.getMonth() + 1}月${d.getDate()}日`,
                            week: "周" + "日一二三四五六".charAt(d.getDay())
                        });
                    }
                });

                setDates(uniqueDates);
                // 默认选中第一个日期
                if (uniqueDates.length > 0) {
                    setSelectedDate(uniqueDates[0].key);
                }

            } catch (e) {
                console.error(e);
            }
        })();
    }, [id]);

    // 辅助函数：格式化时间 (14:30)
    const formatTime = (isoString) => {
        const d = new Date(isoString);
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    };

    // 辅助函数：计算结束时间
    const getEndTime = (startTime, duration) => {
        const d = new Date(startTime);
        d.setMinutes(d.getMinutes() + duration);
        return formatTime(d);
    };

    // 核心逻辑：根据选中日期过滤场次
    const filteredShowtimes = showtimes.filter(st => {
        const d = new Date(st.start_time);
        const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        return dateKey === selectedDate;
    });

    if (!movie) {
        return <div className="page"><div className="card" style={{padding:40, textAlign:"center"}}>⏳ 加载中...</div></div>;
    }

    return (
        <div className="page" style={{ maxWidth: 1000, margin: "0 auto", padding: "20px" }}>
            <div className="row" style={{ alignItems: "flex-start", gap: 30 }}>

                {/* --- 左侧：电影信息 --- */}
                <div className="card" style={{ width: 300, flexShrink: 0, padding: 0, overflow: "hidden", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                    <img
                        alt={movie.title}
                        src={movie.poster_url}
                        style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }}
                    />
                    <div style={{ padding: 20 }}>
                        <h2 style={{ margin: "0 0 10px 0", fontSize: "1.4rem" }}>{movie.title}</h2>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 15 }}>
                            <span className="badge" style={{backgroundColor: "#eee", color: "#666"}}>{movie.rating || "未分级"}</span>
                            <span className="badge" style={{backgroundColor: "#eee", color: "#666"}}>{movie.duration_min} 分钟</span>
                            {movie.category && <span className="badge" style={{backgroundColor: "#eee", color: "#666"}}>{movie.category}</span>}
                        </div>

                        <div className="small" style={{ lineHeight: 1.6, color: "#666" }}>{movie.description}</div>
                    </div>
                </div>

                {/* --- 右侧：场次选择 --- */}
                <div style={{ flex: 1, minWidth: 320 }}>

                    {/* 1. 日期选择 Tab 栏 */}
                    <div style={{ marginBottom: 20, borderBottom: "1px solid #eee", paddingBottom: 10 }}>
                        <h3 style={{ marginBottom: 15 }}>选择场次</h3>
                        {dates.length > 0 ? (
                            <div className="hide-scrollbar" style={{ display: "flex", gap: 15, overflowX: "auto" }}>
                                {dates.map((d) => (
                                    <button
                                        key={d.key}
                                        onClick={() => setSelectedDate(d.key)}
                                        style={{
                                            background: selectedDate === d.key ? "#ff4757" : "#fff",
                                            color: selectedDate === d.key ? "#fff" : "#333",
                                            padding: "8px 16px",
                                            borderRadius: "20px",
                                            cursor: "pointer",
                                            fontSize: "0.95rem",
                                            whiteSpace: "nowrap",
                                            transition: "all 0.2s",
                                            boxShadow: selectedDate === d.key ? "0 4px 10px rgba(255, 71, 87, 0.3)" : "none",
                                            border: selectedDate === d.key ? "none" : "1px solid #ddd"
                                        }}
                                    >
                                        {d.label} {d.week}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="small" style={{color: "#999"}}>暂无排期</div>
                        )}
                    </div>

                    {/* 未登录提示 */}
                    {!me && (
                        <div className="small" style={{
                            backgroundColor: "#fff3cd", color: "#856404",
                            padding: "10px 15px", borderRadius: 8, marginBottom: 15
                        }}>
                            💡 提示：您尚未登录，选座购票前请先 <b style={{cursor:"pointer", textDecoration:"underline"}} onClick={()=>nav("/login")}>登录</b>。
                        </div>
                    )}

                    {/* 2. 具体场次列表 */}
                    <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
                        {filteredShowtimes.map((st) => (
                            <div key={st.id} className="card" style={{
                                padding: "15px 20px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                transition: "transform 0.1s",
                                borderLeft: "4px solid #ff4757"
                            }}>
                                {/* 时间与散场信息 */}
                                <div style={{ display: "flex", gap: 30, alignItems: "center", flex: 1 }}>
                                    <div style={{ textAlign: "center", minWidth: 60 }}>
                                        <div style={{ fontSize: "1.3rem", fontWeight: "bold" }}>
                                            {formatTime(st.start_time)}
                                        </div>
                                        <div className="small" style={{ color: "#999", fontSize: "0.8rem" }}>
                                            {getEndTime(st.start_time, movie.duration_min)} 散场
                                        </div>
                                    </div>

                                    {/* 影厅信息 */}
                                    <div>
                                        <div style={{ fontWeight: "bold" }}>{st.hall_name}</div>
                                        <div className="small" style={{ color: "#666" }}>{st.cinema_name}</div>
                                    </div>
                                </div>

                                {/* 价格与按钮 */}
                                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                                    <div style={{ color: "#ff4757", fontSize: "1.2rem", fontWeight: "bold" }}>
                                        <span style={{ fontSize: "0.8rem" }}>￥</span>
                                        {(st.price_cents / 100).toFixed(2)}
                                    </div>

                                    <button
                                        className="btn"
                                        onClick={() => {
                                            if (!me) return nav("/login");
                                            nav(`/showtime/${st.id}/seats`);
                                        }}
                                        style={{
                                            padding: "8px 24px",
                                            borderRadius: 20,
                                            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                                        }}
                                    >
                                        选座购票
                                    </button>
                                </div>
                            </div>
                        ))}

                        {dates.length > 0 && filteredShowtimes.length === 0 && (
                            <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                                该日期暂无场次，请切换其他日期
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}