import React, { useState } from "react";
import { api } from "../api.js";
import { useNavigate } from "react-router-dom";

export default function Admin({ me }) {
    const nav = useNavigate();
    const [msg, setMsg] = useState("");

    const [movie, setMovie] = useState({
        title: "新电影",
        description: "这里是简介",
        duration_min: 120,
        rating: "PG-13",
        poster_url: "https://picsum.photos/seed/newmovie/400/600",
        status: "ON"
    });

    const [showtime, setShowtime] = useState({
        movie_id: 1,
        hall_id: 1,
        start_time: new Date(Date.now() + 3600*1000).toISOString(),
        price_cents: 4500
    });

    if (!me?.is_admin) return (
        <div className="card">
            <h2>管理</h2>
            <div className="small">需要管理员账号登录。</div>
            <button className="btn" onClick={() => nav("/login")}>去登录</button>
        </div>
    );

    async function createMovie() {
        setMsg("");
        try {
            const r = await api.post("/admin/movies", movie);
            setMsg(`已创建电影：id=${r.data.id}`);
        } catch (e) {
            setMsg(e?.response?.data?.detail || "创建失败");
        }
    }

    async function createShowtime() {
        setMsg("");
        try {
            const r = await api.post("/admin/showtimes", showtime);
            setMsg(`已创建场次：id=${r.data.id}`);
        } catch (e) {
            setMsg(e?.response?.data?.detail || "创建失败");
        }
    }

    return (
        <div className="card">
            <h2>管理端（简版）</h2>
            {msg && <div className="small">{msg}</div>}
            <hr />

            <h3>新增电影</h3>
            <div className="grid" style={{gridTemplateColumns:"1fr 1fr", gap:10}}>
                <input className="input" value={movie.title} onChange={e=>setMovie({...movie,title:e.target.value})} />
                <input className="input" value={movie.rating} onChange={e=>setMovie({...movie,rating:e.target.value})} />
                <input className="input" value={movie.poster_url} onChange={e=>setMovie({...movie,poster_url:e.target.value})} />
                <input className="input" value={movie.duration_min} onChange={e=>setMovie({...movie,duration_min:Number(e.target.value)})} />
                <input className="input" style={{gridColumn:"1/3"}} value={movie.description} onChange={e=>setMovie({...movie,description:e.target.value})} />
            </div>
            <button className="btn" onClick={createMovie} style={{marginTop:10}}>创建电影</button>

            <hr />
            <h3>新增场次</h3>
            <div className="grid" style={{gridTemplateColumns:"1fr 1fr", gap:10}}>
                <input className="input" value={showtime.movie_id} onChange={e=>setShowtime({...showtime,movie_id:Number(e.target.value)})} placeholder="movie_id" />
                <input className="input" value={showtime.hall_id} onChange={e=>setShowtime({...showtime,hall_id:Number(e.target.value)})} placeholder="hall_id" />
                <input className="input" style={{gridColumn:"1/3"}} value={showtime.start_time} onChange={e=>setShowtime({...showtime,start_time:e.target.value})} />
                <input className="input" value={showtime.price_cents} onChange={e=>setShowtime({...showtime,price_cents:Number(e.target.value)})} placeholder="price_cents" />
            </div>
            <button className="btn" onClick={createShowtime} style={{marginTop:10}}>创建场次</button>

            <div className="small" style={{marginTop:10, opacity:.8}}>
                提示：hall_id 默认种子数据里一般是 1、2；movie_id 可在电影列表看到。
            </div>
        </div>
    );
}
