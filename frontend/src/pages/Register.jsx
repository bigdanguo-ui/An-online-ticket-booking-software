import React, { useState } from "react";
import { api, setToken } from "../api.js";
import { useNavigate, Link } from "react-router-dom"; // 引入 Link 以便用户跳转回登录页

export default function Register({ onRegister }) {
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("新用户");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");

    async function submit(e) {
        e.preventDefault();
        setErr("");
        try {
            await api.post("/auth/register", { email, name, password });
            // 注册成功后自动登录
            const r = await api.post("/auth/login", { email, password });
            setToken(r.data.access_token);
            await onRegister?.();
            nav("/");
        } catch (ex) {
            setErr(ex?.response?.data?.detail || "注册失败");
        }
    }

    return (
        // 外层容器：Flex 全屏居中，浅灰背景
        <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            backgroundColor: "#f3ecec",
            padding: "20px"
        }}>
            {/* 卡片容器：阴影、圆角、自适应宽度 */}
            <div className="card" style={{
                maxWidth: 520,
                width: "100%",
                padding: "2rem",
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}>
                <h2 style={{ textAlign: "center", marginBottom: "1.5rem", color:"#000000" }}>注册账号</h2>

                <form onSubmit={submit} className="grid" style={{ gridTemplateColumns: "1fr", gap: 15 }}>
                    <input
                        className="input"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="邮箱"
                        style={{ padding: "10px" }}
                    />
                    <input
                        className="input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="昵称"
                        style={{ padding: "10px" }}
                    />
                    <input
                        className="input"
                        value={password}
                        type="password"
                        onChange={e => setPassword(e.target.value)}
                        placeholder="密码（>=6位）"
                        style={{ padding: "10px" }}
                    />

                    {err && (
                        <div className="small" style={{ color: "#ff9aa2", textAlign: "center" }}>
                            {err}
                        </div>
                    )}

                    <button className="btn" style={{ padding: "10px", marginTop: "10px", cursor: "pointer" }}>
                        创建账号
                    </button>

                    {/* 增加跳转回登录页的链接，提升体验 */}
                    <div className="small" style={{ textAlign: "center", marginTop: "15px", color: "#666" }}>
                        已有账号？ <Link to="/login" style={{ color: "#ff4757", textDecoration: "none", fontWeight: "bold" }}>去登录</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}