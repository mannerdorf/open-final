import { FormEvent, useEffect, useState, useCallback, useMemo } from "react";
// Импортируем все необходимые иконки
import { 
    LogOut, Home, Truck, FileText, MessageCircle, User, Loader2, Check, X, Moon, Sun, Eye, EyeOff, AlertTriangle, Package, Calendar, Tag, Layers, Weight, Filter, Search, ChevronDown, User as UserIcon, Scale, DollarSign, List, Download, FileText as FileTextIcon, Send, 
    RussianRuble, LayoutGrid, Maximize, TrendingUp, CornerUpLeft, ClipboardCheck, CreditCard, Minus 
} from 'lucide-react';
import React from "react";
import "./styles.css";

// --- CONFIGURATION ---
const PROXY_API_BASE_URL = '/api/perevozki'; 
const PROXY_API_DOWNLOAD_URL = '/api/download'; 

// --- TYPES ---
type ApiError = { error?: string; [key: string]: unknown; };
type AuthData = { login: string; password: string; };
type Tab = "home" | "cargo" | "docs" | "support" | "profile";
type DateFilter = "all" | "today" | "week" | "month" | "custom";
type StatusFilter = "all" | "accepted" | "in_transit" | "ready" | "delivering" | "delivered";

type CargoItem = {
    Number?: string; DatePrih?: string; DateVruch?: string; State?: string; Mest?: number | string; 
    PV?: number | string; Weight?: number | string; Volume?: number | string; Sum?: number | string; 
    StatusSchet?: string; [key: string]: any; // Для всех остальных полей
};

type CargoStat = {
    key: string; label: string; icon: React.ElementType; value: number | string; unit: string; bgColor: string;
};

// --- CONSTANTS ---
const getTodayDate = () => new Date().toISOString().split('T')[0];
const getSixMonthsAgoDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6); 
    return d.toISOString().split('T')[0];
};
const DEFAULT_DATE_FROM = getSixMonthsAgoDate();
const DEFAULT_DATE_TO = getTodayDate();

// Статистика (заглушка)
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


// --- HELPERS ---
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
    return isNaN(num) ? String(value) : new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 2 }).format(num);
};

const getStatusClass = (status: string | undefined) => {
    const lower = (status || '').toLowerCase();
    if (lower.includes('доставлен') || lower.includes('заверш')) return 'status-value success';
    if (lower.includes('пути') || lower.includes('отправлен')) return 'status-value transit';
    if (lower.includes('принят') || lower.includes('оформлен')) return 'status-value accepted';
    if (lower.includes('готов')) return 'status-value ready';
    return 'status-value';
};

const getFilterKeyByStatus = (s: string | undefined): StatusFilter => { 
    if (!s) return 'all'; 
    const l = s.toLowerCase(); 
    if (l.includes('доставлен') || l.includes('заверш')) return 'delivered'; 
    if (l.includes('пути') || l.includes('отправлен')) return 'in_transit';
    if (l.includes('принят') || l.includes('оформлен')) return 'accepted';
    if (l.includes('готов')) return 'ready';
    if (l.includes('доставке')) return 'delivering';
    return 'all'; 
}

const STATUS_MAP: Record<StatusFilter, string> = { "all": "Все", "accepted": "Принят", "in_transit": "В пути", "ready": "Готов", "delivering": "На доставке", "delivered": "Доставлено" };


// --- MAIN COMPONENT ---
export default function App() {
    const [auth, setAuth] = useState<AuthData | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("cargo"); 
    const [theme, setTheme] = useState('dark'); 
    
    // ИНИЦИАЛИЗАЦИЯ ПУСТЫМИ СТРОКАМИ (данные берутся с фронта)
    const [login, setLogin] = useState(""); 
    const [password, setPassword] = useState(""); 
    
    const [agreeOffer, setAgreeOffer] = useState(true);
    const [agreePersonal, setAgreePersonal] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false); 
    
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [searchText, setSearchText] = useState('');

    useEffect(() => { document.body.className = `${theme}-mode`; }, [theme]);
    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    const handleSearch = (text: string) => setSearchText(text.toLowerCase().trim());

    const handleLoginSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!login || !password) return setError("Введите логин и пароль");
        if (!agreeOffer || !agreePersonal) return setError("Подтвердите согласие с условиями");

        try {
            setLoading(true);
            const { dateFrom, dateTo } = getDateRange("all");
            // Проверяем авторизацию тестовым запросом
            const res = await fetch(PROXY_API_BASE_URL, {
                method: "POST", 
                headers: { "Content-Type": "application/json" },
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
        setAuth(null);
        setActiveTab("cargo");
        setPassword(""); 
        setIsSearchExpanded(false); setSearchText('');
    }

    if (!auth) {
        return (
            <div className={`app-container login-form-wrapper`}>
                <div className="login-card">
                    <div className="absolute top-4 right-4">
                        <button className="theme-toggle-button-login" onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="flex justify-center mb-4 h-10 mt-6"><div className="logo-text">HAULZ</div></div>
                    <div className="tagline">Доставка грузов в Калининград и обратно</div>
                    <form onSubmit={handleLoginSubmit} className="form">
                        <div className="field">
                            <input className="login-input" type="text" placeholder="Логин (email)" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
                        </div>
                        <div className="field">
                            <div className="password-input-container">
                                <input className="login-input password" type={showPassword ? "text" : "password"} placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={{paddingRight: '3rem'}} />
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
                        <button className="button-primary" type="submit" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Подтвердить"}
                        </button>
                    </form>
                    {error && <p className="login-error mt-4"><AlertTriangle className="w-5 h-5 mr-2" />{error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className={`app-container`}>
            <header className="app-header">
                <div className="header-top-row">
                    <div className="header-auth-info"><UserIcon className="w-4 h-4 mr-2" /><span>{auth.login}</span></div>
                    <div className="flex items-center space-x-3">
                        <button className="search-toggle-button" onClick={() => { setIsSearchExpanded(!isSearchExpanded); if(isSearchExpanded) { handleSearch(''); setSearchText(''); } }}>
                            {isSearchExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                        </button>
                        {/* Добавим кнопку выхода, чтобы не приходилось перезагружать */}
                        <button className="search-toggle-button" onClick={handleLogout} title="Выход">
                            <LogOut className="w-5 h-5" />
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
                    {activeTab === "home" && <HomePage cargoList={null} isLoading={false} error={null} auth={auth} fetchList={() => {}} />}
                    {activeTab === "cargo" && <CargoPage auth={auth} searchText={searchText} />}
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
// (HomePage, FilterDialog, StubPage, TabBar, TabBtn - без изменений)
// ... (опущены для краткости, они были в предыдущем ответе) ...

function FilterDialog({ isOpen, onClose, dateFrom, dateTo, onApply }: { isOpen: boolean; onClose: () => void; dateFrom: string; dateTo: string; onApply: (from: string, to: string) => void; }) {
    const [tempFrom, setTempFrom] = useState(dateFrom);
    const [tempTo, setTempTo] = useState(dateTo);
    useEffect(() => { if (isOpen) { setTempFrom(dateFrom); setTempTo(dateTo); } }, [isOpen, dateFrom, dateTo]);
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h3>Произвольный диапазон</h3><button className="modal-close-button" onClick={onClose}><X size={20} /></button></div>
                <form onSubmit={e => { e.preventDefault(); onApply(tempFrom, tempTo); onClose(); }}>
                    <div style={{marginBottom: '1rem'}}><label className="detail-item-label">Дата начала:</label><input type="date" className="login-input date-input" value={tempFrom} onChange={e => setTempFrom(e.target.value)} required /></div>
                    <div style={{marginBottom: '1.5rem'}}><label className="detail-item-label">Дата окончания:</label><input type="date" className="login-input date-input" value={tempTo} onChange={e => setTempTo(e.target.value)} required /></div>
                    <button className="button-primary" type="submit">Применить</button>
                </form>
            </div>
        </div>
    );
}

function CargoDetailsModal({ item, isOpen, onClose, auth }: { item: CargoItem, isOpen: boolean, onClose: () => void, auth: AuthData }) {
    const [downloading, setDownloading] = useState<string | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    if (!isOpen) return null;

    // ОБНОВЛЕНО: Улучшенная функция для отображения любых типов данных, включая объекты
    const renderValue = (val: any, unit = '') => {
        if (val === undefined || val === null || val === "") return '-';
        
        // Обработка сложных объектов/массивов
        if (typeof val === 'object' && val !== null && !React.isValidElement(val)) {
            try {
                // Если это пустой объект/массив, показываем "-"
                if (Object.keys(val).length === 0) return '-';
                // Форматируем JSON для отображения, если это объект
                return <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.75rem', margin: 0}}>{JSON.stringify(val, null, 2)}</pre>;
            } catch (e) {
                return String(val); 
            }
        }
        
        const num = typeof val === 'string' ? parseFloat(val) : val;
        // Форматирование чисел
        if (typeof num === 'number' && !isNaN(num)) {
            if (unit.toLowerCase() === 'кг' || unit.toLowerCase() === 'м³') {
                 // Округляем до двух знаков для кг и м³
                return `${num.toFixed(2)}${unit ? ' ' + unit : ''}`;
            }
        }
        
        return `${val}${unit ? ' ' + unit : ''}`;
    };
    
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

    // Список явно отображаемых полей (для исключения из общего списка)
    const EXCLUDED_KEYS = ['Number', 'DatePrih', 'DateVruch', 'State', 'Mest', 'PV', 'Weight', 'Volume', 'Sum', 'StatusSchet', 'PaymentWeight', 'PW'];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Перевозка №{item.Number}</h3>
                    <button className="modal-close-button" onClick={onClose}><X size={20} /></button>
                </div>
                {downloadError && <p className="login-error mb-2">{downloadError}</p>}
                <div className="document-buttons mb-4">
                    <button className="doc-button" onClick={handleChat}><MessageCircle className="w-4 h-4 mr-2"/>Чат</button>
                    <button className="doc-button" onClick={handleShare}><Send className="w-4 h-4 mr-2"/>Поделиться</button>
                </div>
                <div className="details-grid-modal">
                    {/* Явно отображаемые поля */}
                    <DetailItem label="Номер" value={item.Number} />
                    <DetailItem label="Статус" value={item.State} statusClass={getStatusClass(item.State)} />
                    <DetailItem label="Приход" value={formatDate(item.DatePrih)} />
                    <DetailItem label="Вручение" value={formatDate(item.DateVruch)} />
                    <DetailItem label="Мест" value={renderValue(item.Mest)} icon={<Layers className="w-4 h-4 mr-1 text-theme-primary"/>} />
                    <DetailItem label="Плат. вес" value={renderValue(item.PV, 'кг')} icon={<Scale className="w-4 h-4 mr-1 text-theme-primary"/>} highlighted />
                    <DetailItem label="Вес" value={renderValue(item.Weight, 'кг')} icon={<Weight className="w-4 h-4 mr-1 text-theme-primary"/>} />
                    <DetailItem label="Объем" value={renderValue(item.Volume, 'м³')} icon={<List className="w-4 h-4 mr-1 text-theme-primary"/>} />
                    <DetailItem label="Стоимость" value={formatCurrency(item.Sum)} icon={<RussianRuble className="w-4 h-4 mr-1 text-theme-primary"/>} />
                    <DetailItem label="Счет" value={item.StatusSchet || '-'} highlighted />
                </div>
                
                {/* ДОПОЛНИТЕЛЬНЫЕ поля из API */}
                <h4 style={{marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600}}>Прочие данные из API</h4>
                <div className="details-grid-modal">
                    {Object.entries(item)
                        .filter(([key]) => !EXCLUDED_KEYS.includes(key))
                        .map(([key, val]) => {
                            if (val === undefined || val === null || val === "" || (typeof val === 'object' && Object.keys(val).length === 0)) return null; // Скрываем пустые доп. поля
                            return <DetailItem key={key} label={key} value={renderValue(val)} />;
                        })}
                </div>
                
                <h4 style={{marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600}}>Документы</h4>
                <div className="document-buttons">
                    {['ЭР', 'АПП', 'СЧЕТ', 'УПД'].map(doc => (
                        <button key={doc} className="doc-button" onClick={() => handleDownload(doc)} disabled={downloading === doc}>
                            {downloading === doc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} {doc}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ... (оставшаяся часть App.tsx) ...
