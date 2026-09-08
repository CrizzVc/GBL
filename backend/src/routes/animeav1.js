import { Router } from 'express';
import { getAnimeAV1Episodes, getAnimeAV1Servers, getLatestAnimeAV1 } from '../services/animeav1Service.js';

const router = Router();

router.get('/latest', async (_req, res) => {
  try {
    const data = await getLatestAnimeAV1();
    res.json({ success: true, data });
  } catch (error) {
    console.error('[AnimeAV1] No se pudieron obtener los últimos episodios:', error.message);
    res.status(502).json({ success: false, error: 'No se pudo consultar AnimeAV1.' });
  }
});

router.get('/episodes', async (req, res) => {
  const { url } = req.query;
  if (typeof url !== 'string' || !url.startsWith('https://animeav1.com/media/')) {
    return res.status(400).json({ success: false, error: 'URL de AnimeAV1 no válida.' });
  }
  try {
    res.json({ success: true, data: await getAnimeAV1Episodes(url) });
  } catch (error) {
    console.error('[AnimeAV1] No se pudieron obtener los episodios:', error.message);
    res.status(502).json({ success: false, error: 'No se pudieron consultar los episodios.' });
  }
});

router.get('/servers', async (req, res) => {
  const { url } = req.query;
  if (typeof url !== 'string' || !url.startsWith('https://animeav1.com/media/')) {
    return res.status(400).json({ success: false, error: 'URL de episodio no válida.' });
  }
  try {
    res.json({ success: true, data: await getAnimeAV1Servers(url) });
  } catch (error) {
    console.error('[AnimeAV1] No se pudieron obtener los servidores:', error.message);
    res.status(502).json({ success: false, error: 'No se pudieron consultar los servidores.' });
  }
});

export default router;
