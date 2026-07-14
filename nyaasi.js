import { NyaaRss } from '@ejnshtein/nyaasi'

export default new class NyaaSi {
  async single({ titles, episode, resolution, exclusions }) {
    if (!navigator.onLine) return []
    if (!titles?.length) return []

    const query = this.buildQuery(titles[0], episode)
    const data = await NyaaRss.search(query)

    if (!Array.isArray(data)) return []

    return this.map(data, resolution, exclusions)
  }

  batch = this.single
  movie = this.single

  buildQuery(title, episode) {
    let query = title.replace(/[^\w\s-]/g, ' ').trim()
    if (episode) query += ` ${episode.toString().padStart(2, '0')}`
    return query
  }

  map(items, resolution, exclusions) {
    const excl = (exclusions || []).map(e => e.toLowerCase())
    const resFilter = resolution ? resolution.replace('p', '') : null

    return items
      .filter(item => {
        const title = (item.title || '').toLowerCase()
        if (excl.length && excl.some(e => title.includes(e))) return false
        if (resFilter) {
          const resMatch = title.match(/(\d{3,4})p/)
          if (resMatch && resMatch[1] !== resFilter) return false
        }
        return true
      })
      .map(item => {
      const hash = item.infoHash || ''
      const magnet = hash ? `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(item.title || '')}` : ''

      return {
        title: item.title || '',
        link: magnet,
        hash,
        seeders: parseInt(item.seeders || '0'),
        leechers: parseInt(item.leechers || '0'),
        downloads: parseInt(item.downloads || '0'),
        size: this.parseSize(item.size || ''),
        date: new Date(item.pubDate),
        type: 'alt',
        accuracy: 'medium'
      }
    })
  }

  parseSize(sizeStr) {
    const match = sizeStr.match(/([\d.]+)\s*(KiB|MiB|GiB|KB|MB|GB)/i)
    if (!match) return 0

    const [, num, unit] = match
    const size = parseFloat(num)

    switch (unit.toLowerCase()) {
      case 'kib': case 'kb': return size * 1024
      case 'mib': case 'mb': return size * 1024 * 1024
      case 'gib': case 'gb': return size * 1024 * 1024 * 1024
      default: return size
    }
  }

  async test() {
    try {
      const data = await NyaaRss.search('test')
      return Array.isArray(data)
    } catch (error) {
      throw new Error('Could not connect to Nyaa.si API')
    }
  }
}