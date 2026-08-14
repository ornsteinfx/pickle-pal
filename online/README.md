# pickle-pal-online

Cloudflare Workers backend for Pickle Pal — live player presence, the protected
admin panel, and the friends/palcode system. Free to host on Cloudflare's
free tier (Workers + Durable Objects).

## What it provides

| Endpoint             | Method | Auth | Purpose                                             |
| -------------------- | ------ | ---- | --------------------------------------------------- |
| `/api/ping`          | POST   | none | Client heartbeat. Allocates your unique palcode.    |
| `/api/live`          | GET    | none | Public live-player + registered count.              |
| `/api/status?codes=` | GET    | none | Online/offline + name for a list of palcodes.       |
| `/admin`             | GET    | yes  | The admin panel (password protected).               |
| `/api/login`         | POST   | yes  | Verifies the admin password, sets an HMAC session.  |
| `/api/admin/stats`   | GET    | yes  | Full player list + history for the admin dashboard. |
| `/api/logout`        | POST   | yes  | Clears the admin session.                           |

- A player counts as **live** if they pinged within the last 60s.
- Every player is assigned a **unique forever** 6-char palcode (base-36,
  ~2 billion space) on first ping. The game displays it as `#XXX-Pal XXX`.
- The admin panel shows live count, registered players, a "last 2 hours"
  sparkline, and the live player table. It auto-refreshes every 5s.

## Local development

```bash
bun install
bun run dev        # starts wrangler dev on http://localhost:8787
```

`ADMIN_TOKEN` comes from `.dev.vars` in dev (`dev-admin-secret`). The game
auto-targets `http://localhost:8787` when opened from `localhost`.

Quick smoke test:

```bash
curl -X POST localhost:8787/api/ping -H 'content-type: application/json' -d '{"uid":"P_ABC","name":"ACE PRO"}'
curl localhost:8787/api/live
open http://localhost:8787/admin   # password: dev-admin-secret
```

## Deploy (free)

1. Create a Cloudflare account at dash.cloudflare.com (free).
2. Set the admin password and deploy:

```bash
cd packages/pickle-pal-online
bunx wrangler login
bunx wrangler secret put ADMIN_TOKEN   # type a strong password
bunx wrangler deploy
```

3. You'll get a URL like `https://pickle-pal-online.<account>.workers.dev`.
   Copy it and paste it into the game:

   `packages/opencode/pickle-pal.html` → find `ONLINE_API` → replace the
   `https://pickle-pal-online.<YOUR-ACCOUNT>.workers.dev` placeholder.

4. Redeploy the game to GitHub Pages as usual.

The admin panel lives at `https://pickle-pal-online.<account>.workers.dev/admin`.

> **Note:** if your account has never opened the Workers dashboard, `wrangler
deploy` may fail with `code: 10063` ("You need a workers.dev subdomain").
> Create the subdomain via the API with the token from
> `~/Library/Preferences/.wrangler/config/default.toml`:
> `PUT https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/subdomain`
> with body `{"subdomain": "pickle-pal-online"}`, then redeploy. TLS certs for
> a fresh subdomain take a few minutes to provision.

## Live deployment

- Game: https://ornsteinfx.github.io/pickle-pal/
- API: https://pickle-pal-online.pickle-pal-online.workers.dev
- Admin: https://pickle-pal-online.pickle-pal-online.workers.dev/admin
- Admin password: stored in `/tmp/pickle-pal-admin-pw.txt` (secret `ADMIN_TOKEN`).

## Scaling

Presence, palcodes, and friends all live in a single Durable Object instance
(keyed `"presence"`), which is plenty for hobby-scale play (thousands of
concurrent pings/min). When you outgrow it, the natural next step is to shard
players across multiple DO instances by uid hash; the friends/status API is
already batch-friendly. The DO uses a transaction-protected counter so
palcode allocation never collides regardless of concurrent pings.

