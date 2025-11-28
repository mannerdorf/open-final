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

// --- CONFIGURATION ---
const PROXY_API_BASE_URL = '/api/perevozki'; 
const PROXY_API_DOWNLOAD_URL = '/api/download'; 

// --- TYPES ---
type ApiError = { error?: string; };
type AuthData = { login: string; password: string; };

// Единственная вкладка — CARGO
type Tab = "cargo";

// Дальше оставлены только типы CargoPage
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

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getSixMonthsAgoDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6); 
    return d.toISOString().split('T')[0];
};

const DEFAULT_DATE_FROM = getSixMonthsAgoDate();
const DEFAULT_DATE_TO = getTodayDate();

// DATE FILTERS
const getDateRange = (filter: DateFilter) => {
    const today = new Date();
    const dateTo = getTodayDate();
    let dateFrom = dateTo;
    switch (filter) {
        case 'all': dateFrom = getSixMonthsAgoDate(); break;
        case 'today': dateFrom = getTodayDate(); break;
        case 'week': today.setDate(today.getDate() - 7); dateFrom = today.toISOString().split('T')[0]; break;
        case 'month': today.setMonth(today.getMonth() - 1); dateFrom = today.toISOString().split('T')[0]; break;
        default: break;
    }
    return { dateFrom, dateTo };
};

const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const clean = dateString.split("T")[0];
    const d = new Date(clean);
    return !isNaN(d.getTime()) ? d.toLocaleDateString("ru-RU") : dateString;
};

const formatCurrency = (value: any) => {
    const n = parseFloat(String(value).replace(",", "."));
    return isNaN(n) ? "-" : new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(n);
};

const getStatusClass = (status: string = "") => {
    const s = status.toLowerCase();
    if (s.includes("достав")) return "status-value success";
    if (s.includes("пути")) return "status-value transit";
    if (s.includes("принят") || s.includes("оформ")) return "status-value accepted";
    if (s.includes("готов")) return "status-value ready";
    return "status-value";
};

const STATUS_MAP: Record<StatusFilter,string> = {
    all:"Все",
    accepted:"Принят",
    in_transit:"В пути",
    ready:"Готов",
    delivering:"На доставке",
    delivered:"Доставлено"
};


/* ============================================================
                     CARGO PAGE (ОСТАВЛЕНА ОДНА)
   ============================================================ */

function CargoPage({ auth, searchText }: { auth: AuthData, searchText: string }) {
    const [items, setItems] = useState<CargoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dateFilter, setDateFilter] = useState<DateFilter>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

    const apiDateRange = useMemo(
        () => getDateRange(dateFilter),
        [dateFilter]
    );

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
                    dateTo: apiDateRange.dateTo,
                })
            });

            if (!res.ok) throw new Error("Ошибка загрузки данных");
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
            <p className="text-sm text-theme-secondary mb-4 text-center">
                Период: {formatDate(apiDateRange.dateFrom)} – {formatDate(apiDateRange.dateTo)}
            </p>

            {loading && (
                <div className="text-center py-8">
                    <Loader2 className="animate-spin w-6 h-6 mx-auto text-theme-primary" />
                </div>
            )}

            {error && (
                <p className="login-error">{error}</p>
            )}

            {!loading && filtered.length === 0 && (
                <div className="empty-state-card">
                    <p>Ничего не найдено</p>
                </div>
            )}

            <div className="cargo-list">
                {filtered.map((item: CargoItem, idx) => (
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

/* ============================================================
                         TABBAR (1 КНОПКА)
   ============================================================ */

function TabBar({ active, onChange }: { active: Tab, onChange: (t: Tab) => void }) {
    return (
        <div className="tabbar-container">
            <button 
                className={`tab-button ${active === "cargo" ? "active" : ""}`}
                onClick={() => onChange("cargo")}
            >
                <Truck className="w-5 h-5" />
            </button>
        </div>
    );
}

/* ============================================================
                           MAIN APP
   ============================================================ */

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

    const handleSearch = (text: string) => setSearchText(text.toLowerCase());

    const handleLoginSubmit = async (e: FormEvent) => {
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
    };

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
                        <button onClick={toggleTheme}>
                            {theme === 'dark' ? "🌞" : "🌙"}
                        </button>
                    </div>

                    <div className="logo-text">HAULZ</div>

                    <form onSubmit={handleLoginSubmit} className="form">
                        <input 
                            className="login-input"
                            placeholder="Логин"
                            value={login}
                            onChange={e => setLogin(e.target.value)}
                        />
                        <div className="password-input-container">
                            <input 
                                className="login-input"
                                type={showPassword ? "text" : "password"}
                                placeholder="Пароль"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <button type="button" className="toggle-password-visibility"
                                onClick={() => setShowPassword(!showPassword)}>
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


    /* ============================================================
                           AUTHENTICATED VIEW
       ============================================================ */

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-top-row">
                    <div className="header-auth-info">
                        <UserIcon className="w-4 h-4 mr-2" />
                        <span>{auth.login}</span>
                    </div>

                    <div className="flex items-center space-x-3">

                        {/* SEARCH BUTTON */}
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

                        {/* LOGOUT */}
                        <button className="search-toggle-button" onClick={handleLogout}>
                            <LogOut />
                        </button>
                    </div>
                </div>

                {/* SEARCH INPUT */}
                <div className={`search-container ${isSearchExpanded ? "expanded" : "collapsed"}`}>
                    <Search className="w-5 h-5 ml-1 text-theme-secondary" />
                    <input 
                        type="search"
                        className="search-input"
                        placeholder="Поиск..."
                        value={searchText}
                        onChange={e => {
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
                <CargoPage auth={auth} searchText={searchText} />
            </div>

            <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
    );
}
