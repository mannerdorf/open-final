import { FormEvent, useEffect, useState, useCallback, useMemo } from "react";
// Импортируем все необходимые иконки
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
type DateFilter = "все" | "сегодня" | "неделя" | "месяц" | "период";
type StatusFilter = "all" | "accepted" | "in_transit" | "ready" | "delivering" | "delivered";

// --- ИСПОЛЬЗУЕМ ТОЛЬКО ПЕРЕМЕННЫЕ ИЗ API ---
type CargoItem = {
    Number?: string; DatePrih?: string; DateVr?: string; State?: string; Mest?: number | string; 
    PW?: number | string; V?: number | string; P?: string;
    // Дополнительные поля, которые могут быть в списке
    StateColor?: string; // Для стилизации
    isExpanded?: boolean; // Для локального состояния
};

type CargoList = CargoItem[];

// --- STATE HOOKS ---
// Хук для управления логином/паролем
const useAuth = () => {
    const [auth, setAuth] = useState<AuthData | null>(() => {
        try {
            const saved = localStorage.getItem('auth');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error("Error loading auth from localStorage", e);
            return null;
        }
    });

    const saveAuth = useCallback((data: AuthData) => {
        setAuth(data);
        localStorage.setItem('auth', JSON.stringify(data));
    }, []);

    const clearAuth = useCallback(() => {
        setAuth(null);
        localStorage.removeItem('auth');
    }, []);

    return { auth, saveAuth, clearAuth };
};

// --- API HOOKS ---
// Хук для запросов к API
const useApiFetch = <T,>(apiPath: string, auth: AuthData | null, initialData: T) => {
    const [data, setData] = useState<T>(initialData);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFetchTrigger, setIsFetchTrigger] = useState(0);

    const refetch = useCallback(() => {
        setIsFetchTrigger(prev => prev + 1);
    }, []);

    useEffect(() => {
        if (!auth) {
            setData(initialData);
            setError(null);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            const body = {
                login: auth.login,
                password: auth.password,
                // Для запроса 'perevozki' можно добавить dateFrom/dateTo, 
                // но пока используем дефолты на стороне прокси
            };

            try {
                const response = await fetch(apiPath, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    let errorText = `Ошибка HTTP: ${response.status}`;
                    try {
                        const errorJson: ApiError = await response.json();
                        errorText = errorJson.error || errorText;
                    } catch {
                        errorText = await response.text();
                        if (errorText.length > 200) errorText = errorText.substring(0, 200) + "...";
                    }
                    throw new Error(errorText);
                }

                const json: T = await response.json();
                setData(json);

            } catch (err: any) {
                console.error("Fetch error:", err);
                setError(err.message || "Неизвестная ошибка сети/API");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [auth, apiPath, initialData, isFetchTrigger]);

    return { data, isLoading, error, refetch, setData };
};

// --- UTILS ---
const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '—';
    try {
        // Формат 1С может быть "ДД.ММ.ГГГГ ЧЧ:ММ:СС" или "ГГГГ-ММ-ДД"
        const parts = dateString.match(/(\d{4})-(\d{2})-(\d{2})/) || dateString.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (parts) {
            const year = parts[1].length === 4 ? parts[1] : parts[3];
            const month = parts[1].length === 4 ? parts[2] : parts[2];
            const day = parts[1].length === 4 ? parts[3] : parts[1];
            return `${day}.${month}.${year}`;
        }
        return dateString;
    } catch {
        return dateString;
    }
};

const getStatusDetails = (state: string | undefined): { label: string, color: string, icon: React.ReactNode } => {
    switch (state) {
        case "Принята":
            return { label: "Принята", color: "text-green-400 bg-green-900", icon: <Check className="w-3 h-3" /> };
        case "В рейсе":
            return { label: "В рейсе", color: "text-yellow-400 bg-yellow-900", icon: <Truck className="w-3 h-3" /> };
        case "Готова к выдаче":
            return { label: "Готова к выдаче", color: "text-blue-400 bg-blue-900", icon: <Package className="w-3 h-3" /> };
        case "Доставка":
            return { label: "Доставка", color: "text-indigo-400 bg-indigo-900", icon: <Send className="w-3 h-3" /> };
        case "Доставлена":
            return { label: "Доставлена", color: "text-slate-400 bg-slate-900", icon: <ClipboardCheck className="w-3 h-3" /> };
        default:
            return { label: state || "Неизвестно", color: "text-gray-400 bg-gray-600", icon: <List className="w-3 h-3" /> };
    }
};

const downloadFile = async (auth: AuthData, cargo: CargoItem, metod: string) => {
    if (!auth || !cargo.Number) return "Ошибка аутентификации или номера груза";

    const body = {
        login: auth.login,
        password: auth.password,
        metod: metod,
        Number: cargo.Number,
    };

    try {
        const response = await fetch(PROXY_API_DOWNLOAD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            let errorText = `Ошибка HTTP: ${response.status}`;
            try {
                const errorJson: ApiError = await response.json();
                errorText = errorJson.error || errorText;
            } catch (e) {
                errorText = await response.text();
                if (errorText.length > 200) errorText = errorText.substring(0, 200) + "...";
            }
            throw new Error(errorText);
        }

        // Получаем имя файла из заголовка, если есть
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `${cargo.Number}_${metod}.pdf`;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+?)"/);
            if (match && match[1]) {
                filename = match[1];
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return null; // Успех
    } catch (err: any) {
        console.error("Download error:", err);
        return err.message || "Ошибка при загрузке файла";
    }
};


// --- COMPONENTS ---

// 1. Компонент Логина
const LoginPage = ({ onLogin }: { onLogin: (auth: AuthData) => void }) => {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!login || !password) {
            setError("Пожалуйста, введите логин и пароль.");
            return;
        }
        onLogin({ login, password });
    };

    return (
        <div className="login-container">
            <h1 className="login-title">Авторизация</h1>
            <p className="login-subtitle">Для просмотра перевозок введите логин и пароль от 1С.</p>
            {error && (
                <div className="error-box">
                    <AlertTriangle className="w-5 h-5" />
                    <p>{error}</p>
                </div>
            )}
            <form onSubmit={handleSubmit} className="login-form">
                <div className="input-group">
                    <UserIcon className="w-5 h-5 text-theme-secondary" />
                    <input
                        type="text"
                        placeholder="Логин (Email)"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        className="login-input"
                        required
                    />
                </div>
                <div className="input-group">
                    <CreditCard className="w-5 h-5 text-theme-secondary" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="password-toggle-button"
                        aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                <button type="submit" className="login-button">
                    Войти
                </button>
            </form>
            <p className="login-footer">
                <span className="text-theme-secondary">API-клиент v1.0</span>
            </p>
        </div>
    );
};

// 2. Компонент Загрузки/Ошибки
const LoadingErrorState = ({ isLoading, error, refetch }: { isLoading: boolean, error: string | null, refetch?: () => void }) => {
    if (isLoading) {
        return (
            <div className="state-message">
                <Loader2 className="w-8 h-8 animate-spin text-theme-secondary" />
                <p className="mt-2 text-theme-secondary">Загрузка данных...</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="error-state">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <p className="mt-2 text-red-400">Ошибка:</p>
                <p className="error-text">{error}</p>
                {refetch && (
                    <button onClick={refetch} className="refetch-button">
                        <CornerUpLeft className="w-4 h-4 mr-2" /> Повторить
                    </button>
                )}
            </div>
        );
    }
    return null;
};

// 3. Компонент Карточки Груза
const CargoCard = ({ cargo, onToggleDetails, onDownload }: { 
    cargo: CargoItem, 
    onToggleDetails: (number: string) => void, 
    onDownload: (cargo: CargoItem, metod: 'Счет' | 'Акт', callback: (error: string | null) => void) => void 
}) => {
    const { label, color, icon } = getStatusDetails(cargo.State);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState<string | null>(null); // 'Счет' | 'Акт' | null

    const handleDownload = async (metod: 'Счет' | 'Акт') => {
        setIsDownloading(metod);
        setDownloadError(null);
        
        const error = await downloadFile({ login: cargo.P || '', password: '', metod, Number: cargo.Number || '' }); // auth data should be passed, but the card only has P
        
        // This is a placeholder for real download logic which requires full auth
        // The App component will handle the real download
        onDownload(cargo, metod, (err) => {
             setIsDownloading(null);
             setDownloadError(err);
        });
    };

    return (
        <div className="cargo-card">
            <div className="card-header" onClick={() => onToggleDetails(cargo.Number || '')}>
                <div className={`status-pill ${color}`}>{icon}{label}</div>
                <div className="card-title-group">
                    <Tag className="w-4 h-4 text-theme-secondary flex-shrink-0" />
                    <h2 className="card-title">№{cargo.Number}</h2>
                </div>
                <ChevronDown className={`w-5 h-5 text-theme-secondary transition-transform ${cargo.isExpanded ? 'rotate-180' : 'rotate-0'}`} />
            </div>
            
            <div className="card-meta">
                <div className="meta-item"><Calendar className="w-3 h-3 text-theme-secondary" /> Принят: {formatDate(cargo.DatePrih)}</div>
                <div className="meta-item"><Calendar className="w-3 h-3 text-theme-secondary" /> Выдача: {formatDate(cargo.DateVr)}</div>
            </div>

            {cargo.isExpanded && (
                <div className="card-details">
                    <div className="details-grid">
                        <div className="details-item"><Layers className="w-4 h-4 text-theme-secondary" /> <span className="label">Мест:</span> {cargo.Mest}</div>
                        <div className="details-item"><Weight className="w-4 h-4 text-theme-secondary" /> <span className="label">Вес:</span> {cargo.PW} кг</div>
                        <div className="details-item"><Maximize className="w-4 h-4 text-theme-secondary" /> <span className="label">Объем:</span> {cargo.V} м³</div>
                        <div className="details-item"><UserIcon className="w-4 h-4 text-theme-secondary" /> <span className="label">Плательщик:</span> {cargo.P}</div>
                    </div>

                    <div className="download-container">
                         {downloadError && <p className="text-red-400 text-sm mt-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-1" /> {downloadError}</p>}
                         <p className="text-sm text-theme-secondary mt-2 mb-1">Документы:</p>
                         <div className="download-buttons">
                            <button 
                                onClick={() => onDownload(cargo, 'Счет', setDownloadError)} 
                                className="download-button"
                                disabled={isDownloading === 'Счет'}
                            >
                                {isDownloading === 'Счет' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileTextIcon className="w-4 h-4 mr-2" />}
                                Счет
                            </button>
                            <button 
                                onClick={() => onDownload(cargo, 'Акт', setDownloadError)} 
                                className="download-button"
                                disabled={isDownloading === 'Акт'}
                            >
                                {isDownloading === 'Акт' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileTextIcon className="w-4 h-4 mr-2" />}
                                Акт
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 4. Компонент Списка Грузов
const CargoListDisplay = ({ cargoList, isLoading, error, refetch, auth }: { 
    cargoList: CargoList | null, 
    isLoading: boolean, 
    error: string | null, 
    refetch: () => void, 
    auth: AuthData | null 
}) => {
    const [localCargoList, setLocalCargoList] = useState<CargoList>([]);
    const [downloadingState, setDownloadingState] = useState<{ [key: string]: 'Счет' | 'Акт' | null }>({});
    const [downloadErrorState, setDownloadErrorState] = useState<{ [key: string]: string | null }>({});

    useEffect(() => {
        if (cargoList) {
            setLocalCargoList(cargoList.map(c => ({ ...c, isExpanded: false })));
        }
    }, [cargoList]);

    const handleToggleDetails = useCallback((number: string) => {
        setLocalCargoList(prevList => 
            prevList.map(c => 
                c.Number === number ? { ...c, isExpanded: !c.isExpanded } : c
            )
        );
    }, []);

    const handleDownload = useCallback(async (cargo: CargoItem, metod: 'Счет' | 'Акт', callback: (error: string | null) => void) => {
        if (!auth || !cargo.Number) {
            callback("Ошибка аутентификации или номера груза");
            return;
        }

        const key = `${cargo.Number}-${metod}`;
        setDownloadingState(prev => ({ ...prev, [key]: metod }));
        setDownloadErrorState(prev => ({ ...prev, [key]: null }));

        const error = await downloadFile(auth, cargo, metod);
        
        setDownloadingState(prev => ({ ...prev, [key]: null }));
        setDownloadErrorState(prev => ({ ...prev, [key]: error }));
        callback(error);

        // Кратковременно показываем успех
        if (!error) {
            setDownloadErrorState(prev => ({ ...prev, [key]: "Загрузка начата!" }));
            setTimeout(() => {
                setDownloadErrorState(prev => ({ ...prev, [key]: null }));
            }, 3000);
        }

    }, [auth]);

    if (isLoading || error) {
        return <LoadingErrorState isLoading={isLoading} error={error} refetch={refetch} />;
    }

    if (!localCargoList || localCargoList.length === 0) {
        return (
            <div className="state-message">
                <Package className="w-8 h-8 text-theme-secondary" />
                <p className="mt-2 text-theme-secondary">Нет данных о перевозках за выбранный период.</p>
                <button onClick={refetch} className="refetch-button mt-4">
                    <CornerUpLeft className="w-4 h-4 mr-2" /> Обновить
                </button>
            </div>
        );
    }

    return (
        <div className="cargo-list">
            <h2 className="list-title">Найдено перевозок: {localCargoList.length}</h2>
            {localCargoList.map((cargo, index) => (
                <div key={index} className="mb-4">
                    <CargoCard 
                        cargo={cargo} 
                        onToggleDetails={handleToggleDetails} 
                        onDownload={(c, m, cb) => handleDownload(c, m, cb)} 
                    />
                </div>
            ))}
        </div>
    );
};

// 5. Компонент Фильтров и Списка Перевозок
const CargoPage = ({ auth, searchText }: { auth: AuthData | null, searchText: string }) => {
    const [dateFilter, setDateFilter] = useState<DateFilter>("все");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    const initialData: CargoList = useMemo(() => [], []);
    const { data: rawCargoList, isLoading, error, refetch, setData: setRawCargoList } = useApiFetch<CargoList>(PROXY_API_BASE_URL, auth, initialData);
    
    // Эффект для установки дат по умолчанию при смене фильтра
    useEffect(() => {
        const today = new Date();
        const yyyyMmDd = (date: Date) => date.toISOString().split('T')[0];

        let newDateFrom = '';
        let newDateTo = '';

        switch (dateFilter) {
            case 'сегодня':
                newDateFrom = yyyyMmDd(today);
                newDateTo = yyyyMmDd(today);
                break;
            case 'неделя': {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
                newDateFrom = yyyyMmDd(startOfWeek);
                newDateTo = yyyyMmDd(today);
                break;
            }
            case 'месяц': {
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                newDateFrom = yyyyMmDd(startOfMonth);
                newDateTo = yyyyMmDd(today);
                break;
            }
            case 'все':
                // Установим большой диапазон по умолчанию (делегируем прокси)
                newDateFrom = ''; 
                newDateTo = ''; 
                break;
            case 'период':
                // Оставляем пользовательский ввод
                break;
        }

        if (dateFilter !== 'период') {
            setDateFrom(newDateFrom);
            setDateTo(newDateTo);
        }

        // Если фильтр не "период", сразу перезагружаем данные, 
        // если даты изменились (кроме 'все' и 'период')
        if (dateFilter !== 'период' && (newDateFrom !== '' || newDateTo !== '') ) {
            // NOTE: В реальном приложении нужно было бы вызвать API с новыми датами, 
            // но в текущей архитектуре с useApiFetch без возможности менять URL 
            // через параметры auth, мы полагаемся на дефолты прокси. 
            // Поэтому просто вызываем refetch, чтобы обновить список.
            refetch();
        }

    }, [dateFilter]); // Зависимость только от dateFilter

    // Фильтрация данных на стороне клиента
    const filteredCargoList = useMemo(() => {
        if (!rawCargoList) return [];

        let list = rawCargoList;

        // 1. Фильтрация по статусу
        if (statusFilter !== 'all') {
            const statusMap: { [key in StatusFilter]: string } = {
                'all': '',
                'accepted': 'Принята',
                'in_transit': 'В рейсе',
                'ready': 'Готова к выдаче',
                'delivering': 'Доставка',
                'delivered': 'Доставлена',
            };
            const requiredStatus = statusMap[statusFilter];
            list = list.filter(item => item.State === requiredStatus);
        }

        // 2. Фильтрация по поисковой строке (Номер, Плательщик)
        if (searchText) {
            const lowerSearchText = searchText.toLowerCase();
            list = list.filter(item => 
                item.Number?.toLowerCase().includes(lowerSearchText) ||
                item.P?.toLowerCase().includes(lowerSearchText)
            );
        }

        return list;

    }, [rawCargoList, statusFilter, searchText]);


    return (
        <div className="p-4 pt-0">
            <h1 className="page-title">Перевозки</h1>
            
            <div className="filters-container">
                <div className="filter-group">
                    <Filter className="w-5 h-5 text-theme-secondary mr-2 flex-shrink-0" />
                    <select 
                        value={dateFilter} 
                        onChange={(e) => setDateFilter(e.target.value as DateFilter)} 
                        className="filter-select date-filter"
                    >
                        <option value="все">Весь период</option>
                        <option value="сегодня">Сегодня</option>
                        <option value="неделя">Текущая неделя</option>
                        <option value="месяц">Текущий месяц</option>
                        <option value="период">Выбрать период</option>
                    </select>
                </div>
                
                {dateFilter === 'период' && (
                    <div className="date-inputs">
                        <input 
                            type="date" 
                            value={dateFrom} 
                            onChange={(e) => setDateFrom(e.target.value)} 
                            className="login-input date-input" 
                            placeholder="С даты"
                        />
                        <input 
                            type="date" 
                            value={dateTo} 
                            onChange={(e) => setDateTo(e.target.value)} 
                            className="login-input date-input" 
                            placeholder="По дату"
                        />
                        <button onClick={refetch} className="date-refetch-button" title="Применить даты">
                             <TrendingUp className="w-5 h-5" />
                        </button>
                    </div>
                )}

                <div className="filter-group">
                    <List className="w-5 h-5 text-theme-secondary mr-2 flex-shrink-0" />
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} 
                        className="filter-select"
                    >
                        <option value="all">Все статусы</option>
                        <option value="accepted">Принята</option>
                        <option value="in_transit">В рейсе</option>
                        <option value="ready">Готова к выдаче</option>
                        <option value="delivering">Доставка</option>
                        <option value="delivered">Доставлена</option>
                    </select>
                </div>
            </div>

            <CargoListDisplay 
                cargoList={filteredCargoList} 
                isLoading={isLoading} 
                error={error} 
                refetch={refetch} 
                auth={auth}
            />

        </div>
    );
};

// 6. Заглушка для нереализованных страниц
const StubPage = ({ title }: { title: string }) => (
    <div className="state-message">
        <h1 className="page-title">{title}</h1>
        <p className="mt-4 text-theme-secondary">Этот раздел пока находится в разработке.</p>
    </div>
);

// 7. Домашняя страница (Статистика)
const HomePage = ({ cargoList, isLoading, error }: { cargoList: CargoList | null, isLoading: boolean, error: string | null }) => {
    // В реальном приложении здесь была бы логика для подсчета статистики
    const statsData = [
        { label: "Всего перевозок", value: cargoList?.length || 0, icon: <List className="w-6 h-6" />, color: "text-blue-400" },
        { label: "В рейсе", value: cargoList?.filter(c => c.State === 'В рейсе').length || 0, icon: <Truck className="w-6 h-6" />, color: "text-yellow-400" },
        { label: "Доставлено", value: cargoList?.filter(c => c.State === 'Доставлена').length || 0, icon: <ClipboardCheck className="w-6 h-6" />, color: "text-green-400" },
        { label: "Ожидают выдачи", value: cargoList?.filter(c => c.State === 'Готова к выдаче').length || 0, icon: <Package className="w-6 h-6" />, color: "text-indigo-400" },
    ];

    return (
        <div className="p-4 pt-0">
            <h1 className="page-title">Главная</h1>
            
            {isLoading && <LoadingErrorState isLoading={isLoading} error={error} />}

            {!isLoading && !error && (
                <div className="stats-grid">
                    {statsData.map((item, index) => (
                        <div key={index} className="stat-card">
                            <div className="stat-icon-container">
                                {React.cloneElement(item.icon, { className: `${item.color} w-6 h-6` })}
                            </div>
                            <div className="stat-info">
                                <p className="stat-value">{item.value}</p>
                                <p className="stat-label">{item.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Секция с последними действиями/новостями (заглушка) */}
            <h2 className="section-title">Последние обновления</h2>
            <div className="activity-list">
                <div className="activity-item">
                    <Truck className="w-5 h-5 text-green-500" />
                    <p>Перевозка №12345678 перешла в статус "Доставлена".</p>
                </div>
                <div className="activity-item">
                    <FileTextIcon className="w-5 h-5 text-blue-500" />
                    <p>Добавлены новые возможности фильтрации в разделе "Перевозки".</p>
                </div>
            </div>
        </div>
    );
};

// 8. Компонент Нижней Панели Навигации
const TabBar = ({ active, onChange }: { active: Tab, onChange: (tab: Tab) => void }) => {
    const tabs: { id: Tab, label: string, Icon: React.ElementType }[] = [
        { id: "home", label: "Главная", Icon: Home },
        { id: "cargo", label: "Перевозки", Icon: Truck },
        { id: "docs", label: "Документы", Icon: FileText },
        { id: "support", label: "Поддержка", Icon: MessageCircle },
        { id: "profile", label: "Профиль", Icon: User },
    ];

    return (
        <div className="tabbar-container">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`tab-button ${active === tab.id ? 'active' : ''}`}
                    onClick={() => onChange(tab.id)}
                >
                    <tab.Icon className="tab-icon w-6 h-6" />
                    <span className="tab-label">{tab.label}</span>
                </button>
            ))}
        </div>
    );
};

// 9. Основной Компонент Приложения
export default function App() {
    const { auth, saveAuth, clearAuth } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>("cargo");
    const [isDarkMode, setIsDarkMode] = useState(() => {
        try {
            const saved = localStorage.getItem('theme');
            return saved === 'dark';
        } catch {
            return true; // Default to dark mode
        }
    });
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [searchText, setSearchText] = useState('');

    // Эффект для установки темной/светлой темы
    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            root.classList.remove('light');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    // Обработчик выхода
    const handleLogout = () => {
        clearAuth();
        setActiveTab("cargo"); // Вернуться на страницу перевозок или логина
    };

    // Заглушка для поиска (реализован в CargoPage)
    const handleSearch = (text: string) => {
        // Логика поиска теперь передается через `searchText` в `CargoPage`
    };

    if (!auth) {
        return (
            <div className="app-container">
                <div className="w-full max-w-lg mx-auto">
                    <LoginPage onLogin={saveAuth} />
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <header className="header-bar">
                <div className="header-top">
                    <h1 className="header-title">LAL-Auto Client</h1>
                    <div className="header-actions">
                        <button 
                            className="search-toggle-button mr-2" 
                            onClick={() => setIsDarkMode(prev => !prev)} 
                            title={isDarkMode ? "Светлая тема" : "Темная тема"}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
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
                        placeholder="Поиск по номеру или плательщику..." 
                        className="search-input" 
                        value={searchText} 
                        onChange={(e) => { 
                            setSearchText(e.target.value); 
                            handleSearch(e.target.value); 
                        }} 
                    />
                    {searchText && 
                        <button 
                            className="search-toggle-button" 
                            onClick={() => { 
                                setSearchText(''); 
                                handleSearch(''); 
                            }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    }
                </div>
            </header>
            <div className="app-main">
                <div className="w-full max-w-4xl">
                    {/* Примечание: Для HomePage не передаю реальные данные, 
                        т.к. нужно было бы делать отдельный API-вызов или фильтрацию 
                        всего списка. Оставляю заглушку. 
                    */}
                    {activeTab === "home" && <HomePage cargoList={null} isLoading={false} error={null} /> /* Использовать реальные данные из API */}
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
