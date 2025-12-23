import React, { useState } from "react";
import { api, setToken } from "../api.js";
import { useNavigate, Link } from "react-router-dom";

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
            const r = await api.post("/auth/login", { email, password });
            setToken(r.data.access_token);
            await onRegister?.();
            nav("/");
        } catch (ex) {
            setErr(ex?.response?.data?.detail || "注册失败");
        }
    }

    return (
        <div className="auth-shell">
            <div className="card auth-card">
                <h2 className="auth-title">注册账号</h2>

                <form onSubmit={submit} className="grid" style={{ gridTemplateColumns: "1fr", gap: 16 }}>
                    <input
                        className="input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="手机号/邮箱"
                    />
                    <input
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="昵称"
                    />
                    <input
                        className="input"
                        value={password}
                        type="password"
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="密码（>=6位）"
                    />

                    {err && (
                        <div className="small text-danger" style={{ textAlign: "center" }}>
                            {err}
                        </div>
                    )}

                    <button className="btn btn-block">创建账号</button>

                    <div className="small" style={{ textAlign: "center", marginTop: 12 }}>
                        已有账号？{" "}
                        <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
                            去登录
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
