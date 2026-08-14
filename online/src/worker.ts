import { adminPage } from "./admin"
import { PresenceRoom } from "./presence"
import { MatchRoom, LobbyRoom } from "./match"

interface Env {
  PAL_ROOM: DurableObjectNamespace<PresenceRoom>
  MATCH_ROOM: DurableObjectNamespace<MatchRoom>
  LOBBY_ROOM: DurableObjectNamespace<LobbyRoom>
  ADMIN_TOKEN: string
}

const ALLOW = "*"
const COOKIE = "pal_admin"
const SESSION_MS = 24 * 3600 * 1000

function json(data: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  })
}

function cors(headers: Headers) {
  headers.set("access-control-allow-origin", ALLOW)
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS")
  headers.set("access-control-allow-headers", "content-type")
}

async function hmacHex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder()
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function readCookie(req: Request): string | null {
  const h = req.headers.get("cookie")
  if (!h) return null
  for (const part of h.split(";")) {
    const [k, ...v] = part.trim().split("=")
    if (k === COOKIE) return v.join("=")
  }
  return null
}

async function signSession(secret: string): Promise<string> {
  const exp = Date.now() + SESSION_MS
  return `${exp}.${await hmacHex(secret, String(exp))}`
}

async function verifySession(secret: string, val: string | null): Promise<boolean> {
  if (!val) return false
  const i = val.indexOf(".")
  if (i < 0) return false
  const exp = Number(val.slice(0, i))
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  return (await hmacHex(secret, String(exp))) === val.slice(i + 1)
}

function adminCookie(session: string): string {
  return `${COOKIE}=${session}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
}

function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
}

function room(env: Env) {
  return env.PAL_ROOM.get(env.PAL_ROOM.idFromName("presence"))
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const method = req.method

    if (method === "OPTIONS") {
      const r = new Response(null, { status: 204 })
      cors(r.headers)
      return r
    }

    if (method === "POST" && url.pathname === "/api/ping") {
      let body: { uid?: string; name?: string } = {}
      try {
        body = await req.json()
      } catch {}
      const uid = String(body.uid || "").slice(0, 64)
      if (!uid) return json({ ok: false, error: "missing uid" }, 400)
      const name = String(body.name || "YOU")
        .slice(0, 12)
        .toUpperCase()
      const r = json({ ok: true, ...(await room(env).ping(uid, name)) })
      cors(r.headers)
      return r
    }

    if (method === "GET" && url.pathname === "/api/live") {
      const { count, registered } = await room(env).live()
      const r = json({ count, registered })
      cors(r.headers)
      return r
    }

    if (method === "GET" && url.pathname === "/api/status") {
      const raw = (url.searchParams.get("codes") || "").toUpperCase()
      const codes = [
        ...new Set(
          raw
            .split(",")
            .map((c) => c.trim())
            .filter((c) => /^[0-9A-Z]{6}$/.test(c)),
        ),
      ].slice(0, 200)
      const r = json({ players: await room(env).status(codes) })
      cors(r.headers)
      return r
    }

    if (method === "GET" && url.pathname === "/api/friends") {
      const uid = String(url.searchParams.get("uid") || "")
      if (!uid) return json({ ok: false, error: "missing uid" }, 400)
      const r = json({ ok: true, friends: await room(env).listFriends(uid), requests: await room(env).listFriendRequests(uid) })
      cors(r.headers)
      return r
    }

    if (method === "POST" && url.pathname === "/api/friends/request") {
      let body: { uid?: string; code?: string } = {}
      try { body = await req.json() } catch {}
      const uid = String(body.uid || "")
      const code = String(body.code || "").toUpperCase()
      if (!uid || !/^[0-9A-Z]{6}$/.test(code)) return json({ ok: false, error: "bad request" }, 400)
      const r = json(await room(env).sendFriendRequest(uid, code))
      cors(r.headers)
      return r
    }

    if (method === "POST" && url.pathname === "/api/friends/respond") {
      let body: { uid?: string; id?: number; accept?: boolean } = {}
      try { body = await req.json() } catch {}
      const uid = String(body.uid || "")
      if (!uid || !Number.isFinite(Number(body.id))) return json({ ok: false, error: "bad request" }, 400)
      const r = json(await room(env).respondFriendRequest(uid, Number(body.id), !!body.accept))
      cors(r.headers)
      return r
    }

    if (method === "POST" && url.pathname === "/api/mail/claim") {
      let body: { uid?: string } = {}
      try {
        body = await req.json()
      } catch {}
      const uid = String(body.uid || "")
      if (!uid) return json({ ok: false, error: "missing uid" }, 400)
      const r = json(await room(env).claimWelcome(uid))
      cors(r.headers)
      return r
    }

    if (method === "GET" && url.pathname === "/api/mail") {
      const uid = String(url.searchParams.get("uid") || "")
      if (!uid) return json({ ok: false, error: "missing uid" }, 400)
      const r = json({ ok: true, ...(await room(env).inbox(uid)) })
      cors(r.headers)
      return r
    }

    if (method === "POST" && url.pathname === "/api/mail/seen") {
      let body: { uid?: string } = {}
      try {
        body = await req.json()
      } catch {}
      const uid = String(body.uid || "")
      if (!uid) return json({ ok: false, error: "missing uid" }, 400)
      const r = json(await room(env).markSeen(uid))
      cors(r.headers)
      return r
    }

    if (method === "POST" && url.pathname === "/api/bug") {
      let body: { uid?: string; name?: string; code?: string; text?: string } = {}
      try {
        body = await req.json()
      } catch {}
      const uid = String(body.uid || "")
      const text = String(body.text || "").trim()
      if (!uid || !text) return json({ ok: false, error: "missing uid or text" }, 400)
      const r = json(await room(env).addBug(uid, String(body.name || "").slice(0, 12), String(body.code || ""), text))
      cors(r.headers)
      return r
    }

    if (method === "GET" && url.pathname.startsWith("/api/match/")) {
      const id = url.pathname.slice("/api/match/".length)
      if (!id || !/^[0-9a-fA-F-]{8,64}$/.test(id)) return json({ ok: false, error: "bad match id" }, 404)
      const stub = env.MATCH_ROOM.get(env.MATCH_ROOM.idFromName("m-" + id))
      return stub.fetch(req)
    }

    if (method === "GET" && url.pathname.startsWith("/api/lobby/")) {
      const id = url.pathname.slice("/api/lobby/".length)
      if (!id || !/^[0-9a-fA-F-]{8,64}$/.test(id)) return json({ ok: false, error: "bad lobby id" }, 404)
      const stub = env.LOBBY_ROOM.get(env.LOBBY_ROOM.idFromName("l-" + id))
      return stub.fetch(req)
    }

    if (method === "POST" && url.pathname === "/api/challenge") {
      let body: { from?: string; fromName?: string; fromCode?: string; to?: string; toName?: string; type?: string } =
        {}
      try {
        body = await req.json()
      } catch {}
      const from = String(body.from || "")
      const to = String(body.to || "")
      const type = body.type === "duel" ? "duel" : "lobby"
      if (!from || !to || from === to) return json({ ok: false, error: "bad challenge" }, 400)
      const r = json(
        await room(env).sendChallenge(
          from,
          String(body.fromName || "PAL").slice(0, 12),
          String(body.fromCode || ""),
          to,
          String(body.toName || "pal").slice(0, 12),
          type,
        ),
      )
      cors(r.headers)
      return r
    }

    if (method === "GET" && url.pathname === "/api/challenges") {
      const uid = String(url.searchParams.get("uid") || "")
      if (!uid) return json({ ok: false, error: "missing uid" }, 400)
      const r = json({ ok: true, challenges: await room(env).listChallenges(uid) })
      cors(r.headers)
      return r
    }

    if (method === "POST" && url.pathname === "/api/challenge/respond") {
      let body: { uid?: string; id?: number; accept?: boolean } = {}
      try {
        body = await req.json()
      } catch {}
      const uid = String(body.uid || "")
      if (!uid || !Number.isFinite(Number(body.id))) return json({ ok: false, error: "bad request" }, 400)
      const r = json(await room(env).respondChallenge(uid, Number(body.id), !!body.accept))
      cors(r.headers)
      return r
    }

    if (method === "POST" && url.pathname === "/api/login") {
      let body: { password?: string } = {}
      try {
        body = await req.json()
      } catch {}
      if (body.password && body.password === env.ADMIN_TOKEN) {
        const session = await signSession(env.ADMIN_TOKEN)
        return json({ ok: true }, 200, { "set-cookie": adminCookie(session) })
      }
      return json({ ok: false, error: "bad password" }, 401)
    }

    if (method === "POST" && url.pathname === "/api/logout") {
      return new Response(null, { status: 204, headers: { "set-cookie": clearCookie() } })
    }

    if (method === "GET" && url.pathname === "/api/admin/stats") {
      const ok = await verifySession(env.ADMIN_TOKEN, readCookie(req))
      if (!ok) return json({ ok: false, error: "unauthorized" }, 401)
      return json({ ok: true, ...(await room(env).live()) })
    }

    if (method === "GET" && url.pathname === "/api/admin/bugs") {
      const ok = await verifySession(env.ADMIN_TOKEN, readCookie(req))
      if (!ok) return json({ ok: false, error: "unauthorized" }, 401)
      const r = json({ ok: true, bugs: await room(env).listBugs() })
      cors(r.headers)
      return r
    }

    if (method === "GET" && url.pathname === "/api/admin/feed") {
      const ok = await verifySession(env.ADMIN_TOKEN, readCookie(req))
      if (!ok) return json({ ok: false, error: "unauthorized" }, 401)
      const r = json({ ok: true, feed: await room(env).feed() })
      cors(r.headers)
      return r
    }

    if (method === "POST" && url.pathname === "/api/admin/bugs/resolve") {
      const ok = await verifySession(env.ADMIN_TOKEN, readCookie(req))
      if (!ok) return json({ ok: false, error: "unauthorized" }, 401)
      let body: { id?: number } = {}
      try {
        body = await req.json()
      } catch {}
      const r = json(await room(env).resolveBug(Number(body.id)))
      cors(r.headers)
      return r
    }

    if (method === "POST" && url.pathname === "/api/admin/patchnote") {
      const ok = await verifySession(env.ADMIN_TOKEN, readCookie(req))
      if (!ok) return json({ ok: false, error: "unauthorized" }, 401)
      let body: { title?: string; body?: string } = {}
      try {
        body = await req.json()
      } catch {}
      const title = String(body.title || "").slice(0, 60)
      const text = String(body.body || "")
        .trim()
        .slice(0, 1500)
      if (!title || !text) return json({ ok: false, error: "missing title or body" }, 400)
      const r = json({ ok: true, note: await room(env).addNote(title, text) })
      cors(r.headers)
      return r
    }

    if (method === "GET" && url.pathname === "/admin") {
      const ok = await verifySession(env.ADMIN_TOKEN, readCookie(req))
      return new Response(adminPage(ok), { headers: { "content-type": "text/html; charset=utf-8" } })
    }

    if (method === "GET" && url.pathname === "/") {
      const { count, registered } = await room(env).live()
      return new Response(indexPage(count, registered), { headers: { "content-type": "text/html; charset=utf-8" } })
    }

    return json({ ok: false, error: "not found" }, 404)
  },
} satisfies ExportedHandler<Env>

export { PresenceRoom, MatchRoom, LobbyRoom }

function indexPage(count: number, registered: number): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PICKLE PAL ONLINE — SERVER</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0a1f14;
    color: #eaffee;
    font-family: "Courier New", monospace;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 20px;
  }
  .box {
    background: #123525;
    border: 4px solid #ffd23d;
    padding: 28px 34px;
    max-width: 520px;
    box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.55);
  }
  h1 { font-size: 20px; letter-spacing: 2px; color: #ffd23d; margin-bottom: 14px; }
  p { font-size: 13px; line-height: 1.9; }
  .stat { display: flex; justify-content: space-between; gap: 24px; margin: 18px 0; }
  .stat b { display: block; font-size: 26px; color: #7ae0a8; }
  .stat span { font-size: 10px; color: #9fc9ab; letter-spacing: 1px; }
  a {
    display: block;
    margin-top: 14px;
    padding: 12px;
    background: #e84848;
    color: #fff;
    text-decoration: none;
    font-size: 12px;
    border: 3px solid #000;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.5);
  }
  a.alt { background: #123525; border-color: #ffd23d; color: #ffd23d; }
</style>
</head>
<body>
  <div class="box">
    <h1>PICKLE PAL ONLINE</h1>
    <p>FREE CLOUDFLARE WORKERS SERVER FOR THE GAME'S LIVE PRESENCE, PALCODES &amp; FRIENDS.</p>
    <div class="stat">
      <div><b>${count}</b><span>LIVE NOW</span></div>
      <div><b>${registered}</b><span>REGISTERED</span></div>
    </div>
    <a href="/api/live">API STATUS (JSON)</a>
    <a class="alt" href="/admin">ADMIN PANEL (PROTECTED)</a>
  </div>
</body>
</html>`
}

