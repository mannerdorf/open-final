import React, { useState, useCallback } from 'react';
import { 
    Loader2, LogOut, Truck, Home, X, 
    MapPin, DollarSign, Calendar, Clock, Volume2, Mic 
} from 'lucide-react';

// --- API CONFIGURATION ---
// ИСПРАВЛЕНИЕ ОШИБКИ 500: Сужение диапазона дат до последних двух месяцев (Октябрь-Ноябрь 2025), чтобы избежать переполнения массива на сервере.
const API_URL = 'https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetPerevozki?DateB=2025-10-01&DateE=2025-11-30';
// 'Authorization' header: Basic admin:juebfnye (статический)
const API_AUTH_BASIC = 'Basic YWRtaW46anVlYmZueWU='; 
const LLM_API_KEY = ""; 
const LLM_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${LLM_API_KEY}`;
const TTS_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${LLM_API_KEY}`;

// --- AUDIO HELPER FUNCTIONS ---

/**
 * Helper to convert Base64 PCM audio data to WAV Blob
 */
const pcmToWav = (pcmData, sampleRate) => {
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit PCM
    const buffer = new ArrayBuffer(44 + pcmData.byteLength);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.byteLength, true);
    writeString(view, 8, 'WAVE');

    // FMT sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Sub-chunk size 16
    view.setUint16(20, 1, true); // Audio format (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, bytesPerSample * 8, true); // Bits per sample

    // Data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.byteLength, true);

    // Write the PCM data
    const pcmArray = new Int16Array(buffer, 44);
    pcmArray.set(pcmData);

    return new Blob([buffer], { type: 'audio/wav' });
};

const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};


// --- UTILITY COMPONENTS ---

const EntryIcon = () => (
    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
    </svg>
);

/**
 * Universal Labeled Switch Component
 */
const LabeledSwitch = ({ label, isChecked, onToggle }) => {
    return (
        <div 
            className="flex justify-between items-start space-x-4 mb-4 select-none cursor-pointer p-2 rounded-lg hover:bg-gray-800 transition duration-150" 
            onClick={onToggle}
        >
            
            {/* Hidden Checkbox - Important for accessibility */}
            <input 
                type="checkbox" 
                checked={isChecked} 
                onChange={() => {}} 
                className="sr-only" // sr-only hides the element visually
            />

            {/* Label text */}
            <div className="flex-grow text-sm font-medium text-gray-300 pr-4 pt-0.5">
                {label}
            </div>

            {/* Switch UI */}
            <div className="flex-shrink-0"> 
                <div className={`relative inline-block w-12 h-6 rounded-full transition duration-300 ease-in-out ${
                    isChecked ? 'bg-blue-600' : 'bg-gray-600'
                }`}>
                    <div className={`absolute left-0 top-0 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ease-in-out transform ${
                        isChecked ? 'translate-x-full' : 'translate-x-0'
                    }`}></div>
                </div>
            </div>
        </div>
    );
};

/**
 * Вспомогательный компонент для форматирования строки таблицы
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
const TableDisplay = ({ data, loading, error, summary, generateSummary }) => {
    const [ttsLoading, setTtsLoading] = useState({});
    const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
    const [ttsError, setTtsError] = useState(null);

    // --- TTS API Function ---
    const generateAndPlayTTS = async (item, index) => {
        setTtsLoading(prev => ({ ...prev, [index]: true }));
        setTtsError(null);
        setTtsAudioUrl(null);

        // 1. Generate text prompt for TTS
        const promptText = `Сообщи клиенту или водителю: Перевозка номер ${item.ID} по маршруту из ${item.FromPoint} в ${item.ToPoint}. Дата: ${item.Date}. Стоимость: ${item.Summa} рублей.`;

        const payload = {
            contents: [{
                parts: [{ text: promptText }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: "Kore" }
                    }
                }
            },
            model: "gemini-2.5-flash-preview-tts"
        };
        
        try {
            const response = await fetch(TTS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `TTS API Error: ${response.status}`);
            }

            const result = await response.json();
            const part = result?.candidates?.[0]?.content?.parts?.[0];
            const audioData = part?.inlineData?.data;
            const mimeType = part?.inlineData?.mimeType;

            if (audioData && mimeType && mimeType.startsWith("audio/L16")) {
                const sampleRateMatch = mimeType.match(/rate=(\d+)/);
                const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 16000;
                
                const pcmData = base64ToArrayBuffer(audioData);
                const pcm16 = new Int16Array(pcmData);
                const wavBlob = pcmToWav(pcm16, sampleRate);
                const url = URL.createObjectURL(wavBlob);
                
                setTtsAudioUrl(url);
                const audio = new Audio(url);
                audio.play().catch(e => console.error("Audio playback failed:", e));

            } else {
                throw new Error("Invalid audio response format from TTS API.");
            }
        } catch (e) {
            setTtsError(`Ошибка TTS: ${e.message}`);
            console.error(e);
        } finally {
            setTtsLoading(prev => ({ ...prev, [index]: false }));
        }
    };

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
                    Пожалуйста, убедитесь, что логин и пароль верны.
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

    // Обработка данных, если они существуют и являются массивом
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-100">Список Перевозок ({data.length})</h2>
            
            {/* LLM Summary Feature */}
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 space-y-3">
                <button
                    onClick={generateSummary}
                    disabled={summary.loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition duration-150 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {summary.loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Mic className="w-5 h-5" />
                    )}
                    <span>✨ Сводка Маршрутов Gemini</span>
                </button>
                
                {summary.error && (
                    <p className="text-sm text-red-400">Ошибка: {summary.error}</p>
                )}
                
                {summary.text && (
                    <div className="p-3 bg-gray-700 rounded-lg text-gray-200 text-sm whitespace-pre-wrap">
                        {summary.text}
                    </div>
                )}
            </div>

            {/* List of Cargo Items */}
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
                            
                            {/* TTS Generation Button */}
                            <div className="p-3">
                                <button
                                    onClick={() => generateAndPlayTTS(item, index)}
                                    disabled={ttsLoading[index]}
                                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition duration-150 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                                >
                                    {ttsLoading[index] ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Volume2 className="w-4 h-4" />
                                    )}
                                    <span>✨ Озвучить Сообщение</span>
                                </button>
                                {ttsError && ttsLoading[index] === false && <p className="text-xs text-center text-red-400 mt-1">{ttsError}</p>}
                                {ttsAudioUrl && ttsLoading[index] === false && <p className="text-xs text-center text-green-400 mt-1">Сообщение воспроизведено!</p>}
                            </div>
                            
                        </div>
                    </div>
                ))}
            </div>
            {/* Global TTS Error Display */}
            {ttsError && !Object.values(ttsLoading).some(l => l) && (
                <div className="p-3 text-sm text-red-300 bg-red-900/30 rounded-lg border border-red-700 mt-4">
                    {ttsError}
                </div>
            )}
        </div>
    );
};


/**
 * Main application component
 */
const App = () => {
    // Input data for API
    const [loginEmail, setLoginEmail] = useState('order@lal-auto.com');
    const [loginPassword, setLoginPassword] = useState('ZakaZ656565');
    
    // Agreements (Switches) - Теперь только локальное состояние
    const [isOfferAccepted, setIsOfferAccepted] = useState(false);
    const [isDataProcessed, setIsDataProcessed] = useState(false);

    // API and Data State
    const [perevozki, setPerevozki] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [view, setView] = useState('login'); // 'login' | 'perevozki'

    // LLM Summary State
    const [summary, setSummary] = useState({ text: '', loading: false, error: null });

    // --- 1. Function to Fetch Perevozki Data ---
    // Использует параметры для заголовка 'Auth' и статический заголовок 'Authorization'
    const fetchPerevozki = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        // Заголовок Auth: Basic <логин>:<пароль> в Base64 (берутся с формы)
        const authHeaderValue = `Basic ${btoa(`${loginEmail}:${loginPassword}`)}`;
        
        try {
            // ИСПРАВЛЕНИЕ: Используем метод 'GET' для получения данных.
            const response = await fetch(API_URL, {
                method: 'GET', 
                headers: {
                    // Auth header derived from user inputs (для вашей авторизации)
                    'Auth': authHeaderValue, 
                    // Authorization header is static (для доступа к API)
                    'Authorization': API_AUTH_BASIC, 
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Попытка парсинга JSON ошибки, если не удалось, используем текст/статус
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(`Ошибка API (${response.status}): ${errorJson.ErrorText || errorText}`);
                } catch {
                    throw new Error(`Ошибка API (${response.status}): ${errorText || response.statusText}`);
                }
            }

            const data = await response.json();
            
            const resultData = data.Perevozki || data; 

            if (Array.isArray(resultData)) {
                setPerevozki(resultData);
                setView('perevozki'); // Switch to the cargo view upon success
            } else {
                 throw new Error("API вернул данные в неожиданном формате (не массив).");
            }
            
        } catch (e) {
            console.error("Ошибка при запросе к API:", e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [loginEmail, loginPassword]);

    // --- 2. LLM Summary Generator Function (New) ---
    const generateSummary = useCallback(async () => {
        if (!perevozki || perevozki.length === 0) {
            setSummary({ text: 'Нет данных для анализа.', loading: false, error: null });
            return;
        }

        setSummary(prev => ({ ...prev, loading: true, error: null }));
        
        // Prepare prompt based on data structure
        const promptData = perevozki.slice(0, 10).map(item => ({
            ID: item.ID,
            Route: `${item.FromPoint} -> ${item.ToPoint}`,
            Date: item.Date,
            Summa: item.Summa
        }));

        const userQuery = `Проанализируй следующие данные о перевозках (максимум 10 элементов). Выдели ключевые моменты: общее количество, самый дорогой/длинный маршрут (если возможно), и среднюю стоимость. Ответ должен быть в виде одного-двух абзацев на русском языке. Данные: ${JSON.stringify(promptData)}`;
        
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: {
                parts: [{ text: "Ты — продвинутый логистический аналитик. Твоя задача — кратко и информативно суммировать предоставленные данные о перевозках." }]
            },
        };

        try {
            const response = await fetch(LLM_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `LLM API Error: ${response.status}`);
            }

            const result = await response.json();
            const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (generatedText) {
                setSummary({ text: generatedText, loading: false, error: null });
            } else {
                throw new Error("Не удалось сгенерировать текст. Ответ LLM пуст.");
            }
        } catch (e) {
            console.error("LLM Summary Error:", e);
            setSummary(prev => ({ ...prev, loading: false, error: e.message }));
        }
    }, [perevozki]);

    // --- 3. Login Handler ---
    const handleLogin = (e) => {
        e.preventDefault();
        
        if (!isOfferAccepted || !isDataProcessed) {
            setError("Вы должны принять все условия для входа.");
            return;
        }

        setError(null);
        fetchPerevozki();
    };

    // --- 4. Logout Handler (Resets view and data) ---
    const handleLogout = () => {
        setPerevozki(null); // Clear all data
        setSummary({ text: '', loading: false, error: null }); // Clear summary
        setError(null);
        setLoading(false);
        setView('login'); // Force switch back to login screen
    };
    
    // --- 5. Component Rendering ---
    const renderContent = () => {
        if (loading && view === 'login') {
            return (
                <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="mt-4 text-gray-300">Вход и загрузка данных...</p>
                </div>
            );
        }
        
        if (view === 'login') {
            return (
                <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700/50">
                    
                    <div className="flex flex-col items-center space-y-3 mb-8">
                        <EntryIcon />
                        <h1 className="text-4xl font-extrabold text-blue-500 tracking-wider">HAULZ</h1>
                        <p className="text-gray-400 text-sm">Вход в систему для партнеров</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        
                        {/* Email Field (for Auth header) */}
                        <input
                            type="email"
                            placeholder="Email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition duration-150"
                            required
                        />
                        
                        {/* Password Field (for Auth header) */}
                        <input
                            type="password"
                            placeholder="Пароль"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition duration-150"
                            required
                        />

                        {/* Switch: Offer Acceptance */}
                        <LabeledSwitch
                            label={
                                <>
                                    Я согласен с <a href="#" className="text-blue-400 hover:text-blue-300 transition duration-150">Условиями оферты</a>
                                </>
                            }
                            isChecked={isOfferAccepted}
                            onToggle={() => setIsOfferAccepted(!isOfferAccepted)}
                        />

                        {/* Switch: Data Processing Consent */}
                        <LabeledSwitch
                            label={
                                <>
                                    Я даю согласие на <a href="#" className="text-blue-400 hover:text-blue-300 transition duration-150">обработку персональных данных</a>
                                </>
                            }
                            isChecked={isDataProcessed}
                            onToggle={() => setIsDataProcessed(!isDataProcessed)}
                        />

                        {error && (
                            <div className="p-3 text-sm text-red-300 bg-red-900/30 rounded-lg border border-red-700 flex justify-between items-center">
                                <span>{error}</span>
                                <button 
                                    onClick={() => setError(null)} 
                                    className="p-1 -mr-1 rounded-full text-red-300 hover:text-white hover:bg-red-700 transition duration-150"
                                    type="button"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={!isOfferAccepted || !isDataProcessed || loading}
                            className={`w-full py-3 mt-6 text-lg font-semibold rounded-lg shadow-lg transition duration-300 ease-in-out 
                                ${isOfferAccepted && isDataProcessed && !loading
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/50'
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed shadow-none'
                                }`}
                        >
                            {loading ? 'Загрузка...' : 'Войти'}
                        </button>
                    </form>
                </div>
            );
        } else if (view === 'perevozki') {
            return (
                <div className="w-full p-4 md:p-8 space-y-6">
                    {/* TableDisplay now called directly as it's defined in this file */}
                    <TableDisplay 
                        data={perevozki} 
                        loading={loading} 
                        error={error} 
                        summary={summary}
                        generateSummary={generateSummary}
                    />
                </div>
            );
        }
    };
    
    return (
        // Set min-h-screen and flex-col to enable sticky footer
        <div className="min-h-screen flex flex-col bg-gray-900 font-sans">
            
            {/* Header / Top Panel */}
            <header className="w-full max-w-6xl mx-auto p-4 md:p-6 bg-gray-900 sticky top-0 z-10">
                <div className="flex justify-between items-center bg-gray-800 rounded-xl shadow-lg border border-gray-700/50 p-4">
                    <h2 className="text-xl font-bold text-gray-100">
                        {view === 'login' ? 'Вход в систему' : 'Список Перевозок'}
                    </h2>
                    
                    {/* Button to go directly to Perevozki if data is loaded and we are on login screen */}
                    {view === 'login' && perevozki && (
                         <button
                            onClick={() => setView('perevozki')}
                            className={`flex items-center space-x-2 px-4 py-2 font-medium rounded-lg transition duration-150 bg-blue-600 hover:bg-blue-700 text-white`}
                        >
                            <Truck className="w-5 h-5" />
                            <span>К Перевозкам</span>
                        </button>
                    )}

                    {/* Button to go directly to Login if we are on perevozki screen */}
                    {view === 'perevozki' && (
                         <button
                            onClick={() => setView('login')}
                            className={`flex items-center space-x-2 px-4 py-2 font-medium rounded-lg transition duration-150 bg-gray-600 hover:bg-gray-700 text-white`}
                        >
                            <Home className="w-5 h-5" />
                            <span>На Главную</span>
                        </button>
                    )}

                </div>
            </header>
            
            {/* Main Content Area - flex-grow ensures it takes up available space */}
            <main className="flex flex-grow justify-center w-full p-4 md:p-6 pb-24"> {/* pb-24 to prevent content from hiding behind fixed footer */}
                <div className="w-full max-w-6xl flex justify-center">
                    {renderContent()}
                </div>
            </main>
            
            {/* Footer / Bottom Navigation Menu (Available on all screens) */}
            <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700/50 shadow-2xl z-20">
                <div className="w-full max-w-6xl mx-auto p-3 flex justify-end items-center">
                    
                    {/* Global Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow-lg shadow-red-500/50 transition duration-150 text-base"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Выход</span>
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default App;
