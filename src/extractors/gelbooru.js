// src/extractors/gelbooru.js
export async function run({ url, env, ctx, fetch }) {
    const endpoint = env.GELBOORU_ENDPOINT ;

    const match = url.match(/id=(\d+)/);
    if (!match) {
      return { mode: "text", text: "Invalid Gelbooru URL (missing id=...)" };
    }

    const postId = match[1];
    const apiUrl = `${endpoint}${postId}`;

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/135.0",
      "Accept": "application/json, text/plain, */*",
      "Referer": "https://gelbooru.com/",
    };

    let res, text;
    try {
      res = await fetch(apiUrl, { headers });
      text = await res.text();
    } catch (err) {
      return { mode: "text", text: `Fetch failed: ${err.message}` };
    }

    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      return { mode: "text", text: `Invalid JSON from API:\n${text}` };
    }

    return { mode: "raw-json", json: data };

}
