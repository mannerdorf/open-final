import React, { useState, useEffect, useMemo } from "react";
import { Copy, Plus, Package, Calendar, MapPin, ChevronRight } from "lucide-react"; // Иконки

// 1. Строгая типизация данных
interface CargoItem {
  id: string | number;
  Number: string;
  State: string;
  FromCity: string;
  ToCity: string;
  DatePrih: string;
}

type DateFilter = "all" | "today" | "week" | "month";
type StatusFilter = "all" | "created" | "in_transit" | "ready" | "delivered";

// 2. Хук для копирования с вибрацией
const useCopyToClipboard = () => {
  const copy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      // Если есть доступ к Telegram SDK, вызываем нативную вибрацию
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    }
  };
  return copy;
};

export default function CargoPage({ auth }: { auth: any }) {
  const [items, setItems] = useState<CargoItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Состояние фильтров
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const copy = useCopyToClipboard();

  // Загрузка данных (упрощена для примера)
  useEffect(() => {
    // Симуляция загрузки
    setTimeout(() => {
        setItems([
            { id: 1, Number: "CARGO-10293", State: "В пути", FromCity: "Москва", ToCity: "Казань", DatePrih: "2023-10-25" },
            { id: 2, Number: "CARGO-55521", State: "Готов к выдаче", FromCity: "СПБ", ToCity: "Минск", DatePrih: "2023-10-20" },
            { id: 3, Number: "CARGO-11111", State: "Доставлен", FromCity: "Сочи", ToCity: "Адлер", DatePrih: "2023-10-15" },
        ]);
        setLoading(false);
    }, 1500);
  }, []);

  // 3. Мемоизация фильтрации (чтобы не тормозило при ререндере)
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Логика фильтрации (можно оставить вашу сложную логику здесь)
      const statusMatch = statusFilter === 'all' 
        ? true 
        : item.State.toLowerCase().includes(statusFilter === 'in_transit' ? 'пути' : statusFilter);
      return statusMatch; // + date match
    });
  }, [items, statusFilter, dateFilter]);

  // 4. Вспомогательная функция для цвета статуса
  const getStatusColor = (state: string) => {
    const s = state.toLowerCase();
    if (s.includes("пути")) return "text-blue-500 bg-blue-100/10"; // Используем прозрачность для темной темы
    if (s.includes("готов")) return "text-green-500 bg-green-100/10";
    if (s.includes("достав")) return "text-gray-500 bg-gray-100/10";
    return "text-orange-500 bg-orange-100/10";
  };

  return (
    // Используем переменные темы Telegram для фона и текста
    <div className="min-h-screen pb-24 px-4 pt-4 bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)]">
      
      {/* --- HEADER & FILTERS --- */}
      <div className="sticky top-0 z-10 bg-[var(--tg-theme-bg-color)] pb-2">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Мои грузы</h1>
          <div className="text-sm opacity-50">{filteredItems.length} шт.</div>
        </div>

        {/* Горизонтальный скролл для фильтров (Экономия места) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {['all', 'today', 'week', 'month'].map((f) => (
                <button
                    key={f}
                    onClick={() => setDateFilter(f as DateFilter)}
                    className={`
                        px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                        ${dateFilter === f 
                            ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]' 
                            : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-hint-color)]'}
                    `}
                >
                    {f === 'all' ? 'Все даты' : f === 'today' ? 'Сегодня' : f === 'week' ? 'Неделя' : 'Месяц'}
                </button>
            ))}
        </div>
      </div>

      {/* --- LIST --- */}
      <div className="space-y-3 mt-2">
        {loading ? (
           // Skeleton Loader вместо текста "Загрузка..."
           [1,2,3].map(i => <SkeletonCard key={i} />)
        ) : (
            filteredItems.map((item) => (
                <div 
                    key={item.id} 
                    className="p-4 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] shadow-sm active:scale-[0.98] transition-transform"
                >
                    {/* Header карточки */}
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${getStatusColor(item.State)}`}>
                                {item.State}
                            </div>
                            <div className="font-mono font-bold text-lg mt-1 flex items-center gap-2">
                                {item.Number}
                                <button onClick={() => copy(item.Number)} className="opacity-50 active:opacity-100 p-1">
                                    <Copy size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="text-xs opacity-50 text-right">
                            <div>Прибытие</div>
                            <div className="font-medium">{item.DatePrih}</div>
                        </div>
                    </div>

                    {/* Маршрут с визуализацией */}
                    <div className="relative pl-4 border-l-2 border-[var(--tg-theme-hint-color)] border-opacity-20 ml-1 py-1 space-y-4">
                        <div className="relative">
                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-[var(--tg-theme-button-color)] bg-[var(--tg-theme-bg-color)]"></div>
                            <div className="text-sm font-medium">{item.FromCity}</div>
                            <div className="text-xs opacity-50">Отправление</div>
                        </div>
                        <div className="relative">
                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-[var(--tg-theme-button-color)]"></div>
                            <div className="text-sm font-medium">{item.ToCity}</div>
                            <div className="text-xs opacity-50">Назначение</div>
                        </div>
                    </div>
                </div>
            ))
        )}
        
        {!loading && filteredItems.length === 0 && (
            <div className="text-center py-10 opacity-50">
                <Package size={48} className="mx-auto mb-2 opacity-20"/>
                Ничего не найдено
            </div>
        )}
      </div>

      {/* --- FAB (Floating Action Button) --- */}
      <button 
        onClick={() => alert('New')}
        className="fixed bottom-6 right-4 w-14 h-14 bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-50"
      >
        <Plus size={28} />
      </button>

    </div>
  );
}

// Компонент-заглушка для красивой загрузки
function SkeletonCard() {
    return (
        <div className="p-4 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] animate-pulse">
            <div className="h-4 w-20 bg-gray-400/20 rounded mb-2"></div>
            <div className="h-6 w-32 bg-gray-400/20 rounded mb-4"></div>
            <div className="h-10 w-full bg-gray-400/20 rounded"></div>
        </div>
    )
}
