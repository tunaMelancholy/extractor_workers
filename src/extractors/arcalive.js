// src/extractors/arcalive.js
function generateToken(size = 64) {
    const buf = crypto.getRandomValues(new Uint8Array(size));
    return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function extractTextFromHTML(html) {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{2,}/g, "\n")
      .trim();
}

export async function run({ url, env, ctx, fetch }) {
    const pattern = /(?:https?:\/\/)?(?:www\.)?arca\.live\/b\/(?:\w+)\/(\d+)/;
    const match = url.match(pattern);
    if (!match) {
      return { mode: "text", text: "Invalid arca.live URL" };
    }

    const postId = match[1];
    const endpoint = env.ARCALIVE_ENDPOINT || "https://arca.live/api/b/article/";
    const apiUrl = `${endpoint}${postId}`;

    const _useragent = env.ARCALIVE_UA || "net.umanle.arca.android.playstore/0.9.75";
    const _token = generateToken(64);

    const headers = {
      "User-Agent": _useragent,
      "Accept-Encoding": "gzip, deflate",
      "Accept": "*/*",
      "Connection": "keep-alive",
      "X-Device-Token": _token,
    };

    let data = null;
    let responseText = "";

    try {
      const res = await fetch(apiUrl, { headers });
      responseText = await res.text();

      try {
        data = JSON.parse(responseText);
      } catch (err) {
        return { mode: "text", text: `Invalid JSON from API:\n${responseText}` };
      }
    } catch (err) {
      return { mode: "text", text: `Fetch failed: ${err.message}` };
    }

    if (!data) {
      return { mode: "text", text: "Empty response from API" };
    }

    const images = Array.isArray(data.images) ? data.images : [];
    const fmtUrls = images.map((img) =>
      img.startsWith("https:") ? img : `https:${img}`
    );

    let contentText = "";
    if (data.content) {
      contentText = extractTextFromHTML(data.content);
    }

    return {
      mode: "raw-json",
      json: {
        status: "ok",
        site: "arcalive",
        id: postId,
        content: contentText,
        files: fmtUrls,
        api: apiUrl,
      },
    };
}
