import { FormEvent, useState, useEffect, useCallback, useMemo } from "react";
import { 
  LogOut, Loader2, Check, X, Moon, Sun, Eye, EyeOff, 
  Search, RefreshCw, XCircle, AlertTriangle, Info, Calendar
} from 'lucide-react';

// --- КОНФИГУРАЦИЯ ---
const PROXY_API_BASE_URL = '/api/perevozki'; 

// --- ТИПЫ ДАННЫХ ---
type AuthData = {
    login: string;
    authHeader: string; // Basic base64_encoded_credentials
};

type ApiError = {
    error?: string;
    [key: string]: unknown;
};

type Perevozka = {
    id: string; // Guid
    number: string;
    date: string; // "YYYY-MM-DD"
    status: 'Запланирована' | 'В работе' | 'Завершена' | string;
    from: string;
    to: string;
    route: string; // Маршрут
    deliveryType: string;
    driverName: string;
    transport: string;
    client: string;
    cost: number;
};

type StatData = {
    label: string;
    value: number;
    color: string; // CSS цвет
    bgClass: string; // CSS класс для background
};

type Tab = "home" | "cargo" | "docs" | "support" | "profile";

// --- ХЕЛПЕРЫ ---

/**
 * Получает заголовок Basic Auth для запросов.
 */
const getAuthHeader = (login: string, password: string): string => {
    const credentials = `${login}:${password}`;
    const encoded = btoa(credentials); 
    return `Basic ${encoded}`;
};

/**
 * Форматирует дату в YYYY-MM-DD.
 */
const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Вычисляет дату N дней назад.
 */
const getDateNDaysAgo = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return formatDate(date);
}

// --- КОМПОНЕНТЫ ---

// ----------------- ОСНОВНАЯ СТРАНИЦА "ГРУЗЫ" -----------------

type CargoPageProps = {
    auth: AuthData;
    logout: () => void;
    toggleTheme: () => void;
    isThemeLight: boolean;
};

function CargoPage({ auth, logout, toggleTheme, isThemeLight }: CargoPageProps) {
    const [cargoList, setCargoList] = useState<Perevozka[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dateFrom, setDateFrom] = useState<string>(getDateNDaysAgo(7));
    const [dateTo, setDateTo] = useState<string>(formatDate(new Date()));
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCargo, setSelectedCargo] = useState<Perevozka | null>(null);

    const fetchCargo = useCallback(async () => {
        if (loading) return;

        setLoading(true);
        setError(null);
        setCargoList(null);

        try {
            const res = await fetch(PROXY_API_BASE_URL, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": auth.authHeader, // Используем Basic Auth для прокси
                },
                body: JSON.stringify({ 
                    login: auth.login,
                    // Пароль не отправляем на фронтенде, так как он уже в заголовке authHeader
                    // Даты для запроса к 1С:
                    dateFrom: dateFrom,
                    dateTo: dateTo,
                }),
            });

            if (!res.ok) {
                const text = await res.text();
                // Попытка парсинга, если это JSON с ошибкой
                try {
                    const data: ApiError = JSON.parse(text);
                    setError(data.error || `Ошибка API: ${res.status}`);
                } catch {
                    setError(`Ошибка сервера: ${res.status}. ${text.substring(0, 100)}...`);
                }
                return;
            }

            const data: Perevozka[] = await res.json();
            setCargoList(data);

        } catch (err: any) {
            console.error(err);
            setError("Ошибка сети. Проверьте ваше соединение.");
        } finally {
            setLoading(false);
        }
    }, [auth, dateFrom, dateTo, loading]);

    useEffect(() => {
        // Загрузка данных при монтировании и изменении дат
        fetchCargo();
    }, [fetchCargo]);


    // --- РАСЧЕТ СТАТИСТИКИ ---
    const stats: StatData[] = useMemo(() => {
        if (!cargoList) return [];
        const total = cargoList.length;
        const planned = cargoList.filter(c => c.status === 'Запланирована').length;
        const inWork = cargoList.filter(c => c.status === 'В работе').length;
        const completed = cargoList.filter(c => c.status === 'Завершена').length;

        return [
            { label: 'Всего рейсов', value: total, color: 'rgb(59, 130, 246)', bgClass: 'bg-[rgb(59,130,246)]' },
            { label: 'Запланировано', value: planned, color: 'rgb(250, 204, 21)', bgClass: 'bg-[rgb(250,204,21)]' },
            { label: 'В работе', value: inWork, color: 'rgb(16, 185, 129)', bgClass: 'bg-[rgb(16,185,129)]' },
            { label: 'Завершено', value: completed, color: 'rgb(244, 63, 94)', bgClass: 'bg-[rgb(244,63,94)]' },
        ];
    }, [cargoList]);


    // --- ФИЛЬТРАЦИЯ СПИСКА ---
    const filteredCargo = useMemo(() => {
        if (!cargoList) return [];
        const query = searchQuery.toLowerCase();
        return cargoList.filter(c => 
            c.number.toLowerCase().includes(query) ||
            c.route.toLowerCase().includes(query) ||
            c.client.toLowerCase().includes(query) ||
            c.driverName.toLowerCase().includes(query)
        );
    }, [cargoList, searchQuery]);


    return (
        <>
            <Header 
                authLogin={auth.login} 
                logout={logout} 
                toggleTheme={toggleTheme} 
                isThemeLight={isThemeLight}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />
            
            <div className="page card page-with-tabs">
                <div className="card-content w-full">
                    
                    {/* 1. ВЫБОР ДАТЫ */}
                    <div className="flex gap-2 mb-4">
                        <input
                            type="date"
                            className="date-input"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                        <input
                            type="date"
                            className="date-input"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                        <button 
                            className="button-icon" 
                            onClick={fetchCargo} 
                            disabled={loading}
                            title="Обновить данные"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* 2. ПЛИТКИ СТАТИСТИКИ */}
                    {cargoList && (
                        <div className="stats-grid">
                            {stats.map((stat) => (
                                <StatCard key={stat.label} stat={stat} />
                            ))}
                        </div>
                    )}

                    {/* 3. СПИСОК ПЕРЕВОЗОК */}
                    <div className="cargo-list">
                        <h2 className="title mb-3">Список перевозок ({filteredCargo.length})</h2>
                        {loading && <LoadingCard message="Загрузка данных из 1С..." />}
                        {error && <ErrorCard message={error} />}
                        
                        {!loading && !error && filteredCargo.length === 0 && (
                            <EmptyStateCard 
                                message={cargoList ? "Нет перевозок за выбранный период" : "Нет данных для отображения. Укажите даты."} 
                            />
                        )}

                        {!loading && !error && filteredCargo.map((cargo) => (
                            <CargoCard 
                                key={cargo.id} 
                                cargo={cargo} 
                                onClick={() => setSelectedCargo(cargo)} 
                            />
                        ))}
                    </div>

                </div>
            </div>

            {/* Модальное окно с деталями */}
            {selectedCargo && (
                <CargoDetailModal 
                    cargo={selectedCargo} 
                    onClose={() => setSelectedCargo(null)} 
                />
            )}
        </>
    );
}

// ----------------- UI КОМПОНЕНТЫ -----------------

type HeaderProps = {
    authLogin: string;
    logout: () => void;
    toggleTheme: () => void;
    isThemeLight: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

function Header({ authLogin, logout, toggleTheme, isThemeLight, searchQuery, setSearchQuery }: HeaderProps) {
    return (
        <div className="cargo-header">
            <h1 className="user-greeting text-lg font-bold">
                Привет, {authLogin}!
            </h1>
            <div className="flex items-center gap-2">
                <div className="search-bar-small">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Поиск рейса..."
                        className="search-input-small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <ThemeToggleButton toggleTheme={toggleTheme} isThemeLight={isThemeLight} />
                <button className="button-icon bg-red-600 hover:bg-red-700" onClick={logout} title="Выйти">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

function ThemeToggleButton({ toggleTheme, isThemeLight }: { toggleTheme: () => void, isThemeLight: boolean }) {
    return (
        <button className="theme-toggle-button button-icon bg-theme-secondary hover:bg-theme-hover" onClick={toggleTheme} title="Переключить тему">
            {isThemeLight 
                ? <Moon className="w-5 h-5 text-yellow-400" /> 
                : <Sun className="w-5 h-5 text-yellow-400" />
            }
        </button>
    );
}

function StatCard({ stat }: { stat: StatData }) {
    return (
        <div 
            className={`stat-card stat-card-primary ${stat.bgClass}`} 
            style={{ backgroundColor: stat.color }}
        >
            <div className="text-xl font-bold">{stat.value}</div>
            <div className="text-sm opacity-90 mt-1">{stat.label}</div>
        </div>
    );
}

function CargoCard({ cargo, onClick }: { cargo: Perevozka, onClick: () => void }) {
    // Временно упрощенное отображение статуса для цвета
    let statusColorClass = 'text-theme-secondary';
    if (cargo.status === 'Запланирована') statusColorClass = 'text-yellow-400';
    if (cargo.status === 'В работе') statusColorClass = 'text-green-500';
    if (cargo.status === 'Завершена') statusColorClass = 'text-blue-400';

    return (
        <div className="perevozka-card" onClick={onClick}>
            <div className="card-header">
                <div className="flex items-center gap-2">
                    <Info className={`w-4 h-4 ${statusColorClass}`} />
                    <span className="text-sm font-semibold">Рейс №{cargo.number}</span>
                </div>
                <span className={`text-xs font-semibold ${statusColorClass}`}>{cargo.status}</span>
            </div>
            <div className="p-3 text-sm">
                <div className="flex justify-between mb-1">
                    <span className="text-theme-secondary">Маршрут:</span>
                    <span className="font-medium">{cargo.route}</span>
                </div>
                <div className="flex justify-between mb-1">
                    <span className="text-theme-secondary">Дата:</span>
                    <span className="font-medium">{cargo.date}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-theme-secondary">Клиент:</span>
                    <span className="font-medium">{cargo.client}</span>
                </div>
            </div>
        </div>
    );
}

function LoadingCard({ message }: { message: string }) {
    return (
        <div className="loading-card flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-theme-primary animate-spin mb-3" />
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
}

function ErrorCard({ message }: { message: string }) {
    return (
        <div className="error-card flex flex-col items-center justify-center">
            <XCircle className="w-8 h-8 text-red-500 mb-3" />
            <p className="text-lg font-bold text-red-500 mb-2">Ошибка</p>
            <p className="text-sm text-theme-secondary text-center">{message}</p>
        </div>
    );
}

function EmptyStateCard({ message }: { message: string }) {
    return (
        <div className="empty-state-card flex flex-col items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mb-3" />
            <p className="text-lg font-bold text-theme-text mb-2">Нет данных</p>
            <p className="text-sm text-theme-secondary text-center">{message}</p>
        </div>
    );
}

// ----------------- МОДАЛЬНОЕ ОКНО -----------------

type CargoDetailModalProps = {
    cargo: Perevozka;
    onClose: () => void;
};

function CargoDetailModal({ cargo, onClose }: CargoDetailModalProps) {
    const details = [
        { label: 'Номер рейса', value: cargo.number },
        { label: 'Дата заявки', value: cargo.date },
        { label: 'Статус', value: cargo.status },
        { label: 'Тип доставки', value: cargo.deliveryType },
        { label: 'Маршрут', value: cargo.route },
        { label: 'Откуда', value: cargo.from },
        { label: 'Куда', value: cargo.to },
        { label: 'Клиент', value: cargo.client },
        { label: 'Водитель', value: cargo.driverName },
        { label: 'Транспорт', value: cargo.transport },
        { label: 'Стоимость', value: `${cargo.cost.toLocaleString()} ₽` },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Детали рейса №{cargo.number}</h3>
                    <button className="modal-close-button" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Кнопки документов и чата */}
                <div className="document-buttons">
                    <button className="doc-button">Открыть документы</button>
                    <button className="doc-button" disabled>Чат с водителем</button>
                </div>

                {/* Основные детали */}
                <div className="details-grid">
                    {details.map((item, index) => (
                        <div key={index} className="details-item">
                            <div className="details-label">{item.label}</div>
                            <div className="details-value">{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


// ----------------- НИЖНЕЕ МЕНЮ -----------------

type TabBarProps = {
    active: Tab;
    onChange: (t: Tab) => void;
};

function TabBar({ active, onChange }: TabBarProps) {
    return (
        <div className="tabbar">
            <TabButton label="Главная" icon="🏠" active={active === "home"} onClick={() => onChange("home")} />
            <TabButton label="Грузы" icon="📦" active={active === "cargo"} onClick={() => onChange("cargo")} />
            <TabButton label="Документы" icon="📄" active={active === "docs"} onClick={() => onChange("docs")} />
            <TabButton label="Поддержка" icon="💬" active={active === "support"} onClick={() => onChange("support")} />
            <TabButton label="Профиль" icon="👤" active={active === "profile"} onClick={() => onChange("profile")} />
        </div>
    );
}

type TabButtonProps = {
    label: string;
    icon: string;
    active: boolean;
    onClick: () => void;
};

function TabButton({ label, icon, active, onClick }: TabButtonProps) {
    return (
        <button
            type="button"
            className={`tab-button ${active ? "active" : ""}`}
            onClick={onClick}
        >
            <span className="tab-icon">{icon}</span>
            <span className="tab-label">{label}</span>
        </button>
    );
}


// ----------------- ЭКРАН ВХОДА (LOGIN) -----------------

function LoginScreen({ setAuth }: { setAuth: (auth: AuthData) => void }) {
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [agreeOffer, setAgreeOffer] = useState(false);
    const [agreePersonal, setAgreePersonal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const isThemeLight = document.body.classList.contains('light-mode');
    
    // Переключение темы (для LoginScreen)
    const toggleTheme = () => {
        document.body.classList.toggle('light-mode');
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!login || !password) {
            setError("Введите логин и пароль");
            return;
        }

        if (!agreeOffer || !agreePersonal) {
            setError("Подтвердите согласие с условиями");
            return;
        }

        try {
            setLoading(true);

            // 1. Создаем Basic Auth заголовок для прокси
            const authHeader = getAuthHeader(login, password);

            // 2. Выполняем тестовый POST-запрос на прокси, чтобы проверить креды
            const res = await fetch(PROXY_API_BASE_URL, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": authHeader,
                },
                // Отправляем login/password в теле, чтобы прокси смог их декодировать
                body: JSON.stringify({ 
                    login, 
                    password, 
                    // Отправляем минимальный диапазон дат для быстрого теста
                    dateFrom: getDateNDaysAgo(1),
                    dateTo: formatDate(new Date()),
                }),
            });

            const text = await res.text();
            let data: ApiError | Perevozka[];

            try {
                data = JSON.parse(text);
            } catch {
                // Если не JSON (например, HTML-ошибка), считаем это ошибкой
                data = { error: `Неизвестный ответ сервера: ${res.status}` };
            }

            if (!res.ok) {
                // Ошибка 401, 403, 500 и т.д.
                const errMsg = (data as ApiError).error || `Ошибка: ${res.status}. ${text.substring(0, 50)}...`;
                if (res.status === 401) {
                    setError("Неверный логин или пароль.");
                } else if (res.status === 400) {
                    setError("Ошибка запроса. Проверьте формат данных.");
                } else {
                    setError(errMsg);
                }
                return;
            }

            // Успех
            setAuth({ login, authHeader });
            localStorage.setItem('authData', JSON.stringify({ login, authHeader }));

        } catch (err: any) {
            console.error(err);
            setError("Ошибка сети. Проверьте ваше соединение.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-form-wrapper app-container">
            <div className="login-card">
                <div className="theme-toggle-container">
                    <button className="theme-toggle-button" onClick={toggleTheme} title="Переключить тему">
                        {isThemeLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                    </button>
                </div>

                <h1 className="logo-text">HAULZ</h1>
                <p className="tagline">Вход в систему управления перевозками</p>

                <form className="form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label" htmlFor="login">Логин</label>
                        <input
                            id="login"
                            type="text"
                            className="input"
                            placeholder="Введите логин"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    
                    <div className="input-group">
                        <label className="input-label" htmlFor="password">Пароль</label>
                        <div className="password-wrapper">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className="input"
                                placeholder="Введите пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                            <button 
                                type="button" 
                                className="password-toggle" 
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="checkbox-row">
                        <label className="checkbox-group">
                            <input
                                type="checkbox"
                                className="checkbox"
                                checked={agreeOffer}
                                onChange={(e) => setAgreeOffer(e.target.checked)}
                                disabled={loading}
                            />
                            <span className="checkbox-label">Я согласен с условиями <a href="#">оферты</a></span>
                        </label>
                    </div>
                    <div className="checkbox-row">
                        <label className="checkbox-group">
                            <input
                                type="checkbox"
                                className="checkbox"
                                checked={agreePersonal}
                                onChange={(e) => setAgreePersonal(e.target.checked)}
                                disabled={loading}
                            />
                            <span className="checkbox-label">Согласие на обработку <a href="#">персональных данных</a></span>
                        </label>
                    </div>

                    {error && (
                        <div className="login-error">
                            <XCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="button-primary"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        {loading ? "Вход..." : "Войти"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ----------------- ГЛАВНЫЙ КОМПОНЕНТ APP -----------------

export default function App() {
    const [auth, setAuth] = useState<AuthData | null>(() => {
        // Попытка загрузки из localStorage
        const stored = localStorage.getItem('authData');
        return stored ? JSON.parse(stored) : null;
    });
    const [activeTab, setActiveTab] = useState<Tab>("cargo"); 
    const [isThemeLight, setIsThemeLight] = useState(
        window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
    );

    const toggleTheme = useCallback(() => {
        const newTheme = !isThemeLight;
        setIsThemeLight(newTheme);
        document.body.classList.toggle('light-mode', newTheme);
        localStorage.setItem('theme', newTheme ? 'light' : 'dark');
    }, [isThemeLight]);

    const handleLogout = useCallback(() => {
        setAuth(null);
        localStorage.removeItem('authData');
    }, []);

    // Применение темы при загрузке
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

        let initialLight = systemPrefersLight;

        if (storedTheme === 'light') {
            initialLight = true;
        } else if (storedTheme === 'dark') {
            initialLight = false;
        }
        
        setIsThemeLight(initialLight);
        document.body.classList.toggle('light-mode', initialLight);

        // Инициализация Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
             window.Telegram.WebApp.ready();
             // Установка темы Telegram в соответствии с выбранной
             const color = initialLight ? '#ffffff' : '#1f2937';
             window.Telegram.WebApp.setHeaderColor(color);
             window.Telegram.WebApp.setBackgroundColor(color);
        }

    }, []);

    if (!auth) {
        return <LoginScreen setAuth={setAuth} />;
    }

    return (
        <div className={`app-container ${isThemeLight ? 'light-mode' : ''}`}>
            {/* Страница с грузами */}
            <CargoPage 
                auth={auth} 
                logout={handleLogout} 
                toggleTheme={toggleTheme} 
                isThemeLight={isThemeLight}
            />
            
            {/* Нижний TabBar */}
            <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
    );
}
