import { FormEvent, useEffect, useState, useCallback, useMemo } from "react";
import { 
    LogOut, Truck, User as UserIcon, Loader2, AlertTriangle, 
    Search, X
} from "lucide-react";
import React from "react";
import "./styles.css";
import WebApp from "@twa-dev/sdk";

const isTg = () => typeof window !== "undefined" && window.Telegram?.WebApp;

import { DOCUMENT_METHODS } from "./documentMethods";

// --- CONFIG ---
const PROXY_API_BASE_URL = '/api/perevozki';
const PROXY_API_DOWNLOAD_URL = '/api/download';

type ApiError = { error?: string };
type AuthData = { login: string; password: string };

type Tab = "cargo"; // теперь у нас только одна вкладка

// --- CARGO TYPES ---
type DateFilter = "all" | "today" | "week" | "month" | "custom";
type StatusFilter = "all" | "accepted" | "in_transit" | "ready" | "delivering" | "delivered";

type CargoItem = {
    Number?: string;
    DatePrih?: string;
    DateVr?: string;
    State?: string;
    Mest?: number | string;
    PW?: number | string;
    W?: number | string;
    Value?: number | string;
    Sum?: number | string;
    StateBill?: string;
    Sender?: string;
    [key: string]: any;
};

const getTodayDate = () => new Date().toISOString().split("T")[0];

const getSixMonthsAgoDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
};

const getDateRange = (filter: DateFilter) => {
    const today = new Date();
    const dateTo = getTodayDate();
    let dateFrom = dateTo;

    switch (filter) {
        case "all": dateFrom = getSixMonthsAgoDate(); break;
        case "today": dateFrom = getTodayDate(); break;
        case "week": today.setDate(today.getDate() - 7); dateFrom = today.toISOString().split("T")[0]; break;
        case "month": today.setMonth(today.getMonth() - 1); dateFrom = today.toISOString().split("T")[0]; break;
        default: break;
    }

    return { dateFrom, dateTo };
};

const formatDate = (d?: string) => {
    if (!d) return "-";
    const val = d.split("T")[0];
    const dt = new Date(val);
    return !isNaN(dt.getTime()) ? dt.toLocaleDateString("ru-RU") : d;
};

const formatCurrency = (v: any) => {
    const n = parseFloat(String(v).replace(",", "."));
    return isNaN(n)
        ? "-"
        : new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(n);
};

const getStatusClass = (s: string = "") => {
    const t = s.toLowerCase();
    if (t.includes("достав")) return "status-value success";
    if (t.includes("пути")) return "status-value transit";
    if (t.includes("принят")) return "status-value accepted";
    if (t.includes("готов")) return "status-value ready";
    return "status-value";
};

const STATUS_MAP: Record<StatusFilter, string> = {
    all: "Все",
    accepted: "Принят",
    in_transit: "В пути",
    ready: "Готов",
    delivering: "На доставке",
    delivered: "Доставлено"
};

// -------------------- AI CHAT MODAL ------------------------

function AIChatModal({ onClose }: { onClose: () => void }) {
    const [messages, setMessages] = React.useState([
        { role: "assistant", text: "Привет! Я AI-логист HAULZ. Чем могу помочь?" }
    ]);

    const [input, setInput] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    async function sendMessage() {
        if (!input.trim()) return;

        const userText = input.trim();
        setMessages(prev => [...prev, { role: "user", text: userText }]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userText })
            });

            const data = await res.json();
            setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
        } catch {
            setMessages(prev => [...prev, { role: "assistant", text: "Ошибка AI." }]);
        }

        setLoading(false);
    }

    return (
        <div className="ai-overlay">
            <div className="ai-window">

                <div className="ai-header">
                    <span>AI Логист</span>
                    <button className="ai-close" onClick={onClose}>✖</button>
                </div>

                <div className="ai-messages">
                    {messages.map((m, i) => (
                        <div key={i} className={`ai-msg ${m.role}`}>
                            {m.text}
                        </div>
                    ))}

                    {loading && <div className="ai-typing">AI печатает…</div>}
                </div>

                <div className="ai-input-row">
                    <input
                        className="ai-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Введите вопрос…"
                    />
                    <button className="ai-send" onClick={sendMessage}>➤</button>
                </div>

            </div>
        </div>
    );
}

// -------------------- CARGO PAGE ------------------------

function CargoPage({ auth, searchText, onAskAI }: { auth: AuthData; searchText: string; onAskAI: () => void }) {
    const [items, setItems] = useState<CargoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<DateFilter>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

    const apiDateRange = useMemo(() => getDateRange(dateFilter), [dateFilter]);

    const loadCargo = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(PROXY_API_BASE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    login: auth.login,
                    password: auth.password,
                    dateFrom: apiDateRange.dateFrom,
                    dateTo: apiDateRange.dateTo
                })
            });

            if (!res.ok) throw new Error("Ошибка загрузки");

            const data = await res.json();
            const list = Array.isArray(data) ? data : data.items || [];
            setItems(list);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [auth, apiDateRange]);

    useEffect(() => {
        loadCargo();
    }, [loadCargo]);

    const filtered = useMemo(() => {
        let r = items;

        if (statusFilter !== "all") {
            r = r.filter(i => getStatusClass(i.State).includes(statusFilter));
        }

        if (searchText) {
            const s = searchText.toLowerCase();
            r = r.filter(i =>
                `${i.Number} ${i.State} ${i.Sender}`.toLowerCase().includes(s)
            );
        }
        return r;
    }, [items, statusFilter, searchText]);

    return (
        <div className="w-full">

            {/* Кнопка спросить у AI */}
            <button
                className="button-primary mb-4"
                onClick={onAskAI}
                style={{ width: "100%" }}
            >
                🤖 Спросить у AI
            </button>

            <p className="text-sm text-theme-secondary mb-4 text-center">
                Период: {formatDate(apiDateRange.dateFrom)} – {formatDate(apiDateRange.dateTo)}
            </p>

            {loading && (
                <div className="text-center py-8">
                    <Loader2 className="animate-spin w-6 h-6 mx-auto text-theme-primary" />
                </div>
            )}

            {error && <p className="login-error">{error}</p>}

            {!loading && filtered.length === 0 && (
                <div className="empty-state-card">
                    <p>Ничего не найдено</p>
                </div>
            )}

            <div className="cargo-list">
                {filtered.map((item, idx) => (
                    <div key={idx} className="cargo-card mb-4">
                        <div className="cargo-header-row">
                            <span className="order-number">{item.Number}</span>
                            <span className="date">{formatDate(item.DatePrih)}</span>
                        </div>

                        <div className="cargo-details-grid">
                            <div className="detail-item">
                                <div className="detail-item-label">Статус</div>
                                <div className={getStatusClass(item.State)}>
                                    {item.State}
                                </div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-item-label">Мест</div>
                                <div className="detail-item-value">{item.Mest}</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-item-label">Плат. вес</div>
                                <div className="detail-item-value">{item.PW}</div>
                            </div>
                        </div>

                        <div className="cargo-footer">
                            <span className="sum-label">Сумма</span>
                            <span className="sum-value">{formatCurrency(item.Sum)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// -------------------- MAIN APP ------------------------

export default function App() {
    const [auth, setAuth] = useState<AuthData | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("cargo");
    const [theme, setTheme] = useState("dark");

    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");

    const [agree1, setAgree1] = useState(true);
    const [agree2, setAgree2] = useState(true);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showPassword, setShowPassword] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [searchText, setSearchText] = useState("");

    const [showAIChat, setShowAIChat] = useState(false);

    useEffect(() => {
        if (!isTg()) return;
        WebApp.ready();
        WebApp.expand();
        setTheme(WebApp.colorScheme);

        const handler = () => setTheme(WebApp.colorScheme);
        WebApp.onEvent("themeChanged", handler);
        return () => WebApp.offEvent("themeChanged", handler);
    }, []);

    useEffect(() => {
        document.body.className = `${theme}-mode`;
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

    const handleSearch = (txt: string) => setSearchText(txt.toLowerCase());

    async function handleLoginSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        if (!login || !password) return setError("Введите логин и пароль");
        if (!agree1 || !agree2) return setError("Подтвердите согласие");

        try {
            setLoading(true);
            const { dateFrom, dateTo } = getDateRange("all");

            const res = await fetch(PROXY_API_BASE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login, password, dateFrom, dateTo })
            });

            if (!res.ok) {
                let msg = `Ошибка: ${res.status}`;
                try {
                    const err = await res.json() as ApiError;
                    if (err.error) msg = err.error;
                } catch {}
                setError(msg);
                return;
            }

            setAuth({ login, password });
            setActiveTab("cargo");
        } catch {
            setError("Ошибка сети");
        } finally {
            setLoading(false);
        }
    }

    const handleLogout = () => {
        setAuth(null);
        setPassword("");
        setSearchText("");
    };

    if (!auth) {
        return (
            <div className="app-container login-form-wrapper">
                <div className="login-card">
                    <div className="absolute top-4 right-4">
                        <button onClick={toggleTheme}>{theme === "dark" ? "🌞" : "🌙"}</button>
                    </div>

                    <div className="logo-text">HAULZ</div>

                    <form onSubmit={handleLoginSubmit} className="form">
                        <input
                            className="login-input"
                            placeholder="Логин"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                        />

                        <div className="password-input-container">
                            <input
                                className="login-input"
                                type={showPassword ? "text" : "password"}
                                placeholder="Пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <button
                                type="button"
                                className="toggle-password-visibility"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? "🙈" : "👁️"}
                            </button>
                        </div>

                        <button className="button-primary" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Войти"}
                        </button>
                    </form>

                    {error && (
                        <p className="login-error mt-4">
                            <AlertTriangle className="w-5 h-5 mr-2" /> {error}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">

            {/* HEADER */}
            <header className="app-header">
                <div className="header-top-row">

                    <div className="header-auth-info">
                        <UserIcon className="w-4 h-4 mr-2" />
                        <span>{auth.login}</span>
                    </div>

                    <div className="flex items-center space-x-3">

                        <button
                            className="search-toggle-button"
                            onClick={() => {
                                setIsSearchExpanded(!isSearchExpanded);
                                if (isSearchExpanded) {
                                    handleSearch("");
                                    setSearchText("");
                                }
                            }}
                        >
                            {isSearchExpanded ? <X /> : <Search />}
                        </button>

                        {/* ВОТ ТУТ КНОПКА AI */}
                        <button
                            className="search-toggle-button"
                            onClick={() => setShowAIChat(true)}
                        >
                            🤖
                        </button>

                        <button className="search-toggle-button" onClick={handleLogout}>
                            <LogOut />
                        </button>
                    </div>
                </div>

                {/* SEARCH */}
                <div className={`search-container ${isSearchExpanded ? "expanded" : "collapsed"}`}>
                    <Search className="w-5 h-5 ml-1 text-theme-secondary" />
                    <input
                        type="search"
                        className="search-input"
                        placeholder="Поиск..."
                        value={searchText}
                        onChange={(e) => {
                            setSearchText(e.target.value);
                            handleSearch(e.target.value);
                        }}
                    />

                    {searchText && (
                        <button
                            className="search-toggle-button"
                            onClick={() => {
                                setSearchText("");
                                handleSearch("");
                            }}
                        >
                            <X />
                        </button>
                    )}
                </div>
            </header>

            <div className="app-main">
                <CargoPage
                    auth={auth}
                    searchText={searchText}
                    onAskAI={() => setShowAIChat(true)}
                />
            </div>

            {/* AI CHAT */}
            {showAIChat && (
                <AIChatModal onClose={() => setShowAIChat(false)} />
            )}

        </div>
    );
}
