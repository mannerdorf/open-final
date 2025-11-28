import React, { useState, useEffect } from "react";
import "./styles.css";
import { Eye, EyeOff, Sun, Moon, Loader2, AlertTriangle } from "lucide-react";

export default function App() {
  // Theme
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  useEffect(() => {
    document.documentElement.className =
      theme === "dark" ? "dark-mode" : "light-mode";
  }, [theme]);

  // Auth form
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cargo
  const [cargo, setCargo] = useState([]);

  async function handleLoginSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/perevozki", {
        headers: {
          Auth: `Basic ${login}:${password}`,
        },
      });

      if (!res.ok) throw new Error("Неверный логин или пароль");

      setAuth(true);

      const data = await res.json();
      setCargo(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }

  // ======================================
  // LOGIN SCREEN
  // ======================================
  if (!auth) {
    return (
      <div className="login-wrapper">
        <div className="login-card-new">

          {/* Theme toggle */}
          <button className="theme-toggle-fab" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="login-logo">HAULZ</div>
          <div className="login-subtitle">Доставка грузов в Калининград</div>

          <form onSubmit={handleLoginSubmit} className="login-form-modern">
            {/* login */}
            <div className="input-block-modern">
              <input
                type="text"
                placeholder="Логин"
                className="input-modern"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>

            {/* password */}
            <div className="input-block-modern relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Пароль"
                className="input-modern"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="password-eye-modern"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* error */}
            {error && (
              <div className="login-error-modern">
                <AlertTriangle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}

            {/* submit */}
            <button className="button-modern-primary" type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Войти"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ======================================
  // CARGO PAGE
  // ======================================
  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="header-title">Грузы</h1>

        <div className="switch-wrapper" onClick={toggleTheme}>
          <div className="switch-container">
            <div
              className="switch-knob"
              style={{
                transform: theme === "dark" ? "translateX(18px)" : "translateX(0px)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="cargo-list">
        {cargo.map((item: any, index: number) => (
          <div key={index} className="cargo-card">
            <div className="cargo-header-row">
              <span className="cargo-id">{item.Номер}</span>
              <span className="cargo-status">{item.Статус}</span>
            </div>

            <div className="cargo-row"><span className="cargo-label">Отправитель:</span>{item.Грузоотправитель}</div>
            <div className="cargo-row"><span className="cargo-label">Получатель:</span>{item.Грузополучатель}</div>
            <div className="cargo-row"><span className="cargo-label">Погрузка:</span>{item.ГородПогрузки}</div>
            <div className="cargo-row"><span className="cargo-label">Выгрузка:</span>{item.ГородВыгрузки}</div>
            <div className="cargo-row"><span className="cargo-label">Вес:</span>{item.Вес} кг</div>
            <div className="cargo-row"><span className="cargo-label">Платный вес:</span>{item.ПлатныйВес} кг</div>
            <div className="cargo-row"><span className="cargo-label">Объём:</span>{item.Объем} м³</div>
          </div>
        ))}
      </div>
    </div>
  );
}
