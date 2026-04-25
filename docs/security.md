# Security

themehub accepts user-uploaded archives on a public endpoint. The upload
pipeline treats every archive as untrusted and applies the checks below
before the archive is ever persisted.

## Upload pipeline

Every `POST /api/themes` (and `POST /api/v1/themes`) runs through this chain:

1. **Auth** — must present a session cookie or API token.
2. **Rate limit** — per-user bucket (see [Rate limits](#rate-limits)).
3. **Ban gate** — banned accounts are rejected before any archive is read.
4. **Archive hardening** (`web/src/server/archive.ts`):
   - Hard cap at **50 MB on the wire** (`LIMITS.maxArchiveBytes`).
   - At most **4 000 entries** per archive (`LIMITS.maxEntryCount`).
   - Each entry declared uncompressed size ≤ **50 MB**.
   - Total declared uncompressed size ≤ **500 MB**.
   - Compression ratio ≤ **200×** (zip-bomb guard).
   - Entry paths are normalized and rejected if they contain `..`, null
     bytes, absolute paths, `drive:\`, or Windows UNC prefixes.
   - Symlink entries (unix mode `0xa000`) are rejected.
   - File extensions on the denylist are rejected: native binaries
     (`.exe`, `.dll`, `.so`, `.dylib`, `.msi`, `.scr`, …), installers
     (`.apk`, `.jar`, `.deb`, `.rpm`, `.iso`, `.dmg`, …), Windows auto-execute
     scripts (`.bat`, `.cmd`, `.ps1`, `.vbs`, `.reg`, …). See the full list
     in `archive.ts`.
   - Screenshots are matched against magic bytes; an `.png` that is not
     actually a PNG is rejected.
5. **Virus scan** — the raw archive is streamed to `clamd` over TCP INSTREAM
   (default `clamav:3310`). An `infected` verdict is a hard reject with
   `MALWARE_DETECTED`. See [Virus scanning](#virus-scanning).
6. **Manifest validation** — `theme.toml` is parsed and validated.
7. **Storage** — only after all of the above does the archive get written
   to S3/MinIO and the database row created.

Every scan attempt (clean, infected, skipped, error) is recorded in the
`upload_scan` table so admins can audit the pipeline from `/admin`.

## Virus scanning

The docker-compose stack ships a `clamav` service that runs `clamd` on port
3310 with signature refresh via `freshclam` baked into the image. The web
service is wired to it via:

```yaml
CLAMAV_HOST: clamav
CLAMAV_PORT: 3310
```

Initial startup takes a couple of minutes while signatures download. During
this window the web service is still reachable — scans that can't connect
(connection refused, DNS failure, timeout) are recorded with a
`skipped` verdict and the upload is not blocked. This fail-open behaviour
is deliberate: a broken scanner should not take the upload pipeline down.

If you don't want virus scanning at all (e.g., during local development
against a single-node setup), set `CLAMAV_DISABLED=1`. Scans are still
logged with `verdict: skipped, reason: "CLAMAV_DISABLED=1"`.

To verify the scanner is working, upload an archive containing the [EICAR
test signature](https://www.eicar.org/download-anti-malware-testfile/). You
should see a 422 `MALWARE_DETECTED` response and an `infected` row in the
scan log.

## Rate limits

Backed by the `rate_bucket` table — fixed-window counters, no Redis
dependency. Defined in `web/src/server/rate-limit.ts`:

| Action   | Limit               | Bucketed by |
|----------|---------------------|-------------|
| upload   | 10 per hour         | user        |
| comment  | 20 per 5 minutes    | user        |
| report   | 30 per day          | user        |
| register | 5 per hour          | ip          |
| login    | 20 per 10 minutes   | ip          |

Limit responses are `429` with a `Retry-After` header. When both a user id
and an IP are available, the user-scoped bucket wins.

## Moderation

- Reports (theme or comment) surface in `/admin` with category, reason,
  reporter, and links. Admins can Resolve or Dismiss each report.
- Admins can hide a theme (invisible to everyone except the author and
  admins, with a banner), unhide it, or delete it outright.
- Admins can ban a user. A banned user cannot sign in (credentials or
  OAuth), cannot use their API token, cannot upload, comment, or file
  reports. Ban also invalidates any active sessions at the next request
  because `requireUserId` re-checks `isBanned` on every call.
- Every moderator action (`theme.hide`, `theme.unhide`, `theme.delete`,
  `user.ban`, `user.unban`, `report.resolve`, `report.dismiss`) is written
  to the `audit_log` table with actor, subject, and timestamp.

## Reporting security issues

If you find a security problem in themehub itself, email
[security@nanofox.dev](mailto:security@nanofox.dev) instead of opening a
public issue. Include enough detail to reproduce.
