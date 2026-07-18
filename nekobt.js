const QUALITIES = [ "1080", "720", "540", "480" ];
const url = atob("aHR0cHM6Ly9uZWtvYnQudG8vYXBpL3YxLw==");

async function _fetch(fetch, search) {
  const res = await fetch(`${url}torrents/search?${search}`);
  const json = await res.json();
  if (json.error) throw new Error("NekoBT: " + json.message);
  if (!json.data) throw new Error("NekoBT: Invalid response from server!");
  return json.data;
}

async function single({tvdbId, tvdbEId, tmdbId, episode, fetch, resolution, exclusions}, options) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  const mediaParams = new URLSearchParams({ limit: "1" });
  tvdbId && mediaParams.append("tvdbid", tvdbId.toString());
  tmdbId && mediaParams.append("tmdbid", tmdbId);
  const mappings = await _fetch(fetch, mediaParams);
  if (!mappings?.media) throw new Error("NekoBT: No media found for the given anime!");
  const ep = mappings.media.episodes?.find(ep => ep.tvdbId === tvdbEId) ?? mappings.media.episodes?.find(ep => ep.episode === episode);
  const searchParams = new URLSearchParams({ media_id: mappings.media.id, fansub_lang: "en,enm", sub_lang: "en,enm" });
  ep?.id && searchParams.append("episode_ids", ep.id.toString());
  const high = ep?.tvdbId === tvdbEId;
  exclusions = (exclusions || []).map(e => e.toLowerCase());
  const excl = resolution ? exclusions.concat(...QUALITIES.filter(q => q !== resolution).map(q => `${q}p`)) : exclusions;
  return (await _fetch(fetch, searchParams)).results?.filter(({title}) => !excl.length || (title = title.toLowerCase(), !excl.some(ex => title.includes(ex)))).map(entry => ({
    title: entry.title,
    link: `${url}torrents/${entry.id}/download?public=true`,
    seeders: Number(entry.seeders),
    leechers: Number(entry.leechers),
    downloads: Number(entry.completed),
    hash: entry.infohash,
    size: Number(entry.filesize),
    accuracy: high ? "high" : "medium",
    type: (entry.level ?? 0) >= 3 ? "alt" : entry.batch ? "batch" : void 0,
    date: new Date(entry.uploaded_at)
  })) ?? [];
}

function batch() { return []; }
function movie() { return []; }

async function test() {
  try {
    const {ok} = await fetch(url + "announcements");
    if (!ok) throw new Error(`Failed to load data from ${url}! Is the site down?`);
    return true;
  } catch (error) {
    throw new Error(`Could not reach ${url}! Does the site work in your region?`);
  }
}

export default { single, batch, movie, test };
export { single, batch, movie, test };
