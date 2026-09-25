# Switch Performance

A community-powered project for browsing and contributing Nintendo Switch performance data. This project provides a user-friendly interface for the data collected in the [nx-performance](https://github.com/biase-d/nx-performance) repository

## Features
-   **Fast Search**: Instantly search thousands of game titles
-   **Detailed Performance Data**: View resolution, FPS targets, and stability for both docked and handheld modes
-   **Community Contributions**: Submit new performance data or suggest edits via a streamlined GitHub PR process
-   **Personalization**: Mark games as favorites for quick access
-   **Contributor Profiles**: See all contributions made by community members

## Running it

### Development

```sh
docker compose up -d          # Postgres on :5432
cp .env.example .env          # set POSTGRES_URL at least
npm install
node scripts/bootstrap-db.js  # creates layer_a/layer_b and applies migrations
npm run build:index           # first data sync (clones the two data repos)
npm run dev
```

With `S3_ENDPOINT` unset the storage layer writes to `./storage`, so no object
store is needed to work on the app.

### Deployment (Coolify)

Built from the `Dockerfile`. Node 22 on Debian, because `sharp` and
`@resvg/resvg-js` ship prebuilt glibc binaries.

**Environment.** Every variable is read at runtime through
`$env/dynamic/private`, so none are needed at build time and none end up in an
image layer. Set them as runtime variables in Coolify. The ones that are not
optional: `POSTGRES_URL`, `ORIGIN`, `AUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`,
`GITHUB_BOT_TOKEN`.

`ORIGIN` must be the public URL. Without it adapter-node rejects form actions and
the auth callback as cross-site, which breaks sign-in and every contribution.

**Volumes.** Two, or the container loses state that is expensive to rebuild:

| Path | Holds | Cost of losing it |
| --- | --- | --- |
| `/app/data` | the `nx-performance` and `titledb_filtered` clones, and `data/logs` | every sync re-clones both repositories |
| `/app/.cache` | the contributor map and pipeline metadata | every incremental sync degrades into a full rebuild |

The resized-artwork and OG-image caches are *not* on disk — they live in the
object store, so they survive redeploys on their own.

**Scheduled task.** Add one on the app resource:

```
0 */12 * * *   node scripts/build.js
```

It runs the pipeline in the container. `--full-rebuild` rebuilds into the standby
schema and swaps it in; `--no-cache` ignores the cached contributor map. A run
takes a Postgres advisory lock first, so an overlapping run exits as a no-op
rather than corrupting the schema swap. That is also why the GitHub Actions
workflows no longer carry a cron: `refresh-db.yml` and `pipeline-failover.yml`
are manual (`workflow_dispatch`) escape hatches for when the host is unavailable.

**First deploy**, once the database is reachable:

```sh
node scripts/bootstrap-db.js          # schemas, migrations, public views
node scripts/build.js --full-rebuild  # populate
```

**Health.** The image declares a `HEALTHCHECK` against
`/api/v1/status?strict=1`, which answers 503 only when the database is
unreachable. A GitHub or CDN outage leaves it 200, because those cost a feature
rather than the site.

### Storage (Garage)

Garage holds the derived-asset caches: artwork resized by `/api/v1/proxy/image`
and the OG cards from `/api/og/[id].jpg`. Both are recomputable, so storage is
optional — with none configured every request recomputes, which is slower but
never wrong.

Create a bucket and a key:

```sh
garage bucket create titledb-assets
garage key create titledb-browser
garage bucket allow --read --write titledb-assets --key titledb-browser
```

Then set `S3_ENDPOINT` (e.g. `http://garage:3900`), `S3_BUCKET`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` and `S3_REGION` to whatever region the
cluster was configured with — it is not an AWS region and only has to match the
server. Addressing is path-style, so no wildcard DNS is needed.

Check the connection from inside the running container:

```sh
docker exec -it <container> node scripts/check-storage.js
```

It writes, reads back, lists and deletes one object under `healthcheck/`, using
the same variables the app reads, and names which step failed rather than
leaving you with "images seem slow". `/api/health` and `/api/v1/status` probe it
too, so a broken store shows as `degraded` — never `down`, because every image
is still served, just recomputed each time.

Nothing prunes these caches. They are content-addressed, so they only grow when
artwork or game data changes, but a bucket lifecycle rule is worth adding if that
turns out to matter.

## Monitoring

Two halves, and you want both.

**An app cannot report its own outage.** If the process is dead or the host is
unreachable, no webhook fires — a push-only setup stays silent in exactly the
case you care about most. So n8n polls for "is it up", and the app pushes the
failures it can still see from the inside.

### 1. Polling — catches the app being down

`GET /api/v1/status` returns a single `status` field to branch on:

| `status` | meaning |
| --- | --- |
| `up` | database, e-Shop CDN and GitHub all answering |
| `degraded` | the site works, but something is off — artwork may not load, or contributions can't be submitted |
| `down` | the database is unreachable, so nothing can be served |

Only the database can make it `down`. A GitHub or CDN outage costs a feature,
not the site.

Add `?strict=1` and the endpoint answers **503** when `status` is `down`,
otherwise 200. That lets a monitor treat the HTTP status as the verdict.
Without it the endpoint always returns 200, so existing dashboards that read
the body keep working.

In n8n:

1. **Schedule Trigger** — every minute or two.
2. **HTTP Request** — `GET https://your-host/api/v1/status?strict=1`.
   Leave "Never Error" *off*: a 503 or a connection failure should fail the
   node, and a dead host fails it too. That single node is your outage check.
3. **Error branch → notification.** Use the workflow's error output, or set an
   *Error Workflow* under workflow settings so a failed run notifies you.
4. To catch `degraded` as well, add an **IF** node on
   `{{ $json.status }} != "up"` off the success path and route it somewhere
   quieter than your outage alert.

Responses are cached for 30 seconds, so polling faster than that gains nothing.

`GET /api/health` also exists and covers the database, storage and sync-pipeline
state. It does not check the CDN or GitHub, so prefer `/api/v1/status` for
uptime and use `/api/health` when you want pipeline detail.

### 2. Webhook — catches failures only the app can see

Set `N8N_WEBHOOK_URL` and every `logger.error` is POSTed there as JSON. Set
`N8N_WEBHOOK_TOKEN` too and it is sent as `Authorization: Bearer <token>`;
match it with n8n's *Header Auth* credential on the Webhook node so the
endpoint is not open to the internet.

```json
{
  "source": "titledb-browser",
  "environment": "production",
  "event": "error",
  "severity": "critical",
  "title": "Status check failed: database",
  "detail": "connect ECONNREFUSED 10.0.0.5:5432\n    at ...",
  "context": {},
  "timestamp": "2026-09-24T00:00:00.000Z"
}
```

Branch on `event` (`error`, `dependency_down`, `dependency_degraded`,
`pipeline_failed`) or on `severity` (`critical`, `warning`). `title` is one line
and safe to drop straight into a chat message; `detail` carries the stack trace
and is meant for you, not for users.

Repeats of the same `title` are dropped for 5 minutes, so a failure in a hot
code path won't flood the channel. A send that fails is not throttled — the next
occurrence retries. If `N8N_WEBHOOK_URL` is unset the whole thing is skipped,
and a broken webhook is never allowed to turn logging an error into a second
error.

The same errors still go to `data/logs/` and, if SMTP is configured, to
`ALERT_EMAIL_TO`. See `.env.example`.
