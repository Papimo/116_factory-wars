'use strict';
// Stijl 4A voor logistiek 2: lange arm, weegschaal, spoor, station, lorrie, drone-dok, aanbod-/vraagkist, drones.
Object.assign(MAPCOL, { arm2: '#d9b44a', counter: '#5a4630', rail: '#4a4038', station: '#c9a227', dock: '#5f8f86', chestP: '#5f8f86', chestR: '#c47a44' });
const BALLAST = '#5d5348', SLEEPER = '#4a3424', RAILC = '#a9b2b9';

function railMask(x, y) { let m = 0; for (let d = 0; d < 4; d++) { const n = G && bAt(x + DX[d], y + DY[d]); if (n && isRail(n)) m |= 1 << d; } return m; }
function railD(c, x, y, m, S, det) {
  const cx = x * T + 16, cy = y * T + 16;
  if (!m) m = 5;                                   // los stuk: oost-west
  else if (m === 1 || m === 4) m = 5; else if (m === 2 || m === 8) m = 10;   // eindstuk: doortrekken
  c.fillStyle = BALLAST; c.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);
  if (det !== false) { c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 6; i++) { const h = (x * 7 + y * 13 + i * 5) % 26; c.fillRect(x * T + 3 + h, y * T + 3 + (h * 7 + i * 11) % 26, 2, 2); } }
  for (let d = 0; d < 4; d++) if (m & 1 << d) {
    c.save(); c.translate(cx, cy); c.rotate(d * Math.PI / 2);
    c.fillStyle = SLEEPER; for (const sx of [3, 11]) { c.fillRect(sx, -12, 4.5, 24); }
    c.fillStyle = S.ink; c.fillRect(-7, -9, 23, 3.6); c.fillRect(-7, 5.4, 23, 3.6);
    c.fillStyle = RAILC; c.fillRect(-7, -8.6, 23, 2); c.fillRect(-7, 5.8, 23, 2);
    c.restore();
  }
  c.fillStyle = SLEEPER; c.fillRect(cx - 12, cy - 2.2, 24, 4.4);
}
// lange arm: twee delen, reikt 2 tegels
function arm2D(c, b, S, det) {
  const cx = b.x * T + 16, cy = b.y * T + 16;
  c.fillStyle = S.ink; circ(c, cx, cy, 10.5); c.fill();
  c.fillStyle = shade(S.metal, -.3); circ(c, cx, cy, 9.4); c.fill();
  c.strokeStyle = S.accent; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 7, 0, 6.283); c.stroke();
  c.save(); c.translate(cx, cy); c.rotate(b.rot * Math.PI / 2); c.fillStyle = S.accent; poly(c, [[11, -3], [15, 0], [11, 3]]); c.fill(); c.strokeStyle = S.ink; c.lineWidth = .7; c.stroke(); c.restore();
  const a = (b.rot + 2) * Math.PI / 2 + (b.sw || 0) * Math.PI, L = 40 - Math.sin((b.sw || 0) * Math.PI) * 14, mx = cx + Math.cos(a) * L * .5, my = cy + Math.sin(a) * L * .5, tx = cx + Math.cos(a) * L, ty = cy + Math.sin(a) * L;
  c.lineCap = 'round';
  c.strokeStyle = S.ink; c.lineWidth = 7; c.beginPath(); c.moveTo(cx, cy); c.lineTo(mx, my); c.stroke();
  c.strokeStyle = S.hazard || '#c9a227'; c.lineWidth = 4.6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(mx, my); c.stroke();
  c.strokeStyle = S.ink; c.lineWidth = 4.6; c.beginPath(); c.moveTo(mx, my); c.lineTo(tx, ty); c.stroke();
  c.strokeStyle = S.metal; c.lineWidth = 2.6; c.beginPath(); c.moveTo(mx, my); c.lineTo(tx, ty); c.stroke(); c.lineCap = 'butt';
  c.save(); c.translate(tx, ty); c.rotate(a); c.strokeStyle = S.ink; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(0, -3.5); c.lineTo(4, -3.5); c.moveTo(0, 3.5); c.lineTo(4, 3.5); c.moveTo(0, -3.5); c.lineTo(0, 3.5); c.stroke(); c.restore();
  if (b.hold && det !== false) c.drawImage(itemSprite(b.hold), tx - 6, ty - 6, 12, 12);
  c.fillStyle = S.ink; circ(c, mx, my, 2.6); c.fill(); c.fillStyle = S.metal; circ(c, mx, my, 1.6); c.fill();
  c.fillStyle = S.ink; circ(c, cx, cy, 3.6); c.fill(); c.fillStyle = S.accent; circ(c, cx, cy, 2.3); c.fill();
}
function lorryD(c, x, y, ang, L, S) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = S.ink; for (const [wx, wy] of [[-9, -11], [5, -11], [-9, 8], [5, 8]]) rr(c, wx, wy, 5, 3, 1), c.fill();
  c.fillStyle = S.ink; rr(c, -14, -10, 28, 20, 3); c.fill();
  c.fillStyle = shade(S.metal, -.25); rr(c, -13, -9, 26, 18, 2.5); c.fill();
  c.fillStyle = '#1e1a15'; rr(c, -10, -6.5, 20, 13, 2); c.fill();
  if (L && L.n > 0) {
    let best = null, bn = 0; for (const k in L.inv) if (L.inv[k] > bn) { bn = L.inv[k]; best = k; }
    const I = ITEMS[best], f = Math.min(1, L.n / LORRY.cap);
    c.fillStyle = I.d; rr(c, -9, -5.5, 18, 11, 4); c.fill();
    c.fillStyle = I.c; c.beginPath(); c.ellipse(0, 0, 5 + f * 4, 3 + f * 2.2, 0, 0, 6.283); c.fill();
    c.fillStyle = I.h; circ(c, -1.5, -1.2, 1.6 + f); c.fill();
  }
  c.fillStyle = S.accent; c.fillRect(-13, -9, 2.4, 18); c.fillRect(10.6, -9, 2.4, 18);
  c.restore();
}

Object.assign(VEC, {
  arm2(c, b, S, rt, det) { arm2D(c, b, S, det); },
  counter(c, b, S, rt, det) {
    c.save(); c.translate(b.x * T + 16, b.y * T + 16); c.rotate(b.rot * Math.PI / 2);
    c.fillStyle = S.beltBed; c.fillRect(-16, -11, 32, 22);
    c.save(); c.beginPath(); c.rect(-16, -11, 32, 22); c.clip(); c.strokeStyle = S.beltTread; c.lineWidth = 2.4;
    const o = ((G ? G.time : 0) * beltSpd() * T) % 16;
    for (let i = -24 + o; i < 26; i += 16) { c.beginPath(); c.moveTo(i - 5, -9); c.lineTo(i + 1, 0); c.lineTo(i - 5, 9); c.stroke(); }
    c.restore();
    c.fillStyle = S.metal; c.fillRect(-16, -15, 32, 4); c.fillRect(-16, 11, 32, 4);
    // brug met teller
    c.fillStyle = S.ink; rr(c, -5, -16, 10, 32, 2); c.fill(); c.fillStyle = shade(S.paint, -.1); rr(c, -4, -15, 8, 30, 1.5); c.fill();
    c.fillStyle = '#10100c'; rr(c, -3, -6, 6, 12, 1); c.fill();
    c.restore();
    const cx = b.x * T + 16, cy = b.y * T + 16, on = b.cond ? condOK(b) : true;
    c.fillStyle = on ? '#8ad06a' : '#e0533a'; circ(c, cx, cy, 1.8); c.fill();
    if (b.hold && det !== false) c.drawImage(itemSprite(b.hold), cx - 5, cy - 5 + (b.rot % 2 ? 0 : -9), 10, 10);
  },
  rail(c, b, S, rt, det) { railD(c, b.x, b.y, railMask(b.x, b.y), S, det); },
  station(c, b, S, rt, det) {
    const m = railMask(b.x, b.y), hor = !(m & 10) || !!(m & 5), X = b.x * T, Y = b.y * T;
    c.fillStyle = shade(S.metal, -.45); c.fillRect(X, Y, T, T);
    railD(c, b.x, b.y, m, S, det);
    if (hor) { hazardD(c, X, Y, T, 4, S); hazardD(c, X, Y + T - 4, T, 4, S); }
    else { hazardD(c, X, Y, 4, T, S); hazardD(c, X + T - 4, Y, 4, T, S); }
    c.fillStyle = S.ink; circ(c, X + 4, Y + 4, 3.4); c.fill(); c.fillStyle = S.accent; circ(c, X + 4, Y + 4, 2.4); c.fill();
  },
  lorry(c, b, S) { lorryD(c, b.x * T + 16, b.y * T + 16, b.dir !== undefined ? b.dir : (b.rot || 0) * Math.PI / 2, b.inv ? b : null, S); },
});

Object.assign(DS, {
  arm2(g, w, h, S) { arm2D(g, { x: 0, y: 0, rot: 0, sw: .5 }, S, false); },
  counter(g, w, h, S) { VEC.counter(g, { x: 0, y: 0, rot: 0 }, S, 0, false); },
  rail(g, w, h, S) { railD(g, 0, 0, 5, S, true); },
  station(g, w, h, S) { g.fillStyle = shade(S.metal, -.45); g.fillRect(0, 0, w, h); railD(g, 0, 0, 5, S, true); hazardD(g, 0, 0, w, 4, S); hazardD(g, 0, h - 4, w, 4, S); },
  lorry(g, w, h, S) { lorryD(g, 16, 16, 0, null, S); },
  chestP(g, w, h, S) { DS.chest(g, w, h, S); g.fillStyle = MAPCOL.chestP; g.fillRect(4, h / 2 - 2, w - 8, 4); g.fillStyle = S.ink; g.fillRect(4, h / 2 + 2, w - 8, .8); },
  chestR(g, w, h, S) { DS.chest(g, w, h, S); g.fillStyle = MAPCOL.chestR; g.fillRect(4, h / 2 - 2, w - 8, 4); g.fillStyle = S.ink; g.fillRect(4, h / 2 + 2, w - 8, .8); },
  dock(g, w, h, S) {
    plateD(g, 2, 2, w - 4, h - 4, 7, shade(S.metal, -.35), S, { seed: 61, r: 4 });
    const cx = w / 2, cy = h / 2 - 3;
    g.fillStyle = S.ink; circ(g, cx, cy, 19); g.fill(); g.fillStyle = '#2a2722'; circ(g, cx, cy, 18); g.fill();
    g.strokeStyle = S.accent; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 15, 0, 6.283); g.stroke();
    g.fillStyle = S.accent; g.fillRect(cx - 7, cy - 8, 3, 16); g.fillRect(cx + 4, cy - 8, 3, 16); g.fillRect(cx - 4, cy - 1.5, 8, 3);
    for (const [px, py] of [[8, 8], [w - 8, 8], [8, h - 12], [w - 8, h - 12]]) { g.fillStyle = S.ink; circ(g, px, py, 4.4); g.fill(); g.fillStyle = MAPCOL.dock; circ(g, px, py, 3.4); g.fill(); }
    hazardD(g, 6, h - 9, w - 12, 4, S);
  },
});
Object.assign(DSH, {
  arm2: () => [[6, g => { circ(g, 16, 16, 10); g.fill(); }]],
  counter: () => [], rail: () => [], station: () => [], lorry: () => [],
  chestP: (w, h) => [[9, g => { g.fillRect(3, 3, w - 6, h - 6); }]],
  chestR: (w, h) => [[9, g => { g.fillRect(3, 3, w - 6, h - 6); }]],
  dock: (w, h) => [[8, g => { rr(g, 2, 2, w - 4, h - 4, 4); g.fill(); }]],
});

// ---------- per beeld: spoor onder alles, lorries boven gebouwen, drones in de lucht ----------
function drawGround(list, S, mid, det) {
  if (!mid) { for (const b of list) { ctx.fillStyle = MAPCOL[b.type]; ctx.fillRect(b.x * T + 4, b.y * T + 4, T - 8, T - 8); } return; }
  for (const b of list) VEC[b.type](ctx, b, S, 0, det);
}
function drawLorries(vis, S) {
  for (const L of G.lorries) if (vis((L.x + .5) * T, (L.y + .5) * T, T)) {
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse((L.x + .5) * T + S.sx * 4, (L.y + .5) * T + S.sy * 4, 15, 11, L.dir, 0, 6.283); ctx.fill();
    lorryD(ctx, (L.x + .5) * T, (L.y + .5) * T, L.dir, L, S);
  }
}
function drawDrones(vis, S, rt) {
  for (const r of G.drones) {
    const X = r.x * T, Y = r.y * T; if (!vis(X, Y, T)) continue;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; circ(ctx, X + S.sx * 14, Y + S.sy * 14, 6); ctx.fill();
    const bob = Math.sin(rt * 9 + r.x) * 1.2;
    ctx.save(); ctx.translate(X, Y + bob); ctx.rotate(r.ang);
    if (r.hold) ctx.drawImage(itemSprite(r.it), -5, -5, 10, 10);
    ctx.strokeStyle = S.ink; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6); ctx.stroke();
    for (const [px, py] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) { ctx.fillStyle = 'rgba(220,210,190,.35)'; circ(ctx, px, py, 4); ctx.fill(); ctx.strokeStyle = S.ink; ctx.lineWidth = .8; ctx.stroke(); }
    ctx.fillStyle = S.ink; circ(ctx, 0, 0, 3.8); ctx.fill(); ctx.fillStyle = S.accent; circ(ctx, 0, 0, 2.6); ctx.fill();
    ctx.restore();
  }
}
// voorwaarde niet waar → klein stopteken
function drawOff(L, rt) {
  for (const b of L) if (b.off) {
    const x = (b.x + b.w) * T - 6, y = b.y * T + 6;
    ctx.fillStyle = S4.ink; circ(ctx, x, y, 4.5); ctx.fill(); ctx.fillStyle = '#e0533a'; circ(ctx, x, y, 3.4); ctx.fill();
    ctx.fillStyle = '#fff6e0'; ctx.fillRect(x - 2, y - .7, 4, 1.4);
  }
}
function drawDockRange() {
  const d = G.sel && G.sel.type === 'dock' ? G.sel : null;
  if (!d && G.tool !== 'dock' && G.tool !== 'chestR' && G.tool !== 'chestP') return;
  ctx.strokeStyle = 'rgba(95,143,134,.85)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2 / Math.min(1, cam.z);
  for (const b of G.bmap.values()) if (b === d || (!d && b.type === 'dock')) ctx.strokeRect((b.x + 1 - DOCK.r) * T, (b.y + 1 - DOCK.r) * T, 2 * DOCK.r * T, 2 * DOCK.r * T);
  ctx.setLineDash([]);
}
