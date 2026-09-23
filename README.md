# Switch Performance

A community-powered project for browsing and contributing Nintendo Switch performance data. This project provides a user-friendly interface for the data collected in the [nx-performance](https://github.com/biase-d/nx-performance) repository

## Features
-   **Fast Search**: Instantly search thousands of game titles
-   **Detailed Performance Data**: View resolution, FPS targets, and stability for both docked and handheld modes
-   **Community Contributions**: Submit new performance data or suggest edits via a streamlined GitHub PR process
-   **Personalization**: Mark games as favorites for quick access
-   **Contributor Profiles**: See all contributions made by community members

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
