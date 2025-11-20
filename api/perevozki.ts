import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// --- URL и Даты из рабочего запроса ---
const HARDCODED_EXTERNAL_URL = 'https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetPerevozki?DateB=2024-12-11&DateE=2026-01-01';

// --- 1. АДМИНСКИЙ ТОКЕН (Authorization: Base64) ---
// Соответствует: --header 'Authorization: Basic YWRtaW46anVlYmZueWU='
const ADMIN_AUTH_HEADER = 'Basic YWRtaW46anVlYmZueWU='; 

// --- 2. КЛИЕНТСКИЙ ТОКЕН (Auth: НЕКОДИРОВАННЫЙ логин:пароль) ---
// Соответствует: --header 'Auth: Basic order@lal-auto.com:ZakaZ656565'
const CLIENT_AUTH_RAW_VALUE = 'Basic order@lal-auto.com:ZakaZ656565'; 

/**
 * ПРОКСИ: ТОЧНАЯ КОПИЯ РАБОЧЕГО ЗАПРОСА.
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    // Проверка, что клиент прислал хоть какой-то токен (для Vercel)
    if (!req.headers.authorization) { 
        return res.status(401).json({ error: 'Authorization required' });
    }

    try {
        console.log("PEREVOZKI GET CALL - FINAL PURE REPLICA", {
            TargetURL: HARDCODED_EXTERNAL_URL,
            AuthorizationHeader: ADMIN_AUTH_HEADER, 
            AuthHeader: CLIENT_AUTH_RAW_VALUE, 
            Message: "Отправляется максимально точная копия рабочего запроса."
        });

        const response = await axios.get(HARDCODED_EXTERNAL_URL, {
            headers: {
                // АДМИНСКИЙ ТОКЕН
                'Authorization': ADMIN_AUTH_HEADER, 
                
                // КЛИЕНТСКИЙ ТОКЕН (НЕКОДИРОВАННЫЙ, как требует ваш рабочий запрос)
                'Auth': CLIENT_AUTH_RAW_VALUE,
            },
            // Тайм-аут на случай зависания 1С
            timeout: 15000, 
        });

        res.status(response.status).json(response.data);
        
    } catch (error: any) {
        console.error('External API Request Failed:', error.message);
        
        if (axios.isAxiosError(error) && error.response) {
            console.error('External API Response Status:', error.response.status);
            // Возвращаем клиенту ошибку, полученную от 1С
            return res.status(error.response.status).json(error.response.data || { error: 'External API Error' });
        }

        res.status(500).json({ error: 'Internal Server Error or Network Issue' });
    }
}
