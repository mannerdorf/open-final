import { FormEvent, useEffect, useState, useCallback, useMemo } from "react";
// Импортируем все необходимые иконки
import { 
    LogOut, Home, Truck, FileText, MessageCircle, User, Loader2, Check, X, Moon, Sun, Eye, EyeOff, AlertTriangle, Package, Calendar, Tag, Layers, Weight, Filter, Search, ChevronDown, User as UserIcon, Scale, RussianRuble, List, Download, FileText as FileTextIcon, Send, 
    LayoutGrid, Maximize, TrendingUp, CornerUpLeft, ClipboardCheck, CreditCard, Minus 
} from 'lucide-react';
import React from "react";
import "./styles.css";
// --- TELEGRAM MINI APP SUPPORT ---
import WebApp from "@twa-dev/sdk";

const isTg = () => typeof window !== "undefined" && window.Telegram?.WebApp;

// --- TELEGRAM STORAGE HELPERS (НОВЫЙ БЛОК ДЛЯ АВТОРИЗАЦИИ) ---
const AUTH_STORAGE_KEY = "authData";

const loadAuth = (): AuthData | null => {
    if (isTg()) {
        // Получаем данные из хранилища Telegram
        const stored = WebApp.Storage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Error parsing stored auth data:", e);
                return null;
            }
        }
    }
    return null;
};

const saveAuth = (authData: AuthData) => {
    if (isTg()) {
        try {
            // Сохраняем данные в хранилище Telegram
            WebApp.Storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        } catch (e) {
            console.error("Error saving auth data:", e);
        }
    }
};

const clearAuth = () => {
    if (isTg()) {
        // Удаляем данные из хранилища Telegram
        WebApp.Storage.removeItem(AUTH_STORAGE_KEY);
    }
};
// --- КОНЕЦ TELEGRAM STORAGE HELPERS ---


import { DOCUMENT_METHODS } from "./documentMethods";


// --- CONFIGURATION ---
const PROXY_API_BASE_URL = '/api/perevozki'; 
const PROXY_API_DOWNLOAD_URL = '/api/download'; 

// --- TYPES ---
type ApiError = { error?: string; [key: string]: unknown; };
type AuthData = { login: string; password: string; };
type Tab = "home" | "cargo" | "docs" | "support" | "profile";
type DateFilter = "все" | "сегодня" | "неделя" | "месяц" | "период";
type StatusFilter = "all" | "accepted" | "in_transit" | "ready" | "delivering" | "delivered";

// --- ИСПОЛЬЗУЕМ ТОЛЬКО ПЕРЕМЕННЫЕ ИЗ API ---
type CargoItem = {
    Number?: string; DatePrih?: string; DateVr?: string; State?: string; Mest?: number | string; 
    PW?: number | string; W?: number | string; Value?: number | string; Sum?: number | string; 
    StateBill?: string; Sender?: string; [key: string]: any; // Для всех остальных полей
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
        // Убеждаемся, что строка - это только дата (без времени) для корректного парсинга
        const cleanDateString = dateString.split('T')[0]; 
        const date = new Date(cleanDateString);
        if (!isNaN(date.getTime())) return date.toLocaleDateString('ru-RU');
    } catch { }
    return dateString;
};

const formatCurrency = (value: number | string | undefined): string => {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === "")) return '-';
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


// ================== COMPONENTS ==================

// --- HOME PAGE (STATISTICS) ---
function HomePage({ cargoList, isLoading, error }: { cargoList: CargoItem[] | null, isLoading: boolean, error: string | null }) { // Убраны лишние пропсы auth, fetchList
    const [filterLevel, setFilterLevel] = useState<1 | 2>(1);
    const [currentFilter, setCurrentFilter] = useState<string | null>(null);

    const statsData = useMemo(() => {
        // Здесь должна быть логика расчета, пока используем заглушки
        return { level1: STATS_LEVEL_1, level2: STATS_LEVEL_2 };
    }, [cargoList]);

    const currentStats = useMemo(() => {
        if (filterLevel === 2 && currentFilter && STATS_LEVEL_2[currentFilter]) {
            return STATS_LEVEL_2[currentFilter];
        }
        return STATS_LEVEL_1;
    }, [filterLevel, currentFilter]);
    
    const handleStatClick = (key: string) => {
        if (filterLevel === 1 && STATS_LEVEL_2[key]) { setCurrentFilter(key); setFilterLevel(2); }
        else if (filterLevel === 2) { setCurrentFilter(null); setFilterLevel(1); }
    };

    return (
        <div className="w-full max-w-lg">
            <h2 className="title text-center mb-6">Статистика перевозок</h2>
            <div className="stats-grid">
                {currentStats.map((stat, idx) => (
                    <div key={stat.key} className={`stat-card ${stat.bgColor}`} onClick={() => handleStatClick(stat.key)}>
                        <div className="flex justify-between mb-1">
                            <span className="text-xs opacity-80">{stat.label}</span>
                            {filterLevel === 2 && idx === 0 && <CornerUpLeft className="w-4 h-4 opacity-90" />}
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-xl font-bold">{stat.value} <span className="text-xs font-normal">{stat.unit}</span></span>
                            <stat.icon className="w-5 h-5 opacity-80" />
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Состояние загрузки для главной */}
            {isLoading && <div className="text-center py-8"><Loader2 className="animate-spin w-6 h-6 mx-auto text-theme-primary" /><p className="text-sm text-theme-secondary">Обновление данных...</p></div>}
            {error && <div className="login-error"><AlertTriangle className="w-5 h-5 mr-2"/>{error}</div>}
        </div>
    );
}


// --- CARGO PAGE (LIST ONLY) ---
function CargoPage({ auth, searchText }: { auth: AuthData, searchText: string }) {
    const [items, setItems] = useState<CargoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCargo, setSelectedCargo] = useState<CargoItem | null>(null);
    
    // Filters State
    const [dateFilter, setDateFilter] = useState<DateFilter>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [customDateFrom, setCustomDateFrom] = useState(DEFAULT_DATE_FROM);
    const [customDateTo, setCustomDateTo] = useState(DEFAULT_DATE_TO);
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    const apiDateRange = useMemo(() => dateFilter === "custom" ? { dateFrom: customDateFrom, dateTo: customDateTo } : getDateRange(dateFilter), [dateFilter, customDateFrom, customDateTo]);

    // Удалена функция findDeliveryDate, используем DateVr напрямую.

    const loadCargo = useCallback(async (dateFrom: string, dateTo: string) => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(PROXY_API_BASE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ login: auth.login, password: auth.password, dateFrom, dateTo }) });
            if (!res.ok) throw new Error(`Ошибка: ${res.status}`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : data.items || [];
            
            // МАППИНГ ДАННЫХ: используем только указанные поля API
            setItems(list.map((item: any) => ({
                ...item,
                Number: item.Number, 
                DatePrih: item.DatePrih, 
                DateVr: item.DateVr, // Дата доставки
                State: item.State, 
                Mest: item.Mest, 
                PW: item.PW, // Платный вес
                W: item.W, // Общий вес
                Value: item.Value, // Объем
                Sum: item.Sum, 
                StateBill: item.StateBill, // Статус счета
                Sender: item.Sender, // Отправитель
            })));
        } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    }, [auth]);

    useEffect(() => { loadCargo(apiDateRange.dateFrom, apiDateRange.dateTo); }, [apiDateRange, loadCargo]);

    // Client-side filtering
    const filteredItems = useMemo(() => {
        let res = items;
        if (statusFilter !== 'all') res = res.filter(i => getFilterKeyByStatus(i.State) === statusFilter);
        if (searchText) {
            const lower = searchText.toLowerCase();
            // Обновлены поля поиска: PW вместо PV, добавлен Sender
            res = res.filter(i => [i.Number, i.State, i.Sender, formatDate(i.DatePrih), formatCurrency(i.Sum), String(i.PW), String(i.Mest)].join(' ').toLowerCase().includes(lower));
        }
        return res;
    }, [items, statusFilter, searchText]);


    return (
        <div className="w-full">
            {/* Filters */}
            <div className="filters-container">
                <div className="filter-group">
                    <button className="filter-button" onClick={() => { setIsDateDropdownOpen(!isDateDropdownOpen); setIsStatusDropdownOpen(false); }}>
                        Дата: {dateFilter === 'custom' ? 'Период' : dateFilter} <ChevronDown className="w-4 h-4"/>
                    </button>
                    {isDateDropdownOpen && <div className="filter-dropdown">
                        {['all', 'today', 'week', 'month', 'custom'].map(key => <div key={key} className="dropdown-item" onClick={() => { setDateFilter(key as any); setIsDateDropdownOpen(false); if(key==='custom') setIsCustomModalOpen(true); }}>{key === 'all' ? 'Все' : key === 'today' ? 'Сегодня' : key === 'week' ? 'Неделя' : key === 'month' ? 'Месяц' : 'Период'}</div>)}
                    </div>}
                </div>
                <div className="filter-group">
                    <button className="filter-button" onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); setIsDateDropdownOpen(false); }}>
                        Статус: {STATUS_MAP[statusFilter]} <ChevronDown className="w-4 h-4"/>
                    </button>
                    {isStatusDropdownOpen && <div className="filter-dropdown">
                        {Object.keys(STATUS_MAP).map(key => <div key={key} className="dropdown-item" onClick={() => { setStatusFilter(key as any); setIsStatusDropdownOpen(false); }}>{STATUS_MAP[key as StatusFilter]}</div>)}
                    </div>}
                </div>
            </div>

            <p className="text-sm text-theme-secondary mb-4 text-center">
                 Период: {formatDate(apiDateRange.dateFrom)} – {formatDate(apiDateRange.dateTo)}
            </p>

            {/* List */}
            {loading && <div className="text-center py-8"><Loader2 className="animate-spin w-6 h-6 mx-auto text-theme-primary" /></div>}
            {!loading && !error && filteredItems.length === 0 && (
                <div className="empty-state-card">
                    <Package className="w-12 h-12 mx-auto mb-4 text-theme-secondary opacity-50" />
                    <p className="text-theme-secondary">Ничего не найдено</p>
                </div>
            )}
            
            <div className="cargo-list">
                {filteredItems.map((item: CargoItem, idx: number) => (
                    <div key={item.Number || idx} className="cargo-card mb-4" onClick={() => setSelectedCargo(item)}>
                        <div className="cargo-header-row"><span className="order-number">{item.Number}</span><span className="date"><Calendar className="w-3 h-3 mr-1"/>{formatDate(item.DatePrih)}</span></div>
                        <div className="cargo-details-grid">
                            <div className="detail-item"><Tag className="w-4 h-4 text-theme-primary"/><div className="detail-item-label">Статус</div><div className={getStatusClass(item.State)}>{item.State}</div></div>
                            <div className="detail-item"><Layers className="w-4 h-4 text-theme-primary"/><div className="detail-item-label">Мест</div><div className="detail-item-value">{item.Mest || '-'}</div></div>
                            <div className="detail-item"><Scale className="w-4 h-4 text-theme-primary"/><div className="detail-item-label">Плат. вес</div><div className="detail-item-value">{item.PW || '-'}</div></div>
                        </div>
                        <div className="cargo-footer"><span className="sum-label">Сумма</span><span className="sum-value">{formatCurrency(item.Sum)}</span></div>
                    </div>
                ))}
            </div>
            {selectedCargo && <CargoDetailsModal item={selectedCargo} isOpen={!!selectedCargo} onClose={() => setSelectedCargo(null)} auth={auth} />}
            <FilterDialog 
                isOpen={isCustomModalOpen} 
                onClose={() => setIsCustomModalOpen(false)} 
                dateFrom={customDateFrom} 
                dateTo={customDateTo} 
                onApply={(f, t) => { setCustomDateFrom(f); setCustomDateTo(t); }} 
            />
        </div>
    );
}

// --- CARGO DETAILS MODAL ---
function CargoDetailsModal({ item, isOpen, onClose, auth }: { item: CargoItem, isOpen: boolean, onClose: () => void, auth: AuthData }) {
    const [downloading, setDownloading] = useState<string | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleDownload = useCallback(async (docType: string) => {
        setDownloading(docType);
        setDownloadError(null);
        try {
            const method = DOCUMENT_METHODS[docType];
            if (!method) throw new Error(`Неизвестный тип документа: ${docType}`);

            // 1. Запрос на бэкенд для получения ссылки/файла
            const res = await fetch(PROXY_API_DOWNLOAD_URL, { 
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ 
                    login: auth.login, 
                    password: auth.password, 
                    number: item.Number,
                    method: method
                }) 
            });
            
            if (!res.ok) throw new Error(`Ошибка API: ${res.statusText}`);

            // 2. Обработка ответа
            const contentType = res.headers.get('Content-Type');
            if (contentType && (contentType.includes('application/json') || contentType.includes('text/plain'))) {
                 // Если это JSON (возможно, ошибка или ссылка)
                const data = await res.json();
                if (data.url) {
                    WebApp.openLink(data.url);
                } else if (data.error) {
                    throw new Error(data.error);
                } else {
                    throw new Error("Неизвестный формат ответа API.");
                }
            } else {
                // Предполагаем, что это файл (PDF)
                const blob = await res.blob();
                const fileURL = window.URL.createObjectURL(blob);
                
                if (isTg()) {
                    // В Telegram Mini App открываем ссылку
                    WebApp.openLink(fileURL); 
                } else {
                    // В браузере: создаем ссылку и кликаем
                    const link = document.createElement('a');
                    link.href = fileURL;
                    link.setAttribute('download', `${item.Number}_${docType}.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
                window.URL.revokeObjectURL(fileURL);
            }
        } catch (e: any) {
            setDownloadError(`Ошибка загрузки: ${e.message}`);
        } finally {
            setDownloading(null);
        }
    }, [item, auth]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content-cargo" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Детали груза №{item.Number}</h3>
                    <button className="modal-close-button" onClick={onClose}><X size={20} /></button>
                </div>

                {downloadError && <div className="login-error mb-4"><AlertTriangle className="w-5 h-5 mr-2"/>{downloadError}</div>}

                <div className="document-buttons">
                    {Object.keys(DOCUMENT_METHODS).map(docType => (
                        <button 
                            key={docType}
                            className="doc-button"
                            onClick={() => handleDownload(docType)}
                            disabled={!!downloading}
                        >
                            {downloading === docType ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4 mr-1"/>}
                            {docType}
                        </button>
                    ))}
                </div>

                <div className="details-grid-modal">
                    {/* Первая колонка */}
                    <DetailItem label="Дата прихода" value={formatDate(item.DatePrih)} icon={Calendar} />
                    <DetailItem label="Дата доставки" value={formatDate(item.DateVr)} icon={Calendar} highlighted={!!item.DateVr} />
                    
                    {/* Вторая колонка */}
                    <DetailItem label="Статус" value={item.State} icon={Tag} statusClass={getStatusClass(item.State)} />
                    <DetailItem label="Статус счета" value={item.StateBill || '-'} icon={List} />
                    
                    {/* Параметры */}
                    <DetailItem label="Мест" value={item.Mest} unit="шт" icon={Layers} />
                    <DetailItem label="Плат. вес" value={item.PW} unit="кг" icon={Scale} />
                    <DetailItem label="Общий вес" value={item.W} unit="кг" icon={Weight} />
                    <DetailItem label="Объем" value={item.Value} unit="м³" icon={Maximize} />
                </div>
                
                {/* Сумма отдельной строкой */}
                <div className="cargo-footer" style={{padding: '0.75rem 0', marginTop: '1rem', borderTop: '1px solid var(--color-border)'}}>
                    <span className="sum-label">Сумма к оплате</span>
                    <span className="sum-value" style={{fontSize: '1.25rem', fontWeight: 700}}>{formatCurrency(item.Sum)}</span>
                </div>

                {/* Дополнительные данные */}
                <div className="details-grid-modal" style={{marginTop: '1.5rem'}}>
                     <DetailItem label="Отправитель" value={item.Sender} icon={UserIcon} fullWidth={true} />
                </div>
            </div>
        </div>
    );
}

// --- SHARED COMPONENTS ---
function FilterDialog({ isOpen, onClose, dateFrom, dateTo, onApply }: { isOpen: boolean; onClose: () => void; dateFrom: string; dateTo: string; onApply: (from: string, to: string) => void; }) {
    const [tempFrom, setTempFrom] = useState(dateFrom);
    const [tempTo, setTempTo] = useState(dateTo);

    useEffect(() => {
        if (isOpen) {
            setTempFrom(dateFrom);
            setTempTo(dateTo);
        }
    }, [isOpen, dateFrom, dateTo]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h3>Произвольный диапазон</h3><button className="modal-close-button" onClick={onClose}><X size={20} /></button></div>
                <form onSubmit={e => { e.preventDefault(); onApply(tempFrom, tempTo); onClose(); }}>
                    <div style={{marginBottom: '1rem'}}><label className="detail-item-label">Дата начала:</label><input type="date" className="login-input date-input" value={tempFrom} onChange={e => setTempFrom(e.target.value)} required /></div>
                    <div style={{marginBottom: '1rem'}}><label className="detail-item-label">Дата окончания:</label><input type="date" className="login-input date-input" value={tempTo} onChange={e => setTempTo(e.target.value)} required /></div>
                    <div className="modal-button-container"><button type="submit" className="login-button">Применить</button></div>
                </form>
            </div>
        </div>
    );
}


type DetailItemProps = {
    label: string;
    value: string | number | undefined;
    icon: React.ElementType;
    unit?: string;
    highlighted?: boolean;
    fullWidth?: boolean;
    statusClass?: string;
};

function DetailItem({ label, value, icon: Icon, unit, highlighted, fullWidth, statusClass }: DetailItemProps) {
    return (
        <div className={`details-item-modal ${highlighted ? 'highlighted-detail' : ''}`} style={{ gridColumn: fullWidth ? 'span 2' : 'span 1' }}>
            <div className="flex items-center text-theme-secondary mb-1">
                <Icon className="w-4 h-4 mr-2" />
                <span className="text-xs">{label}</span>
            </div>
            <div className={`font-semibold ${statusClass || ''}`}>{value === undefined || value === null || value === "" ? '-' : value} {unit && <span className="text-xs font-normal opacity-80">{unit}</span>}</div>
        </div>
    );
}

function StubPage({ title }: { title: string }) {
    return (
        <div className="w-full max-w-lg text-center py-20">
            <h2 className="title text-theme-secondary mb-4">{title}</h2>
            <p className="text-theme-secondary opacity-70">Страница в разработке.</p>
        </div>
    );
}


// --- AUTHENTICATION & APP SHELL ---
function LoginForm({ onSubmit, loading, error }: { onSubmit: (e: FormEvent<HTMLFormElement>, login: string, password: string) => void, loading: boolean, error: string | null }) {
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSubmit(e, login, password);
    };

    return (
        <div className="login-container">
            <h1 className="text-2xl font-bold mb-6 text-center text-theme-primary">Вход в систему</h1>
            {error && <div className="login-error"><AlertTriangle className="w-5 h-5 mr-2"/>{error}</div>}
            <form onSubmit={handleSubmit} className="login-form">
                <input
                    type="text"
                    placeholder="Логин"
                    className="login-input"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    required
                    disabled={loading}
                />
                <div className="password-input-wrapper">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Пароль"
                        className="login-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                    />
                    <button type="button" className="show-password-button" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                <button type="submit" className="login-button" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <LogOut className="w-5 h-5 mr-2" />}
                    {loading ? "Вход..." : "Войти"}
                </button>
            </form>
        </div>
    );
}

function App() {
    // 1. STATE (Инициализация изменена для автологина)
    const initialAuth = useMemo(() => loadAuth(), []); // Загрузка данных при старте
    const [auth, setAuth] = useState<AuthData | null>(initialAuth); // Установка начального состояния
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("home");
    const [searchText, setSearchText] = useState("");
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isDarkTheme, setIsDarkTheme] = useState(true);

    // 2. SIDE EFFECTS (Тема)
    useEffect(() => {
        document.body.className = isDarkTheme ? 'dark' : 'light';
        // Устанавливаем тему для Telegram WebApp, если доступно
        if (isTg()) {
            WebApp.setMainButtonParams({ 
                text: "", 
                is_visible: false 
            });
            WebApp.setHeaderColor(isDarkTheme ? '#374151' : '#ffffff');
            WebApp.setBackgroundColor(isDarkTheme ? '#1f2937' : '#f3f4f6');
            WebApp.ready();
        }
    }, [isDarkTheme]);

    // 3. HANDLERS
    const handleLoginSubmit = useCallback(async (e: FormEvent<HTMLFormElement>, login: string, password: string) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError(null);

        try {
            // Простой запрос к API для проверки
            const res = await fetch(PROXY_API_BASE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login, password, dateFrom: DEFAULT_DATE_FROM, dateTo: DEFAULT_DATE_TO }),
            });

            // Проверка статуса ответа
            if (res.status === 401) {
                throw new Error("Неверный логин или пароль.");
            }
            if (!res.ok) {
                throw new Error("Ошибка сервера. Попробуйте позже.");
            }

            const data = await res.json();
            
            // Предполагаем, что успешный ответ - это массив данных, а не { success: true }
            const isSuccess = Array.isArray(data) || (data.items && Array.isArray(data.items));

            if (isSuccess) {
                const authData = { login, password };
                setAuth(authData);
                saveAuth(authData); // *** СОХРАНЕНИЕ В TELEGRAM.WEBAPP.STORAGE ***
                setLoginError(null);
            } else {
                 // Если API вернул 200, но не данные (например, { error: 'Неизвестная ошибка' })
                 throw new Error(data.error || "Ошибка при получении данных. Проверьте учетные данные.");
            }

        } catch (e: any) {
            setLoginError(e.message || "Неизвестная ошибка при входе.");
            clearAuth(); // Очистка на случай, если сохраненные данные стали недействительными
        } finally {
            setLoginLoading(false);
        }
    }, []);

    const handleLogout = useCallback(() => {
        clearAuth(); // *** УДАЛЕНИЕ ИЗ TELEGRAM.WEBAPP.STORAGE ***
        setAuth(null);
        setActiveTab("home");
        setSearchText("");
        setIsSearchExpanded(false);
        setLoginError(null);
    }, []);

    const handleSearch = (text: string) => {
        // Логика поиска уже реализована внутри CargoPage, тут только передаем текст
        setSearchText(text);
        // При переключении на поиск, переключаем вкладку на "Грузы", если не там
        if (text.length > 0 && activeTab !== 'cargo') {
             setActiveTab('cargo');
        }
    };

    // 4. RENDER
    if (!auth) {
        return <LoginForm onSubmit={handleLoginSubmit} loading={loginLoading} error={loginError} />;
    }

    return (
        <div className="app-container">
             <header className="app-header">
                <div className="header-top">
                    <h1 className="text-lg font-bold">Личный кабинет</h1>
                    <div className="header-buttons">
                        <button className="search-toggle-button" onClick={() => setIsSearchExpanded(!isSearchExpanded)} title="Поиск">
                            {isSearchExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                        </button>
                        <button className="search-toggle-button" onClick={() => setIsDarkTheme(!isDarkTheme)} title="Смена темы">
                            {isDarkTheme ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
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
                    {activeTab === "home" && <HomePage cargoList={null} isLoading={false} error={null} />}
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

// --- TABBAR COMPONENT ---
function TabBar({ active, onChange }: { active: Tab, onChange: (tab: Tab) => void }) {
    return (
        <div className="tabbar-container">
            <TabButton
                label="Главная"
                icon={<Home className="w-5 h-5" />}
                active={active === "home"}
                onClick={() => onChange("home")}
            />
            <TabButton
                label="Грузы"
                icon={<Truck className="w-5 h-5" />}
                active={active === "cargo"}
                onClick={() => onChange("cargo")}
            />
            <TabButton
                label="Документы"
                icon={<FileText className="w-5 h-5" />}
                active={active === "docs"}
                onClick={() => onChange("docs")}
            />
            <TabButton
                label="Поддержка"
                icon={<MessageCircle className="w-5 h-5" />}
                active={active === "support"}
                onClick={() => onChange("support")}
            />
            <TabButton
                label="Профиль"
                icon={<User className="w-5 h-5" />}
                active={active === "profile"}
                onClick={() => onChange("profile")}
            />
        </div>
    );
}

type TabButtonProps = {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
};

function TabButton({ label, icon, active, onClick }: TabButtonProps) {
    return (
        <button
            type="button"
            className={`tab-button ${active ? 'active' : ''}`}
            onClick={onClick}
        >
            <span className="tab-icon">{icon}</span>
            <span className="tab-label">{label}</span>
        </button>
    );
}
//... (конец файла)

export default App;
