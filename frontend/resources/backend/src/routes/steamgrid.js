import { Router } from 'express';
import {
  searchGames,
  getGame,
  getGrids,
  getSquareGrids,
  getHeroes,
  getLogos,
  getIcons
} from '../services/steamgridService.js';

const router = Router();

// Search games by name
router.get('/search', async (req, res) => {
  try {
    const { term } = req.query;
    if (!term || typeof term !== 'string' || term.trim().length === 0) {
      return res.status(400).json({ error: 'Se requiere el parámetro "term"' });
    }
    const results = await searchGames(term.trim());
    res.json(results);
  } catch (error) {
    console.error('[SteamGrid] Error buscando juegos:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get a single game metadata (steam_appid, etc.)
router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = await getGame(gameId);
    res.json(game);
  } catch (error) {
    console.error('[SteamGrid] Error obteniendo juego:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get grids for a game
router.get('/grids/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const grids = await getGrids(gameId);
    res.json(grids);
  } catch (error) {
    console.error('[SteamGrid] Error obteniendo grids:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get square grids for a game
router.get('/square_grids/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const grids = await getSquareGrids(gameId);
    res.json(grids);
  } catch (error) {
    console.error('[SteamGrid] Error obteniendo square grids:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get heroes for a game
router.get('/heroes/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const heroes = await getHeroes(gameId);
    res.json(heroes);
  } catch (error) {
    console.error('[SteamGrid] Error obteniendo heroes:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get logos for a game
router.get('/logos/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const logos = await getLogos(gameId);
    res.json(logos);
  } catch (error) {
    console.error('[SteamGrid] Error obteniendo logos:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get icons for a game
router.get('/icons/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const icons = await getIcons(gameId);
    res.json(icons);
  } catch (error) {
    console.error('[SteamGrid] Error obteniendo icons:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
