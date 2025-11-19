import React, { FormEvent, useEffect, useState, useMemo } from "react";
import { Home, Package, FileText, User, LogIn, Loader2, Check } from 'lucide-react';

// --- КОНСТАНТЫ ПРИЛОЖЕНИЯ ---
// Акцентный цвет, как в оригинальном дизайне
const PRIMARY_COLOR = '#2D5BFF';

/* ------------------------------------------------------
        HOOK: useLocalAuth (Имитация аутентификации)
------------------------------------------------------ */
const useLocalAuth = () => {
    const isReady = true; 
    const userId = "LOCAL-SIMULATED-USER-ID"; 
    return { userId, isReady };
};


/* ------------------------------------------------------
        HOOK: useTelegram (упрощено)
------------------------------------------------------ */
const useTelegram = () => {
    return { tg: typeof window !== 'undefined' ? window.Telegram?.WebApp : null };
};

// --- КОМПОНЕНТЫ И UI ---

/**
 * TabBar (Таббар)
 */
function TabBar({ active, onChange }) {
    const items = [
        { id: "home", label: "Главная", Icon: Home },
        { id: "cargo", label: "Грузы", Icon: Package },
        { id: "docs", label: "Документы", Icon: FileText },
        { id: "profile", label: "Профиль", Icon: User },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 flex bg-white border-t border-gray-200 shadow-xl p-2 z-10">
            {items.map((i) => (
                <div
                    key={i.id}
                    onClick={() => onChange(i.id)}
                    className={`flex-1 text-center cursor-pointer p-1 transition-colors duration-200 
                        ${active === i.id ? 'text-[' + PRIMARY_COLOR + '] font-bold' : 'text-gray-500 hover:text-blue-500'}`
                    }
                >
                    <i.Icon className="h-6 w-6 mx-auto mb-1" />
                    <div className="text-xs font-medium">{i.label}</div>
                </div>
            ))}
        </div>
    );
}

/**
 * App Component
 */
function App() {
    const { tg } = useTelegram();
    const { userId, isReady } = useLocalAuth(); 

    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [agreeOffer, setAgreeOffer] = useState(false);
    const [agreePersonal, setAgreePersonal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [authData, setAuthData] = useState(null); 
    const [activeTab, setActiveTab] = useState("cargo");
    
    const sessionChecked = true; 

    // Обработчик входа в систему (полностью локальная логика)
    const handleSubmit = async (e) => {
        e.preventDefault();

        setError(null);

        const cleanLogin = login.trim();
        const cleanPassword = password.trim();

        if (!cleanLogin || !cleanPassword) {
            setError("Введите логин и пароль");
            return;
        }

        if (!agreeOffer || !agreePersonal) {
            setError("Необходимо согласие со всеми условиями");
            return;
        }

        try {
            setLoading(true);

            // ИМИТАЦИЯ успешной авторизации
            await new Promise((res) => setTimeout(res, 500)); 
            
            // Сохранение данных в локальном состоянии
            setAuthData({ 
                isLoggedIn: true,
                login: cleanLogin, 
            }); 
            
            setActiveTab("cargo");
        } catch (err) {
            console.error("Auth process error:", err);
            setError("Ошибка авторизации. Проверьте консоль.");
        } finally {
            setLoading(false);
        }
    };


    /* ------------------------------------------------------
              Рендер: Экраны
    ------------------------------------------------------ */
    if (!isReady || !sessionChecked) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <div className="ml-3 text-gray-600 font-medium">Загрузка...</div>
            </div>
        );
    }

    if (!authData) {
        // --- Экран Аутентификации с восстановленным стилем ---
        return (
            <div className="p-6 max-w-sm mx-auto bg-white min-h-screen">
                <div className="flex justify-center mb-6">
                    <LogIn className={`h-8 w-8 text-[${PRIMARY_COLOR}] mr-2`} />
                    <h1 className="text-3xl font-bold" style={{ color: PRIMARY_COLOR }}>HAULZ</h1>
                </div>
                <p className="text-center text-sm text-gray-500 mb-8">
                    Доставка грузов в Калининград
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        placeholder="Email"
                        type="email"
                        // Имитация tg-input
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition duration-150 bg-gray-50 text-gray-800"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                    />

                    <input
                        type="password"
                        placeholder="Пароль"
                        // Имитация tg-input
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition duration-150 bg-gray-50 text-gray-800"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <div className="space-y-2 pt-2">
                        <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                // Используем акцентный цвет для флажка
                                className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500`}
                                checked={agreeOffer}
                                onChange={(e) => setAgreeOffer(e.target.checked)}
                            />
                            <span className="ml-2">Согласие с офертой</span>
                        </label>

                        <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                // Используем акцентный цвет для флажка
                                className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500`}
                                checked={agreePersonal}
                                onChange={(e) => setAgreePersonal(e.target.checked)}
                            />
                            <span className="ml-2">Обработка персональных данных</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        // Имитация tg-main-button
                        className={`w-full py-3 rounded-lg font-semibold text-white transition duration-200 flex items-center justify-center 
                            ${loading 
                                ? 'bg-blue-400 cursor-not-allowed' 
                                : 'shadow-lg hover:shadow-xl'
                            }`}
                        style={{ backgroundColor: loading ? '#6A87FF' : PRIMARY_COLOR }}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : 'Войти'}
                    </button>
                </form>

                {error && (
                    <div className="mt-6 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-center text-sm">
                        {error}
                    </div>
                )}
                
                <div className="mt-8 text-xs text-gray-400 border-t pt-4">
                    <p>Auth Status: {isReady ? 'Ready (Local)' : 'Pending'}</p>
                    <p className="break-all">Simulated UID: {userId}</p>
                </div>
            </div>
        );
    }

    /* ------------------------------------------------------
              Рендер: АВТОРИЗОВАННЫЙ ИНТЕРФЕЙС
    ------------------------------------------------------ */
    
    // В зависимости от активной вкладки отображаем содержимое
    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return <div className="text-center p-8 bg-white rounded-xl shadow-lg mt-4">
                    <Home className={`h-8 w-8 mx-auto mb-3`} style={{ color: PRIMARY_COLOR }} />
                    <h3 className="text-xl font-bold text-gray-800">Главная страница</h3>
                    <p className="text-gray-600 mt-2">Здесь будет дашборд и общая информация.</p>
                </div>
            case 'cargo':
                return <div className="text-center p-8 bg-blue-50 rounded-xl shadow-lg mt-4 border border-blue-200">
                    <Package className={`h-8 w-8 mx-auto mb-3`} style={{ color: PRIMARY_COLOR }} />
                    <h3 className="text-xl font-bold text-blue-800">Управление грузами</h3>
                    <p className="text-gray-600 mt-2">Рабочая область для создания и отслеживания заказов.</p>
                </div>
            case 'docs':
                return <div className="text-center p-8 bg-white rounded-xl shadow-lg mt-4">
                    <FileText className={`h-8 w-8 mx-auto mb-3`} style={{ color: PRIMARY_COLOR }} />
                    <h3 className="text-xl font-bold text-gray-800">Документы</h3>
                    <p className="text-gray-600 mt-2">Электронный документооборот.</p>
                </div>
            case 'profile':
                return <div className="text-center p-8 bg-white rounded-xl shadow-lg mt-4">
                    <User className={`h-8 w-8 mx-auto mb-3`} style={{ color: PRIMARY_COLOR }} />
                    <h3 className="text-xl font-bold text-gray-800">Профиль</h3>
                    <p className="text-gray-600 mt-2">Настройки и личные данные пользователя **{authData.login}**.</p>
                </div>
            default:
                return null;
        }
    }
    
    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen pb-24">
            <header className="text-center mb-6 p-4 bg-white rounded-xl shadow-md border-b-4 border-green-500">
                <div className="flex items-center justify-center text-green-700 mb-2">
                    <Check className="h-6 w-6 mr-2" />
                    <p className="font-semibold">Вы успешно вошли в систему!</p>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Добро пожаловать, {authData.login}</h2>
                <p className="text-gray-500 text-sm mt-1">
                    Ваш ID: <code className="break-all">{userId} (локальная симуляция)</code>
                </p>
            </header>
            
            {renderContent()}

            <div className="h-4" /> {/* Пустое место для отступов */}

            <TabBar active={activeTab} onChange={setActiveTab} />
        </div>
    );
}

export default App;
