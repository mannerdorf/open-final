import type { VercelRequest, VercelResponse } from "@vercel/node";
// 🛑 УДАЛИТЕ: import fetch from "node-fetch"; 
// 🛑 УДАЛИТЕ: import { Buffer } from "buffer"; 

// URL внешнего API 1С для получения файла
const EXTERNAL_API_BASE_URL = "https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetFile";

// Сервисный Basic-auth: admin:juebfnye (Base64-кодированный)
const SERVICE_AUTH = "Basic YWRtaW46anVlYmZueWU="; 

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

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
        metod, 
        Number, 
    } = body || {};

    if (!login || !password || !metod || !Number) {
        return res.status(400).json({ error: "login, password, metod, and Number are required" });
    }

    // Используем глобальный конструктор URL
    const url = new URL(EXTERNAL_API_BASE_URL);
    url.searchParams.set("metod", metod); 
    url.searchParams.set("Number", Number);

    try {
        // Используем глобальный fetch
        const upstream = await fetch(url.toString(), {
            method: "GET", 
            headers: {
                'Auth': `Basic ${login}:${password}`, 
                'Authorization': SERVICE_AUTH,
            },
        });

        if (!upstream.ok) {
            const errorText = await upstream.text();
            return res.status(upstream.status).send(
                errorText || {
                    error: `Upstream error: ${upstream.status}`,
                }
            );
        }

        // 5. Передача заголовков файла и данных
        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        const contentDisposition = upstream.headers.get('content-disposition') || `attachment; filename="${Number}_${metod}.pdf"`;
        
        res.status(200)
           .setHeader('Content-Type', contentType)
           .setHeader('Content-Disposition', contentDisposition);

        // Получаем arrayBuffer и используем глобальный Buffer
        const buffer = await upstream.arrayBuffer();
        res.send(Buffer.from(buffer)); // ⬅️ Используем глобальный Buffer
        
    } catch (error: any) {
        console.error('Proxy error:', error?.message || error);
        res.status(500).json({ error: 'Proxy fetch failed' });
    }
}
