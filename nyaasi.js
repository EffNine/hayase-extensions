const sizeMap = {
  KiB: 1024,
  MiB: 1048576,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4
};

export default new class NyaaSi {
  url = atob("aHR0cHM6Ly9ueWFhLnNpLw==");

  async _fetchRSS(query, fetchFn) {
    const url = `${this.url}?page=rss&c=1_0&f=0&q=${encodeURIComponent(query)}`;
    const res = await fetchFn(url);
    if (!res.ok) return [];
    const text = await res.text();
    return this._parseRSS(text);
  }

  _parseRSS(xml) {
    if (!xml) return [];
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];
      const title = this._extract(itemContent, 'title');
      const link = this._extract(itemContent, 'link');
      const pubDate = this._extract(itemContent, 'pubDate');
      const seeders = parseInt(this._extractNS(itemContent, 'seeders')) || 0;
      const leechers = parseInt(this._extractNS(itemContent, 'leechers')) || 0;
      const downloads = parseInt(this._extractNS(itemContent, 'downloads')) || 0;
      const hash = this._extractNS(itemContent, 'infoHash') || '';
      const sizeStr = this._extractNS(itemContent, 'size') || '0 KiB';
      const sizeMatch = sizeStr.match(/([\d.]+)\s*(KiB|MiB|GiB|TiB)/);
      const size = sizeMatch ? parseFloat(sizeMatch[1]) * (sizeMap[sizeMatch[2]] || 1) : 0;

      if (title) {
        items.push({
          title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'),
          link: link || (hash ? `magnet:?xt=urn:btih:${hash}` : ''),
          pubDate,
          seeders,
          leechers,
          downloads,
          hash,
          size
        });
      }
    }
    return items;
  }

  _extract(content, tag) {
    const regex = new RegExp(`<${tag}><!\\[CDATA\\[(.+?)\\]\\]><\\/${tag}>|<${tag}>(.+?)<\\/${tag}>`, 'i');
    const match = content.match(regex);
    return match ? (match[1] || match[2] || '').trim() : '';
  }

  _extractNS(content, tag) {
    const regex = new RegExp(`<nyaa:${tag}>(.+?)<\\/nyaa:${tag}>`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  }

  buildQuery(title, episode) {
    let query = title.replace(/[^\w\s-]/g, ' ').trim();
    if (episode) query += ` ${episode.toString().padStart(2, '0')}`;
    return query;
  }

  async single({ titles, episode, resolution, exclusions, fetch: fetchFn }) {
    if (!titles?.length) return [];

    const query = this.buildQuery(titles[0], episode);
    const data = await this._fetchRSS(query, fetchFn || fetch);

    if (!Array.isArray(data)) return [];

    return this.map(data, resolution, exclusions);
  }

  batch = this.single;
  movie = this.single;

  map(items, resolution, exclusions) {
    const excl = (exclusions || []).map(e => e.toLowerCase());
    const resFilter = resolution ? resolution.replace('p', '') : null;

    return items
      .filter(item => {
        const title = (item.title || '').toLowerCase();
        if (excl.length && excl.some(e => title.includes(e))) return false;
        if (resFilter) {
          const resMatch = title.match(/(\d{3,4})p/);
          if (resMatch && resMatch[1] !== resFilter) return false;
        }
        return true;
      })
      .map(item => {
        const hash = item.hash || '';
        const magnet = hash ? `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(item.title || '')}` : '';

        return {
          title: item.title || '',
          link: magnet,
          hash,
          seeders: item.seeders,
          leechers: item.leechers,
          downloads: item.downloads,
          size: item.size,
          date: new Date(item.pubDate),
          type: 'alt',
          accuracy: 'medium'
        };
      });
  }

};
