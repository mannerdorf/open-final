import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// --- ЖЁСТКО ЗАДАННЫЙ URL С ДАТАМИ ---
const HARDCODED_EXTERNAL_URL =
  'https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetPerevozki?DateB=2024-12-11&DateE=2026-01-01';

// --- ПОЛНЫЕ ЗАГОЛОВКИ ---
// 1. Админ авторизация (Authorization)
const FULL_ADMIN_HEADER_NAME = 'Authorization';
const FULL_ADMIN_HEADER_VALUE = 'Basic YWRtaW46anVlYmZueWU=';

// 2. Клиентская авторизация (Auth)
const FULL_CLIENT_HEADER_NAME = 'Auth';
const FULL_CLIENT_HEADER_VALUE = 'Basic order@lal-auto.com:ZakaZ656565';

/**
 * Прокси-эндпоинт, полностью воспроизводящий формат CURL/Postman-запроса.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    console.log('>>> PEREVOZKI: Отправка точного запроса...');
    console.log('>>> URL:', HARDCODED_EXTERNAL_URL);
    console.log(`>>> --header '${FULL_ADMIN_HEADER_NAME}: ${FULL_ADMIN_HEADER_VALUE}'`);
    console.log(`>>> --header '${FULL_CLIENT_HEADER_NAME}: ${FULL_CLIENT_HEADER_VALUE}'`);

    const response = await axios.get(HARDCODED_EXTERNAL_URL, {
      headers: {
        [FULL_ADMIN_HEADER_NAME]: FULL_ADMIN_HEADER_VALUE,
        [FULL_CLIENT_HEADER_NAME]: FULL_CLIENT_HEADER_VALUE,
      },
      timeout: 15000,
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Ошибка при обращении к внешнему API:', error.message);

    if (axios.isAxiosError(error) && error.response) {
      console.error('Код ответа внешнего API:', error.response.status);
      return res
        .status(error.response.status)
        .json(error.response.data || { error: 'External API Error' });
    }

    res.status(500).json({ error: 'Internal Server Error or Network Issue' });
  }
}
