import { FormEvent, useEffect, useState, useMemo } from "react";
import { db, auth } from "./firebase";   // ← ВАЖНО: подключаем Firebase ОТСЮДА
import { 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';

/* ------------------------------------------------------
                КОНСТАНТЫ FIREBASE
------------------------------------------------------ */

// Данные из Telegram initData (если есть)
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const appId = rawAppId.split('/')[0]; 

const SESSION_COLLECTION = 'sessions';
const SESSION_DOCUMENT = 'current_session';


/* ------------------------------------------------------
                HOOK: Firebase Auth
------------------------------------------------------ */
const useFirebaseAuth = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const a = auth;

    const unsubscribe = onAuthStateChanged(a, (user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);

      setIsReady(true);
    });

    // Входим анонимно (или по токену)
    const start = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(a, __initial_auth_token);
        } else {
          await signInAnonymously(a);
        }
      } catch (e) {
        console.error("AUTH ERROR:", e);
      }
    };

    start();
    return () => unsubscribe();
  }, []);

  return { userId, isReady };
};


/* ------------------------------------------------------
                useTelegram HOOK
------------------------------------------------------ */
declare global {
  interface Window {
    Telegram: any;
  }
}

const useTelegram = () => {
  return { tg: window.Telegram?.WebApp };
};


/* ------------------------------------------------------
                App Component
------------------------------------------------------ */
function App() {
  const { tg } = useTelegram();
  const { userId, isReady } = useFirebaseAuth();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [agreeOffer, setAgreeOffer] = useState(false);
  const [agreePersonal, setAgreePersonal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [authData, setAuthData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("cargo");

  const [sessionChecked, setSessionChecked] = useState(false);

  const getSessionRef = (uid: string) =>
    doc(db, "artifacts", appId, "users", uid, SESSION_COLLECTION, SESSION_DOCUMENT);

  useEffect(() => {
    if (!isReady || !userId) return;

    const load = async () => {
      try {
        const ref = getSessionRef(userId);
        const snap = await getDoc(ref);

        if (snap.exists() && snap.data().isLoggedIn) {
          setAuthData({ login: snap.data().login });
        }
      } catch (e) {
        console.log("Session check error:", e);
      }

      setSessionChecked(true);
    };

    load();
  }, [isReady, userId]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError(null);

    const cleanLogin = login.trim();
    const cleanPassword = password.trim();

    if (!cleanLogin || !cleanPassword) {
      setError("Введите логин и пароль");
      return;
    }

    if (!agreeOffer || !agreePersonal) {
      setError("Необходимо согласие");
      return;
    }

    try {
      setLoading(true);

      // ИМИТАЦИЯ успешной авторизации
      await new Promise((res) => setTimeout(res, 500));

      if (userId) {
        await setDoc(getSessionRef(userId), {
          isLoggedIn: true,
          login: cleanLogin,
          ts: Date.now()
        });
      }

      setAuthData({ login: cleanLogin });
      setActiveTab("cargo");
    } catch (err: any) {
      setError("Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };


  /* ------------------------------------------------------
                  Рендер
  ------------------------------------------------------ */
  if (!isReady || !sessionChecked) {
    return <div style={{ padding: 30 }}>Загрузка...</div>;
  }

  if (!authData) {
    return (
      <div style={{ padding: 30, maxWidth: 400, margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", color: "#2D5BFF" }}>HAULZ</h1>
        <p style={{ textAlign: "center", opacity: 0.6 }}>
          Доставка грузов в Калининград
        </p>

        <form onSubmit={handleSubmit}>
          <input
            placeholder="Email"
            className="tg-input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            style={{ width: "100%", marginBottom: 12 }}
          />

          <input
            type="password"
            placeholder="Пароль"
            className="tg-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", marginBottom: 12 }}
          />

          <label>
            <input
              type="checkbox"
              checked={agreeOffer}
              onChange={(e) => setAgreeOffer(e.target.checked)}
            />{" "}
            Согласие с офертой
          </label>

          <br />

          <label>
            <input
              type="checkbox"
              checked={agreePersonal}
              onChange={(e) => setAgreePersonal(e.target.checked)}
            />{" "}
            Персональные данные
          </label>

          <button
            type="submit"
            className="tg-main-button"
            style={{ marginTop: 20, width: "100%" }}
          >
            {loading ? "..." : "Войти"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 20, color: "red", textAlign: "center" }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------
              АВТОРИЗОВАННЫЙ ИНТЕРФЕЙС
  ------------------------------------------------------ */
  return (
    <div style={{ padding: 20 }}>
      <h2>Добро пожаловать, {authData.login}</h2>
      <p>Выберите вкладку снизу</p>

      <div style={{ height: 300 }} />

      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}

/* ------------------------------------------------------
              Таббар (как у тебя)
------------------------------------------------------ */
function TabBar({ active, onChange }: any) {
  const items = [
    { id: "home", label: "Главная", icon: "🏠" },
    { id: "cargo", label: "Грузы", icon: "📦" },
    { id: "docs", label: "Документы", icon: "📄" },
    { id: "profile", label: "Профиль", icon: "👤" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        background: "#fff",
        borderTop: "1px solid #eee",
        padding: "10px 0"
      }}
    >
      {items.map((i) => (
        <div
          key={i.id}
          onClick={() => onChange(i.id)}
          style={{
            flex: 1,
            textAlign: "center",
            color: active === i.id ? "#2D5BFF" : "#999"
          }}
        >
          <div>{i.icon}</div>
          <div style={{ fontSize: 12 }}>{i.label}</div>
        </div>
      ))}
    </div>
  );
}

export default App;
