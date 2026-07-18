const QUALITIES = [ "1080", "720", "540", "480" ];
const url = atob("aHR0cHM6Ly9mZWVkLmFuaW1ldG9zaG8ueHl6L2pzb24vdjEv");

function map(entries, useTorrent = false, excl = []) {
  return entries.filter(({title}) => !excl.length || (title = title.toLowerCase(), !excl.some(ex => title.includes(ex)))).map(entry => ({
    title: entry.title,
    link: useTorrent ? entry.torrent_url : entry.magnet,
    seeders: (entry.seeders || 0) >= 3e4 ? 0 : entry.seeders || 0,
    leechers: (entry.leechers || 0) >= 3e4 ? 0 : entry.leechers || 0,
    downloads: entry.downloads || 0,
    hash: entry.info_hash,
    size: entry.size_bytes,
    accuracy: "medium",
    type: void 0,
    date: new Date(entry.date_added)
  }));
}

async function single({anidbEid, resolution, exclusions, fetch: fetchFn}, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!anidbEid) throw new Error("No anidbEid provided");
  const res = await fetchFn(url + "episodes/" + anidbEid + "?limit=100");
  const data = await res.json();
  const excl = resolution ? exclusions.concat(...QUALITIES.filter(q => q !== resolution).map(q => `${q}p`)) : exclusions;
  return data?.data?.releases?.length ? map(data.data.releases, options?.useTorrent, excl.map(e => e.toLowerCase())) : [];
}

async function batch() { return []; }

async function movie({anidbAid, resolution, exclusions, fetch: fetchFn}, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!anidbAid) throw new Error("No anidbAid provided");
  const res = await fetchFn(url + "series/anidb/" + anidbAid + "?limit=100");
  const data = await res.json();
  const excl = resolution ? exclusions.concat(...QUALITIES.filter(q => q !== resolution).map(q => `${q}p`)) : exclusions;
  return data?.data?.releases?.length ? map(data.data.releases, options?.useTorrent, excl.map(e => e.toLowerCase())) : [];
}

async function test() {
  try {
    if (!(await fetch(url)).ok) throw new Error(`Failed to load data from ${url}! Is the site down?`);
    return true;
  } catch (error) {
    throw new Error(`Could not reach ${url}! Does the site work in your region?`);
  }
}

export default { single, batch, movie, test };
export { single, batch, movie, test };
