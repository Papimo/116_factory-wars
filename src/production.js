'use strict';
// Productie & grondstoffen (B): vloeistofnetten (pijp/tank), oliepomp, receptmachines (raffinaderij, chemiehal,
// staalpers, printplaatlijn), grote boor, steengroeve, recycler + wrakken, modules.

const PROD_TYPES = ['press', 'pcb', 'chem', 'refinery'];
const PROD_DEF = { press: 'steel', pcb: 'circuit', chem: 'plastic', refinery: 'refine' };
function recipesFor(type) { return Object.keys(PROD).filter(k => PROD[k].m === type); }
function recipeOpen(r) { return !r.tech || G.tech[r.tech]; }

function prodInit(b) {
  const t = b.type;
  if (PROD_TYPES.includes(t)) { b.recipe = PROD_DEF[t]; b.inv = {}; b.outN = 0; b.fl = {}; b.fo = {}; b.spin = 0; b.idle = true; }
  else if (t === 'drill3') { b.cond = null; b.hold = null; b.alt2 = 0; b.empty = false; b.spin = 0; }
  else if (t === 'quarry' || t === 'recycler') { b.hold = null; b.spin = 0; b.tgt = -1; }
  else if (t === 'pump') { b.fo = {}; b.spin = 0; }
  if (BUILD[t].fnode) { b.fa = 0; b.ft = null; }
  if (MOD_SLOTS[t]) b.mods = [];
}
function prodRefund(b) {
  if (PROD_TYPES.includes(b.type)) { for (const k in b.inv) addItem(k, b.inv[k]); const r = PROD[b.recipe]; if (r && r.out) addItem(r.out, b.outN); }
  if (b.mods) for (const m of b.mods) addItem(m, 1);
}
function prodAccepts(b, it) { const r = PROD[b.recipe]; const need = r && r.in && r.in[it]; return !!need && (b.inv[it] || 0) < need * 4; }
function prodFill(b) {
  const r = PROD[b.recipe]; let moved = 0; if (!r || !r.in) return 0;
  for (const k in r.in) { const n = Math.max(0, Math.min(r.in[k] * 4 - (b.inv[k] || 0), G.stock[k] || 0)); G.stock[k] -= n; b.inv[k] = (b.inv[k] || 0) + n; moved += n; }
  return moved;
}
function setProdRecipe(b, k) {
  if (b.recipe === k || !PROD[k] || PROD[k].m !== b.type) return;
  prodRefund({ type: b.type, inv: b.inv, recipe: b.recipe, outN: b.outN });
  b.inv = {}; b.outN = 0; b.t = 0; b.fl = {}; b.fo = {}; b.recipe = k;
}

// ---------- modules ----------
function modMul(b, key) { let f = 1; if (b.mods) for (const m of b.mods) f *= MODS[m][key]; return f; }
function modSp(b) { return b.mods ? modMul(b, 'sp') : 1; }
function modPw(b) { return b.mods ? Math.max(.2, modMul(b, 'pw')) : 1; }
function modPoll(b) { return b.mods ? modMul(b, 'poll') : 1; }

// ---------- vloeistoffen ----------
// Net = aaneengesloten pijpen + tanks. Machines met fport koppelen aan elk net dat ze raken.
// Per net één vloeistof; elke knoop bewaart zijn deel (fa/ft) zodat afbreken/opslaan klopt.
function edgeTiles(b) {
  const r = [];
  for (let i = 0; i < b.w; i++) r.push([b.x + i, b.y - 1], [b.x + i, b.y + b.h]);
  for (let j = 0; j < b.h; j++) r.push([b.x - 1, b.y + j], [b.x + b.w, b.y + j]);
  return r;
}
function isFNode(b) { return !!b && !!BUILD[b.type].fnode; }
function isFLink(b) { return !!b && (!!BUILD[b.type].fnode || !!BUILD[b.type].fport); }
function computeFluids() {
  G.fluDirty = false;
  const nets = [], seen = new Set();
  for (const s of G.bmap.values()) {
    if (!isFNode(s) || seen.has(s.id)) continue;
    const net = { id: nets.length, cap: 0, amt: 0, fl: null, nodes: [] }, mixv = {}, q = [s]; nets.push(net); seen.add(s.id);
    while (q.length) {
      const b = q.pop(); b.fnet = net.id; net.nodes.push(b); net.cap += BUILD[b.type].fnode;
      if (b.fa > 0 && b.ft) mixv[b.ft] = (mixv[b.ft] || 0) + b.fa;
      for (const [x, y] of edgeTiles(b)) { const n = bAt(x, y); if (isFNode(n) && !seen.has(n.id)) { seen.add(n.id); q.push(n); } }
    }
    const ks = Object.keys(mixv); let best = null; for (const k of ks) if (!best || mixv[k] > mixv[best]) best = k;
    net.fl = best; net.amt = best ? Math.min(net.cap, mixv[best]) : 0;
    if (ks.length > 1) toastErr(`Leiding gemengd: ${ks.filter(k => k !== best).map(k => FLUIDS[k].n).join(', ')} is weggelopen`);
  }
  G.fnets = nets;
  for (const b of G.bmap.values()) if (BUILD[b.type].fport) {
    const s = new Set(); for (const [x, y] of edgeTiles(b)) { const n = bAt(x, y); if (isFNode(n)) s.add(n.fnet); }
    b.fnets = [...s];
  }
}
function updFluids() { if (G.fluDirty) computeFluids(); }
function fluidWriteBack() {
  for (const n of G.fnets) {
    if (n.amt < .01) { n.amt = 0; n.fl = null; }
    for (const b of n.nodes) { b.fa = n.cap ? n.amt * BUILD[b.type].fnode / n.cap : 0; b.ft = n.fl; }
  }
}
function fluidPut(b, ft, want) {
  let put = 0; if (!b.fnets) return 0;
  for (const i of b.fnets) {
    const n = G.fnets[i]; if (!n || want - put <= 0) continue;
    if (n.fl && n.fl !== ft && n.amt > .01) continue;
    const p = Math.min(want - put, n.cap - n.amt); if (p <= 0) continue;
    n.fl = ft; n.amt += p; put += p;
  }
  return put;
}
function fluidTake(b, ft, want) {
  let got = 0; if (!b.fnets) return 0;
  for (const i of b.fnets) {
    const n = G.fnets[i]; if (!n || n.fl !== ft || want - got <= 0) continue;
    const p = Math.min(want - got, n.amt); n.amt -= p; got += p;
  }
  return got;
}
function fluidSum(b, ft) { let s = 0; if (b.fnets) for (const i of b.fnets) { const n = G.fnets[i]; if (n && n.fl === ft) s += n.amt; } return s; }
function netOf(b) { return b.fnet >= 0 && G.fnets[b.fnet]; }

// ---------- machines ----------
function oilTiles(b) {
  const M = G.M; let s = 0;
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) { const k = (b.y + j) * M.W + b.x + i; if (M.ore[k] === OIL) s += M.amt[k] / 100; }
  return s;
}
function updPump(b, dt) {
  const cur = b.fo.oil || 0;
  if (cur < 60) { const pf = pwr(b); b.fo.oil = cur + oilTiles(b) * PUMP_RATE * pf * dt; b.spin += dt * 2.2 * pf; b.act = true; } else b.act = false;
  if (b.fo.oil > 0) b.fo.oil -= fluidPut(b, 'oil', b.fo.oil);
  if (b.act && Math.random() < dt * .5) addPoll(b.x, b.y, .3 * modPoll(b));
}
function updMach(b, dt) {
  const r = PROD[b.recipe]; if (!r) return;
  if (r.out && b.outN > 0 && emit(b, r.out)) b.outN--;
  if (r.fout) for (const k in r.fout) if (b.fo[k] > 0) b.fo[k] -= fluidPut(b, k, b.fo[k]);
  if (r.fin) for (const k in r.fin) { const need = r.fin[k] * 2 - (b.fl[k] || 0); if (need > 0) b.fl[k] = (b.fl[k] || 0) + fluidTake(b, k, need); }
  b.act = b.t > 0;
  if (b.t > 0) {
    const pf = pwr(b); b.spin += dt * 3 * pf; b.t -= dt * pf;
    if (b.t <= 0) {
      if (r.out) { b.outN += r.qty; stat('p', r.out, r.qty); }
      if (r.fout) for (const k in r.fout) b.fo[k] = (b.fo[k] || 0) + r.fout[k];
    }
    return;
  }
  b.idle = 'vol';
  if (r.out && b.outN + r.qty > 10) return;
  if (r.fout) for (const k in r.fout) if ((b.fo[k] || 0) > r.fout[k]) return;
  b.idle = 'in';
  if (r.in) for (const k in r.in) if ((b.inv[k] || 0) < r.in[k]) return;
  if (r.fin) for (const k in r.fin) if ((b.fl[k] || 0) < r.fin[k] - 1e-6) return;
  if (r.in) for (const k in r.in) { b.inv[k] -= r.in[k]; stat('c', k, r.in[k]); }
  if (r.fin) for (const k in r.fin) b.fl[k] -= r.fin[k];
  b.t = r.time; b.idle = false; b.act = true; addPoll(b.x, b.y, (r.poll || .5) * modPoll(b));
}
function updQuarry(b, dt) {
  b.act = false;
  if (b.hold) { if (emit(b, b.hold)) b.hold = null; else return; }
  const pf = pwr(b); b.act = true; b.spin += dt * 4 * pf;
  b.t += dt * pf; if (b.t < QUARRY_T) return; b.t = 0;
  addPoll(b.x, b.y, .8 * modPoll(b)); stat('p', 'stone');
  b.hold = 'stone'; if (emit(b, 'stone')) b.hold = null;
}
function updRecycler(b, dt) {
  b.act = false;
  if (b.hold) { if (emit(b, b.hold)) b.hold = null; else return; }
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  let w = G.wrecks[b.tgt];
  if (!w || Math.hypot(w.x - cx, w.y - cy) > RECYC.r) {
    b.tgt = -1; let bd = RECYC.r + 1e-6;
    G.wrecks.forEach((q, i) => { const d = Math.hypot(q.x - cx, q.y - cy); if (d <= bd) { bd = d; b.tgt = i; } });
    w = G.wrecks[b.tgt]; if (!w) return;
  }
  const pf = pwr(b); b.act = true; b.spin += dt * 3 * pf;
  b.t += dt * pf; if (b.t < RECYC.t) return; b.t = 0;
  w.n--; stat('p', 'scrap'); addPoll(b.x, b.y, .3 * modPoll(b));
  if (w.n <= 0) { G.wrecks.splice(b.tgt, 1); b.tgt = -1; for (const o of G.bmap.values()) if (o.type === 'recycler') o.tgt = -1; }
  b.hold = 'scrap'; if (emit(b, 'scrap')) b.hold = null;
}
const PUPD = { press: updMach, pcb: updMach, chem: updMach, refinery: updMach, pump: updPump, quarry: updQuarry, recycler: updRecycler };

// ---------- wrakken ----------
function addWreck(b) {
  if (b.type === 'core' || BUILD[b.type].ground) return;
  let v = 0; for (const k in BUILD[b.type].cost) v += BUILD[b.type].cost[k];
  const n = Math.max(1, Math.round(v / 3)); if (v < 2) return;
  G.wrecks.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, s: Math.max(b.w, b.h), n, max: n, seed: (Math.random() * 1e6) | 0 });
}
// neergestorte brokstukken van de kern, verspreid over de kaart
function genWrecks() {
  const M = G.M, R = mulberry(G.seed ^ 0x2c1b3c6d);
  for (let k = 0, t = 0; k < 14 && t < 400; t++) {
    const a = R() * 6.283, d = 6 + R() * 34, x = M.cx + Math.cos(a) * d, y = M.cy + Math.sin(a) * d * .8, i = (y | 0) * M.W + (x | 0);
    if (x < 2 || y < 2 || x > M.W - 2 || y > M.H - 2 || M.ground[i] === 3 || M.ore[i] || G.grid[i]) continue;
    if (M.nests.some(n => Math.hypot(n.x - x, n.y - y) < 7)) continue;
    const n = 15 + (R() * 30 | 0); G.wrecks.push({ x, y, s: 1 + (R() < .4 ? 1 : 0), n, max: n, seed: R() * 1e6 | 0 }); k++;
  }
}

// ---------- paneel ----------
function prodAct(b, act, v) {
  if (act === 'precipe') setProdRecipe(b, v);
  else if (act === 'mod-add' && MOD_SLOTS[b.type] && (b.mods = b.mods || []) && v && (G.stock[v] || 0) > 0 && b.mods.length < MOD_SLOTS[b.type]) { G.stock[v]--; b.mods.push(v); }
  else if (act === 'mod-rem' && b.mods && b.mods[+v]) { addItem(b.mods[+v], 1); b.mods.splice(+v, 1); }
  else if (act === 'dump') { const n = netOf(b); if (n) { n.amt = 0; n.fl = null; } }
  else return false;
  return true;
}
const prow = (it, n, label) => `<div class="row"><img src="${itemIcon(it)}"><span>${label || ITEMS[it].n}</span><b>${n}</b></div>`;
const frow = (ft, n, label) => `<div class="row"><i class="fdot" style="background:${FLUIDS[ft].c}"></i><span>${label || FLUIDS[ft].n}</span><b>${Math.round(n)}</b></div>`;
function modHTML(b) {
  const S = MOD_SLOTS[b.type]; if (!S) return '';
  if (!b.mods) b.mods = [];
  if (!G.tech.mods && !b.mods.length) return '';
  let h = `<p class="dim">Modules (${b.mods.length}/${S}) · klik = eruit</p><div class="cond">`;
  b.mods.forEach((m, i) => { h += `<button data-act="mod-rem" data-v="${i}" title="${ITEMS[m].n}"><img src="${itemIcon(m)}"></button>`; });
  if (b.mods.length < S) for (const m of ['modS', 'modE']) if ((G.stock[m] || 0) > 0) h += `<button data-act="mod-add" data-v="${m}" title="${ITEMS[m].n} plaatsen (${G.stock[m]} in voorraad)">+<img src="${itemIcon(m)}"></button>`;
  h += '</div>';
  if (b.mods.length) h += `<p class="dim">Snelheid ×${modSp(b).toFixed(2)} · stroom ×${modPw(b).toFixed(2)} · vervuiling ×${modPoll(b).toFixed(2)}</p>`;
  return h;
}
function fluidLinkHTML(b, kinds) {
  if (!b.fnets || !b.fnets.length) return '<p class="warn">Geen pijp of tank ernaast.</p>';
  let h = '';
  for (const k of kinds) h += frow(k, fluidSum(b, k), `${FLUIDS[k].n} in leiding`);
  return h;
}
function prodInfo(b) {
  let h = '';
  if (PROD_TYPES.includes(b.type)) {
    const rs = recipesFor(b.type);
    if (rs.length > 1) h += '<div class="seg">' + rs.filter(k => recipeOpen(PROD[k])).map(k => `<button data-act="precipe" data-v="${k}" class="${b.recipe === k ? 'on' : ''}"><img src="${itemIcon(PROD[k].out)}">${PROD[k].n}</button>`).join('') + '</div>';
    const r = PROD[b.recipe];
    if (r.in) for (const k in r.in) h += prow(k, `${b.inv[k] || 0}/${r.in[k]}`);
    if (r.fin) for (const k in r.fin) h += frow(k, b.fl[k] || 0, `${FLUIDS[k].n} (nodig ${r.fin[k]})`);
    if (r.out) h += prow(r.out, b.outN, 'Klaar');
    if (r.fout) for (const k in r.fout) h += frow(k, b.fo[k] || 0, `${FLUIDS[k].n} uit`);
    h += `<div class="meter"><i style="width:${b.t > 0 ? (1 - b.t / r.time) * 100 : 0}%"></i></div>`;
    const kinds = [...Object.keys(r.fin || {}), ...Object.keys(r.fout || {})];
    if (kinds.length) h += fluidLinkHTML(b, kinds);
    if (b.idle === 'vol') h += '<p class="warn">Uitvoer vol: voer af met een band/grijparm' + (r.fout ? ' of een lege pijp/tank' : '') + '.</p>';
    if (r.fout && r.fin && b.fnets && b.fnets.length < 2) h += '<p class="dim">Tip: twee aparte leidingen, één voor olie erin en één voor brandstof eruit.</p>';
    if (r.in) h += `<button class="act" data-act="fill">Bijvullen uit voorraad</button>`;
  }
  switch (b.type) {
    case 'pump': {
      const o = oilTiles(b);
      h += `<div class="row"><span>Opbrengst</span><b>${(o * PUMP_RATE).toFixed(1)}/s</b></div>` + fluidLinkHTML(b, ['oil']);
      if ((b.fo.oil || 0) >= 59) h += '<p class="warn">Leiding vol of geen leiding: olie kan nergens heen.</p>';
      break;
    }
    case 'pipe': case 'tank': {
      const n = netOf(b);
      if (n) h += n.fl ? frow(n.fl, n.amt, `${FLUIDS[n.fl].n} (van ${n.cap})`) : `<p class="dim">Leeg · leiding kan ${n.cap} eenheden bevatten.</p>`;
      h += '<p class="dim">Eén vloeistof per leiding. Machines en tanks die ertegen staan koppelen vanzelf.</p>';
      if (n && n.amt > 0) h += `<button class="act" data-act="dump">Leiding leeg laten lopen</button>`;
      break;
    }
    case 'quarry': h += '<p class="dim">Breekt eindeloos steen uit de rots.</p>' + (b.hold ? '<p class="warn">Uitvoer geblokkeerd: zet een band voor de pijl.</p>' : ''); break;
    case 'recycler': {
      const w = G.wrecks[b.tgt];
      h += w ? `<div class="row"><span>Wrak</span><b>${w.n}/${w.max} schroot</b></div>` : `<p class="warn">Geen wrak binnen ${RECYC.r} tegels.</p>`;
      h += `<p class="dim">${G.wrecks.length} wrakken op de kaart. Vernielde gebouwen laten ook een wrak achter.</p>`;
      if (b.hold) h += '<p class="warn">Uitvoer geblokkeerd: zet een band voor de pijl.</p>';
      break;
    }
    case 'boiler': case 'flamer': if (b.fnets && b.fnets.length) h += frow('fuel', fluidSum(b, 'fuel'), 'Brandstof in leiding'); break;
  }
  return h + modHTML(b);
}
function prodAlt(b) {
  if (PROD_TYPES.includes(b.type)) return PROD[b.recipe] && PROD[b.recipe].out;
  if (b.type === 'quarry') return 'stone';
  if (b.type === 'recycler') return 'scrap';
  if (b.type === 'drill3') { const M = G.M; for (let k = 0; k < 9; k++) { const m = (b.y + (k / 3 | 0)) * M.W + b.x + k % 3; if (ORE_KEYS[M.ore[m]]) return ORE_KEYS[M.ore[m]]; } }
  return null;
}
