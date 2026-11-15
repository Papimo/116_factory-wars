'use strict';
// Logistiek 2: instellingen (kopiëren/blauwdruk), schakelnet (voorwaarden), weegschaal, spoor + lorrie, drones.

// ---------- instellingen ----------
const SETTABLE = ['assembler', 'arm', 'arm2', 'splitter', 'counter', 'drill', 'drill3', 'chestR', 'station', 'pcb', 'chem'];
function settingsOf(b) {
  const o = {};
  if (b.recipe) o.recipe = b.recipe;
  if ('filter' in b) o.filter = b.filter;
  if ('cond' in b) o.cond = b.cond ? { ...b.cond } : null;
  if ('req' in b) o.req = b.req ? { ...b.req } : null;
  if (b.mode) o.mode = b.mode;
  return o;
}
function applySettings(r, e) {
  if (e.recipe && r.type === 'assembler') setRecipe(r, e.recipe);
  else if (e.recipe && PROD_TYPES.includes(r.type)) setProdRecipe(r, e.recipe);
  if (e.filter !== undefined && 'filter' in r) r.filter = e.filter;
  if (e.cond !== undefined && 'cond' in r) r.cond = e.cond ? { ...e.cond } : null;
  if (e.req !== undefined && 'req' in r) r.req = e.req ? { ...e.req } : null;
  if (e.mode && r.type === 'station') r.mode = e.mode;
}

// ---------- schakelnet ----------
// Elk stroomnet is ook een signaaldraad: signaal = alles wat in de kisten (en de kern) van dat net ligt.
function updSignals(dt) {
  G.sigT -= dt; if (G.sigT > 0) return; G.sigT = SIG_T;
  const sig = G.pw.nets.map(() => ({}));
  for (const b of G.bmap.values()) {
    if (!(b.net >= 0) || !sig[b.net]) continue;
    const s = sig[b.net], inv = CHESTS.includes(b.type) ? b.inv : b.type === 'core' ? G.stock : null;
    if (inv) for (const k in inv) s[k] = (s[k] || 0) + inv[k];
  }
  G.sig = sig;
}
function sigVal(b, it) { const s = b.net >= 0 && G.sig[b.net]; return s ? s[it] || 0 : 0; }
function condOK(b) {
  const c = b.cond; if (!c) return true;
  if (!(b.net >= 0) || !G.sig[b.net]) return false;
  const v = sigVal(b, c.it); return c.op === '<' ? v < c.n : v > c.n;
}

// ---------- weegschaal ----------
function updCounter(b) {
  const bi = (G.time / 10 | 0) % 6; if (bi !== b.bi) { b.bi = bi; b.bk[bi] = 0; }
  if (!b.hold) return;
  const t = bAt(b.x + DX[b.rot], b.y + DY[b.rot]); if (!t) return;
  if (t.type === 'belt') { if (t.rot === (b.rot + 2) % 4 || !beltAccept(t)) return; t.items.push({ t: b.hold, p: 0, d: b.rot }); }
  else if (accepts(t, b.hold)) insert(t, b.hold); else return;
  b.bk[b.bi]++; b.last = b.hold; b.hold = null;
}
function counterRate(b) { return b.bk.reduce((a, v) => a + v, 0); }

// ---------- spoor + lorrie ----------
function isRail(b) { return !!b && (b.type === 'rail' || b.type === 'station'); }
function railAt(x, y) { return isRail(bAt(x, y)); }
function lorryAt(x, y) { return G.lorries.find(L => Math.abs(L.x - x) < .6 && Math.abs(L.y - y) < .6) || null; }
function canPlaceLorry(x, y) {
  if (!railAt(x, y)) return 'Zet een lorrie op het spoor';
  if (lorryAt(x, y)) return 'Hier staat al een lorrie';
  if (!inRange(x + .5, y + .5)) return 'Buiten bouwbereik (loop erheen of bouw een voorpost)';
  if (!canAfford(BUILD.lorry.cost)) return 'Niet genoeg grondstoffen';
  return '';
}
function placeLorry(x, y, free) {
  if (!free) { const r = canPlaceLorry(x, y); if (r) return r; pay(BUILD.lorry.cost); for (const k in BUILD.lorry.cost) stat('c', k, BUILD.lorry.cost[k]); }
  const L = { id: G.nextId++, type: 'lorry', x, y, dir: 0, inv: {}, n: 0, idle: 0, wait: 0, path: null, sid: 0, at: 0, retry: 0, hp: BUILD.lorry.hp };
  G.lorries.push(L); return L;
}
function removeLorry(L, refund) {
  const k = G.lorries.indexOf(L); if (k < 0) return;
  G.lorries.splice(k, 1);
  const s = G.bmap.get(L.sid); if (s && s.lorry === L) s.lorry = null;
  if (refund) { for (const c in BUILD.lorry.cost) addItem(c, BUILD.lorry.cost[c]); for (const c in L.inv) addItem(c, L.inv[c]); }
}
// breedte-eerst over spoortegels; geeft per bereikte tegel de vorige terug
function railBFS(sx, sy) {
  const W = G.M.W, prev = new Map(), q = [sy * W + sx]; prev.set(q[0], -1);
  for (let h = 0; h < q.length; h++) {
    const k = q[h], x = k % W, y = k / W | 0;
    for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], nk = ny * W + nx; if (!prev.has(nk) && railAt(nx, ny)) { prev.set(nk, k); q.push(nk); } }
  }
  return prev;
}
function railPath(prev, tx, ty) {
  const W = G.M.W, path = []; let k = ty * W + tx; if (!prev.has(k)) return null;
  while (prev.get(k) !== -1) { path.push([k % W, k / W | 0]); k = prev.get(k); }
  return path.reverse();
}
function lorryDepart(L, tx, ty) {
  const sts = [...G.bmap.values()].filter(b => b.type === 'station').sort((a, b) => a.id - b.id);
  if (!sts.length) return;
  const prev = railBFS(tx, ty), i0 = Math.max(0, sts.findIndex(s => s.id === L.at));
  for (let k = 1; k <= sts.length; k++) {
    const s = sts[(i0 + k) % sts.length]; if (s.id === L.at && sts.length > 1) continue;
    if (s.x === tx && s.y === ty) continue;
    const p = railPath(prev, s.x, s.y); if (p && p.length) { L.path = p; L.goal = s.id; return; }
  }
}
function updLorry(L, dt) {
  const tx = Math.round(L.x), ty = Math.round(L.y);
  if (L.path) {
    const [px, py] = L.path[0];
    if (!railAt(px, py)) { L.path = null; L.x = tx; L.y = ty; return; }   // spoor weg: stoppen, later opnieuw zoeken
    const dx = px - L.x, dy = py - L.y, dist = Math.hypot(dx, dy);
    // niet inrijden op een andere lorrie
    for (const o of G.lorries) if (o !== L && Math.hypot(o.x - L.x, o.y - L.y) < 1.05 && (o.x - L.x) * dx + (o.y - L.y) * dy > 0) return;
    const step = LORRY.speed * dt;
    if (dist > 1e-6) L.dir = Math.atan2(dy, dx);
    if (step >= dist) { L.x = px; L.y = py; L.path.shift(); if (!L.path.length) { L.path = null; L.wait = 0; L.idle = 0; } }
    else { L.x += dx / dist * step; L.y += dy / dist * step; }
    return;
  }
  const s = bAt(tx, ty);
  if (s && s.type === 'station') {
    s.lorry = L; L.sid = s.id; L.at = s.id; L.wait += dt; L.idle += dt;
    const go = L.wait > 1 && (s.mode === 'vol' ? L.n >= LORRY.cap : s.mode === 'leeg' ? L.n === 0 : L.idle >= LORRY.rest);
    if (!go) return;
  }
  L.retry -= dt; if (L.retry > 0) return; L.retry = 1;
  if (railAt(tx, ty)) lorryDepart(L, tx, ty);
}

// ---------- drones ----------
function inDock(d, b) { const cx = d.x + 1, cy = d.y + 1; return Math.max(Math.abs(b.x + b.w / 2 - cx), Math.abs(b.y + b.h / 2 - cy)) <= DOCK.r; }
function updDock(d, dt) {
  d.act = d.free < DOCK.n;
  d.disp -= dt; if (d.disp > 0 || d.free <= 0) return; d.disp = .5;
  for (const c of G.bmap.values()) {
    if (d.free <= 0) return;
    if (c.type !== 'chestR' || !c.req || !inDock(d, c)) continue;
    const it = c.req.it, need = Math.min(c.req.n, CHEST_CAP) - (c.inv[it] || 0) - c.inc;
    if (need <= 0) continue;
    let src = null, best = 1e9;
    for (const p of G.bmap.values()) if (p.type === 'chestP' && (p.inv[it] || 0) > 0 && inDock(d, p)) { const q = Math.hypot(p.x - c.x, p.y - c.y); if (q < best) { best = q; src = p; } }
    if (!src && G.core && (G.stock[it] || 0) > 0 && inDock(d, G.core)) src = G.core;
    if (!src) continue;
    const n = Math.min(DOCK.cap, need);
    G.drones.push({ d: d.id, x: d.x + 1, y: d.y + 1, st: 1, src: src.id, dst: c.id, it, n, hold: 0, ang: 0 });
    c.inc += n; d.free--;
  }
}
function updDrone(r, dt) {
  const d = G.bmap.get(r.d);
  if (!d) { addItem(r.it, r.hold); if (r.st < 3) { const c = G.bmap.get(r.dst); if (c) c.inc -= r.n; } return false; }
  const tgt = r.st === 1 ? G.bmap.get(r.src) : r.st === 2 ? G.bmap.get(r.dst) : d;
  if (!tgt) { addItem(r.it, r.hold); r.hold = 0; r.st = 3; return true; }
  const gx = tgt.x + tgt.w / 2, gy = tgt.y + tgt.h / 2, dx = gx - r.x, dy = gy - r.y, dist = Math.hypot(dx, dy), step = DOCK.speed * pwr(d) * dt;
  if (dist > .01) r.ang = Math.atan2(dy, dx);
  if (step < dist) { r.x += dx / dist * step; r.y += dy / dist * step; return true; }
  r.x = gx; r.y = gy;
  const c = G.bmap.get(r.dst);
  if (r.st === 1) {
    const have = tgt.type === 'core' ? G.stock[r.it] || 0 : tgt.inv[r.it] || 0, take = Math.min(r.n, have);
    if (tgt.type === 'core') G.stock[r.it] -= take; else if (take) { tgt.inv[r.it] -= take; tgt.n -= take; if (!tgt.inv[r.it]) delete tgt.inv[r.it]; }
    if (c) c.inc -= r.n - take;
    r.n = take; r.hold = take; r.st = take ? 2 : 3;
  } else if (r.st === 2) {
    const put = Math.min(r.hold, CHEST_CAP - c.n);
    c.inv[r.it] = (c.inv[r.it] || 0) + put; c.n += put; if (!c.inv[r.it]) delete c.inv[r.it];
    addItem(r.it, r.hold - put); c.inc -= r.n; r.hold = 0; r.st = 3;
  } else { d.free++; return false; }
  return true;
}
// gebouw weg: drones die erheen vliegen keren om
function dronesLost(b) {
  for (const r of G.drones) {
    if (r.d === b.id || r.st === 3) continue;                         // dok weg: updDrone ruimt op
    if (r.src === b.id || r.dst === b.id) { const c = G.bmap.get(r.dst); if (c && c !== b) c.inc -= r.n; addItem(r.it, r.hold); r.hold = 0; r.st = 3; }
  }
}
function logiAfterLoad() {
  for (const b of G.bmap.values()) if (b.type === 'chestR') b.inc = 0;
  for (const r of G.drones) if (r.st < 3) { const c = G.bmap.get(r.dst); if (c) c.inc += r.n; }
}

function updLogi(dt) {
  updSignals(dt);
  for (const L of G.lorries) { const s = G.bmap.get(L.sid); if (s && s.lorry === L) s.lorry = null; }
  for (const L of G.lorries) updLorry(L, dt);
  for (const b of G.bmap.values()) if (b.type === 'dock') updDock(b, dt);
  G.drones = G.drones.filter(r => updDrone(r, dt));
}

// ---------- paneel-acties ----------
function logiAct(b, act, v) {
  if (act === 'cond-on') b.cond = { it: 'ironPlate', op: '<', n: 50 };
  else if (act === 'cond-off') b.cond = null;
  else if (act === 'cond-it' && b.cond && v) b.cond.it = v;
  else if (act === 'cond-op' && b.cond) b.cond.op = b.cond.op === '<' ? '>' : '<';
  else if (act === 'cond-n' && b.cond) b.cond.n = Math.max(0, b.cond.n + +v);
  else if (act === 'req-it') b.req = v ? { it: v, n: b.req ? b.req.n : 20 } : null;
  else if (act === 'req-n' && b.req) b.req.n = Math.max(1, Math.min(CHEST_CAP, b.req.n + +v));
  else if (act === 'mode') b.mode = v;
  else return false;
  return true;
}
function itemPick(act, cur, none) {
  return `<div class="fgrid">${none ? `<button data-act="${act}" data-v="" class="${cur ? '' : 'on'}">—</button>` : ''}` + ITEM_ORDER.map(k => `<button data-act="${act}" data-v="${k}" class="${cur === k ? 'on' : ''}" title="${ITEMS[k].n}"><img src="${itemIcon(k)}"></button>`).join('') + '</div>';
}
function condHTML(b) {
  if (!G.tech.logi2) return '';
  let h = '<p class="dim">Voorwaarde (schakelnet): werkt alleen als het stroomnet zoveel in kisten en kern heeft.</p>';
  if (!b.cond) return h + `<button class="act" data-act="cond-on">Voorwaarde instellen</button>`;
  const c = b.cond, v = sigVal(b, c.it);
  h += `<div class="row"><span>${ITEMS[c.it].n} in net</span><b class="${condOK(b) ? '' : 'bad'}">${v}</b></div>`;
  h += `<div class="cond"><button data-act="cond-op">${c.op === '<' ? 'minder dan' : 'meer dan'}</button>`;
  for (const s of [-50, -10]) h += `<button data-act="cond-n" data-v="${s}">${s}</button>`;
  h += `<b>${c.n}</b>`;
  for (const s of [10, 50]) h += `<button data-act="cond-n" data-v="${s}">+${s}</button>`;
  h += '</div>' + itemPick('cond-it', c.it, false);
  if (!(b.net >= 0)) h += '<p class="warn">Niet aan een stroomnet: zet een stroompaal in de buurt.</p>';
  else if (!condOK(b)) h += '<p class="warn">Voorwaarde niet waar: staat stil.</p>';
  return h + `<button class="act" data-act="cond-off">Voorwaarde weg</button>`;
}
const lrow = (it, n, label) => `<div class="row"><img src="${itemIcon(it)}"><span>${label || ITEMS[it].n}</span><b>${n}</b></div>`;
function logiInfo(b) {
  let h = '';
  switch (b.type) {
    case 'counter':
      h += `<div class="row"><span>Per minuut</span><b>${counterRate(b)}</b></div>` + (b.last ? `<div class="row"><span>Laatste</span><b>${ITEMS[b.last].n}</b></div>` : '');
      h += condHTML(b); break;
    case 'chestR': {
      h += `<div class="row"><span>Gevuld</span><b>${b.n}/${CHEST_CAP}</b></div>`;
      for (const k in b.inv) h += lrow(k, b.inv[k]);
      h += '<p class="dim">Vraag (drones vullen aan tot):</p>' + itemPick('req-it', b.req && b.req.it, true);
      if (b.req) h += `<div class="cond"><button data-act="req-n" data-v="-10">-10</button><button data-act="req-n" data-v="-1">-1</button><b>${b.req.n}</b><button data-act="req-n" data-v="1">+1</button><button data-act="req-n" data-v="10">+10</button></div>` + (b.inc ? `<p class="dim">${b.inc} onderweg</p>` : '');
      if (![...G.bmap.values()].some(d => d.type === 'dock' && inDock(d, b))) h += `<p class="warn">Geen drone-dok binnen ${DOCK.r} tegels.</p>`;
      if (b.n) h += `<button class="act" data-act="empty">Leeghalen naar voorraad</button>`;
      break;
    }
    case 'chestP':
      h += `<div class="row"><span>Gevuld</span><b>${b.n}/${CHEST_CAP}</b></div>`;
      for (const k in b.inv) h += lrow(k, b.inv[k]);
      if (b.n) h += `<button class="act" data-act="empty">Leeghalen naar voorraad</button>`;
      break;
    case 'dock': {
      const busy = DOCK.n - b.free, reqs = [...G.bmap.values()].filter(c => c.type === 'chestR' && inDock(b, c)).length;
      h += `<div class="row"><span>Drones onderweg</span><b>${busy}/${DOCK.n}</b></div><div class="row"><span>Vraagkisten in bereik</span><b>${reqs}</b></div>`;
      h += `<p class="dim">Haalt uit aanbodkisten, en anders uit de kern als die binnen ${DOCK.r} tegels staat.</p>`;
      break;
    }
    case 'station': {
      const L = b.lorry;
      h += '<p class="dim">Vertrekt als de lorrie:</p><div class="cond">' + [['rust', `${LORRY.rest} s niets doet`], ['vol', 'vol is'], ['leeg', 'leeg is']].map(([k, n]) => `<button data-act="mode" data-v="${k}" class="${b.mode === k ? 'on' : ''}">${n}</button>`).join('') + '</div>';
      if (L) { h += `<div class="row"><span>Lorrie</span><b>${L.n}/${LORRY.cap}</b></div>`; for (const k in L.inv) h += lrow(k, L.inv[k]); }
      else h += '<p class="dim">Geen lorrie op dit station.</p>';
      h += '<p class="dim">Lorries rijden om de beurt naar elk station dat ze kunnen bereiken. Zet grijparmen naast het station om te laden of te lossen.</p>';
      break;
    }
    case 'rail': h += `<p class="dim">${G.lorries.length} lorrie(s) op het spoor. Rechtsklik op een lorrie = weghalen.</p>`; break;
  }
  return h;
}
