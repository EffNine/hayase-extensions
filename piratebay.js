export default new class PirateBay {
  base = atob("aHR0cHM6Ly9hcGliYXkub3JnL3EucGhwP3E9")
  corsProxyDefault = 'https://api.allorigins.win/raw?url='

  async single({ titles, episode }, options) {
    if (!navigator.onLine) return []
    if (!titles?.length) return []

    const query = this.buildQuery(titles[0], episode)
    const queryEncoded = encodeURIComponent(query)
    // Removed proxy logic: use direct base URL
    let url = this.base + queryEncoded

    try {
      return await this._fetchWithCorsFallback(url);
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

  async _fetchWithRetry(url) {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Attempting to fetch data from Pirate Bay API (Attempt ${attempt + 1}/${maxRetries})...`);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status} ${res.statusText}`);

        // Attempt to parse JSON, which might fail if the API returns non-JSON on error
        return await res.json(); 
      } catch (error) {
        lastError = error;
        console.warn(`Fetch attempt failed: ${error.message}. Retrying in ${Math.pow(2, attempt)} seconds...`);

        if (attempt < maxRetries - 1) {
          // Exponential backoff: wait 2^attempt seconds
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    throw lastError || new Error('Failed to fetch data after multiple retries.');
  }

  async _fetchWithCorsFallback(url) {
    // Try direct fetch first
    try {
      return await this._fetchWithRetry(url);
    } catch (error) {
      // If direct fetch fails (likely CORS), try with CORS proxy
      console.warn('Direct fetch failed, attempting CORS proxy fallback...');
      const proxyUrl = this.corsProxyDefault + encodeURIComponent(url);
      try {
        return await this._fetchWithRetry(proxyUrl);
      } catch (proxyError) {
        console.error('Both direct and proxy fetch failed:', proxyError);
        throw proxyError;
      }
    }
  }

  async test(options) {
    try {
      const url = this.base + 'test';
      await this._fetchWithCorsFallback(url);
      return true;
    } catch (error) {
      throw new Error('Could not connect to The Pirate Bay API');
    }
  }
}