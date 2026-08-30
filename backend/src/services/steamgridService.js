const BASE_URL = 'https://www.steamgriddb.com/api/v2';

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = Number(process.env.CACHE_DURATION_MS || 3600000); // 1 hour default

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function apiFetch(path) {
  const apiKey = process.env.STEAMGRID_API_KEY;
  if (!apiKey) {
    throw new Error('STEAMGRID_API_KEY no configurada');
  }

  const cached = getCached(path);
  if (cached) return cached;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SteamGridDB API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const data = json.data || json;
  setCache(path, data);
  return data;
}

/**
 * Search games by name
 * @param {string} term - Search term
 * @returns {Promise<Array>} Array of game results
 */
export async function searchGames(term) {
  return apiFetch(`/search/autocomplete/${encodeURIComponent(term)}`);
}

/**
 * Get grids (vertical cover art) for a game
 * @param {number} gameId - SteamGridDB game ID
 * @returns {Promise<Array>} Array of grid images
 */
export async function getGrids(gameId) {
  return apiFetch(`/grids/game/${gameId}`);
}

/**
 * Get square grids (1:1 cover art) for a game
 * @param {number} gameId - SteamGridDB game ID
 * @returns {Promise<Array>} Array of square grid images
 */
export async function getSquareGrids(gameId) {
  return apiFetch(`/grids/game/${gameId}?dimensions=1:1`);
}

/**
 * Get heroes (horizontal banner art) for a game
 * @param {number} gameId - SteamGridDB game ID
 * @returns {Promise<Array>} Array of hero images
 */
export async function getHeroes(gameId) {
  return apiFetch(`/heroes/game/${gameId}`);
}

/**
 * Get logos for a game
 * @param {number} gameId - SteamGridDB game ID
 * @returns {Promise<Array>} Array of logo images
 */
export async function getLogos(gameId) {
  return apiFetch(`/logos/game/${gameId}`);
}

/**
 * Get icons for a game
 * @param {number} gameId - SteamGridDB game ID
 * @returns {Promise<Array>} Array of icon images
 */
export async function getIcons(gameId) {
  return apiFetch(`/icons/game/${gameId}`);
}
