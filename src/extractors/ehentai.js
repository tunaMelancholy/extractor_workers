// src/extractors/exhentai.js
export async function run({ url, env, ctx, fetch }) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const COOKIE = env.EXHENTAI_COOKIE;
  const MAX_CONCURRENT = parseInt(env.EXHENTAI_THREADS);
  const RETRY_COUNT = parseInt(env.EXHENTAI_RETRY);
  const RETRY_WAIT = parseInt(env.EXHENTAI_DELAY);
  const API_URL = env.EHENTAI_API;
  const EX_API_URL = env.EXHENTAI_API ;

  const headers = {
    "User-Agent":
      env.CUSTOM_UA ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Cookie: COOKIE,
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
  };

  const webHeaders = {
    ...headers,
    Accept: "text/html,application/xhtml+xml",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const isEx = url.includes("exhentai.org");
  const apiUrl = isEx ? EX_API_URL : API_URL;
  const baseDomain = isEx ? "https://exhentai.org" : "https://e-hentai.org";

  const match = url.match(/\/g\/(\d+)\/([\da-f]{10})/);
  if (!match) return { mode: "text", text: "URL format error" };
  const gid = parseInt(match[1]);
  const token = match[2];

  try {
    const metaPayload = { method: "gdata", gidlist: [[gid, token]], namespace: 1 };
    const metaRes = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(metaPayload),
    });
    if (!metaRes.ok) throw new Error(`Meta request failed: ${metaRes.status}`);
    const metaData = await metaRes.json();
    const meta = metaData.gmetadata?.[0];
    if (!meta) throw new Error("cannot find meta");

    const totalPages = parseInt(meta.filecount || "0");
    const firstPageHtml = await (await fetch(url, { headers: webHeaders })).text();
    const imgkeys = {};

    const parseKeysFromHtml = (htmlText) => {
    const keyRegex = new RegExp(`/s/([\\da-f]+)/${gid}-(\\d+)`, "g");
    let match;
    while ((match = keyRegex.exec(htmlText))) {
        const imgkey = match[1];
        const pageNum = parseInt(match[2]);
        imgkeys[pageNum] = imgkey;
    }
    };

    parseKeysFromHtml(firstPageHtml);

    const pageNavMatch = [...firstPageHtml.matchAll(/\?p=(\d+)/g)];
    const pageNumbers = pageNavMatch.map(m => parseInt(m[1], 10));
    const lastPageNum = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 0;

    const pageUrls = [];
    for (let i = 1; i <= lastPageNum; i++) {
    pageUrls.push(`${url}?p=${i}`);
    }

    const pageChunks = chunkArray(pageUrls, Math.min(5, MAX_CONCURRENT));

    for (let i = 0; i < pageChunks.length; i++) {
    console.log(`Fetching page batch ${i + 1}/${pageChunks.length}`);
    const responses = await Promise.allSettled(
        pageChunks[i].map((p) => fetch(p, { headers: webHeaders }))
    );

    for (const res of responses) {
        if (res.status === "fulfilled") {
        const html = await res.value.text();
        parseKeysFromHtml(html);
        }
    }
    await sleep(1000);
    }
    const firstImgkey = imgkeys[1];
    if (!firstImgkey) throw new Error("cannot found first page's imgkey");

    const viewerUrl = `${baseDomain}/s/${firstImgkey}/${gid}-1`;
    const viewerHtml = await (await fetch(viewerUrl, { headers: webHeaders })).text();

    let showkeyMatch = viewerHtml.match(/showkey\s*=\s*['"]([\w-]+)['"]/);

    if (!showkeyMatch) {
    const altMatch = viewerHtml.match(/var\s+showkey\s*=\s*"([^"]+)"/);
    if (altMatch) showkeyMatch = altMatch;
    }

    if (!showkeyMatch) throw new Error("showkey not found");

    const showkey = showkeyMatch[1];

    const tasks = [];
    for (const [pageNum, imgkey] of Object.entries(imgkeys)) {
      tasks.push(fetchImageLink(apiUrl, gid, pageNum, imgkey, showkey, headers, RETRY_COUNT, RETRY_WAIT, fetch));
    }

    const chunks = chunkArray(tasks, MAX_CONCURRENT);
    const imageLinks = [];
    for (let i = 0; i < chunks.length; i++) {
      const results = await Promise.allSettled(chunks[i].map((t) => t()));
      for (const r of results) if (r.status === "fulfilled" && r.value) imageLinks.push(r.value);
      await sleep(RETRY_WAIT);
    }

    return { mode: "raw-json", json: { title: meta.title, gid, totalPages, image_links: imageLinks } };
  } catch (err) {
    return { mode: "text", text: `Fetch Error: ${err.message}` };
  }
}

function fetchImageLink(apiUrl, gid, page, imgkey, showkey, headers, retryCount, retryWait, fetch) {
  return async () => {
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const payload = { method: "showpage", gid, page, imgkey, showkey };
        const res = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(`API error: ${data.error}`);
        const imgHtml = data.i3 || "";
        const match = imgHtml.match(/src=['"]([^'"]+)['"]/);
        if (match) {
          return match[1];
        } else throw new Error("cannot find image link");
      } catch (err) {
        console.warn(`第 ${page} 页失败 (${attempt}/${retryCount})：${err.message}`);
        if (attempt < retryCount) await new Promise((r) => setTimeout(r, retryWait * attempt));
      }
    }
    console.error(`第 ${page} 页多次重试失败`);
    return null;
  };
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
