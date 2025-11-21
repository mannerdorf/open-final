import type { VercelRequest, VercelResponse } from "@vercel/node";

// Базовый URL 1С
const EXTERNAL_API_BASE_URL =
  "https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetFile";

// Сервисный Basic-auth из рабочего curl
// Authorization: Basic YWRtaW46anVlYmZueWU=
const SERVICE_AUTH = "Basic YWRtaW46anVlYmZueWU=";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Разрешаем только POST, как у тебя на фронте
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { login, password, metod, number } = req.body ?? {};

    if (!login || !password || !metod || !number) {
      return res.status(400).json({
        error: "Required fields: login, password, metod, number",
      });
    }

    // Формируем URL ровно как в примере:
    // https://.../GetFile?metod=ЭР&Number=000107984
    const url =
      `${EXTERNAL_API_BASE_URL}` +
      `?metod=${encodeURIComponent(metod)}` +
      `&Number=${encodeURIComponent(number)}`;

    console.log("GetFile URL:", url);

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        // 1) админский Basic (как в curl)
        Authorization: SERVICE_AUTH,
        // 2) клиентский токен — НЕ кодируем в base64, просто "Basic login:password"
        //    соответствует: Auth: Basic order@lal-auto.com:ZakaZ656565
        Auth: `Basic ${login}:${password}`,
      },
    });

    const status = upstream.status;
    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";

    // Если 1С вернула НЕ 2xx — пробрасываем текст как есть
    if (!upstream.ok) {
      const errorBody = await upstream.text().catch(() => "");
      console.error("Upstream error:", status, errorBody);
      return res.status(status).send(
        errorBody || `Upstream error ${status}`,
      );
    }

    // Если 1С неожиданно вернула JSON/текст (Success:true и т.п.) — считаем это ошибкой,
    // а не "пустым PDF".
    if (
      contentType.includes("application/json") ||
      contentType.startsWith("text/")
    ) {
      const text = await upstream.text();
      console.error("Upstream returned non-file body:", text);
      return res.status(502).json({
        error: "Upstream returned non-file response",
        body: text,
      });
    }

    // Настраиваем имя файла
    const upstreamDisposition = upstream.headers.get("content-disposition");
    const filename = `${metod}_${number}.pdf`;
    const contentDisposition =
      upstreamDisposition ||
      `attachment; filename="${encodeURIComponent(filename)}"`;

    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res
      .status(200)
      .setHeader("Content-Type", contentType)
      .setHeader("Content-Disposition", contentDisposition)
      .send(buffer);
  } catch (err: any) {
    console.error("Proxy error:", err?.message || err);
    return res
      .status(500)
      .json({ error: "Proxy fetch failed", message: err?.message });
  }
}
