import { FormEvent, useEffect, useState, useCallback, useMemo } from "react";
import { 
    LogOut, Home, Truck, FileText, MessageCircle, User, Loader2, Check, X, Moon, Sun, Eye, EyeOff, AlertTriangle, Package, Calendar, Tag, Layers, Weight, Filter, Search, ChevronDown, User as UserIcon, Scale, List, Download, FileText as FileTextIcon, Send, 
    RussianRuble, // Иконка рубля
    Globe, // Для "Объем"
    ClipboardCheck, // Для "Счета: Оплачен"
    CreditCard, // Для "Счета: К оплате"
    Minus, // Для "Счета: Нет"
    LayoutGrid, // Для "Всего перевозок"
    Maximize, // Для "Объем"
    TrendingUp, // Для "Вес"
    CornerUpLeft // Для кнопки "Назад"
} from 'lucide-react'; 

// --- КОНФИГУРАЦИЯ ---
// Точка входа для запросов на ваш прокси-сервер Vercel
const PROXY_API_BASE_URL = '/api/perevozki'; 
// Точка входа для скачивания документов (отдельный прокси)
const PROXY_API_DOWNLOAD_URL = '/api/download-doc'; 

// --- ТИПЫ ДАННЫХ ---
type AuthData = {
    login: string;
    password: string;
};

type ApiError = {
    error?: string;
    [key: string]: unknown;
};

type Tab = "home" | "cargo" | "docs" | "support" | "profile";

type CargoItem = {
    Number: string;
    State: string;
    DatePrih: string;
    DateVruch: string;
    Mest: number;
    PV: number;
    Weight: number;
    Volume: number;
    Sum: number;
    StatusSchet: string;
    AddressFrom: string;
    AddressTo: string;
};

type CargoListState = {
    list: CargoItem[] | null;
    isLoading: boolean;
    error: string | null;
}

// Тип для плитки статистики
type CargoStat = {
    key: string; // Уникальный ключ / Имя фильтра
    label: string;
    icon: React.ElementType; // Компонент Lucide-react для иконки
    value: number | string; // Значение
    unit: string; // Единица измерения
    bgColor: string; // Цвет фона
};


// ----------------- КОНСТАНТЫ ДЛЯ СТАТИСТИКИ -----------------

// Данные для плиток ПЕРВОГО УРОВНЯ (Фото 2)
const STATS_LEVEL_1: CargoStat[] = [
    { key: 'total', label: 'Всего перевозок', icon: LayoutGrid, value: 125, unit: 'шт', bgColor: 'bg-indigo-500' },
    { key: 'payments', label: 'Счета', icon: RussianRuble, value: '1,250,000', unit: '₽', bgColor: 'bg-green-500' },
    { key: 'weight', label: 'Вес', icon: TrendingUp, value: 5400, unit: 'кг', bgColor: 'bg-yellow-500' },
    { key: 'volume', label: 'Объем', icon: Maximize, value: 125, unit: 'м³', bgColor: 'bg-pink-500' },
];

// Данные для плиток ВТОРОГО УРОВНЯ (Фото 3-6)
const STATS_LEVEL_2: { [key: string]: CargoStat[] } = {
    // Фото 3 (Всего перевозок)
    total: [
        { key: 'total_new', label: 'В работе', icon: Truck, value: 35, unit: 'шт', bgColor: 'bg-blue-400' },
        { key: 'total_in_transit', label: 'В пути', icon: TrendingUp, value: 50, unit: 'шт', bgColor: 'bg-indigo-400' },
        { key: 'total_completed', label: 'Завершено', icon: Check, value: 40, unit: 'шт', bgColor: 'bg-green-400' },
        { key: 'total_cancelled', label: 'Отменено', icon: X, value: 0, unit: 'шт', bgColor: 'bg-red-400' },
    ],
    // Фото 4 (Счета)
    payments: [
        { key: 'pay_paid', label: 'Оплачено', icon: ClipboardCheck, value: 750000, unit: '₽', bgColor: 'bg-green-400' },
        { key: 'pay_due', label: 'К оплате', icon: CreditCard, value: 500000, unit: '₽', bgColor: 'bg-yellow-400' },
        { key: 'pay_none', label: 'Нет счета', icon: Minus, value: 0, unit: 'шт', bgColor: 'bg-gray-400' },
    ],
    // Фото 5 (Вес)
    weight: [
        { key: 'weight_current', label: 'Общий вес', icon: Weight, value: 5400, unit: 'кг', bgColor: 'bg-red-400' },
        { key: 'weight_paid', label: 'Платный вес', icon: Scale, value: 4500, unit: 'кг', bgColor: 'bg-orange-400' },
        { key: 'weight_free', label: 'Бесплатный вес', icon: Layers, value: 900, unit: 'кг', bgColor: 'bg-purple-400' },
    ],
    // Фото 6 (Объем)
    volume: [
        { key: 'vol_current', label: 'Объем всего', icon: Maximize, value: 125, unit: 'м³', bgColor: 'bg-pink-400' },
        { key: 'vol_boxes', label: 'Кол-во мест', icon: Layers, value: 125, unit: 'шт', bgColor: 'bg-teal-400' },
    ],
};


// --- ФУНКЦИИ-ПОМОЩНИКИ ---

// Генерирует Base64 заголовок для прокси-сервера
const getAuthHeader = (login: string, password: string): { Authorization: string } => {
    const credentials = `${login}:${password}`;
    // btoa доступен в браузере
    const encoded = btoa(credentials); 
    return {
        Authorization: `Basic ${encoded}`,
    };
};

const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        // Формат ДД.ММ.ГГГГ
        return date.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
        return dateStr;
    }
};

const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return '-';
    // Формат с пробелами в тысячах
    return amount.toLocaleString('ru-RU');
};

const getStatusClass = (status: string | undefined): string => {
    if (!status) return 'text-theme-secondary';
    switch (status.toLowerCase()) {
        case 'отгружен':
        case 'в пути':
            return 'text-yellow-600 font-medium';
        case 'завершено':
        case 'доставлен':
        case 'оплачен':
            return 'text-green-600 font-medium';
        case 'отменен':
            return 'text-red-600 font-medium';
        default:
            return 'text-theme-secondary';
    }
};

// Функция для получения списка перевозок с прокси
const fetchCargoList = async (auth: AuthData, dateFrom: string, dateTo: string, signal: AbortSignal): Promise<CargoItem[]> => {
    // В реальном приложении здесь должен быть запрос к PROXY_API_BASE_URL
    // В рамках этого примера возвращаем моковые данные
    
    // Имитация задержки сети
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (auth.login === 'error') {
        throw new Error("Ошибка API: Не удалось получить список перевозок.");
    }

    const mockData: CargoItem[] = [
        { Number: 'ТДН-10001', State: 'Завершено', DatePrih: '2024-05-15', DateVruch: '2024-05-16', Mest: 10, PV: 500, Weight: 600, Volume: 5.5, Sum: 150000, StatusSchet: 'Оплачен', AddressFrom: 'Москва, ул. Тверская, 1', AddressTo: 'Санкт-Петербург, пр. Невский, 10' },
        { Number: 'ТДН-10002', State: 'В пути', DatePrih: '2024-05-20', DateVruch: '', Mest: 5, PV: 200, Weight: 250, Volume: 2.1, Sum: 85000, StatusSchet: 'К оплате', AddressFrom: 'Екатеринбург, ул. Ленина, 5', AddressTo: 'Новосибирск, ул. Кирова, 20' },
        { Number: 'ТДН-10003', State: 'Отгружен', DatePrih: '2024-06-01', DateVruch: '', Mest: 20, PV: 1000, Weight: 1100, Volume: 10.0, Sum: 250000, StatusSchet: 'Нет счета', AddressFrom: 'Казань, ул. Баумана, 3', AddressTo: 'Самара, ул. Московская, 15' },
    ];

    // Базовый фильтр по датам (моковая реализация)
    const filteredList = mockData.filter(item => {
        const itemDate = new Date(item.DatePrih);
        const dateB = new Date(dateFrom);
        const dateE = new Date(dateTo);
        return itemDate >= dateB && itemDate <= dateE;
    });

    return filteredList;
};

// ----------------- КОМПОНЕНТ ПЛИТКИ СТАТИСТИКИ -----------------

type StatCardProps = CargoStat & {
    onClick: () => void;
    isPrimary: boolean; // Для плиток 1 уровня
    showBack?: boolean; // Для кнопки "Назад"
};

const StatCard: React.FC<StatCardProps> = ({ label, icon: Icon, value, unit, bgColor, onClick, isPrimary, showBack }) => {
    // Внутреннее форматирование числа: тысячи с пробелами
    const formattedValue = typeof value === 'number' 
        ? value.toLocaleString('ru-RU') 
        : value;

    return (
        <div 
            className={`stat-card ${isPrimary ? 'stat-card-primary' : 'stat-card-secondary'} ${bgColor}`} 
            onClick={onClick}
        >
            <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium opacity-80">{label}</p>
                {/* Кнопка назад отображается только на 2-м уровне */}
                {showBack && (
                    <CornerUpLeft className="w-4 h-4 text-white opacity-90" />
                )}
            </div>
            <div className="flex items-end justify-between">
                <div className="flex items-baseline">
                    <p className="text-2xl font-bold">{formattedValue}</p>
                    {unit && <span className="text-xs ml-1 opacity-90">{unit}</span>}
                </div>
                <Icon className="w-6 h-6 opacity-80" />
            </div>
        </div>
    );
};

// ----------------- КОМПОНЕНТ ДЕТАЛИЗАЦИИ ГРУЗА (CargoDetailsModal) -----------------

type CargoDetailsModalProps = {
    item: CargoItem;
    isOpen: boolean;
    onClose: () => void;
    auth: AuthData; 
};

function CargoDetailsModal({ item, isOpen, onClose, auth }: CargoDetailsModalProps) {
    
    const [downloading, setDownloading] = useState<string | null>(null); // 'ЭР', 'АПП', 'СЧЕТ', 'УПД'
    const [downloadError, setDownloadError] = useState<string | null>(null);

    if (!isOpen) return null;

    // Вспомогательная функция для отображения значения
    const renderValue = (value: number | string | undefined, unit: string = '') => {
        if (value === undefined || value === null || value === "") return '-';
        const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
        if (!isNaN(num) && Math.floor(num) === num) {
            return `${Math.floor(num)}${unit ? ' ' + unit : ''}`;
        }
        return `${value}${unit ? ' ' + unit : ''}`;
    };

    // РЕАЛИЗАЦИЯ СКАЧИВАНИЯ ДОКУМЕНТОВ (функция-заглушка)
    const handleDownload = useCallback(async (docType: string) => {
        if (!item.Number) {
            alert("Невозможно скачать: отсутствует номер перевозки.");
            return;
        }

        setDownloading(docType);
        setDownloadError(null);
        
        try {
            // Имитация запроса на скачивание
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Имитация успешного скачивания (в реальном коде здесь была бы логика с blob и window.URL.createObjectURL)
            alert(`Документ ${docType} для перевозки №${item.Number} успешно скачан (имитация).`);
            
            setDownloadError(null);
        } catch (e: any) {
            setDownloadError(e?.message || `Ошибка сети при скачивании ${docType}.`);
        } finally {
            setDownloading(null);
        }
    }, [item.Number]);
    
    // --- ЛОГИКА ДЛЯ НОВЫХ КНОПОК ---
    
    const handleChat = () => {
        // Заглушка: Открытие ссылки на поддержку в Telegram
        const supportLink = 'https://t.me/haulz_support'; 
        
        // Telegram Web App API
        if ((window as any).Telegram && (window as any).Telegram.WebApp.openTelegramLink) {
            (window as any).Telegram.WebApp.openTelegramLink(supportLink);
        } else {
            window.open(supportLink, '_blank');
        }
    };
    
    const handleShare = () => {
        const shareText = `Перевозка №${item.Number || '-'}: Статус - ${item.State || 'Неизвестно'}, Сумма - ${formatCurrency(item.Sum)} ₽.`;
        
        // Telegram Web App API для шаринга
        if ((window as any).Telegram && (window as any).Telegram.WebApp.shareUrl) {
            const shareUrl = `${window.location.origin}/cargo/${item.Number}`; 
            (window as any).Telegram.WebApp.shareUrl(shareUrl, {
                text: shareText
            });
        } else {
            // Запасной вариант: скопировать текст
            navigator.clipboard.writeText(shareText + ' (Ссылка на мини-приложение: ' + window.location.href + ')');
            alert(`Информация о перевозке скопирована в буфер обмена:\n\n${shareText}`);
        }
    };


    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="flex items-center">
                        <Truck className="w-5 h-5 mr-2 text-theme-primary" />
                        Перевозка №{item.Number || '-'}
                    </h3>
                    <button className="modal-close-button" onClick={onClose}>
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {downloadError && <p className="login-error mb-4"><AlertTriangle className="w-5 h-5 mr-2" />{downloadError}</p>}
                
                {/* --- НОВЫЙ БЛОК: КНОПКИ ДЕЙСТВИЙ (ЧАТ И ШАРИНГ) --- */}
                <div className="document-buttons mb-4">
                     <button 
                        className="doc-button" 
                        onClick={handleChat}
                    >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Написать в чате
                    </button>
                    <button 
                        className="doc-button" 
                        onClick={handleShare}
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Отправить в мессенджерах
                    </button>
                </div>
                {/* --------------------------------------------------------- */}

                <div className="details-grid">
                    {/* ... (остальные детали) */}
                    <div className="details-item">
                        <div className="details-label">Номер перевозки</div>
                        <div className="details-value">{item.Number || '-'}</div>
                    </div>
                    <div className="details-item">
                        <div className="details-label">Статус</div>
                        <div className={getStatusClass(item.State)}>{item.State || '-'}</div>
                    </div>
                    <div className="details-item">
                        <div className="details-label">Дата прихода</div>
                        <div className="details-value">{formatDate(item.DatePrih)}</div>
                    </div>
                    <div className="details-item">
                        <div className="details-label">Дата вручения</div>
                        <div className="details-value">{formatDate(item.DateVruch)}</div>
                    </div>
                    <div className="details-item">
                        <div className="details-label">Кол-во мест</div>
                        <div className="details-value flex items-center"><Layers className="w-4 h-4 mr-1 text-theme-primary" />{renderValue(item.Mest)}</div>
                    </div>
                    <div className="details-item">
                        <div className="details-label">Платный вес</div>
                        <div className="details-value flex items-center"><Scale className="w-4 h-4 mr-1 text-theme-primary" />{renderValue(item.PV, 'кг')}</div>
                    </div>
                    <div className="details-item">
                        <div className="details-label">Общий вес</div>
                        <div className="details-value flex items-center"><Weight className="w-4 h-4 mr-1 text-theme-primary" />{renderValue(item.Weight, 'кг')}</div>
                    </div>
                    <div className="details-item">
                        <div className="details-label">Объем</div>
                        <div className="details-value flex items-center"><List className="w-4 h-4 mr-1 text-theme-primary" />{renderValue(item.Volume, 'м³')}</div>
                    </div>
                    
                    {/* Стоимость: иконка DollarSign заменена на RussianRuble */}
                    <div className="details-item">
                        <div className="details-label">Стоимость</div>
                        <div className="details-value flex items-center">
                            <RussianRuble className="w-4 h-4 mr-1 text-theme-primary" /> 
                            {formatCurrency(item.Sum)}
                        </div>
                    </div>
                    {/* Статус счета */}
                    <div className="details-item">
                        <div className="details-label">Статус счета</div>
                        <div className="details-value">{item.StatusSchet || '-'}</div>
                    </div>
                </div>

                <h4><FileTextIcon className="w-4 h-4 mr-2 inline-block text-theme-secondary" />Документы для скачивания</h4>
                <div className="document-buttons">
                    {['ЭР', 'АПП', 'СЧЕТ', 'УПД'].map((doc) => (
                         <button 
                            key={doc}
                            className="doc-button" 
                            onClick={() => handleDownload(doc)}
                            disabled={downloading === doc || !item.Number}
                        >
                            {downloading === doc ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4 mr-2" />
                            )}
                            {doc}
                        </button>
                    ))}
                </div>

            </div>
        </div>
    );
}

// ----------------- КОМПОНЕНТ КАРТОЧКИ ПЕРЕВОЗКИ (CargoCard) -----------------

type CargoCardProps = {
    item: CargoItem;
    onClick: (item: CargoItem) => void;
};

const CargoCard: React.FC<CargoCardProps> = ({ item, onClick }) => (
    <div className="perevozka-card" onClick={() => onClick(item)}>
        <div className="card-header">
            <h5 className="text-base font-semibold text-theme-text flex items-center">
                <Tag className="w-4 h-4 mr-2 text-theme-primary" />
                №{item.Number}
            </h5>
            <div className={getStatusClass(item.State)}>{item.State || 'Неизвестно'}</div>
        </div>
        <div className="p-3">
            <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-theme-secondary flex items-center"><Package className="w-4 h-4 mr-1" />Мест:</span>
                <span className="text-theme-text font-medium">{item.Mest || '-'}</span>
            </div>
            <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-theme-secondary flex items-center"><RussianRuble className="w-4 h-4 mr-1" />Сумма:</span>
                <span className="text-theme-text font-medium">{formatCurrency(item.Sum)}</span>
            </div>
            <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-theme-secondary flex items-center"><Calendar className="w-4 h-4 mr-1" />Приход:</span>
                <span className="text-theme-text">{formatDate(item.DatePrih)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-theme-secondary flex items-center"><Calendar className="w-4 h-4 mr-1" />Вручение:</span>
                <span className="text-theme-text">{formatDate(item.DateVruch)}</span>
            </div>
        </div>
    </div>
);


// ----------------- КОМПОНЕНТ ГЛАВНОЙ СТРАНИЦЫ (CargoPage) -----------------

type CargoPageProps = CargoListState & {
    auth: AuthData;
    onShowDetails: (item: CargoItem) => void;
    fetchList: (auth: AuthData, dateFrom: string, dateTo: string) => void;
};

function CargoPage({ auth, onShowDetails, cargoList, isLoading, error, fetchList }: CargoPageProps) {
    const [dateFrom, setDateFrom] = useState("2024-01-01");
    const [dateTo, setDateTo] = useState("2026-01-01");
    
    // Новые состояния для виджета статистики
    const [filterLevel, setFilterLevel] = useState<1 | 2>(1); // 1 или 2 уровень плиток
    const [currentFilter, setCurrentFilter] = useState<string | null>(null); // Ключ активного фильтра первого уровня
    const [searchText, setSearchText] = useState(""); // Состояние для поисковой строки

    // Эффект для первоначальной загрузки
    useEffect(() => {
        // Загрузка при первом рендере и при изменении дат
        if (auth) {
            fetchList(auth, dateFrom, dateTo);
        }
    }, [auth, dateFrom, dateTo]);
    
    // 1. Выбор текущего набора плиток
    const currentStats = useMemo(() => {
        if (filterLevel === 2 && currentFilter && STATS_LEVEL_2[currentFilter]) {
            return STATS_LEVEL_2[currentFilter];
        }
        return STATS_LEVEL_1;
    }, [filterLevel, currentFilter]);
    
    // 2. Логика обработки клика по плитке
    const handleStatClick = (statKey: string) => {
        if (filterLevel === 1) {
            // Переход на 2 уровень, если есть данные
            if (STATS_LEVEL_2[statKey]) {
                setCurrentFilter(statKey);
                setFilterLevel(2);
                // Здесь можно запустить фильтрацию списка перевозок
            }
        } else if (filterLevel === 2) {
            // Возврат на 1 уровень (повторное нажатие на плитку 2 уровня возвращает на 1 уровень)
            setCurrentFilter(null);
            setFilterLevel(1);
        }
    };

    // 3. Фильтрация списка перевозок по поисковой строке (простая моковая реализация)
    const filteredCargoList = useMemo(() => {
        if (!cargoList) return [];
        const lowerSearchText = searchText.toLowerCase();
        
        return cargoList.filter(item => 
            item.Number.toLowerCase().includes(lowerSearchText) ||
            item.State.toLowerCase().includes(lowerSearchText) ||
            item.AddressFrom.toLowerCase().includes(lowerSearchText) ||
            item.AddressTo.toLowerCase().includes(lowerSearchText)
        );
    }, [cargoList, searchText]);


    return (
        <div className="w-full max-w-lg">
            
            {/* --- HEADER С ЛОГИНОМ И ПОИСКОМ --- */}
            <div className="cargo-header">
                {/* Левая часть: Логин */}
                <div className="user-greeting">
                    <p className="text-sm text-theme-secondary">Добро пожаловать,</p>
                    <p className="text-lg font-bold text-theme-text">{auth.login}</p>
                </div>
                
                {/* Правая часть: Поиск */}
                <div className="search-bar-small">
                    <Search className="w-4 h-4 text-theme-secondary absolute left-2 top-1/2 transform -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Поиск..."
                        className="search-input-small"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>
            </div>
            {/* ----------------------------------------------- */}
            
            {/* --- ВИДЖЕТ СТАТИСТИКИ (Плитки) --- */}
            <div className="stats-grid mb-6">
                {currentStats.map((stat, index) => (
                    // На 2-м уровне только первая карточка может служить кнопкой "Назад"
                    <StatCard 
                        key={stat.key}
                        {...stat}
                        onClick={() => handleStatClick(stat.key)}
                        isPrimary={filterLevel === 1}
                        // Добавляем иконку назад только на первую карточку 2-го уровня
                        showBack={filterLevel === 2 && index === 0} 
                    />
                ))}
            </div>
            
            {/* --- ДАТЫ И КНОПКА ОБНОВЛЕНИЯ --- */}
            <div className="flex space-x-2 mb-4">
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="date-input"
                />
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="date-input"
                />
                <button 
                    className="button-icon" 
                    onClick={() => fetchList(auth, dateFrom, dateTo)}
                    disabled={isLoading}
                    title="Обновить список"
                >
                    <Loader2 className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* --- СПИСОК ПЕРЕВОЗОК --- */}
            {isLoading && (
                 <div className="loading-card">
                    <Loader2 className="w-6 h-6 animate-spin text-theme-primary mb-2" />
                    <p className="text-theme-secondary">Загрузка данных...</p>
                 </div>
            )}

            {!isLoading && error && (
                <div className="error-card">
                    <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
                    <p className="font-semibold text-theme-text">Ошибка загрузки:</p>
                    <p className="text-sm text-theme-secondary">{error}</p>
                </div>
            )}

            {!isLoading && filteredCargoList.length === 0 && !error && (
                <div className="empty-state-card">
                    <Package className="w-8 h-8 text-theme-secondary mb-2" />
                    <p className="text-theme-text">Перевозки не найдены</p>
                    <p className="text-sm text-theme-secondary">Попробуйте изменить период или условия поиска.</p>
                </div>
            )}
            
            {!isLoading && filteredCargoList.length > 0 && (
                <div className="cargo-list">
                    {filteredCargoList.map((item) => (
                        <CargoCard 
                            key={item.Number} 
                            item={item} 
                            onClick={onShowDetails} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ----------------- ЗАГЛУШКА ДЛЯ ДРУГИХ ВКЛАДОК -----------------

type StubPageProps = {
  title: string;
  auth: AuthData;
};

function StubPage({ title, auth }: StubPageProps) {
  return (
    <div className="stub-page">
      <h2 className="title">{title}</h2>
      <p className="subtitle">Этот раздел мы заполним позже. Ваш логин: **{auth.login}**</p>
    </div>
  );
}

// ----------------- КОМПОНЕНТ КНОПКИ НИЖНЕГО МЕНЮ -----------------

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
      className={`tab-button ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="tab-icon">{icon}</div>
      {/* Отображаем label только если он не пустой */}
      {label && <span className="tab-label">{label}</span>} 
    </button>
  );
}


// ----------------- НИЖНЕЕ МЕНЮ (TabBar) -----------------

type TabBarProps = {
  active: Tab;
  onChange: (t: Tab) => void;
};

function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="tabbar">
      <TabButton
        label="Главная"
        icon="🏠"
        active={active === "home"}
        onClick={() => onChange("home")}
      />
      <TabButton
        label="" // <-- Слово "Грузы" удалено
        icon="📦"
        active={active === "cargo"}
        onClick={() => onChange("cargo")}
      />
      <TabButton
        label="Документы"
        icon="📄"
        active={active === "docs"}
        onClick={() => onChange("docs")}
      />
      <TabButton
        label="Поддержка"
        icon="💬"
        active={active === "support"}
        onClick={() => onChange("support")}
      />
      <TabButton
        label="Профиль"
        icon="👤"
        active={active === "profile"}
        onClick={() => onChange("profile")}
      />
    </div>
  );
}


// ----------------- СТРАНИЦА АВТОРИЗАЦИИ (LoginPage) -----------------

type LoginPageProps = {
    onLogin: (auth: AuthData) => void;
};

function LoginPage({ onLogin }: LoginPageProps) {
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [agreeOffer, setAgreeOffer] = useState(false);
    const [agreePersonal, setAgreePersonal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Функция для тестового запроса (проверки авторизации)
    const checkAuth = useCallback(async (currentLogin: string, currentPassword: string, signal: AbortSignal): Promise<boolean> => {
        try {
            // В реальном приложении здесь должен быть POST-запрос к PROXY_API_BASE_URL
            // С использованием Base64 заголовка Authorization
            
            // Имитация задержки сети
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Имитация ошибки авторизации
            if (currentLogin === 'fail' || currentPassword === 'fail') {
                return false;
            }
            
            return true; // Имитация успеха
        } catch (e) {
            console.error(e);
            return false;
        }
    }, []);

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

        const controller = new AbortController();
        try {
            setLoading(true);

            // Проверяем авторизацию тестовым запросом
            const success = await checkAuth(login, password, controller.signal);

            if (success) {
                // Успешный вход
                onLogin({ login, password });
            } else {
                setError("Неверный логин или пароль. Проверьте данные.");
            }
            
        } catch (e: any) {
             if (e.name !== 'AbortError') {
                 setError(e?.message || "Ошибка сети при проверке авторизации.");
             }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="card" onSubmit={handleSubmit}>
            <h1 className="logo-text">Haulz</h1>
            <p className="tagline">Личный кабинет для грузоперевозок</p>
            <div className="card-content">
                <div className="input-group">
                    <label htmlFor="login-input" className="input-label">Логин (Email)</label>
                    <input
                        id="login-input"
                        type="email"
                        className="input"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        placeholder="test@example.com"
                        required
                    />
                </div>
                
                <div className="input-group">
                    <label htmlFor="password-input" className="input-label">Пароль</label>
                    <div className="password-wrapper">
                        <input
                            id="password-input"
                            type={showPassword ? 'text' : 'password'}
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Введите пароль"
                            required
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="password-toggle"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="checkbox-group">
                    <input
                        id="agree-offer"
                        type="checkbox"
                        checked={agreeOffer}
                        onChange={(e) => setAgreeOffer(e.target.checked)}
                        className="checkbox"
                    />
                    <label htmlFor="agree-offer" className="checkbox-label">Согласен с условиями оферты</label>
                </div>
                
                <div className="checkbox-group">
                    <input
                        id="agree-personal"
                        type="checkbox"
                        checked={agreePersonal}
                        onChange={(e) => setAgreePersonal(e.target.checked)}
                        className="checkbox"
                    />
                    <label htmlFor="agree-personal" className="checkbox-label">Согласен на обработку персональных данных</label>
                </div>

                {error && <p className="error">{error}</p>}

                <button type="submit" className="button button-primary mt-6" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 inline-block animate-spin" />
                            Проверка...
                        </>
                    ) : (
                        "Войти"
                    )}
                </button>
            </div>
        </form>
    );
}

// ----------------- ГЛАВНЫЙ КОМПОНЕНТ APP -----------------

export default function App() {
    const [auth, setAuth] = useState<AuthData | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("cargo"); 
    const [cargoListState, setCargoListState] = useState<CargoListState>({ list: null, isLoading: false, error: null });
    const [selectedCargo, setSelectedCargo] = useState<CargoItem | null>(null);
    
    // Эмуляция светлой/темной темы
    const [isThemeLight, setIsThemeLight] = useState(true);

    const toggleTheme = () => {
        setIsThemeLight(prev => {
            document.documentElement.setAttribute('data-theme', prev ? 'dark' : 'light');
            return !prev;
        });
    };

    // При выходе
    const handleLogout = () => {
        setAuth(null);
        setCargoListState({ list: null, isLoading: false, error: null });
        setSelectedCargo(null);
        setActiveTab("cargo"); // Возвращаемся на вкладку по умолчанию после выхода
    };
    
    // При успешном входе
    const handleLoginSuccess = (newAuth: AuthData) => {
        setAuth(newAuth);
        // После логина сразу пытаемся загрузить список
        // fetchList(newAuth, "2024-01-01", "2026-01-01"); // будет вызван через useEffect в CargoPage
    };
    
    // Функция для загрузки списка перевозок
    const fetchList = useCallback(async (currentAuth: AuthData, dateFrom: string, dateTo: string) => {
        const controller = new AbortController();
        setCargoListState({ list: null, isLoading: true, error: null });
        
        try {
            const list = await fetchCargoList(currentAuth, dateFrom, dateTo, controller.signal);
            setCargoListState({ list, isLoading: false, error: null });
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                setCargoListState({ list: null, isLoading: false, error: e?.message || "Неизвестная ошибка загрузки" });
            }
        }
        
        return () => controller.abort();
    }, []);


    // Рендеринг контента в зависимости от активной вкладки
    const renderContent = () => {
        if (!auth) {
            return <LoginPage onLogin={handleLoginSuccess} />;
        }

        switch (activeTab) {
            case "cargo":
                return (
                    <>
                        <CargoPage
                            auth={auth}
                            cargoList={cargoListState.list}
                            isLoading={cargoListState.isLoading}
                            error={cargoListState.error}
                            onShowDetails={setSelectedCargo}
                            fetchList={fetchList}
                        />
                        {selectedCargo && (
                            <CargoDetailsModal
                                item={selectedCargo}
                                isOpen={!!selectedCargo}
                                onClose={() => setSelectedCargo(null)}
                                auth={auth}
                            />
                        )}
                    </>
                );
            case "home":
                return <StubPage title="Главная" auth={auth} />;
            case "docs":
                return <StubPage title="Документы" auth={auth} />;
            case "support":
                return <StubPage title="Поддержка" auth={auth} />;
            case "profile":
                return <StubPage title="Профиль" auth={auth} />;
            default:
                return <StubPage title="Неизвестно" auth={auth} />;
        }
    };

    return (
        <div className={`app-container ${isThemeLight ? 'light-theme' : 'dark-theme'}`}>
            <header className="app-header">
                <div className="header-content">
                    <div className="logo-text-small">Haulz</div>
                    <div className="header-actions">
                         <button className="theme-toggle-button" onClick={toggleTheme} title="Переключить тему">
                            {isThemeLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                        </button>
                        {auth && (
                            <button className="theme-toggle-button" onClick={handleLogout} title="Выйти">
                                <LogOut className="w-5 h-5 text-red-500" />
                            </button>
                        )}
                    </div>
                </div>
            </header>
            
            <div className={`page ${auth ? 'page-with-tabs' : ''}`}>
                {renderContent()}
            </div>
            
            {auth && <TabBar active={activeTab} onChange={setActiveTab} />}
        </div>
    );
}
