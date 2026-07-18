const QUALITIES = [ "1080", "720", "540", "480" ];
const url = atob("aHR0cHM6Ly9mZWVkLmFuaW1ldG9zaG8ub3JnL2pzb24=");

function _buildQuery({resolution, exclusions}) {
  if (!exclusions?.length && !resolution) return "";
  const base = `&qx=1&q=!("${exclusions.join('\"|\"')}")`;
  if (!resolution) return base;
  return base + `!(*${QUALITIES.filter(q => q !== resolution).join("*|*") }*)`;
}

function map(entries, batch = false, useTorrent = false) {
  return entries.map(entry => ({
    title: entry.title || entry.torrent_name,
    link: useTorrent ? entry.torrent_url : entry.magnet_uri,
    seeders: (entry.seeders || 0) >= 3e4 ? 0 : entry.seeders || 0,
    leechers: (entry.leechers || 0) >= 3e4 ? 0 : entry.leechers || 0,
    downloads: entry.torrent_downloaded_count || 0,
    hash: entry.info_hash,
    size: entry.total_size,
    accuracy: entry.anidb_fid && !batch ? "high" : "medium",
    type: batch ? "batch" : void 0,
    date: new Date(1e3 * entry.timestamp)
  }));
}

async function single({anidbEid, resolution, exclusions, fetch: fetchFn}, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!anidbEid) throw new Error("No anidbEid provided");
  const query = _buildQuery({resolution, exclusions});
  const res = await fetchFn(url + "?eid=" + anidbEid + query);
  const data = await res.json();
  return data.length ? map(data, false, options?.useTorrent) : [];
}

async function batch({anidbAid, resolution, exclusions, episode, fetch: fetchFn}, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!anidbAid) throw new Error("No anidbAid provided");
  const query = _buildQuery({resolution, exclusions});
  const res = await fetchFn(url + "?order=size-d&aid=" + anidbAid + query);
  const data = (await res.json()).filter(entry => entry.num_files >= Math.min(24, Math.max(2, episode ?? 1)));
  return data.length ? map(data, true, options?.useTorrent) : [];
}

async function movie({anidbAid, resolution, exclusions, fetch: fetchFn}, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!anidbAid) throw new Error("No anidbAid provided");
  const query = _buildQuery({resolution, exclusions});
  const res = await fetchFn(url + "?aid=" + anidbAid + query);
  const data = await res.json();
  return data.length ? map(data, false, options?.useTorrent) : [];
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
