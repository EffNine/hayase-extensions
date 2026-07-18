export default new class AmeNZB {
  url=atob("aHR0cHM6Ly9hbWVuemIubW9lL2FwaT8=");
  _parseItems(string) {
    const itemRegex = /<item>([\s\S]*?)<\/item>/g, items = [];
    for (const itemMatch of string.matchAll(itemRegex)) {
      const itemString = itemMatch[1], item = {}, enclosureMatch = itemString.match(/<enclosure url="([^"]+)"[^>]*>/);
      enclosureMatch && (item.link = enclosureMatch[1]);
      const titleMatch = itemString.match(/<title>([^<]+)<\/title>/);
      titleMatch && (item.title = titleMatch[1]);
      const nzbnameMatch = itemString.match(/<newznab:attr name="nzbname" value="([^"]+)"\/>/);
      nzbnameMatch && (item.nzbname = nzbnameMatch[1]), items.push(item);
    }
    return items;
  }
  _findByName(string, name) {
    const items = this._parseItems(string), nameWithoutExt = name.replace(/\.[^.]+$/, "");
    return (items.find(item => item.nzbname?.includes(name)) || items.find(item => item.title?.includes(name)) || items.find(item => item.nzbname?.includes(nameWithoutExt)) || items.find(item => item.title?.includes(nameWithoutExt)))?.link?.replaceAll("&amp;", "&");
  }
  async batch({hash: hash, name: name, files: files, fetch: fetchFn}, options) {
    if ((typeof navigator !== 'undefined' && !navigator.isOnline) || !options?.ameapi) return;
    const search = new URLSearchParams({
      apikey: options.ameapi,
      t: "search",
      info_hash: hash
    }), res = await fetchFn(this.url + search.toString());
    if (!res.ok) return;
    const enclosureMatch = (await res.text()).match(/<enclosure url="([^"]+)"[^>]*>/);
    if (enclosureMatch) return enclosureMatch[1].replaceAll("&amp;", "&");
    const stringSearch = new URLSearchParams({
      apikey: options.ameapi,
      t: "search",
      q: name
    }), stringRes = await fetchFn(this.url + stringSearch.toString());
    return stringRes.ok ? this._findByName(await stringRes.text(), name) : void 0;
  }
  async single({hash: hash, file: file, fetch: fetchFn}, options) {
    if ((typeof navigator !== 'undefined' && !navigator.isOnline) || !options?.ameapi) return;
    const search = new URLSearchParams({
      apikey: options.ameapi,
      t: "search",
      info_hash: hash
    }), res = await fetchFn(this.url + search.toString());
    if (!res.ok) return;
    if ((await res.text()).match(/<enclosure url="([^"]+)"[^>]*>/)) return;
    const stringSearch = new URLSearchParams({
      apikey: options.ameapi,
      t: "search",
      q: file
    }), stringRes = await fetchFn(this.url + stringSearch.toString());
    return stringRes.ok ? this._findByName(await stringRes.text(), file) : void 0;
  }
  async test() {
    try {
      const res = await fetch(this.url);
      if (!res.ok) throw new Error(`Failed to load data from ${this.url}! Is the site down?`);
      return true;
    } catch (error) {
      throw new Error(`Could not reach ${this.url}! Does the site work in your region? Try enabling DoH or using a VPN.`);
    }
  }
};