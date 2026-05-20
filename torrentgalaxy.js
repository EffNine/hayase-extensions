export default new class TorrentGalaxy {
  base = atob("aHR0cHM6Ly90b3JyZW50Z2FsYXh5LnRvL3RvcnJlbnRzLnBocD9zZWFyY2g9")
  corsProxyDefault = 'https://api.allorigins.win/raw?url='

  buildQuery(title, episode) {
    let q = title.replace(/[^\w\s-]/g, ' ').trim()
    if (episode) q += ` ${episode.toString().padStart(2, '0')}`
    return encodeURIComponent(q)
  }

  async single({ titles, episode }, options) {
    if (!navigator.onLine) return []
    if (!titles?.length) return []

    const q = this.buildQuery(titles[0], episode)
    let url = this.base + q
    if (options?.useCorsProxy) {
      const proxy = options.proxyUrl || this.corsProxyDefault
      url = proxy + encodeURIComponent(this.base + q)
    }

    const res = await fetch(url)
    const text = await res.text()

    // Extract magnet links and titles from the HTML
    const re = /<a[^>]*href=["'](magnet:\?xt=urn:btih:([0-9A-Fa-f]+)[^"']*)["'][^>]*>(.*?)<\/a>/g
    const out = []
    let m
    while ((m = re.exec(text)) !== null) {
      const magnet = m[1]
      const hash = m[2].toUpperCase()
      let title = m[3].replace(/<[^>]+>/g, '').trim()
      if (!title) title = titles[0]
      out.push({
        title,
        link: magnet,
        hash,
        seeders: 0,
        leechers: 0,
        downloads: 0,
        size: 0,
        date: null,
        accuracy: 'medium'
      })
    }

    return out
  }

  batch = this.single
  movie = this.single

  async test(options) {
    try {
      let url = this.base
      if (options?.useCorsProxy) {
        const proxy = options.proxyUrl || this.corsProxyDefault
        url = proxy + encodeURIComponent(this.base)
      }
      const res = await fetch(url)
      return res.ok
    } catch (e) {
      return false
    }
  }
}
