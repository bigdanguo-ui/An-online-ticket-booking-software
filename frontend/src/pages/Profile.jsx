import React, { useState, useEffect } from "react";
import { api } from "../api.js";

export default function Profile({ me, onUpdate }) {
    // --- 状态管理 ---
    const [isEditing, setIsEditing] = useState(false);

    // 表单数据
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [password, setPassword] = useState("");

    // UI 状态
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [uploading, setUploading] = useState(false);

    // --- 初始化数据 ---
    useEffect(() => {
        if (me) {
            resetForm();
        }
    }, [me]);

    const resetForm = () => {
        setName(me?.name || "");
        setPhone(me?.phone || "");
        setAvatarUrl(me?.avatar_url || "");
        setPassword("");
        setMsg("");
        setErr("");
    };

    // --- 处理头像上传 ---
    async function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        setErr("");

        try {
            const r = await api.post("/admin/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setAvatarUrl(r.data.url);
        } catch (ex) {
            setErr("图片上传失败");
        } finally {
            setUploading(false);
        }
    }

    // --- 提交保存 ---
    async function handleSave(e) {
        e.preventDefault();
        setMsg("");
        setErr("");

        try {
            const payload = {
                name,
                phone,
                avatar_url: avatarUrl
            };
            if (password) payload.password = password;

            await api.put("/auth/me", payload);

            setMsg("保存成功！");
            setIsEditing(false);
            if (onUpdate) await onUpdate();
        } catch (ex) {
            setErr(ex?.response?.data?.detail || "保存失败");
        }
    }

    if (!me) return <div style={{ textAlign: "center", padding: "80px", color: "#888" }}>加载用户信息中...</div>;

    const defaultAvatar = "https://via.placeholder.com/150?text=User";

    // --- 样式常量 ---
    const styles = {
        container: {
            display: "flex", justifyContent: "center", paddingTop: 40, paddingBottom: 60,
            minHeight: "calc(100vh - 60px)", backgroundColor: "#f4f7f6"
        },
        card: {
            maxWidth: 750, width: "100%", margin: "0 20px",
            backgroundColor: "#fff", borderRadius: "20px", overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0,0,0,0.08)", border: "1px solid #fff"
        },
        banner: {
            height: 160,
            background: "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)", // 清新的蓝绿渐变
            position: "relative"
        },
        avatarContainer: {
            position: "relative",
            marginTop: -75,
            marginLeft: 40,
            width: 150, height: 150,
        },
        avatarImg: {
            width: "100%", height: "100%",
            borderRadius: "50%", objectFit: "cover",
            border: "5px solid #fff",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            backgroundColor: "#fff"
        },
        uploadOverlay: {
            position: "absolute", bottom: 5, right: 5,
            backgroundColor: "#333", color: "#fff",
            width: 36, height: 36, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            fontSize: "1.2rem"
        },
        headerContent: {
            padding: "10px 40px 0 210px", // 左边距留给头像
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            minHeight: 80
        },
        infoBox: {
            backgroundColor: "#f8f9fa", borderRadius: "12px", padding: "16px 20px",
            border: "1px solid #edf2f7", transition: "transform 0.2s"
        },
        label: {
            display: "block", fontSize: "0.75rem", textTransform: "uppercase",
            letterSpacing: "0.05em", color: "#8898aa", marginBottom: 6, fontWeight: "600"
        },
        value: {
            fontSize: "1.05rem", color: "#32325d", fontWeight: "500"
        },
        input: {
            width: "100%", padding: "12px 16px", borderRadius: "8px",
            border: "1px solid #e2e8f0", fontSize: "0.95rem", outline: "none",
            backgroundColor: "#fff", transition: "border-color 0.2s"
        },
        btnPrimary: {
            backgroundColor: "#5e72e4", color: "#fff", border: "none",
            padding: "12px 24px", borderRadius: "8px", cursor: "pointer",
            fontSize: "0.95rem", fontWeight: "600", boxShadow: "0 4px 6px rgba(50, 50, 93, 0.11)"
        },
        btnGhost: {
            backgroundColor: "transparent", color: "#5e72e4", border: "1px solid #5e72e4",
            padding: "10px 20px", borderRadius: "8px", cursor: "pointer",
            fontSize: "0.9rem", fontWeight: "600", marginLeft: 10
        },
        badge: {
            display: "inline-block", padding: "4px 8px", borderRadius: "4px",
            fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase",
            backgroundColor: me.is_admin ? "#ff4757" : "#2ed573", color: "#fff",
            marginTop: 5
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>

                {/* --- 顶部 Banner --- */}
                <div style={styles.banner}>
                    {/* 可以在这里加一些 SVG 图案或者保持纯净的渐变 */}
                </div>

                {/* --- 头像与头部区域 --- */}
                <div style={{ position: "relative" }}>
                    {/* 头像 */}
                    <div style={styles.avatarContainer}>
                        <img
                            src={avatarUrl || me.avatar_url || defaultAvatar}
                            alt="Avatar"
                            style={styles.avatarImg}
                        />
                        {/* 编辑模式下显示相机图标 */}
                        {isEditing && (
                            <label style={styles.uploadOverlay} title="上传新头像">
                                📷
                                <input type="file" onChange={handleFileUpload} accept="image/*" style={{ display: "none" }} />
                            </label>
                        )}
                        {uploading && <div style={{ position: "absolute", top: "100%", left: 0, width: "100%", textAlign: "center", fontSize: "0.8rem", color: "#666" }}>上传中...</div>}
                    </div>

                    {/* 姓名与编辑按钮 */}
                    <div style={styles.headerContent}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: "2rem", color: "#32325d" }}>{me.name}</h1>
                            <div style={styles.badge}>{me.is_admin ? "管理员" : "会员用户"}</div>
                        </div>
                        {!isEditing && (
                            <button
                                style={styles.btnGhost}
                                onClick={() => setIsEditing(true)}
                            >
                                ⚙️ 编辑资料
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ padding: "40px" }}>
                    {/* 消息提示 */}
                    {msg && (
                        <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "#e6fffa", color: "#2c7a7b", marginBottom: 20, textAlign: "center" }}>
                            ✨ {msg}
                        </div>
                    )}
                    {err && (
                        <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "#fff5f5", color: "#c53030", marginBottom: 20, textAlign: "center" }}>
                            ❌ {err}
                        </div>
                    )}

                    {/* --- 内容区域 --- */}
                    {isEditing ? (
                        // 🔥 编辑模式：表单
                        <form onSubmit={handleSave}>
                            <h3 style={{ borderLeft: "4px solid #5e72e4", paddingLeft: 10, color: "#525f7f", marginBottom: 20 }}>
                                修改基本信息
                            </h3>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                                <div>
                                    <label style={styles.label}>昵称</label>
                                    <input
                                        style={styles.input}
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="您的称呼"
                                    />
                                </div>
                                <div>
                                    <label style={styles.label}>联系方式 / 手机</label>
                                    <input
                                        style={styles.input}
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="未填写"
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 30 }}>
                                <label style={styles.label}>重置密码 <span style={{ textTransform: "none", fontWeight: 400, color: "#ccc" }}>(选填)</span></label>
                                <input
                                    type="password"
                                    style={styles.input}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="输入新密码以修改，留空则保持不变"
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 15, borderTop: "1px solid #f0f0f0", paddingTop: 20 }}>
                                <button
                                    type="button"
                                    onClick={() => { setIsEditing(false); resetForm(); }}
                                    style={{ ...styles.btnGhost, border: "1px solid #ccc", color: "#666" }}
                                >
                                    取消
                                </button>
                                <button style={styles.btnPrimary}>
                                    保存修改
                                </button>
                            </div>
                        </form>
                    ) : (
                        // 👓 查看模式：信息卡片
                        <div>
                            <h3 style={{ color: "#8898aa", fontSize: "0.9rem", textTransform: "uppercase", marginBottom: 20 }}>
                                账户详情
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
                                <div style={styles.infoBox}>
                                    <span style={styles.label}>注册邮箱</span>
                                    <div style={styles.value}>{me.email}</div>
                                </div>
                                <div style={styles.infoBox}>
                                    <span style={styles.label}>用户 ID</span>
                                    <div style={styles.value}>#{me.id}</div>
                                </div>
                                <div style={styles.infoBox}>
                                    <span style={styles.label}>联系方式</span>
                                    <div style={styles.value}>
                                        {me.phone ? me.phone : <span style={{ color: "#ccc" }}>未设置</span>}
                                    </div>
                                </div>
                                <div style={styles.infoBox}>
                                    <span style={styles.label}>账号安全</span>
                                    <div style={{ ...styles.value, color: "#2dce89", display: "flex", alignItems: "center", gap: 5 }}>
                                        🔒 已保护
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}