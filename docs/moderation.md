# Moderation

themehub ships with a lightweight moderation stack: in-app reports, an
admin dashboard, per-user bans, and a full audit trail.

## Granting admin

Add a user's email (comma separated) to `ADMIN_USERS` in the web service
environment. They'll be marked as admin on next sign-in (via the
`createUser` event; existing users can be promoted by editing the row
directly, or by re-registering with the same email). Admins get an `admin`
link in the top nav with a red badge showing the open-report count.

## Report flow

Any signed-in user can open the Report dialog from:

- the theme detail page (next to **Download archive**)
- next to any comment (the small `report` link)

The dialog asks for a category (spam / malware / copyright / harassment /
unmarked NSFW / broken / other) and a free-text reason. Reports go to the
admin dashboard at `/admin`.

Reports are rate-limited at **30 per day per user**.

## Admin dashboard (`/admin`)

Sections:

- **Stats** — themes / hidden / users / banned / comments / open reports /
  infected uploads.
- **Open reports** — each report has Resolve (action taken) and Dismiss
  (not actionable) buttons. Status is tracked in the `report.status` column
  (`open | resolved | dismissed`) with `handled_by_id` and `handled_at`.
- **Recent themes** — hide / unhide / delete. Hiding a theme sets
  `hidden=true` and removes it from `/themes` and the homepage; the author
  still sees it with a banner explaining the action.
- **Recent users** — ban / unban. An admin cannot ban themselves (the
  button is disabled). Bans block all sign-in paths, CLI tokens, upload,
  comment, and report endpoints.
- **Upload scans** — the last 30 rows of the `upload_scan` table.
  `verdict: infected` rows are highlighted red; `clean` is green; `skipped`
  and `error` are neutral.
- **Moderator actions** — the last 40 rows of the `audit_log` table, so
  every admin action is accountable.

## Audit log

Every moderator action writes one row to `audit_log` with:

- `actor_id` — who performed the action
- `action` — machine key (`theme.hide`, `theme.delete`, `user.ban`, …)
- `subject_type`, `subject_id` — what the action applied to
- `details` — freeform JSON (e.g. slug, username)
- `created_at`

The log is append-only; there is no UI for editing or deleting entries.

## What bans enforce

When `users.is_banned = true`:

| Surface                         | Behaviour when banned                            |
|---------------------------------|--------------------------------------------------|
| Credentials sign-in             | Rejected (generic "invalid credentials" message) |
| GitHub OAuth sign-in            | Rejected via the `signIn` callback               |
| `requireUserId` (API routes)    | Returns `null` as if unauthenticated             |
| `POST /api/themes`              | Rejected inside `uploadTheme` with `BANNED`      |
| `POST /api/themes/[slug]/comments` | Rejected inside `postComment` with `BANNED`   |
| `POST /api/themes/[slug]/report`   | Rejected — `requireUserId` returns null       |
| CLI with existing API token     | Returns 401                                       |

Unban restores all of the above immediately; there is no soft-ban tier.
