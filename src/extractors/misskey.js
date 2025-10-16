// src/extractors/misskey.js
export async function run({ url, env, ctx, fetch }) {
    const endpoint = env.MISSKEY_API_ENDPOINT;

    const match = url.match(/\/notes\/([^/?]+)/);
    if (!match) {
      return { mode: "text", text: "Invalid Misskey URL" };
    }
    const noteId = match[1];

    const payload = { noteId };

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/135.0",
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "Referer": "https://misskey.io/",
    };

    let res, text;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
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

    if (Array.isArray(data.files)) {
      data.files = data.files.map((file) => {
        if (file.url && file.url.includes("?sensitive=true")) {
          return { ...file, url: file.url.replace("?sensitive=true", "") };
        }
        return file;
      });
    }

    return { mode: "raw-json", json: data };
}
