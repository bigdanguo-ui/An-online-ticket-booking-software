import React, { useState, useEffect, useRef } from "react";
import { api } from "../api.js";
import { useNavigate } from "react-router-dom";

// 定义四个管理类别
const TABS = [
    { key: "movie", label: "电影", endpoint: "movies" },
    { key: "concert", label: "演唱会", endpoint: "concerts" },
    { key: "exhibition", label: "漫展", endpoint: "exhibitions" },
    { key: "user", label: "用户管理", endpoint: "users" } // 特殊类别
];

// 分类选项
const CATEGORY_OPTIONS = {
    movie: ["全部", "动作", "喜剧", "科幻", "爱情", "悬疑", "动画", "惊悚", "纪录片"],
    concert: ["全部", "流行", "摇滚", "民谣", "爵士", "古典", "K-POP", "电子", "说唱"],
    exhibition: ["全部", "二次元", "游戏展", "艺术展", "科技展", "车展", "摄影展"]
};

export default function Admin({ me }) {
    const nav = useNavigate();
    const showtimeRef = useRef(null); // 用于滚动到排期表单

    // --- 状态管理 ---
    const [activeTab, setActiveTab] = useState("movie");
    const [items, setItems] = useState([]);
    const [msg, setMsg] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });

    // 内容表单数据
    const [form, setForm] = useState({
        id: null,
        title: "",
        category: "",
        description: "",
        poster_url: "",
        duration_min: 120,
        rating: "PG-13",
        venue: "",
        price_info: "",
        status: "ON"
    });

    // 场次表单数据
    const [showtime, setShowtime] = useState({
        target_id: "",
        hall_id: 1,
        start_time: new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16),
        price_cents: 4500
    });

    // --- 初始化与加载 ---
    if (!me?.is_admin) return <div style={{ padding: 40, textAlign: "center" }}>需要管理员权限</div>;

    useEffect(() => {
        loadItems();
        resetForm();
        setMsg("");

        // 全局点击关闭右键菜单
        const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    async function loadItems() {
        try {
            if (activeTab === "user") {
                const r = await api.get("/admin/users");
                setItems(r.data);
            } else {
                const endpoint = TABS.find(t => t.key === activeTab).endpoint;
                const r = await api.get(`/${endpoint}`);
                setItems(r.data);
            }
        } catch (e) { console.error(e); }
    }

    // --- 功能 1: 用户管理逻辑 ---
    async function toggleUserStatus(user) {
        if (!window.confirm(`确定要${user.is_active ? "禁用" : "启用"}该用户吗？`)) return;
        try {
            // 注意：params 传参
            await api.put(`/admin/users/${user.id}/status`, null, {
                params: { active: !user.is_active }
            });
            setMsg(`用户 ${user.name} 状态已更新`);
            loadItems();
        } catch (e) {
            setMsg("操作失败：" + (e.response?.data?.detail || e.message));
        }
    }

    // --- 功能 2: 内容 CRUD 逻辑 ---
    function resetForm() {
        setIsEditing(false);
        setForm({
            id: null, title: "", category: "", description: "", poster_url: "",
            duration_min: 120, rating: "PG-13", venue: "", price_info: "", status: "ON"
        });
    }

    function handleEdit(item) {
        setIsEditing(true);
        setForm({ ...form, ...item, id: item.id });
    }

    async function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        setMsg("上传中...");
        try {
            const r = await api.post("/admin/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
            setForm(prev => ({ ...prev, poster_url: r.data.url }));
            setMsg("图片上传成功");
        } catch (e) { setMsg("上传失败"); }
    }

    async function handleSubmit() {
        setMsg("");
        const endpoint = TABS.find(t => t.key === activeTab).endpoint;
        const url = `/admin/${endpoint}`;
        try {
            if (isEditing) {
                await api.put(`${url}/${form.id}`, form);
                setMsg("修改成功");
            } else {
                await api.post(url, form);
                setMsg("创建成功");
            }
            loadItems();
            resetForm();
        } catch (e) { setMsg("操作失败：" + (e?.response?.data?.detail || e.message)); }
    }

    async function handleDelete(id) {
        if (!window.confirm("确定要删除吗？不可恢复。")) return;
        const endpoint = TABS.find(t => t.key === activeTab).endpoint;
        try {
            await api.delete(`/admin/${endpoint}/${id}`);
            setMsg("删除成功");
            loadItems();
        } catch (e) { setMsg("删除失败"); }
    }

    // --- 功能 3: 排期管理逻辑 ---
    async function createShowtime() {
        try {
            const payload = {
                target_id: Number(showtime.target_id),
                event_kind: activeTab, // 自动带入当前类型
                hall_id: Number(showtime.hall_id),
                price_cents: Number(showtime.price_cents),
                start_time: new Date(showtime.start_time).toISOString()
            };
            await api.post('/admin/showtimes', payload);
            setMsg(`[${activeTab}] ID ${showtime.target_id} 场次创建成功`);
        } catch (e) { setMsg("场次创建失败：" + e.message); }
    }

    // --- 功能 4: 右键菜单逻辑 ---
    function handleContextMenu(e, item) {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.pageX, y: e.pageY, item });
    }

    function handleMenuAction(action) {
        const { item } = contextMenu;
        if (action === "delete") {
            handleDelete(item.id);
        } else if (action === "showtime") {
            setShowtime(prev => ({ ...prev, target_id: item.id }));
            showtimeRef.current?.scrollIntoView({ behavior: "smooth" });
            setMsg(`已选中 ID: ${item.id}，请填写下方时间并创建`);
        }
    }

    return (
        <div className="container" style={{ maxWidth: 1100, margin: "20px auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2>🛡️ 后台管理系统</h2>
                <div className="small">当前管理员: {me.name} ({me.email})</div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="btn"
                        style={{
                            backgroundColor: activeTab === tab.key ? "#333" : "#e0e0e0",
                            color: activeTab === tab.key ? "#fff" : "#333",
                            fontWeight: activeTab === tab.key ? "bold" : "normal"
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {msg && <div style={{ padding: 10, background: "#d4edda", color: "#155724", marginBottom: 15, borderRadius: 4 }}>提示：{msg}</div>}

            {/* --- 根据 Tab 渲染不同界面 --- */}
            {activeTab === "user" ? (
                // === 界面 A: 用户管理表格 ===
                <div className="card">
                    <h3>用户列表</h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 15 }}>
                        <thead>
                        <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                            <th style={{ padding: 10, textAlign: "left" }}>ID</th>
                            <th style={{ padding: 10, textAlign: "left" }}>用户信息</th>
                            <th style={{ padding: 10, textAlign: "left" }}>邮箱</th>
                            <th style={{ padding: 10, textAlign: "left" }}>角色</th>
                            <th style={{ padding: 10, textAlign: "center" }}>状态</th>
                            <th style={{ padding: 10, textAlign: "right" }}>操作</th>
                        </tr>
                        </thead>
                        <tbody>
                        {items.map(u => (
                            <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                                <td style={{ padding: 10 }}>{u.id}</td>
                                <td style={{ padding: 10 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <img src={u.avatar_url || "https://via.placeholder.com/40"} style={{ width: 32, height: 32, borderRadius: "50%" }} alt="" />
                                        {u.name}
                                    </div>
                                </td>
                                <td style={{ padding: 10 }}>{u.email}</td>
                                <td style={{ padding: 10 }}>{u.is_admin ? <span style={{ color: "red", fontWeight: "bold" }}>管理员</span> : "用户"}</td>
                                <td style={{ padding: 10, textAlign: "center" }}>
                                    {u.is_active ?
                                        <span style={{ background: "#eaffe6", color: "#2ed573", padding: "2px 6px", borderRadius: 4 }}>正常</span> :
                                        <span style={{ background: "#eee", color: "#999", padding: "2px 6px", borderRadius: 4 }}>禁用</span>
                                    }
                                </td>
                                <td style={{ padding: 10, textAlign: "right" }}>
                                    {u.id !== me.id && (
                                        <button
                                            onClick={() => toggleUserStatus(u)}
                                            style={{
                                                cursor: "pointer", border: "none", padding: "6px 12px", borderRadius: 4,
                                                background: u.is_active ? "#ff4757" : "#2ed573", color: "#fff"
                                            }}
                                        >
                                            {u.is_active ? "🚫 禁用" : "✅ 启用"}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                // === 界面 B: 内容管理 (列表 + 表单) ===
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {/* 左侧列表 */}
                    <div className="card" style={{ maxHeight: "80vh", overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <h3>{TABS.find(t => t.key === activeTab).label}列表</h3>
                            <button className="small btn" onClick={resetForm} style={{ backgroundColor: "#2ed573" }}>+ 新增</button>
                        </div>
                        <div className="small" style={{color:"#999", marginBottom:10}}>提示：右键点击列表项可快速操作</div>

                        {items.map(item => (
                            <div
                                key={item.id}
                                onClick={() => handleEdit(item)}
                                onContextMenu={(e) => handleContextMenu(e, item)}
                                style={{
                                    padding: 10, borderBottom: "1px solid #eee", cursor: "pointer", display: "flex", gap: 10,
                                    background: contextMenu.item?.id === item.id && contextMenu.visible ? "#f0f0f0" : "#fff"
                                }}
                            >
                                <img src={item.poster_url} style={{ width: 40, height: 60, objectFit: "cover", borderRadius: 4 }} alt="" />
                                <div>
                                    <b>{item.title}</b>
                                    <div className="small" style={{ color: "#666" }}>ID: {item.id} | {item.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 右侧表单 */}
                    <div className="card">
                        <h3>{isEditing ? "编辑内容" : "新增内容"}</h3>
                        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 15 }}>
                            <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="标题" />

                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <label className="small" style={{whiteSpace:"nowrap"}}>分类：</label>
                                <select
                                    className="input"
                                    style={{ height: 40 }}
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                >
                                    <option value="">-- 请选择 --</option>
                                    {CATEGORY_OPTIONS[activeTab]?.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ border: "1px dashed #ccc", padding: 10, borderRadius: 8 }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                    <input type="file" onChange={handleFileUpload} accept="image/*" />
                                    {form.poster_url && <img src={form.poster_url} alt="预览" style={{ height: 40 }} />}
                                </div>
                                <input className="input" value={form.poster_url} onChange={e => setForm({ ...form, poster_url: e.target.value })} placeholder="图片 URL" style={{ marginTop: 5, fontSize: "0.8rem" }} />
                            </div>

                            <textarea className="input" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="简介" />

                            {activeTab === 'movie' ? (
                                <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                    <input className="input" type="number" value={form.duration_min} onChange={e => setForm({ ...form, duration_min: Number(e.target.value) })} placeholder="时长(分)" />
                                    <input className="input" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} placeholder="分级" />
                                </div>
                            ) : (
                                <input className="input" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder="场馆/地点" />
                            )}

                            <button className="btn" onClick={handleSubmit} style={{ padding: 12 }}>
                                {isEditing ? "保存修改" : "立即创建"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 底部：排期管理 (仅非用户Tab显示) --- */}
            {activeTab !== "user" && (
                <div className="card" style={{ marginTop: 30, borderTop: "4px solid #eee" }} ref={showtimeRef}>
                    <h3>📅 排期/场次管理</h3>
                    <div className="small" style={{ marginBottom: 10, color: "#666" }}>
                        为 {TABS.find(t => t.key === activeTab).label} (ID: <b>{showtime.target_id}</b>) 添加场次。
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, alignItems: "end" }}>
                        <div>
                            <label className="small">关联ID</label>
                            <input className="input" type="number" value={showtime.target_id} onChange={e => setShowtime({ ...showtime, target_id: e.target.value })} />
                        </div>
                        <div>
                            <label className="small">厅/区域ID</label>
                            <input className="input" type="number" value={showtime.hall_id} onChange={e => setShowtime({ ...showtime, hall_id: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="small">开始时间</label>
                            <input className="input" type="datetime-local" value={showtime.start_time} onChange={e => setShowtime({ ...showtime, start_time: e.target.value })} />
                        </div>
                        <div>
                            <label className="small">价格(分)</label>
                            <input className="input" type="number" value={showtime.price_cents} onChange={e => setShowtime({ ...showtime, price_cents: Number(e.target.value) })} />
                        </div>
                        <button className="btn" onClick={createShowtime}>创建场次</button>
                    </div>
                </div>
            )}

            {/* --- 右键菜单 Overlay --- */}
            {contextMenu.visible && (
                <div style={{
                    position: "absolute", top: contextMenu.y, left: contextMenu.x,
                    background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", borderRadius: 4, zIndex: 999, minWidth: 120
                }}>
                    <div onClick={() => handleMenuAction("showtime")} style={{ padding: "10px 15px", cursor: "pointer", borderBottom: "1px solid #eee" }}>📅 新增场次</div>
                    <div onClick={() => handleMenuAction("delete")} style={{ padding: "10px 15px", cursor: "pointer", color: "red" }}>🗑️ 删除此项</div>
                </div>
            )}
        </div>
    );
}