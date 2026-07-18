const url = atob("aHR0cHM6Ly9zdWJzcGxlYXNlLm9yZw==");
const rssUrl = atob("aHR0cHM6Ly9zdWJzcGxlYXNlLm9yZy9yc3M=");

async function _fetch(fetchFn, search) {
  const fetchUrl = `${rssUrl}?${search}`;
  if (fetchFn) {
    const res = await fetchFn(fetchUrl);
    const text = await res.text();
    return _parseRSS(text);
  }
  const res = await fetch(fetchUrl);
  const text = await res.text();
  return _parseRSS(text);
}

function _parseRSS(xml) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const item = itemMatch[1];
    const title = _extract(item, "<title>", "</title>");
    const link = _extract(item, "<link>", "</link>");
    const pubDate = _extract(item, "<pubDate>", "</pubDate>");
    const description = _extract(item, "<description>", "</description>");
    let hash = "";
    if (link && link.includes("btih:")) {
      const hashMatch = link.match(/btih:([0-9A-Fa-f]+)/);
      hash = hashMatch ? hashMatch[1] : "";
    } else if (link && link.match(/^[0-9A-Fa-f]{40}$/i)) {
      hash = link.toUpperCase();
    }
    if (title && link) {
      items.push({ title, link, pubDate, description, hash });
    }
  }
  return items;
}

function _extract(xml, startTag, endTag) {
  const regex = new RegExp(`${startTag}([\\s\\S]*?)${endTag}`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function _parseTitle(title) {
  const epMatch = title.match(/.*?\s*-\s*EP\s*(\d+)/i);
  const ep = epMatch ? parseInt(epMatch[1], 10) : null;
  const resMatch = title.match(/\[(\d+p)\]/);
  const resolution = resMatch ? resMatch[1] : "";
  const animeMatch = title.match(/^\[SubsPlease\]\s*(.+?)\s*-\s*EP/);
  const animeTitle = animeMatch ? animeMatch[1].trim() : title;
  return { ep, resolution, animeTitle };
}

async function single(query, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!query.titles?.length) return [];
  const resParam = query.resolution === "1080" ? "1080" : query.resolution === "720" ? "720" : "";
  const items = await _fetch(query.fetch, `r=${resParam}`);
  if (!items?.length) return [];
  return map(items, query.titles, query.episode, query.resolution);
}

async function batch(query, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!query.titles?.length) return [];
  const resParam = query.resolution === "1080" ? "1080" : query.resolution === "720" ? "720" : "";
  const items = await _fetch(query.fetch, `r=${resParam}`);
  if (!items?.length) return [];
  return map(items, query.titles, query.episode, query.resolution, true);
}

async function movie(query, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!query.titles?.length) return [];
  const resParam = query.resolution === "1080" ? "1080" : query.resolution === "720" ? "720" : "";
  const items = await _fetch(query.fetch, `r=${resParam}`);
  if (!items?.length) return [];
  return map(items, query.titles, null, query.resolution);
}

function map(items, titles, episode, resolution, isBatch = false) {
  const filtered = items.filter(item => {
    const parsed = _parseTitle(item.title);
    const titleMatch = titles.some(t => item.title.toLowerCase().includes(t.toLowerCase()));
    if (!titleMatch) return false;
    if (isBatch) return parsed.ep !== null;
    if (episode) return parsed.ep === episode;
    return true;
  });
  return filtered.map(item => {
    const parsed = _parseTitle(item.title);
    return {
      title: item.title,
      link: item.link,
      hash: item.hash || "",
      seeders: 0, leechers: 0, downloads: 0, size: 0,
      accuracy: "high",
      date: item.pubDate ? new Date(item.pubDate) : new Date(),
      type: isBatch ? "batch" : undefined,
    };
  });
}

async function test() {
  try {
    const res = await fetch(`${rssUrl}?r=1080`);
    if (!res.ok) throw new Error(`Failed to load data from ${rssUrl}! Is the site down?`);
    return true;
  } catch (error) {
    throw new Error(`Could not reach ${url}! Does the site work in your region? Try enabling DoH or using a VPN.`);
  }
}

export default { single, batch, movie, test };
export { single, batch, movie, test };
