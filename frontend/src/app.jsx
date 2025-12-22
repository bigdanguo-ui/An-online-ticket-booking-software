import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { api, clearToken, getToken } from "./api";

// --- 页面组件导入 ---
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import EventList from "./pages/EventList.jsx";

import MovieDetail from "./pages/MovieDetail.jsx";     // 电影详情
import ConcertDetail from "./pages/ConcertDetail.jsx"; // 演唱会详情
import ExhibitionDetail from "./pages/ExhibitionDetail.jsx"; // 漫展详情

import SeatSelect from "./pages/SeatSelect.jsx";
import Checkout from "./pages/Checkout.jsx";
import Orders from "./pages/Orders.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
    const nav = useNavigate();
    const location = useLocation(); // 用于判断当前在哪个页面，以高亮导航栏
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

    // 定义顶部导航链接
    const navLinks = [
        { path: "/movies", label: "电影" },
        { path: "/concerts", label: "演唱会" },
        { path: "/exhibitions", label: "漫展" }
    ];

    // 辅助函数：判断链接是否激活
    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <div className="container">
            {/* --- 顶部导航栏 --- */}
            <div className="topbar" style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0 20px",
                height: 60,
                backgroundColor: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                marginBottom: 20
            }}>
                <div style={{ display: "flex", gap: 30, alignItems: "center" }}>
                    {/* Logo */}
                    <Link to="/" style={{ textDecoration: "none", fontSize: "1.2rem", fontWeight: "bold", color: "#333" }}>
                        🎫 票务中心
                    </Link>

                    {/* 分类导航链接 */}
                    <div style={{ display: "flex", gap: 20 }}>
                        {navLinks.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                style={{
                                    textDecoration: "none",
                                    color: isActive(link.path) ? "#ff4757" : "#666",
                                    fontWeight: isActive(link.path) ? "bold" : "normal",
                                    borderBottom: isActive(link.path) ? "2px solid #ff4757" : "2px solid transparent",
                                    padding: "18px 0",
                                    transition: "all 0.2s"
                                }}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* 功能链接 */}
                    {me && <Link to="/orders" className="small" style={{marginLeft: 10}}>我的订单</Link>}
                    {me?.is_admin && <Link to="/admin" className="small">后台管理</Link>}
                </div>

                {/* 用户状态 */}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {me ? (
                        <>
                            <span className="badge" style={{backgroundColor: "#eee", color: "#333"}}>
                                Hi, {me.name}
                            </span>
                            <button className="btn" onClick={() => { clearToken(); setMe(null); nav("/login"); }}>
                                退出
                            </button>
                        </>
                    ) : (
                        <>
                            <Link className="btn" to="/login">登录</Link>
                            <Link className="btn" to="/register" style={{backgroundColor: "transparent", color: "#ff4757", border: "1px solid #ff4757"}}>注册</Link>
                        </>
                    )}
                </div>
            </div>

            {/* --- 路由配置 --- */}
            <Routes>
                {/* 1. 首页重定向：访问根目录自动跳到 /movies */}
                <Route path="/" element={<Navigate to="/movies" replace />} />

                {/* 2. 通用列表页：三个路径复用同一个组件 */}
                <Route path="/movies" element={<EventList />} />
                <Route path="/concerts" element={<EventList />} />
                <Route path="/exhibitions" element={<EventList />} />

                {/* 3. 详情页 */}
                <Route path="/movie/:id" element={<MovieDetail me={me} />} />
                <Route path="/concert/:id" element={<ConcertDetail me={me} />} />
                <Route path="/exhibition/:id" element={<ExhibitionDetail me={me} />} />

                {/* 4. 购票流程页面 */}
                <Route path="/showtime/:id/seats" element={<SeatSelect me={me} />} />
                <Route path="/checkout" element={<Checkout me={me} />} />

                {/* 5. 用户与管理 */}
                <Route path="/orders" element={<Orders me={me} />} />
                <Route path="/admin" element={<Admin me={me} />} />
                <Route path="/login" element={<Login onLogin={loadMe} />} />
                <Route path="/register" element={<Register onRegister={loadMe} />} />
            </Routes>
        </div>
    );
}