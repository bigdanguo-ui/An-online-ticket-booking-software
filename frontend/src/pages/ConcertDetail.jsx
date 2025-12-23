import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function ConcertDetail() {
    const { id } = useParams();
    const [detail, setDetail] = useState(null);
    const [selectedPrice, setSelectedPrice] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                setDetail({
                    id,
                    title: "周杰伦 2025 嘉年华世界巡回演唱会",
                    poster_url: "https://via.placeholder.com/300x400?text=Concert",
                    venue: "台北大巨蛋",
                    time: "2025-05-20 19:30",
                    prices: [
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

    if (!detail) {
        return (
            <div className="page">
                <div className="card">加载中...</div>
            </div>
        );
    }

    return (
        <div className="page" style={{ "--accent": "#7a5640" }}>
            <div className="row">
                <div style={{ flex: "0 0 300px" }}>
                    <img
                        src={detail.poster_url}
                        alt={detail.title}
                        style={{ width: "100%", borderRadius: 12, boxShadow: "0 10px 24px rgba(0,0,0,0.12)" }}
                    />
                </div>

                <div style={{ flex: 1, minWidth: 300 }}>
                    <div className="card" style={{ height: "100%" }}>
                        <span className="badge badge-solid" style={{ marginBottom: 12 }}>演唱会</span>
                        <h1 style={{ marginTop: 0 }}>{detail.title}</h1>
                        <div className="small" style={{ margin: "10px 0 20px", lineHeight: 1.6 }}>
                            <div>地点：{detail.venue}</div>
                            <div>时间：{detail.time}</div>
                        </div>

                        <hr />

                        <h3 style={{ marginBottom: 12 }}>选择票档</h3>
                        <div className="price-options">
                            {detail.prices.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPrice(p)}
                                    className={`price-option ${selectedPrice?.id === p.id ? "is-active" : ""}`}
                                >
                                    <div>{p.label}</div>
                                    <div style={{ fontWeight: 600 }}>NT$ {p.price}</div>
                                </button>
                            ))}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                            <div style={{ fontSize: "1.4rem", fontWeight: 600, color: "var(--accent)" }}>
                                {selectedPrice ? `总计: NT$ ${selectedPrice.price}` : "请选择票档"}
                            </div>
                            <button
                                className="btn"
                                disabled={!selectedPrice}
                                onClick={() => alert(`购买成功！\n项目：${detail.title}\n票档：${selectedPrice.label}`)}
                                style={{ opacity: selectedPrice ? 1 : 0.5 }}
                            >
                                立即购票
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
