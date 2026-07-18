export default new class SubsPlease {
  url = atob("aHR0cHM6Ly9zdWJzcGxlYXNlLm9yZw==");
  rssUrl = atob("aHR0cHM6Ly9zdWJzcGxlYXNlLm9yZy9yc3M=");

  async _fetch(fetchFn, search) {
    const url = `${this.rssUrl}?${search}`;
    // Use passed fetch (from Hayase app) by default
    if (fetchFn) {
      const res = await fetchFn(url);
      const text = await res.text();
      return this._parseRSS(text);
    }
    // Fallback: direct fetch (for browser extension context)
    const res = await fetch(url);
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

      // Extract info hash from magnet link or link field
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
    // Format: [SubsPlease] Anime Title - EP 01 [1080p]
    // Must use greedy match through the dash+EP to capture full title
    const animeMatch = title.match(/^\[SubsPlease\]\s*(.+?)\s*-\s*EP/);
    const animeTitle = animeMatch ? animeMatch[1].trim() : title;

    return { ep, resolution, animeTitle };
  }

  async single(query, options) {
    if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
    if (!query.titles?.length) return [];

    const resParam = query.resolution === "1080" ? "1080" : query.resolution === "720" ? "720" : "";
    const items = await this._fetch(query.fetch, `r=${resParam}`);
    if (!items?.length) return [];

    return this.map(items, query.titles, query.episode, query.resolution);
  }

  async batch(query, options) {
    if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
    if (!query.titles?.length) return [];

    const resParam = query.resolution === "1080" ? "1080" : query.resolution === "720" ? "720" : "";
    const items = await this._fetch(query.fetch, `r=${resParam}`);
    if (!items?.length) return [];

    return this.map(items, query.titles, query.episode, query.resolution, true);
  }

  async movie(query, options) {
    if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
    if (!query.titles?.length) return [];

    const resParam = query.resolution === "1080" ? "1080" : query.resolution === "720" ? "720" : "";
    const items = await this._fetch(query.fetch, `r=${resParam}`);
    if (!items?.length) return [];

    return this.map(items, query.titles, null, query.resolution);
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
        accuracy: "high",
        date: item.pubDate ? new Date(item.pubDate) : new Date(),
        type: isBatch ? "batch" : undefined,
      };
    });
  }

  async test(options) {
    try {
      const fetchFn = options?.fetch || fetch;
      const res = await fetchFn(`${this.rssUrl}?r=1080`);
      if (!res.ok) throw new Error(`Failed to load data from ${this.rssUrl}! Is the site down?`);
      return true;
    } catch (error) {
      throw new Error(`Could not reach ${this.url}! Does the site work in your region? Try enabling DoH or using a VPN.`);
    }
  }
};
