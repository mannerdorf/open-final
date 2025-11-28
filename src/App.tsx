import React, { useState } from "react";
import "./styles.css";

export default function App() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [dark, setDark] = useState(false);

    const toggleTheme = () => setDark(!dark);

    const handleLogin = () => {
        console.log("Авторизация:", email, password);
        // здесь твоя авторизация
    };

    return (
        <div className={`auth-container ${dark ? "dark" : ""}`}>
            <button className="theme-toggle" onClick={toggleTheme}>
                {dark ? "🌙" : "☀️"}
            </button>

            <div className="auth-card">
                <h1 className="auth-logo">HAULZ</h1>
                <p className="auth-subtitle">Доставка грузов в Калининград</p>

                <div className="input-group">
                    <label className="input-label">Email</label>
                    <input
                        className="input-field"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Введите email"
                    />
                </div>

                <div className="input-group">
                    <label className="input-label">Пароль</label>
                    <div className="password-wrapper">
                        <input
                            className="input-field"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Введите пароль"
                        />
                        <button
                            className="eye-button"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? "🙈" : "👁️"}
                        </button>
                    </div>
                </div>

                <button className="login-btn" onClick={handleLogin}>
                    Войти
                </button>
            </div>
        </div>
    );
}
