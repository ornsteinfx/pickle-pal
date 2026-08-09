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
  "st-coins",
  "st-trophies",
  "st-wins",
  "st-losses",
  "st-points",
  "ow-coins",
  "ow-trophies",
  "ow-wins",
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
global.performance = { now: () => Date.now() }
global.requestAnimationFrame = () => 1
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
