const QUALITIES = [ "1080", "720", "540", "480" ];

export default new class Tosho {
  url=atob("aHR0cHM6Ly9mZWVkLmFuaW1ldG9zaG8ueHl6L2pzb24vdjEv");
  map(entries, useTorrent = !1, excl = []) {
    return entries.filter(({title: title}) => !excl.length || (title = title.toLowerCase(), 
    !excl.some(excl => title.includes(excl)))).map(entry => ({
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
  async single({anidbEid: anidbEid, resolution: resolution, exclusions: exclusions, fetch: fetchFn}, options) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
    if (!anidbEid) throw new Error("No anidbEid provided");
    const res = await fetchFn(this.url + "episodes/" + anidbEid + "?limit=100"), data = await res.json(), excl = resolution ? exclusions.concat(...QUALITIES.filter(q => q !== resolution).map(q => `${q}p`)) : exclusions;
    return data?.data?.releases?.length ? this.map(data.data.releases, options?.useTorrent, excl.map(e => e.toLowerCase())) : [];
  }
  batch=async () => [];
  async movie({anidbAid: anidbAid, resolution: resolution, exclusions: exclusions, fetch: fetchFn}, options) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
    if (!anidbAid) throw new Error("No anidbAid provided");
    const res = await fetchFn(this.url + "series/anidb/" + anidbAid + "?limit=100"), data = await res.json(), excl = resolution ? exclusions.concat(...QUALITIES.filter(q => q !== resolution).map(q => `${q}p`)) : exclusions;
    return data?.data?.releases?.length ? this.map(data.data.releases, options?.useTorrent, excl.map(e => e.toLowerCase())) : [];
  }
  async test(options) {
    try {
      const fetchFn = options?.fetch || fetch;
      if (!(await fetchFn(this.url)).ok) throw new Error(`Failed to load data from ${this.url}! Is the site down?`);
      return true;
    } catch (error) {
      throw new Error(`Could not reach ${this.url}! Does the site work in your region?`);
    }
  }
};