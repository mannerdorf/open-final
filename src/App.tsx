import { FormEvent, useEffect, useState, useMemo } from "react";
// Импорт SDK Telegram
import WebApp from '@twa-dev/sdk';
import { 
    LogOut, Home, Truck, FileText, MessageCircle, User, Loader2, Check, X, Eye, EyeOff, AlertTriangle, Package, Calendar, Layers, Weight, Filter, Search, RussianRuble, List, Download, FileText as FileTextIcon, Send, 
    ClipboardCheck, Lock, Clock
} from 'lucide-react';
import React from "react";
import "./styles.css";

// --- CONFIGURATION ---
const PROXY_API_BASE_URL = '/api/perevozki'; 
const PROXY_API_DOWNLOAD_URL = '/api/download'; 

// --- TYPES ---
type AuthData = { login: string; password: string; };
type Tab = "home" | "cargo" | "docs" | "support" | "profile";
type StatusFilter = "Все" | "В пути" | "Готов к выдаче" | "Доставлен" | "Долг" | "Принят" | "Отправлен";

type CargoItem = {
    Number?: string; DatePrih?: string; DateVr?: string; State?: string; Mest?: number | string; 
    PW?: number | string; W?: number | string; Volume?: number | string; Cost?: number | string; 
    Debt?: number | string; Sender?: string; Receiver?: string;
    [key: string]: any; 
};

// Заглушки статистики (пока не считаем на фронте)
const STATS_LEVEL_1 = [
    { id: 'in_transit', label: 'В пути', value: 12, color: 'text-blue-400', icon: Truck },
    { id: 'ready', label: 'Готов к выдаче', value: 4, color: 'text-green-400', icon: Package },
    { id: 'debt', label: 'Долг', value: '45 000 ₽', color: 'text-red-400', icon: RussianRuble },
];
const STATS_LEVEL_2 = [
    { label: 'Вес в пути', value: '1 240 кг', icon: Weight },
    { label: 'Объем в пути', value: '12.5 м³', icon: Layers },
    { label: 'Ожидаемая дата', value: '24.06.2024', icon: Calendar },
];


// --- MAIN APP COMPONENT ---
export default function App() {
    const [auth, setAuth] = useState<AuthData | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("home");
    const [isLoading, setIsLoading] = useState(false);
    const [cargoList, setCargoList] = useState<CargoItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState("");
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    // 1. Инициализация Telegram Mini App
    useEffect(() => {
        if (typeof window !== 'undefined') {
            WebApp.ready(); 
            WebApp.expand(); 
            
            // Настраиваем цвета шапки под тему Telegram, используя наши стили
            WebApp.setHeaderColor(WebApp.themeParams.bg_color || '#1f2937'); 
            WebApp.setBackgroundColor(WebApp.themeParams.bg_color || '#1f2937');
        }

        // Авто-логин: проверяем localStorage
        const savedAuth = localStorage.getItem('app_auth');
        if (savedAuth) {
            try {
                const parsed = JSON.parse(savedAuth);
                if (parsed.login && parsed.password) {
                    setAuth(parsed);
                }
            } catch (e) {
                console.error("Ошибка чтения сохраненных данных");
            }
        }
    }, []);

    // 2. Управление нативной кнопкой "Назад"
    useEffect(() => {
        if (activeTab !== 'home') {
            WebApp.BackButton.show();
            const handleBack = () => setActiveTab('home');
            WebApp.BackButton.onClick(handleBack);
            return () => WebApp.BackButton.offClick(handleBack);
        } else {
            WebApp.BackButton.hide();
        }
    }, [activeTab]);

    const handleLogin = (data: AuthData) => {
        setAuth(data);
        localStorage.setItem('app_auth', JSON.stringify(data));
        setError(null); 
    };

    const handleLogout = () => {
        WebApp.showConfirm("Вы точно хотите выйти?", (confirm) => {
            if (confirm) {
                setAuth(null);
                setCargoList(null);
                localStorage.removeItem('app_auth');
            }
        });
    };

    // Загрузка данных
    useEffect(() => {
        if (!auth) return;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(PROXY_API_BASE_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        login: auth.login,
                        password: auth.password,
                        metod: "Текущие", 
                    }),
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || `Ошибка ${res.status}`);
                }

                const data = await res.json();
                if (Array.isArray(data)) {
                    setCargoList(data);
                } else if (data && Array.isArray(data.data)) {
                    setCargoList(data.data); 
                } else {
                    setCargoList([]);
                }

            } catch (err: any) {
                console.error(err);
                setError(err.message || "Ошибка загрузки");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [auth]);

    const handleSearch = (text: string) => {
        // Логика фильтрации передается в CargoPage через пропсы
    };

    // Если не авторизован — показываем форму входа
    if (!auth) {
        return <LoginForm onLogin={handleLogin} isLoading={false} error={error} />; 
    }

    return (
        <div className="app-container fade-in min-h-screen flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
            {/* Header */}
            <header className="app-header sticky top-0 z-30 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] shadow-md px-4 py-3">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold text-[var(--color-text-primary)] leading-tight">Транспортная Компания</h1>
                        <p className="text-xs text-[var(--color-text-secondary)]">Личный кабинет</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <button 
                            className="p-2 rounded-full hover:bg-[var(--color-bg-hover)] transition-colors" 
                            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                        >
                            {isSearchExpanded ? <X className="w-5 h-5 text-[var(--color-text-secondary)]" /> : <Search className="w-5 h-5 text-[var(--color-text-secondary)]" />}
                        </button>
                        <button 
                            className="p-2 rounded-full hover:bg-[var(--color-bg-hover)] transition-colors" 
                            onClick={handleLogout} 
                            title="Выход"
                        >
                            <LogOut className="w-5 h-5 text-red-400" />
                        </button>
                    </div>
                </div>
                
                {/* Search Bar Expandable */}
                <div className={`search-input-container ${isSearchExpanded ? 'expanded' : 'collapsed'}`}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                        <input 
                            type="search" 
                            placeholder="Поиск по номеру, статусу..." 
                            className="w-full bg-[var(--color-bg-input)] text-[var(--color-text-primary)] pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)]"
                            value={searchText} 
                            onChange={(e) => { setSearchText(e.target.value); handleSearch(e.target.value); }} 
                        />
                        {searchText && (
                            <button 
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" 
                                onClick={() => { setSearchText(''); handleSearch(''); }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 w-full max-w-md mx-auto pb-24 px-4 pt-4">
                {activeTab === "home" && (
                    <HomePage cargoList={cargoList} isLoading={isLoading} error={error} />
                )}
                {activeTab === "cargo" && (
                    <CargoPage auth={auth} searchText={searchText} preloadedData={cargoList} />
                )}
                {activeTab === "docs" && <StubPage title="Документы" />}
                {activeTab === "support" && <StubPage title="Поддержка" />}
                {activeTab === "profile" && <StubPage title="Профиль" />}
            </div>

            {/* TabBar */}
            <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
    );
}

// ------------------------------------------------------------------
// --- COMPONENTS ---
// ------------------------------------------------------------------

// --- LOGIN FORM COMPONENT (NEW STYLE) ---
function LoginForm({ onLogin, isLoading, error }: { onLogin: (data: AuthData) => void; isLoading: boolean; error: string | null }) {
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (login && password) {
            onLogin({ login, password });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg-primary)]">
            <div className="w-full max-w-sm bg-[var(--color-bg-card)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--color-border)] fade-in">
                {/* Header / Logo Area */}
                <div className="pt-8 pb-6 px-8 text-center bg-[var(--color-bg-card)]">
                    <div className="w-16 h-16 bg-[var(--color-primary-blue)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Truck className="w-8 h-8 text-[var(--color-primary-blue)]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Вход в систему</h2>
                    <p className="text-[var(--color-text-secondary)] text-sm">Транспортная компания</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mb-4 p-3 bg-red-900/40 border border-red-700/50 rounded-lg flex items-start gap-3 animate-pulse">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-300 leading-tight">Ошибка: {error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="px-8 pb-8 flex flex-col gap-4">
                    {/* Login Field */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Логин</label>
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)] group-focus-within:text-[var(--color-primary-blue)] transition-colors" />
                            <input
                                type="text"
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                                className="w-full bg-[var(--color-bg-input)] text-[var(--color-text-primary)] pl-10 pr-4 py-3 rounded-xl border border-[var(--color-border)] focus:border-[var(--color-primary-blue)] focus:ring-2 focus:ring-[var(--color-primary-blue)]/30 outline-none transition-all placeholder-[var(--color-text-secondary)]"
                                placeholder="Введите логин"
                                required
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">Пароль</label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                <Lock className="w-5 h-5 text-[var(--color-text-secondary)] group-focus-within:text-[var(--color-primary-blue)] transition-colors" /> 
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[var(--color-bg-input)] text-[var(--color-text-primary)] pl-10 pr-12 py-3 rounded-xl border border-[var(--color-border)] focus:border-[var(--color-primary-blue)] focus:ring-2 focus:ring-[var(--color-primary-blue)]/30 outline-none transition-all placeholder-[var(--color-text-secondary)]"
                                placeholder="Введите пароль"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-4 w-full bg-[var(--color-primary-blue)] hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all transform active:scale-[0.98] shadow-lg shadow-[var(--color-primary-blue)]/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Вход...</span>
                            </>
                        ) : (
                            <span>Войти</span>
                        )}
                    </button>
                </form>
                
                {/* Footer Info */}
                <div className="bg-gray-900/50 py-3 text-center border-t border-[var(--color-border)]/50">
                     <p className="text-xs text-[var(--color-text-secondary)]">Для доступа обратитесь к менеджеру</p>
                </div>
            </div>
        </div>
    );
}

// --- HOME PAGE COMPONENT ---
function HomePage({ cargoList, isLoading, error }: { cargoList: CargoItem[] | null, isLoading: boolean, error: string | null }) {
    return (
        <div className="space-y-6 fade-in">
            {/* Stats Grid Level 1 */}
            <div className="grid grid-cols-3 gap-2">
                {STATS_LEVEL_1.map((stat) => (
                    <div key={stat.id} className="bg-[var(--color-bg-card)] p-3 rounded-xl border border-[var(--color-border)] flex flex-col items-center justify-center text-center shadow-sm">
                        <stat.icon className={`w-6 h-6 mb-2 ${stat.color}`} />
                        <span className="text-xs text-[var(--color-text-secondary)]">{stat.label}</span>
                        <span className="text-lg font-bold text-[var(--color-text-primary)]">{stat.value}</span>
                    </div>
                ))}
            </div>

            {/* Stats Grid Level 2 */}
            <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Сводка по грузам</h3>
                <div className="space-y-3">
                    {STATS_LEVEL_2.map((stat, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-[var(--color-border)] pb-2 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--color-bg-input)] rounded-lg">
                                    <stat.icon className="w-4 h-4 text-blue-400" />
                                </div>
                                <span className="text-sm text-gray-300">{stat.label}</span>
                            </div>
                            <span className="font-semibold text-[var(--color-text-primary)]">{stat.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Cargo List Preview */}
            <div>
                <div className="flex justify-between items-end mb-3">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Последние грузы</h3>
                    <button className="text-xs text-[var(--color-primary-blue)] hover:text-blue-300">Все грузы &rarr;</button>
                </div>
                
                {isLoading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary-blue)]" />
                    </div>
                )}
                
                {error && (
                    <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                {!isLoading && !error && cargoList && cargoList.length === 0 && (
                     <div className="p-8 text-center text-[var(--color-text-secondary)] bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Список грузов пуст</p>
                     </div>
                )}

                {!isLoading && !error && cargoList && cargoList.slice(0, 3).map((cargo, idx) => (
                    <div key={idx} className="mb-3 bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-border)] flex justify-between items-center">
                        <div>
                            <div className="text-sm font-bold text-[var(--color-text-primary)]">{cargo.Number || "Без номера"}</div>
                            <div className="text-xs text-[var(--color-text-secondary)]">{cargo.DatePrih || "Дата не указана"}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-semibold text-blue-400">{cargo.State || "Статус"}</div>
                            <div className="text-xs text-[var(--color-text-secondary)]">{cargo.Mest} мест | {cargo.W} кг</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Вспомогательный компонент для Details Grid
function DetailItem({ icon: Icon, label, value }: { icon: any, label: string, value: any }) {
    return (
        <div className="flex items-center space-x-2">
            <Icon className="w-4 h-4 opacity-50 text-[var(--color-primary-blue)] flex-shrink-0" />
            <div>
                <span className="text-xs text-[var(--color-text-secondary)] block leading-none">{label}</span>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{value || '-'}</span>
            </div>
        </div>
    );
}

// --- CARGO PAGE COMPONENT (НОВЫЙ СТИЛЬ С ФИЛЬТРАМИ) ---
function CargoPage({ auth, searchText, preloadedData }: { auth: AuthData, searchText: string, preloadedData: CargoItem[] | null }) {
    const [filterStatus, setFilterStatus] = useState<StatusFilter>("Все");

    const statusMap: { [key: string]: { label: string; color: string; icon: any } } = useMemo(() => ({
        "В пути": { label: "В пути", color: "bg-blue-600/20 text-blue-400 border-blue-700", icon: Truck },
        "Отправлен": { label: "Отправлен", color: "bg-blue-600/20 text-blue-400 border-blue-700", icon: Send },
        "Готов к выдаче": { label: "Готов к выдаче", color: "bg-green-600/20 text-green-400 border-green-700", icon: Check },
        "Доставлен": { label: "Доставлен", color: "bg-gray-600/20 text-gray-400 border-gray-700", icon: ClipboardCheck },
        "Долг": { label: "Долг", color: "bg-red-600/20 text-red-400 border-red-700", icon: RussianRuble },
        "Принят": { label: "Принят", color: "bg-yellow-600/20 text-yellow-400 border-yellow-700", icon: Package },
        // Добавь другие статусы 1С здесь
    }), []);

    const dataToDisplay = useMemo(() => {
        if (!preloadedData) return [];
        let filteredData = preloadedData;
        
        // 1. Фильтрация по статусу
        if (filterStatus !== "Все") {
            filteredData = filteredData.filter(item => {
                // Если выбран "Долг", фильтруем по полю Debt
                if (filterStatus === "Долг") {
                    return parseFloat(String(item.Debt)) > 0;
                }
                // Иначе фильтруем по статусу
                return item.State === filterStatus;
            });
        }

        // 2. Фильтрация по поиску
        if (searchText) {
            const lower = searchText.toLowerCase();
            filteredData = filteredData.filter(item => 
                (item.Number && item.Number.toLowerCase().includes(lower)) ||
                (item.State && (statusMap[item.State]?.label.toLowerCase().includes(lower) || item.State.toLowerCase().includes(lower))) ||
                (item.Sender && item.Sender.toLowerCase().includes(lower)) ||
                (item.Receiver && item.Receiver.toLowerCase().includes(lower))
            );
        }

        return filteredData;
    }, [preloadedData, searchText, filterStatus, statusMap]);
    
    // Временный хэндлер для открытия деталей
    const handleOpenDetails = (cargo: CargoItem) => {
        WebApp.showAlert(`Открываем детали для груза № ${cargo.Number}`);
        // TODO: Здесь будет навигация на страницу/модал деталей
    };

    // Формируем уникальный список статусов для фильтрации
    const rawStatuses = new Set(preloadedData?.map(item => item.State).filter(s => s) || []);
    if (preloadedData?.some(item => parseFloat(String(item.Debt)) > 0)) {
        rawStatuses.add("Долг");
    }
    const uniqueStatuses = ["Все", ...Array.from(rawStatuses).filter(s => s in statusMap)] as StatusFilter[];


    return (
        <div className="fade-in pb-4">
             {/* 1. Заголовок и количество */}
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Мои грузы ({dataToDisplay.length})</h2>
                <Filter className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </div>

            {/* 2. Фильтр-чипсы (Status Tabs) */}
            <div className="flex space-x-2 overflow-x-auto whitespace-nowrap mb-6 scrollbar-hide">
                {uniqueStatuses.map((status) => {
                    const isActive = status === filterStatus;
                    return (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status as StatusFilter)}
                            className={`px-4 py-2 text-sm rounded-full font-medium transition-all duration-200 flex-shrink-0 ${
                                isActive 
                                    ? "bg-[var(--color-primary-blue)] text-white shadow-md shadow-[var(--color-primary-blue)]/20" 
                                    : "bg-[var(--color-bg-input)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                            }`}
                        >
                            {status}
                        </button>
                    );
                })}
            </div>

            {/* 3. Список грузов (Cards) */}
            <div className="space-y-4">
                {dataToDisplay.length === 0 ? (
                    <div className="text-center py-10 text-[var(--color-text-secondary)] bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Поиск не дал результатов или список пуст</p>
                    </div>
                ) : (
                    dataToDisplay.map((cargo, idx) => {
                        const statusKey = cargo.State as keyof typeof statusMap;
                        const statusInfo = statusMap[statusKey] || { label: "В работе", color: "bg-gray-500/20 text-gray-300 border-gray-600", icon: Clock };
                        const hasDebt = parseFloat(String(cargo.Debt)) > 0;
                        
                        const cardStatusInfo = hasDebt && filterStatus === "Долг" 
                            ? statusMap["Долг"] 
                            : statusInfo;

                        return (
                            <div 
                                key={idx} 
                                onClick={() => handleOpenDetails(cargo)}
                                className="bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-border)] hover:border-gray-600 transition-all cursor-pointer shadow-lg active:scale-[0.99]"
                            >
                                {/* Top Line: Number & Status */}
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="text-xl font-extrabold text-[var(--color-text-primary)] leading-tight">№ {cargo.Number}</h4>
                                    <span className={`px-3 py-1 text-xs rounded-full font-semibold border ${cardStatusInfo.color}`}>
                                        {cardStatusInfo.label}
                                    </span>
                                </div>
                                
                                {/* Debt Indicator (High Priority) */}
                                {hasDebt && filterStatus !== "Долг" && (
                                    <div className="flex items-center gap-2 p-2 mb-3 bg-red-900/40 border border-red-700/50 rounded-lg">
                                        <RussianRuble className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        <span className="text-sm font-medium text-red-300">
                                            Долг: {cargo.Debt} ₽ (Оплатить)
                                        </span>
                                    </div>
                                )}
                                
                                {/* Main Details Grid */}
                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-300">
                                    <DetailItem icon={Calendar} label="Дата прихода" value={cargo.DatePrih} />
                                    <DetailItem icon={Truck} label="Дата вручения" value={cargo.DateVr} />
                                    <DetailItem icon={Weight} label="Вес/Объем" value={`${cargo.W} кг / ${cargo.Volume} м³`} />
                                    <DetailItem icon={Package} label="Мест" value={cargo.Mest} />
                                </div>

                                {/* Sender/Receiver Footer */}
                                <div className="pt-3 mt-3 border-t border-[var(--color-border)] flex justify-between items-center">
                                    <span className="text-xs text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap max-w-[70%]">
                                        {cargo.Sender} &rarr; {cargo.Receiver}
                                    </span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); WebApp.showAlert(`Скачивание документов для ${cargo.Number}`); }}
                                        className="p-2 bg-[var(--color-primary-blue)] hover:bg-blue-500 rounded-lg text-white transition-colors flex-shrink-0"
                                        title="Скачать документы"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}


// --- STUB PAGE COMPONENT ---
function StubPage({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center text-[var(--color-text-secondary)] fade-in">
            <div className="w-16 h-16 bg-[var(--color-bg-card)] rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">{title}</h2>
            <p className="text-sm max-w-xs">Этот раздел находится в разработке и скоро станет доступен.</p>
        </div>
    );
}

// --- TAB BAR COMPONENT ---
function TabBar({ active, onChange }: { active: Tab, onChange: (t: Tab) => void }) {
    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: "home", label: "Главная", icon: Home },
        { id: "cargo", label: "Грузы", icon: Package }, 
        { id: "docs", label: "Доки", icon: FileText },
        { id: "support", label: "Чат", icon: MessageCircle },
        { id: "profile", label: "Профиль", icon: User },
    ];

    return (
        <nav className="tabbar-container fixed bottom-0 left-0 right-0 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] pb-safe z-40">
            <div className="flex justify-around items-center px-2 py-2">
                {tabs.map((tab) => {
                    const isActive = active === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            className={`flex flex-col items-center justify-center w-full py-1 transition-all duration-200 ${isActive ? "text-[var(--color-primary-blue)]" : "text-[var(--color-text-secondary)] hover:text-white"}`}
                        >
                            <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? "bg-[var(--color-primary-blue)]/10 translate-y-[-2px]" : ""}`}>
                                <tab.icon className={`w-6 h-6 ${isActive ? "stroke-[2.5px]" : "stroke-[2px]"}`} />
                            </div>
                            <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
