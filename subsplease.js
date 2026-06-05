export default new class SubsPlease {
  url = "https://subsplease.org";
  rssUrl = "https://subsplease.org/rss";

  async _fetch(fetch, search) {
    const res = await fetch(`${this.rssUrl}?${search}`);
    const text = await res.text();
    return this._parseRSS(text);
  }

  _parseRSS(xml) {
    const items = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(xml)) !== null) {
      const item = itemMatch[1];
      const title = this._extract(item, "<title>", "</title>");
      const link = this._extract(item, "<link>", "</link>");
      const pubDate = this._extract(item, "<pubDate>", "</pubDate>");
      const description = this._extract(item, "<description>", "</description>");

      if (title && link) {
        items.push({ title, link, pubDate, description });
      }
    }
    return items;
  }

  _extract(xml, startTag, endTag) {
    const regex = new RegExp(`${startTag}([\\s\\S]*?)${endTag}`, "i");
    const match = xml.match(regex);
    return match ? match[1].trim() : "";
  }

  _parseTitle(title) {
    // Parse SubsPlease title format: [SubsPlease] Anime Title - EP 01 [1080p]
    const epMatch = title.match(/.*?\s*-\s*EP\s*(\d+)/i);
    const ep = epMatch ? parseInt(epMatch[1], 10) : null;

    // Extract resolution
    const resMatch = title.match(/\[(\d+p)\]/);
    const resolution = resMatch ? resMatch[1] : "";

    // Extract anime title (remove [SubsPlease] prefix and episode info)
    const animeMatch = title.match(/^\[SubsPlease\]\s*(.+?)\s*-\s*EP/);
    const animeTitle = animeMatch ? animeMatch[1].trim() : title;

    return { ep, resolution, animeTitle };
  }

  async single({ anilistId, titles, episode, resolution }, options) {
    if (!navigator.onLine) return [];
    if (!titles?.length) return [];

    const resParam = resolution === "1080" ? "1080" : resolution === "720" ? "720" : "sd";
    const items = await this._fetch(options?.fetch, `r=${resParam}`);
    if (!items?.length) return [];

    return this.map(items, titles, episode, resolution);
  }

  async batch({ anilistId, titles, episode, resolution }, options) {
    if (!navigator.onLine) return [];
    if (!titles?.length) return [];

    const resParam = resolution === "1080" ? "1080" : resolution === "720" ? "720" : "sd";
    const items = await this._fetch(options?.fetch, `r=${resParam}`);
    if (!items?.length) return [];

    return this.map(items, titles, episode, resolution, true);
  }

  async movie({ anilistId, titles, resolution }, options) {
    if (!navigator.onLine) return [];
    if (!titles?.length) return [];

    const resParam = resolution === "1080" ? "1080" : resolution === "720" ? "720" : "sd";
    const items = await this._fetch(options?.fetch, `r=${resParam}`);
    if (!items?.length) return [];

    return this.map(items, titles, null, resolution);
  }

  map(items, titles, episode, resolution, isBatch = false) {
    const filtered = items.filter(item => {
      const parsed = this._parseTitle(item.title);
      const titleMatch = titles.some(t =>
        item.title.toLowerCase().includes(t.toLowerCase())
      );

      if (!titleMatch) return false;

      if (isBatch) {
        return parsed.ep !== null;
      }

      if (episode) {
        return parsed.ep === episode;
      }

      return true;
    });

    return filtered.map(item => {
      const parsed = this._parseTitle(item.title);
      const isBest = resolution ? parsed.resolution === `${resolution}p` : true;

      return {
        title: item.title,
        link: item.link,
        hash: "",
        seeders: 0,
        leechers: 0,
        downloads: 0,
        size: 0,
        accuracy: isBest ? "high" : "medium",
        date: item.pubDate ? new Date(item.pubDate) : new Date(),
        type: isBatch ? "batch" : undefined,
      };
    });
  }

  async test() {
    try {
      const res = await fetch(`${this.rssUrl}?r=1080`);
      if (!res.ok) throw new Error(`Failed to load data from ${this.rssUrl}! Is the site down?`);
      return true;
    } catch (error) {
      throw new Error(`Could not reach ${this.url}! Does the site work in your region?`);
    }
  }
};
