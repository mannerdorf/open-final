import type { VercelRequest, VercelResponse } from "@vercel/node";

const BASE_URL =
  "https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetPerevozki";

// сервисный Basic-auth: admin:juebfnye
const SERVICE_AUTH = "Basic YWRtaW56anVlYmZueWU=";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // читаем JSON из body
  let body: any = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const {
    login,
    password,
    // Используем даты из тела запроса фронтенда
    dateFrom = "2024-01-01", 
    dateTo = "2026-01-01",
  } = body || {};

  if (!login || !password) {
    return res.status(400).json({ error: "login and password are required" });
  }

  // URL с параметрами DateB и DateE
  const url = new URL(BASE_URL);
  url.searchParams.set("DateB", dateFrom);
  url.searchParams.set("DateE", dateTo);

  try {
    const upstream = await fetch(url.toString(), {
      method: "GET", // Перевозки обычно GET
      headers: {
        // Авторизация пользователя для 1С
        "Auth": `Basic ${btoa(`${login}:${password}`)}`, 
        // Сервисная авторизация для доступа к API 1С
        "Authorization": SERVICE_AUTH,
      },
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      // пробуем вернуть текст 1С как JSON с ошибкой
      let errorBody = {};
      try {
        errorBody = JSON.parse(text);
      } catch {
        errorBody = { error: `Upstream error: ${upstream.status}`, details: text.substring(0, 100) };
      }
      return res.status(upstream.status).json(errorBody);
    }

    // Возвращаем JSON
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      // Если 1С вернул не JSON, что является ошибкой в этом контексте
      return res.status(500).json({ error: "Invalid JSON response from upstream API" });
    }
  } catch (e: any) {
    console.error("Proxy error:", e);
    return res
      .status(500)
      .json({ error: "Proxy error", details: e?.message || String(e) });
  }
}
