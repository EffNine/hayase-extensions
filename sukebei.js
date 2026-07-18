const sizeMap = {
  KiB: 1024,
  MiB: 1048576,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4
};

export default new class {
  url=atob("aHR0cHM6Ly9zdWtlYmVpLm55YWEuc2kv");
  async single({media: media, episode: episode, exclusions: exclusions, episodeCount: episodeCount, absoluteEpisodeNumber: absoluteEpisodeNumber, fetch: fetchFn}, _, isBatch = !1) {
    if (typeof navigator !== 'undefined' && !navigator.isOnline) return [];
    if (!media.isAdult && !media.genres.includes("Hentai")) return [];
    const titles = createTitle([ ...Object.values(media.title), ...media.synonyms ]).join(")|("), prequel = findEdge(media, "PREQUEL")?.node, sequel = findEdge(media, "SEQUEL")?.node, absoluteep = absoluteEpisodeNumber ?? episode, episodes = [ episode ];
    absoluteep !== episode && absoluteep > episodeCount && episodes.push(absoluteep);
    let ep = "";
    if (episodeCount > 1) if (isBatch) {
      const digits = Math.max(2, episodeCount.toString().length);
      ep = `"${zeropad(1, digits)}-${zeropad(episodeCount, digits)}"|"${zeropad(1, digits)}~${zeropad(episodeCount, digits)}"|"1-${episodeCount}"|"1~${episodeCount}"|"batch"|"complete"${prequel ? "" : '|"S01"'}`;
    } else ep = `${episodes.map(epstring).join("|")}`;
    let entries = parseRSSItems(await getRSSContent(`${this.url}?page=rss&c=1_1&s=seeders&o=desc&q=(${titles})${ep}${exclusions.length ? `-"${exclusions.join('"|"')}"` : ""}`, fetchFn));
    const checkSequelDate = "FINISHED" === media.status && ("FINISHED" === sequel?.status || "RELEASING" === sequel?.status) && sequel.startDate, sequelStartDate = checkSequelDate && new Date(Object.values(checkSequelDate).join(" ")), checkPrequelDate = ("FINISHED" === media.status || "RELEASING" === media.status) && "FINISHED" === prequel?.status && prequel?.endDate, prequelEndDate = checkPrequelDate && new Date(Object.values(checkPrequelDate).join(" "));
    return prequelEndDate && (entries = entries.filter(entry => entry.date > new Date(+prequelEndDate + 10699393840))), 
    sequelStartDate && "TV" === media.format && (entries = entries.filter(entry => entry.date < new Date(+sequelStartDate - 10699393840))), 
    entries;
  }
  batch=(args, opts) => this.single(args, opts, !0);
  movie=this.batch;
};

function zeropad(v = 1, l = 2) {
  return ("string" == typeof v ? v : v.toString()).padStart(l, "0");
}

const epstring = ep => `"E${zeropad(ep)}+"|"E${zeropad(ep)}v"|"+${zeropad(ep)}+"|"+${zeropad(ep)}v"|"+${zeropad(ep)}-"`;

function createTitle(_titles) {
  const grouped = [ ...new Set(_titles.filter(name => null != name && name.length > 3)) ], titles = [], appendTitle = t => {
    const title = t.replace(/&/g, "%26").replace(/\?/g, "%3F").replace(/#/g, "%23");
    titles.push(title);
    const match1 = title.match(/(\d)(?:nd|rd|th) Season/i), match2 = title.match(/Season (\d)/i);
    match2 ? titles.push(title.replace(/Season \d/i, `S${match2[1]}`)) : match1 && titles.push(title.replace(/(\d)(?:nd|rd|th) Season/i, `S${match1[1]}`));
  };
  for (const t of grouped) appendTitle(t), t.includes("-") && appendTitle(t.replaceAll("-", ""));
  return titles;
}

function findEdge(media, type, formats = [ "TV", "TV_SHORT" ], skip) {
  let res = media.relations.edges.find(edge => edge.relationType === type && formats.includes(edge.node.format));
  return res || skip || "SEQUEL" !== type || (res = findEdge(media, type, formats = [ "TV", "TV_SHORT", "OVA" ], !0)), 
  res;
}

function parseRSSItems(xml) {
  if (!xml) return [];
  const items = [], itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  for (;null !== (match = itemRegex.exec(xml)); ) {
    const itemContent = match[1], title = /<title><!\[CDATA\[(.+?)\]\]><\/title>|<title>(.+?)<\/title>/i.exec(itemContent)?.[1] || itemContent.match(/<title>(.+?)<\/title>/i)?.[1] || "?", link = /<link>(.+?)<\/link>/i.exec(itemContent)?.[1] || "?", pubDate = /<pubDate>(.+?)<\/pubDate>/i.exec(itemContent)?.[1] ?? 0, seeders = Number(/<nyaa:seeders>(.+?)<\/nyaa:seeders>/i.exec(itemContent)?.[1] ?? 0), leechers = Number(/<nyaa:leechers>(.+?)<\/nyaa:leechers>/i.exec(itemContent)?.[1] ?? 0), downloads = Number(/<nyaa:downloads>(.+?)<\/nyaa:downloads>/i.exec(itemContent)?.[1] ?? 0), hash = /<nyaa:infoHash>(.+?)<\/nyaa:infoHash>/i.exec(itemContent)?.[1] ?? "?", sizeMatch = (/<nyaa:size>(.+?)<\/nyaa:size>/i.exec(itemContent)?.[1] ?? "0 KiB").match(/([\d.]+) (KiB|MiB|GiB|TiB)/), sizeInBytes = sizeMatch ? parseFloat(sizeMatch[1]) * (sizeMap[sizeMatch[2]] || 1) : 0;
    items.push({
      title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#34;/g, '"'),
      link: link,
      seeders: seeders,
      leechers: leechers,
      downloads: downloads,
      size: sizeInBytes,
      hash: hash,
      accuracy: "low",
      date: new Date(pubDate)
    });
  }
  return items;
}

async function getRSSContent(url, fetchFn) {
  if (!url) return null;
  try {
    const res = await fetchFn(url);
    if (!res.ok) throw new Error("Failed fetching RSS!\n" + res.statusText);
    return await res.text();
  } catch (e) {
    throw new Error("Failed fetching RSS!\n" + e.message);
  }
}