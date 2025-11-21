
import { useState } from "react";

export default function App() {
  const [auth, setAuth] = useState<{ login: string; password: string } | null>(null);
  const [item, setItem] = useState<{ Number: string }>({ Number: "000124472" });
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const PROXY_API_DOWNLOAD_URL = "/api/download";

  const handleDownload = async (docType: string) => {
    if (!item?.Number || !auth) {
      alert("Нет данных для загрузки");
      return;
    }

    const payload = {
      login: auth.login,
      password: auth.password,
      metod: docType,
      number: item.Number,
    };

    setDownloading(docType);
    setDownloadError(null);

    try {
      const res = await fetch(PROXY_API_DOWNLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("Content-Type");

      if (!res.ok) throw new Error(`Ошибка: ${res.status}`);

      if (contentType?.includes("application/json")) {
        const json = await res.json();
        if (!json?.URL) throw new Error("Файл не найден в ответе");

        const fileRes = await fetch(json.URL);
        const blob = await fileRes.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${docType}_${item.Number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${docType}_${item.Number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e: any) {
      setDownloadError(e.message);
      console.error("[DOWNLOAD ERROR]", e);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Загрузка документа</h1>
      <button onClick={() => handleDownload("ЭР")}>Скачать ЭР</button>
    </div>
  );
}
