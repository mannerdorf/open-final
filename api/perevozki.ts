import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// --- ВНЕШНЕЕ API 1С ---
const EXTERNAL_API_URL = 'https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetPerevozki';

// --- БАЗОВАЯ АВТОРИЗАЦИЯ ДЛЯ ПРОКСИ (admin:juebfnye) ---
const ADMIN_AUTH_HEADER = 'Basic YWRtaW46anVlYmZueWU=';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const clientAuthHeader = req.headers.authorization;

  if (!clientAuthHeader || !clientAuthHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid' });
  }

  const clientAuthBase64 = clientAuthHeader.replace('Basic ', '').trim();

  try {
    const decoded = Buffer.from(clientAuthBase64, 'base64').toString();
    const [clientLogin, clientPassword] = decoded.split(':');

    if (!clientLogin || !clientPassword) {
      return res.status(400).json({ error: 'Invalid client credentials format' });
    }

    // Собираем проксируемый URL
    const externalUrl = `${EXTERNAL_API_URL}${req.url?.replace('/api/perevozki', '') || ''}`;

    const response = await axios.get(externalUrl, {
      headers: {
        'Authorization': ADMIN_AUTH_HEADER, // доступ прокси в 1С
        'Auth': `Basic ${clientLogin}:${clientPassword}`, // оригинальные данные клиента
        'Accept-Encoding': 'identity',
      },
      timeout: 15000,
    });

    return res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Proxy error:', error.message);

    if (axios.isAxiosError(error) && error.response) {
      console.error('1C error status:', error.response.status);
      return res.status(error.response.status).json(error.response.data || { error: 'External API Error' });
    }

    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
