import React, { useState, useEffect } from "react";
import "./styles.css";

// =============================
// TYPES
// =============================
type CargoItem = {
  Номер: string;
  Дата: string;
  Грузоотправитель: string;
  Грузополучатель: string;
  ГородПогрузки: string;
  ГородВыгрузки: string;
  Статус: string;
  Вес: number;
  ПлатныйВес: number;
  Объем: number;
  Документ: string;
};

export default function App() {
  // ============================================
  // AUTH
  // ============================================
  const [auth, setAuth] = useState({
    login: "",
    password: "",
  });

  const [isLogged, setIsLogged] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loginError, setLoginError] = useState("");

  // ============================================
  // CARGO DATA
  // ============================================
  const [cargo, setCargo] = useState<CargoItem[]>([]);
  const [loadingCargo, setLoadingCargo] = useState(false);

  // ============================================
  // HANDLERS
  // ============================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLogin(true);
    setLoginError("");

    try {
      const res = await fetch("/api/perevozki", {
        headers: { Auth: `Basic ${auth.login}:${auth.password}` },
      });

      if (!res.ok) throw new Error("Неверный логин или пароль");

      setIsLogged(true);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoadingLogin(false);
    }
  };

  // LOAD CARGO AFTER LOGIN
  useEffect(() => {
    if (!isLogged) return;

    setLoadingCargo(true);
    (async () => {
      try {
        const res = await fetch("/api/perevozki", {
          headers: {
            Auth: `Basic ${auth.login}:${auth.password}`,
          },
        });

        const json = await res.json();
        setCargo(json || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCargo(false);
      }
    })();
  }, [isLogged]);

  // =========================================================
  // LOGIN PAGE
  // =========================================================
  if (!isLogged) {
    return (
      <div className="login-form-wrapper">
        <div className="login-card">
          <div className="logo-text">HAULZ</div>

          <form className="form" onSubmit={handleLogin}>
            <div className="field">
              <input
                type="text"
                placeholder="Логин"
                className="login-input"
                value={auth.login}
                onChange={(e) =>
                  setAuth({ ...auth, login: e.target.value })
                }
              />
            </div>

            <div className="field password-input-container">
              <input
                type="password"
                placeholder="Пароль"
                className="login-input"
                value={auth.password}
                onChange={(e) =>
                  setAuth({ ...auth, password: e.target.value })
                }
              />
            </div>

            {loginError && (
              <p className="error-text">{loginError}</p>
            )}

            <button
              className="button-primary"
              type="submit"
              disabled={loadingLogin}
            >
              {loadingLogin ? "Входим..." : "Войти"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================
  // CARGO PAGE (ONLY PAGE)
  // =========================================================
  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="header-title">Грузы</h1>
      </div>

      <div className="app-main">
        <div className="w-full">
          {loadingCargo ? (
            <div className="loading">Загрузка...</div>
          ) : cargo.length === 0 ? (
            <div className="empty">Нет данных</div>
          ) : (
            <div className="cargo-list">
              {cargo.map((item, i) => (
                <div className="cargo-card" key={i}>
                  <div className="cargo-header-row">
                    <span className="cargo-id">{item.Номер}</span>
                    <span className="cargo-status">{item.Статус}</span>
                  </div>

                  <div className="cargo-row">
                    <span className="cargo-label">Отправитель:</span>
                    <span>{item.Грузоотправитель}</span>
                  </div>

                  <div className="cargo-row">
                    <span className="cargo-label">Получатель:</span>
                    <span>{item.Грузополучатель}</span>
                  </div>

                  <div className="cargo-row">
                    <span className="cargo-label">Погрузка:</span>
                    <span>{item.ГородПогрузки}</span>
                  </div>

                  <div className="cargo-row">
                    <span className="cargo-label">Выгрузка:</span>
                    <span>{item.ГородВыгрузки}</span>
                  </div>

                  <div className="cargo-row">
                    <span className="cargo-label">Вес:</span>
                    <span>{item.Вес} кг</span>
                  </div>

                  <div className="cargo-row">
                    <span className="cargo-label">Платный вес:</span>
                    <span>{item.ПлатныйВес} кг</span>
                  </div>

                  <div className="cargo-row">
                    <span className="cargo-label">Объём:</span>
                    <span>{item.Объем} м³</span>
                  </div>

                  {item.Документ && (
                    <a
                      href={item.Документ}
                      target="_blank"
                      rel="noreferrer"
                      className="doc-link"
                    >
                      Скачать документ
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
