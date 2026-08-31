import { Router } from 'express';
import { resolveAppId, getScreenshots, getAppDetails } from '../services/steamService.js';

const router = Router();

// Resolve a game name to a Steam AppID
router.get('/resolve', async (req, res) => {
  try {
    const { term } = req.query;
    if (!term || typeof term !== 'string' || term.trim().length === 0) {
      return res.status(400).json({ error: 'Se requiere el parámetro "term"' });
    }
    const result = await resolveAppId(term.trim());
    res.json(result);
  } catch (error) {
    console.error('[Steam] Error resolviendo appid:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get screenshots for a Steam AppID
router.get('/screenshots/:appid', async (req, res) => {
  try {
    const { appid } = req.params;
    if (!appid) {
      return res.status(400).json({ error: 'Se requiere el appid' });
    }
    const screenshots = await getScreenshots(appid);
    res.json(screenshots);
  } catch (error) {
    console.error('[Steam] Error obteniendo screenshots:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get store details (description, developer, publisher, release date, reviews, tags)
router.get('/details/:appid', async (req, res) => {
  try {
    const { appid } = req.params;
    if (!appid) {
      return res.status(400).json({ error: 'Se requiere el appid' });
    }
    const details = await getAppDetails(appid);
    if (!details) {
      return res.status(404).json({ error: 'No se encontraron detalles para este appid' });
    }
    res.json(details);
  } catch (error) {
    console.error('[Steam] Error obteniendo detalles:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;