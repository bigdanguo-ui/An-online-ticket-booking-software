import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useNavigate } from "react-router-dom";

export default function Orders({ me }) {
    const nav = useNavigate();
    const [orders, setOrders] = useState([]);

    async function load() {
        const r = await api.get("/orders");
        setOrders(r.data);
    }

    useEffect(() => {
        if (!me) nav("/login");
        load();
    }, []);

    return (
        <div className="card">
            <h2>我的订单</h2>
            <div className="grid" style={{gap:10}}>
                {orders.map(o => (
                    <div key={o.id} className="card" style={{background:"#0f1630"}}>
                        <div style={{display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap"}}>
                            <div>
                                <b>{o.movie_title}</b>
                                <div className="small">{new Date(o.start_time).toLocaleString()}</div>
                                <div className="small">{o.cinema_name} · {o.hall_name}</div>
                                <div className="small">座位：{o.seats.join(", ")}</div>
                                <div className="small">金额：￥{(o.total_cents/100).toFixed(2)}</div>
                                <div className="small">状态：<span className="badge">{o.status}</span></div>
                                {o.ticket_code && <div className="small">出票码：<b>{o.ticket_code}</b></div>}
                            </div>
                            <div style={{display:"flex", gap:10, alignItems:"center"}}>
                                <div className="badge">{o.id.slice(0,8)}</div>
                            </div>
                        </div>
                    </div>
                ))}
                {orders.length === 0 && <div className="small">暂无订单</div>}
            </div>
        </div>
    );
}
