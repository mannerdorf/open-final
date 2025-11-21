import { FormEvent, useEffect, useState, useCallback, useMemo } from "react";
// Импортируем SDK
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
type DateFilter = "all" | "today" | "week" | "month" | "custom";
type StatusFilter = "all" | "accepted" | "in_transit" | "ready" | "delivering" | "delivered";

// --- ИСПОЛЬЗУЕМ ТОЛЬКО ПЕРЕМЕННЫЕ ИЗ API ---
type CargoItem = {
    Number?: string; DatePrih?: string; DateVr?: string; State?: string; Mest?: number | string; 
    PW?: number | string; W?: number | string; Volume?: number | string; Cost?: number | string; 
    Debt?: number | string; Sender?: string; Receiver?: string;
    // Доп. поля для UI (если нужно расширять)
    [key: string]: any; 
};

// Заглушки статистики (пока оставляем как есть, будем считать на фронте позже)
const STATS_LEVEL_1 = [
    { id: 'in_transit', label: 'В пути', value: 12, color: 'text-blue-400', icon: Truck },
    { id: 'ready', label: 'Готов к выдаче', value: 4, color: 'text-green-400', icon: Package },
    { id: 'debt', label: 'Долг', value: '45 000 ₽', color: 'text-red-400', icon: AlertTriangle },
];
const STATS_LEVEL_2 = [
    { label: 'Вес в пути', value: '1 240 кг', icon: Weight },
    { label: 'Объем в пути', value: '12.5 м³', icon: Layers },
    { label: 'Ожидаемая дата', value: '24.06.2024', icon: Calendar },
];

// --- COMPONENTS ---

// (Компоненты LoginForm, CargoCard оставляем без изменений, код сокращен для чтения, 
// но в реальном файле они должны быть на месте. 
// Я приведу только основной компонент App с изменениями)

// ... [Здесь должен быть код LoginForm, CargoCard, Modal, StubPage, TabBar - они не меняются] ...
// Для корректной сборки я повторю их кратко, если нужно, но предполагаю, что ты вставишь логику в основной файл.
// Чтобы не загромождать ответ, я пишу только изменения в основном компоненте App и логику эффектов.

// --- MAIN APP COMPONENT ---
export default function App() {
    const [auth, setAuth] = useState<AuthData | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("home");
    const [isLoading, setIsLoading] = useState(false);
    const [cargoList, setCargoList] = useState<CargoItem[] | null>(null); // Данные из 1С
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState("");
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    // 1. Инициализация Telegram Mini App
    useEffect(() => {
        // Сообщаем Telegram, что приложение готово
        if (typeof window !== 'undefined') {
            WebApp.ready();
            WebApp.expand(); // Раскрываем на всю высоту
            
            // Пример использования initData для логирования (или будущей привязки)
            console.log("Telegram InitData:", WebApp.initDataUnsafe);
        }

        // Попытка авто-логина из LocalStorage
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

    // 2. Управление кнопкой "Назад" (Native BackButton)
    useEffect(() => {
        if (activeTab !== 'home') {
            WebApp.BackButton.show();
            
            const handleBack = () => {
                setActiveTab('home');
            };
            
            WebApp.BackButton.onClick(handleBack);
            
            // Очистка обработчика при смене таба или размонтировании
            return () => {
                WebApp.BackButton.offClick(handleBack);
            };
        } else {
            WebApp.BackButton.hide();
        }
    }, [activeTab]);

    const handleLogin = (data: AuthData) => {
        setAuth(data);
        // Сохраняем данные для авто-логина в будущем
        localStorage.setItem('app_auth', JSON.stringify(data));
    };

    const handleLogout = () => {
        // Спрашиваем пользователя перед выходом
        WebApp.showConfirm("Вы точно хотите выйти из аккаунта?", (confirm) => {
            if (confirm) {
                setAuth(null);
                setCargoList(null);
                localStorage.removeItem('app_auth');
                
                // Опционально: закрыть приложение при выходе
                // WebApp.close(); 
            }
        });
    };

    // Загрузка данных (без изменений логики, только вызов)
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
                
                // Проверка формата ответа от 1С
                if (Array.isArray(data)) {
                    setCargoList(data);
                } else if (data && Array.isArray(data.data)) {
                    setCargoList(data.data); 
                } else {
                    // Если пришел пустой массив или непонятный формат
                    setCargoList([]);
                    console.warn("Непонятный формат ответа:", data);
                }

            } catch (err: any) {
                console.error(err);
                setError(err.message || "Ошибка загрузки");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [auth]); // Перезапрашиваем при смене auth

    const handleSearch = (text: string) => {
        console.log("Searching:", text);
        // Логика фильтрации будет внутри CargoPage
    };

    if (!auth) {
        return <LoginForm onLogin={handleLogin} isLoading={false} error={null} />;
    }

    // --- RENDER ---
    return (
        <div className="app-container fade-in">
            <header className="app-header sticky top-0 z-30">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-white">Транспортная Компания</h1>
                        <p className="text-xs text-theme-secondary">Личный кабинет клиента</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="search-toggle-button" onClick={() => setIsSearchExpanded(!isSearchExpanded)}>
                            {isSearchExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                        </button>
                        <button className="search-toggle-button" onClick={handleLogout} title="Выход">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className={`search-container ${isSearchExpanded ? 'expanded' : 'collapsed'}`}>
                    <Search className="w-5 h-5 text-theme-secondary flex-shrink-0 ml-1" />
                    <input 
                        type="search" 
                        placeholder="Поиск по номеру, статусу..." 
                        className="search-input" 
                        value={searchText} 
                        onChange={(e) => { setSearchText(e.target.value); handleSearch(e.target.value); }} 
                    />
                    {searchText && (
                        <button className="search-toggle-button" onClick={() => { setSearchText(''); handleSearch(''); }}>
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </header>

            <div className="app-main pb-24"> {/* Добавил паддинг снизу, чтобы контент не скрывался за таббаром */}
                <div className="w-full max-w-4xl mx-auto">
                    {activeTab === "home" && (
                        // Передаем данные в HomePage (пока заглушки статистики + список)
                        <HomePage cargoList={cargoList} isLoading={isLoading} error={error} />
                    )}
                    {activeTab === "cargo" && (
                        <CargoPage auth={auth} searchText={searchText} preloadedData={cargoList} />
                    )}
                    {activeTab === "docs" && <StubPage title="Документы" />}
                    {activeTab === "support" && <StubPage title="Поддержка" />}
                    {activeTab === "profile" && <StubPage title="Профиль" />}
                </div>
            </div>

            <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
    );
}

// --- SUBCOMPONENTS (Нужно оставить их код ниже в файле App.tsx) ---
// (Здесь должен быть код LoginForm, HomePage, CargoPage, StubPage, TabBar, Modal и т.д. 
//  Если нужно, я могу вывести полный код файла целиком, но он очень длинный)
