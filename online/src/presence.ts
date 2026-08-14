import { DurableObject } from "cloudflare:workers"

const TTL = 60_000
const SAMPLE_MS = 30_000
const MAX_SAMPLES = 240

interface Player {
  name: string
  lastSeen: number
  code: string
}

interface Note {
  id: number
  type: string
  title: string
  body: string
  at: number
}

interface BugReport {
  id: number
  uid: string
  name: string
  code: string
  text: string
  at: number
  resolved: boolean
}

interface MailState {
  welcome: boolean
  seen: number
}

interface Challenge {
  id: number
  type: "lobby" | "duel"
  from: string
  fromName: string
  fromCode: string
  to: string
  toName: string
  at: number
  status: "pending" | "accepted" | "declined" | "dismissed"
  matchId?: string
}

interface FriendRequest {
  id: number
  from: string
  to: string
  at: number
  status: "pending" | "accepted" | "declined"
}

interface Activity {
  t: number
  type: "join" | "challenge" | "accept" | "decline" | "bug" | "note"
  text: string
}

const WELCOME_TITLE = "WELCOME TO PICKLE PAL!"
const WELCOME_BODY =
  "HEY PAL! THIS IS YOUR VERY OWN MAILBOX. YOU CAN'T WRITE LETTERS, BUT I'LL DROP NOTES HERE WHENEVER THE GAME UPDATES. \n\n" +
  "YOUR PICKLE CODE IS YOUR FRIEND ID — SHARE IT AND YOU'LL BE ABLE TO CHALLENGE PALS TO A LIVE 1V1 RALLY. \n\n" +
  "P.S. IF THE GAME EVER BREAKS, HIT THE REPORT BUG BUTTON IN YOUR INBOX. IT GOES STRAIGHT TO ME. \n\n" +
  "SEE YOU ON THE COURT, PAL! \u2014 THE DEV"

export class PresenceRoom extends DurableObject {
  players: Map<string, Player> = new Map()
  codes: Map<string, string> = new Map()
  history: { t: number; n: number }[] = []
  notes: Note[] = []
  bugs: BugReport[] = []
  mail: Map<string, MailState> = new Map()
  challenges: Challenge[] = []
  friends: Map<string, string[]> = new Map()
  friendRequests: FriendRequest[] = []
  activity: Activity[] = []
  loaded = false

  async load() {
    if (this.loaded) return
    this.loaded = true
    const p = await this.ctx.storage.get<[string, Player][]>("players")
    if (p) this.players = new Map(p)
    const c = await this.ctx.storage.get<[string, string][]>("codes")
    if (c) this.codes = new Map(c)
    const h = await this.ctx.storage.get<{ t: number; n: number }[]>("history")
    if (h) this.history = h
    const n = await this.ctx.storage.get<Note[]>("notes")
    if (n) this.notes = n
    const b = await this.ctx.storage.get<BugReport[]>("bugs")
    if (b) this.bugs = b
    const m = await this.ctx.storage.get<[string, MailState][]>("mail")
    if (m) this.mail = new Map(m)
    const ch = await this.ctx.storage.get<Challenge[]>("challenges")
    if (ch) this.challenges = ch
    const f = await this.ctx.storage.get<[string, string[]][]>("friends")
    if (f) this.friends = new Map(f)
    const fr = await this.ctx.storage.get<FriendRequest[]>("friendRequests")
    if (fr) this.friendRequests = fr
    const a = await this.ctx.storage.get<Activity[]>("activity")
    if (a) this.activity = a
  }

  async schedule() {
    const next = Date.now() + SAMPLE_MS
    const cur = await this.ctx.storage.getAlarm()
    if (!cur || cur > next) await this.ctx.storage.setAlarm(next)
  }

  onlineCount(now: number): number {
    let n = 0
    for (const p of this.players.values()) if (now - p.lastSeen <= TTL) n++
    return n
  }

  async logActivity(type: Activity["type"], text: string) {
    this.activity.push({ t: Date.now(), type, text })
    if (this.activity.length > 200) this.activity = this.activity.slice(-200)
    await this.ctx.storage.put("activity", this.activity)
  }

  async alloc(key: string): Promise<number> {
    const next = await this.ctx.storage.transaction(async (txn) => {
      const n = ((await txn.get<number>(key)) || 0) + 1
      await txn.put(key, n)
      return n
    })
    return next
  }

  async ping(uid: string, name: string): Promise<{ count: number; code: string; registered: number }> {
    await this.load()
    const now = Date.now()
    let p = this.players.get(uid)
    if (!p || !p.code) {
      let old = ""
      for (const [c, u] of this.codes)
        if (u === uid) {
          old = c
          break
        }
      const code = old || (await this.alloc("counter")).toString(36).toUpperCase().padStart(6, "0")
      p = { name, lastSeen: now, code }
      this.players.set(uid, p)
      this.codes.set(code, uid)
      await this.ctx.storage.put("codes", [...this.codes.entries()])
      if (!old) await this.logActivity("join", (name || "PAL") + " registered (" + code + ")")
    } else {
      p.name = name
      p.lastSeen = now
      if (!this.codes.has(p.code)) {
        this.codes.set(p.code, uid)
        await this.ctx.storage.put("codes", [...this.codes.entries()])
      }
    }
    await this.ctx.storage.put("players", [...this.players.entries()])
    await this.schedule()
    return { count: this.onlineCount(now), code: p.code, registered: this.codes.size }
  }

  async status(
    codes: string[],
  ): Promise<{ code: string; uid: string; name: string; online: boolean; lastSeen: number }[]> {
    await this.load()
    const now = Date.now()
    const out: { code: string; uid: string; name: string; online: boolean; lastSeen: number }[] = []
    for (const code of codes) {
      const uid = this.codes.get(code)
      const p = uid ? this.players.get(uid) : undefined
      out.push({
        code,
        uid: uid || "",
        name: p ? p.name : "",
        online: !!p && now - p.lastSeen <= TTL,
        lastSeen: p ? p.lastSeen : 0,
      })
    }
    return out
  }

  private async saveFriends() {
    await this.ctx.storage.put("friends", [...this.friends.entries()])
    await this.ctx.storage.put("friendRequests", this.friendRequests)
  }

  async listFriends(uid: string) {
    await this.load()
    const ids = this.friends.get(uid) || []
    const now = Date.now()
    return ids.map((id) => {
      const p = this.players.get(id)
      return { uid: id, code: p?.code || "", name: p?.name || "PAL", online: !!p && now - p.lastSeen <= TTL }
    })
  }

  async listFriendRequests(uid: string) {
    await this.load()
    return this.friendRequests.filter((r) => r.to === uid && r.status === "pending").slice().reverse()
  }

  async sendFriendRequest(from: string, toCode: string) {
    await this.load()
    const to = this.codes.get(toCode)
    if (!to || !this.players.has(from) || from === to) return { ok: false, error: "invalid friend request" }
    if ((this.friends.get(from) || []).includes(to)) return { ok: false, error: "already friends" }
    if (this.friendRequests.some((r) => r.from === from && r.to === to && r.status === "pending"))
      return { ok: false, error: "request already pending" }
    const id = await this.alloc("friendRequestCounter")
    this.friendRequests.push({ id, from, to, at: Date.now(), status: "pending" })
    this.friendRequests = this.friendRequests.slice(-200)
    await this.saveFriends()
    return { ok: true, id }
  }

  async respondFriendRequest(uid: string, id: number, accept: boolean) {
    await this.load()
    const request = this.friendRequests.find((r) => r.id === id && r.to === uid && r.status === "pending")
    if (!request) return { ok: false, error: "request not found" }
    request.status = accept ? "accepted" : "declined"
    if (accept) {
      const a = new Set(this.friends.get(request.from) || [])
      const b = new Set(this.friends.get(request.to) || [])
      a.add(request.to)
      b.add(request.from)
      this.friends.set(request.from, [...a])
      this.friends.set(request.to, [...b])
    }
    await this.saveFriends()
    return { ok: true }
  }

  async claimWelcome(uid: string): Promise<{ ok: boolean }> {
    await this.load()
    const st = this.mail.get(uid) || { welcome: false, seen: -1 }
    st.welcome = true
    this.mail.set(uid, st)
    await this.ctx.storage.put("mail", [...this.mail.entries()])
    return { ok: true }
  }

  async inbox(uid: string): Promise<{ welcome: boolean; letters: Note[]; newCount: number; notes: number }> {
    await this.load()
    const st = this.mail.get(uid) || { welcome: false, seen: -1 }
    const letters: Note[] = []
    if (st.welcome) letters.push({ id: 0, type: "welcome", title: WELCOME_TITLE, body: WELCOME_BODY, at: 0 })
    letters.push(...this.notes)
    const newCount = letters.filter((l) => l.id > st.seen).length
    return { welcome: st.welcome, letters, newCount, notes: this.notes.length }
  }

  async markSeen(uid: string): Promise<{ ok: boolean }> {
    await this.load()
    const st = this.mail.get(uid) || { welcome: false, seen: -1 }
    const top = this.notes.length ? this.notes[this.notes.length - 1].id : 0
    st.seen = Math.max(st.seen, top)
    this.mail.set(uid, st)
    await this.ctx.storage.put("mail", [...this.mail.entries()])
    return { ok: true }
  }

  async addNote(title: string, body: string): Promise<Note> {
    await this.load()
    const note: Note = { id: await this.alloc("noteCounter"), type: "patchnotes", title, body, at: Date.now() }
    this.notes.push(note)
    await this.ctx.storage.put("notes", this.notes)
    await this.logActivity("note", "Broadcast: " + (title || "PATCH"))
    return note
  }

  async allNotes(): Promise<Note[]> {
    await this.load()
    return this.notes.slice()
  }

  async addBug(uid: string, name: string, code: string, text: string): Promise<{ ok: boolean }> {
    await this.load()
    const bug: BugReport = {
      id: await this.alloc("bugCounter"),
      uid,
      name,
      code,
      text: text.slice(0, 2000),
      at: Date.now(),
      resolved: false,
    }
    this.bugs.push(bug)
    await this.ctx.storage.put("bugs", this.bugs)
    await this.logActivity("bug", (name || uid) + " reported a bug")
    return { ok: true }
  }

  async listBugs(): Promise<BugReport[]> {
    await this.load()
    return this.bugs.slice().reverse()
  }

  async resolveBug(id: number): Promise<{ ok: boolean }> {
    await this.load()
    this.bugs = this.bugs.map((b) => (b.id === id ? { ...b, resolved: true } : b))
    await this.ctx.storage.put("bugs", this.bugs)
    return { ok: true }
  }

  async sendChallenge(
    from: string,
    fromName: string,
    fromCode: string,
    to: string,
    toName: string,
    type: "lobby" | "duel",
  ): Promise<{ ok: boolean; id: number; matchId: string; error?: string }> {
    await this.load()
    const sender = this.players.get(from)
    const recipient = this.players.get(to)
    if (!sender || !recipient || sender.code !== fromCode || from === to)
      return { ok: false, id: 0, matchId: "", error: "invalid participants" }
    if (!(this.friends.get(from) || []).includes(to)) return { ok: false, id: 0, matchId: "", error: "friends only" }
    const at = Date.now()
    const old = this.challenges.filter(
      (c) =>
        c.from === from &&
        c.to === to &&
        c.type === type &&
        (c.status === "pending" || (c.status === "accepted" && type === "duel")),
    )
    for (const c of old) c.status = "declined"
    const id = await this.alloc("chalCounter")
    const matchId = crypto.randomUUID()
    this.challenges.push({ id, type, from, fromName: sender.name, fromCode: sender.code, to, toName: recipient.name, at, status: "pending", matchId })
    this.challenges = this.challenges.slice(-60)
    await this.ctx.storage.put("challenges", this.challenges)
    await this.logActivity(
      "challenge",
      sender.name + " challenged " + recipient.name + " to " + (type === "duel" ? "1V1" : "LOBBY"),
    )
    return { ok: true, id, matchId }
  }

  async listChallenges(uid: string): Promise<Challenge[]> {
    await this.load()
    return this.challenges
      .filter((c) => c.from === uid || c.to === uid)
      .slice()
      .reverse()
  }

  async respondChallenge(uid: string, id: number, accept: boolean): Promise<{ ok: boolean; matchId?: string }> {
    await this.load()
    const c = this.challenges.find((c) => c.id === id && c.to === uid && c.status === "pending")
    if (!c) return { ok: false }
    if (accept) {
      c.status = "accepted"
      await this.logActivity(
        "accept",
        c.fromName + " ↔ " + (c.toName || "pal") + " " + (c.type === "duel" ? "1V1" : "LOBBY") + " accepted",
      )
    } else {
      c.status = c.type === "lobby" ? "dismissed" : "declined"
      await this.logActivity("decline", (c.toName || "pal") + " declined " + c.fromName + "'s invite")
    }
    await this.ctx.storage.put("challenges", this.challenges)
    return { ok: true, matchId: c.matchId }
  }

  async feed(): Promise<Activity[]> {
    await this.load()
    return this.activity.slice().reverse()
  }

  async live() {
    await this.load()
    const now = Date.now()
    return {
      count: this.onlineCount(now),
      registered: this.codes.size,
      players: [...this.players.entries()].map(([uid, p]) => ({
        uid,
        name: p.name,
        code: p.code,
        lastSeen: p.lastSeen,
      })),
      history: this.history,
    }
  }

  async alarm() {
    await this.load()
    const n = this.onlineCount(Date.now())
    this.history.push({ t: Date.now(), n })
    if (this.history.length > MAX_SAMPLES) this.history = this.history.slice(-MAX_SAMPLES)
    await Promise.all([
      this.ctx.storage.put("players", [...this.players.entries()]),
      this.ctx.storage.put("history", this.history),
    ])
    await this.schedule()
  }
}

