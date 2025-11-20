import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// --- КОНФИГУРАЦИЯ ВНЕШНЕГО API ---
const EXTERNAL_API_BASE_URL = 'https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetPerevozki';

// --- СЛУЖЕБНЫЕ ДАННЫЕ ДЛЯ АВТОРИЗАЦИИ ПРОКСИ В 1С (ЗАШИТЫЕ) ---
const ADMIN_AUTH_BASE64 = 'YWRtaW46anVlYmZueWU=';
const ADMIN_AUTH_HEADER = `Basic ${ADMIN_AUTH_BASE64}`;

// --- ЖЁСТКИЕ РАБОЧИЕ ДАТЫ ИЗ ВАШЕГО CURL/POSTMAN ---
const WORKING_QUERY_PARAMS = '?DateB=2024-12-11&DateE=2026-01-01'; 

/**
 * Обработчик для прокси-запросов (Временно с захардкоженными рабочими датами).
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const clientAuthHeader = req.headers.authorization;

    if (!clientAuthHeader || !clientAuthHeader.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Authorization required' });
    }

    const clientAuthBase64 = clientAuthHeader.replace('Basic ', '').trim();

    try {
        const decoded = Buffer.from(clientAuthBase64, 'base64').toString();
        const [clientLogin] = decoded.split(":");
        
        // --- ИСПОЛЬЗУЕМ РАБОЧИЙ URL ИЗ POSTMAN ---
        const externalUrl = `${EXTERNAL_API_BASE_URL}${WORKING_QUERY_PARAMS}`;

        console.log("PEREVOZKI GET CALL - FINAL DEBUG VERSION", {
            ClientLoginDecoded: clientLogin, 
            ClientAuthSentAs_Auth_Header: `Basic ${clientAuthBase64}`, 
            TargetURL: externalUrl, // Проверьте этот URL в логах!
            Message: "Используются рабочие даты из Postman. Проверяем, что проблема не в передаче Query Params."
        });

        const response = await axios.get(externalUrl, {
            headers: {
                // 1. СЛУЖЕБНЫЙ ЗАГОЛОВОК
                'Authorization': ADMIN_AUTH_HEADER, 
                
                // 2. КЛИЕНТСКИЙ ЗАГОЛОВОК
                'Auth': `Basic ${clientAuthBase64}`, 
                
                'Accept-Encoding': 'identity', 
            },
            timeout: 15000, 
        });

        res.status(response.status).json(response.data);
        
    } catch (error: any) {
        console.error('External API Request Failed:', error.message);
        
        if (axios.isAxiosError(error) && error.response) {
            console.error('External API Response Status:', error.response.status);
            // Если 1С вернул ошибку, прокси возвращает ее статус (401 или 500)
            return res.status(error.response.status).json(error.response.data || { error: 'External API Error' });
        }

        res.status(500).json({ error: 'Internal Server Error or Network Issue' });
    }
}
