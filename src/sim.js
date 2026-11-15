'use strict';
// Spelregels: gebouwen, banden, machines, vijanden, golven. Geen tekenwerk hier.
let G = null;

class Heap {
  constructor() { this.I = []; this.P = []; }
  get size() { return this.I.length; }
  push(i, p) { const I = this.I, P = this.P; let k = I.length; I.push(i); P.push(p); while (k > 0) { const q = (k - 1) >> 1; if (P[q] <= p) break; I[k] = I[q]; P[k] = P[q]; k = q; } I[k] = i; P[k] = p; }
  pop() {
    const I = this.I, P = this.P, ri = I[0], rp = P[0], li = I.pop(), lp = P.pop(), n = I.length;
    if (n) { let k = 0; for (;;) { let c = 2 * k + 1; if (c >= n) break; if (c + 1 < n && P[c + 1] < P[c]) c++; if (P[c] >= lp) break; I[k] = I[c]; P[k] = P[c]; k = c; } I[k] = li; P[k] = lp; }
    this.ri = ri; return rp;
  }
}

function baseG(M, seed) {
  G = {
    M, seed, stock: { ...START_STOCK }, bmap: new Map(), grid: new Int32Array(M.W * M.H), nextId: 1, belts: [],
    enemies: [], fx: [], tracers: [], time: 0, wave: 0, waveT: WAVE.first, spawnQ: [], poll: 0,
    hand: [], handCur: null, flow: new Float32Array(M.W * M.H), flowDirty: true, flowT: 0,
    over: false, won: false, kills: 0, tool: null, rot: 0, sel: null, mine: null, speed: 1, goals: {},
    // uitbreidingen: stroom, onderzoek, statistiek, mist, blauwdruk
    pw: { nets: [], edges: [], nodes: [], cap: 0, dem: 0 }, powDirty: true,
    res: null, rp: {}, tech: {}, mod: { belt: 1, drill: 1, dmg: 1 },
    st: { cur: { p: {}, c: {} }, hist: [], t: 0 }, lorries: [], drones: [], wrecks: [], fnets: [], fluDirty: true, sig: [], sigT: 0, alt: false, clip: null, stamp: null, bpSel: null, saveT: 60,
  };
  initTerrain(M); initPoll(M); initFog(M);
}
function newGame(seed) {
  seed = seed || ((Math.random() * 1e9) | 0);
  const M = genMap(seed);
  baseG(M, seed);
  G.core = place('core', (M.cx | 0) - 1, (M.cy | 0) - 1, 0, true);
  newPlayer(); genWrecks();
  reveal(M.cx, M.cy, 18);
  computeFlow(); G.flowDirty = false;
}

// ---------- voorraad ----------
function canAfford(c) { for (const k in c) if ((G.stock[k] || 0) < c[k]) return false; return true; }
function pay(c) { for (const k in c) G.stock[k] -= c[k]; }
function addItem(k, n) { if (k && n > 0) G.stock[k] = (G.stock[k] || 0) + n; }

// ---------- bouwen ----------
function bAt(x, y) { if (x < 0 || y < 0 || x >= G.M.W || y >= G.M.H) return null; const id = G.grid[y * G.M.W + x]; return id ? G.bmap.get(id) : null; }
function inRange(x, y) {
  for (const b of G.bmap.values()) { const r = BUILD_RANGE[b.type]; if (r && Math.hypot(x - (b.x + b.w / 2), y - (b.y + b.h / 2)) <= r) return true; }
  return nearPlayer(x, y, FIG_BUILD);
}
function canPlace(type, x, y) {
  const d = BUILD[type], M = G.M;
  if (d.tech && !G.tech[d.tech]) return `Eerst onderzoeken: ${TECH[d.tech].n}`;
  if (d.lorry) return canPlaceLorry(x, y);
  if (x < 0 || y < 0 || x + d.w > M.W || y + d.h > M.H) return 'Buiten de kaart';
  let ore = 0, oil = 0;
  for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
    const k = (y + j) * M.W + x + i;
    if (G.grid[k]) return 'Hier staat al iets';
    if (M.ground[k] === 3 && !d.rock) return 'Niet op rots';
    if (d.rock && M.ground[k] !== 3) return 'Zet een steengroeve helemaal op rots';
    if (!G.seen[k]) return 'Onverkend gebied';
    if (M.ore[k] === OIL) oil++; else if (M.ore[k] && M.amt[k] > 0) ore++;
  }
  if ((type === 'drill' || type === 'drill3') && !ore) return 'Zet een boor op erts';
  if (d.oil && !oil) return 'Zet een oliepomp op een oliebron (zwarte plas)';
  const cx = x + d.w / 2, cy = y + d.h / 2;
  if (!inRange(cx, cy)) return 'Buiten bouwbereik (loop erheen of bouw een voorpost)';
  for (const n of M.nests) if (!n.dead && Math.hypot(cx - n.x, cy - n.y) < 5) return 'Te dicht bij een nest';
  if (!canAfford(d.cost)) return 'Niet genoeg grondstoffen';
  return '';
}
function place(type, x, y, rot, free) {
  if (BUILD[type].lorry) return placeLorry(x, y, free);
  if (!free) { const r = canPlace(type, x, y); if (r) return r; pay(BUILD[type].cost); for (const k in BUILD[type].cost) stat('c', k, BUILD[type].cost[k]); }
  const d = BUILD[type], b = { id: G.nextId++, type, x, y, w: d.w, h: d.h, rot: d.rot ? rot : 0, hp: d.hp, maxhp: d.hp, t: 0, alt: 0 };
  if (type === 'belt') b.items = [];
  else if (type === 'drill') { b.cond = null; b.hold = null; b.alt2 = 0; b.empty = false; b.spin = 0; }
  else if (type === 'furnace') { b.ore = null; b.oreN = 0; b.fuel = 0; b.burn = 0; b.cur = null; b.outType = null; b.outN = 0; b.smoke = 0; b.nofuel = false; }
  else if (type === 'assembler') { b.recipe = 'ammo'; b.inv = {}; b.outN = 0; b.spin = 0; b.idle = true; }
  else if (type === 'turret' || type === 'core') { b.mags = 0; b.shots = 0; b.ang = -Math.PI / 2; b.cd = 0; b.scan = 0; b.target = null; b.flash = 0; }
  else if (type === 'arm' || type === 'arm2') { b.hold = null; b.sw = 0; b.filter = null; b.cond = null; }
  else if (CHESTS.includes(type)) { b.inv = {}; b.n = 0; if (type === 'chestR') { b.req = null; b.inc = 0; } }
  else if (type === 'counter') { b.hold = null; b.cond = null; b.bk = [0, 0, 0, 0, 0, 0], b.bi = 0; b.last = null; }
  else if (type === 'station') { b.mode = 'rust'; }
  else if (type === 'dock') { b.free = DOCK.n; b.disp = 0; }
  else if (type === 'splitter') { b.hold = null; b.k = 0; b.filter = null; }
  else if (type === 'tunnel') { b.q = []; b.link = null; b.role = null; b.len = 0; }
  else if (type === 'boiler') { b.fuel = 0; b.en = 0; b.burning = false; b.gens = []; }
  else if (type === 'generator') { b.out = 0; b.spin = 0; b.ketels = []; }
  else if (type === 'lab') { b.inv = {}; b.spin = 0; }
  else if (type === 'flamer') { b.fuel = 0; b.burn = 0; b.ang = -Math.PI / 2; b.cd = 0; b.scan = 0; b.target = null; b.fire = 0; b.nofuel = false; }
  if (BUILD[type].pw || BUILD[type].sig) { b.net = -1; b.act = false; }
  prodInit(b);
  G.bmap.set(b.id, b);
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) G.grid[(y + j) * G.M.W + x + i] = b.id;
  if (type === 'belt') G.belts.push(b);
  if (G.goals && (type === 'drill' || type === 'turret' || type === 'outpost')) G.goals[type] = true;
  G.flowDirty = true; G.powDirty = true; G.fluDirty = true;
  if (type === 'tunnel') relinkTunnels();
  const vr = { core: 18, outpost: 14, turret: 9, flamer: 7 }[type]; if (vr) reveal(x + d.w / 2, y + d.h / 2, vr);
  return b;
}
function removeB(b, refund) {
  if (!G.bmap.has(b.id)) return;
  G.bmap.delete(b.id);
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) G.grid[(b.y + j) * G.M.W + b.x + i] = 0;
  if (b.type === 'belt') { const k = G.belts.indexOf(b); if (k >= 0) G.belts.splice(k, 1); }
  if (refund) {
    for (const k in BUILD[b.type].cost) addItem(k, BUILD[b.type].cost[k]);
    if (b.items) for (const it of b.items) addItem(it.t, 1);
    addItem(b.hold, 1);
    if (b.type === 'furnace') { addItem(b.ore, b.oreN); addItem('coal', b.fuel); addItem(b.outType, b.outN); }
    if (b.type === 'assembler') { for (const k in b.inv) addItem(k, b.inv[k]); addItem(RECIPES[b.recipe].out, b.outN); }
    if (b.type === 'turret') addItem('ammo', b.mags);
    if (CHESTS.includes(b.type) || b.type === 'lab') for (const k in b.inv) addItem(k, b.inv[k]);
    if (b.type === 'tunnel') for (const it of b.q) addItem(it.t, 1);
    if (b.type === 'boiler' || b.type === 'flamer') addItem('coal', b.fuel);
    prodRefund(b);
  }
  if (G.sel === b) G.sel = null;
  if (b.type === 'dock' || b.type === 'chestR' || b.type === 'chestP') dronesLost(b);
  G.flowDirty = true; G.powDirty = true; G.fluDirty = true;
  if (b.type === 'tunnel') relinkTunnels();
}
function destroyB(b) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  for (let i = 0; i < 10 + b.w * 8; i++) { const a = Math.random() * 6.283, s = Math.random() * 3; addP('debris', cx, cy, Math.cos(a) * s, Math.sin(a) * s, .6 + Math.random() * .5, .05 + Math.random() * .06, '#2b2925'); }
  for (let i = 0; i < 6; i++) addP('smoke', cx + (Math.random() - .5) * b.w, cy + (Math.random() - .5) * b.h, (Math.random() - .5) * .4, -.3, 1.6, .3);
  addP('flash', cx, cy, 0, 0, .25, b.w * .9);
  terrainDecal(cx, cy, 'scorch', b.w * .9); addWreck(b);
  sfx('boom', 1, cx, cy);
  removeB(b, false);
  if (b.type === 'core') { G.over = true; G.won = false; showOver(); }
  else toast(`${BUILD[b.type].n} vernietigd!`, 'bad');
}

// ---------- spullen doorgeven ----------
function frontTiles(b) {
  const r = b.rot, res = [];
  if (r === 0) for (let j = 0; j < b.h; j++) res.push([b.x + b.w, b.y + j]);
  else if (r === 2) for (let j = 0; j < b.h; j++) res.push([b.x - 1, b.y + j]);
  else if (r === 1) for (let i = 0; i < b.w; i++) res.push([b.x + i, b.y + b.h]);
  else for (let i = 0; i < b.w; i++) res.push([b.x + i, b.y - 1]);
  return res;
}
function emit(b, item) {
  const ft = frontTiles(b), n = ft.length;
  for (let k = 0; k < n; k++) {
    const [x, y] = ft[(b.alt + k) % n], t = bAt(x, y);
    if (!t || t === b) continue;
    if (t.type === 'belt') {
      if (t.rot === (b.rot + 2) % 4) continue;
      if (beltAccept(t)) { t.items.push({ t: item, p: 0, d: b.rot }); b.alt = (b.alt + k + 1) % n; return true; }
    } else if (accepts(t, item)) { insert(t, item); b.alt = (b.alt + k + 1) % n; return true; }
  }
  return false;
}
function accepts(b, it) {
  switch (b.type) {
    case 'core': return true;
    case 'furnace': if (it === 'coal') return b.fuel < 10; if (SMELT[it]) return (!b.ore || b.ore === it) && b.oreN < 10; return false;
    case 'assembler': { const need = RECIPES[b.recipe].in[it]; return !!need && (b.inv[it] || 0) < need * 4; }
    case 'turret': return it === 'ammo' && b.mags < 10;
    case 'chest': case 'chestP': case 'chestR': return b.n < CHEST_CAP;
    case 'splitter': return !b.hold;
    case 'counter': return !b.hold && condOK(b);
    case 'station': return !!b.lorry && b.lorry.n < LORRY.cap;
    case 'tunnel': { if (b.role !== 'in') return false; const q = b.q, l = q[q.length - 1]; return q.length < b.len * 2 + 2 && (!l || l.d <= b.len - .45); }
    case 'boiler': case 'flamer': return it === 'coal' && b.fuel < 10;
    case 'lab': return ITEMS[it].k === 'kit' && (b.inv[it] || 0) < 10;
    case 'press': case 'pcb': case 'chem': case 'refinery': return prodAccepts(b, it);
  }
  return false;
}
function insert(b, it) {
  switch (b.type) {
    case 'core': addItem(it, 1); break;
    case 'furnace': if (it === 'coal') b.fuel++; else { b.ore = it; b.oreN++; } break;
    case 'assembler': b.inv[it] = (b.inv[it] || 0) + 1; break;
    case 'turret': b.mags++; G.goals.feed = true; break;
    case 'chest': case 'chestP': case 'chestR': b.inv[it] = (b.inv[it] || 0) + 1; b.n++; break;
    case 'splitter': case 'counter': b.hold = it; break;
    case 'station': { const L = b.lorry; L.inv[it] = (L.inv[it] || 0) + 1; L.n++; L.idle = 0; break; }
    case 'tunnel': b.q.push({ t: it, d: b.len }); break;
    case 'boiler': case 'flamer': b.fuel++; break;
    case 'lab': b.inv[it] = (b.inv[it] || 0) + 1; break;
    case 'press': case 'pcb': case 'chem': case 'refinery': b.inv[it] = (b.inv[it] || 0) + 1; break;
  }
}
function beltSpeed() { return BELT_SPEED * G.mod.belt; }
// grijparm: algemeen geven/pakken
function canGive(t, it) { return !!t && (t.type === 'belt' ? beltAccept(t) : accepts(t, it)); }
function give(t, it, d) { if (t.type === 'belt') t.items.push({ t: it, p: 0, d }); else insert(t, it); }
function takeFrom(s, ok) {
  switch (s.type) {
    case 'belt': { for (let i = 0; i < s.items.length; i++) if (ok(s.items[i].t)) return s.items.splice(i, 1)[0].t; return null; }
    case 'chest': case 'chestP': case 'chestR': for (const k in s.inv) if (s.inv[k] > 0 && ok(k)) { s.n--; if (!--s.inv[k]) delete s.inv[k]; return k; } return null;
    case 'station': { const L = s.lorry; if (!L) return null; for (const k in L.inv) if (L.inv[k] > 0 && ok(k)) { L.n--; L.idle = 0; if (!--L.inv[k]) delete L.inv[k]; return k; } return null; }
    case 'press': case 'pcb': case 'chem': case 'refinery': { const o = PROD[s.recipe] && PROD[s.recipe].out; if (o && s.outN > 0 && ok(o)) { s.outN--; return o; } return null; }
    case 'drill': case 'drill3': case 'quarry': case 'recycler': case 'splitter': if (s.hold && ok(s.hold)) { const k = s.hold; s.hold = null; return k; } return null;
    case 'furnace': if (s.outN > 0 && ok(s.outType)) { s.outN--; return s.outType; } return null;
    case 'assembler': { const o = RECIPES[s.recipe].out; if (s.outN > 0 && ok(o)) { s.outN--; return o; } return null; }
    case 'core': for (const k of ITEM_ORDER) if ((G.stock[k] || 0) > 0 && ok(k)) { G.stock[k]--; return k; } return null;
  }
  return null;
}
function updArm(b, dt) {
  const L = b.type === 'arm2' ? 2 : 1, sp = dt / ARM_T * 2 * pwr(b) / (L === 2 ? 1.3 : 1);
  b.act = !!b.hold || b.sw > 0;
  if (b.hold) {
    if (b.sw < 1) { b.sw = Math.min(1, b.sw + sp); return; }
    const t = bAt(b.x + DX[b.rot] * L, b.y + DY[b.rot] * L);
    if (canGive(t, b.hold)) { give(t, b.hold, b.rot); b.hold = null; }
    return;
  }
  if (b.sw > 0) { b.sw = Math.max(0, b.sw - sp); return; }
  if (!condOK(b)) { b.off = true; return; } b.off = false;
  const s = bAt(b.x - DX[b.rot] * L, b.y - DY[b.rot] * L), t = bAt(b.x + DX[b.rot] * L, b.y + DY[b.rot] * L);
  if (!s || !t || s === t) return;
  if (s.type === 'core' && !b.filter && (t.type === 'belt' || CHESTS.includes(t.type))) return;   // kern niet leegtrekken zonder filter
  const it = takeFrom(s, k => (!b.filter || k === b.filter) && canGive(t, k));
  if (it) { b.hold = it; b.act = true; }
}
// verdeler: voor / links / rechts om de beurt; met filter: filter rechtdoor, rest opzij
function updSplitter(b) {
  if (!b.hold) return;
  const dirs = [b.rot, (b.rot + 3) % 4, (b.rot + 1) % 4], cand = b.filter ? (b.hold === b.filter ? [0] : [1, 2]) : [0, 1, 2];
  for (let k = 0; k < cand.length; k++) {
    const d = dirs[cand[(b.k + k) % cand.length]], t = bAt(b.x + DX[d], b.y + DY[d]);
    if (!t) continue;
    if (t.type === 'belt') { if (t.rot === (d + 2) % 4 || !beltAccept(t)) continue; t.items.push({ t: b.hold, p: 0, d }); }
    else if (accepts(t, b.hold)) insert(t, b.hold); else continue;
    b.hold = null; b.k = (b.k + k + 1) % cand.length; return;
  }
}
// tunnelband: ingang zoekt vooruit (max TUN_MAX) een uitgang in dezelfde richting
function relinkTunnels() {
  const ts = [...G.bmap.values()].filter(b => b.type === 'tunnel');
  for (const t of ts) { t.link = null; t.role = null; t.len = 0; }
  ts.sort((a, b) => (a.rot * 1e6 + a.x * DX[a.rot] + a.y * DY[a.rot]) - (b.rot * 1e6 + b.x * DX[b.rot] + b.y * DY[b.rot]));
  for (const t of ts) {
    if (t.role) continue;
    for (let k = 1; k <= TUN_MAX; k++) {
      const u = bAt(t.x + DX[t.rot] * k, t.y + DY[t.rot] * k);
      if (u && u.type === 'tunnel' && u.rot === t.rot) { if (!u.role) { t.role = 'in'; t.link = u; t.len = k; u.role = 'out'; u.link = t; } break; }
    }
  }
  for (const t of ts) if (t.role !== 'in' && t.q.length) { for (const it of t.q) addItem(it.t, 1); t.q = []; }
}
function updTunnel(b, dt) {
  if (b.role !== 'in' || !b.q.length) return;
  const step = dt * beltSpeed();
  for (let k = 0; k < b.q.length; k++) b.q[k].d = Math.max(k ? b.q[k - 1].d + .5 : 0, b.q[k].d - step);
  if (b.q[0].d > 0) return;
  const u = b.link, t = bAt(u.x + DX[u.rot], u.y + DY[u.rot]), it = b.q[0].t;
  if (!t) return;
  if (t.type === 'belt') { if (t.rot === (u.rot + 2) % 4 || !beltAccept(t)) return; t.items.push({ t: it, p: 0, d: u.rot }); }
  else if (accepts(t, it)) insert(t, it); else return;
  b.q.shift();
}
function beltAccept(t) { const a = t.items; return a.length === 0 || (a.length < 2 && a[a.length - 1].p >= .5); }

function updBelts(dt) {
  const step = dt * beltSpeed();
  for (const b of G.belts) {
    const a = b.items; if (!a.length) continue;
    for (let k = 0; k < a.length; k++) { const lim = k === 0 ? 1 : a[k - 1].p - .5; a[k].p = Math.max(a[k].p, Math.min(lim, a[k].p + step)); }
    if (a[0].p < 1) continue;
    const t = bAt(b.x + DX[b.rot], b.y + DY[b.rot]);
    if (!t) continue;
    if (t.type === 'belt') {
      if (t.rot !== (b.rot + 2) % 4 && beltAccept(t)) { const it = a.shift(); t.items.push({ t: it.t, p: 0, d: b.rot }); }
    } else if (accepts(t, a[0].t)) insert(t, a.shift().t);
  }
}

// ---------- machines ----------
function updDrill(b, dt) {
  b.act = false;
  if (b.hold) { if (emit(b, b.hold)) b.hold = null; else return; }
  b.off = !condOK(b);
  b.act = !b.empty && !b.off;
  if (b.empty || b.off) return;
  const pf = pwr(b) * G.mod.drill;
  b.spin += dt * 6 * pf;
  b.t += dt * pf; if (b.t < DRILL_T / (b.type === 'drill3' ? DRILL3_SP : 1)) return; b.t = 0;
  const M = G.M, nt = b.w * b.h; let found = -1;
  for (let k = 0; k < nt; k++) {
    const idx = (b.alt2 + k) % nt, m = (b.y + (idx / b.w | 0)) * M.W + b.x + idx % b.w;
    if (M.ore[m] && M.ore[m] !== OIL && M.amt[m] > 0) { found = m; b.alt2 = (idx + 1) % nt; break; }
  }
  if (found < 0) { b.empty = true; return; }
  const it = ORE_KEYS[M.ore[found]];
  if (--M.amt[found] === 0) { M.ore[found] = 0; oreChanged(found % M.W, (found / M.W) | 0); }
  addPoll(b.x, b.y, modPoll(b)); stat('p', it);
  b.hold = it; if (emit(b, it)) b.hold = null;
}
function updFurnace(b, dt) {
  if (b.outN > 0 && emit(b, b.outType)) b.outN--;
  if (b.cur) {
    b.t -= dt;
    if (b.t <= 0) { b.outType = b.cur; b.outN++; stat('p', b.cur); b.cur = null; G.goals.smelt = true; }
    return;
  }
  if (!b.ore || b.oreN < SMELT_IN[b.ore]) return;
  const prod = SMELT[b.ore];
  if (b.outN >= 10 || (b.outN > 0 && b.outType !== prod)) return;
  if (b.burn <= 0) { if (b.fuel <= 0) { b.nofuel = true; return; } b.fuel--; b.burn = FUEL_PER_COAL; stat('c', 'coal'); }
  b.nofuel = false; b.burn--;
  stat('c', b.ore, SMELT_IN[b.ore]);
  b.oreN -= SMELT_IN[b.ore]; if (b.oreN === 0) b.ore = null;
  b.cur = prod; b.t = SMELT_T; addPoll(b.x, b.y, 1.5);
}
function updAsm(b, dt) {
  const r = RECIPES[b.recipe];
  if (b.outN > 0 && emit(b, r.out)) b.outN--;
  b.act = b.t > 0;
  if (b.t > 0) { const pf = pwr(b); b.spin += dt * 4 * pf; b.t -= dt * pf; if (b.t <= 0) { b.outN += r.qty; stat('p', r.out, r.qty); if (r.out === 'ammo') G.goals.ammo = true; } return; }
  if (b.outN + r.qty > 10) { b.idle = true; return; }
  for (const k in r.in) if ((b.inv[k] || 0) < r.in[k]) { b.idle = true; return; }
  for (const k in r.in) { b.inv[k] -= r.in[k]; stat('c', k, r.in[k]); }
  b.t = r.time; b.idle = false; b.act = true; addPoll(b.x, b.y, .6 * modPoll(b));
}
function setRecipe(b, k) {
  if (b.recipe === k || !RECIPES[k]) return;
  for (const i in b.inv) addItem(i, b.inv[i]);
  addItem(RECIPES[b.recipe].out, b.outN);
  b.inv = {}; b.outN = 0; b.t = 0; b.recipe = k;
}
function fillFromStock(b) {
  const s = G.stock; let moved = 0;
  const take = (k, want) => { const n = Math.max(0, Math.min(want, s[k] || 0)); s[k] -= n; moved += n; return n; };
  if (b.type === 'furnace') {
    b.fuel += take('coal', 10 - b.fuel);
    const o = b.ore || ['ironOre', 'copperOre', 'stone', 'scrap'].find(k => (s[k] || 0) >= SMELT_IN[k]);
    if (o) { const n = take(o, 10 - b.oreN); if (n) { b.ore = o; b.oreN += n; } }
  } else if (b.type === 'assembler') {
    const r = RECIPES[b.recipe];
    for (const k in r.in) b.inv[k] = (b.inv[k] || 0) + take(k, r.in[k] * 4 - (b.inv[k] || 0));
  } else if (b.type === 'boiler' || b.type === 'flamer') b.fuel += take('coal', 10 - b.fuel);
  else if (b.type === 'lab') for (const k of KITS) b.inv[k] = (b.inv[k] || 0) + take(k, 10 - (b.inv[k] || 0));
  if (PROD_TYPES.includes(b.type)) moved += prodFill(b);
  if (!moved) toast('Niets in de voorraad om bij te vullen');
}
function loadAmmo(b) {
  const n = Math.min(5, G.stock.ammo || 0, 10 - b.mags);
  if (n <= 0) { toast('Geen munitie in de voorraad'); return; }
  G.stock.ammo -= n; b.mags += n;
}
function repairCost(b) { return Math.ceil((b.maxhp - b.hp) / 60); }
function repair(b) {
  const c = repairCost(b);
  if ((G.stock.ironPlate || 0) < c) { toast('Niet genoeg ijzerplaat'); return; }
  G.stock.ironPlate -= c; b.hp = b.maxhp;
}

// ---------- geschut ----------
function angDiff(a, b) { return ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; }
function turnTo(a, b, s) { const d = angDiff(a, b); return Math.abs(d) <= s ? b : a + Math.sign(d) * s; }
function findTarget(x, y, r, nests) {
  let best = null, bd = r * r;
  for (const e of G.enemies) { if (e.dead) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
  if (!best && nests) for (const n of G.M.nests) { if (n.dead) continue; const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = n; } }
  return best;
}
function gun(b, dt, S) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, isCore = b.type === 'core';
  b.cd -= dt; b.scan -= dt; b.flash = Math.max(0, b.flash - dt);
  const tg0 = b.target;
  if (b.scan <= 0 || !tg0 || tg0.dead || (tg0.x - cx) ** 2 + (tg0.y - cy) ** 2 > S.range * S.range) { b.scan = .25; b.target = findTarget(cx, cy, S.range, !isCore); }
  const tg = b.target; if (!tg) return;
  const want = Math.atan2(tg.y - cy, tg.x - cx);
  b.ang = turnTo(b.ang, want, dt * 7);
  if (b.cd > 0 || Math.abs(angDiff(b.ang, want)) > .25) return;
  if (b.shots <= 0) {
    if (isCore) { if ((G.stock.ammo || 0) > 0) { G.stock.ammo--; b.shots = MAG; stat('c', 'ammo'); } }
    else if (b.mags > 0) { b.mags--; b.shots = MAG; stat('c', 'ammo'); }
  }
  if (b.shots <= 0) return;
  b.shots--; b.cd = S.rate; b.flash = .06;
  const mx = cx + Math.cos(b.ang) * .9, my = cy + Math.sin(b.ang) * .9 - .06;
  G.tracers.push({ x1: mx, y1: my, x2: tg.x + (Math.random() - .5) * .3, y2: tg.y + (Math.random() - .5) * .3, life: .07 });
  sfx('shot', .5, cx, cy);
  hit(tg, S.dmg * G.mod.dmg);
}
// vuurspuwer: draait naar het doel en raakt alles in de boog
function updFlamer(b, dt) {
  const cx = b.x + 1, cy = b.y + 1, S = FLAMER;
  b.cd -= dt; b.scan -= dt; b.fire = Math.max(0, b.fire - dt);
  const tg0 = b.target;
  if (b.scan <= 0 || !tg0 || tg0.dead || (tg0.x - cx) ** 2 + (tg0.y - cy) ** 2 > S.range * S.range) { b.scan = .2; b.target = findTarget(cx, cy, S.range, false); }
  const tg = b.target; if (!tg) return;
  const want = Math.atan2(tg.y - cy, tg.x - cx);
  b.ang = turnTo(b.ang, want, dt * 5);
  if (Math.abs(angDiff(b.ang, want)) > .4) return;
  if (b.burn <= 0) {
    if (b.fuel > 0) { b.fuel--; b.burn = S.coalT; stat('c', 'coal'); addPoll(b.x, b.y, .5); }
    else if (fluidTake(b, 'fuel', FUEL_FLAME) > 0) { b.burn = S.coalT; addPoll(b.x, b.y, .3); }
    else { b.nofuel = true; return; }
  }
  b.nofuel = false; b.burn -= dt; b.fire = .15;
  if (b.cd > 0) return;
  b.cd = S.rate;
  for (const e of G.enemies) {
    if (e.dead) continue; const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy;
    if (d2 < (S.range + ENEMY[e.type].r) ** 2 && Math.abs(angDiff(b.ang, Math.atan2(dy, dx))) < S.arc) hit(e, S.dmg * G.mod.dmg, true);
  }
  const ca = Math.cos(b.ang), sa = Math.sin(b.ang);
  for (let i = 0; i < 3; i++) { const j = (Math.random() - .5) * .5, v = S.range * (2.1 + Math.random() * .6); addP('fire', cx + ca * .9, cy + sa * .9, (ca - sa * j) * v, (sa + ca * j) * v, .42 + Math.random() * .1, .1); }
  sfx('flame', .5, cx, cy);
}
function hit(t, dmg, fire) {
  if (t.dead) return;
  if (t.isNest) {
    t.hp -= dmg;
    if (G.time - t.prov > 4) { t.prov = G.time; for (let i = 0; i < 2 + Math.min(4, G.wave >> 1); i++) spawnEnemy(i === 0 && G.wave >= 3 ? 'beetle' : 'crawler', t); }
    if (t.hp <= 0) {
      t.dead = true; terrainDecal(t.x, t.y, 'scorch', 2.6); addP('flash', t.x, t.y, 0, 0, .4, 2.5);
      for (let i = 0; i < 30; i++) { const a = Math.random() * 6.283, s = Math.random() * 4; addP('blood', t.x, t.y, Math.cos(a) * s, Math.sin(a) * s, .8, .08, '#c7e46a'); }
      sfx('boom', 1.2, t.x, t.y); G.goals.nest = true; toast('Nest vernietigd!', 'good');
      if (G.M.nests.every(n => n.dead)) { G.over = true; G.won = true; showOver(); }
    }
    return;
  }
  const D = ENEMY[t.type];
  t.hp -= Math.max(1, dmg - D.armor * (fire ? .5 : 1)); t.hitT = .08;
  addP('blood', t.x, t.y, (Math.random() - .5) * 2, (Math.random() - .5) * 2, .3, .04, D.glow);
  if (t.hp <= 0) {
    t.dead = true; G.kills++; terrainDecal(t.x, t.y, 'splat', D.r * 2.2);
    for (let i = 0; i < 6; i++) addP('blood', t.x, t.y, (Math.random() - .5) * 3, (Math.random() - .5) * 3, .5, .05, D.glow);
    sfx('die', .6, t.x, t.y);
  }
}

// ---------- vijanden ----------
function computeFlow() {
  const M = G.M, W = M.W, H = M.H, N = W * H, f = G.flow, heap = new Heap();
  f.fill(Infinity);
  for (let i = 0; i < N; i++) if (G.grid[i]) { f[i] = 0; heap.push(i, 0); }
  while (heap.size) {
    const d = heap.pop(), i = heap.ri;
    if (d > f[i]) continue;
    const x = i % W, y = (i / W) | 0;
    for (let k = 0; k < 8; k++) {
      const nx = x + NX[k], ny = y + NY[k];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx, nd = d + (k < 4 ? 1 : 1.414) * (M.ground[j] === 3 ? 4 : 1);
      if (nd < f[j]) { f[j] = nd; heap.push(j, nd); }
    }
  }
}
function spawnEnemy(type, nest) {
  if (nest.dead) return;
  const D = ENEMY[type], a = Math.random() * 6.283;
  G.enemies.push({ type, x: nest.x + Math.cos(a) * 1.4, y: nest.y + Math.sin(a) * 1.4, hp: D.hp, maxhp: D.hp, cd: 0, hitT: 0, bite: 0, anim: Math.random() * 9, ang: a, dead: false });
}
function moveTo(e, x, y, spd, dt) {
  const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy); if (d < 1e-4) return;
  const s = Math.min(d, spd * dt); e.x += dx / d * s; e.y += dy / d * s;
  e.ang = turnTo(e.ang, Math.atan2(dy, dx), dt * 7); e.anim += s * 5;
}
function updEnemies(dt) {
  const M = G.M, W = M.W, H = M.H, buck = new Map();
  for (const e of G.enemies) { const k = (e.y | 0) * W + (e.x | 0); let a = buck.get(k); if (!a) buck.set(k, a = []); a.push(e); }
  for (const e of G.enemies) {
    if (e.dead) continue;
    const D = ENEMY[e.type];
    e.hitT = Math.max(0, e.hitT - dt); e.cd -= dt; e.bite = Math.max(0, e.bite - dt);
    const tx = Math.max(0, Math.min(W - 1, e.x | 0)), ty = Math.max(0, Math.min(H - 1, e.y | 0));
    let tgt = null, bd = 1e9, px = 0, py = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const b = bAt(tx + i, ty + j); if (!b) continue;
      const qx = Math.max(b.x, Math.min(b.x + b.w, e.x)), qy = Math.max(b.y, Math.min(b.y + b.h, e.y)), d = Math.hypot(e.x - qx, e.y - qy);
      if (d < bd) { bd = d; tgt = b; px = qx; py = qy; }
    }
    const spd = D.speed * (M.ground[ty * W + tx] === 3 ? .5 : 1), pl = G.pl, pd = pl && !pl.dead ? Math.hypot(e.x - pl.x, e.y - pl.y) : 99;
    if (pd < 1.6 && pd < bd + .3) {
      // figuur in de buurt: er achteraan en bijten
      if (pd > D.r + .25) moveTo(e, pl.x, pl.y, spd, dt);
      else { e.ang = turnTo(e.ang, Math.atan2(pl.y - e.y, pl.x - e.x), dt * 8); if (e.cd <= 0) { e.cd = D.rate; e.bite = .15; hurtPlayer(D.dmg); } }
    } else if (tgt && bd < D.r + .6) {
      if (bd > D.r + .05) moveTo(e, px, py, spd, dt);
      else {
        e.ang = turnTo(e.ang, Math.atan2(py - e.y, px - e.x), dt * 8);
        if (e.cd <= 0) {
          e.cd = D.rate; e.bite = .15; tgt.hp -= D.dmg;
          addP('spark', px, py, (Math.random() - .5) * 2, (Math.random() - .5) * 2, .25, .03, '#ffcf7a');
          if (tgt.hp <= 0) destroyB(tgt);
        }
      }
    } else {
      let best = G.flow[ty * W + tx], bx = -1, by = -1;
      for (let k = 0; k < 8; k++) {
        const nx = tx + NX[k], ny = ty + NY[k]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const v = G.flow[ny * W + nx]; if (v < best) { best = v; bx = nx; by = ny; }
      }
      if (bx >= 0) moveTo(e, bx + .5, by + .5, spd, dt); else moveTo(e, M.cx, M.cy, spd, dt);
    }
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const a = buck.get((ty + j) * W + tx + i); if (!a) continue;
      for (const q of a) {
        if (q === e || q.dead) continue;
        const dx = e.x - q.x, dy = e.y - q.y, rr = (D.r + ENEMY[q.type].r) * .85, d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), p = (rr - d) * .25; e.x += dx / d * p; e.y += dy / d * p; }
      }
    }
  }
  if (G.enemies.some(e => e.dead)) G.enemies = G.enemies.filter(e => !e.dead);
}

// ---------- golven ----------
function startWave() {
  G.wave++; G.waveT = WAVE.every;
  const n = G.wave, mult = 1 + G.poll / 1000, alive = G.M.nests.filter(q => !q.dead);
  if (!alive.length) return;
  alive.sort(() => Math.random() - .5);
  const act = alive.slice(0, Math.min(alive.length, 1 + (n >> 1)));
  const cr = Math.round((3 + n * 2.5) * mult), be = n >= 3 ? Math.round((n - 2) * 1.3 * mult) : 0, mo = n % 5 === 0 ? n / 5 : 0;
  const add = (type, c) => { for (let i = 0; i < c; i++) G.spawnQ.push({ type, nest: act[i % act.length], t: Math.random() * 8 + (type === 'mother' ? 4 : 0) }); };
  add('crawler', cr); add('beetle', be); add('mother', mo);
  toast(`Golf ${n}: ${cr + be + mo} aanvallers!`, 'bad'); sfx('horn');
}
function updWaves(dt) {
  G.waveT -= dt;
  if (G.waveT <= 0) startWave();
  for (let k = G.spawnQ.length - 1; k >= 0; k--) { const s = G.spawnQ[k]; s.t -= dt; if (s.t <= 0) { spawnEnemy(s.type, s.nest); G.spawnQ.splice(k, 1); } }
}
function callWave() { if (G.waveT > 3) G.waveT = .01; }

// ---------- handwerk ----------
function queueHand(k, n) { for (let i = 0; i < n; i++) G.hand.push(k); }
function updHand(dt) {
  if (!G.handCur) {
    while (G.hand.length) {
      const k = G.hand.shift(), r = HAND[k];
      if (canAfford(r.in)) { pay(r.in); for (const i in r.in) stat('c', i, r.in[i]); G.handCur = { k, t: r.time, T: r.time }; break; }
      toast(`Niet genoeg grondstoffen voor ${ITEMS[k].n}`);
    }
  } else {
    G.handCur.t -= dt;
    if (G.handCur.t <= 0) { addItem(G.handCur.k, HAND[G.handCur.k].qty); stat('p', G.handCur.k, HAND[G.handCur.k].qty); G.handCur = null; }
  }
}
function startMine(tx, ty) {
  const M = G.M; if (tx < 0 || ty < 0 || tx >= M.W || ty >= M.H) return;
  const i = ty * M.W + tx; if (!M.ore[i] || M.amt[i] <= 0 || M.ore[i] === OIL) return;
  const p = G.pl;
  if (!p || p.dead) { toast('Je figuur is uitgeschakeld'); return; }
  if (Math.hypot(tx + .5 - p.x, ty + .5 - p.y) > FIG_REACH) { toast(`Te ver: loop dichterbij (max ${FIG_REACH} tegels)`); return; }
  G.mine = { i, x: tx, y: ty, t: 0, n: 0 };
}
function updMine(dt) {
  const m = G.mine; if (!m) return;
  const M = G.M; m.t += dt; if (m.t < MINE_T) return; m.t = 0;
  if (!M.ore[m.i] || M.amt[m.i] <= 0) { G.mine = null; return; }
  addItem(ORE_KEYS[M.ore[m.i]], 1); stat('p', ORE_KEYS[M.ore[m.i]]); G.goals.mine = true; m.n++;
  for (let i = 0; i < 4; i++) addP('debris', m.x + .5, m.y + .5, (Math.random() - .5) * 3, (Math.random() - .5) * 3, .4, .04, ORE4[M.ore[m.i]].b);
  sfx('mine', .5, m.x, m.y);
  if (--M.amt[m.i] === 0) { M.ore[m.i] = 0; oreChanged(m.x, m.y); G.mine = null; }
}

// ---------- effecten ----------
function addP(k, x, y, vx, vy, life, sz, col) { if (G.fx.length > 1200) return; G.fx.push({ k, x, y, vx, vy, life, max: life, sz, col }); }
function updFx(dt) {
  for (const p of G.fx) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.k === 'smoke') { p.sz += dt * .25; p.vx *= .99; } else if (p.k === 'fire') { const f = Math.max(0, 1 - 2.6 * dt); p.vx *= f; p.vy *= f; p.sz += dt * .5; } else { p.vx *= .9; p.vy *= .9; }
  }
  G.fx = G.fx.filter(p => p.life > 0);
  for (const t of G.tracers) t.life -= dt;
  G.tracers = G.tracers.filter(t => t.life > 0);
}
// ---------- hoofdlus ----------
function update(dt) {
  G.time += dt;
  updPower(dt); updFluids();
  updHand(dt); updMine(dt); updBelts(dt);
  for (const b of G.bmap.values()) {
    switch (b.type) {
      case 'drill': case 'drill3': updDrill(b, dt); break;
      case 'furnace': updFurnace(b, dt); break;
      case 'assembler': updAsm(b, dt); break;
      case 'turret': gun(b, dt, TURRET); break;
      case 'core': gun(b, dt, CORE_GUN); break;
      case 'arm': case 'arm2': updArm(b, dt); break;
      case 'counter': updCounter(b); break;
      case 'splitter': updSplitter(b); break;
      case 'tunnel': updTunnel(b, dt); break;
      case 'lab': updLab(b, dt); break;
      case 'flamer': updFlamer(b, dt); break;
      default: if (PUPD[b.type]) PUPD[b.type](b, dt);
    }
    if (G.over) return;
  }
  G.flowT -= dt;
  if (G.flowDirty && G.flowT <= 0) { computeFlow(); G.flowDirty = false; G.flowT = .3; }
  updLogi(dt); fluidWriteBack();
  updWaves(dt); updEnemies(dt); updFx(dt);
  updPollution(dt); updFog(dt); updStats(dt);
}
