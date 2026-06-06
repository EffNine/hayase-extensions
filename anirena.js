export default new class AniRena {
  base = "https://www.anirena.com/rss";
  corsProxyDefault = "https://api.allorigins.win/raw?url=";

  async _fetchWithCors(url, fetchFn) {
    // Use passed fetch (from Hayase app) to bypass CORS
    if (fetchFn) {
      return fetchFn(url);
    }
    // Fallback: direct fetch (for browser extension context)
    return fetch(url);
  }

  _parseRSS(xml) {
    const items = [];
    const itemRegex = /<item[\s\S]*?<\/item>/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(xml)) !== null) {
      const item = itemMatch[0];
      const title = this._extract(item, "<title>", "</title>");
      const link = this._extract(item, "<link>", "</link>");
      const magnet = this._extract(item, "<magnet:file>", "</magnet:file>") || this._extract(item, "<enclosure>", "</enclosure>");
      const enclosure = this._extract(item, "<enclosure", "</enclosure>");
      const enclosureUrl = enclosure ? (enclosure.match(/url="([^"]+)"/) || [])[1] : "";
      const enclosureType = enclosure ? (enclosure.match(/type="([^"]+)"/) || [])[1] : "";
      const size = this._extract(item, "<size>", "</size>") || this._extract(item, "<torrent_size>", "</torrent_size>");
      const seeders = this._extract(item, "<seeders>", "</seeders>");
      const leechers = this._extract(item, "<leechers>", "</leechers>");
      const comments = this._extract(item, "<comments>", "</comments>");
      const pubDate = this._extract(item, "<pubDate>", "</pubDate>") || this._extract(item, "<date>", "</date>");
      const description = this._extract(item, "<description>", "</description>");

      // Extract info hash from magnet link or link field
      let hash = "";
      if (magnet && magnet.includes("btih:")) {
        const hashMatch = magnet.match(/btih:([0-9A-Fa-f]+)/);
        hash = hashMatch ? hashMatch[1] : "";
      } else if (link && link.includes("btih:")) {
        const hashMatch = link.match(/btih:([0-9A-Fa-f]+)/);
        hash = hashMatch ? hashMatch[1] : "";
      } else if (link && link.match(/^[0-9A-Fa-f]{40}$/i)) {
        hash = link.toUpperCase();
      }

      if (title && hash) {
        items.push({
          title,
          link: link || magnet || `magnet:?xt=urn:btih:${hash}`,
          magnet: magnet || `magnet:?xt=urn:btih:${hash}`,
          hash,
          size: parseInt(size, 10) || 0,
          seeders: parseInt(seeders, 10) || 0,
          leechers: parseInt(leechers, 10) || 0,
          comments: parseInt(comments, 10) || 0,
          pubDate: pubDate || "",
          description,
          enclosureUrl,
          enclosureType
        });
      }
    }
    return items;
  }

  _extract(xml, startTag, endTag) {
    const regex = new RegExp(`${this._escapeRegex(startTag)}([\\s\\S]*?)${this._escapeRegex(endTag)}`, "i");
    const match = xml.match(regex);
    return match ? match[1].trim() : "";
  }

  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  _parseTitle(title) {
    // Parse AniRena title format: [Group] Anime Title - EP XX [Resolution]
    const epMatch = title.match(/[-–]\s*(\d+)(?:\s*[pv]?\s*)?$/i);
    const ep = epMatch ? parseInt(epMatch[1], 10) : null;

    // Extract resolution
    const resMatch = title.match(/\[(\d+p)\]/);
    const resolution = resMatch ? resMatch[1] : "";

    // Extract group
    const groupMatch = title.match(/^\[([^\]]+)\]/);
    const group = groupMatch ? groupMatch[1] : "";

    // Extract anime title (remove group prefix and episode info)
    // Format: [Group] Anime Title - EP XX [Resolution]
    // Must use greedy match through the dash+episode to capture full title
    const animeMatch = title.match(/^\[([^\]]+)\]\s*(.+?)\s*[-–]\s*\d+/);
    const animeTitle = animeMatch ? animeMatch[2].trim() : title;

    return { ep, resolution, group, animeTitle };
  }

  async _getRSS(fetchFn) {
    const res = await this._fetchWithCors(this.base, fetchFn);
    const text = await res.text();
    return this._parseRSS(text);
  }

  async single(query, options) {
    if (!navigator.onLine) return [];
    if (!query.titles?.length) return [];

    const items = await this._getRSS(query.fetch);
    if (!items?.length) return [];

    return this.map(items, query.titles, query.episode, query.resolution);
  }

  async batch(query, options) {
    if (!navigator.onLine) return [];
    if (!query.titles?.length) return [];

    const items = await this._getRSS(query.fetch);
    if (!items?.length) return [];

    return this.map(items, query.titles, query.episode, query.resolution, true);
  }

  async movie(query, options) {
    if (!navigator.onLine) return [];
    if (!query.titles?.length) return [];

    const items = await this._getRSS(query.fetch);
    if (!items?.length) return [];

    return this.map(items, query.titles, null, query.resolution);
  }

  map(items, titles, episode, resolution, isBatch = false) {
    const titlePatterns = titles.map(t => t.replace(/[^\w\s-]/g, " ").trim().toLowerCase());

    return items
      .filter(item => {
        const parsed = this._parseTitle(item.title);
        const titleMatch = titlePatterns.some(pattern =>
          parsed.animeTitle.toLowerCase().includes(pattern) ||
          pattern.includes(parsed.animeTitle.toLowerCase())
        );
        if (!titleMatch) return false;

        if (episode && parsed.ep) {
          const epNum = parseInt(episode, 10);
          if (isBatch) {
            return parsed.ep >= epNum;
          }
          return parsed.ep === epNum;
        }

        if (resolution) {
          if (parsed.resolution === resolution) return true;
          if (isBatch) return true;
        }

        return !isBatch;
      })
      .map(item => {
        const parsed = this._parseTitle(item.title);
        return {
          title: item.title,
          link: item.magnet || item.link,
          hash: item.hash,
          seeders: item.seeders,
          leechers: item.leechers,
          downloads: item.comments,
          size: item.size,
          date: item.pubDate ? new Date(item.pubDate) : null,
          accuracy: "medium",
          type: isBatch ? "batch" : undefined,

        };
      })
      .sort((a, b) => {
        // Sort by seeders descending, then by size descending
        if (b.seeders !== a.seeders) return b.seeders - a.seeders;
        return b.size - a.size;
      });
  }

  async test() {
    try {
      const res = await fetch(this.base);
      if (!res.ok) throw new Error(`Failed to load data from ${this.base}! Is the site down?`);
      return true;
    } catch (error) {
      throw new Error(`Could not reach ${this.base}! Does the site work in your region? Try enabling DoH or using a VPN.`);
    }
  }
};
