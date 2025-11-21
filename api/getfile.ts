// api/download.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const EXTERNAL_GETFILE_URL =
  'https://tdn.postb.ru/workbase/hs/DeliveryWebService/GetFile';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Разрешаем только POST, иначе 405
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { login, password, metod, number } = req.body || {};

  if (!login || !password || !metod || !number) {
    return res.status(400).json({
      error: 'Нужны поля: login, password, metod, number',
    });
  }

  try {
    // формируем URL типа:
    // https://tdn.postb.ru/.../GetFile?metod=ЭР&Number=000107984
    const url =
      `${EXTERNAL_GETFILE_URL}` +
      `?metod=${encodeURIComponent(metod)}` +
      `&Number=${encodeURIComponent(number)}`;

    const externalResponse = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        // 1) админский токен (Base64) — строго как в curl
        Authorization: 'Basic YWRtaW46anVlYmZueWU=',
        // 2) клиентский токен — НЕ кодируем, просто "Basic login:password"
        //    соответствует: Auth: Basic order@lal-auto.com:ZakaZ656565
        Auth: `Basic ${login}:${password}`,
      },
    });

    // Пробрасываем файл обратно на фронт
    const contentType =
      externalResponse.headers['content-type'] || 'application/pdf';
    const filename = `${metod}_${number}.pdf`;

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    return res.status(200).send(Buffer.from(externalResponse.data));
  } catch (err: any) {
    const status = err.response?.status || 500;
    console.error('GetFile error:', status, err.response?.data || err.message);

    return res.status(status).json({
      error: 'Ошибка при скачивании файла',
      status,
      // для дебага можно временно отдавать тело ошибки как текст
      upstream: err.response?.data?.toString?.(),
    });
  }
}
