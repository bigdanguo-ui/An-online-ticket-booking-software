import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { useNavigate } from "react-router-dom";

export default function Checkout({ me }) {
    const nav = useNavigate();
    const [holdToken, setHoldToken] = useState("");
    const [expiresAt, setExpiresAt] = useState("");
    const [order, setOrder] = useState(null);
    const [err, setErr] = useState("");

    useEffect(() => {
        if (!me) nav("/login");
        const ht = sessionStorage.getItem("hold_token") || "";
        const ex = sessionStorage.getItem("hold_expires_at") || "";
        setHoldToken(ht);
        setExpiresAt(ex);
        if (!ht) setErr("没有锁座信息，请重新选座");
    }, []);

    async function checkout() {
        setErr("");
        try {
            const r = await api.post("/orders/checkout", { hold_token: holdToken });
            setOrder(r.data);
        } catch (ex) {
            setErr(ex?.response?.data?.detail || "下单失败");
        }
    }

    async function pay() {
        setErr("");
        try {
            const r = await api.post(`/orders/${order.id}/mock_pay`);
            setOrder(r.data);
        } catch (ex) {
            setErr(ex?.response?.data?.detail || "支付失败");
        }
    }

    const leftSec = expiresAt ? Math.max(0, Math.floor((new Date(expiresAt) - new Date())/1000)) : 0;

    return (
        <div className="card">
            <h2>结算</h2>
            {err && <div className="small" style={{color:"#ff9aa2"}}>{err}</div>}

            {!order ? (
                <>
                    <div className="small">锁座 token：{holdToken || "-"}</div>
                    <div className="small" style={{marginTop:6}}>剩余锁座时间：{expiresAt ? `${leftSec}s` : "-"}</div>
                    <hr />
                    <button className="btn" onClick={checkout} disabled={!holdToken}>确认下单</button>
                    <button className="btn" style={{marginLeft:10}} onClick={() => nav(-1)}>返回继续选座</button>
                </>
            ) : (
                <>
                    <div className="row">
                        <div className="card" style={{flex:1, background:"#0f1630"}}>
                            <b>{order.movie_title}</b>
                            <div className="small">{new Date(order.start_time).toLocaleString()}</div>
                            <div className="small">{order.cinema_name} · {order.hall_name}</div>
                            <div className="small">座位：{order.seats.join(", ")}</div>
                            <div className="small">金额：￥{(order.total_cents/100).toFixed(2)}</div>
                            <div className="small">状态：<span className="badge">{order.status}</span></div>
                            {order.ticket_code && <div className="small">出票码：<b>{order.ticket_code}</b></div>}
                        </div>
                    </div>

                    <hr />
                    {order.status !== "PAID" ? (
                        <button className="btn" onClick={pay}>模拟支付（立即成功）</button>
                    ) : (
                        <button className="btn" onClick={() => nav("/orders")}>查看我的订单</button>
                    )}
                </>
            )}
        </div>
    );
}
