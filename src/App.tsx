import { FormEvent, useEffect, useState, useCallback, useMemo } from "react";
// Импорт SDK Telegram
import WebApp from '@twa-dev/sdk';
import { 
    LogOut, Home, Truck, FileText, MessageCircle, User, Loader2, Check, X, Moon, Sun, Eye, EyeOff, AlertTriangle, Package, Calendar, Tag, Layers, Weight, Filter, Search, ChevronDown, User as UserIcon, Scale, RussianRuble, List, Download, FileText as FileTextIcon, Send, 
    LayoutGrid, Maximize, TrendingUp, CornerUpLeft, ClipboardCheck, CreditCard, Minus 
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
// Типы фильтров (если используются в подкомпонентах)
type DateFilter = "all" | "today" | "week" | "month" | "custom";
type StatusFilter = "all" | "accepted" | "in_transit" | "ready" | "delivering" | "delivered";

type CargoItem = {
    Number?: string; DatePrih?: string; DateVr?: string; State?: string; Mest?: number | string; 
    PW?: number | string; W?: number | string; Volume?: number | string; Cost?: number | string; 
    Debt?: number | string; Sender?: string; Receiver?: string;
    [key: string]: any; 
};

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
            // Сообщаем Telegram, что приложение прогрузилось
            WebApp.ready(); 
            // Разворачиваем на всю высоту
            WebApp.expand(); 
            
            // Настраиваем цвета шапки под тему Telegram
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
        // Если мы не на главной, показываем кнопку "Назад"
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
        // Логика фильтрации передается в CargoPage через пропсы,
        // здесь мы просто обновляем стейт
    };

    // Если не авторизован — показываем форму входа
    if (!auth) {
        // Передаем isLoading=false, так как процесс входа обрабатывается синхронно handleLogin
        // (или можно добавить состояние загрузки входа, если нужно)
        return <LoginForm onLogin={handleLogin} isLoading={false} error={null} />;
    }

    return (
        <div className="app-container fade-in min-h-screen flex flex-col">
            {/* Header */}
            <header className="app-header sticky top-0 z-30 bg-gray-800 border-b border-gray-700 shadow-md px-4 py-3">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold text-white leading-tight">Транспортная Компания</h1>
                        <p className="text-xs text-gray-400">Личный кабинет</p>
                    </div>
                    <div className="flex gap-3 items-center">
                        <button 
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors" 
                            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                        >
                            {isSearchExpanded ? <X className="w-5 h-5 text-gray-300" /> : <Search className="w-5 h-5 text-gray-300" />}
                        </button>
                        <button 
                            className="p-2 rounded-full hover:bg-gray-700 transition-colors" 
                            onClick={handleLogout} 
                            title="Выход"
                        >
                            <LogOut className="w-5 h-5 text-red-400" />
                        </button>
                    </div>
                </div>
                
                {/* Search Bar Expandable */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSearchExpanded ? 'max-h-16 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="search" 
                            placeholder="Поиск по номеру..." 
                            className="w-full bg-gray-700 text-white pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchText} 
                            onChange={(e) => { setSearchText(e.target.value); handleSearch(e.target.value); }} 
                        />
                        {searchText && (
                            <button 
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1" 
                                onClick={() => { setSearchText(''); handleSearch(''); }}
                            >
                                <X className="w-4 h-4 text-gray-400" />
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
// НИЖЕ ОСТАВЬ СВОИ КОМПОНЕНТЫ (LoginForm, HomePage, CargoPage, etc.)
// ------------------------------------------------------------------
