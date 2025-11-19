import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection } from 'firebase/firestore';

// --- НАСТРОЙКИ FIREBASE (Необходимые глобальные переменные Canvas) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- ИКОНКИ ---
const EntryIcon = () => (
    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
    </svg>
);

/**
 * Универсальный компонент для кнопки-переключателя (свитча) с текстом-меткой.
 * Обеспечивает вертикальное выравнивание свитча и текста.
 */
const LabeledSwitch = ({ label, isChecked, onToggle }) => {
    return (
        <div className="flex justify-between items-start space-x-4 mb-4 select-none cursor-pointer p-2 rounded-lg hover:bg-gray-800 transition duration-150" onClick={onToggle}>
            
            {/* Текстовая метка: занимает максимальное пространство */}
            <div className="flex-grow text-sm font-medium text-gray-300 pr-4 pt-0.5">
                {label}
            </div>

            {/* Блок переключения (Свитч): фиксированный размер, выравнивается по верхней части контейнера */}
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
 * Главный компонент приложения
 */
const App = () => {
    const [email, setEmail] = useState('order@lal-auto.com');
    const [password, setPassword] = useState('**********');
    const [isOfferAccepted, setIsOfferAccepted] = useState(false);
    const [isDataProcessed, setIsDataProcessed] = useState(false);
    
    // Состояние Firebase
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);

    // 1. Инициализация Firebase и Аутентификация
    useEffect(() => {
        if (!firebaseConfig) {
            console.error("Критическая ошибка: Конфигурация Firebase не найдена.");
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // Настройка слушателя состояния аутентификации
            const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
                if (!user) {
                    try {
                        // Попытка анонимного входа
                        if (initialAuthToken) {
                            const userCredential = await signInWithCustomToken(firebaseAuth, initialAuthToken);
                            setUserId(userCredential.user.uid);
                        } else {
                            const userCredential = await signInAnonymously(firebaseAuth);
                            setUserId(userCredential.user.uid);
                        }
                    } catch (error) {
                        console.error("Ошибка аутентификации:", error.message);
                    }
                } else {
                    setUserId(user.uid);
                }
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Ошибка инициализации Firebase:", e);
        }
    }, []);

    // 2. Логика сохранения состояния свитчей в Firestore
    useEffect(() => {
        if (db && userId) {
            const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'login_state', 'form_data');

            // Функция для сохранения данных (оптимистичное сохранение при изменении)
            const saveState = async () => {
                try {
                    await setDoc(userDocRef, {
                        isOfferAccepted: isOfferAccepted,
                        isDataProcessed: isDataProcessed,
                        timestamp: new Date().toISOString()
                    }, { merge: true });
                    // console.log("Состояние сохранено в Firestore.");
                } catch (error) {
                    console.error("Ошибка сохранения данных в Firestore:", error);
                }
            };
            
            saveState();
        }
    }, [isOfferAccepted, isDataProcessed, db, userId]);

    // Обработчик входа
    const handleLogin = (e) => {
        e.preventDefault();
        
        if (!isOfferAccepted || !isDataProcessed) {
            // В рабочем приложении здесь должно быть модальное окно с ошибкой, а не console.warn
            console.warn("Необходимо принять все условия для входа.");
            return;
        }

        console.log(`Попытка входа с: ${email}`);
        console.log("Условия приняты. Продолжение аутентификации...");

        // Здесь должна быть реальная логика входа с email/password, 
        // например, signInWithEmailAndPassword(auth, email, password)
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900 font-sans">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700/50">
                
                {/* Заголовок */}
                <div className="flex flex-col items-center space-y-3 mb-8">
                    <EntryIcon />
                    <h1 className="text-4xl font-extrabold text-blue-500 tracking-wider">HAULZ</h1>
                    <p className="text-gray-400 text-sm">Вход в систему для партнеров</p>
                </div>

                {/* Форма Входа */}
                <form onSubmit={handleLogin} className="space-y-4">
                    
                    {/* Поле Email */}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition duration-150"
                        required
                    />
                    
                    {/* Поле Пароль */}
                    <input
                        type="password"
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 text-white bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition duration-150"
                        required
                    />

                    {/* Свитч: Согласие с офертой */}
                    <LabeledSwitch
                        label={
                            <>
                                Я согласен с <a href="#" className="text-blue-400 hover:text-blue-300 transition duration-150">Условиями оферты</a>
                            </>
                        }
                        isChecked={isOfferAccepted}
                        onToggle={() => setIsOfferAccepted(!isOfferAccepted)}
                    />

                    {/* Свитч: Обработка персональных данных (текст переносится на 2 строки) */}
                    <LabeledSwitch
                        label={
                            <>
                                Я даю согласие на <a href="#" className="text-blue-400 hover:text-blue-300 transition duration-150">обработку персональных данных</a>
                            </>
                        }
                        isChecked={isDataProcessed}
                        onToggle={() => setIsDataProcessed(!isDataProcessed)}
                    />

                    {/* Кнопка Входа */}
                    <button
                        type="submit"
                        disabled={!isOfferAccepted || !isDataProcessed}
                        className={`w-full py-3 mt-6 text-lg font-semibold rounded-lg shadow-lg transition duration-300 ease-in-out 
                            ${isOfferAccepted && isDataProcessed
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/50'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed shadow-none'
                            }`}
                    >
                        Войти
                    </button>
                </form>

            </div>
        </div>
    );
};

export default App;
