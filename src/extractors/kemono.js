// src/extractors/kemono.js
export async function run({ url, env, ctx, fetch }) {
    if (!url) {
        return { mode: "text", text: "Missing url parameter" };
    }

    let target = url.replace("https://kemono.cr/", "/api/v1/");
    const apiUrl = "https://kemono.cr" + target;


    try {
        const res = await fetch(apiUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/135.0",
            "Accept": "text/css",
        },
        });

        const text = await res.text();
        const contentType = res.headers.get("content-type") || "";

        let data = null;
        if (contentType.includes("application/json")) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
        } else {
        data = text;
        }

        return { mode: "raw-json", json: data };
    } catch (err) {
        return { mode: "text", text: `Fetch failed: ${err.message}` };
    }
}
