// src/extractors/twitter.js
export async function run({ url, env, ctx, fetch }) {
    const source = url.split("?")[0];
    const replaceX = (input, apiDomain='api.vxtwitter.com') => {
      if (input.includes('api.vxtwitter.com') || input.includes('api.fxtwitter.com')) return input;
      if (input.toLowerCase().includes('x.com')) return input.replace(/x\.com/ig, apiDomain);
      if (input.toLowerCase().includes('twitter.com')) return input.replace(/twitter\.com/ig, apiDomain);
      return input;
    };

    let apiUrl = replaceX(source, 'api.vxtwitter.com');
    let res = await fetch(apiUrl);
    let text = await res.text().catch(()=>null);
    let parsed = null;
    try { parsed = JSON.parse(text); } catch(e){ parsed = null; }

    if (!parsed) {
      apiUrl = replaceX(source, 'api.fxtwitter.com');
      res = await fetch(apiUrl,{
          headers:{
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/135.0",
              "Accept": "application/json, text/plain, */*",
          }
      },
      );
      text = await res.text().catch(()=>null);
      try { parsed = JSON.parse(text); } catch(e){ parsed = null; }
    }

    if (parsed) {
      return { mode: "raw-json", json: parsed };
    }

    return { mode: "text", text: text || "" };
}
