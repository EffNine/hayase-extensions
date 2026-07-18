const base = atob("aHR0cHM6Ly9hcGliYXkub3JnL3EucGhwP3E9");

function buildQuery(title, episode) {
  let query = title.replace(/[^\w\s-]/g, ' ').trim();
  if (episode) query += ` ${episode.toString().padStart(2, '0')}`;
  return query;
}

function map(data) {
  return data.map(item => {
    const hash = item.info_hash || '';
    const magnet = hash ? `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(item.name || '')}` : '';
    return {
      title: item.name || '', link: magnet, hash,
      seeders: parseInt(item.seeders || '0'), leechers: parseInt(item.leechers || '0'),
      downloads: 0, size: Number(item.size || 0),
      date: new Date((parseInt(item.added || '0') || 0) * 1000),
      type: 'alt', accuracy: 'medium'
    };
  });
}

async function _fetchWithRetry(url, fetchFn) {
  const maxRetries = 3;
  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetchFn(url);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError || new Error('Failed to fetch data after multiple retries.');
}

async function _fetchWithCorsFallback(url, fetchFn) {
  return await _fetchWithRetry(url, fetchFn);
}

async function single({ titles, episode, fetch: fetchFn }, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!titles?.length) return [];
  const query = buildQuery(titles[0], episode);
  const queryEncoded = encodeURIComponent(query);
  const url = base + queryEncoded;
  try {
    return await _fetchWithCorsFallback(url, fetchFn);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not connect to The Pirate Bay API or fetch data due to network/CORS restrictions. Details: ${errorMessage}`);
  }
}

const batch = single;
const movie = single;

async function test() {
  try {
    const url = base + 'test';
    const res = await fetch(url);
    return res.ok;
  } catch (error) {
    throw new Error('Could not connect to The Pirate Bay API');
  }
}

export default { single, batch, movie, test };
export { single, batch, movie, test };
