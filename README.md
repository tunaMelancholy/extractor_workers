#  Universal Extractor API

##  使用方式

访问以下接口查看支持的网站与版本信息：

```
GET https://extractor.loli.locker/info
```

返回示例：

```json
{
  "message": "ok",
  "status": 200,
  "version": "0.0.2",
  "supportedExtractors": [
    "plurk",
    "twitter",
    "arcalive",
    "baraag",
    "bluesky",
    "gelbooru",
    "iwara",
    "kemono",
    "misskey",
    "nhentai",
    "yandere",
    "pawoo",
    "pixiv"
  ]
}
```

---

使用 `POST` 向主接口提交你要提取的内容：

```
POST https://extractor.loli.locker/
```

请求体示例：

```json
{
  "extractor": "misskey",
  "url": "https://misskey.io/notes/adw7f013j5qh0bdo"
}
```

返回示例（部分内容截取）：

```json
{
  "id": "adw7f013j5qh0bdo",
  "createdAt": "2025-10-15T23:46:26.151Z",
  "user": {
    "id": "9d5a8462qd",
    "name": "午後茶:skeb::irai_bosyuu_tyuu:",
    "username": "gogo_tea",
    "avatarUrl": "https://proxy.misskeyusercontent.jp/avatar.webp?url=https%3A%2F%2Fmedia.misskeyusercontent.jp%2Fio%2F4f08779e-566d-486c-9286-a1507e46a787.png&avatar=1"
  },
  "text": "おはようワンドロ\n36日目",
  "files": [
    {
      "id": "adw7ey5f7jcu0019",
      "type": "image/webp",
      "url": "https://media.misskeyusercontent.jp/io/991eef74-5292-4a38-9615-2d18aaa27530.webp",
      "thumbnailUrl": "https://media.misskeyusercontent.jp/io/thumbnail-df84b84a-d6ae-4473-8583-56566601712f.webp"
    }
  ]
}
```

> ＞︿＜ 目前Pixiv会屏蔽Cloudflare的IP!
