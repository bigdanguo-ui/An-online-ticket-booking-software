import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function ConcertDetail() {
    const { id } = useParams(); // 获取URL中的ID
    const nav = useNavigate();
    const [detail, setDetail] = useState(null);
    const [selectedPrice, setSelectedPrice] = useState(null); // 选中的票档

    useEffect(() => {
        // 模拟加载数据，实际请替换为 api.get(`/concerts/${id}`)
        async function load() {
            try {
                // const r = await api.get(`/concerts/${id}`);
                // setDetail(r.data);

                // --- 模拟数据 (开发测试用) ---
                setDetail({
                    id,
                    title: "周杰伦 2025 嘉年华世界巡回演唱会",
                    poster_url: "https://via.placeholder.com/300x400?text=Concert",
                    venue: "台北大巨蛋",
                    time: "2025-05-20 19:30",
                    prices: [ // 票档
                        { id: 1, label: "看台区", price: 1800 },
                        { id: 2, label: "摇滚区", price: 3800 },
                        { id: 3, label: "VIP区", price: 5800 },
                    ]
                });
            } catch (e) {
                console.error(e);
            }
        }
        load();
    }, [id]);

    if (!detail) return <div style={{padding:40, textAlign:"center"}}>加载中...</div>;

    return (
        <div style={{ maxWidth: 1000, margin: "20px auto", display: "flex", gap: 30, flexWrap: "wrap" }}>
            {/* 左侧海报 */}
            <div style={{ flex: "0 0 300px" }}>
                <img
                    src={detail.poster_url}
                    alt={detail.title}
                    style={{ width: "100%", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
            </div>

            {/* 右侧信息 */}
            <div style={{ flex: 1, minWidth: 300 }}>
                <div className="card" style={{ height: "100%", padding: 30 }}>
                    <span className="badge" style={{backgroundColor: "#a55eea", color:"#fff", marginBottom:10}}>演唱会</span>
                    <h1>{detail.title}</h1>
                    <div style={{ color: "#666", margin: "10px 0 20px 0", lineHeight: 1.6 }}>
                        <p>📍 地点：{detail.venue}</p>
                        <p>🕒 时间：{detail.time}</p>
                    </div>

                    <hr style={{ border: "0", borderTop: "1px solid #eee", margin: "20px 0" }} />

                    {/* 票档选择 */}
                    <h3 style={{ marginBottom: 15 }}>选择票档</h3>
                    <div style={{ display: "flex", gap: 15, flexWrap: "wrap", marginBottom: 30 }}>
                        {detail.prices.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPrice(p)}
                                style={{
                                    padding: "10px 20px",
                                    border: selectedPrice?.id === p.id ? "2px solid #a55eea" : "1px solid #ddd",
                                    backgroundColor: selectedPrice?.id === p.id ? "#f3e5f5" : "#fff",
                                    color: selectedPrice?.id === p.id ? "#a55eea" : "#333",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    minWidth: 100
                                }}
                            >
                                <div>{p.label}</div>
                                <div style={{ fontWeight: "bold" }}>NT$ {p.price}</div>
                            </button>
                        ))}
                    </div>

                    {/* 底部操作栏 */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                        <div style={{ fontSize: "1.5rem", color: "#ff4757", fontWeight: "bold" }}>
                            {selectedPrice ? `总计: NT$ ${selectedPrice.price}` : "请选择票档"}
                        </div>
                        <button
                            className="btn"
                            disabled={!selectedPrice}
                            onClick={() => alert(`购买成功！\n项目：${detail.title}\n票档：${selectedPrice.label}`)}
                            style={{
                                padding: "12px 40px",
                                fontSize: "1.1rem",
                                opacity: selectedPrice ? 1 : 0.5,
                                backgroundColor: "#a55eea" // 演唱会用紫色系
                            }}
                        >
                            立即购票
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}