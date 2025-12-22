import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
    const { pathname } = useLocation();

    // 定义导航链接配置
    const links = [
        { path: "/movies", label: "电影" },
        { path: "/concerts", label: "演唱会" },
        { path: "/exhibitions", label: "漫展" }
    ];

    return (
        <nav style={{
            backgroundColor: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            padding: "0 20px",
            position: "sticky",
            top: 0,
            zIndex: 100
        }}>
            <div style={{
                maxWidth: 1200,
                margin: "0 auto",
                height: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
            }}>
                <div style={{ fontWeight: "bold", fontSize: "1.2rem", color: "#333" }}>
                    TicketApp
                </div>

                <div style={{ display: "flex", gap: 30 }}>
                    {links.map(link => {
                        const isActive = pathname === link.path || (link.path === "/movies" && pathname === "/");
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                style={{
                                    textDecoration: "none",
                                    color: isActive ? "#ff4757" : "#666",
                                    fontWeight: isActive ? "bold" : "normal",
                                    borderBottom: isActive ? "2px solid #ff4757" : "2px solid transparent",
                                    padding: "18px 0",
                                    transition: "all 0.2s"
                                }}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </div>

                <div style={{ fontSize: "0.9rem", color: "#666" }}>
                    user@example.com
                </div>
            </div>
        </nav>
    );
}