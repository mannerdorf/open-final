import React, { useState, useEffect } from "react";
import "./styles.css";

export default function App() {
  const [auth, setAuth] = useState({ login: "", password: "" });
  const [isLogged, setIsLogged] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [cargo, setCargo] = useState([]);

  // APPLY THEME
  useEffect(() => {
    document.documentElement.className =
      theme === "dark" ? "dark-mode" : "light-mode";
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // LOGIN HANDLER
  const handleLogin = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/perevozki", {
      headers: { Auth: `Basic ${auth.login}:${auth.password}` },
    });

    if (res.ok) {
      setIsLogged(true);
    }
  };

  // LOAD CARGO AFTER LOGIN
  useEffect(() => {
    if (!isLogged) return;

    (async () => {
      const res = await fetch("/api/perevozki", {
        headers: { Auth: `Basic ${auth.login}:${auth.password}` },
      });

      const json = await res.json();
      setCargo(json || []);
    })();
  }, [isLogged]);

  // ==========================
  // LOGIN PAGE
  // ==========================
  if (!isLogged)
    return (
      <div className="login-form-wrapper">
        <div className="login-card">
          <div className="logo-text">HAULZ</div>

          <form className="form" onSubmit={handleLogin}>
            <div className="field">
              <input
                className="login-input"
                placeholder="Логин"
                value={auth.login}
                onChange={(e) => setAuth({ ...auth, login: e.target.value })}
              />
            </div>

            <div className="field password-input-container">
              <input
                type="password"
                className="login-input"
                placeholder="Пароль"
                value={auth.password}
                onChange={(e) =>
                  setAuth({ ...auth, password: e.target.value })
                }
              />
            </div>

            <button className="button-primary" type="submit">
              Войти
            </button>
          </form>
        </div>
      </div>
    );

  // ==========================
  // CARGO PAGE
  // ==========================
  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="header-title">Грузы</h1>

        {/* OLD ORIGINAL TOGGLER */}
        <div className="switch-wrapper" onClick={toggleTheme}>
          <div className="switch-container">
            <div
              className="switch-knob"
              style={{
                transform:
                  theme === "dark"
                    ? "translateX(18px)"
                    : "translateX(0px)",
              }}
            ></div>
          </div>
        </div>
      </div>

      <div className="app-main">
        <div className="cargo-list">
          {cargo.map((item, index) => (
            <div className="cargo-card" key={index}>
              <div className="cargo-header-row">
                <span className="cargo-id">{item.Номер}</span>
                <span className="cargo-status">{item.Статус}</span>
              </div>

              <div className="cargo-row">
                <span className="cargo-label">Отправитель:</span>
                {item.Грузоотправитель}
              </div>

              <div className="cargo-row">
                <span className="cargo-label">Получатель:</span>
                {item.Грузополучатель}
              </div>

              <div className="cargo-row">
                <span className="cargo-label">Погрузка:</span>
                {item.ГородПогрузки}
              </div>

              <div className="cargo-row">
                <span className="cargo-label">Выгрузка:</span>
                {item.ГородВыгрузки}
              </div>

              <div className="cargo-row">
                <span className="cargo-label">Вес:</span>
                {item.Вес} кг
              </div>

              <div className="cargo-row">
                <span className="cargo-label">Платный вес:</span>
                {item.ПлатныйВес} кг
              </div>

              <div className="cargo-row">
                <span className="cargo-label">Объём:</span>
                {item.Объем} м³
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
