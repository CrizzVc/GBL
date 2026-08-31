const STORE_API = 'https://store.steampowered.com/api/appdetails';

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

/**
 * Get Steam AppID from a game name via the Steam Store search endpoint.
 * @param {string} term - Game name
 * @returns {Promise<{appid: number, name: string} | null>}
 */
export async function resolveAppId(term) {
  const key = `resolve:${term}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=es&cc=us`,
      { headers: { 'Accept-Language': 'es-419,es;q=0.9,en;q=0.8' } }
    );
    if (!res.ok) {
      throw new Error(`Steam search error ${res.status}`);
    }
    const json = await res.json();
    const item = json.items && json.items[0];
    const result = item ? { appid: item.id, name: item.name } : null;
    setCache(key, result);
    return result;
  } catch (err) {
    console.error('[SteamService] Error resolviendo appid:', err.message);
    return null;
  }
}

/**
 * Get store details (including screenshots) for a Steam AppID.
 * @param {number|string} appid - Steam AppID
 * @returns {Promise<Array>} Array of screenshot objects
 */
export async function getScreenshots(appid) {
  const key = `shots:${appid}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const res = await fetch(`${STORE_API}?appids=${appid}&l=es`, {
      headers: { 'Accept-Language': 'es-419,es;q=0.9,en;q=0.8' }
    });
    if (!res.ok) {
      throw new Error(`Steam appdetails error ${res.status}`);
    }
    const json = await res.json();
    const data = json[appid];
    const screenshots =
      data && data.success && data.data && data.data.screenshots
        ? data.data.screenshots
        : [];
    setCache(key, screenshots);
    return screenshots;
  } catch (err) {
    console.error('[SteamService] Error obteniendo screenshots:', err.message);
    return [];
  }
}
