import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useNavigate, useParams } from "react-router-dom";

export default function SeatSelect({ me }) {
    const { id } = useParams(); // showtime_id
    const nav = useNavigate();

    const [seats, setSeats] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [err, setErr] = useState("");
    const [holdInfo, setHoldInfo] = useState(null);

    async function load() {
        const r = await api.get(`/showtimes/${id}/seats/me`);
        setSeats(r.data);
    }

    useEffect(() => {
        if (!me) nav("/login");
        load();
        const t = setInterval(load, 2500);
        return () => clearInterval(t);
    }, [id]);

    const byRow = useMemo(() => {
        const m = new Map();
        for (const s of seats) {
            if (!m.has(s.row)) m.set(s.row, []);
            m.get(s.row).push(s);
        }
        for (const [k, arr] of m.entries()) arr.sort((a,b)=>a.col-b.col);
        return [...m.entries()].sort((a,b)=>a[0]-b[0]);
    }, [seats]);

    function toggleSeat(s) {
        if (s.state === "SOLD" || s.state === "HELD") return;
        const ns = new Set(selected);
        if (ns.has(s.seat_id)) ns.delete(s.seat_id);
        else ns.add(s.seat_id);
        setSelected(ns);
    }

    async function hold() {
        setErr("");
        if (selected.size === 0) return setErr("请先选座");
        try {
            const seat_ids = [...selected];
            const r = await api.post(`/showtimes/${id}/hold`, { seat_ids });
            setHoldInfo(r.data);
            sessionStorage.setItem("hold_token", r.data.hold_token);
            sessionStorage.setItem("hold_expires_at", r.data.expires_at);
            nav("/checkout");
        } catch (ex) {
            setErr(ex?.response?.data?.detail || "锁座失败，请刷新重试");
            await load();
        }
    }

    return (
        <div className="page">
            <div className="card">
                <h2>选座</h2>
                <div className="small" style={{marginBottom:10}}>
                    绿色=你选中；红色=已售；黄色=他人锁座；深蓝=可选。系统会自动刷新座位状态。
                </div>

                <div className="grid" style={{gridTemplateColumns:"1fr", gap:10}}>
                    {byRow.map(([row, arr]) => (
                        <div key={row} style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                            <div className="badge" style={{minWidth:42, textAlign:"center"}}>{String.fromCharCode(65+row)}</div>
                            {arr.map(s => {
                                const isSel = selected.has(s.seat_id);
                                const cls =
                                    s.state === "SOLD" ? "sold" :
                                        s.state === "HELD" ? "held" :
                                            isSel ? "selected" : "available";
                                return (
                                    <div
                                        key={s.seat_id}
                                        className={`seat ${cls}`}
                                        onClick={() => toggleSeat(s)}
                                        title={s.label}
                                    >
                                        {s.col+1}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <hr />
                <div className="row" style={{alignItems:"center"}}>
                    <div className="small">已选：{[...selected].length} 个座位</div>
                    <button className="btn" onClick={hold} disabled={selected.size===0}>锁座并去结算</button>
                    <button className="btn btn-ghost" onClick={() => { setSelected(new Set()); setErr(""); }}>清空</button>
                </div>
                {err && <div className="small text-danger" style={{ marginTop:10 }}>{err}</div>}
            </div>
        </div>
    );
}
