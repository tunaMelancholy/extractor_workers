// src/extractors/iwara.js
export async function run({ url, env, ctx, fetch }) {
    const account = env.IWARA_ACCOUNT;
    const password = env.IWARA_PASSWORD;

    if (!account || !password) {
      return {
        mode: "text",
        text: "Missing IWARA_ACCOUNT or IWARA_PASSWORD in environment variables",
      };
    }

    const match = url.match(/\/video[s]?\/([a-zA-Z0-9]+)/);
    if (!match) {
      return { mode: "text", text: "Invalid Iwara video URL" };
    }
    const videoId = match[1];

    try {
      const userToken = await login(account, password, fetch);
      if (!userToken) {
        return { mode: "text", text: "Login failed: no token" };
      }

      const mediaToken = await fetchMediaToken(userToken, fetch);

      const sources = await fetchVideoSources(videoId, mediaToken, fetch);

      return { mode: "raw-json", json: sources };
    } catch (err) {
      return { mode: "text", text: `Error: ${err.message}` };
    }
}

async function login(account, password, fetch) {
    const resp = await fetch("https://api.iwara.tv/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: account, password }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    return data.token;
}

async function fetchMediaToken(userToken, fetch) {
    const resp = await fetch("https://api.iwara.tv/user/token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    if (!resp.ok) throw new Error("Failed to fetch media token");
    const data = await resp.json();
    return data.accessToken;
}

async function fetchVideoSources(videoId, mediaToken, fetch) {
    const resp = await fetch(`https://api.iwara.tv/video/${videoId}`, {
      headers: { Authorization: `Bearer ${mediaToken}` },
    });

    if (!resp.ok) throw new Error("Failed to fetch video metadata");

    const videoData = await resp.json();

    if (!videoData.fileUrl) {
      throw new Error("No fileUrl in response (possibly private or deleted video)");
    }

    const xVersion = await genXVersion(videoData.fileUrl);

    const formatsResp = await fetch(videoData.fileUrl, {
      headers: { "X-Version": xVersion },
    });

    if (!formatsResp.ok) throw new Error("Failed to fetch formats");
    const formats = await formatsResp.json();

    return { ...videoData, formats };
}

async function sha1(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function genXVersion(fileurl) {
    const url = new URL(fileurl);
    const paths = url.pathname.replace(/\/$/, "").split("/");
    const expires = url.searchParams.get("expires");
    const raw = `${paths[paths.length - 1]}_${expires}_5nFp9kmbNnHdAFhaqMvt`;
    return await sha1(raw);
}
