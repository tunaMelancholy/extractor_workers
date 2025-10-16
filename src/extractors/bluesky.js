// src/extractors/bluesky.js
export async function run({ url, env, ctx, fetch }) {
    try {
      const match = url.match(
        /https?:\/\/(?:[a-zA-Z0-9-]+\.)?bsky\.app\/profile\/([^/]+)\/post\/([^/?#]+)/,
      );
      if (!match) {
        return { mode: "text", text: "Invalid Bluesky URL" };
      }
      const handle = match[1];
      const postId = match[2];

      const username = env.BSKY_USERNAME || null;
      const password = env.BSKY_PASSWORD || null;
      const root = username && password ? "https://bsky.social" : "https://api.bsky.app";
      const headers = { Accept: "application/json" };

      if (username && password) {
        const loginUrl = `${root}/xrpc/com.atproto.server.createSession`;
        const body = JSON.stringify({ identifier: username, password });
        const resLogin = await fetch(loginUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body,
        });
        if (resLogin.ok) {
          const j = await resLogin.json();
          headers.Authorization = `Bearer ${j.accessJwt}`;
        } else {
          const t = await resLogin.text();
          return { mode: "text", text: `Auth failed: ${resLogin.status} ${t}` };
        }
      }

      const profileUrl = `${root}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`;
      const resProfile = await fetch(profileUrl, { headers });
      if (!resProfile.ok) {
        return { mode: "text", text: `Profile fetch error: ${resProfile.status}` };
      }
      const profile = await resProfile.json();
      const userDid = profile.did;
      const postUri = `at://${userDid}/app.bsky.feed.post/${postId}`;

      const postUrl = `${root}/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(postUri)}`;
      const resPost = await fetch(postUrl, { headers });
      if (!resPost.ok) {
        const t = await resPost.text();
        return { mode: "text", text: `Post fetch error: ${resPost.status} ${t}` };
      }
      const postData = await resPost.json();

      return { mode: "raw-json", json: postData };

    } 
    catch (err) {
      return { mode: "text", text: `Error fetching Bluesky post: ${err.message}` };
    }
}
