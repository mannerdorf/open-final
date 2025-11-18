import { useState } from "react";

export default function App() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleLogin = async () => {
    try {
      const res = await fetch(
        "https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetPerevozki?DateB=2024-01-01&DateE=2026-01-01",
        {
          method: "GET",
          headers: {
            "Authorization": "Basic " + btoa(`${login}:${password}`),
            "Auth": `Basic ${login}:${password}`
          }
        }
      );

      if (res.status === 200) {
        setStatus("Вы авторизованы!");
      } else {
        setStatus("Ошибка авторизации: " + res.status);
      }
    } catch (e) {
      setStatus("Ошибка сети");
    }
  };

  return (
    <div className="login-container">
      <h2>Введите логин и пароль</h2>

      <input
        placeholder="Логин"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
      />

      <input
        placeholder="Пароль"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>Подтвердить</button>

      {status && <p>{status}</p>}
    </div>
  );
}
