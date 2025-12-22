import React, { useState } from "react";
import { api, setToken } from "../api.js";
import { useNavigate } from "react-router-dom";

export default function Login({ onLogin }) {
    const nav = useNavigate();
    const [email, setEmail] = useState("user@example.com");
    const [password, setPassword] = useState("user1234");
    const [err, setErr] = useState("");

    async function submit(e) {
        e.preventDefault();
        setErr("");
        try {
            const r = await api.post("/auth/login", { email, password });
            setToken(r.data.access_token);
            await onLogin?.();
            nav("/");
        } catch (ex) {
            setErr(ex?.response?.data?.detail || "登录失败");
        }
    }

    return (
        // 外层容器：使用 flex 布局实现全屏居中
        <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh", // 占满屏幕高度
            backgroundColor: "#f3ecec", // 可选：添加一个浅灰色背景
            padding: "20px" // 防止在移动端贴边
        }}>
            <div className="card" style={{
                maxWidth: 520,
                width: "100%", // 确保在小于 520px 的屏幕上自适应
                padding: "2rem", // 增加内部空间
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)", // 可选：添加轻微阴影提升质感
                backgroundColor: "#ffffff",
                borderRadius: "8px" // 可选：圆角
            }}>
                <h2 style={{ textAlign: "center", marginBottom: "1.5rem", color: "#000000" }}>登录</h2>

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
                        value={password}
                        type="password"
                        onChange={e => setPassword(e.target.value)}
                        placeholder="密码"
                        style={{ padding: "10px" }}
                    />

                    {err && (
                        <div className="small" style={{ color: "#ff9aa2", textAlign: "center" }}>
                            {err}
                        </div>
                    )}

                    <button className="btn" style={{ padding: "10px", marginTop: "10px", cursor: "pointer" }}>
                        登录
                    </button>

                    <div className="small" style={{ textAlign: "center", marginTop: "10px", color: "#090202" }}>
                        管理员：admin@example.com / admin123
                    </div>
                </form>
            </div>
        </div>
    );
}