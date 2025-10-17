// src/extractors/pixiv.js
export async function run({ url, env, ctx, fetch }) {
    const match = url.match(/artworks\/(\d+)/);
    if (!match) return { mode: "text", text: "Invalid Pixiv URL" };

    const illustId = match[1];

    let tokenInfo = await env.PIXIV_TOKEN_KV.get("access_token", { type: "json" });

    if (!tokenInfo || Date.now() > tokenInfo.expires_at) {
        tokenInfo = await refreshAccessToken(env);
        if (tokenInfo.access_token) {
        await env.PIXIV_TOKEN_KV.put("access_token", JSON.stringify(tokenInfo), { expirationTtl: 3600 });
        } else {
        return { mode: "text", text: "Failed to refresh Pixiv token" };
        }
    }

    const apiUrl = `https://app-api.pixiv.net/v1/illust/detail?illust_id=${illustId}`;
    const res = await fetch(apiUrl, {
        headers: {
        "Authorization": `Bearer ${tokenInfo.access_token}`,
        "User-Agent": "PixivAndroidApp/5.0.234 (Android 11; Mobile;)",
        },
    });

    if (!res.ok) return { mode: "text", text: `Pixiv API error: ${res.status}` };
    const data = await res.json();
    const illust = data.illust;

    const imageUrls = illust.meta_pages?.length
        ? illust.meta_pages.map(p => p.image_urls.original)
        : [illust.meta_single_page.original_image_url];

    return {
        mode: "raw-json",
        json: {
        id: illust.id,
        title: illust.title,
        user: illust.user.name,
        tags: illust.tags.map(t => t.name),
        images: imageUrls,
        headers: {
            Referer: "https://www.pixiv.net/",
            Authorization: `Bearer ${tokenInfo.access_token}`,
        }
        }
    };
}

async function refreshAccessToken(env) {
    const url = "https://oauth.secure.pixiv.net/auth/token";
    const body = new URLSearchParams({
        client_id: env.CLIENT_ID,
        client_secret: env.CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: env.PIXIV_REFRESH_TOKEN,
    });

    const res = await fetch(url, {
        method: "POST",
        headers: {
        "User-Agent": "PixivAndroidApp/5.0.234 (Android 11; Mobile;)",
        "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });

    if (!res.ok) return {};
    const data = await res.json();
    data.expires_at = Date.now() + data.expires_in * 1000;
    return data;
}
