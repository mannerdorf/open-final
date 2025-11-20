import { FormEvent, useEffect, useState } from "react";
import { LogOut, Home, Truck, FileText, MessageCircle, User, Loader2, Check, X, Moon, Sun } from 'lucide-react';

type AuthData = {
    login: string;
    password: string;
};

type Tab = "home" | "cargo" | "docs" | "support" | "profile";

// --- КОНФИГУРАЦИЯ ---
// Используем базовый URL без конечного метода, так как в GET нужно добавить параметры
const PROXY_API_BASE_URL = '/api/perevozki'; 

// --- ФУНКЦИЯ ДЛЯ BASIC AUTH ---
/**
 * Создает заголовок Basic Authorization из логина и пароля.
 */
const getAuthHeader = (login: string, password: string): { Authorization: string } => {
    const credentials = `${login}:${password}`;
    const encoded = btoa(credentials); // Кодирование в Base64
    return {
        Authorization: `Basic ${encoded}`,
    };
};


export default function App() {
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [agreeOffer, setAgreeOffer] = useState(false);
    const [agreePersonal, setAgreePersonal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [auth, setAuth] = useState<AuthData | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("cargo"); 
    const [theme, setTheme] = useState('dark');
    const isThemeLight = theme === 'light';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        const cleanLogin = login.trim();
        const cleanPassword = password.trim();

        if (!cleanLogin || !cleanPassword) {
            setError("Введите логин и пароль");
            return;
        }

        if (!agreeOffer || !agreePersonal) {
            setError("Подтвердите согласие с условиями");
            return;
        }

        try {
            setLoading(true);
            
            // --- КОРРЕКЦИЯ: ПРОВЕРКА АВТОРИЗАЦИИ МЕТОДОМ GET ---
            // Используем простой GET-запрос к API для проверки учетных данных
            const res = await fetch(`${PROXY_API_BASE_URL}?checkAuth=true`, {
                method: "GET", 
                headers: { 
                    ...getAuthHeader(cleanLogin, cleanPassword) // Basic Auth Header
                },
            });

            if (!res.ok) {
                let message = `Ошибка авторизации: ${res.status}. Проверьте логин и пароль.`;
                // Ошибки Postman/cURL часто не дают текст ответа, просто статус
                setError(message);
                setAuth(null);
                return;
            }

            // Авторизация ок
            setAuth({ login: cleanLogin, password: cleanPassword });
            setActiveTab("cargo");
            setError(null);
        } catch (err: any) {
            setError(err?.message || "Ошибка сети. Проверьте адрес прокси.");
            setAuth(null);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setAuth(null);
        setActiveTab("cargo");
        setError(null);
    }
    
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
    };


    // --------------- ЭКРАН АВТОРИЗАЦИИ ---------------
    if (!auth) {
        return (
            <>
            <style>
                {`
                /* Font Inter - Оставлен здесь для корректной работы в песочнице */
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
                
                /* Глобальный сброс для box-sizing */
                * {
                    box-sizing: border-box;
                }
                body {
                    margin: 0;
                    background-color: var(--color-bg-primary); /* Установим фон body */
                }

                /* Стили для формы авторизации, использующие классы из styles.css */
                .login-form-wrapper {
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 2rem;
                }
                .logo-text {
                    font-size: 2.5rem;
                    font-weight: 900;
                    text-align: center;
                    margin-bottom: 0.5rem;
                    color: var(--color-primary-blue);
                }
                .tagline {
                    text-align: center;
                    margin-bottom: 2rem;
                    color: var(--color-text-secondary);
                    font-size: 0.9rem;
                }
                .form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .field-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--color-text-primary);
                    margin-bottom: 0.3rem;
                }
                .checkbox-row {
                    display: flex;
                    align-items: center;
                    font-size: 0.875rem;
                    color: var(--color-text-secondary);
                }
                .checkbox-row input[type="checkbox"] {
                    margin-right: 0.6rem;
                    accent-color: var(--color-primary-blue);
                    width: 1rem;
                    height: 1rem;
                }
                .checkbox-row a {
                    color: var(--color-primary-blue);
                    text-decoration: none;
                    font-weight: 600;
                }
                .checkbox-row a:hover {
                    text-decoration: underline;
                }

                /* Переключатель темы */
                .theme-toggle-container {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                }
                .theme-toggle-button {
                    background-color: transparent; 
                    border: none;
                    padding: 0.5rem;
                    cursor: pointer;
                    transition: color 0.2s;
                    color: var(--color-text-secondary);
                }
                .theme-toggle-button:hover {
                    color: var(--color-primary-blue);
                }
                .theme-toggle-button svg {
                    width: 1.25rem;
                    height: 1.25rem;
                    transition: color 0.2s;
                }
                `}
            </style>
            
            <div className={`app-container ${theme}-mode login-form-wrapper`}>
                <div className={`login-card relative`}>
                    <div className="theme-toggle-container absolute top-4 right-4">
                        <button className="theme-toggle-button" onClick={toggleTheme}>
                            {isThemeLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </button>
                    </div>

                    <div className="flex justify-center mb-4 h-10 mt-6">
                        <div className="logo-text">HAULZ</div>
                    </div>
                    <div className="tagline">
                        Доставка грузов в Калининград и обратно
                    </div>

                    <form onSubmit={handleSubmit} className="form">
                        <div className="field">
                            <div className="field-label text-theme-text">Логин (email)</div>
                            <input
                                className="login-input"
                                type="text"
                                placeholder="Введите ваш email"
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                                autoComplete="username"
                            />
                        </div>

                        <div className="field">
                            <div className="field-label text-theme-text">Пароль</div>
                            <input
                                className="login-input"
                                type="password"
                                placeholder="Введите пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>

                        <label className="checkbox-row">
                            <input
                                type="checkbox"
                                checked={agreeOffer}
                                onChange={(e) => setAgreeOffer(e.target.checked)}
                            />
                            <span>
                                Согласие с{" "}
                                <a href="#" target="_blank" rel="noreferrer">
                                    публичной офертой
                                </a>
                            </span>
                        </label>

                        <label className="checkbox-row">
                            <input
                                type="checkbox"
                                checked={agreePersonal}
                                onChange={(e) => setAgreePersonal(e.target.checked)}
                            />
                            <span>
                                Согласие на{" "}
                                <a href="#" target="_blank" rel="noreferrer">
                                    обработку персональных данных
                                </a>
                            </span>
                        </label>

                        <button className="button-primary mt-4 flex justify-center items-center" type="submit" disabled={loading}>
                            {loading ? (
                                <Loader2 className="animate-spin w-5 h-5" />
                            ) : (
                                "Подтвердить"
                            )}
                        </button>
                    </form>

                    {error && <p className="login-error mt-4">{error}</p>}
                </div>
            </div>
            </>
        );
    }

    // --------------- АВТОРИЗОВАННАЯ ЧАСТЬ ---------------

    return (
        <div className={`app-container ${theme}-mode`}>
            
            {/* Адаптированная Шапка */}
            <header className="app-header">
                <h1 className="header-title">
                    <span className="logo-text text-theme-primary" style={{ fontSize: '1.5rem', margin: 0 }}>HAULZ</span>
                </h1>
                <div className="flex items-center space-x-3">
                    <button className="text-theme-secondary hover:bg-theme-hover-bg p-2 rounded-full" onClick={handleLogout} title="Выйти">
                        <LogOut className="w-5 h-5 text-red-500" />
                    </button>
                    <button className="text-theme-secondary hover:bg-theme-hover-bg p-2 rounded-full" onClick={toggleTheme} title="Переключить тему">
                        {isThemeLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                    </button>
                </div>
            </header>

            <div className="app-main">
                <div className="w-full max-w-4xl"> 
                    {activeTab === "cargo" && <CargoPage auth={auth} />}
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

// ----------------- КОМПОНЕНТ С ГРУЗАМИ -----------------

type CargoPageProps = { 
    auth: AuthData; 
};

function CargoPage({ auth }: CargoPageProps) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [aiSummary, setAiSummary] = useState("Искусственный интеллект анализирует ваши данные...");
    const [summaryLoading, setSummaryLoading] = useState(true);

    const formatDate = (dateString: string | undefined): string => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                 return date.toLocaleDateString('ru-RU');
            }
        } catch (e) { /* ignore */ }
        const [year, month, day] = dateString.split('-');
        if (year && month && day) {
            return `${day}.${month}.${year}`;
        }
        return dateString;
    };
    
    const formatCurrency = (value: number | string | undefined): string => {
        if (value === undefined || value === null || value === "") return '-';
        const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
        if (isNaN(num)) return String(value);

        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    };

    // Загрузка данных
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            setSummaryLoading(true);

            // Формирование периода за последний год
            const today = new Date();
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(today.getFullYear() - 1);

            const formatDateForApi = (date: Date): string => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            };
            
            const dateFrom = formatDateForApi(oneYearAgo);
            const dateTo = formatDateForApi(today);
            
            // --- КОРРЕКЦИЯ: ИСПОЛЬЗОВАНИЕ GET С ПАРАМЕТРАМИ ---
            const queryParams = new URLSearchParams({
                dateFrom: dateFrom,
                dateTo: dateTo,
                // Если API требует также логин/пароль в Query, добавляем их. 
                // Обычно Basic Auth достаточно, но для соответствия cURL добавим:
                login: auth.login.trim(),
                password: auth.password.trim(),
            }).toString();

            try {
                // ИСПОЛЬЗУЕТСЯ МЕТОД GET
                const url = `${PROXY_API_BASE_URL}?${queryParams}`;
                
                const res = await fetch(url, {
                    method: "GET",
                    headers: { 
                        // Basic Auth Header (основной механизм)
                        ...getAuthHeader(auth.login, auth.password)
                    },
                });

                if (!res.ok) {
                    let message = `Ошибка загрузки: ${res.status}. Убедитесь в корректности данных и прокси.`;
                    // Ошибки Postman/cURL часто не дают текст ответа
                    if (!cancelled) setError(message);
                    return;
                }

                const data = await res.json();
                
                const list = Array.isArray(data) ? data : data.Perevozki || data.items || [];
                
                if (!cancelled) setItems(list);

                // Имитация загрузки AI-сводки
                setTimeout(() => {
                    if (!cancelled) {
                        const totalSum = list.reduce((sum: number, item: any) => sum + (parseFloat(item.Sum || item.Total || 0) || 0), 0);
                        setAiSummary(`За последний год вы совершили ${list.length} перевозок. Общая сумма составила ${formatCurrency(totalSum)}. `);
                        setSummaryLoading(false);
                    }
                }, 1500);

            } catch (e: any) {
                if (!cancelled) setError(e?.message || "Ошибка сети при загрузке данных.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [auth.login, auth.password]); 


    return (
        <div className="p-4">
            <h2 className="text-3xl font-bold text-theme-text mb-2">Мои перевозки</h2>
            <p className="text-theme-secondary mb-4 pb-4 border-b border-theme-border">
                Данные загружаются методом **GET** с передачей учетных данных в заголовке **Authorization: Basic** (согласно Postman).
            </p>

            {/* AI Summary Card */}
            <div className="ai-summary-card">
                <div className="flex items-start">
                    <span className="mr-3 text-theme-primary font-bold text-xl">AI</span>
                    <div>
                        <p className="text-sm font-semibold mb-1 text-theme-text">Краткая сводка</p>
                        <p className={`text-theme-text text-sm ${summaryLoading ? 'italic text-theme-secondary' : 'font-medium'}`}>
                            {summaryLoading ? <span className="flex items-center"><Loader2 className="animate-spin w-4 h-4 mr-2" /> Анализ данных...</span> : aiSummary}
                        </p>
                    </div>
                </div>
            </div>


            {loading && <p className="flex items-center text-lg text-yellow-500"><Loader2 className="animate-spin mr-2 w-5 h-5" /> Загружаем данные...</p>}
            
            {error && <p className="login-error flex items-center"><X className="w-5 h-5 mr-2" />{error}</p>}

            {!loading && !error && items.length === 0 && (
                <div className="empty-state-card text-theme-secondary">
                    <Truck className="w-12 h-12 mx-auto mb-3 text-theme-primary" />
                    <p className="text-lg font-semibold text-theme-text">Перевозок не найдено</p>
                    <p className="text-sm">Проверьте, правильно ли указаны логин и пароль.</p>
                </div>
            )}

            <div className="grid-container mt-6">
                {items.map((item, idx) => {
                    const number = item.Nomer || item.Number || item.number || "-";
                    const status = item.Status || item.State || item.state || "-";
                    const date = formatDate(item.DatePrih || item.DatePr || item.datePr);
                    const weight = item.PW || item.Weight || "-";
                    const sum = formatCurrency(item.Sum || item.Total);

                    return (
                        <div className="perevozka-card" key={idx}>
                            <div className="card-header">
                                <span className="text-sm font-semibold text-theme-secondary">Перевозка №</span>
                                <span className="text-lg font-bold text-theme-primary">{number}</span>
                            </div>
                            <div className="p-3">
                                <div className="flex justify-between items-center py-2 border-b border-theme-border">
                                    <span className="text-sm text-theme-secondary flex items-center"><Check className="w-4 h-4 mr-2 text-green-500" /> Статус</span>
                                    <span className="text-theme-text font-semibold">{status}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-theme-border">
                                    <span className="text-sm text-theme-secondary flex items-center"><Truck className="w-4 h-4 mr-2 text-indigo-400" /> Дата прибытия</span>
                                    <span className="text-theme-text font-semibold">{date}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-theme-border">
                                    <span className="text-sm text-theme-secondary flex items-center"><span className="text-xs font-extrabold mr-2">W</span> Вес, кг</span>
                                    <span className="text-theme-text font-semibold">{weight}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-theme-secondary flex items-center"><span className="text-md font-extrabold mr-2 text-yellow-500">₽</span> Сумма</span>
                                    <span className="text-lg font-bold text-yellow-500">{sum}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ----------------- ЗАГЛУШКИ ДЛЯ ДРУГИХ ВКЛАДОК -----------------

function StubPage({ title }: { title: string }) {
    return (
        <div className="p-4">
            <h2 className="text-3xl font-bold text-theme-text mb-2">{title}</h2>
            <p className="text-theme-secondary mb-4 pb-4 border-b border-theme-border">Этот раздел мы заполним позже.</p>
            
            <div className="empty-state-card text-theme-secondary mt-10">
                <FileText className="w-12 h-12 mx-auto mb-3 text-theme-primary" />
                <p className="text-lg font-semibold text-theme-text">В разработке</p>
                <p className="text-sm">Возвращайтесь позже, чтобы увидеть {title.toLowerCase()}.</p>
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
        <div className="fixed bottom-0 left-0 right-0 flex justify-around bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg p-2 z-50 bg-[var(--color-bg-card)] border-theme-border">
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
    const activeClass = active ? 'text-theme-primary' : 'text-theme-secondary';
    const hoverClass = 'hover:bg-theme-hover-bg';
    
    return (
        <button
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors ${activeClass} ${hoverClass}`}
            onClick={onClick}
        >
            <span className="tab-icon mb-0.5">{icon}</span>
            <span className="text-xs">{label}</span>
        </button>
    );
}
