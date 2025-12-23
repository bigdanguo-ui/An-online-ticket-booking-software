import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { api, clearToken, getToken } from "./api";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import EventList from "./pages/EventList.jsx";
import MovieDetail from "./pages/MovieDetail.jsx";
import ConcertDetail from "./pages/ConcertDetail.jsx";
import ExhibitionDetail from "./pages/ExhibitionDetail.jsx";
import SeatSelect from "./pages/SeatSelect.jsx";
import Checkout from "./pages/Checkout.jsx";
import Orders from "./pages/Orders.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
    const nav = useNavigate();
    const location = useLocation();
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

    const navLinks = [
        { path: "/movies", label: "电影" },
        { path: "/concerts", label: "演唱会" },
        { path: "/exhibitions", label: "漫展" }
    ];

    const isActive = (path) => {
        if (location.pathname === "/") return path === "/movies";
        return location.pathname.startsWith(path);
    };

    return (
        <div className="app-shell">
            <header className="topbar">
                <div className="topbar-inner">
                    <div className="topbar-left">
                        <Link to="/" className="brand">
                            <span className="brand-dot" />
                            票务中心
                        </Link>

                        <nav className="nav-links">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`nav-link ${isActive(link.path) ? "is-active" : ""}`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        {me && <Link to="/orders" className="nav-meta">我的订单</Link>}
                        {me?.is_admin && <Link to="/admin" className="nav-meta">后台管理</Link>}
                    </div>

                    <div className="topbar-actions">
                        {me ? (
                            <>
                                <span className="badge">Hi, {me.name}</span>
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => { clearToken(); setMe(null); nav("/login"); }}
                                >
                                    退出
                                </button>
                            </>
                        ) : (
                            <>
                                <Link className="btn btn-ghost" to="/login">登录</Link>
                                <Link className="btn" to="/register">注册</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div className="app-body">
                <Routes>
                    <Route path="/" element={<Navigate to="/movies" replace />} />

                    <Route path="/movies" element={<EventList />} />
                    <Route path="/concerts" element={<EventList />} />
                    <Route path="/exhibitions" element={<EventList />} />

                    <Route path="/movie/:id" element={<MovieDetail me={me} />} />
                    <Route path="/concert/:id" element={<ConcertDetail me={me} />} />
                    <Route path="/exhibition/:id" element={<ExhibitionDetail me={me} />} />

                    <Route path="/showtime/:id/seats" element={<SeatSelect me={me} />} />
                    <Route path="/checkout" element={<Checkout me={me} />} />

                    <Route path="/orders" element={<Orders me={me} />} />
                    <Route path="/admin" element={<Admin me={me} />} />
                    <Route path="/login" element={<Login onLogin={loadMe} />} />
                    <Route path="/register" element={<Register onRegister={loadMe} />} />
                </Routes>
            </div>
        </div>
    );
}
