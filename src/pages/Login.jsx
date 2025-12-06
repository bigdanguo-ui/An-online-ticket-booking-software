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
        <div className="card" style={{maxWidth:520}}>
            <h2>登录</h2>
            <form onSubmit={submit} className="grid" style={{gridTemplateColumns:"1fr", gap:10}}>
                <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="邮箱" />
                <input className="input" value={password} type="password" onChange={e=>setPassword(e.target.value)} placeholder="密码" />
                {err && <div className="small" style={{color:"#ff9aa2"}}>{err}</div>}
                <button className="btn">登录</button>
                <div className="small">管理员：admin@example.com / admin123</div>
            </form>
        </div>
    );
}
