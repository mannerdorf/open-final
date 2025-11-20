import type { VercelRequest, VencilResponse } from "@vercel/node";
import { Buffer } from "buffer";

const BASE_URL =
  "https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetPerevozki";

// сервисный Basic-auth (должен быть закодирован в Base64)
const SERVICE_AUTH = "Basic YWRtaW46anVlYmZueWU=";

// Определяем тип для ожидаемых параметров (DateB, DateE)
interface RequestQuery {
  dateFrom?: string;
  dateTo?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- ИСПРАВЛЕНИЕ: Разрешаем только GET запросы ---
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  // 1. Получение данных для фильтрации из URL-параметров (req.query)
  const { dateFrom, dateTo } = req.query as RequestQuery;

  // 2. Получение данных для авторизации из заголовка (Authorization Header)
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res
      .status(401)
      .json({ error: "Authorization header (Basic Auth) is required." });
  }

  // Извлекаем Base64 часть и декодируем её
  const encodedCredentials = authHeader.replace("Basic ", "").trim();
  let login = "";
  let password = "";

  try {
    const decoded = Buffer.from(encodedCredentials, "base64").toString("utf-8");
    [login, password] = decoded.split(":");
  } catch (e) {
    return res.status(400).json({ error: "Invalid Basic Auth format." });
  }

  const cleanLogin = (login || "").trim();
  const cleanPassword = (password || "").trim();

  if (!cleanLogin || !cleanPassword) {
    return res.status(400).json({ error: "login and password are required" });
  }

  // Логирование (без чувствительных данных)
  console.log("PEREVOZKI GET CALL", {
    login: cleanLogin,
    ua: req.headers["user-agent"],
  });

  const url = new URL(BASE_URL);
  // Используем DateB/DateE для внешнего API 1С
  url.searchParams.set("DateB", dateFrom || "2024-01-01"); 
  url.searchParams.set("DateE", dateTo || "2026-01-01");

  // --- Basic Auth: кодирование пользовательских данных для внешнего API ---
  const userAuthBase64 = Buffer.from(`${cleanLogin}:${cleanPassword}`).toString(
    "base64"
  );

  try {
    const upstream = await fetch(url.toString(), {
      method: "GET",
      headers: {
        // Заголовок с пользовательским Basic Auth для внешнего API (как на скриншоте Postman)
        // Используем 'Authorization' для 1С, так как это стандартный заголовок Basic Auth.
        Authorization: `Basic ${userAuthBase64}`,
        
        // (Удалил SERVICE_AUTH, так как он, вероятно, не нужен для Upstream-запроса, 
        // если только вы не используете его как часть механизма прокси. 
        // Если внешний API требует SERVICE_AUTH, добавьте его обратно в заголовок `Authorization` или другой заголовок.)
      },
    });
    // ... (оставшаяся часть логики обработки ответа остается без изменений)

    const text = await upstream.text();

    console.log("PEREVOZKI AUTH RESPONSE", {
      status: upstream.status,
      ok: upstream.ok,
      bodyPreview: text.slice(0, 200),
    });

    if (!upstream.ok) {
      // Возвращаем статус и текст из 1С как есть
      return res
        .status(upstream.status)
        .send(text || `Upstream error: ${upstream.status}`);
    }

    // Если 1С вернул JSON — пробуем распарсить
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      // Не JSON — возвращаем текст как есть
      return res.status(200).send(text);
    }
  } catch (error) {
    // Улучшенная обработка ошибок
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Proxy error:", error);
    return res
      .status(500)
      .json({ error: "Proxy error", details: errorMessage });
  }
}
