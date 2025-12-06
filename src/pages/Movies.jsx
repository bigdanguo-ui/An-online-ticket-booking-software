import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { Link } from "react-router-dom";

export default function Movies() {
    const [q, setQ] = useState("");
    const [movies, setMovies] = useState([]);

    async function load() {
        const r = await api.get("/movies", { params: { q } });
        setMovies(r.data);
    }

    useEffect(() => { load(); }, []);

    return (
        <div>
            <div className="card" style={{marginBottom:14}}>
                <div className="row" style={{alignItems:"center"}}>
                    <input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="搜索电影标题…" style={{flex:1}} />
                    <button className="btn" onClick={load}>搜索</button>
                </div>
            </div>

            <div className="row">
                {movies.map(m => (
                    <div key={m.id} className="card movie">
                        <img alt={m.title} src={m.poster_url} style={{width:"100%", borderRadius:12, marginBottom:10}} />
                        <div style={{display:"flex", justifyContent:"space-between", gap:8, alignItems:"baseline"}}>
                            <b>{m.title}</b>
                            <span className="badge">{m.rating}</span>
                        </div>
                        <div className="small" style={{margin:"8px 0"}}>{m.duration_min} 分钟</div>
                        <Link className="btn" to={`/movie/${m.id}`} style={{display:"inline-block"}}>查看场次</Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
