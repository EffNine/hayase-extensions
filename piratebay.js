export default new class PirateBay {
  base = atob("aHR0cHM6Ly9hcGliYXkub3JnL3EucGhwP3E9")

  async single({ titles, episode, fetch: fetchFn }, options) {
    if (typeof navigator !== 'undefined' && !navigator.isOnline) return []
    if (!titles?.length) return []

    const query = this.buildQuery(titles[0], episode)
    const queryEncoded = encodeURIComponent(query)
    const url = this.base + queryEncoded

    try {
      return await this._fetchWithCorsFallback(url, fetchFn);
    } catch (error) {
      console.error('Error fetching data from Pirate Bay API:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not connect to The Pirate Bay API or fetch data due to network/CORS restrictions. Details: ${errorMessage}`);
    }
  }

  batch = this.single
  movie = this.single

  buildQuery(title, episode) {
    let query = title.replace(/[^\w\s-]/g, ' ').trim()
    if (episode) query += ` ${episode.toString().padStart(2, '0')}`
    return query
  }

  map(data) {
    return data.map(item => {
      const hash = item.info_hash || ''
      const magnet = hash ? `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(item.name || '')}` : ''

      return {
        title: item.name || '',
        link: magnet,
        hash,
        seeders: parseInt(item.seeders || '0'),
        leechers: parseInt(item.leechers || '0'),
        downloads: 0,
        size: Number(item.size || 0),
        date: new Date((parseInt(item.added || '0') || 0) * 1000),
        verified: item.status === 'vip',
        type: 'alt',
        accuracy: 'medium'
      }
    })
  }

  async _fetchWithRetry(url, fetchFn) {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Attempting to fetch data from Pirate Bay API (Attempt ${attempt + 1}/${maxRetries})...`);
        const res = await fetchFn(url);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status} ${res.statusText}`);

        return await res.json();
      } catch (error) {
        lastError = error;
        console.warn(`Fetch attempt failed: ${error.message}. Retrying in ${Math.pow(2, attempt)} seconds...`);

        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    throw lastError || new Error('Failed to fetch data after multiple retries.');
  }

  async _fetchWithCorsFallback(url, fetchFn) {
    // Use injected fetch (handles CORS via cors:// on iOS)
    return await this._fetchWithRetry(url, fetchFn);
  }

}