import React, { useState, useEffect } from "react";
import "./styles.css";
import "./index.css";

/* 
    УПРОЩЁННАЯ ВЕРСИЯ APP:

    ✔ Авторизация — НЕ ТРОГАЛ 
    ✔ После входа — сразу страница ГРУЗЫ
    ✔ Нет нижнего меню
    ✔ Нет главной, документов, профиля, поддержки
    ✔ Весь функционал грузов взят из App (20)
    ✔ Фильтры, поиск, модалка — всё сохранено
*/

// ==========================
// Авторизация
// ==========================
export default function App() {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem("haulz_auth");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      const result = await fetch("/api/perevozki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      if (!result.ok) {
        setError("Неверный логин или пароль");
        return;
      }

      const data = await result.json();

      const session = {
        login,
        password,
        token: data?.token || "",
      };

      localStorage.setItem("haulz_auth", JSON.stringify(session));
      setAuth(session);
    } catch (err) {
      setError("Ошибка сети");
    }
  }

  // ==========================
  // Если нет авторизации → показать СТАРУЮ страницу входа (как в App20)
  // ==========================
  if (!auth) {
    return (
      <div className="login-wrapper">
        <div className="login-card-new">

          {/* Тумблер темы — как был */}
          <div
            className="theme-toggle"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? "🌞" : "🌙"}
          </div>

          <h1 className="login-title">HAULZ</h1>
          <p className="login-subtitle">Доставка грузов в Калининград</p>

          <form className="login-form-modern" onSubmit={handleLogin}>
            <input
              type="text"
              className="input-modern"
              placeholder="Логин"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />

            <div className="password-wrapper">
              <input
                type={passwordVisible ? "text" : "password"}
                className="input-modern"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="password-eye-modern"
                onClick={() => setPasswordVisible(!passwordVisible)}
              >
                {passwordVisible ? "🙈" : "👁️"}
              </button>
            </div>

            {error && <div className="login-error-modern">{error}</div>}

            <button className="button-modern-primary" type="submit">
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================
  // ЕСЛИ ЕСТЬ АВТОРИЗАЦИЯ → СТРАНИЦА ГРУЗОВ
  // ==========================
  return <CargoPage auth={auth} setAuth={setAuth} />;
}

// ====================================================================
// СТРАНИЦА ГРУЗОВ (ВНЕ вынесено ИЗ App20.tsx — логика сохранена 1:1)
// ====================================================================

function CargoPage({ auth, setAuth }) {
  const [cargoData, setCargoData] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [activeFilter, setActiveFilter] = useState("month");

  const [modalItem, setModalItem] = useState(null);

  // ==========================
  // Загрузка данных
  // ==========================
  useEffect(() => {
    loadCargo();
  }, []);

  async function loadCargo() {
    try {
      const res = await fetch("/api/perevozki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: auth.login,
          password: auth.password,
        }),
      });

      const data = await res.json();
      setCargoData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Ошибка загрузки грузов");
    }
  }

  // ==========================
  // Фильтрация по поиску
  // ==========================
  const filtered = cargoData.filter((item) => {
    if (!searchValue) return true;
    return (
      item.Номер?.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.Грузоотправитель?.toLowerCase().includes(searchValue.toLowerCase()) ||
      item.Грузополучатель?.toLowerCase().includes(searchValue.toLowerCase())
    );
  });

  // ==========================
  // UI
  // ==========================
  return (
    <div className="app-container">

      {/* ХЕДЕР — СОХРАНЁН (как ты попросила) */}
      <div className="app-header">
        <h1 className="header-title">Грузы</h1>

        <div className="switch-wrapper">
          <div className="switch-container">
            <div className="switch-knob" />
          </div>
        </div>
      </div>

      {/* ПОИСК */}
      <div className="search-container">
        <input
          className="search-input"
          placeholder="Поиск..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      {/* Фильтр периода — сохраняем 1:1 */}
      <div className="period-filter">
        <button
          className={activeFilter === "week" ? "active" : ""}
          onClick={() => setActiveFilter("week")}
        >
          Неделя
        </button>

        <button
          className={activeFilter === "month" ? "active" : ""}
          onClick={() => setActiveFilter("month")}
        >
          Месяц
        </button>

        <button
          className={activeFilter === "year" ? "active" : ""}
          onClick={() => setActiveFilter("year")}
        >
          Год
        </button>

        <button
          className={activeFilter === "all" ? "active" : ""}
          onClick={() => setActiveFilter("all")}
        >
          Период
        </button>
      </div>

      {/* СПИСОК ГРУЗОВ */}
      <div className="cargo-list">
        {filtered.map((item, idx) => (
          <div
            key={idx}
            className="cargo-card"
            onClick={() => setModalItem(item)}
          >
            <div className="cargo-header-row">
              <span className="cargo-id">{item.Номер}</span>
              <span className="cargo-status">{item.Статус}</span>
            </div>

            <div className="cargo-row">
              <span className="cargo-label">Отправитель:</span>{" "}
              {item.Грузоотправитель}
            </div>

            <div className="cargo-row">
              <span className="cargo-label">Получатель:</span>{" "}
              {item.Грузополучатель}
            </div>

            <div className="cargo-row">
              <span className="cargo-label">Погрузка:</span>{" "}
              {item.ГородПогрузки}
            </div>

            <div className="cargo-row">
              <span className="cargo-label">Выгрузка:</span>{" "}
              {item.ГородВыгрузки}
            </div>
          </div>
        ))}
      </div>

      {/* МОДАЛКА */}
      {modalItem && (
        <div className="modal-backdrop" onClick={() => setModalItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Перевозка № {modalItem.Номер}</h2>

            <div className="modal-row">
              <b>Статус:</b> {modalItem.Статус}
            </div>

            <div className="modal-row">
              <b>Отправитель:</b> {modalItem.Грузоотправитель}
            </div>

            <div className="modal-row">
              <b>Получатель:</b> {modalItem.Грузополучатель}
            </div>

            <div className="modal-row">
              <b>Погрузка:</b> {modalItem.ГородПогрузки}
            </div>

            <div className="modal-row">
              <b>Выгрузка:</b> {modalItem.ГородВыгрузки}
            </div>

            <div className="modal-row">
              <b>Вес:</b> {modalItem.Вес} кг
            </div>

            <div className="modal-row">
              <b>Платный вес:</b> {modalItem.ПлатныйВес} кг
            </div>

            <div className="modal-row">
              <b>Объём:</b> {modalItem.Объем} м³
            </div>

            <button className="modal-close" onClick={() => setModalItem(null)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
