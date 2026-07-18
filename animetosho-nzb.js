export default new class ToshoNZB {
  url=atob("aHR0cHM6Ly9mZWVkLmFuaW1ldG9zaG8ub3JnL2pzb24=");
  async batch({hash: hash, fetch: fetchFn}) {
    if (typeof navigator !== 'undefined' && !navigator.isOnline) return;
    const res = await fetchFn(this.url + "?show=torrent&btih=" + hash);
    if (!res.ok) return;
    return (await res.json()).nzb_url;
  }
  async single() {
    return undefined;
  }
};
