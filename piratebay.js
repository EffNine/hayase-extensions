export default new class PirateBay {
  base = atob("aHR0cHM6Ly9hcGliYXkub3JnL3EucGhwP3E9")
  corsProxyDefault = 'https://api.allorigins.win/raw?url='

  async single({ titles, episode }, options) {
    if (!navigator.onLine) return []
    if (!titles?.length) return []

    const query = this.buildQuery(titles[0], episode)
    const queryEncoded = encodeURIComponent(query)
    const useCorsProxy = options?.useCorsProxy ?? true
    let url = this.base + queryEncoded
    if (useCorsProxy) {
      const proxy = options?.proxyUrl || this.corsProxyDefault
      url = proxy + encodeURIComponent(this.base + queryEncoded)
    }

    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()

    if (!Array.isArray(data)) return []

    return this.map(data)
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

  async test(options) {
    try {
      const useCorsProxy = options?.useCorsProxy ?? true
      let url = this.base + 'test'
      if (useCorsProxy) {
        const proxy = options?.proxyUrl || this.corsProxyDefault
        url = proxy + encodeURIComponent(this.base + 'test')
      }
      const res = await fetch(url)
      return res.ok
    } catch (error) {
      throw new Error('Could not connect to The Pirate Bay API')
    }
  }
}