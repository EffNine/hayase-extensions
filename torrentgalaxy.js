const base = atob("aHR0cHM6Ly90b3JyZW50Z2FsYXh5LnRvL3RvcnJlbnRzLnBocD9zZWFyY2g9");

function buildQuery(title, episode) {
  let q = title.replace(/[^\w\s-]/g, ' ').trim();
  if (episode) q += ` ${episode.toString().padStart(2, '0')}`;
  return encodeURIComponent(q);
}

async function single({ titles, episode, fetch: fetchFn }, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!titles?.length) return [];
  const q = buildQuery(titles[0], episode);
  const url = base + q;
  const res = await fetchFn(url);
  const text = await res.text();
  const re = /<a[^>]*href=["'](magnet:\?xt=urn:btih:([0-9A-Fa-f]+)[^"']*)["'][^>]*>(.*?)<\/a>/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const magnet = m[1];
    const hash = m[2].toUpperCase();
    let title = m[3].replace(/<[^>]+>/g, '').trim();
    if (!title) title = titles[0];
    out.push({ title, link: magnet, hash, seeders: 0, leechers: 0, downloads: 0, size: 0, date: null, accuracy: 'medium' });
  }
  return out;
}

const batch = single;
const movie = single;

async function test() {
  try {
    const res = await fetch(base);
    return res.ok;
  } catch (e) {
    return false;
  }
}

export default { single, batch, movie, test };
export { single, batch, movie, test };
