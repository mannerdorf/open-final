@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

/* Сброс стилей и основной шрифт */
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Inter', sans-serif; }

/* --- ПЕРЕМЕННЫЕ ТЕМЫ (ТЕМНЫЙ РЕЖИМ) --- */
:root {
    --color-bg-primary: #1f2937; /* gray-900 - Фон страницы */
    --color-bg-secondary: #374151; /* gray-800 - Фон шапки/карточек */
    --color-bg-card: #374151; 
    --color-bg-hover: #4b5563; /* gray-600 */
    --color-bg-input: #4b5563; /* gray-600 */
    --color-text-primary: #e5e7eb; /* gray-100 */
    --color-text-secondary: #9ca3af; /* gray-400 */
    --color-border: #4b5563; /* gray-600 */
    --color-primary-blue: #3b82f6; /* blue-500 */
    
    /* Уведомления об ошибках */
    --color-error-bg: rgba(185, 28, 28, 0.9); /* red-700 с прозрачностью */
    
    /* Кнопки */
    --btn-primary-bg: #3b82f6;
    --btn-primary-hover-bg: #2563eb;
    --btn-secondary-bg: #4b5563;
    --btn-secondary-hover-bg: #6b7280;
}

/* --- ОБЩИЕ СТИЛИ КОМПОНЕНТОВ --- */
.text-theme-primary { color: var(--color-text-primary); }
.text-theme-secondary { color: var(--color-text-secondary); }
.text-theme-primary-blue { color: var(--color-primary-blue); }
.text-theme-text-primary { color: var(--color-text-primary); }
.text-theme-text-secondary { color: var(--color-text-secondary); }
.bg-theme-bg-card { background-color: var(--color-bg-card); }
.border-theme-border { border-color: var(--color-border); }
.bg-theme-error-bg { background-color: var(--color-error-bg); }

/* --- ОСНОВНОЙ КОНТЕЙНЕР ПРИЛОЖЕНИЯ --- */
.app-container { 
    display: flex; 
    flex-direction: column; 
    min-height: 100vh; 
    background-color: var(--color-bg-primary); 
    color: var(--color-text-primary); 
}

/* --- ШАПКА --- */
.app-header { 
    position: sticky; 
    top: 0; 
    z-index: 30; 
    background-color: var(--color-bg-secondary); 
    padding: 0.75rem 1rem; 
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); 
}
.header-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
}

/* --- ПОИСКОВАЯ СТРОКА --- */
.search-container {
    display: flex;
    align-items: center;
    background-color: var(--color-bg-input);
    border-radius: 9999px;
    padding: 0.5rem 1rem;
    overflow: hidden;
    transition: all 0.3s ease-in-out;
}
.search-input {
    flex-grow: 1;
    border: none;
    background: transparent;
    color: var(--color-text-primary);
    padding: 0 0.5rem;
    outline: none;
    font-size: 1rem;
}
.search-input::placeholder {
    color: var(--color-text-secondary);
}

/* --- ГЛАВНОЕ СОДЕРЖИМОЕ --- */
.app-main {
    flex-grow: 1;
    padding-bottom: 4rem; /* Отступ для таб-бара */
    display: flex;
    justify-content: center;
    width: 100%;
}

/* --- TABBAR --- */
.tabbar-container { 
    position: fixed; 
    bottom: 0; 
    left: 0; 
    right: 0; 
    z-index: 40; 
    background-color: var(--color-bg-secondary); 
    border-top: 1px solid var(--color-border); 
    display: flex; 
    justify-content: space-around; 
    padding: 0.5rem 0; 
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3); 
}
.tab-button { 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center; 
    background: none; 
    border: none; 
    color: var(--color-text-secondary); 
    cursor: pointer; 
    padding: 0.25rem 0.5rem; 
    border-radius: 0.5rem; 
    transition: color 0.3s, background-color 0.2s; 
    min-width: 60px; 
}
.tab-button:hover {
    background-color: var(--color-bg-hover);
}
.tab-button.active { 
    color: var(--color-primary-blue); 
}
.tab-icon { margin-bottom: 0.1rem; }
.tab-label { font-size: 0.7rem; }

/* --- КНОПКИ --- */
.btn-primary {
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    font-weight: 600;
    color: white;
    background-color: var(--btn-primary-bg);
    transition: background-color 0.2s;
}
.btn-primary:hover:not(:disabled) {
    background-color: var(--btn-primary-hover-bg);
}
.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* --- ФОРМА АВТОРИЗАЦИИ И ВВОД ДАННЫХ --- */
.login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: var(--color-bg-primary);
    padding: 1rem;
}
.login-card {
    background-color: var(--color-bg-card);
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.login-input {
    width: 100%;
    padding: 0.75rem 1rem;
    padding-left: 2.5rem; /* Для иконки */
    border-radius: 0.5rem;
    background-color: var(--color-bg-input);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    outline: none;
    transition: border-color 0.2s;
}
.login-input:focus {
    border-color: var(--color-primary-blue);
}
.input-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.25rem;
    height: 1.25rem;
    color: var(--color-text-secondary);
}
.input-label {
    display: block;
    font-size: 0.875rem; /* text-sm */
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--color-text-primary);
}
