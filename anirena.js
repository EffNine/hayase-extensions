const base = atob("aHR0cHM6Ly93d3cuYW5pcmVuYS5jb20vcnNz");

async function _fetchWithCors(url, fetchFn) {
  if (fetchFn) return fetchFn(url);
  return fetch(url);
}

function _parseRSS(xml) {
  const items = [];
  const itemRegex = /<item[\s\S]*?<\/item>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const item = itemMatch[0];
    const title = _extract(item, "<title>", "</title>");
    const link = _extract(item, "<link>", "</link>");
    const magnet = _extract(item, "<magnet:file>", "</magnet:file>") || _extract(item, "<enclosure>", "</enclosure>");
    const enclosure = _extract(item, "<enclosure", "</enclosure>");
    const enclosureUrl = enclosure ? (enclosure.match(/url="([^"]+)"/) || [])[1] : "";
    const enclosureType = enclosure ? (enclosure.match(/type="([^"]+)"/) || [])[1] : "";
    const size = _extract(item, "<size>", "</size>") || _extract(item, "<torrent_size>", "</torrent_size>");
    const seeders = _extract(item, "<seeders>", "</seeders>");
    const leechers = _extract(item, "<leechers>", "</leechers>");
    const comments = _extract(item, "<comments>", "</comments>");
    const pubDate = _extract(item, "<pubDate>", "</pubDate>") || _extract(item, "<date>", "</date>");
    const description = _extract(item, "<description>", "</description>");
    let hash = "";
    if (magnet && magnet.includes("btih:")) {
      const hashMatch = magnet.match(/btih:([0-9A-Fa-f]+)/);
      hash = hashMatch ? hashMatch[1] : "";
    } else if (link && link.includes("btih:")) {
      const hashMatch = link.match(/btih:([0-9A-Fa-f]+)/);
      hash = hashMatch ? hashMatch[1] : "";
    } else if (link && link.match(/^[0-9A-Fa-f]{40}$/i)) {
      hash = link.toUpperCase();
    }
    if (title && hash) {
      items.push({
        title, link: link || magnet || `magnet:?xt=urn:btih:${hash}`,
        magnet: magnet || `magnet:?xt=urn:btih:${hash}`, hash,
        size: parseInt(size, 10) || 0, seeders: parseInt(seeders, 10) || 0,
        leechers: parseInt(leechers, 10) || 0, comments: parseInt(comments, 10) || 0,
        pubDate: pubDate || "", description, enclosureUrl, enclosureType
      });
    }
  }
  return items;
}

function _extract(xml, startTag, endTag) {
  const regex = new RegExp(`${_escapeRegex(startTag)}([\\s\\S]*?)${_escapeRegex(endTag)}`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function _escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function _parseTitle(title) {
  const epMatch = title.match(/[-–]\s*(\d+)(?:\s*[pv]?\s*)?$/i);
  const ep = epMatch ? parseInt(epMatch[1], 10) : null;
  const resMatch = title.match(/\[(\d+p)\]/);
  const resolution = resMatch ? resMatch[1] : "";
  const groupMatch = title.match(/^\[([^\]]+)\]/);
  const group = groupMatch ? groupMatch[1] : "";
  const animeMatch = title.match(/^\[([^\]]+)\]\s*(.+?)\s*[-–]\s*(?:EP\s*)?\d+/);
  const animeTitle = animeMatch ? animeMatch[2].trim() : title;
  return { ep, resolution, group, animeTitle };
}

async function _getRSS(fetchFn) {
  const res = await _fetchWithCors(base, fetchFn);
  const text = await res.text();
  return _parseRSS(text);
}

async function single(query, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!query.titles?.length) return [];
  const items = await _getRSS(query.fetch);
  if (!items?.length) return [];
  return map(items, query.titles, query.episode, query.resolution);
}

async function batch(query, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!query.titles?.length) return [];
  const items = await _getRSS(query.fetch);
  if (!items?.length) return [];
  return map(items, query.titles, query.episode, query.resolution, true);
}

async function movie(query, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!query.titles?.length) return [];
  const items = await _getRSS(query.fetch);
  if (!items?.length) return [];
  return map(items, query.titles, null, query.resolution);
}

function map(items, titles, episode, resolution, isBatch = false) {
  const titlePatterns = titles.map(t => t.replace(/[^\w\s-]/g, " ").trim().toLowerCase());
  return items
    .filter(item => {
      const parsed = _parseTitle(item.title);
      const titleMatch = titlePatterns.some(pattern =>
        parsed.animeTitle.toLowerCase().includes(pattern) || pattern.includes(parsed.animeTitle.toLowerCase())
      );
      if (!titleMatch) return false;
      if (episode && parsed.ep) {
        const epNum = parseInt(episode, 10);
        if (isBatch) return parsed.ep >= epNum;
        return parsed.ep === epNum;
      }
      if (resolution) {
        if (parsed.resolution.startsWith(resolution)) return true;
        if (isBatch) return true;
      }
      return !isBatch;
    })
    .map(item => {
      const parsed = _parseTitle(item.title);
      return {
        title: item.title, link: item.magnet || item.link, hash: item.hash,
        seeders: item.seeders, leechers: item.leechers, downloads: item.comments,
        size: item.size, date: item.pubDate ? new Date(item.pubDate) : null,
        accuracy: "medium", type: isBatch ? "batch" : undefined,
      };
    })
    .sort((a, b) => {
      if (b.seeders !== a.seeders) return b.seeders - a.seeders;
      return b.size - a.size;
    });
}

async function test() {
  try {
    const res = await fetch(base);
    if (!res.ok) throw new Error(`Failed to load data from ${base}! Is the site down?`);
    return true;
  } catch (error) {
    throw new Error(`Could not reach ${base}! Does the site work in your region? Try enabling DoH or using a VPN.`);
  }
}

export default { single, batch, movie, test };
export { single, batch, movie, test };
