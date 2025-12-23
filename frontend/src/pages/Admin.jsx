import React, { useState, useEffect } from "react";
import { api } from "../api.js";
import { useNavigate } from "react-router-dom";

// 定义三个类别的配置
const TABS = [
    { key: "movie", label: "电影", endpoint: "movies" },
    { key: "concert", label: "演唱会", endpoint: "concerts" },
    { key: "exhibition", label: "漫展", endpoint: "exhibitions" }
];

const CATEGORY_OPTIONS = {
    movie: ["全部", "动作", "喜剧", "科幻", "爱情", "悬疑", "动画"],
    concert: ["全部", "流行", "摇滚", "民谣", "爵士", "古典", "K-POP"],
    exhibition: ["全部", "二次元", "游戏展", "艺术展", "科技展", "车展"]
};

export default function Admin({ me }) {
    const nav = useNavigate();

    // --- 状态管理 ---
    const [activeTab, setActiveTab] = useState("movie"); // 当前选中的类别 key
    const [items, setItems] = useState([]); // 当前类别的列表数据
    const [msg, setMsg] = useState("");
    const [isEditing, setIsEditing] = useState(false); // 是否处于编辑模式

    // 通用表单数据 (包含所有可能用到的字段，提交时后端按需取用)
    const [form, setForm] = useState({
        id: null,
        title: "",
        category: "",
        description: "",
        poster_url: "https://picsum.photos/300/400",
        // 电影特有
        duration_min: 120,
        rating: "PG-13",
        // 演唱会/漫展特有
        venue: "", // 场馆
        price_info: "", // 价格说明文本
        status: "ON"
    });

    // --- 图片上传处理 ---
    async function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setMsg("正在上传图片...");
        try {
            // 请求后端上传接口
            const r = await api.post("/admin/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            // 上传成功，将返回的 URL 填入表单
            setForm(prev => ({ ...prev, poster_url: r.data.url }));
            setMsg("图片上传成功！");
        } catch (err) {
            setMsg("上传失败：" + (err.response?.data?.detail || err.message));
        }
    }


    // 场次表单 (独立于内容管理)
    const [showtime, setShowtime] = useState({
        target_id: 1, // 对应 movie_id / concert_id
        hall_id: 1,
        start_time: new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16), // 格式化为 datetime-local
        price_cents: 4500
    });

    // --- 权限检查 ---
    if (!me?.is_admin) return (
        <div className="card" style={{maxWidth: 400, margin: "50px auto", textAlign: "center"}}>
            <h2>管理后台</h2>
            <div className="small" style={{marginBottom: 20}}>需要管理员权限</div>
            <button className="btn" onClick={() => nav("/login")}>去登录</button>
        </div>
    );

    // --- 数据加载 ---
    // 切换 Tab 时加载对应数据
    useEffect(() => {
        loadItems();
        resetForm();
        setMsg("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    async function loadItems() {
        try {
            // 假设后端管理端列表接口为 /admin/movies 或 /movies (视后端实现而定)
            // 这里为了演示 CRUD，假设直接请求 GET /endpoint 即可获取列表
            const endpoint = TABS.find(t => t.key === activeTab).endpoint;
            // 注意：如果后端区分 /admin/movies 和 /movies，请根据实际情况修改路径
            const r = await api.get(`/${endpoint}`);
            setItems(r.data);
        } catch (e) {
            console.error("加载失败", e);
        }
    }

    // --- 表单操作 ---
    function resetForm() {
        setIsEditing(false);
        setForm({
            id: null,
            title: "",
            category: "",
            description: "",
            poster_url: "https://picsum.photos/300/400",
            duration_min: 120,
            rating: "PG-13",
            venue: "",
            price_info: "",
            status: "ON"
        });
    }

    function handleEdit(item) {
        setIsEditing(true);
        // 将 item 数据填充到表单，防止 null 报错
        setForm({
            ...form,
            ...item,
            id: item.id
        });
        setMsg("正在编辑: " + item.title);
    }

    // --- 核心 CRUD 方法 ---
    async function handleSubmit() {
        setMsg("");
        const endpoint = TABS.find(t => t.key === activeTab).endpoint;
        const url = `/admin/${endpoint}`; // 假设后端路径为 /admin/movies, /admin/concerts

        try {
            if (isEditing) {
                // 修改 PUT /admin/movies/123
                await api.put(`${url}/${form.id}`, form);
                setMsg("修改成功！");
            } else {
                // 新增 POST /admin/movies
                await api.post(url, form);
                setMsg("创建成功！");
            }
            loadItems(); // 刷新列表
            resetForm(); // 重置表单
        } catch (e) {
            setMsg("操作失败：" + (e?.response?.data?.detail || e.message));
        }
    }

    async function handleDelete(id) {
        if (!window.confirm("确定要删除吗？此操作不可恢复。")) return;
        const endpoint = TABS.find(t => t.key === activeTab).endpoint;
        try {
            await api.delete(`/admin/${endpoint}/${id}`);
            setMsg("删除成功");
            loadItems();
        } catch (e) {
            setMsg("删除失败：" + (e?.response?.data?.detail || "未知错误"));
        }
    }

    // --- 场次管理方法 (保持原逻辑，略作优化) ---
    async function createShowtime() {
        setMsg("");
        try {
            const payload = {
                // 1. 传入通用 ID
                target_id: Number(showtime.target_id),

                // 2. 🔥 传入当前激活的类别 (movie/concert/exhibition)
                event_kind: activeTab,

                hall_id: Number(showtime.hall_id),
                price_cents: Number(showtime.price_cents),
                start_time: new Date(showtime.start_time).toISOString()
            };

            // 注意：因为后端 Schema 改了，不要再传 movie_id 了

            const r = await api.post('/admin/showtimes', payload);
            setMsg(`[${activeTab}] ID ${showtime.target_id} 的场次创建成功`);
        } catch (e) {
            console.error(e);
            setMsg("场次创建失败：" + (e?.response?.data?.detail || e.message));
        }
    }

    return (
        <div className="container" style={{maxWidth: 1000, margin: "20px auto"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 20}}>
                <h2>后台管理系统</h2>
                <div className="small">当前管理员: {me.name} ({me.email})</div>
            </div>

            {/* --- Tab 切换 --- */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, borderBottom: "1px solid #ddd", paddingBottom: 10 }}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="btn"
                        style={{
                            backgroundColor: activeTab === tab.key ? "#333" : "#f0f0f0",
                            color: activeTab === tab.key ? "#fff" : "#333",
                            border: "none"
                        }}
                    >
                        {tab.label}管理
                    </button>
                ))}
            </div>

            {msg && <div className="card" style={{background: "#fff3cd", color: "#856404", padding: 10, marginBottom: 20}}>{msg}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                {/* --- 左侧：列表区域 --- */}
                <div className="card" style={{ maxHeight: "80vh", overflowY: "auto" }}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 10}}>
                        <h3>{TABS.find(t=>t.key===activeTab).label}列表</h3>
                        <button className="small btn" onClick={resetForm} style={{backgroundColor:"#2ed573"}}>+ 新增</button>
                    </div>
                    {items.length === 0 ? <div className="small">暂无数据</div> : (
                        <table style={{width:"100%", borderCollapse:"collapse"}}>
                            <thead>
                            <tr style={{textAlign:"left", borderBottom:"1px solid #eee"}}>
                                <th style={{padding:5}}>ID</th>
                                <th style={{padding:5}}>标题</th>
                                <th style={{padding:5, textAlign:"right"}}>操作</th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map(item => (
                                <tr key={item.id} style={{borderBottom:"1px solid #eee"}}>
                                    <td style={{padding:8}}>{item.id}</td>
                                    <td style={{padding:8}}>
                                        <div style={{fontWeight:"bold"}}>{item.title}</div>
                                        <div className="small" style={{color:"#999"}}>{item.status}</div>
                                    </td>
                                    <td style={{padding:8, textAlign:"right"}}>
                                        <button onClick={() => handleEdit(item)} style={{marginRight:5, cursor:"pointer"}}>编辑</button>
                                        <button onClick={() => handleDelete(item.id)} style={{color:"red", cursor:"pointer"}}>删除</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* --- 右侧：编辑表单区域 --- */}
                <div className="card">
                    <h3 style={{marginBottom: 15}}>{isEditing ? `编辑${form.title}` : `新增${TABS.find(t=>t.key===activeTab).label}`}</h3>

                    <div className="grid" style={{gridTemplateColumns:"1fr", gap:15}}>
                        {/* 标题输入框 */}
                        <input className="input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="标题" />
                        {/* ✅ 3. 新增：分类选择下拉菜单 */}
                        <div className="grid" style={{gridTemplateColumns: "1fr 1fr", gap: 10}}>
                            <div>
                                <label className="small">选择分类</label>
                                <select
                                    className="input"
                                    value={form.category}
                                    onChange={e => setForm({...form, category: e.target.value})}
                                    style={{height: 20}} // 调整高度以匹配输入框
                                >

                                    {/* 根据当前选中的 activeTab 显示对应的选项 */}
                                    {CATEGORY_OPTIONS[activeTab]?.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>



                        <div style={{border:"1px dashed #ccc", padding:10, borderRadius:8}}>
                            <label className="small">海报图片</label>
                            <div style={{display:"flex", gap:10, alignItems:"center", marginTop:5}}>
                                <input type="file" onChange={handleFileUpload} accept="image/*" />
                                {form.poster_url && <img src={form.poster_url} alt="预览" style={{height:40}} />}
                            </div>
                            <input
                                className="input"
                                value={form.poster_url}
                                onChange={e=>setForm({...form, poster_url:e.target.value})}
                                placeholder="或直接输入图片 URL"
                                style={{marginTop:5, fontSize:"0.8rem"}}
                            />
                        </div>

                        <div>
                            <label className="small">简介</label>
                            <textarea className="input" rows="3" value={form.description} onChange={e=>setForm({...form, description: e.target.value})} />
                        </div>

                        {/* 电影特有字段 */}
                        {activeTab === 'movie' && (
                            <div className="grid" style={{gridTemplateColumns:"1fr 1fr", gap:10}}>
                                <div>
                                    <label className="small">时长(分钟)</label>
                                    <input className="input" type="number" value={form.duration_min} onChange={e=>setForm({...form, duration_min: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="small">分级(PG-13等)</label>
                                    <input className="input" value={form.rating} onChange={e=>setForm({...form, rating: e.target.value})} />
                                </div>
                            </div>
                        )}

                        {/* 演唱会/漫展特有字段 */}
                        {(activeTab === 'concert' || activeTab === 'exhibition') && (
                            <div>
                                <label className="small">场馆 / 地点</label>
                                <input className="input" value={form.venue} onChange={e=>setForm({...form, venue: e.target.value})} placeholder="例如：国家体育馆" />
                            </div>
                        )}

                        <button className="btn" onClick={handleSubmit} style={{marginTop: 10, padding: 12}}>
                            {isEditing ? "保存修改" : "立即创建"}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- 底部：排期管理 (共用) --- */}
            <div className="card" style={{marginTop: 30, borderTop: "4px solid #eee"}}>
                <h3>排期/场次管理</h3>
                <div className="small" style={{marginBottom:10, color:"#666"}}>
                    为 ID 为 <b>{showtime.target_id}</b> 的 {TABS.find(t=>t.key===activeTab).label} 添加具体的场次或票务信息。
                </div>
                <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:10, alignItems:"end"}}>
                    <div>
                        <label className="small">关联ID</label>
                        <input className="input" type="number" value={showtime.target_id} onChange={e=>setShowtime({...showtime,target_id:Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="small">厅/区域ID</label>
                        <input className="input" type="number" value={showtime.hall_id} onChange={e=>setShowtime({...showtime,hall_id:Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="small">开始时间</label>
                        <input className="input" type="datetime-local" value={showtime.start_time} onChange={e=>setShowtime({...showtime,start_time:e.target.value})} />
                    </div>
                    <div>
                        <label className="small">价格(分)</label>
                        <input className="input" type="number" value={showtime.price_cents} onChange={e=>setShowtime({...showtime,price_cents:Number(e.target.value)})} />
                    </div>
                    <button className="btn" onClick={createShowtime}>添加排期</button>
                </div>
            </div>
        </div>
    );
}