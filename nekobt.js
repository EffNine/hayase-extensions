const QUALITIES = [ "1080", "720", "540", "480" ];

export default new class NekoBT {
  url=atob("aHR0cHM6Ly9uZWtvYnQudG8vYXBpL3YxLw==");
  async _fetch(fetch, search) {
    const res = await fetch(`${this.url}torrents/search?${search}`), json = await res.json();
    if (json.error) throw new Error("NekoBT: " + json.message);
    if (!json.data) throw new Error("NekoBT: Invalid response from server!");
    return json.data;
  }
  async single({tvdbId: tvdbId, tvdbEId: tvdbEId, tmdbId: tmdbId, episode: episode, fetch: fetch, resolution: resolution, exclusions: exclusions}, options) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
    const mediaParams = new URLSearchParams({
      limit: "1"
    });
    tvdbId && mediaParams.append("tvdbid", tvdbId.toString()), tmdbId && mediaParams.append("tmdbid", tmdbId);
    const mappings = await this._fetch(fetch, mediaParams);
    if (!mappings?.media) throw new Error("NekoBT: No media found for the given anime!");
    const ep = mappings.media.episodes?.find(ep => ep.tvdbId === tvdbEId) ?? mappings.media.episodes?.find(ep => ep.episode === episode), searchParams = new URLSearchParams({
      media_id: mappings.media.id,
      fansub_lang: "en,enm",
      sub_lang: "en,enm"
    });
    ep?.id && searchParams.append("episode_ids", ep.id.toString());
    const high = ep?.tvdbId === tvdbEId;
    exclusions = (exclusions || []).map(e => e.toLowerCase());
    const excl = resolution ? exclusions.concat(...QUALITIES.filter(q => q !== resolution).map(q => `${q}p`)) : exclusions;
    return (await this._fetch(fetch, searchParams)).results?.filter(({title: title}) => !excl.length || (title = title.toLowerCase(), 
    !excl.some(excl => title.includes(excl)))).map(entry => ({
      title: entry.title,
      link: `${this.url}torrents/${entry.id}/download?public=true`,
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
  batch=() => [];
  movie=() => [];
  async test(options) {
    try {
      const fetchFn = options?.fetch || fetch;
      const {ok: ok} = await fetchFn(this.url + "announcements");
      if (!ok) throw new Error(`Failed to load data from ${this.url}! Is the site down?`);
      return true;
    } catch (error) {
      throw new Error(`Could not reach ${this.url}! Does the site work in your region?`);
    }
  }
};
