import { FormEvent, useState } from "react";

type ApiError = {
  error?: string;
  [key: string]: unknown;
};

export default function App() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!login || !password) {
      setError("Введите логин и пароль");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/perevozki", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login, password }),
      });

      if (!res.ok) {
        let message = `Ошибка авторизации: ${res.status}`;

        try {
          const data = (await res.json()) as ApiError;
          if (data.error) {
            message = data.error;
          }
        } catch {
          // если бэкенд вернул не JSON — просто оставляем статус
        }

        setError(message);
        setAuthorized(false);
        return;
      }

      // Если добрались сюда — авторизация прошла
      setAuthorized(true);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Ошибка сети");
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        {!authorized ? (
          <>
            <h1 className="title">Введите логин и пароль</h1>
            <p className="subtitle">
              Используйте ваши учётные данные для доступа к перевозкам
            </p>

            <form onSubmit={handleSubmit} className="form">
              <input
                className="input"
                type="text"
                placeholder="Логин (email)"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
              />

              <input
                className="input"
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />

              <button className="button" type="submit" disabled={loading}>
                {loading ? "Проверяем…" : "Подтвердить"}
              </button>
            </form>

            {error && <p className="error">{error}</p>}
          </>
        ) : (
          <>
            <h1 className="title">Вы авторизованы</h1>
            <p className="subtitle">
              Дальше сюда выведем список перевозок или дашборд Haulz.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
