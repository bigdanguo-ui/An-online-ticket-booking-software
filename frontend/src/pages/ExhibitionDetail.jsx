import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function ExhibitionDetail({ me }) {
    const { id } = useParams();
    const nav = useNavigate();

    const [detail, setDetail] = useState(null);
    const [showtimes, setShowtimes] = useState([]);

    // 新增：日期筛选状态
    const [selectedDate, setSelectedDate] = useState("");
    const [dates, setDates] = useState([]);

    useEffect(() => {
        async function load() {
            try {
                // 并行请求：同时获取详情和场次表
                const [resDetail, resShowtime] = await Promise.all([
                    api.get(`/exhibitions/${id}`),
                    api.get(`/exhibitions/${id}/showtimes`)
                ]);

                setDetail(resDetail.data);

                const allShowtimes = resShowtime.data;
                setShowtimes(allShowtimes);

                // --- 核心逻辑：提取所有不重复的日期 ---
                const uniqueDates = [];
                const dateSet = new Set();

                allShowtimes.forEach(st => {
                    const d = new Date(st.start_time);
                    const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

                    if (!dateSet.has(dateKey)) {
                        dateSet.add(dateKey);
                        uniqueDates.push({
                            key: dateKey,
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
                console.error("加载失败", e);
            }
        }
        load();
    }, [id]);

    // 辅助函数：格式化时间 (HH:MM)
    const formatTime = (isoString) => {
        const d = new Date(isoString);
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    };

    // 根据选中日期过滤场次
    const filteredShowtimes = showtimes.filter(st => {
        const d = new Date(st.start_time);
        const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        return dateKey === selectedDate;
    });

    if (!detail) {
        return (
            <div className="page" style={{padding: 20}}>
                <div className="card">加载中...</div>
            </div>
        );
    }

    const accentColor = "#2ed573"; // 漫展主题色 (绿色)

    return (
        <div className="page" style={{ maxWidth: 1000, margin: "20px auto" }}>
            <div className="row" style={{ alignItems: "flex-start", gap: 30 }}>

                {/* --- 左侧海报与基础信息 --- */}
                <div className="card" style={{ width: 300, flexShrink: 0, padding: 0, overflow: "hidden", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                    <img
                        src={detail.poster_url || "https://via.placeholder.com/300x400?text=Exhibition"}
                        alt={detail.title}
                        style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }}
                    />
                    <div style={{ padding: 20 }}>
                        <h2 style={{ margin: "0 0 10px 0", fontSize: "1.4rem" }}>{detail.title}</h2>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 15 }}>
                            <span className="badge" style={{backgroundColor: accentColor, color: "#fff"}}>漫展 / 展览</span>
                            {detail.category && <span className="badge" style={{backgroundColor: "#eee", color: "#666"}}>{detail.category}</span>}
                        </div>

                        {detail.venue && <div className="small" style={{marginBottom: 10, fontWeight: "bold"}}>📍 {detail.venue}</div>}
                        <div className="small" style={{ lineHeight: 1.6, color: "#666", whiteSpace: "pre-wrap" }}>
                            {detail.description}
                        </div>
                    </div>
                </div>

                {/* --- 右侧：预约/购票选择 --- */}
                <div style={{ flex: 1, minWidth: 320 }}>

                    {/* 1. 日期选择 Tab 栏 */}
                    <div style={{ marginBottom: 20, borderBottom: "1px solid #eee", paddingBottom: 10 }}>
                        <h3 style={{ marginBottom: 15 }}>选择入场日期</h3>
                        {dates.length > 0 ? (
                            <div className="hide-scrollbar" style={{ display: "flex", gap: 15, overflowX: "auto" }}>
                                {dates.map((d) => (
                                    <button
                                        key={d.key}
                                        onClick={() => setSelectedDate(d.key)}
                                        style={{

                                            background: selectedDate === d.key ? accentColor : "#fff",
                                            color: selectedDate === d.key ? "#fff" : "#333",
                                            padding: "8px 16px",
                                            borderRadius: "20px",
                                            cursor: "pointer",
                                            fontSize: "0.95rem",
                                            whiteSpace: "nowrap",
                                            transition: "all 0.2s",
                                            boxShadow: selectedDate === d.key ? `0 4px 10px rgba(46, 213, 115, 0.3)` : "none",
                                            border: selectedDate === d.key ? "none" : "1px solid #ddd"
                                        }}
                                    >
                                        {d.label} {d.week}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="small" style={{color: "#999"}}>暂无开放预约</div>
                        )}
                    </div>

                    {/* 未登录提示 */}
                    {!me && (
                        <div className="small" style={{
                            backgroundColor: "#fff3cd", color: "#856404",
                            padding: "10px 15px", borderRadius: 8, marginBottom: 15
                        }}>
                            💡 提示：您尚未登录，预约前请先 <b style={{cursor:"pointer", textDecoration:"underline"}} onClick={()=>nav("/login")}>登录</b>。
                        </div>
                    )}

                    {/* 2. 具体场次/票种列表 */}
                    <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
                        {filteredShowtimes.map((st) => (
                            <div key={st.id} className="card" style={{
                                padding: "15px 20px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                transition: "transform 0.1s",
                                borderLeft: `4px solid ${accentColor}`
                            }}>
                                {/* 时间与场馆信息 */}
                                <div style={{ display: "flex", gap: 30, alignItems: "center", flex: 1 }}>
                                    <div style={{ textAlign: "center", minWidth: 60 }}>
                                        <div style={{ fontSize: "1.3rem", fontWeight: "bold" }}>
                                            {formatTime(st.start_time)}
                                        </div>
                                        <div className="small" style={{ color: "#999", fontSize: "0.8rem" }}>
                                            入场
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontWeight: "bold" }}>{st.hall_name}</div>
                                        <div className="small" style={{ color: "#666" }}>{st.cinema_name}</div>
                                    </div>
                                </div>

                                {/* 价格与按钮 */}
                                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                                    <div style={{ color: accentColor, fontSize: "1.2rem", fontWeight: "bold" }}>
                                        <span style={{ fontSize: "0.8rem" }}>RMB¥ </span>
                                        {st.price_cents}
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
                                            backgroundColor: accentColor,
                                            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
                                        }}
                                    >
                                        立即预约
                                    </button>
                                </div>
                            </div>
                        ))}

                        {dates.length > 0 && filteredShowtimes.length === 0 && (
                            <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
                                该日期暂无票种，请切换其他日期
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}