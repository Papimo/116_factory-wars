'use strict';
// Uitbreidingen bovenop sim.js: stroomnet, vervuiling per stuk, mist van oorlog, onderzoek,
// productiestatistiek, instellingen kopiëren + blauwdruk, opslaan/laden.

// ---------- stroom ----------
// Knooppunten = palen + kern. Palen binnen bereik → één net (kortste draden eerst, zoals een opspannende boom).
// Verbruikers/generatoren horen bij het net als ze het vak van een knooppunt raken.
function nodeInfo(b) { return b.type === 'core' ? CORE_POW : POLE; }
function computeNets() {
  const P = G.pw, nodes = [], blds = [...G.bmap.values()];
  for (const b of blds) if (b.type === 'pole' || b.type === 'core') nodes.push(b);
  const par = nodes.map((_, i) => i), find = i => par[i] === i ? i : (par[i] = find(par[i]));
  const pairs = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j], d = Math.hypot(a.x + a.w / 2 - b.x - b.w / 2, a.y + a.h / 2 - b.y - b.h / 2);
    if (d <= Math.min(nodeInfo(a).reach, nodeInfo(b).reach)) pairs.push([d, i, j]);
  }
  pairs.sort((p, q) => p[0] - q[0]);
  P.edges = [];
  for (const [, i, j] of pairs) { const a = find(i), b = find(j); if (a !== b) { par[a] = b; P.edges.push([nodes[i], nodes[j]]); } }
  const idx = new Map(); P.nets = [];
  nodes.forEach((n, i) => { const r = find(i); if (!idx.has(r)) { idx.set(r, P.nets.length); P.nets.push({ core: false, cap: 0, dem: 0, sat: 0 }); } n.net = idx.get(r); if (n.type === 'core') P.nets[n.net].core = true; });
  P.nodes = nodes;
  for (const b of blds) {
    if (!BUILD[b.type].pw && !BUILD[b.type].sig && b.type !== 'generator') continue;
    b.net = -1;
    for (const n of nodes) {
      const h = nodeInfo(n).box, cx = n.x + n.w / 2, cy = n.y + n.h / 2;
      if (b.x < cx + h && b.x + b.w > cx - h && b.y < cy + h && b.y + b.h > cy - h) { b.net = n.net; break; }
    }
    if (b.type === 'drill' && b.net >= 0 && nodes.some(n => n.type === 'pole' && n.net === b.net)) G.goals.power = true;
  }
  // ketel ↔ generator: raken elkaar met een zijde
  const touch = (a, b) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h && !((a.x === b.x + b.w || b.x === a.x + a.w) && (a.y === b.y + b.h || b.y === a.y + a.h));
  const boilers = blds.filter(b => b.type === 'boiler'), gens = blds.filter(b => b.type === 'generator');
  for (const k of boilers) k.gens = gens.filter(g => touch(k, g)).map(g => g.id);
  for (const g of gens) g.ketels = boilers.filter(k => k.gens.includes(g.id)).map(k => k.id);
  G.powDirty = false;
}
function pwr(b) { const n = b.net >= 0 && G.pw.nets[b.net]; return (n ? Math.max(NOPOW, n.sat) : NOPOW) * modSp(b); }
function genAvail(g) {
  let s = 0;
  for (const id of g.ketels) { const k = G.bmap.get(id); if (k && (k.en > 0 || k.fuel > 0)) s += BOILER_KW / k.gens.length; }
  return Math.min(GEN_KW, s);
}
function updPower(dt) {
  const P = G.pw;
  if (G.powDirty) computeNets();
  for (const n of P.nets) { n.cap = n.core ? CORE_POW.kw : 0; n.gen = 0; n.dem = 0; }
  const gens = [];
  for (const b of G.bmap.values()) {
    if (b.type === 'generator') { b.av = b.net >= 0 ? genAvail(b) : 0; if (b.net >= 0) { P.nets[b.net].cap += b.av; P.nets[b.net].gen += b.av; } gens.push(b); }
    else if (BUILD[b.type].pw && b.act && b.net >= 0) P.nets[b.net].dem += BUILD[b.type].pw * modPw(b);
  }
  P.cap = 0; P.dem = 0;
  for (const n of P.nets) {
    n.sat = n.dem > 0 ? Math.min(1, n.cap / n.dem) : (n.cap > 0 ? 1 : 0);
    const used = Math.min(n.dem, n.cap), fromGen = Math.max(0, used - (n.core ? CORE_POW.kw : 0));
    n.lf = n.gen > 0 ? fromGen / n.gen : 0; P.cap += n.cap; P.dem += n.dem;
  }
  // generatoren trekken stoom → ketels stoken steenkool naar verbruik
  for (const g of gens) {
    g.out = g.net >= 0 ? g.av * P.nets[g.net].lf : 0; g.spin += dt * (g.out / GEN_KW) * 9;
    const ks = g.ketels.map(id => G.bmap.get(id)).filter(k => k && (k.en > 0 || k.fuel > 0));
    for (const k of ks) k.en -= g.out * dt / ks.length;
  }
  for (const b of G.bmap.values()) if (b.type === 'boiler') {
    if (b.en <= 0 && b.fuel > 0 && b.gens.length) { b.fuel--; b.en += COAL_KJ; stat('c', 'coal'); addPoll(b.x, b.y, 2.5); }
    else if (b.en <= 0 && b.gens.length && fluidTake(b, 'fuel', 5) > 0) { b.en += 5 * FUEL_KJ; addPoll(b.x, b.y, 1.2); }
    b.burning = b.en > 0;
  }
}

// ---------- vervuiling per stuk (ZC×ZC tegels) ----------
function initPoll(M) {
  const nx = Math.ceil(M.W / ZC), ny = Math.ceil(M.H / ZC), abs = new Float32Array(nx * ny);
  for (let cj = 0; cj < ny; cj++) for (let ci = 0; ci < nx; ci++) {
    let rock = 0, n = 0;
    for (let y = cj * ZC; y < Math.min(M.H, (cj + 1) * ZC); y++) for (let x = ci * ZC; x < Math.min(M.W, (ci + 1) * ZC); x++) { n++; if (M.ground[y * M.W + x] === 3) rock++; }
    abs[cj * nx + ci] = 1 / 400 + rock / n / 45;              // zand neemt weinig op, rots veel
  }
  G.pn = { nx, ny, abs, T: 1 }; G.pc = new Float32Array(nx * ny); G.pcv = mk(nx, ny);
}
function chunkIdx(x, y) { const P = G.pn; return Math.min(P.ny - 1, Math.max(0, y / ZC | 0)) * P.nx + Math.min(P.nx - 1, Math.max(0, x / ZC | 0)); }
function addPoll(x, y, n) { G.pc[chunkIdx(x, y)] += n; }
function pollAt(x, y) { return G.pc[chunkIdx(x, y)]; }
function updPollution(dt) {
  const P = G.pn; P.T -= dt; if (P.T > 0) return; P.T = 1;
  const A = G.pc, B = new Float32Array(A), nx = P.nx, ny = P.ny;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, v = A[k]; if (v < .2) continue;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
      const m = v * .03; B[k] -= m; B[b * nx + a] += m;
    }
  }
  let sum = 0;
  for (let k = 0; k < B.length; k++) { B[k] = Math.max(0, B[k] * (1 - P.abs[k])); sum += B[k]; }
  G.pc = B; G.poll = sum;
  // nesten ruiken vervuiling in hun stuk → kleine aanvalsgroepjes tussen de golven door
  for (const n of G.M.nests) {
    if (n.dead) continue; const v = pollAt(n.x, n.y);
    if (v < 6) continue;
    n.anger = (n.anger || 0) + v * .0012;
    if (n.anger >= 1) {
      n.anger -= 1; const c = Math.min(8, 2 + (v / 25 | 0));
      for (let i = 0; i < c; i++) spawnEnemy(G.wave >= 3 && i % 3 === 2 ? 'beetle' : 'crawler', n);
      if (!G.smellTold) { G.smellTold = true; toast('Een nest ruikt je vervuiling: er komt een groepje op af', 'bad'); }
    }
  }
  const g = G.pcv.getContext('2d'), img = g.createImageData(nx, ny);
  for (let k = 0; k < B.length; k++) { img.data[k * 4] = 120; img.data[k * 4 + 1] = 70; img.data[k * 4 + 2] = 110; img.data[k * 4 + 3] = Math.min(170, B[k] * 3.5); }
  g.putImageData(img, 0, 0);
}

// ---------- mist van oorlog ----------
function initFog(M) { G.seen = new Uint8Array(M.W * M.H); G.fogC = mk(M.W, M.H); G.fogDirty = true; G.fogT = 0; }
function reveal(x, y, r) {
  const M = G.M;
  for (let ty = Math.max(0, Math.floor(y - r)); ty <= Math.min(M.H - 1, Math.ceil(y + r)); ty++)
    for (let tx = Math.max(0, Math.floor(x - r)); tx <= Math.min(M.W - 1, Math.ceil(x + r)); tx++) {
      const i = ty * M.W + tx; if (!G.seen[i] && (tx + .5 - x) ** 2 + (ty + .5 - y) ** 2 <= r * r) { G.seen[i] = 1; G.fogDirty = true; }
    }
}
function updFog(dt) {
  G.fogT -= dt; if (G.fogT > 0) return; G.fogT = .25;
  const p = G.pl; if (p && !p.dead) reveal(p.x, p.y, 10);
}
function fogCanvas() {
  if (G.fogDirty) {
    const M = G.M, g = G.fogC.getContext('2d'), img = g.createImageData(M.W, M.H), d = img.data;
    for (let i = 0; i < M.W * M.H; i++) { d[i * 4] = 30; d[i * 4 + 1] = 20; d[i * 4 + 2] = 13; d[i * 4 + 3] = G.seen[i] ? 0 : 245; }
    g.putImageData(img, 0, 0); G.fogDirty = false;
  }
  return G.fogC;
}
function seenAt(x, y) { const M = G.M, tx = x | 0, ty = y | 0; return tx >= 0 && ty >= 0 && tx < M.W && ty < M.H && G.seen[ty * M.W + tx]; }

// ---------- onderzoek ----------
function techState(k) {
  if (G.tech[k]) return 'done';
  if ((TECH[k].req || []).some(r => !G.tech[r])) return 'locked';
  return G.res === k ? 'cur' : 'open';
}
function setResearch(k) { if (techState(k) === 'open' || techState(k) === 'cur') G.res = G.res === k ? null : k; }
function recomputeMods() {
  const t = G.tech; G.mod.belt = t.belt2 ? 2 : t.belt1 ? 1.5 : 1; G.mod.drill = (t.drill1 ? 1.5 : 1) * (t.drill2 ? 1.5 : 1); G.mod.dmg = (t.dmg1 ? 1.4 : 1) * (t.dmg2 ? 1.4 : 1);
}
function updLab(b, dt) {
  b.act = false; const R = G.res && TECH[G.res]; if (!R) return;
  if (!(b.t > 0)) {
    for (const k of R.kits) if (!(b.inv[k] > 0)) return;
    for (const k of R.kits) { b.inv[k]--; stat('c', k); }
    b.t = TECH_T;
  }
  const pf = pwr(b); b.act = true; b.spin += dt * 2 * pf; b.t -= dt * pf;
  if (b.t <= 0) {
    const k = G.res; if (!k) return;
    G.rp[k] = (G.rp[k] || 0) + 1;
    if (G.rp[k] >= TECH[k].units) {
      G.tech[k] = true; G.res = null; G.goals.research = true; recomputeMods();
      toast(`Onderzoek klaar: ${TECH[k].n}`, 'good'); sfx('horn', .4);
      const nx = TECH_ORDER.find(q => techState(q) === 'open'); if (nx) toast(`Volgende onderzoek kiezen: T`);
    }
  }
}

// ---------- productiestatistiek ----------
function stat(kind, k, n = 1) { if (!k || !G.st) return; const c = G.st.cur[kind]; c[k] = (c[k] || 0) + n; }
function updStats(dt) {
  const S = G.st; S.t += dt; if (S.t < 1) return; S.t -= 1;
  S.hist.push(S.cur); if (S.hist.length > 60) S.hist.shift(); S.cur = { p: {}, c: {} };
}
function statSeries(kind, k) { return G.st.hist.map(h => h[kind][k] || 0); }

// ---------- instellingen kopiëren / plakken ----------
function copySettings(b) {
  if (!SETTABLE.includes(b.type)) { toast('Dit gebouw heeft geen instellingen'); return; }
  G.clip = { type: b.type, ...settingsOf(b) };
  toast(`Instellingen gekopieerd van ${BUILD[b.type].n} · shift+klik = plakken`);
}
function pasteSettings(b) {
  const c = G.clip; if (!c) return false;
  if (c.type !== b.type) { toastErr(`Gekopieerd van ${BUILD[c.type].n}, niet van ${BUILD[b.type].n}`); return true; }
  applySettings(b, c);
  addP('flash', b.x + b.w / 2, b.y + b.h / 2, 0, 0, .2, .5); sfx('build', .4);
  return true;
}

// ---------- blauwdruk ----------
function bpCapture(a, b) {
  const xa = Math.min(a.x, b.x), xb = Math.max(a.x, b.x), ya = Math.min(a.y, b.y), yb = Math.max(a.y, b.y), items = [];
  for (const q of G.bmap.values()) {
    if (q.type === 'core') continue;
    if (q.x >= xa && q.y >= ya && q.x + q.w - 1 <= xb && q.y + q.h - 1 <= yb) items.push({ type: q.type, x: q.x - xa, y: q.y - ya, rot: q.rot, ...settingsOf(q) });
  }
  if (!items.length) { toast('Geen gebouwen in dit vak'); return null; }
  const bp = { w: xb - xa + 1, h: yb - ya + 1, items };
  try { localStorage.setItem('fw_bp', JSON.stringify(bp)); } catch (e) { }
  return bp;
}
function bpRotate(bp) {
  return { w: bp.h, h: bp.w, items: bp.items.map(e => { const s = BUILD[e.type].w; return { ...e, x: bp.h - e.y - s, y: e.x, rot: BUILD[e.type].rot ? (e.rot + 1) % 4 : 0 }; }) };
}
function bpLoad() { try { const s = localStorage.getItem('fw_bp'); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function stampOrigin() { const bp = G.stamp; return { ox: Math.floor(mouse.wx / T - bp.w / 2 + .5), oy: Math.floor(mouse.wy / T - bp.h / 2 + .5) }; }
function stampPlace() {
  const bp = G.stamp, { ox, oy } = stampOrigin(); let ok = 0, bad = 0, why = '';
  const ord = [...bp.items].sort((a, b) => (a.type === 'tunnel') - (b.type === 'tunnel'));
  for (const e of ord) {
    const r = place(e.type, ox + e.x, oy + e.y, e.rot);
    if (typeof r === 'object') { ok++; applySettings(r, e); }
    else if (r !== 'Hier staat al iets') { bad++; why = r; }
  }
  if (ok) sfx('build');
  if (bad) toastErr(`${ok} geplaatst, ${bad} niet: ${why}`); else if (ok) toast(`${ok} gebouwen geplaatst`);
}

// ---------- opslaan / laden (localStorage) ----------
const SAVE_KEY = 'fw_save';
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); }
function unb64(s) { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; }
function saveGame(quiet) {
  if (!G || G.over) return false;
  const M = G.M;
  const bs = [...G.bmap.values()].map(b => { const o = { ...b }; delete o.link; delete o.lorry; o.target = null; return o; });
  const S = {
    v: 1, at: Date.now(), seed: G.seed, ore: b64(M.ore), amt: b64(new Uint8Array(M.amt.buffer)), seen: b64(G.seen),
    nests: M.nests.map(n => ({ hp: n.hp, dead: n.dead, anger: n.anger || 0 })), pc: Array.from(G.pc, v => +v.toFixed(2)),
    b: bs, en: G.enemies, nextId: G.nextId, stock: G.stock, time: G.time, wave: G.wave, waveT: G.waveT, kills: G.kills, goals: G.goals,
    spawnQ: G.spawnQ.map(q => ({ type: q.type, nest: M.nests.indexOf(q.nest), t: q.t })), hand: G.hand, handCur: G.handCur,
    res: G.res, rp: G.rp, tech: G.tech, st: G.st, dec: G.ter.dec.slice(-300), smellTold: G.smellTold,
    lo: G.lorries, dr: G.drones, wr: G.wrecks,
    pl: (({ x, y, ang, hp, dead, rT }) => ({ x, y, ang, hp, dead, rT }))(G.pl), cam: { x: cam.x, y: cam.y, z: cam.z }, follow: G.follow,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); if (!quiet) toast('Spel opgeslagen', 'good'); return true; }
  catch (e) { toast('Opslaan mislukt (opslag vol?)', 'bad'); return false; }
}
function saveInfo() { try { const s = localStorage.getItem(SAVE_KEY); if (!s) return null; const S = JSON.parse(s); return { at: S.at, wave: S.wave, time: S.time }; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
function loadGame() {
  let S; try { S = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { S = null; }
  if (!S || S.v !== 1) return false;
  const M = genMap(S.seed);
  M.ore.set(unb64(S.ore)); M.amt.set(new Uint16Array(unb64(S.amt).buffer));
  S.nests.forEach((n, i) => Object.assign(M.nests[i], n));
  baseG(M, S.seed);
  G.seen.set(unb64(S.seen)); G.fogDirty = true; G.pc.set(S.pc);
  for (const b of S.b) {
    G.bmap.set(b.id, b);
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) G.grid[(b.y + j) * M.W + b.x + i] = b.id;
    if (b.type === 'belt') G.belts.push(b);
    if (b.type === 'core') G.core = b;
  }
  Object.assign(G, { nextId: S.nextId, stock: S.stock, time: S.time, wave: S.wave, waveT: S.waveT, kills: S.kills, goals: S.goals, hand: S.hand, handCur: S.handCur, res: S.res, rp: S.rp, tech: S.tech, st: S.st, smellTold: S.smellTold, follow: S.follow });
  G.enemies = S.en; G.spawnQ = S.spawnQ.filter(q => q.nest >= 0).map(q => ({ ...q, nest: M.nests[q.nest] }));
  for (const dc of S.dec) G.ter.dec.push(dc);
  newPlayer(); Object.assign(G.pl, S.pl); G.follow = S.follow;
  cam.x = S.cam.x; cam.y = S.cam.y; cam.z = S.cam.z;
  G.lorries = S.lo || []; G.drones = S.dr || []; logiAfterLoad(); G.wrecks = S.wr || []; G.fluDirty = true;
  recomputeMods(); relinkTunnels(); computeNets(); computeFlow(); G.flowDirty = false;
  return true;
}
