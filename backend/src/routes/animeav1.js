import { Router } from 'express';
import { getLatestAnimeAV1 } from '../services/animeav1Service.js';

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

export default router;
