const fs = require("fs")
const html = fs.readFileSync("index.html", "utf8")
let script = html.match(/<script>([\s\S]*)<\/script>/)[1]

function makeEl(id) {
  return {
    id,
    children: [],
    style: {},
    dataset: {},
    classList: {
      _s: new Set(),
      add(c) {
        this._s.add(c)
      },
      remove(c) {
        this._s.delete(c)
      },
      toggle(c, f) {
        if (f === undefined) {
          if (this._s.has(c)) this._s.delete(c)
          else this._s.add(c)
        } else {
          if (f) this._s.add(c)
          else this._s.delete(c)
        }
      },
      contains(c) {
        return this._s.has(c)
      },
    },
    innerHTML: "",
    textContent: "",
    value: "",
    placeholder: "",
    disabled: false,
    onclick: null,
    remove() {},
    appendChild(c) {
      this.children.push(c)
      return c
    },
    addEventListener() {},
    getContext() {
      return ctxStub()
    },
    setAttribute() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 560, height: 460 }
    },
  }
}
function ctxStub() {
  return new Proxy(
    {},
    {
      get(t, k) {
        if (k === "canvas") return { width: 560, height: 460 }
        if (k === "measureText") return () => ({ width: 10 })
        return typeof k === "string" ? function () {} : undefined
      },
      set() {
        return true
      },
    },
  )
}
const elements = {}
const ids = [
  "sound-btn",
  "tt-coins",
  "tt-trophies",
  "tt-wins",
  "tt-losses",
  "tt-online",
  "pf-code",
  "pf-add",
  "pf-msg",
  "pf-count",
  "pf-friends",
  "st-coins",
  "st-trophies",
  "st-wins",
  "st-losses",
  "st-points",
  "st-rank",
  "trophy-case",
  "daily-btn",
  "daily-status",
  "ow-rank",
  "ow-stage",
  "ow-canvas",
  "ow-hint",
  "ow-hud",
  "ow-dialog",
  "ow-dlog-name",
  "ow-dlog-text",
  "ow-arrow",
  "door-modal",
  "dm-title",
  "dm-sub",
  "dm-yes",
  "dm-alt",
  "dm-no",
  "season-modal",
  "season-grid",
  "ow-preview",
  "flash",
  "unit-list",
  "mastery-summary",
  "lesson-unit-title",
  "lesson-count",
  "lesson-fact",
  "lesson-body",
  "lesson-prog",
  "lesson-next",
  "lesson-canvas",
  "quiz-unit-title",
  "quiz-count",
  "quiz-prog",
  "quiz-q",
  "quiz-opts",
  "quiz-fb",
  "quiz-next",
  "quiz-card",
  "hero-canvas",
  "court-preview",
  "name-input",
  "cat-btns",
  "swatch-grid",
  "shop-coins",
  "shop-list",
  "game-bar",
  "game-canvas",
  "game-opp",
  "game-note",
  "game-q",
  "game-opts",
  "game-fb",
  "game-hint",
  "sb-you",
  "sb-cpu",
  "sb-you-lbl",
  "sb-cpu-lbl",
  "hp-you",
  "hp-cpu",
  "vs-splash",
  "vs-you",
  "vs-cpu",
  "result-title",
  "result-coins",
  "res-you",
  "res-cpu",
  "res-cpu-lbl",
  "result-msg",
  "title-canvas",
  "s-title",
  "s-overworld",
  "s-settings",
  "s-mastery",
  "s-lesson",
  "s-quiz",
  "s-custom",
  "s-game",
  "s-shop",
  "s-result",
  "s-rally",
  "rally-canvas",
  "rally-opp",
  "rally-msg",
  "rally-hint",
  "rb-you",
  "rb-cpu",
  "rb-you-lbl",
  "rb-cpu-lbl",
  "hp-r1",
  "hp-r2",
  "vsub",
  "wrap",
  "ow-social",
  "badge-mail",
  "badge-chal",
  "s-inbox",
  "mail-list",
  "s-friends",
  "fr-code",
  "fr-add",
  "fr-msg",
  "fr-count",
  "fr-list",
  "fr-invites",
  "s-pvp",
  "pvp-canvas",
  "pvp-status",
  "pvp-you",
  "pvp-opp",
  "pvp-you-lbl",
  "pvp-opp-lbl",
  "pvp-msg",
  "pvp-hint",
  "pvp-over",
  "pvp-over-title",
  "pvp-over-you",
  "pvp-over-opp",
  "pvp-over-opp-lbl",
  "pvp-over-msg",
  "pvp-over-coins",
  "letter-modal",
  "letter-title",
  "letter-body",
  "bug-modal",
  "bug-text",
  "invite-modal",
  "invite-body",
  "s-lobby",
  "lobby-canvas",
  "lobby-status",
  "lobby-hint",
  "lobby-pals",
]
for (const id of ids) elements[id] = makeEl(id)
const store = {}
global.localStorage = {
  getItem(k) {
    return store[k] ?? null
  },
  setItem(k, v) {
    store[k] = v
  },
  removeItem(k) {
    delete store[k]
  },
}
global.window = {}
global.fetch = () => new Promise(() => {})
global.performance = { now: () => Date.now() }
global.requestAnimationFrame = () => 1
global.cancelAnimationFrame = () => {}
global.confirm = () => true
global.structuredClone = (v) => JSON.parse(JSON.stringify(v))
global.AudioContext = function () {}
global.webkitAudioContext = global.AudioContext
global.document = {
  getElementById: (id) => elements[id] || makeEl(id),
  querySelectorAll: () => Object.values(elements),
  addEventListener() {},
  body: makeEl("body"),
  createElement: (t) => makeEl("el"),
}

const test = `
try {
  const wait = (ms) => performance.now() + ms;

  titleFrame(0);

  show('s-overworld');
  owFrame(0);
  owFrame(500);

  openDialog(NPCS[1]);
  let guard = 0;
  while (OW.dialog && guard++ < 12) advanceDialog();
  if (OW.dialog) throw new Error('dialog not hidden');

  OW.hero.tx = 13; OW.hero.ty = 19; OW.hero.px = 13*OW.t; OW.hero.py = 19*OW.t;
  OW.keys['arrowright'] = true;
  for (let i=0;i<12;i++) updateHero(0);
  OW.keys['arrowright'] = false;
  if (OW.hero.tx <= 13) throw new Error('hero did not move');

  OW.hero.tx = 18; OW.hero.ty = 15; OW.hero.px = 18*OW.t; OW.hero.py = 15*OW.t;
  checkDoor();
  if (OW.pending) throw new Error('checkDoor set pending on non-door');
  OW.entering = false;

  OW.hero.tx = 7; OW.hero.ty = 21; OW.hero.px = 7*OW.t; OW.hero.py = 21*OW.t;
  OW.hero.prev = { x: 7, y: 20 };
  checkDoor();
  if (!OW.pending) throw new Error('checkDoor no pending on door');
  if (!$('door-modal').style.display === 'flex') throw new Error('door modal not shown');
  if ($("dm-alt").style.display === 'block') throw new Error('building modal should hide PLAY');
  doorNo();
  if (OW.pending) throw new Error('doorNo left pending');
  if (OW.hero.tx !== 7 || OW.hero.ty !== 20) throw new Error('doorNo did not return hero');

  OW.hero.tx = 7; OW.hero.ty = 21; OW.hero.px = 7*OW.t; OW.hero.py = 21*OW.t;
  OW.hero.prev = { x: 7, y: 20 };
  checkDoor();
  doorYes();
  if (OW.pending) throw new Error('doorYes left pending');
  if (!OW.entering) throw new Error('doorYes did not enter');
  OW.entering = false;

  openCourtPrompt();
  if (!OW.playPending) throw new Error('no play pending');
  if ($("dm-alt").style.display !== 'block') throw new Error('court modal missing PLAY');
  doorNo();
  if (OW.playPending) throw new Error('doorNo left play pending');
  openCourtPrompt();
  if (!OW.playPending) throw new Error('no play pending 2');
  doorYes();
  if (OW.playPending) throw new Error('doorYes left play pending');
  $("vs-splash").style.display = "none";
  openCourtPrompt();
  if (!OW.playPending) throw new Error('no play pending 3');
  doorAlt();
  if (OW.playPending) throw new Error('doorAlt left play pending');
  $("vs-splash").style.display = "none";

  startRally();
  rallyServe();
  if (R.phase !== 'serve') throw new Error('rally not in serve');
  R.charge = R_SWEET;
  R.aim = { x: 0.3, y: 0.25 };
  rallyPlayerHit();
  if (R.phase !== 'flight') throw new Error('serve did not launch');
  R.flight.t0 = performance.now() - R.flight.dur*1000 - 50;
  rallyFrame(performance.now());
  if (R.phase !== 'wait') throw new Error('ball did not land');
  if (R.returner !== 'cpu') throw new Error('cpu should return');
  R.err = 0;
  R.players.c1.x = R.ball.x; R.players.c1.y = R.ball.y;
  R.cpuWindup = performance.now() - 400;
  rallyWaitUpdate(performance.now(), 0.016);
  if (R.phase !== 'flight') throw new Error('cpu did not return');
  R.flight.t0 = performance.now() - R.flight.dur*1000 - 50;
  rallyFrame(performance.now());
  if (R.phase !== 'wait') throw new Error('ball 2 did not land');
  R.players.you.x = R.ball.x; R.players.you.y = R.ball.y;
  R.charge = R_SWEET;
  rallyPlayerHit();
  if (R.phase !== 'flight') throw new Error('human did not hit');

  const rCoins = SAVE.coins;
  R.sc = [10, 9];
  R.phase = 'wait';
  rallyPoint(0, 'TEST');
  if (SAVE.coins !== rCoins + 25) throw new Error('rally win coins not awarded');
  if (!R.burst.length) throw new Error('no burst particles');

  ambUpdate(AMB_A, wait(2000));
  ambUpdate(AMB_B, wait(2000));
  ambReset(AMB_A);
  ambReset(AMB_B);

  const AMB_T = OW.t;
  const onCourt = (r, c) =>
    r.x === c[0] * AMB_T && r.y === c[1] * AMB_T && r.w === (c[2] - c[0] + 1) * AMB_T && r.h === (c[3] - c[1] + 1) * AMB_T;
  if (!onCourt(AMB_A.rect, [4, 3, 10, 18])) throw new Error('AMB_A not aligned with challenge court');
  if (!onCourt(AMB_B.rect, [15, 3, 21, 18])) throw new Error('AMB_B not aligned with doubles court');

  show('s-mastery');
  renderUnits();
  openUnit(0);
  for (let i=0;i<4;i++) lessonNext();
  startQuiz();
  for (let i=0;i<6;i++){ renderQuiz(); quizAnswer(0); if (i<5) quizNext(); }
  quizNext();
  if (!CUR.done) throw new Error('finishQuiz did not set done');
  $("quiz-next").onclick();
  if (CUR.done) throw new Error('quiz click exit did not clear done');
  if (!$("s-mastery").classList.contains("on")) throw new Error('quiz click exit did not show mastery');
  startQuiz();
  for (let i=0;i<6;i++){ renderQuiz(); quizAnswer(0); if (i<5) quizNext(); }
  quizNext();
  if (!CUR.done) throw new Error('finishQuiz 2 did not set done');
  quizNext();
  if (CUR.done) throw new Error('enter-path did not exit quiz');
  if (!$("s-mastery").classList.contains("on")) throw new Error('enter exit did not show mastery');

  show('s-custom');
  renderCustom();
  buildCatButtons();
  buildSwatches();
  randomCustom();
  drawCustomPreviews();
  customFrame(0);

  SAVE.coins = 100;
  renderShop();
  buyPaddle("#e84848", 30, "FIRE DRAGON");
  if (!SAVE.owned.includes("#e84848")) throw new Error('paddle not owned after buy');
  if (SAVE.coins !== 70) throw new Error('coins not deducted');
  equipPaddle("#e84848");
  if (SAVE.custom.paddle !== "#e84848") throw new Error('paddle not equipped');
  renderShop();

  startGame();
  gameFrame(wait(2000));
  if (G.phase !== 'splash') throw new Error('game did not stay in splash');
  setupScenario();
  const t0 = G.t0;
  gameFrame(wait(2000));
  if ($("game-q").textContent.length === 0) throw new Error('challenge question not shown');
  const court = courtRect(560,460);
  G.lastCourt = court;
  gameAnswer(G.scenario.c);
  afterFeedback();

  G.tpl = shuffle(TEMPLATES.filter(t=>t.type==='zone'));
  setupScenario();
  gameFrame(wait(2000));
  G.lastCourt = court;
  G.click = {
    x: court.x + ((G.scenario.zone.x0+G.scenario.zone.x1)/2)*court.w,
    y: court.y + ((G.scenario.zone.y0+G.scenario.zone.y1)/2)*court.h,
  };
  gameAnswer(1);
  afterFeedback();

  const coinsBefore = SAVE.coins;
  endGame(true);
  if (SAVE.coins !== coinsBefore + 25) throw new Error('win coins not awarded');
  if (!$("result-coins").textContent === "+25 COINS") throw new Error('result coins text wrong');

  startGame();
  setupScenario();
  gameFrame(wait(2000));
  gameAnswer(G.scenario.c === 0 ? 1 : 0);
  afterFeedback();
  const coinsBefore2 = SAVE.coins;
  endGame(false);
  if (SAVE.coins !== coinsBefore2 + 10) throw new Error('lose coins not awarded');

  const origSeason = SEASON.id;
  const altSeason = Object.keys(SEASONS).find((k) => k !== origSeason);
  setSeason(altSeason);
  if (SEASON.id !== altSeason) throw new Error('setSeason did not switch');
  if (SAVE.season !== altSeason) throw new Error('setSeason did not persist');
  if ($("season-modal").style.display !== 'none') throw new Error('setSeason did not close modal');
  setSeason(origSeason);
  if (SAVE.season !== origSeason) throw new Error('setSeason restore failed');

  // ---- music engine: all seasons tick without crashing ----
  const allSeasons = Object.keys(SEASONS);
  for (const sid of allSeasons) {
    Object.assign(SEASON, SEASONS[sid]);
    MUS.step = 0;
    for (let i = 0; i < 18; i++) musicTick();
  }
  Object.assign(SEASON, SEASONS[origSeason]);

  // ---- winter decor ----
  setSeason('winter');
  if (!OW.lights || !OW.lights.length) throw new Error('no winter lights');
  const wctx = document.createElement('canvas').getContext('2d');
  for (const s of [2, 3, 6, 9]) seasonTile(wctx, 0, 0, 32, s, SEASON);
  setSeason(origSeason === 'winter' ? 'summer' : origSeason);
  if (OW.lights.length) throw new Error('lights persist after season switch');

  // ---- rank ----
  SAVE.stats.wins = 5;
  if (rankInfo().name !== 'SLICKER') throw new Error('rank 5 not SLICKER');
  SAVE.stats.wins = 30;
  if (rankInfo().name !== 'ACE') throw new Error('rank 30 not ACE');
  SAVE.stats.wins = 50;
  if (rankInfo().name !== 'LEGEND') throw new Error('rank 50 not LEGEND');
  SAVE.stats.wins = 0;
  if (rankInfo().name !== 'ROOKIE') throw new Error('rank reset failed');
  const rkCoins = SAVE.coins;
  SAVE.stats.wins = 5;
  endGame(true);
  if (SAVE.coins !== rkCoins + Math.round(25 * 1.25)) throw new Error('rank multiplier not applied');
  SAVE.stats.wins = 0;

  // ---- quests ----
  SAVE.quests = {};
  const qk = SEASON.id;
  const qQ = QUEST_LIST[qk];
  const qq = questState(qk);
  qq.win = qQ.win;
  qq.dbl = qQ.dbl;
  qq.qz = qQ.qz;
  const qc = SAVE.coins;
  checkQuests();
  if (!qq.star) throw new Error('checkQuests did not award star');
  if (SAVE.coins !== qc + 150) throw new Error('star coins wrong');
  checkQuests();
  if (SAVE.coins !== qc + 150) throw new Error('star awarded twice');
  renderTrophyCase();
  if (!$('trophy-case').children.length) throw new Error('trophy case empty');

  // ---- boss ----
  startBoss(qk);
  if (!R.boss) throw new Error('startBoss did not set boss');
  if (R.target !== 15) throw new Error('boss target wrong');
  if (R.cpuSpd < 0.5) throw new Error('boss not harder');

  // ---- daily ----
  SAVE.daily = { n: 0, last: "" };
  awardDaily();
  if (SAVE.daily.n !== 1) throw new Error('daily streak not 1');
  awardDaily();
  if (SAVE.daily.n !== 1) throw new Error('daily double count');
  if (SAVE.daily.last !== todayKey()) throw new Error('daily last not today');
  renderDaily();
  if (!$('daily-btn').disabled) throw new Error('daily btn not disabled after clear');

  // ---- settings render ----
  show('s-settings');
  renderSettings();
  if (!$('st-rank').textContent) throw new Error('settings rank missing');

  // ---- online: inbox / friends ----
  openInbox();
  if (!$('s-inbox').classList.contains('on')) throw new Error('openInbox did not show inbox');
  openFriends();
  if (!$('s-friends').classList.contains('on')) throw new Error('openFriends did not show friends');
  if (!$('fr-code').textContent) throw new Error('friends screen missing code');
  if (normCode('#000-Pal 01L') !== '00001L') throw new Error('normCode failed on formatted code');
  if (normCode('#000-Pal 01L').length !== 6) throw new Error('normCode length');
  if (normCode('00001L') !== '00001L') throw new Error('normCode failed on raw code');
  if (normCode('#abc-pal xyz') !== 'ABCXYZ') throw new Error('normCode lowercase formatted');
  MAIL = { letters: [{ id: 0, type: 'welcome', title: 'WELCOME', body: 'HELLO' }], newCount: 0 };
  openLetter(0);
  if ($('letter-modal').style.display !== 'flex') throw new Error('openLetter did not show modal');
  closeModal('letter-modal');
  if ($('letter-modal').style.display !== 'none') throw new Error('closeModal did not hide modal');
  openBugModal();
  if ($('bug-modal').style.display !== 'flex') throw new Error('openBugModal did not show modal');
  closeModal('bug-modal');
  badgeMail(2);
  if (!$('badge-mail').classList.contains('show')) throw new Error('badge-mail not shown');
  badgeMail(0);
  if ($('badge-mail').classList.contains('show')) throw new Error('badge-mail not hidden');
  badgeChal(1);
  if (!$('badge-chal').classList.contains('show')) throw new Error('badge-chal not shown');
  badgeChal(0);
  renderMail();
  if (!$('mail-list').innerHTML.includes('WELCOME')) throw new Error('renderMail missing letter');

  // ---- online: 1v1 match client ----
  openPvp('test-id', 'GECKO');
  if (!$('s-pvp').classList.contains('on')) throw new Error('openPvp did not show s-pvp');
  if (PVP.oppName !== 'GECKO') throw new Error('pvp oppName not set');
  pvpMsg({ t: 'hello', side: 0, opp: 'WAITING FOR OPPONENT...' });
  if (PVP.side !== 0) throw new Error('hello side not set');
  pvpMsg({ t: 'waiting' });
  pvpMsg({ t: 'peer', name: 'GECKO' });
  pvpMsg({ t: 'go', serve: 0 });
  pvpMsg({ t: 'serve', serve: 0, flight: { t0: Date.now(), dur: 1, arc: 0.1, x0: 0.5, y0: 0.88, tx: 0.5, ty: 0.1, who: 0 } });
  if (PVP.phase !== 'flight') throw new Error('serve did not set flight');
  pvpMsg({ t: 'wait', x: 0.5, y: 0.1, returner: 1, deadline: Date.now() + 4000 });
  if (PVP.phase !== 'wait' || PVP.wait.returner !== 1) throw new Error('wait not set');
  pvpMsg({ t: 'opp', x: 0.3, y: 0.2 });
  if (PVP.opp.x !== 0.3) throw new Error('opp pos not set');
  pvpMsg({ t: 'point', winner: 0, reason: 'ACE', sc: [1, 0] });
  if (PVP.sc[0] !== 1) throw new Error('point sc not updated');
  const pvpCoins = SAVE.coins;
  pvpMsg({ t: 'over', winner: 1, reason: 'VICTORY', sc: [1, 2] });
  if (!PVP.over) throw new Error('over not set');
  if (SAVE.coins !== pvpCoins + 10) throw new Error('pvp loss coins not awarded');
  if ($('pvp-over').style.display !== 'flex') throw new Error('pvp-over not shown');
  closePvp();
  if (PVP) throw new Error('closePvp did not clear pvp state');
  show('s-overworld');

  // ---- online: academy lobby ----
  openLobby('lobby-test-id', 'GECKO');
  if (!$('s-lobby').classList.contains('on')) throw new Error('openLobby did not show s-lobby');
  if (LOBBY.oppName !== 'GECKO') throw new Error('lobby oppName not set');
  lobbyMsg({ t: 'hello', you: { x: 0.5, y: 0.5 }, peers: [{ uid: 'u1', name: 'GECKO', x: 0.3, y: 0.4 }] });
  if (LOBBY.peers.length !== 1) throw new Error('lobby hello peers not set');
  if ($('lobby-status').textContent.indexOf('GECKO') < 0) throw new Error('lobby status missing peer');
  lobbyMsg({ t: 'peer', uid: 'u2', name: 'NEWPAL', x: 0.2, y: 0.8 });
  if (LOBBY.peers.length !== 2) throw new Error('lobby peer not added');
  lobbyMsg({ t: 'pos', uid: 'u2', x: 0.7, y: 0.6 });
  const p2 = LOBBY.peers.find((p) => p.uid === 'u2');
  if (p2.x !== 0.7) throw new Error('lobby pos not applied');
  lobbyMsg({ t: 'left', uid: 'u1', name: 'GECKO' });
  if (LOBBY.peers.length !== 1) throw new Error('lobby left not removed');
  lobbyMove(0.016);
  if (LOBBY.you.x !== 0.5) throw new Error('lobbyMove moved without keys');
  closeLobby();
  if (LOBBY) throw new Error('closeLobby did not clear lobby state');
  show('s-overworld');

  resetSave();
  console.log('ALL FLOWS OK');
} catch (e) {
  console.error('FLOW ERROR:', e.message);
  process.exit(1);
}
`

try {
  new Function(script + test)()
} catch (e) {
  console.error("RUNTIME ERROR:", e.message)
  process.exit(1)
}
