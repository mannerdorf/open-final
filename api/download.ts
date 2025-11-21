import type { VercelRequest, VercelResponse } from "@vercel/node";

const EXTERNAL_API_BASE_URL =
  "https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetFile";

// админский токен из curl
const SERVICE_AUTH = "Basic YWRtaW46anVlYmZueWU=";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { login, password, metod, number } = req.body || {};

    if (!login || !password || !metod || !number) {
      return res.status(400).json({
        error: "Нужны поля: login, password, metod, number",
      });
    }

    // формируем URL как в curl:
    // GetFile?metod=%D0%AD%D0%A0&Number=000107984
    const url =
      `${EXTERNAL_API_BASE_URL}` +
      `?metod=${encodeURIComponent(metod)}` +
      `&Number=${encodeURIComponent(number)}`;

    const upstream = await fetch(url, {
      method: "GET", // ВАЖНО: именно GET, как в curl
      headers: {
        // 1) Authorization – сервисный Basic, закодированный
        Authorization: SERVICE_AUTH,
        // 2) Auth – НЕ закодированный логин:пароль
        //    'Auth: Basic order@lal-auto.com:ZakaZ656565'
        Auth: `Basic ${login}:${password}`,
      },
    });

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    const contentDisposition =
      upstream.headers.get("content-disposition") ||
      `attachment; filename="${encodeURIComponent(
        `${metod}_${number}.pdf`,
      )}"`;

    // Если 1С вернул ошибку – отдаем её как есть, а не 500
    if (!upstream.ok) {
      const errorBody = await upstream.text().catch(() => "");
      console.error(
        "Upstream error:",
        upstream.status,
        errorBody.slice(0, 500),
      );
      res.status(upstream.status).send(
        errorBody || `Upstream error ${upstream.status}`,
      );
      return;
    }

    // Читаем файл и отправляем
    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res
      .status(200)
      .setHeader("Content-Type", contentType)
      .setHeader("Content-Disposition", contentDisposition)
      .send(buffer);
  } catch (error: any) {
    console.error("Proxy error:", error?.message || error);
    res
      .status(500)
      .json({ error: "Proxy fetch failed", message: error?.message });
  }
}
