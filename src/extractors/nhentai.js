// src/extractors/nhentai.js
export async function run({ url, env, ctx, fetch }) {
    const endpoint = env.NHENTAI_API_ENDPOINT ;

    const match = url.match(/https?:\/\/nhentai\.net\/g\/(\d+)/);
    if (!match) {
        return { mode: "text", text: "Invalid nhentai URL" };
    }

    const galleryId = match[1];
    const apiUrl = `${endpoint}${galleryId}`;

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/135.0",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://nhentai.net/",
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

    const mediaId = data.media_id;
    const numPages = data.num_pages;
    const formatFlag = data.images?.pages?.[0]?.t || "j";
    const format = formatFlag === "j" ? ".jpg" : ".webp";
    const title =
        data.title?.japanese ||
        data.title?.english ||
        data.title?.pretty ||
        "Unknown Title";

    const cdnList = [
        "https://i1.nhentai.net/galleries/",
        "https://i2.nhentai.net/galleries/",
        "https://i4.nhentai.net/galleries/",
        "https://i9.nhentai.net/galleries/",
    ];
    const randomCDN = cdnList[Math.floor(Math.random() * cdnList.length)];

    const images = [];
    for (let i = 1; i <= numPages; i++) {
        images.push(`${randomCDN}${mediaId}/${i}${format}`);
    }

    const result = {
        id: galleryId,
        title,
        media_id: mediaId,
        num_pages: numPages,
        format,
        images,
    };

    return { mode: "raw-json", json: result };
}
