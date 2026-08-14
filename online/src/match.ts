import { DurableObject } from "cloudflare:workers"

interface Flight {
  x0: number
  y0: number
  tx: number
  ty: number
  t0: number
  dur: number
  arc: number
  who: number
}

interface Player {
  ws: WebSocket
  uid: string
  name: string
  side: number
  px: number
  py: number
  lastMove: number
}

const R_HT = 0.16
const MIN_HIT_MS = 1250
const RESTART_MS = 1600
const PWR = 0.85

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}

function jstr(d: unknown): string {
  return JSON.stringify(d)
}

export class MatchRoom extends DurableObject {
  players: Player[] = []
  sc: [number, number] = [0, 0]
  phase: "idle" | "serve" | "flight" | "wait" | "point" | "over" = "idle"
  flight: Flight | null = null
  wait: { x: number; y: number; returner: number; deadline: number } | null = null
  serve = 0
  serveAt = 0
  rally = 0
  target = 11

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get("upgrade") === "websocket") {
      const pair = new WebSocketPair()
      this.ctx.acceptWebSocket(pair[1])
      return new Response(null, { status: 101, webSocket: pair[0] })
    }
    return new Response(jstr({ ok: true, phase: this.phase, sc: this.sc }), {
      headers: { "content-type": "application/json" },
    })
  }

  private find(ws: WebSocket): Player | null {
    return this.players.find((p) => p.ws === ws) || null
  }

  private other(p: Player): Player | null {
    return this.players.find((q) => q.ws !== p.ws) || null
  }

  private send(ws: WebSocket, d: unknown) {
    try {
      ws.send(jstr(d))
    } catch {}
  }

  private bcast(d: unknown) {
    for (const p of this.players) this.send(p.ws, d)
  }

  async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer) {
    let d: { t?: string; x?: number; y?: number; tx?: number; ty?: number; uid?: string; name?: string }
    try {
      d = JSON.parse(String(msg))
    } catch {
      return
    }
    const now = Date.now()
    if (d.t === "join") {
      let p = this.find(ws)
      let newly = false
      if (!p) {
        if (this.players.length >= 2) {
          this.send(ws, { t: "err", msg: "MATCH FULL", n: now })
          return
        }
        p = { ws, uid: d.uid || "", name: (d.name || "PAL").slice(0, 12), side: this.players.length, px: 0.5, py: 0.5, lastMove: now }
        this.players.push(p)
        newly = true
      } else {
        if (d.uid) p.uid = d.uid
        if (d.name) p.name = d.name.slice(0, 12)
      }
      const opp = this.other(p)
      this.send(ws, { t: "hello", side: p.side, name: p.name, opp: opp ? opp.name : "WAITING FOR OPPONENT...", n: now })
      if (newly && opp) {
        this.send(opp.ws, { t: "peer", state: "joined", name: p.name, n: now })
        this.start()
      } else if (!opp) {
        this.send(ws, { t: "waiting", n: now })
      }
      return
    }
    const p = this.find(ws)
    if (!p) return
    if (d.t === "pos") {
      const maxStep = 0.012 + Math.min(0.08, Math.max(0, now - p.lastMove) / 1000 * 0.34)
      const lo = p.side === 0 ? 0.52 : 0.03
      const hi = p.side === 0 ? 0.97 : 0.48
      const nx = clamp(d.x == null ? p.px : d.x, 0.03, 0.97)
      const ny = clamp(d.y == null ? p.py : d.y, lo, hi)
      const dx = nx - p.px, dy = ny - p.py, distance = Math.hypot(dx, dy)
      if (distance <= maxStep) { p.px = nx; p.py = ny }
      p.lastMove = now
      const opp = this.other(p)
      if (opp) this.send(opp.ws, { t: "opp", x: p.px, y: p.py, n: now })
      this.tick(now)
      return
    }
    if (d.t === "hit") {
      this.tryHit(p, d.tx, d.ty)
      return
    }
    if (d.t === "hb") {
      this.tick(now)
      return
    }
  }

  async webSocketClose(ws: WebSocket) {
    const p = this.find(ws)
    if (!p) return
    this.players = this.players.filter((q) => q.ws !== ws)
    const left = this.players[0]
    if (!left) {
      this.phase = "idle"
      this.flight = null
      this.wait = null
      this.sc = [0, 0]
      return
    }
    if (this.phase !== "over") {
      this.phase = "over"
      this.send(left.ws, { t: "over", winner: left.side, reason: "OPPONENT LEFT", sc: this.sc, n: Date.now() })
    }
    try {
      left.ws.close()
    } catch {}
  }

  private start() {
    if (this.phase !== "idle") return
    this.sc = [0, 0]
    this.rally = 0
    this.target = 11
    this.serve = Math.floor(Math.random() * 2)
    this.phase = "point"
    this.serveAt = Date.now() + 1200
    this.bcast({ t: "go", serve: this.serve, n: Date.now() })
  }

  private launch(x0: number, y0: number, tx: number, ty: number, pwr: number, who: number): Flight | { fault: string } {
    const sameSide = (y0 < 0.5 && ty < 0.5) || (y0 > 0.5 && ty > 0.5)
    if (sameSide) return { fault: "NO CLEAR" }
    if (pwr < 0.3) return { fault: "INTO THE NET" }
    if (Math.abs(ty - 0.5) < 0.08) return { fault: "INTO THE NET" }
    if (tx < 0.03 || tx > 0.97 || ty < 0.03 || ty > 0.97) return { fault: "OUT!" }
    const d = Math.hypot(tx - x0, ty - y0)
    const dur = clamp(d / (0.3 * (0.35 + pwr)), 0.35, 2.4)
    const arc = clamp(0.05 + pwr * 0.13 + d * 0.05, 0.06, 0.26)
    return { t0: Date.now(), dur, arc, x0, y0, tx, ty, who }
  }

  private serveBall(now: number) {
    this.phase = "serve"
    const y0 = this.serve === 0 ? 0.88 : 0.12
    const x0 = clamp(0.5 + (Math.random() - 0.5) * 0.3, 0.2, 0.8)
    const ty = this.serve === 0 ? 0.08 + Math.random() * 0.14 : 0.78 + Math.random() * 0.14
    const tx = 0.2 + Math.random() * 0.6
    const f = this.launch(x0, y0, tx, ty, 0.8, this.serve)
    if ("fault" in f) {
      this.point(1 - this.serve, f.fault, now)
      return
    }
    this.flight = f
    this.wait = null
    this.bcast({ t: "serve", flight: f, serve: this.serve, n: now })
  }

  private tryHit(p: Player, txRaw: number | undefined, tyRaw: number | undefined) {
    const now = Date.now()
    if (this.phase === "over") return
    if (!this.wait || this.phase !== "wait") return
    if (this.wait.returner !== p.side) {
      this.send(p.ws, { t: "err", msg: "NOT YOUR BALL!", n: now })
      return
    }
    if (now > this.wait.deadline) {
      this.point(1 - p.side, "TOO SLOW!", now)
      return
    }
    const bx = this.wait.x
    const by = this.wait.y
    const dist = Math.hypot(p.px - bx, p.py - by)
    if (dist > R_HT + 0.02) {
      this.send(p.ws, { t: "err", msg: "STEP IN TO HIT", n: now })
      return
    }
    let tx = typeof txRaw === "number" ? txRaw : 0.5
    let ty = typeof tyRaw === "number" ? tyRaw : p.side === 0 ? 0.2 : 0.8
    tx = clamp(tx, 0, 1)
    ty = clamp(ty, 0, 1)
    const drift = clamp(dist / R_HT - 0.35, 0, 1) * 0.22
    tx = clamp(tx + (Math.random() - 0.5) * 2 * drift, 0, 1)
    ty = clamp(ty + (Math.random() - 0.5) * 2 * drift, 0, 1)
    const f = this.launch(bx, by, tx, ty, PWR, p.side)
    if ("fault" in f) {
      this.point(1 - p.side, f.fault, now)
      return
    }
    this.phase = "flight"
    this.flight = f
    this.wait = null
    this.rally++
    this.bcast({ t: "flight", flight: f, rally: this.rally, n: now })
    this.tick(now)
  }

  private tick(now: number) {
    if (this.phase === "point" && now >= this.serveAt && this.players.length === 2) {
      this.serveBall(now)
      return
    }
    if ((this.phase === "serve" || this.phase === "flight") && this.flight) {
      const f = this.flight
      const t = (now - f.t0) / 1000 / f.dur
      if (t >= 1) {
        // The room, not the browser, owns the deadline. A rally starts at
        // two seconds and gets progressively tighter, never below 1.25s.
        // Hits 1–2 remain at 2.00s; each hit from #3 onward removes 0.15s.
        const returnMs = Math.max(MIN_HIT_MS, 2000 - Math.max(0, this.rally - 2) * 150)
        this.wait = {
          x: f.tx,
          y: f.ty,
          returner: f.who === 0 ? 1 : 0,
          deadline: now + returnMs,
        }
        this.phase = "wait"
        this.bcast({
          t: "wait",
          x: f.tx,
          y: f.ty,
          returner: this.wait.returner,
          deadline: this.wait.deadline,
          rally: this.rally,
          returnMs,
          n: now,
        })
      }
      return
    }
    if (this.phase === "wait" && this.wait && now >= this.wait.deadline) {
      this.point(this.wait.returner === 0 ? 1 : 0, "TOO SLOW!", now)
    }
  }

  private point(winner: number, reason: string, now: number) {
    if (this.phase === "over") return
    this.sc[winner]++
    this.flight = null
    this.wait = null
    this.rally = 0
    this.phase = "point"
    this.serveAt = now + RESTART_MS
    this.serve = winner
    this.bcast({ t: "point", winner, reason, sc: this.sc, n: now })
    const s = this.sc[winner]
    const o = this.sc[1 - winner]
    if ((s >= this.target && s - o >= 2) || (s >= 11 && o >= 11 && s - o >= 2)) {
      this.phase = "over"
      this.bcast({ t: "over", winner, reason, sc: this.sc, n: now })
      for (const p of this.players) {
        try {
          p.ws.close()
        } catch {}
      }
    }
  }
}

interface LobbyPlayer {
  ws: WebSocket
  uid: string
  name: string
  x: number
  y: number
}

export class LobbyRoom extends DurableObject {
  players: LobbyPlayer[] = []
  // Left academy court: x 4–11 and y 3–19 in the 40×24 world.
  private onCourt(p: LobbyPlayer) {
    return p.x >= 4 / 40 && p.x <= 11 / 40 && p.y >= 3 / 24 && p.y <= 19 / 24
  }

  private announceCourt() {
    const ready = this.players.length === 2 && this.players.every((p) => this.onCourt(p))
    this.bcast({ t: "court", ready })
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get("upgrade") === "websocket") {
      const pair = new WebSocketPair()
      this.ctx.acceptWebSocket(pair[1])
      return new Response(null, { status: 101, webSocket: pair[0] })
    }
    return new Response(jstr({ ok: true, n: this.players.length }), {
      headers: { "content-type": "application/json" },
    })
  }

  private send(ws: WebSocket, d: unknown) {
    try {
      ws.send(jstr(d))
    } catch {}
  }

  private bcast(d: unknown, skip?: WebSocket) {
    for (const p of this.players) if (p.ws !== skip) this.send(p.ws, d)
  }

  async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer) {
    let d: { t?: string; x?: number; y?: number; uid?: string; name?: string }
    try {
      d = JSON.parse(String(msg))
    } catch {
      return
    }
    const p = this.players.find((q) => q.ws === ws)
    if (d.t === "join") {
      if (!p && this.players.length >= 2) { this.send(ws, { t: "err", msg: "LOBBY FULL" }); return }
      const np = p || {
        ws,
        uid: d.uid || "",
        name: (d.name || "PAL").slice(0, 12),
        x: 0.5,
        y: 0.5,
      }
      if (d.uid) np.uid = d.uid
      if (d.name) np.name = d.name.slice(0, 12)
      if (!p) this.players.push(np)
      this.send(ws, {
        t: "hello",
        you: { x: np.x, y: np.y },
        peers: this.players.filter((q) => q.ws !== ws).map((q) => ({ uid: q.uid, name: q.name, x: q.x, y: q.y })),
        n: Date.now(),
      })
      this.bcast({ t: "peer", uid: np.uid, name: np.name, x: np.x, y: np.y }, ws)
      this.announceCourt()
      return
    }
    if (!p) return
    if (d.t === "pos" || d.t === "hb") {
      p.x = clamp(d.x == null ? p.x : d.x, 0, 1)
      p.y = clamp(d.y == null ? p.y : d.y, 0, 1)
      this.bcast({ t: "pos", uid: p.uid, name: p.name, x: p.x, y: p.y }, ws)
      this.announceCourt()
    }
  }

  async webSocketClose(ws: WebSocket) {
    const p = this.players.find((q) => q.ws === ws)
    if (!p) return
    this.players = this.players.filter((q) => q.ws !== ws)
    this.bcast({ t: "left", uid: p.uid, name: p.name })
    this.announceCourt()
  }
}
