import React, { useState } from "react";
import { api, setToken } from "../api.js";
import { useNavigate } from "react-router-dom";

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
        <div className="card" style={{maxWidth:520}}>
            <h2>注册</h2>
            <form onSubmit={submit} className="grid" style={{gridTemplateColumns:"1fr", gap:10}}>
                <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="邮箱" />
                <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="昵称" />
                <input className="input" value={password} type="password" onChange={e=>setPassword(e.target.value)} placeholder="密码（>=6位）" />
                {err && <div className="small" style={{color:"#ff9aa2"}}>{err}</div>}
                <button className="btn">创建账号</button>
            </form>
        </div>
    );
}
