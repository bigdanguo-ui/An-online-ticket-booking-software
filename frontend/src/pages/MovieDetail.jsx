import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useParams, useNavigate } from "react-router-dom";

export default function MovieDetail({ me }) {
    const { id } = useParams();
    const nav = useNavigate();
    const [movie, setMovie] = useState(null);
    const [showtimes, setShowtimes] = useState([]);

    useEffect(() => {
        (async () => {
            const m = await api.get(`/movies/${id}`);
            setMovie(m.data);
            const st = await api.get(`/movies/${id}/showtimes`);
            setShowtimes(st.data);
        })();
    }, [id]);

    if (!movie) {
        return (
            <div className="page">
                <div className="card">加载中...</div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="row">
                <div className="card" style={{ width: 320 }}>
                    <img alt={movie.title} src={movie.poster_url} style={{ width: "100%", borderRadius: 12, marginBottom: 10 }} />
                <h2 style={{margin:"6px 0"}}>{movie.title}</h2>
                <div className="small">{movie.description}</div>
                <hr />
                <div className="small">时长：{movie.duration_min} 分钟</div>
                <div className="small">分级：{movie.rating}</div>
                </div>

                <div className="card" style={{ flex: 1, minWidth: 320 }}>
                    <h3>选择场次</h3>
                    {!me && (
                        <div className="small text-warn" style={{ marginBottom: 10 }}>
                            你还没登录：可以先浏览场次，但选座/下单需要登录。
                        </div>
                    )}
                    <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 10 }}>
                        {showtimes.map((st) => (
                            <div key={st.id} className="card card-subtle">
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                    <div>
                                        <b>{new Date(st.start_time).toLocaleString()}</b>
                                        <div className="small">{st.cinema_name} · {st.hall_name}</div>
                                    </div>
                                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                        <span className="badge">￥{(st.price_cents/100).toFixed(2)}</span>
                                        <button
                                            className="btn"
                                            onClick={() => {
                                                if (!me) return nav("/login");
                                                nav(`/showtime/${st.id}/seats`);
                                            }}
                                        >
                                            去选座
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {showtimes.length === 0 && <div className="small">暂无场次</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
