import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { api, clearToken, getToken } from "./api";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Movies from "./pages/Movies.jsx";
import MovieDetail from "./pages/MovieDetail.jsx";
import SeatSelect from "./pages/SeatSelect.jsx";
import Checkout from "./pages/Checkout.jsx";
import Orders from "./pages/Orders.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
    const nav = useNavigate();
    const [me, setMe] = useState(null);

    async function loadMe() {
        const t = getToken();
        if (!t) { setMe(null); return; }
        try {
            const r = await api.get("/me");
            setMe(r.data);
        } catch {
            clearToken();
            setMe(null);
        }
    }

    useEffect(() => { loadMe(); }, []);

    return (
        <div className="container">
            <div className="topbar">
                <div style={{display:"flex", gap:12, alignItems:"center"}}>
                    <Link to="/"><b>🎬 电影购票</b></Link>
                    <Link to="/" className="small">电影</Link>
                    {me && <Link to="/orders" className="small">我的订单</Link>}
                    {me?.is_admin && <Link to="/admin" className="small">管理</Link>}
                </div>
                <div style={{display:"flex", gap:10, alignItems:"center"}}>
                    {me ? (
                        <>
                            <span className="badge">Hi, {me.name}</span>
                            <button className="btn" onClick={() => { clearToken(); setMe(null); nav("/login"); }}>
                                退出
                            </button>
                        </>
                    ) : (
                        <>
                            <Link className="btn" to="/login">登录</Link>
                            <Link className="btn" to="/register">注册</Link>
                        </>
                    )}
                </div>
            </div>

            <Routes>
                <Route path="/" element={<Movies />} />
                <Route path="/movie/:id" element={<MovieDetail me={me} />} />
                <Route path="/showtime/:id/seats" element={<SeatSelect me={me} />} />
                <Route path="/checkout" element={<Checkout me={me} />} />
                <Route path="/orders" element={<Orders me={me} />} />
                <Route path="/admin" element={<Admin me={me} />} />
                <Route path="/login" element={<Login onLogin={loadMe} />} />
                <Route path="/register" element={<Register onRegister={loadMe} />} />
            </Routes>
        </div>
    );
}
