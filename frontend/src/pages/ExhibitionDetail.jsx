import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api.js"; // 引入 API

export default function ExhibitionDetail() {
    const { id } = useParams();
    const nav = useNavigate(); // 用于跳转
    const [detail, setDetail] = useState(null);
    const [showtimes, setShowtimes] = useState([]); // 存储后端返回的场次/票种
    const [selectedShowtime, setSelectedShowtime] = useState(null); // 当前选中的票

    useEffect(() => {
        async function load() {
            try {
                // 并行请求详情和场次
                const [resDetail, resShowtime] = await Promise.all([
                    api.get(`/exhibitions/${id}`),
                    api.get(`/exhibitions/${id}/showtimes`)
                ]);
                setDetail(resDetail.data);
                setShowtimes(resShowtime.data);
            } catch (e) {
                console.error("加载失败", e);
            }
        }
        load();
    }, [id]);

    // 时间格式化工具
    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString('zh-CN', {
            month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
            weekday: 'short'
        });
    };

    if (!detail) {
        return (
            <div className="page" style={{padding: 20}}>
                <div className="card">加载中...</div>
            </div>
        );
    }

    // 处理预约跳转
    const handleBook = () => {
        if (!selectedShowtime) return;
        // 跳转到通用的下单页 (复用 seatSelect 或 checkout 流程)
        nav(`/showtime/${selectedShowtime.id}/seats`);
    };

    return (
        <div className="page" style={{ "--accent": "#29596a", maxWidth: 1000, margin: "20px auto" }}>
            <div className="row" style={{display: "flex", gap: 30, flexWrap: "wrap"}}>

                {/* 左侧海报 */}
                <div style={{ flex: "0 0 300px", maxWidth: "100%" }}>
                    <img
                        src={detail.poster_url || "https://via.placeholder.com/300x400?text=Exhibition"}
                        alt={detail.title}
                        style={{ width: "100%", borderRadius: 12, boxShadow: "0 10px 24px rgba(0,0,0,0.12)", objectFit: "cover", aspectRatio: "2/3" }}
                    />
                </div>

                {/* 右侧信息 */}
                <div style={{ flex: 1, minWidth: 300 }}>
                    <div className="card" style={{ height: "100%", padding: 30, display: "flex", flexDirection: "column" }}>
                        <div>
                            <span className="badge" style={{ backgroundColor: "var(--accent)", color: "#fff", marginBottom: 12 }}>漫展 / 展览</span>
                            <h1 style={{ marginTop: 0, fontSize: "2rem" }}>{detail.title}</h1>

                            {/* 地点与描述 */}
                            <div className="small" style={{ margin: "10px 0 20px", lineHeight: 1.6, color: "#555", fontSize: "1rem" }}>
                                {detail.venue && <div style={{marginBottom: 5}}>📍 地点：{detail.venue}</div>}
                                {detail.description && <div style={{whiteSpace: "pre-wrap"}}>{detail.description}</div>}
                            </div>
                        </div>

                        <hr style={{border: "none", borderTop: "1px solid #eee", margin: "20px 0"}} />

                        {/* 票档/日期选择 */}
                        <h3 style={{ marginBottom: 15 }}>选择日期与票种</h3>

                        {showtimes.length === 0 ? (
                            <div style={{color: "#999", padding: 20, textAlign: "center", background: "#f9f9f9", borderRadius: 8}}>
                                暂无开放预约的场次
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 30 }}>
                                {showtimes.map((st) => (
                                    <button
                                        key={st.id}
                                        onClick={() => setSelectedShowtime(st)}
                                        style={{
                                            padding: "12px",
                                            border: selectedShowtime?.id === st.id ? "2px solid var(--accent)" : "1px solid #ddd",
                                            backgroundColor: selectedShowtime?.id === st.id ? "#e0f2f1" : "#fff", // 选中时使用浅绿色背景
                                            color: selectedShowtime?.id === st.id ? "var(--accent)" : "#333",
                                            borderRadius: 8,
                                            cursor: "pointer",
                                            textAlign: "left",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        <div style={{ fontSize: "0.85rem", marginBottom: 4 }}>{formatTime(st.start_time)}</div>
                                        {/* 后端金额通常是分，需除以100 */}
                                        <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>RMB¥ {st.price_cents}</div>
                                        <div className="small" style={{opacity: 0.8}}>{st.hall_name}</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 底部操作栏 */}
                        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", paddingTop: 20, borderTop: "1px dashed #eee" }}>
                            <div style={{ fontSize: "1.4rem", fontWeight: 600, color: "var(--accent)" }}>
                                {selectedShowtime ? `总计: RMB¥ ${selectedShowtime.price_cents}` : "请选择票种"}
                            </div>
                            <button
                                className="btn"
                                disabled={!selectedShowtime}
                                onClick={handleBook}
                                style={{
                                    opacity: selectedShowtime ? 1 : 0.5,
                                    backgroundColor: "var(--accent)", // 使用墨绿色
                                    padding: "12px 36px",
                                    fontSize: "1.1rem"
                                }}
                            >
                                立即预约
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}