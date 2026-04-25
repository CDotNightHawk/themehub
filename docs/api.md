# themehub REST API (v1)

The API is versioned under `/api/v1`. All endpoints return JSON. The Rust CLI
talks to these endpoints; you can use them directly too.

## Authentication

Most read endpoints are public. Write endpoints require a Bearer API token.

Generate one in the web UI under **Settings → API tokens**, then:

```bash
curl -H "Authorization: Bearer <token>" https://hub.example.com/api/v1/themes
```

## Endpoints

### `GET /api/v1/themes`

List themes.

Query params:

- `q` — full-text search.
- `type` — filter by theme type (e.g. `grub`).
- `tag` — filter by a single tag (repeatable).
- `sort` — `recent` (default), `top`, `trending`, `name`.
- `limit` — page size, default 20, max 100.
- `cursor` — opaque pagination cursor.

```json
{
  "themes": [
    {
      "slug": "furry-grub-dark",
      "name": "Furry GRUB Dark",
      "type": "grub",
      "version": "1.0.0",
      "tags": ["furry", "dark", "neon"],
      "rating": 4.7,
      "downloads": 124,
      "author": "nighthawk",
      "screenshot": "https://hub.example.com/files/...png"
    }
  ],
  "next": null
}
```

### `GET /api/v1/themes/{slug}`

Full details of a theme, including the latest version manifest.

### `GET /api/v1/themes/{slug}/versions/{version}/archive`

Streams the theme archive bytes. The CLI uses this for `themehub install`.

### `POST /api/v1/themes`

Multipart upload. Fields:

- `archive` — the theme archive (zip/tar.gz/tar.zst).
- `notes` — release notes (markdown, optional).

Server validates the manifest and returns the new theme record.

### `GET /api/v1/categories`

Returns the list of supported `type` values with human-readable names and
default install targets.

### `GET /api/v1/me`

Returns the currently-authenticated user (used by `themehub login --check`).

## Errors

Errors use a uniform shape:

```json
{ "error": { "code": "INVALID_MANIFEST", "message": "missing [theme].slug" } }
```

| Code                | Meaning                                    |
|---------------------|--------------------------------------------|
| `UNAUTHORIZED`      | Missing or invalid token.                  |
| `FORBIDDEN`         | Authenticated but not allowed.             |
| `NOT_FOUND`         | Theme/version/user does not exist.         |
| `INVALID_MANIFEST`  | The uploaded `theme.toml` is invalid.      |
| `VERSION_CONFLICT`  | Uploaded version is `<=` an existing one.  |
| `RATE_LIMITED`      | Too many requests.                         |
