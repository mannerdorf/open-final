import React from 'react';
import { Truck, MapPin, DollarSign, Calendar, Clock, Loader2 } from 'lucide-react';

/**
 * Вспомогательный компонент для форматирования строки таблицы.
 */
const TableRow = ({ label, value, icon, className = '' }) => (
    <div className={`flex items-center space-x-3 p-3 border-b border-gray-700 last:border-b-0 ${className}`}>
        <div className="flex-shrink-0 text-blue-400">
            {icon}
        </div>
        <div className="flex-grow">
            <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
            <p className="text-sm font-semibold text-gray-200 break-words">{value || 'N/A'}</p>
        </div>
    </div>
);

/**
 * Компонент для отображения данных о перевозках в виде адаптивной таблицы/списка.
 */
const TableDisplay = ({ data, loading, error }) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-gray-800 rounded-xl">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="mt-3 text-gray-400">Загрузка данных о перевозках...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-900/30 border border-red-700 rounded-xl">
                <h3 className="text-lg font-bold text-red-400">Ошибка загрузки данных</h3>
                <p className="mt-2 text-sm text-red-300 break-all">
                    Произошла ошибка при запросе к API: {error}
                </p>
                <p className="mt-3 text-xs text-red-500">
                    Убедитесь, что логин и пароль верны, и API доступен.
                </p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="p-6 text-center bg-gray-700/50 rounded-xl">
                <Truck className="w-10 h-10 mx-auto text-gray-500" />
                <h3 className="mt-4 text-xl font-bold text-gray-300">Перевозки не найдены</h3>
                <p className="mt-1 text-gray-400">Проверьте, правильно ли указан диапазон дат.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-100">Список Перевозок ({data.length})</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.map((item, index) => (
                    <div key={index} className="bg-gray-800 rounded-xl shadow-xl border border-gray-700/50 overflow-hidden hover:shadow-blue-500/30 transition duration-300">
                        <div className="p-4 bg-blue-900/50 border-b border-blue-800">
                            <h4 className="text-lg font-extrabold text-blue-300">Перевозка #{item.ID || 'N/A'}</h4>
                            <p className="text-xs text-blue-400 mt-1">{item.GosNum || 'Номер не указан'}</p>
                        </div>
                        
                        <div className="divide-y divide-gray-700/50">
                            <TableRow 
                                label="Маршрут" 
                                value={`${item.FromPoint || '?'} → ${item.ToPoint || '?'}`} 
                                icon={<MapPin className="w-5 h-5" />}
                            />
                            <TableRow 
                                label="Дата и время" 
                                value={item.Date || 'N/A'} 
                                icon={<Calendar className="w-5 h-5" />}
                            />
                            <TableRow 
                                label="Время в пути" 
                                value={item.Time || 'N/A'} 
                                icon={<Clock className="w-5 h-5" />}
                            />
                            <TableRow 
                                label="Стоимость" 
                                value={item.Summa ? `${item.Summa} ₽` : 'N/A'} 
                                icon={<DollarSign className="w-5 h-5" />}
                                className="bg-gray-800/80"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TableDisplay;
