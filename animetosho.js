const QUALITIES = [ "1080", "720", "540", "480" ];

export default new class Tosho {
  url=atob("aHR0cHM6Ly9mZWVkLmFuaW1ldG9zaG8ub3JnL2pzb24=");
  _buildQuery({resolution: resolution, exclusions: exclusions}) {
    if (!exclusions?.length && !resolution) return "";
    const base = `&qx=1&q=!("${exclusions.join('\"|\"')}")`;
    if (!resolution) return base;
    return base + `!(*${QUALITIES.filter(q => q !== resolution).join("*|*") }*)`;
  }
  map(entries, batch = !1, useTorrent = !1) {
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
  async single({anidbEid: anidbEid, resolution: resolution, exclusions: exclusions, fetch: fetchFn}, options) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
    if (!anidbEid) throw new Error("No anidbEid provided");
    const query = this._buildQuery({
      resolution: resolution,
      exclusions: exclusions
    }), res = await fetchFn(this.url + "?eid=" + anidbEid + query), data = await res.json();
    return data.length ? this.map(data, !1, options?.useTorrent) : [];
  }
  async batch({anidbAid: anidbAid, resolution: resolution, exclusions: exclusions, episode: episode, fetch: fetchFn}, options) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
    if (!anidbAid) throw new Error("No anidbAid provided");
    const query = this._buildQuery({
      resolution: resolution,
      exclusions: exclusions
    }), res = await fetchFn(this.url + "?order=size-d&aid=" + anidbAid + query), data = (await res.json()).filter(entry => entry.num_files >= Math.min(24, Math.max(2, episode ?? 1)));
    return data.length ? this.map(data, !0, options?.useTorrent) : [];
  }
  async movie({anidbAid: anidbAid, resolution: resolution, exclusions: exclusions, fetch: fetchFn}, options) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
    if (!anidbAid) throw new Error("No anidbAid provided");
    const query = this._buildQuery({
      resolution: resolution,
      exclusions: exclusions
    }), res = await fetchFn(this.url + "?aid=" + anidbAid + query), data = await res.json();
    return data.length ? this.map(data, !1, options?.useTorrent) : [];
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