const sizeMap = { KiB: 1024, MiB: 1048576, GiB: 1024 ** 3, TiB: 1024 ** 4 };
const url = atob("aHR0cHM6Ly9zdWtlYmVpLm55YWEuc2kv");

async function single({media, episode, exclusions, episodeCount, absoluteEpisodeNumber, fetch: fetchFn}, _, isBatch = false) {
  if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
  if (!media.isAdult && !media.genres.includes("Hentai")) return [];
  const titles = createTitle([...Object.values(media.title), ...media.synonyms]).join(")|(");
  const prequel = findEdge(media, "PREQUEL")?.node;
  const sequel = findEdge(media, "SEQUEL")?.node;
  const absoluteep = absoluteEpisodeNumber ?? episode;
  const episodes = [episode];
  absoluteep !== episode && absoluteep > episodeCount && episodes.push(absoluteep);
  let ep = "";
  if (episodeCount > 1) {
    if (isBatch) {
      const digits = Math.max(2, episodeCount.toString().length);
      ep = `"${zeropad(1, digits)}-${zeropad(episodeCount, digits)}"|"${zeropad(1, digits)}~${zeropad(episodeCount, digits)}"|"1-${episodeCount}"|"1~${episodeCount}"|"batch"|"complete"${prequel ? "" : '|"S01"'}`;
    } else {
      ep = `${episodes.map(epstring).join("|")}`;
    }
  }
  let entries = parseRSSItems(await getRSSContent(`${url}?page=rss&c=1_1&s=seeders&o=desc&q=(${titles})${ep}${exclusions.length ? `-"${exclusions.join('"|"')}"` : ""}`, fetchFn));
  const checkSequelDate = "FINISHED" === media.status && ("FINISHED" === sequel?.status || "RELEASING" === sequel?.status) && sequel.startDate;
  const sequelStartDate = checkSequelDate && new Date(Object.values(checkSequelDate).join(" "));
  const checkPrequelDate = ("FINISHED" === media.status || "RELEASING" === media.status) && "FINISHED" === prequel?.status && prequel?.endDate;
  const prequelEndDate = checkPrequelDate && new Date(Object.values(checkPrequelDate).join(" "));
  prequelEndDate && (entries = entries.filter(entry => entry.date > new Date(+prequelEndDate + 10699393840)));
  sequelStartDate && "TV" === media.format && (entries = entries.filter(entry => entry.date < new Date(+sequelStartDate - 10699393840)));
  return entries;
}

const batch = (args, opts) => single(args, opts, true);
const movie = batch;

async function test() {
  try {
    if (!(await fetch(`${url}?page=rss&c=1_1&s=seeders&o=desc&q=test`)).ok) throw new Error(`Failed to load data from ${url}! Is the site down?`);
    return true;
  } catch (error) {
    throw new Error(`Could not reach ${url}! Does the site work in your region?`);
  }
}

function zeropad(v = 1, l = 2) {
  return ("string" == typeof v ? v : v.toString()).padStart(l, "0");
}

const epstring = ep => `"E${zeropad(ep)}+"|"E${zeropad(ep)}v"|"+${zeropad(ep)}+"|"+${zeropad(ep)}v"|"+${zeropad(ep)}-"`;

function createTitle(_titles) {
  const grouped = [...new Set(_titles.filter(name => null != name && name.length > 3))];
  const titles = [];
  const appendTitle = t => {
    const title = t.replace(/&/g, "%26").replace(/\?/g, "%3F").replace(/#/g, "%23");
    titles.push(title);
    const match1 = title.match(/(\d)(?:nd|rd|th) Season/i);
    const match2 = title.match(/Season (\d)/i);
    match2 ? titles.push(title.replace(/Season \d/i, `S${match2[1]}`)) : match1 && titles.push(title.replace(/(\d)(?:nd|rd|th) Season/i, `S${match1[1]}`));
  };
  for (const t of grouped) {
    appendTitle(t);
    t.includes("-") && appendTitle(t.replaceAll("-", ""));
  }
  return titles;
}

function findEdge(media, type, formats = ["TV", "TV_SHORT"], skip) {
  let res = media.relations.edges.find(edge => edge.relationType === type && formats.includes(edge.node.format));
  return res || skip || "SEQUEL" !== type || (res = findEdge(media, type, formats = ["TV", "TV_SHORT", "OVA"], true)), res;
}

function parseRSSItems(xml) {
  if (!xml) return [];
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while (null !== (match = itemRegex.exec(xml))) {
    const itemContent = match[1];
    const title = /<title><!\[CDATA\[(.+?)\]\]><\/title>|<title>(.+?)<\/title>/i.exec(itemContent)?.[1] || itemContent.match(/<title>(.+?)<\/title>/i)?.[1] || "?";
    const link = /<link>(.+?)<\/link>/i.exec(itemContent)?.[1] || "?";
    const pubDate = /<pubDate>(.+?)<\/pubDate>/i.exec(itemContent)?.[1] ?? 0;
    const seeders = Number(/<nyaa:seeders>(.+?)<\/nyaa:seeders>/i.exec(itemContent)?.[1] ?? 0);
    const leechers = Number(/<nyaa:leechers>(.+?)<\/nyaa:leechers>/i.exec(itemContent)?.[1] ?? 0);
    const downloads = Number(/<nyaa:downloads>(.+?)<\/nyaa:downloads>/i.exec(itemContent)?.[1] ?? 0);
    const hash = /<nyaa:infoHash>(.+?)<\/nyaa:infoHash>/i.exec(itemContent)?.[1] ?? "?";
    const sizeMatch = (/<nyaa:size>(.+?)<\/nyaa:size>/i.exec(itemContent)?.[1] ?? "0 KiB").match(/([\d.]+) (KiB|MiB|GiB|TiB)/);
    const sizeInBytes = sizeMatch ? parseFloat(sizeMatch[1]) * (sizeMap[sizeMatch[2]] || 1) : 0;
    items.push({
      title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#34;/g, '"'),
      link, seeders, leechers, downloads, size: sizeInBytes, hash,
      accuracy: "low", date: new Date(pubDate)
    });
  }
  return items;
}

async function getRSSContent(rssUrl, fetchFn) {
  if (!rssUrl) return null;
  try {
    const res = await fetchFn(rssUrl);
    if (!res.ok) throw new Error("Failed fetching RSS!\n" + res.statusText);
    return await res.text();
  } catch (e) {
    throw new Error("Failed fetching RSS!\n" + e.message);
  }
}

export default { single, batch, movie, test };
export { single, batch, movie, test };
