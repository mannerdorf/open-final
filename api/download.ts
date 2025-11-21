import type { VercelRequest, VercelResponse } from "@vercel/node";

// URL 1С
const EXTERNAL_API_BASE_URL =
  "https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetFile";

// Админский Base64-токен (строго как в curl)
const SERVICE_AUTH = "Basic YWRtaW46anVlYmZueWU=";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Фронт шлёт только POST — это проверяем
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // На Vercel body бывает строкой, приводим к объекту
    let body: any = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    const { login, password, metod, number } = body ?? {};

    if (!login || !password || !metod || !number) {
      return res.status(400).json({
        error: "Required fields: login, password, metod, number",
      });
    }

    // Формируем URL как в рабочем curl:
    // /GetFile?metod=ЭР&Number=000107984
    const url =
      `${EXTERNAL_API_BASE_URL}` +
      `?metod=${encodeURIComponent(metod)}` +
      `&Number=${encodeURIComponent(number)}`;

    console.log("➡️ GetFile URL:", url);

    // Делаем запрос — порядок заголовков 1 в 1, как у тебя
    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        // 1) сначала Auth (клиентский логин/пароль НЕ base64)
        Auth: `Basic ${login}:${password}`,

        // 2) потом Authorization (админский base64)
        Authorization: SERVICE_AUTH,
      },
    });

    const status = upstream.status;
    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";

    // Если 1С вернула ошибку — пробрасываем как есть
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("⛔ Upstream error:", status, text);
      return res.status(status).send(text || `Upstream error ${status}`);
    }

    // Если 1С вернула JSON/текст — значит файл не найден или ошибка формирования
    if (
      contentType.includes("application/json") ||
      contentType.startsWith("text/")
    ) {
      const text = await upstream.text();
      console.error("⚠️ Upstream returned JSON instead of file:", text);
      return res.status(502).json({
        error: "Upstream returned non-file response",
        body: text,
      });
    }

    // Формируем имя файла
    const upstreamDisposition = upstream.headers.get("content-disposition");
    const fallbackFilename = `${metod}_${number}.pdf`;
    const contentDisposition =
      upstreamDisposition ||
      `attachment; filename="${encodeURIComponent(fallbackFilename)}"`;

    // Передаём файл как бинарь
    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res
      .status(200)
      .setHeader("Content-Type", contentType)
      .setHeader("Content-Disposition", contentDisposition)
      .send(buffer);
  } catch (err: any) {
    console.error("🔥 Proxy error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Proxy fetch failed", message: err?.message });
  }
}
