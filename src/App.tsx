
import { useState, FormEvent } from "react";

// --- BASIC AUTH HEADER ---
const getAuthHeader = (login: string, password: string): string => {
    const credentials = `${login}:${password}`;
    return btoa(credentials);
};

export default function App() {
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [agreeOffer, setAgreeOffer] = useState(false);
    const [agreePersonal, setAgreePersonal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requestPreview, setRequestPreview] = useState("");

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!login || !password) {
            setError("Введите логин и пароль");
            return;
        }

        if (!agreeOffer || !agreePersonal) {
            setError("Подтвердите согласие с условиями");
            return;
        }

        setLoading(true);

        try {
            const encoded = getAuthHeader(login, password);
            const today = new Date();
            const yearAgo = new Date(today);
            yearAgo.setFullYear(today.getFullYear() - 1);

            const formatDate = (d: Date) =>
                `${d.getFullYear()}-${(d.getMonth() + 1)
                    .toString()
                    .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;

            const dateFrom = formatDate(yearAgo);
            const dateTo = formatDate(today);

            const curl = `curl "https://your-app.vercel.app/api/perevozki?dateFrom=${dateFrom}&dateTo=${dateTo}" \
  --header 'Authorization: Basic ${encoded}'`;
            setRequestPreview(curl);

            const res = await fetch(`/api/perevozki?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
                method: "GET",
                headers: {
                    Authorization: `Basic ${encoded}`,
                },
            });

            if (!res.ok) {
                throw new Error(`Ошибка: ${res.status}`);
            }

        } catch (err: any) {
            setError(err.message || "Ошибка авторизации");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 500, margin: "0 auto", padding: 20 }}>
            <h1 style={{ fontSize: 32, color: "#3b82f6" }}>HAULZ</h1>
            <p style={{ marginBottom: 20 }}>Доставка грузов в Калининград и обратно</p>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Email"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    style={{ width: "100%", marginBottom: 10, padding: 10 }}
                />
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: "100%", marginBottom: 10, padding: 10 }}
                />
                <div>
                    <label>
                        <input
                            type="checkbox"
                            checked={agreeOffer}
                            onChange={() => setAgreeOffer(!agreeOffer)}
                        />
                        Согласие с офертой
                    </label>
                </div>
                <div>
                    <label>
                        <input
                            type="checkbox"
                            checked={agreePersonal}
                            onChange={() => setAgreePersonal(!agreePersonal)}
                        />
                        Персональные данные
                    </label>
                </div>
                <button type="submit" disabled={loading} style={{ marginTop: 10 }}>
                    {loading ? "Загрузка..." : "Подтвердить"}
                </button>
                {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
            </form>

            {requestPreview && (
                <pre
                    style={{
                        backgroundColor: "#f3f4f6",
                        padding: "10px",
                        borderRadius: "6px",
                        marginTop: "20px",
                        fontSize: "12px",
                        whiteSpace: "pre-wrap",
                    }}
                >
                    <strong>Пример запроса:</strong>
                    {"
"}
                    {requestPreview}
                </pre>
            )}
        </div>
    );
}
