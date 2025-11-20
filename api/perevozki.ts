import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// --- КОНФИГУРАЦИЯ ВНЕШНЕГО API ---
const EXTERNAL_API_BASE_URL = 'https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetPerevozki';

// --- СЛУЖЕБНЫЕ ДАННЫЕ АДМИНИСТРАТОРА (для передачи через Auth) ---
const ADMIN_AUTH_BASE64 = 'YWRtaW46anVlYmZueWU=';
const ADMIN_AUTH_VALUE = `Basic ${ADMIN_AUTH_BASE64}`;

// --- ЖЁСТКИЕ РАБОЧИЕ ДАТЫ ИЗ ВАШЕГО CURL/POSTMAN ---
const WORKING_QUERY_PARAMS = '?DateB=2024-12-11&DateE=2026-01-01'; 

/**
 * ФИНАЛЬНАЯ ПОПЫТКА: Клиентский токен идет в 'Authorization'.
 * Служебный токен идет в 'Auth'.
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Это Base64 клиента, который пришел от фронтенда
    const clientAuthHeader = req.headers.authorization; 

    if (!clientAuthHeader || !clientAuthHeader.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Authorization required' });
    }

    try {
        // --- ФОРМИРОВАНИЕ URL (с жёсткими датами) ---
        const externalUrl = `${EXTERNAL_API_BASE_URL}${WORKING_QUERY_PARAMS}`;

        console.log("PEREVOZKI GET CALL - FINAL AUTH SWAP DEBUG", {
            TargetURL: externalUrl,
            // СВЕРЯЕМСЯ С ТРЕБОВАНИЯМИ 1С:
            // 1. Клиентский токен отправляется в 'Authorization'
            AuthorizationHeaderSent: clientAuthHeader, 
            // 2. Служебный токен отправляется в 'Auth'
            AuthHeaderSent: ADMIN_AUTH_VALUE,
        });

        const response = await axios.get(externalUrl, {
            headers: {
                // *** 1. КЛИЕНТСКИЙ ТОКЕН отправляем в 'Authorization' ***
                'Authorization': clientAuthHeader, 
                
                // *** 2. СЛУЖЕБНЫЙ ТОКЕН отправляем в 'Auth' ***
                'Auth': ADMIN_AUTH_VALUE, 
                
                'Accept-Encoding': 'identity', 
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
