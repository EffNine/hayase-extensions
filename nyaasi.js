const sizeMap = { KiB: 1024, MiB: 1048576, GiB: 1024 ** 3, TiB: 1024 ** 4 };
const url = atob("aHR0cHM6Ly9ueWFhLnNpLw==");

async function _fetchRSS(query, fetchFn) {
  const rssUrl = `${url}?page=rss&c=1_0&f=0&q=${encodeURIComponent(query)}`;
  const res = await fetchFn(rssUrl);
  if (!res.ok) return [];
  const text = await res.text();
  return _parseRSS(text);
}

function _parseRSS(xml) {
  if (!xml) return [];
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1];
    const title = _extract(itemContent, 'title');
    const link = _extract(itemContent, 'link');
    const pubDate = _extract(itemContent, 'pubDate');
    const seeders = parseInt(_extractNS(itemContent, 'seeders')) || 0;
    const leechers = parseInt(_extractNS(itemContent, 'leechers')) || 0;
    const downloads = parseInt(_extractNS(itemContent, 'downloads')) || 0;
    const hash = _extractNS(itemContent, 'infoHash') || '';
    const sizeStr = _extractNS(itemContent, 'size') || '0 KiB';
    const sizeMatch = sizeStr.match(/([\d.]+)\s*(KiB|MiB|GiB|TiB)/);
    const size = sizeMatch ? parseFloat(sizeMatch[1]) * (sizeMap[sizeMatch[2]] || 1) : 0;
    if (title) {
      items.push({
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'),
        link: link || (hash ? `magnet:?xt=urn:btih:${hash}` : ''),
        pubDate, seeders, leechers, downloads, hash, size
      });
    }
  }
  return items;
}

function _extract(content, tag) {
  const regex = new RegExp(`<${tag}><!\\[CDATA\\[(.+?)\\]\\]><\\/${tag}>|<${tag}>(.+?)<\\/${tag}>`, 'i');
  const match = content.match(regex);
  return match ? (match[1] || match[2] || '').trim() : '';
}

function _extractNS(content, tag) {
  const regex = new RegExp(`<nyaa:${tag}>(.+?)<\\/nyaa:${tag}>`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function buildQuery(title, episode) {
  let query = title.replace(/[^\w\s-]/g, ' ').trim();
  if (episode) query += ` ${episode.toString().padStart(2, '0')}`;
  return query;
}

async function single({ titles, episode, resolution, exclusions, fetch: fetchFn }) {
  if (!titles?.length) return [];
  const query = buildQuery(titles[0], episode);
  const data = await _fetchRSS(query, fetchFn || fetch);
  if (!Array.isArray(data)) return [];
  return map(data, resolution, exclusions);
}

const batch = single;
const movie = single;

function map(items, resolution, exclusions) {
  const excl = (exclusions || []).map(e => e.toLowerCase());
  const resFilter = resolution ? resolution.replace('p', '') : null;
  return items
    .filter(item => {
      const title = (item.title || '').toLowerCase();
      if (excl.length && excl.some(e => title.includes(e))) return false;
      if (resFilter) {
        const resMatch = title.match(/(\d{3,4})p/);
        if (resMatch && resMatch[1] !== resFilter) return false;
      }
      return true;
    })
    .map(item => {
      const hash = item.hash || '';
      const magnet = hash ? `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(item.title || '')}` : '';
      return {
        title: item.title || '',
        link: magnet, hash,
        seeders: item.seeders, leechers: item.leechers, downloads: item.downloads,
        size: item.size, date: new Date(item.pubDate),
        type: 'alt', accuracy: 'medium'
      };
    });
}

async function test() {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch (error) {
    throw new Error('Could not connect to Nyaa.si API');
  }
}

export default { single, batch, movie, test };
export { single, batch, movie, test };
