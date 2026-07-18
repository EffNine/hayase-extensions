const url = atob("aHR0cHM6Ly9mZWVkLmFuaW1ldG9zaG8ub3JnL2pzb24=");

async function batch({hash, fetch: fetchFn}) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return;
  const res = await fetchFn(url + "?show=torrent&btih=" + hash);
  if (!res.ok) return;
  return (await res.json()).nzb_url;
}

async function single() {
  return undefined;
}

async function test() {
  try {
    if (!(await fetch(url)).ok) throw new Error(`Failed to load data from ${url}! Is the site down?`);
    return true;
  } catch (error) {
    throw new Error(`Could not reach ${url}! Does the site work in your region?`);
  }
}

export default { single, batch, test };
export { single, batch, test };
