import { FormEvent, useEffect, useState, useCallback, useMemo } from "react";
// Импортируем все необходимые иконки
import { 
    LogOut, Home, Truck, FileText, MessageCircle, User, Loader2, Moon, Sun, Eye, EyeOff, AlertTriangle, Package, Calendar, Tag, Layers, Weight, Filter, X, Search, ChevronDown, User as UserIcon, Scale, DollarSign, List, Download, FileText as FileTextIcon
} from 'lucide-react';
import React from "react";

// --- ТИПЫ ДАННЫХ ---
type ApiError = {
    error?: string;
    [key: string]: unknown;
};

type AuthData = {
    login: string;
    password: string;
};

type Tab = "home" | "cargo" | "docs" | "support" | "profile";

type DateFilter = "all" | "today" | "week" | "month" | "custom";
type StatusFilter = "all" | "accepted" | "in_transit" | "ready" | "delivering" | "delivered";

// Тип для данных о перевозке (для ясности)
type CargoItem = {
    Number: string; // Номер перевозки (обязательно для ключа)
    DatePrih?: string; // Дата прихода
    DateVruch?: string; // Дата вручения (если есть)
    State?: string; // Статус
    Mest?: number | string; // Кол-во мест
    PV?: number | string; // Платный вес (Payment Weight)
    Weight?: number | string; // Общий вес
    Volume?: number | string; // Объем
    Sum?: number | string; // Стоимость
    StatusSchet?: string; // Статус счета
    SenderCity?: string; // Город отправителя
    ReceiverCity?: string; // Город получателя
    [key: string]: any; // Дополнительные поля
};


// --- КОНФИГУРАЦИЯ ---
const PROXY_API_BASE_URL = '/api/perevozki'; 

// --- КОНСТАНТЫ ---
const DEFAULT_LOGIN = "order@lal-auto.com";
const DEFAULT_PASSWORD = "ZakaZ656565";

// Получаем текущую дату в формате YYYY-MM-DD
const getTodayDate = () => new Date().toISOString().split('T')[0];

// Получаем дату, отстоящую на ШЕСТЬ МЕСЯЦЕВ назад
const getSixMonthsAgoDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6); 
    return d.toISOString().split('T')[0];
};

// **********************************************
// ИЗМЕНЕНИЕ 1: Добавляем функцию для получения даты начала текущего года
// для более широкого диапазона "Все" по умолчанию.
const getStartOfYearDate = () => {
    const d = new Date();
    d.setMonth(0); // January
    d.setDate(1); // 1st
    return d.toISOString().split('T')[0];
};
// **********************************************


const STATUS_MAP: Record<string, { label: string, color: 'success' | 'pending' | 'danger' }> = {
    'delivered': { label: 'Доставлен', color: 'success' },
    'delivering': { label: 'Доставка', color: 'pending' },
    'ready': { label: 'Готов к выдаче', color: 'pending' },
    'in_transit': { label: 'В пути', color: 'pending' },
    'accepted': { label: 'Принят', color: 'pending' },
    'canceled': { label: 'Отменен', color: 'danger' },
};

// --- УТИЛИТЫ ДЛЯ ДАТ ---

const getDateRange = (filter: DateFilter, customDateFrom?: string, customDateTo?: string) => {
    const today = new Date();
    const dateTo = getTodayDate();
    let dateFrom = getTodayDate();

    switch (filter) {
        case 'all': // С начала года по умолчанию (изменение)
            // **********************************************
            dateFrom = getStartOfYearDate(); 
            // **********************************************
            break;
        case 'today':
            dateFrom = getTodayDate();
            break;
        case 'week':
            today.setDate(today.getDate() - 7);
            dateFrom = today.toISOString().split('T')[0];
            break;
        case 'month':
            today.setMonth(today.getMonth() - 1);
            dateFrom = today.toISOString().split('T')[0];
            break;
        case 'custom':
            // **********************************************
            dateFrom = customDateFrom || getStartOfYearDate();
            // **********************************************
            dateTo = customDateTo || getTodayDate();
            break;
        default:
            // **********************************************
            dateFrom = getStartOfYearDate();
            // **********************************************
            break;
    }
    return { dateFrom, dateTo };
}

// --- КОМПОНЕНТЫ ---

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

type TabBarProps = {
    active: Tab;
    onChange: (tab: Tab) => void;
};

function TabBar({ active, onChange }: TabBarProps) {
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

type AppHeaderProps = {
    login: string;
    isSearchExpanded: boolean;
    onSearchToggle: () => void;
    searchText: string;
    onSearchChange: (text: string) => void;
};

function AppHeader({ login, isSearchExpanded, onSearchToggle, searchText, onSearchChange }: AppHeaderProps) {
    return (
        <header className="app-header">
            <div className="header-top-row">
                <div className="logo-text text-xl">HAULZ</div>
                <div className="header-auth-info">
                    <UserIcon className="w-4 h-4 user-icon" />
                    <span>{login}</span>
                </div>
                <button type="button" className="search-toggle-button ml-4" onClick={onSearchToggle}>
                    {isSearchExpanded ? <X className="w-6 h-6" /> : <Search className="w-6 h-6" />}
                </button>
            </div>
            <div className={`search-container ${isSearchExpanded ? 'expanded' : 'collapsed'}`}>
                <Search className="w-4 h-4 text-theme-secondary ml-2" />
                <input
                    type="text"
                    className="search-input"
                    placeholder="Поиск по номеру или городу..."
                    value={searchText}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
        </header>
    );
}

type CargoDetailModalProps = {
    cargo: CargoItem;
    onClose: () => void;
};

function CargoDetailModal({ cargo, onClose }: CargoDetailModalProps) {
    const statusInfo = STATUS_MAP[cargo.State?.toLowerCase() || ''] || { label: cargo.State || 'Неизвестно', color: 'pending' };

    const formatValue = (value: number | string | undefined) => {
        if (typeof value === 'number') return value.toFixed(2);
        return value || '—';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Заказ № {cargo.Number}</h3>
                    <button type="button" className="modal-close-button" onClick={onClose}>
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="document-buttons">
                    <button className="doc-button" disabled={!cargo.TTNLink}>
                        <Download className="w-4 h-4 mr-1" /> ТТН
                    </button>
                    <button className="doc-button" disabled={!cargo.SchetLink}>
                        <FileTextIcon className="w-4 h-4 mr-1" /> Счет
                    </button>
                    <button className="doc-button" disabled={!cargo.AktLink}>
                        <List className="w-4 h-4 mr-1" /> Акт
                    </button>
                </div>

                <div className="details-grid-modal">
                    <div className="details-item-modal">
                        <div className="details-label">Статус</div>
                        <div className={`details-value status-value ${statusInfo.color === 'success' ? 'success' : ''} ${statusInfo.color === 'danger' ? 'text-red-400' : ''}`}>
                            {statusInfo.label}
                        </div>
                    </div>
                    <div className="details-item-modal">
                        <div className="details-label">Дата прихода</div>
                        <div className="details-value">{cargo.DatePrih || '—'}</div>
                    </div>
                    {cargo.DateVruch && (
                        <div className="details-item-modal highlighted-detail">
                            <div className="details-label">Дата вручения</div>
                            <div className="details-value">{cargo.DateVruch}</div>
                        </div>
                    )}
                </div>

                <div className="details-grid-modal">
                    <div className="details-item-modal">
                        <div className="details-label">Кол-во мест</div>
                        <div className="details-value flex items-center">
                            <Layers className="w-4 h-4 mr-2 text-theme-secondary" /> {formatValue(cargo.Mest)}
                        </div>
                    </div>
                    <div className="details-item-modal">
                        <div className="details-label">Общий вес, кг</div>
                        <div className="details-value flex items-center">
                            <Weight className="w-4 h-4 mr-2 text-theme-secondary" /> {formatValue(cargo.Weight)}
                        </div>
                    </div>
                    <div className="details-item-modal">
                        <div className="details-label">Платный вес, кг</div>
                        <div className="details-value flex items-center">
                            <Scale className="w-4 h-4 mr-2 text-theme-secondary" /> {formatValue(cargo.PV)}
                        </div>
                    </div>
                    <div className="details-item-modal">
                        <div className="details-label">Объем, м³</div>
                        <div className="details-value flex items-center">
                            <Package className="w-4 h-4 mr-2 text-theme-secondary" /> {formatValue(cargo.Volume)}
                        </div>
                    </div>
                </div>

                <div className="info-card mt-4 p-4">
                    <div className="info-item">
                        <div className="info-label">Отправитель</div>
                        <div className="info-value">{cargo.SenderCity || '—'}</div>
                    </div>
                    <div className="info-item">
                        <div className="info-label">Получатель</div>
                        <div className="info-value">{cargo.ReceiverCity || '—'}</div>
                    </div>
                </div>
                
                <div className="modal-button-container">
                    <button className="button-primary" onClick={onClose}>Закрыть</button>
                </div>
            </div>
        </div>
    );
}

type CargoCardProps = {
    cargo: CargoItem;
    onClick: (cargo: CargoItem) => void;
};

function CargoCard({ cargo, onClick }: CargoCardProps) {
    const statusInfo = useMemo(() => STATUS_MAP[cargo.State?.toLowerCase() || ''] || { label: cargo.State || 'Неизвестно', color: 'pending' }, [cargo.State]);

    const formatValue = (value: number | string | undefined, isCurrency = false) => {
        if (typeof value === 'number') {
            const formatted = value.toLocaleString('ru-RU', {
                minimumFractionDigits: isCurrency ? 2 : 0,
                maximumFractionDigits: isCurrency ? 2 : 0,
            });
            return isCurrency ? formatted.replace(',', ' ') : formatted;
        }
        return value || '—';
    };

    return (
        <div className="cargo-card" onClick={() => onClick(cargo)}>
            <div className="cargo-header-row">
                <span className="order-number">Заказ № {cargo.Number}</span>
                <span className={`status-value ${statusInfo.color === 'success' ? 'success' : ''} ${statusInfo.color === 'danger' ? 'text-red-400' : ''}`}>
                    {statusInfo.label}
                </span>
            </div>
            
            <div className="text-sm text-theme-secondary mb-2">
                <span className="font-semibold text-theme-text">{cargo.SenderCity}</span>
                <span className="mx-2">→</span>
                <span className="font-semibold text-theme-text">{cargo.ReceiverCity}</span>
            </div>

            <div className="cargo-details-grid">
                <div className="detail-item">
                    <div className="detail-item-value">{formatValue(cargo.Weight)}</div>
                    <div className="detail-item-label">Вес, кг</div>
                </div>
                <div className="detail-item">
                    <div className="detail-item-value">{formatValue(cargo.Volume)}</div>
                    <div className="detail-item-label">Объем, м³</div>
                </div>
                <div className="detail-item">
                    <div className="detail-item-value">{formatValue(cargo.Mest)}</div>
                    <div className="detail-item-label">Мест</div>
                </div>
            </div>

            <div className="cargo-footer">
                <div className="date">
                    <Calendar className="w-4 h-4 mr-1" /> 
                    {cargo.DatePrih || 'Дата не указана'}
                </div>
                <div className="sum-wrapper">
                    <span className="sum-label">Сумма: </span>
                    <span className="sum-value">{formatValue(cargo.Sum, true)} ₽</span>
                </div>
            </div>
        </div>
    );
}

type StatusFilterDropdownProps = {
    selected: StatusFilter;
    onSelect: (status: StatusFilter) => void;
};

function StatusFilterDropdown({ selected, onSelect }: StatusFilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const options: { value: StatusFilter, label: string }[] = [
        { value: 'all', label: 'Все статусы' },
        { value: 'accepted', label: 'Принят' },
        { value: 'in_transit', label: 'В пути' },
        { value: 'ready', label: 'Готов к выдаче' },
        { value: 'delivering', label: 'Доставка' },
        { value: 'delivered', label: 'Доставлен' },
    ];
    
    const selectedOption = options.find(o => o.value === selected) || options[0];

    useEffect(() => {
        const handleClickOutside = () => setIsOpen(false);
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="filter-group" style={{ minWidth: '150px' }}>
            <button className="filter-button" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                <span>{selectedOption.label}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            {isOpen && (
                <div className="filter-dropdown">
                    {options.map(option => (
                        <div 
                            key={option.value}
                            className={`dropdown-item ${selected === option.value ? 'selected' : ''}`}
                            onClick={() => { onSelect(option.value); setIsOpen(false); }}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

type DateFilterDropdownProps = {
    selected: DateFilter;
    onSelect: (filter: DateFilter) => void;
    customDateFrom: string;
    setCustomDateFrom: (date: string) => void;
    customDateTo: string;
    setCustomDateTo: (date: string) => void;
};

function DateFilterDropdown({ selected, onSelect, customDateFrom, setCustomDateFrom, customDateTo, setCustomDateTo }: DateFilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    // **********************************************
    // ИЗМЕНЕНИЕ 2: Обновляем метку для 'all' на 'С начала года'
    const options: { value: DateFilter, label: string }[] = [
        { value: 'all', label: 'С начала года' },
    // **********************************************
        { value: 'today', label: 'Сегодня' },
        { value: 'week', label: 'За неделю' },
        { value: 'month', label: 'За месяц' },
        { value: 'custom', label: 'Выбрать период' },
    ];
    
    const selectedOption = options.find(o => o.value === selected) || options[0];

    const handleSelect = (filter: DateFilter) => {
        onSelect(filter);
        if (filter !== 'custom') {
            setIsOpen(false);
        }
    }

    const handleApplyCustom = () => {
        if (customDateFrom && customDateTo) {
            setIsOpen(false);
        }
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Проверяем, что клик не произошел внутри dropdown
            if (target.closest('.filter-group') === null) {
                 setIsOpen(false);
            }
        };
        if(isOpen) {
             document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="filter-group" style={{ minWidth: '180px' }}>
            <button className="filter-button" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                <span>{selectedOption.label}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            {isOpen && (
                <div className="filter-dropdown" onClick={(e) => e.stopPropagation()}>
                    {options.map(option => (
                        <div 
                            key={option.value}
                            className={`dropdown-item ${selected === option.value ? 'selected' : ''}`}
                            onClick={() => handleSelect(option.value)}
                        >
                            {option.label}
                        </div>
                    ))}
                    {selected === 'custom' && (
                        <div className="p-4 border-t border-theme-border flex flex-col gap-3">
                            <label className="text-xs text-theme-secondary font-semibold">Дата от:</label>
                            <input
                                type="date"
                                className="login-input date-input"
                                value={customDateFrom}
                                onChange={(e) => setCustomDateFrom(e.target.value)}
                            />
                            <label className="text-xs text-theme-secondary font-semibold">Дата до:</label>
                            <input
                                type="date"
                                className="login-input date-input"
                                value={customDateTo}
                                onChange={(e) => setCustomDateTo(e.target.value)}
                            />
                            <button className="button-primary" onClick={handleApplyCustom}>Применить</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

type CargoPageProps = {
    auth: AuthData;
    searchText: string;
};

function CargoPage({ auth, searchText }: CargoPageProps) {
    const [cargoList, setCargoList] = useState<CargoItem[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCargo, setSelectedCargo] = useState<CargoItem | null>(null);

    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    
    // **********************************************
    // ИЗМЕНЕНИЕ 3: Устанавливаем начальную дату для custom-фильтра на начало года
    const [customDateFrom, setCustomDateFrom] = useState(getStartOfYearDate());
    // **********************************************
    const [customDateTo, setCustomDateTo] = useState(getTodayDate());

    const fetchCargo = useCallback(async (dateFilterType: DateFilter, dateFrom: string, dateTo: string) => {
        setLoading(true);
        setError(null);
        try {
            console.log(`[API Call] Fetching cargo from ${dateFrom} to ${dateTo}`); // Добавление лога
            
            const res = await fetch(PROXY_API_BASE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    login: auth.login,
                    password: auth.password,
                    dateFrom: dateFrom,
                    dateTo: dateTo
                }),
            });

            if (!res.ok) {
                const message = `Ошибка загрузки грузов: ${res.status}. ${res.statusText || 'Проверьте настройки прокси.'}`;
                setError(message);
                setCargoList([]);
                return;
            }

            const data = await res.json() as { perevozki?: CargoItem[], error?: string };
            
            if (data.error) {
                setError(data.error);
                setCargoList([]);
                return;
            }

            // Убедимся, что Number и City поля не null
            const cleanData = (data.perevozki || []).map(item => ({
                ...item,
                Number: item.Number || `Нет номера (${Math.random().toString(36).substr(2, 9)})`,
                SenderCity: item.SenderCity || 'Город отправки',
                ReceiverCity: item.ReceiverCity || 'Город назначения',
            }));

            setCargoList(cleanData);
            console.log(`[API Success] Loaded ${cleanData.length} items.`); // Добавление лога успеха

        } catch (err: any) {
            setError(err?.message || "Ошибка сети или некорректный ответ от сервера.");
            setCargoList([]);
        } finally {
            setLoading(false);
        }
    }, [auth]);

    useEffect(() => {
        const { dateFrom, dateTo } = getDateRange(dateFilter, customDateFrom, customDateTo);
        fetchCargo(dateFilter, dateFrom, dateTo);
    }, [fetchCargo, dateFilter, customDateFrom, customDateTo]);

    const filteredCargo = useMemo(() => {
        if (!cargoList) return [];

        let list = cargoList;
        
        // 1. Фильтр по статусу
        if (statusFilter !== 'all') {
            list = list.filter(cargo => cargo.State?.toLowerCase() === statusFilter);
        }

        // 2. Фильтр по поиску
        if (searchText) {
            const searchLower = searchText.toLowerCase();
            list = list.filter(cargo => 
                cargo.Number?.toLowerCase().includes(searchLower) ||
                cargo.SenderCity?.toLowerCase().includes(searchLower) ||
                cargo.ReceiverCity?.toLowerCase().includes(searchLower)
            );
        }
        
        return list;

    }, [cargoList, statusFilter, searchText]);


    return (
        <div className="w-full max-w-screen-lg">
            <h1 className="title">Ваши перевозки</h1>
            <p className="subtitle">Список грузов за выбранный период и статус.</p>

            <div className="filters-container">
                <DateFilterDropdown
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    customDateFrom={customDateFrom}
                    setCustomDateFrom={setCustomDateFrom}
                    customDateTo={customDateTo}
                    setCustomDateTo={setCustomDateTo}
                />
                <StatusFilterDropdown
                    selected={statusFilter}
                    onSelect={setStatusFilter}
                />
            </div>
            
            {loading && (
                <div className="text-center p-8 text-theme-secondary">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-theme-primary" />
                    <p className="mt-2">Загрузка данных...</p>
                </div>
            )}
            
            {error && !loading && (
                <div className="login-error my-4">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {!loading && !error && filteredCargo.length === 0 && (
                <div className="empty-state-card text-theme-secondary">
                    <Truck className="w-12 h-12 mx-auto mb-4 text-theme-primary" />
                    <p className="title text-theme-text">Грузы не найдены</p>
                    <p className="subtitle m-0">Попробуйте изменить период или фильтры.</p>
                </div>
            )}

            {!loading && filteredCargo.length > 0 && (
                <div className="cargo-list">
                    {filteredCargo.map((cargo) => (
                        <CargoCard 
                            key={cargo.Number} 
                            cargo={cargo} 
                            onClick={setSelectedCargo} 
                        />
                    ))}
                </div>
            )}

            {selectedCargo && (
                <CargoDetailModal 
                    cargo={selectedCargo} 
                    onClose={() => setSelectedCargo(null)} 
                />
            )}
        </div>
    );
}

type ProfilePageProps = {
    auth: AuthData;
    onLogout: () => void;
    onThemeChange: (theme: 'light' | 'dark') => void;
    currentTheme: 'light' | 'dark';
};

function ProfilePage({ auth, onLogout, onThemeChange, currentTheme }: ProfilePageProps) {
    const isDark = currentTheme === 'dark';

    return (
        <div className="w-full max-w-screen-sm">
            <h1 className="title">Профиль пользователя</h1>
            <p className="subtitle">Ваши настройки и информация об аккаунте.</p>

            <div className="info-card">
                <div className="info-item">
                    <div className="info-label">Логин (Email)</div>
                    <div className="info-value">{auth.login}</div>
                </div>
                <div className="info-item">
                    <div className="info-label">Статус</div>
                    <div className="info-value text-theme-primary">Авторизован</div>
                </div>
                <div className="info-item">
                    <div className="info-label">Дата регистрации</div>
                    <div className="info-value">12.01.2023</div> {/* Предполагаемое значение */}
                </div>
            </div>

            <div className="info-card">
                <div className="info-item">
                    <div className="info-label">Темная тема</div>
                    <div 
                        className={`switch-container ${isDark ? 'checked' : ''}`} 
                        onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
                        role="switch"
                        aria-checked={isDark}
                    >
                        <div className="switch-knob"></div>
                    </div>
                </div>
            </div>

            <button className="button-primary logout-button mt-6" onClick={onLogout}>
                <LogOut className="w-5 h-5 mr-2" /> Выйти
            </button>
        </div>
    );
}


export default function App() {
    const [login, setLogin] = useState(DEFAULT_LOGIN); 
    const [password, setPassword] = useState(DEFAULT_PASSWORD); 
    const [agreeOffer, setAgreeOffer] = useState(true);
    const [agreePersonal, setAgreePersonal] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false); 

    const [auth, setAuth] = useState<AuthData | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("cargo");
    const [theme, setTheme] = useState<'dark' | 'light'>('dark'); 
    
    // Состояние для поиска (в шапке)
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [searchText, setSearchText] = useState('');

    // Применяем класс темы к body
    useEffect(() => {
        document.body.className = `${theme}-mode`;
    }, [theme]);

    
    // Функция для применения поиска (передаем в CargoPage)
    const handleSearch = (text: string) => {
        // Логика поиска будет передана в CargoPage
        setSearchText(text.toLowerCase().trim());
    }

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

            // **********************************************
            // Используем новую, более широкую дату для проверки авторизации
            const { dateFrom, dateTo } = getDateRange("all"); 
            // **********************************************
            
            // Отправляем POST-запрос с логином/паролем в теле (для проверки авторизации и получения данных)
            const res = await fetch(PROXY_API_BASE_URL, {
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    login: cleanLogin, 
                    password: cleanPassword,
                    dateFrom: dateFrom, 
                    dateTo: dateTo 
                }),
            });

            if (!res.ok) {
                let message = `Ошибка авторизации: ${res.status}. Проверьте логин и пароль.`;
                if (res.status === 401) {
                    message = "Ошибка авторизации (401). Неверный логин/пароль.";
                } else if (res.status === 405) {
                    message = "Ошибка: Метод не разрешен (405). Проверьте, что ваш прокси-файл ожидает метод POST.";
                }
                
                try {
                    const errorData = await res.json() as ApiError;
                    if (errorData.error) {
                         message = errorData.error;
                    }
                } catch { /* ignore */ }
                
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
        setPassword(DEFAULT_PASSWORD); 
        setIsSearchExpanded(false); // Сброс
        setSearchText(''); // Сброс
    }

    // Встраиваем стили
    const injectedStyles = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
                
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            background-color: var(--color-bg-primary); 
            font-family: 'Inter', sans-serif;
            transition: background-color 0.3s, color 0.3s;
        }
        
        /* --------------------------------- */
        /* --- THEME VARIABLES --- */
        /* --------------------------------- */
        
        :root {
            /* Dark Mode Defaults */
            --color-bg-primary: #1f2937; /* gray-900 - Фон страницы */
            --color-bg-secondary: #374151; /* gray-800 - Фон шапки/таббара */
            --color-bg-card: #374151; /* gray-800 - Фон карточек/модалов */
            --color-bg-hover: #4b5563; /* gray-600 */
            --color-bg-input: #4b5563; /* gray-600 */
            --color-text-primary: #e5e7eb; /* gray-100 */
            --color-text-secondary: #9ca3af; /* gray-400 */
            --color-border: #4b5563; /* gray-600 */
            --color-primary-blue: #3b82f6; /* blue-500 */
            
            --color-tumbler-bg-off: #6b7280; 
            --color-tumbler-bg-on: #3b82f6; 
            --color-tumbler-knob: white; 
            
            --color-error-bg: rgba(185, 28, 28, 0.1); 
            --color-error-border: #b91c1c; 
            --color-error-text: #fca5a5; 
            
            --color-success-status: #34d399; 
            --color-pending-status: #facc15; 

            --color-modal-bg: rgba(31, 41, 55, 0.9); /* Полупрозрачный фон модала (темный), более плотный */
            
            /* Новые цвета для фильтров */
            --color-filter-bg: var(--color-bg-input);
            --color-filter-border: var(--color-border);
            --color-filter-text: var(--color-text-primary);
        }
        
        .light-mode {
            --color-bg-primary: #f9fafb; 
            --color-bg-secondary: #ffffff; 
            --color-bg-card: #ffffff; 
            --color-bg-hover: #f3f4f6; 
            --color-bg-input: #f3f4f6; 
            --color-text-primary: #1f2937; 
            --color-text-secondary: #6b7280; 
            --color-border: #e5e7eb; 
            --color-primary-blue: #2563eb; 

            --color-tumbler-bg-off: #ccc; 
            --color-tumbler-bg-on: #2563eb; 
            --color-tumbler-knob: white; 

            --color-error-bg: #fee2e2;
            --color-error-border: #fca5a5;
            --color-error-text: #b91c1c;
            
            --color-success-status: #10b981; 
            --color-pending-status: #f59e0b; 

            --color-modal-bg: rgba(249, 250, 251, 0.9); /* Полупрозрачный фон модала (светлый), более плотный */

            --color-filter-bg: #ffffff;
            --color-filter-border: #e5e7eb;
            --color-filter-text: #1f2937;
        }

        /* --------------------------------- */
        /* --- GENERAL & UTILS --- */
        /* --------------------------------- */
        .app-container {
            min-height: 100vh;
            color: var(--color-text-primary);
            font-family: 'Inter', sans-serif;
            display: flex;
            flex-direction: column;
        }
        .text-theme-text { color: var(--color-text-primary); }
        .text-theme-secondary { color: var(--color-text-secondary); }
        .text-theme-primary { color: var(--color-primary-blue); }
        .border-theme-border { border-color: var(--color-border); }
        .hover\\:bg-theme-hover-bg:hover { background-color: var(--color-bg-hover); }
        .title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        .subtitle {
            font-size: 0.9rem;
            color: var(--color-text-secondary);
            margin-bottom: 1.5rem;
        }
        .login-error {
            padding: 0.75rem;
            background-color: var(--color-error-bg);
            border: 1px solid var(--color-error-border);
            color: var(--color-error-text); 
            font-size: 0.875rem;
            border-radius: 0.5rem;
            margin-top: 1rem;
            display: flex;
            align-items: center;
        }
        
        /* --------------------------------- */
        /* --- LOGIN PAGE STYLES --- */
        /* --------------------------------- */
        .login-form-wrapper {
            padding: 2rem 1rem;
            align-items: center;
            justify-content: center;
            display: flex;
            flex-grow: 1;
        }
        .login-card {
            width: 100%;
            max-width: 400px;
            padding: 1.5rem;
            background-color: var(--color-bg-card);
            border-radius: 1rem;
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.2);
            position: relative;
            border: 1px solid var(--color-border);
        }
        .logo-text {
            font-size: 2rem;
            font-weight: 900;
            letter-spacing: 0.1em;
            color: var(--color-primary-blue);
        }
        .tagline {
            font-size: 1rem;
            color: var(--color-text-secondary);
            margin-bottom: 1.5rem;
            text-align: center;
        }
        .form .field {
            margin-bottom: 1rem;
        }
        
        /* --------------------------------- */
        /* --- INPUTS --- */
        /* --------------------------------- */
        .password-input-container {
            position: relative; 
            width: 100%;
        }
        .login-input {
            width: 100%;
            padding: 0.75rem 1rem;
            padding-right: 3rem; /* Отступ справа для иконки */
            border-radius: 0.75rem;
            border: 1px solid var(--color-border);
            background-color: var(--color-bg-input);
            color: var(--color-text-primary);
            outline: none;
            transition: border-color 0.15s;
        }
        .login-input:focus {
            border-color: var(--color-primary-blue);
        }
        .login-input.date-input {
             padding-right: 1rem; /* Сброс отступа для date input */
        }
        .toggle-password-visibility {
            position: absolute;
            right: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            color: var(--color-text-secondary);
            padding: 0;
            display: flex; 
            align-items: center;
            justify-content: center;
        }
        .toggle-password-visibility:hover {
             color: var(--color-primary-blue);
        }
        
        /* --------------------------------- */
        /* --- SWITCH (Tumbler) STYLES --- */
        /* --------------------------------- */
        .checkbox-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.875rem;
            color: var(--color-text-secondary);
            margin-bottom: 0.75rem;
        }
        .checkbox-row a {
            color: var(--color-primary-blue);
            text-decoration: none;
        }
        .switch-container {
            width: 40px;
            height: 22px;
            background-color: var(--color-tumbler-bg-off);
            border-radius: 11px;
            position: relative;
            cursor: pointer;
            transition: background-color 0.3s;
            flex-shrink: 0;
        }
        .switch-container.checked {
            background-color: var(--color-tumbler-bg-on);
        }
        .switch-knob {
            width: 18px;
            height: 18px;
            background-color: var(--color-tumbler-knob);
            border-radius: 50%;
            position: absolute;
            top: 2px;
            left: 2px;
            transition: transform 0.3s, background-color 0.3s;
        }
        .switch-container.checked .switch-knob {
            transform: translateX(18px);
        }

        /* --------------------------------- */
        /* --- BUTTONS & HEADER --- */
        /* --------------------------------- */
        .button-primary {
            background-color: var(--color-primary-blue);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.75rem;
            font-weight: 600;
            transition: background-color 0.15s;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .button-primary:hover:not(:disabled) {
            background-color: #2563eb; 
        }
        .button-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            box-shadow: none;
        }
        .logout-button {
             background-color: #dc2626; /* red-600 */
        }
        .logout-button:hover:not(:disabled) {
            background-color: #b91c1c; /* red-700 */
        }

        .app-header {
            padding: 0.5rem 1rem;
            background-color: var(--color-bg-secondary);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column; 
            position: sticky;
            top: 0;
            z-index: 10;
            border-bottom: 1px solid var(--color-border);
        }
        .header-top-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 40px; 
        }
        .header-auth-info {
            display: flex;
            align-items: center;
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--color-text-primary);
        }
        .header-auth-info .user-icon {
            color: var(--color-primary-blue);
            margin-right: 0.5rem;
        }
        .app-main {
            flex-grow: 1;
            padding: 1.5rem 1rem 5.5rem 1rem; 
            display: flex;
            justify-content: center;
            width: 100%;
        }

        /* --------------------------------- */
        /* --- SEARCH BAR --- */
        /* --------------------------------- */
        .search-container {
            display: flex;
            align-items: center;
            overflow: hidden;
            transition: max-width 0.3s ease-in-out, opacity 0.3s, height 0.3s, margin 0.3s;
            border-radius: 0.5rem;
            background-color: var(--color-bg-input);
        }
        .search-container.expanded {
            max-width: 100%;
            opacity: 1;
            height: 40px;
            padding: 0 0.5rem;
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
        }
        .search-container.collapsed {
            max-width: 0;
            opacity: 0;
            height: 0;
            padding: 0;
            margin-top: 0;
            margin-bottom: 0;
        }
        .search-input {
            flex-grow: 1;
            border: none;
            background: none;
            outline: none;
            padding: 0.5rem 0.5rem;
            color: var(--color-text-primary);
            font-size: 0.9rem;
        }
        .search-input::placeholder {
            color: var(--color-text-secondary);
        }
        .search-toggle-button {
            background: none;
            border: none;
            color: var(--color-text-secondary);
            cursor: pointer;
            padding: 0.5rem;
        }
        .search-toggle-button:hover {
            color: var(--color-primary-blue);
        }
        
        /* --------------------------------- */
        /* --- CARGO PAGE FILTERS --- */
        /* --------------------------------- */
        .filters-container {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap; 
        }
        .filter-group {
            position: relative;
            flex-grow: 1;
            min-width: 120px;
        }
        .filter-button {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            background-color: var(--color-filter-bg);
            color: var(--color-filter-text);
            border: 1px solid var(--color-filter-border);
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.15s, border-color 0.15s;
            font-size: 0.875rem;
        }
        .filter-button:hover {
             border-color: var(--color-primary-blue);
        }
        .filter-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background-color: var(--color-bg-card);
            border: 1px solid var(--color-border);
            border-radius: 0.5rem;
            margin-top: 0.25rem;
            z-index: 30;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }
        .dropdown-item {
            padding: 0.75rem 1rem;
            cursor: pointer;
            transition: background-color 0.15s;
            font-size: 0.875rem;
            color: var(--color-text-primary);
        }
        .dropdown-item:hover {
            background-color: var(--color-bg-hover);
        }
        .dropdown-item.selected {
            background-color: var(--color-primary-blue);
            color: white;
            font-weight: 700;
        }

        /* --------------------------------- */
        /* --- CARGO LIST STYLES --- */
        /* --------------------------------- */
        .cargo-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .cargo-card {
            background-color: var(--color-bg-card);
            border-radius: 0.75rem;
            border: 1px solid var(--color-border);
            padding: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            font-size: 0.875rem;
            cursor: pointer; 
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .cargo-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 10px rgba(59, 130, 246, 0.2); 
        }
        .cargo-header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 700;
            margin-bottom: 0.75rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--color-border);
        }
        .cargo-header-row .order-number {
            font-size: 1rem;
            color: var(--color-primary-blue);
        }
        .cargo-header-row .date {
            display: flex;
            align-items: center;
            font-size: 0.9rem;
            color: var(--color-text-secondary);
        }
        .cargo-details-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .detail-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 0.5rem 0;
            border-radius: 0.5rem;
            background-color: var(--color-bg-hover);
        }
        .detail-item-label {
            font-size: 0.65rem;
            text-transform: uppercase;
            color: var(--color-text-secondary);
            font-weight: 600;
            margin-top: 0.25rem;
        }
        .detail-item-value {
            font-size: 0.875rem;
            font-weight: 700;
        }
        .status-value {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--color-pending-status);
        }
        .status-value.success {
            color: var(--color-success-status);
        }
        .text-red-400 {
            color: #f87171; /* red-400 */
        }
        .cargo-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 0.75rem;
            border-top: 1px dashed var(--color-border);
        }
        .cargo-footer .sum-label {
            font-weight: 600;
            color: var(--color-text-primary);
        }
        .cargo-footer .sum-value {
            font-size: 1.1rem;
            font-weight: 900;
            color: var(--color-primary-blue);
        }
        @media (min-width: 640px) {
            .cargo-list {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                gap: 1.5rem;
            }
        }

        /* Empty State Card */
        .empty-state-card {
            background-color: var(--color-bg-card);
            border: 1px solid var(--color-border);
            border-radius: 1rem;
            padding: 3rem;
            text-align: center;
            margin-top: 2rem;
        }

        /* --------------------------------- */
        /* --- MODAL STYLES (GENERAL & CARGO) --- */
        /* --------------------------------- */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--color-modal-bg);
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding-top: 5vh;
            z-index: 50;
            overflow-y: auto; 
        }
        .modal-content {
            background-color: var(--color-bg-card);
            border-radius: 1rem;
            padding: 1.5rem;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            border: 1px solid var(--color-border);
            animation: fadeIn 0.3s;
            margin-bottom: 2rem; 
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        .modal-header h3 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 700;
        }
        .modal-close-button {
            background: none;
            border: none;
            color: var(--color-text-secondary);
            cursor: pointer;
            padding: 0;
        }
        .modal-close-button:hover {
            color: var(--color-text-primary);
        }

        /* Cargo Details Specific Styles */
        .document-buttons { 
            display: flex; 
            gap: 0.5rem; 
            margin-bottom: 1.5rem; 
            flex-wrap: wrap; 
        }
        .doc-button { 
            flex: 1; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 0.5rem; 
            background-color: var(--color-primary-blue); 
            color: white; 
            border-radius: 0.5rem; 
            border: none; 
            cursor: pointer; 
            font-size: 0.8rem; 
            min-width: 80px;
            transition: opacity 0.15s;
        }
        .doc-button:hover:not(:disabled) {
            opacity: 0.9;
        }
        .doc-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background-color: var(--color-bg-hover);
            color: var(--color-text-secondary);
        }


        .details-grid-modal { 
            display: grid; 
            grid-template-columns: 1fr; 
            gap: 1rem; 
            margin-bottom: 1.5rem; 
        }
        @media (min-width: 400px) {
            .details-grid-modal { 
                grid-template-columns: 1fr 1fr; 
            }
        }
        .details-item-modal { 
            padding: 0.75rem 1rem; 
            background-color: var(--color-bg-hover); 
            border-radius: 0.5rem; 
            border: 1px solid transparent;
        }
        .details-item-modal.highlighted-detail {
            border-color: var(--color-primary-blue);
        }
        .details-label { 
            font-size: 0.75rem; 
            color: var(--color-text-secondary); 
            text-transform: uppercase; 
            font-weight: 600; 
            margin-bottom: 0.25rem; 
        }
        .details-value {
             font-size: 1rem;
             font-weight: 700;
        }

        .modal-button-container {
            margin-top: 1rem;
        }

        /* --------------------------------- */
        /* --- PROFILE PAGE STYLES --- */
        /* --------------------------------- */
        .info-card {
            background-color: var(--color-bg-card);
            border: 1px solid var(--color-border);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px dashed var(--color-border);
        }
        .info-item:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 600;
            color: var(--color-text-secondary);
        }
        .info-value {
            font-weight: 700;
            color: var(--color-text-primary);
        }


        /* --------------------------------- */
        /* --- TABBAR (НИЖНЕЕ МЕНЮ) --- */
        /* --------------------------------- */
        .tabbar-container {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4.5rem; /* 72px */
            display: flex;
            justify-content: space-around;
            align-items: center;
            background-color: var(--color-bg-secondary);
            box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -2px rgba(0, 0, 0, 0.06);
            z-index: 50;
            border-top: 1px solid var(--color-border);
        }
        .tab-button {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: none;
            border: none;
            cursor: pointer;
            color: var(--color-text-secondary);
            transition: color 0.15s, background-color 0.15s;
            padding: 0.5rem 0;
            min-width: 0; 
        }
        .tab-button:hover {
            color: var(--color-primary-blue);
        }
        .tab-button.active {
            color: var(--color-primary-blue);
        }
        .tab-label {
            font-size: 0.65rem;
            font-weight: 600;
            margin-top: 0.25rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .tab-icon {
            transition: transform 0.15s;
        }
    `;

    // --------------- ЭКРАН АВТОРИЗАЦИИ --------------- 
    if (!auth) {
        return (
            <>
                <style>{injectedStyles}</style>
                <div className={`app-container login-form-wrapper`}>
                    <div className="login-card">
                        <div className="flex justify-center mb-4 h-10 mt-6">
                            <div className="logo-text">HAULZ</div>
                        </div>
                        <div className="tagline">
                            Доставка грузов в Калининград и обратно
                        </div>
                        <form onSubmit={handleSubmit} className="form">
                            <div className="field">
                                <input
                                    className="login-input"
                                    type="text"
                                    placeholder="Логин (email)"
                                    value={login}
                                    onChange={(e) => setLogin(e.target.value)}
                                    autoComplete="username"
                                />
                            </div>
                            <div className="field">
                                <div className="password-input-container">
                                    <input
                                        className="login-input"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Пароль"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password-visibility"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <label className="checkbox-row switch-wrapper">
                                <span>
                                    Согласие с{" "}
                                    <a href="#" target="_blank" rel="noreferrer">
                                        публичной офертой
                                    </a>
                                </span>
                                <div
                                    className={`switch-container ${agreeOffer ? 'checked' : ''}`}
                                    onClick={() => setAgreeOffer(!agreeOffer)}
                                >
                                    <div className="switch-knob"></div>
                                </div>
                            </label>
                            {/* FIX: Missing second checkbox, error block, and submit button */}
                            <label className="checkbox-row switch-wrapper">
                                <span>
                                    Согласие на{" "}
                                    <a href="#" target="_blank" rel="noreferrer">
                                        обработку персональных данных
                                    </a>
                                </span>
                                <div
                                    className={`switch-container ${agreePersonal ? 'checked' : ''}`}
                                    onClick={() => setAgreePersonal(!agreePersonal)}
                                >
                                    <div className="switch-knob"></div>
                                </div>
                            </label>

                            {error && (
                                <div className="login-error">
                                    <AlertTriangle className="w-5 h-5 mr-2" />
                                    {error}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className="button-primary mt-6"
                                disabled={!agreeOffer || !agreePersonal || loading}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Войти"}
                            </button>
                            
                        </form>
                    </div>
                </div>
            </>
        );
    } // End of if (!auth)

    // --------------- АВТОРИЗОВАННОЕ ПРИЛОЖЕНИЕ --------------- 
    
    const renderContent = useCallback(() => {
        // Проверка на auth уже была, но для безопасности
        if (!auth) return null; 

        switch (activeTab) {
            case "cargo":
                return <CargoPage auth={auth} searchText={searchText} />;
            case "profile":
                return <ProfilePage auth={auth} onLogout={handleLogout} onThemeChange={setTheme} currentTheme={theme} />;
            case "home":
                return <div className="p-4 text-center title">Главная страница (скоро)</div>;
            case "docs":
                return <div className="p-4 text-center title">Документы (скоро)</div>;
            case "support":
                return <div className="p-4 text-center title">Поддержка (скоро)</div>;
            default:
                return null;
        }
    }, [activeTab, auth, searchText, handleLogout, theme]);

    return (
        <div className={`app-container ${theme}-mode`}>
            <style>{injectedStyles}</style>

            {/* Header with Search Toggle */}
            <AppHeader 
                login={auth.login} 
                onSearchToggle={() => setIsSearchExpanded(!isSearchExpanded)}
                isSearchExpanded={isSearchExpanded}
                searchText={searchText}
                onSearchChange={handleSearch}
            />
            
            {/* Main Content Area */}
            <main className="app-main">
                <div className="max-w-screen-lg w-full">
                    {renderContent()}
                </div>
            </main>

            {/* Bottom Navigation */}
            <TabBar active={activeTab} onChange={setActiveTab} />

        </div>
    );
} // End of export default function App()
