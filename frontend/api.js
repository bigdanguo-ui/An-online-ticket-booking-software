import axios from "axios";

export const API_BASE = "http://localhost:8000";

export function getToken() {
    return localStorage.getItem("token") || "";
}
export function setToken(t) {
    localStorage.setItem("token", t);
}
export function clearToken() {
    localStorage.removeItem("token");
}

export const api = axios.create({
    baseURL: API_BASE,
    timeout: 15000
});

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
