// src/lib/fetch-utils.js
export async function fetchJsonAsIs(url, opts = {}) {
    const controller = new AbortController();
    const timeout = opts.timeout ?? 8000;
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        method: opts.method || "GET",
        headers: opts.headers || { "User-Agent": "Mozilla/5.0 (compatible)" },
        signal: controller.signal,
      });
      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        return { status: res.status, headers: res.headers, body: parsed };
      } catch (e) {
        console.log(e);
        return { status: res.status, headers: res.headers, body: text };
      }
    } finally {
      clearTimeout(id);
    }
}
