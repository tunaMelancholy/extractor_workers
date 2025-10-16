import * as plurk from "./extractors/plurk.js";
import * as twitter from "./extractors/twitter.js";
import * as arcalive from "./extractors/arcalive.js";
import * as baraag from "./extractors/baraag.js";
import * as bluesky from "./extractors/bluesky.js";
import * as gelbooru from "./extractors/gelbooru.js";
import * as iwara from "./extractors/iwara.js";
import * as kemono from "./extractors/kemono.js";
import * as misskey from "./extractors/misskey.js";
import * as nhentai from "./extractors/nhentai.js";
import * as yandere from "./extractors/yandere.js";
import * as pawoo from "./extractors/pawoo.js";
import { fetchJsonAsIs } from "./lib/fetch-utils.js";

const EXTRACTORS = {
  plurk,
  twitter,
  arcalive,
  baraag,
  bluesky,
  gelbooru,
  iwara,
  kemono,
  misskey,
  nhentai,
  yandere,
  pawoo,
};

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/info") {
        return new Response(JSON.stringify({
          message: "ok",
          status: 200,
          version: "0.0.2",
          supportedExtractors: Object.keys(EXTRACTORS)
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }

      let extractorName = url.searchParams.get("extractor");
      let targetUrl = url.searchParams.get("url");

      if (request.method === "POST") {
        const j = await request.json().catch(()=>null);
        if (j) {
          extractorName = extractorName || j.extractor;
          targetUrl = targetUrl || j.url;
        }
      }

      if (!extractorName || !targetUrl) {
        return new Response(JSON.stringify({ error: "missing extractor or url" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const extractor = EXTRACTORS[extractorName];
      if (!extractor) {
        console.log(`unknown extractor: ${extractorName}`);
        return new Response(JSON.stringify({ error: "unknown extractor" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const res = await extractor.run({ url: targetUrl, env, ctx, fetch: fetch });

      if (res.mode === "proxy" && res.apiUrl) {
        const prox = await fetchJsonAsIs(res.apiUrl, { timeout: env.DEFAULT_TIMEOUT_MS ? Number(env.DEFAULT_TIMEOUT_MS) : 8000 });
        return new Response(JSON.stringify(prox.body), {
          status: prox.status || 200,
          headers: { "Content-Type": "application/json" },
        });
      } else if (res.mode === "raw-json" && res.json) {
        return new Response(JSON.stringify(res.json), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else if (res.mode === "text" && res.text) {
        return new Response(res.text, { status: 200, headers: { "Content-Type": "text/plain" }});
      }

      return new Response(JSON.stringify({ error: "extractor returned unknown format" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.log(e);
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" }});
    }
  }
};
