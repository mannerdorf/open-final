import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
    Loader2, LogOut, Truck, Home, X, 
    MapPin, DollarSign, Calendar, Clock, Volume2, Mic, 
    Check, ChevronRight
} from 'lucide-react';

// --- КОНФИГУРАЦИЯ API ---
const API_URL = 'https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetPerevozki?DateB=2024-01-01&DateE=2026-01-01';
const API_AUTH_BASIC = 'Basic YWRtaW46anVlYmZueWU='; 
const LLM_API_KEY = ""; 
const LLM_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${LLM_API_KEY}`;
const TTS_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${LLM_API_KEY}`;

// --- FIREBASE SETUP ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const dummyFirebaseConfig = { apiKey: "dummy", authDomain: "dummy", projectId: "dummy" };
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : dummyFirebaseConfig;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- СТИЛИ И ЦВЕТА (INLINE CSS) ---
const COLORS = {
    primary: '#3B82F6', // Синий
    bg: '#111827',      // Темный фон (как на макетах)
    card: '#1F2937',    // Фон карточек
    text: '#F9FAFB',    // Белый текст
    textSec: '#9CA3AF', // Серый текст
    border: '#374151',  // Цвет границ
    danger: '#EF4444',  // Красный
    success: '#10B981', // Зеленый
};

const STYLES = {
    container: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: COLORS.bg,
        padding: '16px',
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        border: `1px solid ${COLORS.border}`,
        marginBottom: '16px',
    },
    input: {
        width: '100%',
        padding: '14px',
        backgroundColor: '#374151',
        border: `1px solid ${COLORS.border}`,
        borderRadius: '12px',
        color: 'white',
        fontSize: '16px',
        outline: 'none',
        marginBottom: '16px',
        boxSizing: 'border-box', // ВАЖНО для верстки
    },
    buttonPrimary: {
        width: '100%',
        padding: '14px',
        backgroundColor: COLORS.primary,
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '20px',
        transition: 'opacity 0.2s',
    },
    footer: {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.card,
        borderTop: `1px solid ${COLORS.border}`,
        padding: '12px',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 100,
    }
};

// ==========================================
// --- AUDIO UTILITIES ---
// ==========================================
const pcmToWav = (pcmData, sampleRate = 24000) => {
    const numChannels = 1;
    const bytesPerSample = 2; 
    const buffer = new ArrayBuffer(44 + pcmData.byteLength);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.byteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.byteLength, true);
    const pcmArray = new Int16Array(buffer, 44);
    pcmArray.set(new Int16Array(pcmData));
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

// ==========================================
// --- UI COMPONENTS ---
// ==========================================

// Стильный свитч с фиксированной версткой
const LabeledSwitch = ({ label, isChecked, onToggle }) => {
    return (
        <div 
            onClick={onToggle}
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center', // Выравнивание по центру вертикально
                padding: '12px',
                backgroundColor: '#374151',
                borderRadius: '12px',
                marginBottom: '10px',
                cursor: 'pointer',
                border: `1px solid ${COLORS.border}`,
                userSelect: 'none',
            }}
        >
            <span style={{ 
                fontSize: '14px', 
                color: COLORS.textSec, 
                fontWeight: '500',
                paddingRight: '10px'
            }}>
                {label}
            </span>
            
            <div style={{
                width: '48px',
                height: '26px',
                backgroundColor: isChecked ? COLORS.primary : '#4B5563',
                borderRadius: '9999px',
                position: 'relative',
                transition: 'background-color 0.2s',
                flexShrink: 0, // Запрещаем сжиматься
            }}>
                <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '3px',
                    left: '3px',
                    transform: isChecked ? 'translateX(22px)' : 'translateX(0)',
                    transition: 'transform 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
            </div>
        </div>
    );
};

const TableRow = ({ label, value, icon }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: `1px solid ${COLORS.border}`,
    }}>
        <div style={{ marginRight: '12px', color: COLORS.primary }}>
            {icon}
        </div>
        <div>
            <p style={{ fontSize: '11px', color: COLORS.textSec, textTransform: 'uppercase', fontWeight: '600', margin: 0 }}>{label}</p>
            <p style={{ fontSize: '14px', color: COLORS.text, fontWeight: '500', margin: '2px 0 0 0', wordBreak: 'break-word' }}>{value || 'N/A'}</p>
        </div>
    </div>
);

// ==========================================
// --- COMPONENT: TableDisplay ---
// ==========================================
const TableDisplay = ({ data, loading, error, summary, generateSummary }) => {
    const [ttsLoading, setTtsLoading] = useState({});

    const generateAndPlayTTS = async (item, index) => {
        setTtsLoading(prev => ({ ...prev, [index]: true }));
        const promptText = `Заказ ${item.ID}. Маршрут ${item.FromPoint} - ${item.ToPoint}.`;
        const payload = {
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } },
            model: "gemini-2.5-flash-preview-tts"
        };
        try {
            const response = await fetch(TTS_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await response.json();
            const audioData = result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioData) {
                const url = URL.createObjectURL(pcmToWav(base64ToArrayBuffer(audioData)));
                new Audio(url).play();
            }
        } catch (e) { console.error(e); } finally { setTtsLoading(prev => ({ ...prev, [index]: false })); }
    };

    if (loading) return <div style={{ ...STYLES.container, justifyContent: 'center', alignItems: 'center' }}><Loader2 style={{ width: 40, height: 40, color: COLORS.primary, animation: 'spin 1s linear infinite' }} /><p style={{marginTop: 10}}>Загрузка...</p></div>;
    
    if (error) return <div style={{ padding: 20, color: COLORS.danger }}>Ошибка: {error}</div>;
    
    if (!data || data.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: COLORS.textSec }}>Нет данных</div>;

    return (
        <div style={{ paddingBottom: '80px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
             {/* AI Summary Block */}
             <div style={{ ...STYLES.card, background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)', border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center' }}>
                        <Mic style={{ marginRight: '8px' }} /> AI Аналитика
                    </h3>
                    <button 
                        onClick={generateSummary}
                        disabled={summary.loading}
                        style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                    >
                        {summary.loading ? '...' : 'Обновить'}
                    </button>
                </div>
                {summary.text && <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.4' }}>{summary.text}</p>}
            </div>

            {/* List */}
            {data.map((item, index) => (
                <div key={index} style={STYLES.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '12px' }}>
                        <span style={{ fontWeight: 'bold', color: COLORS.primary, fontSize: '18px' }}>#{item.ID}</span>
                        <button 
                            onClick={() => generateAndPlayTTS(item, index)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textSec }}
                        >
                            {ttsLoading[index] ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <Volume2 />}
                        </button>
                    </div>
                    <TableRow label="Маршрут" value={`${item.FromPoint} → ${item.ToPoint}`} icon={<MapPin size={16} />} />
                    <TableRow label="Дата" value={item.Date} icon={<Calendar size={16} />} />
                    <TableRow label="Сумма" value={`${item.Summa} ₽`} icon={<DollarSign size={16} />} />
                </div>
            ))}
        </div>
    );
};


// ==========================================
// --- MAIN COMPONENT: App ---
// ==========================================
export default function App() {
    const [loginEmail, setLoginEmail] = useState('order@lal-auto.com');
    const [loginPassword, setLoginPassword] = useState('ZakaZ656565');
    const [isOfferAccepted, setIsOfferAccepted] = useState(false);
    const [isDataProcessed, setIsDataProcessed] = useState(false);

    const [perevozki, setPerevozki] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [view,
