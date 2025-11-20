import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// --- КОНФИГУРАЦИЯ ВНЕШНЕГО API (ЖЕСТКО ЗАДАННЫЙ РАБОЧИЙ URL) ---
const HARDCODED_EXTERNAL_URL = 'https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetPerevozki?DateB=2024-12-11&DateE=2026-01-01'; // С рабочими датами

// --- 1. АДМИНСКИЕ ДАННЫЕ (для 'Authorization', КОДИРОВАННЫЙ) ---
const ADMIN_AUTH_HEADER = 'Basic YWRtaW46anVlYmZueWU='; // Соответствует --header 'Authorization: Basic YWRtaW46anVlYmZueWU='

// --- 2. КЛИЕНТСКИЕ ДАННЫЕ (для 'Auth', НЕКОДИРОВАННЫЙ) ---
const CLIENT_AUTH_RAW_VALUE = 'Basic order@lal-auto.com:ZakaZ656565'; // Соответствует --header 'Auth: Basic order@lal-auto.com:ZakaZ656565'

/**
 * ПРОКСИ ДЛЯ АБСОЛЮТНОЙ ТОЧНОСТИ: Использует жёсткий URL и точные заголовки.
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    // Проверяем наличие заголовка, хотя его содержимое игнорируется
    if (!req.headers.authorization) { 
        return res.status(401).json({ error: 'Authorization required' });
    }

    try {
        console.log("PEREVOZKI GET CALL - PURE REPLICA FINAL (FULL SYNTAX)", {
            TargetURL: HARDCODED_EXTERNAL_URL,
            AuthorizationHeader: ADMIN_AUTH_HEADER, 
            AuthHeader: CLIENT_AUTH_RAW_VALUE, 
            Message: "Используется точная копия рабочего CURL-запроса, исключая любые модификации."
        });

        const response = await axios.get(HARDCODED_EXTERNAL_URL, {
            headers: {
                // Полный синтаксис в коде Node.js не существует, мы используем строковые ключи,
                // которые Axios отправляет как полные заголовки.
                'Authorization': ADMIN_AUTH_HEADER, // Соответствует --header 'Authorization: ...'
                'Auth': CLIENT_AUTH_RAW_VALUE,       // Соответствует --header 'Auth: ...'
                
                // Другие заголовки исключены
            },
            timeout: 15000, 
        });

        res.status(response.status).json(response.data);
        
    } catch (error: any) {
        console.error('External API Request Failed:', error.message);
        
        if (axios.isAxiosError(error) && error.response) {
            console.error('External API Response Status:', error.response.status);
            return res.status(error.response.status).json(error.response.data || { error: 'External API Error' });
        }

        res.status(500).json({ error: 'Internal Server Error or Network Issue' });
    }
}
