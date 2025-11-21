import type { VercelRequest, VercelResponse } from "@vercel/node";

const BASE_API_URL = "https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetFile";
// сервисный Basic-auth: admin:juebfnye
const SERVICE_AUTH = "Basic YWRtaW46anVlYmZueWU=";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Читаем JSON из body
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
    metod, // ЭР, АПП, и т.д.
    number, // Номер перевозки
  } = body || {};

  if (!login || !password || !metod || !number) {
    return res.status(400).json({ error: "login, password, metod, and number are required" });
  }

  // URL с параметрами (будут отправлены в теле POST-запроса к 1С)
  // В 1С API GetFile ожидает параметры в теле POST-запроса, но для совместимости
  // и простоты проксирования будем использовать один URL.
  const url = new URL(BASE_API_URL);
  
  try {
    // Двойная авторизация:
    // Auth: Basic [user_creds] - для авторизации пользователя в 1С
    // Authorization: Basic [service_creds] - для авторизации Vercel-прокси в 1С (сервисная авторизация)
    const upstream = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Авторизация пользователя для 1С
        "Auth": `Basic ${btoa(`${login}:${password}`)}`, 
        // Сервисная авторизация для доступа к API 1С
        "Authorization": SERVICE_AUTH,
      },
      // Параметры для GetFile (номер и тип документа)
      body: JSON.stringify({
        Number: number,
        Metod: metod,
      }),
    });

    // 1. Обработка ошибки
    if (!upstream.ok) {
      const text = await upstream.text();
      let errorBody = {};
      try {
        errorBody = JSON.parse(text);
      } catch {
        errorBody = { error: `Upstream error: ${upstream.status}`, details: text.substring(0, 100) };
      }
      return res.status(upstream.status).json(errorBody);
    }

    // 2. Успешный ответ: пробрасываем заголовки и бинарные данные
    
    // Устанавливаем заголовки для скачивания файла (предполагаем PDF)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${number}-${metod}.pdf"`);
    
    // Пробрасываем данные из upstream ответа в VercelResponse
    if (upstream.body) {
        // @ts-ignore
        await upstream.body.pipe(res);
        return;
    } else {
        return res.status(500).json({ error: "Upstream response body is empty" });
    }
    
  } catch (e: any) {
    console.error("Proxy error:", e);
    return res
      .status(500)
      .json({ error: "Proxy error", details: e?.message || String(e) });
  }
}
