import { FormEvent, useEffect, useState, useCallback, useMemo } from "react";
// Импортируем все необходимые иконки
import { 
    LogOut, Home, Truck, FileText, MessageCircle, User, Loader2, Moon, Sun, Eye, EyeOff, AlertTriangle, Package, Calendar, Tag, Layers, Weight, Filter, X, Search, ChevronDown, User as UserIcon, Scale, DollarSign, List, Download, FileText as FileTextIcon, Send, 
    RussianRuble, LayoutGrid, Maximize, TrendingUp, CornerUpLeft, ClipboardCheck, CreditCard, Minus 
} from 'lucide-react';
import React from "react";

// --- ТИПЫ ДАННЫХ ---
type ApiError = {
    error?: string;
    [key: string]: unknown;
};

type AuthData = {
    login: string;
    password: string;
};

type Tab = "home" | "cargo" | "docs" | "support" | "profile";

type DateFilter = "all" | "today" | "week" | "month" | "custom";
type StatusFilter = "all" | "accepted" | "in_transit" | "ready" | "delivering" | "delivered";

type CargoItem = {
    Number?: string; 
    DatePrih?: string; 
    DateVruch?: string; 
    State?: string; 
    Mest?: number | string; 
    PV?: number | string; 
    Weight?: number | string; 
    Volume?: number | string; 
    Sum?: number | string; 
    StatusSchet?: string; 
    [key: string]: any; 
};

type CargoStat = {
    key: string;
    label: string;
    icon: React.ElementType;
    value: number | string;
    unit: string;
    bgColor: string;
};


// --- КОНФИГУРАЦИЯ ---
const PROXY_API_BASE_URL = '/api/perevozki'; 
const PROXY_API_DOWNLOAD_URL = '/api/download'; 

// --- КОНСТАНТЫ ---
const DEFAULT_LOGIN = "order@lal-auto.com";
const DEFAULT_PASSWORD = "ZakaZ656565";

const getTodayDate = () => new Date().toISOString().split('T')[0];
const getSixMonthsAgoDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6); 
    return d.toISOString().split('T')[0];
};

const DEFAULT_DATE_FROM = getSixMonthsAgoDate(); 
const DEFAULT_DATE_TO = getTodayDate(); 

// --- СТАТИСТИКА (ДАННЫЕ) ---
const STATS_LEVEL_1: CargoStat[] = [
    { key: 'total', label: 'Всего перевозок', icon: LayoutGrid, value: 125, unit: 'шт', bgColor: 'bg-indigo-500' },
    { key: 'payments', label: 'Счета', icon: RussianRuble, value: '1,250,000', unit: '₽', bgColor: 'bg-green-500' },
    { key: 'weight', label: 'Вес', icon: TrendingUp, value: 5400, unit: 'кг', bgColor: 'bg-yellow-500' },
    { key: 'volume', label: 'Объем', icon: Maximize, value: 125, unit: 'м³', bgColor: 'bg-pink-500' },
];

const STATS_LEVEL_2: { [key: string]: CargoStat[] } = {
    total: [
        { key: 'total_new', label: 'В работе', icon: Truck, value: 35, unit: 'шт', bgColor: 'bg-blue-400' },
        { key: 'total_in_transit', label: 'В пути', icon: TrendingUp, value: 50, unit: 'шт', bgColor: 'bg-indigo-400' },
        { key: 'total_completed', label: 'Завершено', icon: Check, value: 40, unit: 'шт', bgColor: 'bg-green-400' },
        { key: 'total_cancelled', label: 'Отменено', icon: X, value: 0, unit: 'шт', bgColor: 'bg-red-400' },
    ],
    payments: [
        { key: 'pay_paid', label: 'Оплачено', icon: ClipboardCheck, value: 750000, unit: '₽', bgColor: 'bg-green-400' },
        { key: 'pay_due', label: 'К оплате', icon: CreditCard, value: 500000, unit: '₽', bgColor: 'bg-yellow-400' },
        { key: 'pay_none', label: 'Нет счета', icon: Minus, value: 0, unit: 'шт', bgColor: 'bg-gray-400' },
    ],
    weight: [
        { key: 'weight_current', label: 'Общий вес', icon: Weight, value: 5400, unit: 'кг', bgColor: 'bg-red-400' },
        { key: 'weight_paid', label: 'Платный вес', icon: Scale, value: 4500, unit: 'кг', bgColor: 'bg-orange-400' },
        { key: 'weight_free', label: 'Бесплатный вес', icon: Layers, value: 900, unit: 'кг', bgColor: 'bg-purple-400' },
    ],
    volume: [
        { key: 'vol_current', label: 'Объем всего', icon: Maximize, value: 125, unit: 'м³', bgColor: 'bg-pink-400' },
        { key: 'vol_boxes', label: 'Кол-во мест', icon: Layers, value: 125, unit: 'шт', bgColor: 'bg-teal-400' },
    ],
};

// --- УТИЛИТЫ ---

const getDateRange = (filter: DateFilter) => {
    const today = new Date();
    const dateTo = getTodayDate();
    let dateFrom = getTodayDate();

    switch (filter) {
        case 'all': dateFrom = getSixMonthsAgoDate(); break;
        case 'today': dateFrom = getTodayDate(); break;
        case 'week': today.setDate(today.getDate() - 7); dateFrom = today.toISOString().split('T')[0]; break;
        case 'month': today.setMonth(today.getMonth() - 1); dateFrom = today.toISOString().split('T')[0]; break;
        default: break;
    }
    return { dateFrom, dateTo };
}

const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
        if (!isNaN(date.getTime())) return date.toLocaleDateString('ru-RU');
    } catch { }
    return dateString;
};

const formatCurrency = (value: number | string | undefined): string => {
    if (!value) return '-';
    const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    return isNaN(num) ? String(value) : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(num);
};

const getStatusClass = (status: string | undefined) => {
    const lower = (status || '').toLowerCase();
    if (lower.includes('доставлен') || lower.includes('заверш')) return 'status-value success';
    return 'status-value';
};

// ----------------- APP COMPONENT -----------------

export default function App() {
    const [login, setLogin] = useState(DEFAULT_LOGIN); 
    const [password, setPassword] = useState(DEFAULT_PASSWORD); 
    const [agreeOffer, setAgreeOffer] = useState(true);
    const [agreePersonal, setAgreePersonal] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false); 

    const [auth, setAuth] = useState<AuthData | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("cargo");
    const [theme, setTheme] = useState('dark'); 
    
    // Состояния для поиска
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [searchText, setSearchText] = useState('');

    useEffect(() => { document.body.className = `${theme}-mode`; }, [theme]);
    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    
    const handleSearch = (text: string) => setSearchText(text.toLowerCase().trim());

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!login || !password) return setError("Введите логин и пароль");
        if (!agreeOffer || !agreePersonal) return setError("Подтвердите согласие с условиями");

        try {
            setLoading(true);
            const { dateFrom, dateTo } = getDateRange("all");
            
            const res = await fetch(PROXY_API_BASE_URL, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login, password, dateFrom, dateTo }),
            });

            if (!res.ok) {
                let message = `Ошибка авторизации: ${res.status}`;
                try {
                    const errorData = await res.json() as ApiError;
                    if (errorData.error) message = errorData.error;
                } catch { }
                setError(message);
                return;
            }
            setAuth({ login, password });
            setActiveTab("cargo");
        } catch (err: any) {
            setError("Ошибка сети.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setAuth(null); setActiveTab("cargo"); setError(null); setPassword(DEFAULT_PASSWORD); 
        setIsSearchExpanded(false); setSearchText('');
    }

    const injectedStyles = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background-color: var(--color-bg-primary); font-family: 'Inter', sans-serif; transition: background-color 0.3s, color 0.3s; }
        
        /* --- THEME VARIABLES --- */
        :root {
            --color-bg-primary: #1f2937; --color-bg-secondary: #374151; --color-bg-card: #374151; --color-bg-hover: #4b5563; --color-bg-input: #4b5563;
            --color-text-primary: #e5e7eb; --color-text-secondary: #9ca3af; --color-border: #4b5563; --color-primary-blue: #3b82f6;
            --color-tumbler-bg-off: #6b7280; --color-tumbler-bg-on: #3b82f6; --color-tumbler-knob: white;
            --color-error-bg: rgba(185, 28, 28, 0.1); --color-error-border: #b91c1c; --color-error-text: #fca5a5;
            --color-success-status: #34d399; --color-pending-status: #facc15; --color-modal-bg: rgba(31, 41, 55, 0.9);
            --color-filter-bg: var(--color-bg-input); --color-filter-border: var(--color-border); --color-filter-text: var(--color-text-primary);
        }
        .light-mode {
            --color-bg-primary: #f9fafb; --color-bg-secondary: #ffffff; --color-bg-card: #ffffff; --color-bg-hover: #f3f4f6; --color-bg-input: #f3f4f6;
            --color-text-primary: #1f2937; --color-text-secondary: #6b7280; --color-border: #e5e7eb; --color-primary-blue: #2563eb;
            --color-tumbler-bg-off: #ccc; --color-tumbler-bg-on: #2563eb; --color-tumbler-knob: white;
            --color-error-bg: #fee2e2; --color-error-border: #fca5a5; --color-error-text: #b91c1c;
            --color-success-status: #10b981; --color-pending-status: #f59e0b; --color-modal-bg: rgba(249, 250, 251, 0.9);
            --color-filter-bg: #ffffff; --color-filter-border: #e5e7eb; --color-filter-text: #1f2937;
        }

        /* --- STYLES --- */
        .app-container { min-height: 100vh; color: var(--color-text-primary); display: flex; flex-direction: column; }
        .text-theme-secondary { color: var(--color-text-secondary); } .text-theme-primary { color: var(--color-primary-blue); }
        .login-form-wrapper { padding: 2rem 1rem; align-items: center; justify-content: center; }
        .login-card { width: 100%; max-width: 400px; padding: 1.5rem; background-color: var(--color-bg-card); border-radius: 1rem; box-shadow: 0 10px 15px rgba(0,0,0,0.2); position: relative; border: 1px solid var(--color-border); }
        .logo-text { font-size: 2rem; font-weight: 900; letter-spacing: 0.1em; color: var(--color-primary-blue); }
        .tagline { font-size: 1rem; color: var(--color-text-secondary); margin-bottom: 1.5rem; text-align: center; }
        .form .field { margin-bottom: 1rem; }
        .login-input { width: 100%; padding: 0.75rem 1rem; padding-right: 3rem; border-radius: 0.75rem; border: 1px solid var(--color-border); background-color: var(--color-bg-input); color: var(--color-text-primary); outline: none; transition: border-color 0.15s; }
        .login-input:focus { border-color: var(--color-primary-blue); }
        .password-input-container { position: relative; width: 100%; }
        .toggle-password-visibility { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--color-text-secondary); padding: 0; display: flex; align-items: center; justify-content: center; }
        .checkbox-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; color: var(--color-text-secondary); margin-bottom: 0.75rem; }
        .checkbox-row a { color: var(--color-primary-blue); text-decoration: none; }
        .switch-container { width: 40px; height: 22px; background-color: var(--color-tumbler-bg-off); border-radius: 11px; position: relative; cursor: pointer; transition: background-color 0.3s; flex-shrink: 0; }
        .switch-container.checked { background-color: var(--color-tumbler-bg-on); }
        .switch-knob { width: 18px; height: 18px; background-color: var(--color-tumbler-knob); border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: transform 0.3s; }
        .switch-container.checked .switch-knob { transform: translateX(18px); }
        .button-primary { background-color: var(--color-primary-blue); color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600; transition: background-color 0.15s; border: none; cursor: pointer; width: 100%; }
        .theme-toggle-button-login { background: none; border: none; color: var(--color-text-secondary); cursor: pointer; padding: 0; }
        .login-error { padding: 0.75rem; background-color: var(--color-error-bg); border: 1px solid var(--color-error-border); color: var(--color-error-text); font-size: 0.875rem; border-radius: 0.5rem; margin-top: 1rem; display: flex; align-items: center; }
        
        /* Cargo Page */
        .app-header { padding: 0.5rem 1rem; background-color: var(--color-bg-secondary); box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; flex-direction: column; position: sticky; top: 0; z-index: 10; border-bottom: 1px solid var(--color-border); }
        .header-top-row { display: flex; justify-content: space-between; align-items: center; height: 40px; }
        .header-auth-info { display: flex; align-items: center; font-weight: 600; font-size: 0.9rem; color: var(--color-text-primary); }
        .header-auth-info .user-icon { color: var(--color-primary-blue); margin-right: 0.5rem; }
        .app-main { flex-grow: 1; padding: 1.5rem 1rem 5.5rem 1rem; display: flex; justify-content: center; width: 100%; }
        .search-container { display: flex; align-items: center; overflow: hidden; transition: max-width 0.3s; margin: 0.5rem 0; border-radius: 0.5rem; background-color: var(--color-bg-input); }
        .search-container.expanded { max-width: 100%; opacity: 1; height: 40px; padding: 0 0.5rem; }
        .search-container.collapsed { max-width: 0; opacity: 0; height: 0; padding: 0; margin: 0; }
        .search-input { flex-grow: 1; border: none; background: none; outline: none; padding: 0.5rem; color: var(--color-text-primary); font-size: 0.9rem; }
        .search-toggle-button { background: none; border: none; color: var(--color-text-secondary); cursor: pointer; padding: 0.5rem; }
        
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 1.5rem; }
        .stat-card { padding: 1rem; border-radius: 0.75rem; color: white; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); user-select: none; }
        .stat-card:hover { transform: translateY(-2px); opacity: 0.9; }
        .stat-card-primary { min-height: 100px; } .stat-card-secondary { min-height: 80px; }
        
        .cargo-list { display: flex; flex-direction: column; gap: 1rem; }
        .cargo-card { background-color: var(--color-bg-card); border-radius: 0.75rem; border: 1px solid var(--color-border); padding: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-size: 0.875rem; cursor: pointer; }
        .cargo-header-row { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border); }
        .cargo-header-row .order-number { font-size: 1rem; color: var(--color-primary-blue); }
        .cargo-details-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem; }
        .detail-item { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0.5rem 0; border-radius: 0.5rem; background-color: var(--color-bg-hover); }
        .detail-item-label { font-size: 0.65rem; text-transform: uppercase; color: var(--color-text-secondary); font-weight: 600; margin-top: 0.25rem; }
        .detail-item-value { font-size: 0.875rem; font-weight: 700; }
        .status-value { color: var(--color-pending-status); font-size: 0.8rem; } .status-value.success { color: var(--color-success-status); }
        .cargo-footer { display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 1px dashed var(--color-border); }
        .cargo-footer .sum-value { font-size: 1.1rem; font-weight: 900; color: var(--color-primary-blue); }

        /* Modal */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--color-modal-bg); display: flex; justify-content: center; padding-top: 5vh; z-index: 50; overflow-y: auto; }
        .modal-content { background-color: var(--color-bg-card); border-radius: 1rem; padding: 1.5rem; width: 90%; max-width: 500px; border: 1px solid var(--color-border); margin-bottom: 2rem; }
        .modal-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; }
        .modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 700; }
        .modal-close-button { background: none; border: none; color: var(--color-text-secondary); cursor: pointer; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .details-item { padding: 0.75rem 1rem; background-color: var(--color-bg-hover); border-radius: 0.5rem; }
        .details-label { font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase; font-weight: 600; }
        .details-value { font-size: 1rem; font-weight: 700; color: var(--color-text-primary); }
        .highlighted-detail { background-color: var(--color-bg-hover); border: 1px solid var(--color-primary-blue); } /* Highlight style */
        .document-buttons { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.5rem; }
        .doc-button { display: flex; align-items: center; background-color: var(--color-primary-blue); color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; flex-grow: 1; justify-content: center; }
        .doc-button:disabled { opacity: 0.6; background-color: var(--color-bg-hover); color: var(--color-text-secondary); }

        /* Filters */
        .filters-container { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
        .filter-group { position: relative; flex-grow: 1; }
        .filter-button { display: flex; align-items: center; justify-content: space-between; width: 100%; background-color: var(--color-filter-bg); color: var(--color-filter-text); border: 1px solid var(--color-filter-border); padding: 0.75rem 1rem; border-radius: 0.75rem; font-weight: 600; cursor: pointer; font-size: 0.875rem; }
        .filter-dropdown { position: absolute; top: 100%; left: 0; right: 0; background-color: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 0.5rem; margin-top: 0.25rem; z-index: 30; overflow: hidden; }
        .dropdown-item { padding: 0.75rem 1rem; cursor: pointer; font-size: 0.875rem; color: var(--color-text-primary); }
        .dropdown-item:hover { background-color: var(--color-bg-hover); }
        .dropdown-item.selected { background-color: var(--color-primary-blue); color: white; }

        /* TabBar */
        .tabbar-container { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-around; background-color: var(--color-bg-secondary); padding: 0.5rem 0; box-shadow: 0 -4px 6px rgba(0,0,0,0.1); z-index: 20; border-top: 1px solid var(--color-border); height: 60px; }
        .tab-button { display: flex; flex-direction: column; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; padding: 0.25rem; min-width: 60px; flex-grow: 1; }
        .tab-button .tab-icon { color: var(--color-text-secondary); }
        .tab-button.active .tab-icon { color: var(--color-primary-blue); }
        .tab-button .tab-label { font-size: 0.65rem; font-weight: 600; color: var(--color-text-secondary); margin-top: 2px; }
        .tab-button.active .tab-label { color: var(--color-primary-blue); }
        
        /* Tailwind-like colors for stats */
        .bg-indigo-500 { background-color: #6366f1; } .bg-green-500 { background-color: #22c55e; } .bg-yellow-500 { background-color: #eab308; } .bg-pink-500 { background-color: #ec4899; }
        .bg-blue-400 { background-color: #60a5fa; } .bg-indigo-400 { background-color: #818cf8; } .bg-green-400 { background-color: #4ade80; } .bg-red-400 { background-color: #f87171; }
        .bg-orange-400 { background-color: #fb923c; } .bg-purple-400 { background-color: #c084fc; } .bg-teal-400 { background-color: #2dd4bf; } .bg-gray-400 { background-color: #9ca3af; }
    `;

    if (!auth) {
        return (
            <>
            <style>{injectedStyles}</style>
            <div className={`app-container login-form-wrapper`}>
                <div className="login-card">
                    <div className="absolute top-4 right-4">
                        <button className="theme-toggle-button-login" onClick={toggleTheme}>
                            {isThemeLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                        </button>
                    </div>
                    <div className="flex justify-center mb-4 h-10 mt-6"><div className="logo-text">HAULZ</div></div>
                    <div className="tagline">Доставка грузов в Калининград и обратно</div>
                    <form onSubmit={handleSubmit} className="form">
                        <div className="field">
                            <input className="login-input" type="text" placeholder="Логин (email)" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
                        </div>
                        <div className="field">
                            <div className="password-input-container">
                                <input className="login-input" type={showPassword ? "text" : "password"} placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={{paddingRight: '3rem'}} />
                                <button type="button" className="toggle-password-visibility" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <label className="checkbox-row switch-wrapper">
                            <span>Согласие с <a href="#">публичной офертой</a></span>
                            <div className={`switch-container ${agreeOffer ? 'checked' : ''}`} onClick={() => setAgreeOffer(!agreeOffer)}><div className="switch-knob"></div></div>
                        </label>
                        <label className="checkbox-row switch-wrapper">
                            <span>Согласие на <a href="#">обработку данных</a></span>
                            <div className={`switch-container ${agreePersonal ? 'checked' : ''}`} onClick={() => setAgreePersonal(!agreePersonal)}><div className="switch-knob"></div></div>
                        </label>
                        <button className="button-primary mt-4 flex justify-center items-center" type="submit" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Подтвердить"}
                        </button>
                    </form>
                    {error && <p className="login-error mt-4"><AlertTriangle className="w-5 h-5 mr-2" />{error}</p>}
                </div>
            </div>
            </>
        );
    }

    return (
        <div className={`app-container`}>
            <style>{injectedStyles}</style>
            <header className="app-header">
                <div className="header-top-row">
                    <div className="header-auth-info"><UserIcon className="w-4 h-4 user-icon" /><span>{auth.login}</span></div>
                    <div className="flex items-center space-x-3">
                        <button className="search-toggle-button" onClick={() => { setIsSearchExpanded(!isSearchExpanded); if(isSearchExpanded) { handleSearch(''); setSearchText(''); } }}>
                            {isSearchExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                <div className={`search-container ${isSearchExpanded ? 'expanded' : 'collapsed'}`}>
                    <Search className="w-5 h-5 text-theme-secondary flex-shrink-0 ml-1" />
                    <input type="search" placeholder="Поиск..." className="search-input" value={searchText} onChange={(e) => { setSearchText(e.target.value); handleSearch(e.target.value); }} />
                    {searchText && <button className="search-toggle-button" onClick={() => { setSearchText(''); handleSearch(''); }}><X className="w-4 h-4" /></button>}
                </div>
            </header>
            <div className="app-main">
                <div className="w-full max-w-4xl">
                    {activeTab === "cargo" && <CargoPage auth={auth} searchText={searchText} />}
                    {activeTab === "home" && <StubPage title="Главная" />}
                    {activeTab === "docs" && <StubPage title="Документы" />}
                    {activeTab === "support" && <StubPage title="Поддержка" />}
                    {activeTab === "profile" && <StubPage title="Профиль" />}
                </div>
            </div>
            <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
    );
}

// --- CARGO PAGE COMPONENTS ---

function FilterDialog({ isOpen, onClose, dateFrom, dateTo, onApply }: { isOpen: boolean; onClose: () => void; dateFrom: string; dateTo: string; onApply: (from: string, to: string) => void; }) {
    const [tempFrom, setTempFrom] = useState(dateFrom);
    const [tempTo, setTempTo] = useState(dateTo);
    useEffect(() => { if (isOpen) { setTempFrom(dateFrom); setTempTo(dateTo); } }, [isOpen, dateFrom, dateTo]);
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h3>Произвольный диапазон</h3><button className="modal-close-button" onClick={onClose}><X /></button></div>
                <form onSubmit={e => { e.preventDefault(); onApply(tempFrom, tempTo); onClose(); }}>
                    <div className="modal-form-group"><label>Дата начала:</label><input type="date" className="login-input" value={tempFrom} onChange={e => setTempFrom(e.target.value)} required /></div>
                    <div className="modal-form-group"><label>Дата окончания:</label><input type="date" className="login-input" value={tempTo} onChange={e => setTempTo(e.target.value)} required /></div>
                    <div className="modal-button-container"><button className="button-primary" type="submit">Применить</button></div>
                </form>
            </div>
        </div>
    );
}

function CargoDetailsModal({ item, isOpen, onClose, auth }: { item: CargoItem, isOpen: boolean, onClose: () => void, auth: AuthData }) {
    const [downloading, setDownloading] = useState<string | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    if (!isOpen) return null;

    const renderValue = (val: any, unit = '') => (val === undefined || val === null || val === "") ? '-' : `${val}${unit ? ' ' + unit : ''}`;
    
    const handleDownload = async (docType: string) => {
        if (!item.Number) return alert("Нет номера перевозки");
        setDownloading(docType); setDownloadError(null);
        try {
            const res = await fetch(PROXY_API_DOWNLOAD_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login: auth.login, password: auth.password, metod: docType, number: item.Number }) });
            if (!res.ok) throw new Error(`Ошибка: ${res.status}`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `${docType}_${item.Number}.pdf`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } catch (e: any) { setDownloadError(e.message); } finally { setDownloading(null); }
    };

    const handleChat = () => { window.open('https://t.me/haulz_support', '_blank'); };
    const handleShare = () => { 
        const text = `Перевозка №${item.Number}: ${item.State}, ${formatCurrency(item.Sum)}`;
        if ((window as any).Telegram?.WebApp?.shareUrl) { (window as any).Telegram.WebApp.shareUrl(window.location.origin, { text }); }
        else { navigator.clipboard.writeText(text); alert('Скопировано: ' + text); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h3>Перевозка №{item.Number}</h3><button className="modal-close-button" onClick={onClose}><X /></button></div>
                {downloadError && <p className="login-error">{downloadError}</p>}
                <div className="document-buttons mb-4">
                    <button className="doc-button" onClick={handleChat}><MessageCircle className="w-4 h-4 mr-2"/>Чат</button>
                    <button className="doc-button" onClick={handleShare}><Send className="w-4 h-4 mr-2"/>Поделиться</button>
                </div>
                <div className="details-grid">
                    <div className="details-item"><div className="details-label">Номер</div><div className="details-value">{item.Number}</div></div>
                    <div className="details-item"><div className="details-label">Статус</div><div className={getStatusClass(item.State)}>{item.State}</div></div>
                    <div className="details-item"><div className="details-label">Приход</div><div className="details-value">{formatDate(item.DatePrih)}</div></div>
                    <div className="details-item"><div className="details-label">Вручение</div><div className="details-value">{formatDate(item.DateVruch)}</div></div>
                    <div className="details-item"><div className="details-label">Мест</div><div className="details-value flex items-center"><Layers className="w-4 h-4 mr-1 text-theme-primary"/>{renderValue(item.Mest)}</div></div>
                    <div className="details-item highlighted-detail"><div className="details-label">Плат. вес</div><div className="details-value flex items-center"><Scale className="w-4 h-4 mr-1 text-theme-primary"/>{renderValue(item.PV, 'кг')}</div></div>
                    <div className="details-item"><div className="details-label">Вес</div><div className="details-value flex items-center"><Weight className="w-4 h-4 mr-1 text-theme-primary"/>{renderValue(item.Weight, 'кг')}</div></div>
                    <div className="details-item"><div className="details-label">Объем</div><div className="details-value flex items-center"><List className="w-4 h-4 mr-1 text-theme-primary"/>{renderValue(item.Volume, 'м³')}</div></div>
                    <div className="details-item"><div className="details-label">Стоимость</div><div className="details-value flex items-center"><RussianRuble className="w-4 h-4 mr-1 text-theme-primary"/>{formatCurrency(item.Sum)}</div></div>
                    <div className="details-item highlighted-detail"><div className="details-label">Счет</div><div className="details-value">{item.StatusSchet || '-'}</div></div>
                </div>
                <h4>Документы</h4>
                <div className="document-buttons">
                    {['ЭР', 'АПП', 'СЧЕТ', 'УПД'].map(doc => (
                        <button key={doc} className="doc-button" onClick={() => handleDownload(doc)} disabled={downloading === doc}>
                            {downloading === doc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {doc}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function CargoPage({ auth, searchText }: { auth: AuthData, searchText: string }) {
    const [items, setItems] = useState<CargoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterLevel, setFilterLevel] = useState<1 | 2>(1);
    const [currentFilter, setCurrentFilter] = useState<string | null>(null);
    const [selectedCargo, setSelectedCargo] = useState<CargoItem | null>(null);
    
    const [dateFilter, setDateFilter] = useState<DateFilter>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [customDateFrom, setCustomDateFrom] = useState(DEFAULT_DATE_FROM);
    const [customDateTo, setCustomDateTo] = useState(DEFAULT_DATE_TO);
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    const apiDateRange = useMemo(() => dateFilter === "custom" ? { dateFrom: customDateFrom, dateTo: customDateTo } : getDateRange(dateFilter), [dateFilter, customDateFrom, customDateTo]);

    const loadCargo = useCallback(async (dateFrom: string, dateTo: string) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(PROXY_API_BASE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login: auth.login, password: auth.password, dateFrom, dateTo }) });
            if (!res.ok) throw new Error(`Ошибка: ${res.status}`);
            const data = await res.json();
            setItems((Array.isArray(data) ? data : data.items || []).map((item: any) => ({
                Number: item.Number, DatePrih: item.DatePrih, State: item.State, Mest: item.Mest, PV: item.PV || item.PaymentWeight, Weight: item.Weight, Volume: item.Volume, Sum: item.Sum, StatusSchet: item.StatusSchet, ...item
            })));
        } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    }, [auth]);

    useEffect(() => { loadCargo(apiDateRange.dateFrom, apiDateRange.dateTo); }, [apiDateRange, loadCargo]);

    const currentStats = useMemo(() => (filterLevel === 2 && currentFilter && STATS_LEVEL_2[currentFilter]) ? STATS_LEVEL_2[currentFilter] : STATS_LEVEL_1, [filterLevel, currentFilter]);
    
    const handleStatClick = (key: string) => {
        if (filterLevel === 1 && STATS_LEVEL_2[key]) { setCurrentFilter(key); setFilterLevel(2); }
        else if (filterLevel === 2) { setCurrentFilter(null); setFilterLevel(1); }
    };

    const filteredItems = useMemo(() => {
        let res = items;
        if (statusFilter !== 'all') res = res.filter(i => getFilterKeyByStatus(i.State) === statusFilter);
        if (searchText) {
            const lower = searchText.toLowerCase();
            res = res.filter(i => [i.Number, i.State, formatDate(i.DatePrih), formatCurrency(i.Sum)].join(' ').toLowerCase().includes(lower));
        }
        return res;
    }, [items, statusFilter, searchText]);

    return (
        <div className="w-full">
            <h2 className="title text-theme-text">Грузы</h2>
            <div className="filters-container">
                <div className="filter-group">
                    <button className="filter-button" onClick={() => { setIsDateDropdownOpen(!isDateDropdownOpen); setIsStatusDropdownOpen(false); }}>
                        Дата: {dateFilter} <ChevronDown className="w-4 h-4"/>
                    </button>
                    {isDateDropdownOpen && <div className="filter-dropdown">
                        {['all', 'today', 'week', 'month', 'custom'].map(key => <div key={key} className="dropdown-item" onClick={() => { setDateFilter(key as any); setIsDateDropdownOpen(false); if(key==='custom') setIsCustomModalOpen(true); }}>{key}</div>)}
                    </div>}
                </div>
                <div className="filter-group">
                    <button className="filter-button" onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); setIsDateDropdownOpen(false); }}>
                        Статус: {statusFilter} <ChevronDown className="w-4 h-4"/>
                    </button>
                    {isStatusDropdownOpen && <div className="filter-dropdown">
                        {Object.keys(STATUS_MAP).map(key => <div key={key} className="dropdown-item" onClick={() => { setStatusFilter(key as any); setIsStatusDropdownOpen(false); }}>{STATUS_MAP[key as StatusFilter]}</div>)}
                    </div>}
                </div>
            </div>

            <div className="stats-grid">
                {currentStats.map((stat, idx) => (
                    <div key={stat.key} className={`stat-card ${stat.bgColor}`} onClick={() => handleStatClick(stat.key)}>
                        <div className="flex justify-between mb-1"><span className="text-xs opacity-80">{stat.label}</span>{filterLevel === 2 && idx === 0 && <CornerUpLeft className="w-4 h-4 opacity-90" />}</div>
                        <div className="flex justify-between items-end"><span className="text-xl font-bold">{stat.value} <span className="text-xs font-normal">{stat.unit}</span></span><stat.icon className="w-5 h-5 opacity-80" /></div>
                    </div>
                ))}
            </div>

            {loading && <div className="text-center py-8"><Loader2 className="animate-spin w-6 h-6 mx-auto" /></div>}
            {!loading && filteredItems.map(item => (
                <div key={item.Number} className="cargo-card mb-4" onClick={() => setSelectedCargo(item)}>
                    <div className="cargo-header-row"><span className="order-number">№ {item.Number}</span><span className="date"><Calendar className="w-3 h-3 mr-1"/>{formatDate(item.DatePrih)}</span></div>
                    <div className="cargo-details-grid">
                        <div className="detail-item"><Tag className="w-4 h-4 text-theme-primary"/><div className="detail-item-label">Статус</div><div className={getStatusClass(item.State)}>{item.State}</div></div>
                        <div className="detail-item"><Layers className="w-4 h-4 text-theme-primary"/><div className="detail-item-label">Мест</div><div className="detail-item-value">{item.Mest}</div></div>
                        <div className="detail-item"><Scale className="w-4 h-4 text-theme-primary"/><div className="detail-item-label">Плат. вес</div><div className="detail-item-value">{item.PV}</div></div>
                    </div>
                    <div className="cargo-footer"><span className="sum-label">Сумма</span><span className="sum-value">{formatCurrency(item.Sum)}</span></div>
                </div>
            ))}
            {selectedCargo && <CargoDetailsModal item={selectedCargo} isOpen={!!selectedCargo} onClose={() => setSelectedCargo(null)} auth={auth} />}
            <FilterDialog isOpen={isCustomModalOpen} onClose={() => setIsCustomModalOpen(false)} dateFrom={customDateFrom} dateTo={customDateTo} onApply={(f, t) => { setCustomDateFrom(f); setCustomDateTo(t); }} />
        </div>
    );
}

function StubPage({ title }: { title: string }) { return <div className="w-full p-8 text-center"><h2 className="title">{title}</h2><p className="subtitle">Раздел в разработке</p></div>; }

// --- MAPS & HELPERS ---
const STATUS_MAP: Record<StatusFilter, string> = { "all": "Все", "accepted": "Принят", "in_transit": "В пути", "ready": "Готов", "delivering": "На доставке", "delivered": "Доставлено" };
const getFilterKeyByStatus = (s: string | undefined): StatusFilter => { if (!s) return 'all'; const l = s.toLowerCase(); if (l.includes('доставлен')) return 'delivered'; return 'all'; } // Simplified logic
