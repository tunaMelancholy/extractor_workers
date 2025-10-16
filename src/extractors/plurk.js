// src/extractors/plurk.js
export async function run({ url, env, ctx, fetch }) {
    const match = url.match(/plurk\.com\/p\/(\w+)/);
    if (!match) {
      return { mode: "text", text: "invalid plurk url" };
    }
    const postId = match[1];
    const pageUrl = `https://www.plurk.com/p/${postId}`;
    const res = await fetch(pageUrl,{
          headers:{
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/135.0",
              "Accept": "application/json, text/plain, */*",
              "Referer": "https://www.plurk.com"
          }
      },);
    const html = await res.text();
    const tryBlock = (name) => {
      const re = new RegExp(name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&') + "\\s*=\\s*(\\{[\\s\\S]*?\\})\\s*;", "i");
      const m = html.match(re);
      if (m) {
        try {
          const text = m[1].replace(/new Date\(([^)]+)\)/g, "$1");
          return JSON.parse(text);
        } catch (e) {
          return null;
        }
      }
      return null;
    };

    const plurkJson = tryBlock("plurk");
    const globalJson = tryBlock("GLOBAL");

    const out = { plurk: plurkJson, GLOBAL: globalJson };

    return { mode: "raw-json", json: out };
}
