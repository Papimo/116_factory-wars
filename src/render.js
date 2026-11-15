'use strict';
// Tekenen (stijl 4A): vaste sprites uit theme.js, bewegende delen per frame, schaduwlaag, zoomniveaus + kaartmodus.
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
let DPR = 1, VW = 0, VH = 0;
const cam = { x: 0, y: 0, z: 1 };
function resize() { DPR = Math.min(1.5, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight; cv.width = VW * DPR | 0; cv.height = VH * DPR | 0; cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; }
addEventListener('resize', resize); resize();

// ---------- spullen ----------
const ISPR = {};
function itemSprite(it) {
  if (ISPR[it]) return ISPR[it];
  const c = mk(32, 32), g = c.getContext('2d'); g.scale(2, 2); itemShape(g, it);
  return ISPR[it] = c;
}
function itemShape(g, it) {
  const I = ITEMS[it];
  g.lineWidth = .8;
  if (I.k === 'chunk') {
    const R = mulberry(it.length * 31 + it.charCodeAt(0)), pts = [];
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, r = 4.6 + R() * 1.8; pts.push([8 + Math.cos(a) * r, 8.5 + Math.sin(a) * r * .85]); }
    poly(g, pts.map(p => [p[0] + .6, p[1] + 1])); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    poly(g, pts); g.fillStyle = I.c; g.fill(); g.strokeStyle = I.d; g.stroke();
    poly(g, pts.map(p => [8 + (p[0] - 8) * .55 - 1.2, 8.5 + (p[1] - 8.5) * .5 - 1.4])); g.fillStyle = I.h; g.globalAlpha = .55; g.fill(); g.globalAlpha = 1;
    g.fillStyle = I.s; for (let i = 0; i < 3; i++) g.fillRect(5 + R() * 6, 6 + R() * 5, 1.3, 1.3);
  } else if (I.k === 'plate') {
    rr(g, 3.1, 5.3, 11, 8, 1.5); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    rr(g, 2.5, 4.5, 11, 8, 1.5); g.fillStyle = I.c; g.fill(); g.strokeStyle = I.d; g.stroke();
    rr(g, 3.5, 5.3, 9, 2, 1); g.fillStyle = I.h; g.fill();
  } else if (I.k === 'brick') {
    rr(g, 2.6, 5.6, 12, 7, 1); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    rr(g, 2, 5, 12, 7, 1); g.fillStyle = I.c; g.fill(); g.strokeStyle = I.d; g.stroke();
    g.fillStyle = I.h; g.fillRect(3, 6, 10, 1.4); g.fillStyle = I.d; g.fillRect(8, 8.5, .8, 3);
  } else if (I.k === 'gear') {
    g.save(); g.translate(8, 8);
    g.fillStyle = I.c; for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.fillRect(-1.4, -6.8, 2.8, 3); }
    circ(g, 0, 0, 5); g.fill(); g.strokeStyle = I.d; g.stroke();
    g.fillStyle = I.h; g.beginPath(); g.arc(0, 0, 3.8, Math.PI, Math.PI * 1.5); g.lineTo(0, 0); g.fill();
    g.fillStyle = I.d; circ(g, 0, 0, 1.7); g.fill();
    g.restore();
  } else if (I.k === 'ammo') {
    for (let i = 0; i < 3; i++) { const x = 4.3 + i * 2.8; rr(g, x, 2.6, 2, 5, [1, 1, 0, 0]); g.fillStyle = I.h; g.fill(); g.fillStyle = '#9a7424'; g.fillRect(x, 2.6, 2, 1.2); }
    rr(g, 3, 7, 10, 6.5, 1); g.fillStyle = I.c; g.fill(); g.strokeStyle = I.d; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(4, 8, 8, 1.2);
  } else if (ITEM_SHAPES[I.k]) ITEM_SHAPES[I.k](g, I);
  else if (I.k === 'kit') {
    rr(g, 3.4, 4.6, 10, 10, 1.5); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    rr(g, 2.8, 3.8, 10, 10, 1.5); g.fillStyle = '#b49b72'; g.fill(); g.strokeStyle = '#5e4a30'; g.stroke();
    g.fillStyle = I.c; g.fillRect(2.8, 7.2, 10, 3.2); g.fillStyle = I.h; g.fillRect(2.8, 7.2, 10, 1);
    g.fillStyle = I.d; circ(g, 7.8, 8.8, 1.6); g.fill(); g.fillStyle = 'rgba(255,255,240,.35)'; g.fillRect(4, 4.8, 7, 1);
  }
}

// Bocht: geen band die van achteren invoert, wel precies één van opzij → teken als bocht.
function feeds(x, y, dir) { const t = bAt(x, y); return t && t.type === 'belt' && t.rot === dir; }
function beltCurve(b) {
  const r = b.rot, back = (r + 2) % 4;
  if (feeds(b.x + DX[back], b.y + DY[back], r)) return 0;
  const l = (r + 3) % 4, R = (r + 1) % 4;               // links/rechts van de looprichting
  const fromL = feeds(b.x + DX[l], b.y + DY[l], R), fromR = feeds(b.x + DX[R], b.y + DY[R], l);
  return fromL && !fromR ? -1 : fromR && !fromL ? 1 : 0;
}
function bar(x, y, w, frac, col) {
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, frac), 3);
}


// ---------- zoom ----------
// Detailniveaus: ≥55% alles; ≥30% zonder rook/spullen/bewegende delen; <42% dikke inktrand; 30%→20% overgang naar kaart + stromen.
const ZMIN = .15, ZMAX = 2.6;

// ---------- gebouwen: vaste sprite + bewegende delen ----------
function blink(rt, x, y, col, r = 2.5) { if ((rt * 2 | 0) % 2) return; ctx.fillStyle = col; circ(ctx, x, y, r); ctx.fill(); }
function drawBuilding(b, rt, det, mid, sc) {
  const S = S4, X = b.x * T, Y = b.y * T, w = b.w * T, h = b.h * T;
  if (BUILD[b.type].vec && mid) { VEC[b.type](ctx, b, S, rt, det); return; }
  ctx.drawImage(sc >= 1.5 ? dSprite(b.type) : mipSprite(b.type, sc), X, Y, w, h);
  if (!mid) {
    if (b.type === 'turret' || b.type === 'core') { const gx = X + w / 2, gy = Y + h / 2 - (b.type === 'core' ? 6 : 0); ctx.strokeStyle = S.ink; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(b.ang) * 26, gy + Math.sin(b.ang) * 26); ctx.stroke(); }
    return;
  }
  switch (b.type) {
    case 'drill': {
      if (det) {
        ctx.save(); ctx.translate(X + w / 2 - 2, Y + h / 2 - 4); ctx.rotate(b.spin);
        for (let q = 0; q < 3; q++) { ctx.rotate(2.094); ctx.fillStyle = shade(S.metal, .1); poly(ctx, [[3, -2.8], [13, -5], [13, 5], [3, 2.8]]); ctx.fill(); ctx.strokeStyle = S.ink; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = S.accent; ctx.fillRect(11, -4.5, 2, 9); }
        ctx.fillStyle = S.metal; circ(ctx, 0, 0, 5.5); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,246,225,.35)'; circ(ctx, -1.5, -1.5, 2); ctx.fill(); ctx.restore();
      }
      chuteD(ctx, b, S);
      if (b.empty) blink(rt, X + 9, Y + 8, '#e0533a', 2); else if (b.hold) blink(rt, X + 9, Y + 8, '#ffc533', 2);
      else { ctx.fillStyle = '#ffd27a'; circ(ctx, X + 9, Y + 8, 1.8); ctx.fill(); }
      break;
    }
    case 'furnace': {
      if (b.cur && det) {
        const fl = .75 + Math.sin(rt * 17 + b.id) * .12 + Math.sin(rt * 7.3) * .1, fx = X + w / 2, fy = Y + h - 15;
        ctx.fillStyle = `rgba(255,${110 + fl * 70 | 0},40,${.9 * fl})`; rr(ctx, fx - 9, fy - 6.5, 18, 12.5, [7, 7, 1, 1]); ctx.fill();
        ctx.strokeStyle = 'rgba(30,14,6,.85)'; ctx.lineWidth = 1.3; for (let q = -6; q <= 6; q += 4) { ctx.beginPath(); ctx.moveTo(fx + q, fy - 6); ctx.lineTo(fx + q, fy + 6); ctx.stroke(); }
        glow(ctx, fx, fy + 2, 22, '255,150,60', .35 * fl);
      }
      chuteD(ctx, b, S);
      if (b.nofuel) { ctx.globalAlpha *= (rt * 2 | 0) % 2 ? .4 : 1; ctx.drawImage(itemSprite('coal'), X + w / 2 - 8, Y + 24, 16, 16); ctx.globalAlpha = 1; }
      break;
    }
    case 'assembler': {
      const cx = X + w / 2, cy = Y + 27;
      if (det) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(b.spin); ctx.drawImage(itemSprite('gear'), -11, -11, 22, 22); ctx.restore(); }
      ctx.drawImage(itemSprite(RECIPES[b.recipe].out), X + 13, Y + h - 34, 13, 13);
      ctx.fillStyle = b.t > 0 ? '#ffd27a' : b.idle ? '#e0533a' : '#5a4a30'; circ(ctx, X + w - 7, Y + 12, 1.8); ctx.fill();
      chuteD(ctx, b, S);
      break;
    }
    case 'turret':
      gunD(ctx, X + w / 2, Y + h / 2, b.ang, b.flash > 0, S);
      if (b.mags === 0 && b.shots === 0) { ctx.globalAlpha = (rt * 2 | 0) % 2 ? .3 : 1; ctx.drawImage(itemSprite('ammo'), X + w - 18, Y + 2, 16, 16); ctx.globalAlpha = 1; }
      break;
    case 'core':
      gunD(ctx, X + w / 2, Y + h / 2 - 6, b.ang, b.flash > 0, S, .9);
      for (const [x, y] of [[18, 18], [w - 18, 18], [18, h - 30], [w - 18, h - 30]]) blink(rt + x * .01, X + x, Y + y, S.accent, 2);
      break;
    case 'outpost': {
      const x = X + w / 2 + 8, y = Y + h / 2 - 10, p = (rt % 2) / 2;
      ctx.strokeStyle = `rgba(226,87,30,${.6 * (1 - p)})`; ctx.lineWidth = 1.5; circ(ctx, x, y, 3 + p * 16); ctx.stroke();
      blink(rt, x, y, S.accent, 2);
      break;
    }
    case 'boiler':
      if (b.burning && det) { const fl = .75 + Math.sin(rt * 15 + b.id) * .15, fx = X + w / 2, fy = Y + h - 16; ctx.fillStyle = `rgba(255,${120 + fl * 60 | 0},40,${.85 * fl})`; rr(ctx, fx - 10, fy - 5, 20, 10, 2); ctx.fill(); glow(ctx, fx, fy, 20, '255,150,60', .35 * fl); }
      if (!b.fuel && !b.burning) { ctx.globalAlpha *= (rt * 2 | 0) % 2 ? .4 : 1; ctx.drawImage(itemSprite('coal'), X + w / 2 - 8, Y + h / 2 - 12, 16, 16); ctx.globalAlpha = 1; }
      break;
    case 'generator': {
      const cx = X + w / 2 - 7, cy = Y + h / 2 - 4;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(b.spin || 0); ctx.strokeStyle = S.metal; ctx.lineWidth = 2.6;
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke(); }
      ctx.fillStyle = S.ink; circ(ctx, 0, 0, 4.5); ctx.fill(); ctx.fillStyle = S.accent; circ(ctx, 0, 0, 3); ctx.fill(); ctx.restore();
      ctx.fillStyle = b.out > 1 ? '#8cc65a' : b.ketels && b.ketels.length ? '#e5b02a' : '#e0533a'; circ(ctx, X + 9, Y + 9, 2); ctx.fill();
      break;
    }
    case 'lab': {
      const cx = X + w / 2, cy = Y + h / 2 - 4, R = G.res && TECH[G.res];
      if (b.act && det) {
        glow(ctx, cx, cy, 16, R && R.kits.length > 1 ? '120,220,170' : '255,140,90', .45);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(b.spin); ctx.strokeStyle = 'rgba(30,20,12,.8)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, 4); ctx.stroke(); ctx.fillStyle = S.accent; circ(ctx, 8, 0, 2); ctx.fill(); ctx.restore();
      }
      let i = 0; for (const k of KITS) if (b.inv[k] > 0) { ctx.drawImage(itemSprite(k), X + 6 + i * 11, Y + h - 30, 11, 11); i++; }
      break;
    }
    case 'flamer':
      flameGunD(ctx, X + w / 2, Y + h / 2, b.ang, b.fire > 0, S, rt);
      if (b.nofuel || (!b.fuel && b.burn <= 0)) { ctx.globalAlpha = (rt * 2 | 0) % 2 ? .3 : 1; ctx.drawImage(itemSprite('coal'), X + w - 18, Y + 2, 16, 16); ctx.globalAlpha = 1; }
      break;
    default: if (PDRAW[b.type]) PDRAW[b.type](ctx, b, S, rt, det, X, Y, w, h);
  }
  if (b.mods && b.mods.length && det) drawMods(ctx, b);
  // stroom: bliksem als een draaiende machine te weinig krijgt
  if (BUILD[b.type].pw && b.act && det) {
    const n = b.net >= 0 && G.pw.nets[b.net];
    if (!n || n.sat < .999) { if (!(n && n.sat > .5) || (rt * 2 | 0) % 2) boltD(ctx, X + w - 7, Y + 7, n ? '#e5b02a' : '#e0533a', b.w > 1 ? 1 : .7); }
  }
}
function boltD(c, x, y, col, s) {
  c.save(); c.translate(x, y); c.scale(s, s); poly(c, [[1, -7], [-4, 1], [-.5, 1], [-2, 7], [4, -1.5], [.5, -1.5]]);
  c.fillStyle = col; c.fill(); c.strokeStyle = S4.ink; c.lineWidth = 1.2; c.stroke(); c.restore();
}
// Alt-weergave: wat elke machine maakt / bevat
function altIcon(b) {
  switch (b.type) {
    case 'drill': { const M = G.M; for (let k = 0; k < 4; k++) if (M.ore[(b.y + (k >> 1)) * M.W + b.x + (k & 1)] === OIL) continue; else { const m = (b.y + (k >> 1)) * M.W + b.x + (k & 1); if (M.ore[m]) return ORE_KEYS[M.ore[m]]; } return null; }
    case 'furnace': return b.cur || b.outType || (b.ore && SMELT[b.ore]);
    case 'assembler': return RECIPES[b.recipe].out;
    case 'turret': return 'ammo';
    case 'boiler': case 'flamer': return 'coal';
    case 'lab': return G.res ? TECH[G.res].kits[TECH[G.res].kits.length - 1] : null;
    case 'station': b = b.lorry; if (!b) return null; // valt door: grootste voorraad van de lorrie
    case 'chest': case 'chestP': case 'chestR': { if (b.type === 'chestR' && b.req) return b.req.it; let best = null, n = 0; for (const k in b.inv) if (b.inv[k] > n) { n = b.inv[k]; best = k; } return best; }
    case 'arm': case 'arm2': case 'splitter': case 'counter': return b.filter || b.hold || b.last;
  }
  return prodAlt(b);
}
function drawAlt(L) {
  for (const b of L) {
    const it = altIcon(b); if (!it) continue;
    const s = b.w > 1 ? 26 : 16, cx = (b.x + b.w / 2) * T, cy = (b.y + b.h / 2) * T;
    ctx.fillStyle = 'rgba(20,14,10,.78)'; rr(ctx, cx - s / 2 - 3, cy - s / 2 - 3, s + 6, s + 6, 5); ctx.fill();
    if (b.filter) { ctx.strokeStyle = S4.accent; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.drawImage(itemSprite(it), cx - s / 2, cy - s / 2, s, s);
    if (b.type === 'turret' || CHESTS.includes(b.type) || b.type === 'boiler' || b.type === 'flamer' || b.type === 'station' || b.type === 'counter') {
      const n = b.type === 'turret' ? b.mags : CHESTS.includes(b.type) ? b.n : b.type === 'station' ? (b.lorry ? b.lorry.n : 0) : b.type === 'counter' ? counterRate(b) + '/m' : b.fuel;
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#fff6e0'; ctx.textAlign = 'right'; ctx.fillText(n, cx + s / 2 + 2, cy + s / 2 + 2); ctx.textAlign = 'left';
    }
  }
  // banden: looprichting
  ctx.fillStyle = 'rgba(255,214,130,.8)';
  for (const b of G.belts) { const cx = b.x * T + 16, cy = b.y * T + 16; ctx.save(); ctx.translate(cx, cy); ctx.rotate(b.rot * Math.PI / 2); poly(ctx, [[-3, -4], [3, 0], [-3, 4]]); ctx.fill(); ctx.restore(); }
}
// stroomdraden tussen palen (doorhangend, met schaduw)
function drawWires(vis) {
  const S = S4;
  for (const [a, b] of G.pw.edges) {
    if (!G.bmap.has(a.id) || !G.bmap.has(b.id)) continue;
    const [x1, y1] = poleTop(a), [x2, y2] = poleTop(b);
    if (!vis(x1, y1, 9 * T) && !vis(x2, y2, 9 * T)) continue;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 10, o = 14 * S.shK;
    ctx.strokeStyle = 'rgba(84,40,14,.28)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x1 + S.sx * o * 2, y1 + S.sy * o * 2); ctx.quadraticCurveTo(mx + S.sx * o, my + S.sy * o, x2 + S.sx * o * 2, y2 + S.sy * o * 2); ctx.stroke();
    ctx.strokeStyle = '#8a4a24'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
  }
}
function drawSupply(alpha) {
  for (const n of G.pw.nodes) {
    if (!G.bmap.has(n.id)) continue;
    const h = nodeInfo(n).box, cx = n.x + n.w / 2, cy = n.y + n.h / 2;
    ctx.fillStyle = `rgba(140,210,255,${.07 * alpha})`; ctx.fillRect((cx - h) * T, (cy - h) * T, 2 * h * T, 2 * h * T);
    ctx.strokeStyle = `rgba(140,210,255,${.45 * alpha})`; ctx.lineWidth = 1.5 / Math.min(1, cam.z); ctx.strokeRect((cx - h) * T, (cy - h) * T, 2 * h * T, 2 * h * T);
  }
}
function enemyView(e) { return { x: e.x * T, y: e.y * T, ang: e.ang, r: ENEMY[e.type].r * T, anim: e.anim, hit: e.hitT > 0, bite: e.bite > 0 }; }
function itemPos(b, it) {
  const cx = b.x + .5, cy = b.y + .5;
  if (it.p < .5) { const k = 1 - it.p * 2; return [cx - DX[it.d] * .5 * k, cy - DY[it.d] * .5 * k]; }
  const k = (it.p - .5) * 2; return [cx + DX[b.rot] * .5 * k, cy + DY[b.rot] * .5 * k];
}

// ---------- spookbeeld bij bouwen ----------
function ghostTile() { const d = BUILD[G.tool]; return { tx: Math.floor(mouse.wx / T - d.w / 2 + .5), ty: Math.floor(mouse.wy / T - d.h / 2 + .5) }; }
function drawGhost() {
  if (!G.tool || !mouse.in) return;
  const d = BUILD[G.tool], { tx, ty } = ghostTile(), X = tx * T, Y = ty * T, err = canPlace(G.tool, tx, ty);
  ctx.globalAlpha = .65;
  ghostOne(G.tool, tx, ty, G.rot);
  ctx.globalAlpha = 1;
  ctx.fillStyle = err ? 'rgba(220,50,30,.35)' : 'rgba(120,220,90,.18)'; ctx.fillRect(X, Y, d.w * T, d.h * T);
  if (G.tool === 'turret') ring((tx + 1) * T, (ty + 1) * T, TURRET.range * T, 'rgba(255,214,130,.7)');
  if (G.tool === 'flamer') ring((tx + 1) * T, (ty + 1) * T, FLAMER.range * T, 'rgba(255,150,80,.7)');
  if (G.tool === 'pole') { const h = POLE.box; ctx.strokeStyle = 'rgba(140,210,255,.9)'; ctx.lineWidth = 2 / Math.min(1, cam.z); ctx.strokeRect((tx + .5 - h) * T, (ty + .5 - h) * T, 2 * h * T, 2 * h * T); ring((tx + .5) * T, (ty + .5) * T, POLE.reach * T, 'rgba(255,214,130,.6)'); }
  if (G.tool === 'tunnel') {
    // mogelijke partner: eerste tunnel vooruit of achteruit in dezelfde richting
    for (const s of [1, -1]) for (let k = 1; k <= TUN_MAX; k++) { const u = bAt(tx + DX[G.rot] * k * s, ty + DY[G.rot] * k * s); if (u && u.type === 'tunnel') { if (u.rot === G.rot) { ctx.strokeStyle = 'rgba(120,220,90,.9)'; ctx.lineWidth = 2; ctx.strokeRect(u.x * T, u.y * T, T, T); } break; } }
    ctx.strokeStyle = 'rgba(255,214,130,.5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.strokeRect(X + Math.min(0, DX[G.rot]) * TUN_MAX * T, Y + Math.min(0, DY[G.rot]) * TUN_MAX * T, (1 + Math.abs(DX[G.rot]) * TUN_MAX) * T, (1 + Math.abs(DY[G.rot]) * TUN_MAX) * T); ctx.setLineDash([]);
  }
}
function ghostOne(type, tx, ty, rot) {
  const d = BUILD[type], X = tx * T, Y = ty * T;
  if (type === 'belt') beltD(ctx, X + 16, Y + 16, rot, 0, S4);
  else if (d.vec) VEC[type](ctx, { x: tx, y: ty, rot, sw: .5, role: 'in' }, S4, 0, false);
  else ctx.drawImage(dSprite(type), X, Y, d.w * T, d.h * T);
  if (type === 'turret') gunD(ctx, X + T, Y + T, -Math.PI / 2, false, S4);
  if (d.rot && !d.vec && type !== 'belt') chuteD(ctx, { x: tx, y: ty, w: d.w, h: d.h, rot }, S4);
}
// blauwdruk: selectievak of stempel
function drawBlueprint() {
  const z = Math.min(1, cam.z);
  if (G.bpSel) {
    const a = G.bpSel.a, tx = Math.floor(mouse.wx / T), ty = Math.floor(mouse.wy / T), b = a || { x: tx, y: ty }, x0 = Math.min(a ? a.x : tx, tx), y0 = Math.min(b.y, ty), x1 = Math.max(b.x, tx), y1 = Math.max(b.y, ty);
    ctx.fillStyle = 'rgba(90,170,255,.15)'; ctx.fillRect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T);
    ctx.strokeStyle = 'rgba(120,190,255,.95)'; ctx.lineWidth = 2 / z; ctx.setLineDash([8, 5]); ctx.strokeRect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T); ctx.setLineDash([]);
  }
  if (G.stamp && mouse.in) {
    const { ox, oy } = stampOrigin();
    for (const e of G.stamp.items) {
      const d = BUILD[e.type], x = ox + e.x, y = oy + e.y, err = canPlace(e.type, x, y);
      ctx.globalAlpha = .55; ghostOne(e.type, x, y, e.rot); ctx.globalAlpha = 1;
      ctx.fillStyle = !err ? 'rgba(90,170,255,.22)' : err === 'Hier staat al iets' ? 'rgba(255,255,255,.08)' : 'rgba(220,50,30,.35)'; ctx.fillRect(x * T, y * T, d.w * T, d.h * T);
    }
    ctx.strokeStyle = 'rgba(120,190,255,.8)'; ctx.lineWidth = 1.5 / z; ctx.strokeRect(ox * T, oy * T, G.stamp.w * T, G.stamp.h * T);
  }
}
function ring(x, y, r, col, fill) {
  const z = cam.z; ctx.setLineDash([8 / Math.max(z, .5), 6 / Math.max(z, .5)]); ctx.strokeStyle = col; ctx.lineWidth = 1.5 / Math.min(1, z); circ(ctx, x, y, r); ctx.stroke(); ctx.setLineDash([]);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}

// ---------- hoofdtekening ----------
let shadowCv = null, sunG = null;

// ---------- voorgetekende sprites (snelheid): banden en kruipers één keer tekenen, daarna alleen plakken ----------
const SPR_RES = 2, BELT_STEPS = 32, BUG_FR = 8, beltCache = new Map(), bugCache = new Map();
function beltSpr(rot, side, off) {
  const f = (((off % 16) + 16) % 16 / 16 * BELT_STEPS | 0) % BELT_STEPS, key = rot * 1000 + (side + 1) * 100 + f;
  let c = beltCache.get(key);
  if (!c) {
    c = mk(T * SPR_RES, T * SPR_RES); const g = c.getContext('2d'), o = f / BELT_STEPS * 16; g.scale(SPR_RES, SPR_RES);
    if (side) beltCurveD(g, { x: 0, y: 0, rot }, side, o, S4); else beltD(g, 16, 16, rot, o, S4);
    beltCache.set(key, c);
  }
  return c;
}
// kruiper: 8 loopstanden (pootcyclus = π), los van draaiing; glans apart want die hangt aan de zon
function bugFast(e, S, B) {
  const r = ENEMY[e.type].r * T, hit = e.hitT > 0, bite = e.bite > 0;
  const f = (((e.anim / Math.PI * BUG_FR) % BUG_FR) + BUG_FR) % BUG_FR | 0, key = e.type + '|' + f + (hit ? 'h' : '') + (bite ? 'b' : '');
  let s = bugCache.get(key);
  if (!s) {
    const R = Math.ceil(r * 2.05) + 2; s = { c: mk(R * 2 * SPR_RES, R * 2 * SPR_RES), R };
    const g = s.c.getContext('2d'); g.scale(SPR_RES, SPR_RES);
    bugD(g, { x: R, y: R, ang: 0, r, anim: f * Math.PI / BUG_FR, hit, bite }, S, B, true);
    bugCache.set(key, s);
  }
  const x = e.x * T, y = e.y * T, ca = Math.cos(e.ang), sa = Math.sin(e.ang);
  ctx.save(); ctx.transform(ca, sa, -sa, ca, x, y);
  ctx.drawImage(s.c, -s.R, -s.R, s.R * 2, s.R * 2);
  bugSheen(ctx, { ang: e.ang, r }, S, B);
  ctx.restore();
}
function draw() {
  const W = cv.width, H = cv.height, K = cam.z * DPR, z = cam.z, S = S4;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#5a4030'; ctx.fillRect(0, 0, W, H);
  if (!G) return;
  const M = G.M, rt = performance.now() / 1000;
  const vx0 = cam.x - W / 2 / K, vy0 = cam.y - H / 2 / K, vx1 = cam.x + W / 2 / K, vy1 = cam.y + H / 2 / K;
  const vis = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
  const det = z >= .55, mid = z >= .3, thick = z < .42, mapF = smooth(.3, .2, z), dA = 1 - mapF;
  ctx.setTransform(K, 0, 0, K, W / 2 - cam.x * K, H / 2 - cam.y * K); ctx.imageSmoothingQuality = 'medium';

  // terrein (stukken worden lui gebouwd: eerst wat in beeld is, daarna één per beeld op de achtergrond)
  if (mapF < 1) {
    const budget = { n: G.ter.first ? 99 : 2 }; G.ter.first = false; const SZ = ZC * T;
    for (let cj = Math.max(0, Math.floor(vy0 / SZ)); cj <= Math.min(G.ter.ny - 1, Math.floor(vy1 / SZ)); cj++)
      for (let ci = Math.max(0, Math.floor(vx0 / SZ)); ci <= Math.min(G.ter.nx - 1, Math.floor(vx1 / SZ)); ci++) {
        const ch = getChunk(ci, cj, budget);
        if (ch) ctx.drawImage(ch.c, ci * SZ, cj * SZ, ch.c.width + .5, ch.c.height + .5);
        else { ctx.fillStyle = rgba(mix(S.sandLo, S.sandHi, .5), 1); ctx.fillRect(ci * SZ, cj * SZ, Math.min(SZ, (M.W - ci * ZC) * T), Math.min(SZ, (M.H - cj * ZC) * T)); }
      }
    if (budget.n > 0) outer: for (let cj = 0; cj < G.ter.ny; cj++) for (let ci = 0; ci < G.ter.nx; ci++) { const ch = G.ter.ch.get(ci + ',' + cj); if (!ch || ch.dirty) { getChunk(ci, cj, { n: 1 }); break outer; } }
  }
  if (mapF > 0) { ctx.globalAlpha = mapF; ctx.imageSmoothingEnabled = false; ctx.drawImage(G.ter.zmap, 0, 0, M.W * T, M.H * T); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1; }

  const L = [], belts = [], grounds = [];
  for (const b of G.bmap.values()) { if (!vis((b.x + b.w / 2) * T, (b.y + b.h / 2) * T, 3 * T)) continue; (b.type === 'belt' ? belts : BUILD[b.type].ground ? grounds : L).push(b); }

  if (dA > 0) {
    ctx.globalAlpha = dA;
    drawGround(grounds, S, mid, det); drawWrecks(vis, S, mid);
    if (mid) drawTrail(ctx, S);
    // banden + spullen
    const off = (G.time * beltSpeed() * T) % 16;
    if (det) for (const b of belts) ctx.drawImage(beltSpr(b.rot, beltCurve(b), off), b.x * T, b.y * T, T, T);
    else {
      ctx.fillStyle = S.beltBed; for (const b of belts) ctx.fillRect(b.x * T, b.y * T, T, T);
      ctx.fillStyle = S.metal; for (const b of belts) { if (b.rot % 2 === 0) { ctx.fillRect(b.x * T, b.y * T, T, 5); ctx.fillRect(b.x * T, b.y * T + T - 5, T, 5); } else { ctx.fillRect(b.x * T, b.y * T, 5, T); ctx.fillRect(b.x * T + T - 5, b.y * T, 5, T); } }
    }
    if (det) for (const b of belts) for (const it of b.items) { const [x, y] = itemPos(b, it); ctx.drawImage(itemSprite(it.t), x * T - 7, y * T - 7, 14, 14); }
    ctx.globalAlpha = 1;

    // schaduwlaag: alles zwart, één keer inkleuren → geen dubbele schaduw waar ze overlappen
    const SW = Math.ceil(W / 2), SH = Math.ceil(H / 2), K2 = K / 2;
    if (!shadowCv || shadowCv.width !== SW || shadowCv.height !== SH) shadowCv = mk(SW, SH);
    const l = shadowCv.getContext('2d');
    l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, SW, SH); l.setTransform(K2, 0, 0, K2, W / 4 - cam.x * K2, H / 4 - cam.y * K2);
    for (const b of L) { const m = shMask(b.type); l.drawImage(m.c, b.x * T - m.pad, b.y * T - m.pad, m.w, m.h); }
    if (mid) { const go = 16 * S.shK; for (const b of L) { if (b.type === 'turret') gunD(l, (b.x + 1) * T + S.sx * go, (b.y + 1) * T + S.sy * go, b.ang, false, S); else if (b.type === 'core') gunD(l, (b.x + 1.5) * T + S.sx * go * 1.5, (b.y + 1.5) * T - 6 + S.sy * go * 1.5, b.ang, false, S, .9); } }
    l.fillStyle = '#000';
    for (const e of G.enemies) if (vis(e.x * T, e.y * T, T)) { const r = ENEMY[e.type].r * T, L2 = r * S.shK * 1.6; l.beginPath(); l.ellipse(e.x * T + S.sx * L2 * .7, e.y * T + S.sy * L2 * .7, r * 1.1 + L2 * .6, r * .75, Math.atan2(S.sy, S.sx), 0, 7); l.fill(); }
    for (const n of M.nests) if (!n.dead && vis(n.x * T, n.y * T, 4 * T)) nestShadow(l, n, S);
    if (mid) figShadow(l, S);
    l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-in'; l.fillStyle = S.shCol; l.fillRect(0, 0, SW, SH);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = dA; ctx.imageSmoothingEnabled = true; ctx.drawImage(shadowCv, 0, 0, SW * 2, SH * 2); ctx.restore();

    ctx.globalAlpha = dA;
    for (const n of M.nests) if (!n.dead && vis(n.x * T, n.y * T, 4 * T)) nestD(ctx, n, rt, S);
    // gebouwen (ver weg: kleinere sprite + inktrand eronder zodat ze leesbaar blijven)
    L.sort((a, b) => (a.y + a.h) - (b.y + b.h));
    const sc = det ? 1.5 : z >= .25 ? .75 : .375, ow = 2 / z;
    if (thick) { ctx.fillStyle = S.ink; for (const b of L) { if (b.type === 'turret') { circ(ctx, (b.x + 1) * T, (b.y + 1) * T, 29 + ow); ctx.fill(); } else { rr(ctx, b.x * T + 2 - ow, b.y * T + 2 - ow, b.w * T - 4 + 2 * ow, b.h * T - 4 + 2 * ow, 4); ctx.fill(); } } }
    for (const b of L) { drawBuilding(b, rt, det, mid, sc); ctx.globalAlpha = dA; }
    if (mid) { drawWires(vis); drawOff(L, rt); }
    drawLorries(vis, S);
    // kruipers
    for (const e of G.enemies) if (vis(e.x * T, e.y * T, T)) {
      const B = BUGPAL[e.type];
      if (mid) bugFast(e, S, B);
      else { const r = Math.max(ENEMY[e.type].r * T, 2.2 / z); ctx.fillStyle = B.dark; circ(ctx, e.x * T, e.y * T, r * 1.15); ctx.fill(); ctx.fillStyle = B.col; circ(ctx, e.x * T, e.y * T, r * .8); ctx.fill(); ctx.fillStyle = B.glow; circ(ctx, e.x * T, e.y * T, r * .35); ctx.fill(); }
    }
    if (mapF < .5) drawPlayer(ctx, S, z, !mid);
    ctx.globalAlpha = dA; drawDrones(vis, S, rt);
    ctx.globalAlpha = dA;
    // deeltjes + kogelsporen
    for (const p of G.fx) {
      const a = p.life / p.max, X = p.x * T, Y = p.y * T;
      if (p.k === 'smoke') { ctx.fillStyle = rgba(S.smoke, a * .45 * dA); circ(ctx, X, Y, p.sz * T); ctx.fill(); }
      else if (p.k === 'fire') { ctx.fillStyle = `rgba(255,${90 + a * 150 | 0},${a * 60 | 0},${Math.min(1, a * 1.6) * .8 * dA})`; circ(ctx, X, Y, p.sz * T * (1 + (1 - a) * 2.5)); ctx.fill(); }
      else if (p.k === 'flash') { ctx.fillStyle = `rgba(255,180,90,${a * .8 * dA})`; circ(ctx, X, Y, p.sz * T * (1.5 - a)); ctx.fill(); }
      else { ctx.globalAlpha = a * dA; ctx.fillStyle = p.col; const s = p.sz * T; ctx.fillRect(X - s / 2, Y - s / 2, s, s); ctx.globalAlpha = dA; }
    }
    ctx.lineWidth = Math.max(1.5, 1.2 / z);
    for (const t of G.tracers) { ctx.strokeStyle = `rgba(255,226,150,${t.life / .07 * dA})`; ctx.beginPath(); ctx.moveTo(t.x1 * T, t.y1 * T); ctx.lineTo(t.x2 * T, t.y2 * T); ctx.stroke(); }
    // rook uit schoorsteen (oven) en uitlaat (boor)
    if (det) for (const b of L) {
      if (b.type === 'furnace' && b.cur) smokeD(ctx, S, rt, b.x * T + b.w * T - 17, b.y * T + 14, b.id * .37 % 1, 9, 90, 1.3);
      else if (b.type === 'drill' && !b.empty && !b.hold) smokeD(ctx, S, rt, b.x * T + b.w * T - 12, b.y * T + 11, b.id * .37 % 1, 6, 60, 1);
      else if (b.type === 'boiler' && b.burning) smokeD(ctx, S, rt, b.x * T + b.w * T - 12, b.y * T + 10, b.id * .37 % 1, 8, 80, 1.2);
    }
    if (G.alt && mid) drawAlt(L.concat(grounds.filter(b => b.type === 'station')));
    if (mid) {
      for (const b of L) if (b.hp < b.maxhp) bar(b.x * T + 4, b.y * T - 6, b.w * T - 8, b.hp / b.maxhp, b.hp / b.maxhp > .5 ? '#8cc65a' : '#e0533a');
      for (const e of G.enemies) if (e.hp < e.maxhp && vis(e.x * T, e.y * T, T)) { const s = ENEMY[e.type].r * T; bar(e.x * T - s, e.y * T - s - 8, s * 2, e.hp / e.maxhp, '#e0533a'); }
      for (const n of M.nests) if (!n.dead && n.hp < n.maxhp) bar(n.x * T - 40, n.y * T - 56, 80, n.hp / n.maxhp, '#c14fa0');
    }
    ctx.globalAlpha = 1;
  }

  // kaartlaag: effen kleuren, stippen op de banden (= echte spullen), vervuilingswolk, pulserende nesten
  if (mapF > 0) {
    ctx.globalAlpha = mapF;
    ctx.fillStyle = MAPCOL.belt; for (const b of G.belts) { if (b.rot % 2 === 0) ctx.fillRect(b.x * T, b.y * T + 11, T, 10); else ctx.fillRect(b.x * T + 11, b.y * T, 10, T); }
    ctx.fillStyle = '#ffd27a'; const sz = Math.max(8, 2.4 / z);
    for (const b of G.belts) for (const it of b.items) { const [x, y] = itemPos(b, it); ctx.fillRect(x * T - sz / 2, y * T - sz / 2, sz, sz); }
    for (const b of G.bmap.values()) {
      if (b.type === 'belt') continue;
      ctx.fillStyle = MAPCOL[b.type]; ctx.fillRect(b.x * T + 2, b.y * T + 2, b.w * T - 4, b.h * T - 4);
      if (b.type !== 'wall' && b.type !== 'wall2') { ctx.strokeStyle = '#2a1f18'; ctx.lineWidth = 1.5 / z; ctx.strokeRect(b.x * T + 2, b.y * T + 2, b.w * T - 4, b.h * T - 4); }
      if (BUILD[b.type].pw && b.act && pwr(b) < .999) { ctx.strokeStyle = b.net >= 0 ? '#e5b02a' : '#e0533a'; ctx.lineWidth = 3 / z; ctx.strokeRect(b.x * T, b.y * T, b.w * T, b.h * T); }
    }
    ctx.strokeStyle = 'rgba(255,214,130,.85)'; ctx.lineWidth = 2 / z; ctx.beginPath();
    for (const [a, b] of G.pw.edges) { ctx.moveTo((a.x + a.w / 2) * T, (a.y + a.h / 2) * T); ctx.lineTo((b.x + b.w / 2) * T, (b.y + b.h / 2) * T); } ctx.stroke();
    drawSupply(.6);
    const c0 = G.core; if (c0) { ctx.strokeStyle = S.accent; ctx.lineWidth = 3 / z; circ(ctx, (c0.x + 1.5) * T, (c0.y + 1.5) * T, 2.6 * T); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.imageSmoothingEnabled = true; ctx.drawImage(G.pcv, 0, 0, G.pn.nx * ZC * T, G.pn.ny * ZC * T); ctx.restore();
    for (const n of M.nests) {
      if (n.dead) { ctx.fillStyle = '#3a2c22'; circ(ctx, n.x * T, n.y * T, 1.2 * T); ctx.fill(); continue; }
      const smell = pollAt(n.x, n.y) >= 6, p = .5 + .5 * Math.sin(rt * (smell ? 5 : 2.2) + n.seed);
      ctx.fillStyle = '#8a2a14'; circ(ctx, n.x * T, n.y * T, 1.4 * T); ctx.fill(); ctx.strokeStyle = `rgba(200,50,20,${.4 + .5 * p})`; ctx.lineWidth = 3 / z; circ(ctx, n.x * T, n.y * T, (2.4 + p * (smell ? 2.6 : 1.6)) * T); ctx.stroke();
    }
    ctx.fillStyle = '#c0301a'; for (const e of G.enemies) { circ(ctx, e.x * T, e.y * T, Math.max(ENEMY[e.type].r * T, 2.6 / z)); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (mapF >= .5) drawPlayer(ctx, S, z, true);
  }

  // vervuiling zwak in Alt-weergave
  if (G.alt && dA > 0) { ctx.save(); ctx.globalAlpha = .5 * dA; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(G.pcv, 0, 0, G.pn.nx * ZC * T, G.pn.ny * ZC * T); ctx.restore(); }
  // mist van oorlog (1 px per tegel, zacht uitgerekt)
  ctx.imageSmoothingEnabled = true; ctx.drawImage(fogCanvas(), 0, 0, M.W * T, M.H * T);

  // stroomvakken tonen bij stroomgebouwen
  const pwTool = G.tool && (G.tool === 'pole' || G.tool === 'generator' || BUILD[G.tool].pw), pwSel = G.sel && (G.sel.type === 'pole' || BUILD[G.sel.type].pw);
  if ((pwTool || pwSel) && mapF < 1) drawSupply(1 - mapF);
  // bouwbereik, selectie, delven, spookbeeld
  if (G.tool) {
    for (const b of G.bmap.values()) { const r = BUILD_RANGE[b.type]; if (r) ring((b.x + b.w / 2) * T, (b.y + b.h / 2) * T, r * T, 'rgba(226,87,30,.7)', 'rgba(226,87,30,.05)'); }
    if (G.pl && !G.pl.dead) ring(G.pl.x * T, G.pl.y * T, FIG_BUILD * T, 'rgba(255,248,230,.8)', 'rgba(255,248,230,.05)');
  }
  if (G.sel && G.bmap.has(G.sel.id)) {
    const b = G.sel; ctx.strokeStyle = S.accent; ctx.lineWidth = 2 / Math.min(1, z); ctx.strokeRect(b.x * T - 2, b.y * T - 2, b.w * T + 4, b.h * T + 4);
    if (b.type === 'turret') ring((b.x + 1) * T, (b.y + 1) * T, TURRET.range * T, 'rgba(255,214,130,.7)');
    if (b.type === 'core') ring((b.x + 1.5) * T, (b.y + 1.5) * T, CORE_GUN.range * T, 'rgba(255,214,130,.7)');
    if (b.type === 'flamer') ring((b.x + 1) * T, (b.y + 1) * T, FLAMER.range * T, 'rgba(255,150,80,.7)');
    if (b.type === 'tunnel' && b.link) { const o = b.link; ctx.strokeStyle = S.accent; ctx.lineWidth = 2 / Math.min(1, z); ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(b.x * T + 16, b.y * T + 16); ctx.lineTo(o.x * T + 16, o.y * T + 16); ctx.stroke(); ctx.setLineDash([]); ctx.strokeRect(o.x * T - 2, o.y * T - 2, T + 4, T + 4); }
  }
  if (G.mine) {
    const m = G.mine; ctx.strokeStyle = S.accent; ctx.lineWidth = 1.6; ctx.strokeRect(m.x * T + 1, m.y * T + 1, T - 2, T - 2);
    ctx.strokeStyle = 'rgba(255,248,230,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc((m.x + .5) * T, (m.y + .5) * T, 10, -Math.PI / 2, -Math.PI / 2 + m.t / MINE_T * 6.283); ctx.stroke();
  }
  drawGhost(); drawBlueprint(); drawDockRange();

  // middagzon (schermbreed)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (dA > 0) { ctx.save(); ctx.globalAlpha = dA; ctx.globalCompositeOperation = 'screen'; if (!sunG || sunG.w !== W || sunG.h !== H) { const gr = ctx.createRadialGradient(-W * .07, -H * .18, 10, -W * .07, -H * .18, W * .9); gr.addColorStop(0, 'rgba(255,248,220,.4)'); gr.addColorStop(1, 'rgba(255,248,220,0)'); sunG = { g: gr, w: W, h: H }; } ctx.fillStyle = sunG.g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (G.poll > 50) { ctx.fillStyle = `rgba(110,70,50,${Math.min(.18, G.poll / 5000)})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- minikaart ----------
const mini = document.getElementById('mini'), mctx = mini.getContext('2d');
function drawMini() {
  const M = G.M, s = 2;
  if (mini.width !== M.W * s) { mini.width = M.W * s; mini.height = M.H * s; }
  mctx.imageSmoothingEnabled = false; mctx.drawImage(G.ter.zmap, 0, 0, M.W * s, M.H * s);
  for (const b of G.bmap.values()) { mctx.fillStyle = MAPCOL[b.type]; mctx.fillRect(b.x * s, b.y * s, b.w * s, b.h * s); }
  mctx.drawImage(fogCanvas(), 0, 0, M.W * s, M.H * s);
  for (const n of M.nests) { if (!seenAt(n.x, n.y)) continue; mctx.fillStyle = n.dead ? '#3a2c22' : '#8a2a14'; mctx.fillRect(n.x * s - 4, n.y * s - 4, 8, 8); }
  mctx.fillStyle = '#c0301a'; for (const e of G.enemies) if (seenAt(e.x, e.y)) mctx.fillRect(e.x * s - 1, e.y * s - 1, 2, 2);
  const p = G.pl; if (p && !p.dead) { mctx.fillStyle = '#fff6e0'; mctx.fillRect(p.x * s - 2, p.y * s - 2, 4, 4); mctx.strokeStyle = S4.ink; mctx.strokeRect(p.x * s - 2.5, p.y * s - 2.5, 5, 5); }
  const vw = VW / cam.z / T * s, vh = VH / cam.z / T * s;
  mctx.strokeStyle = 'rgba(255,255,255,.85)'; mctx.lineWidth = 1; mctx.strokeRect(cam.x / T * s - vw / 2, cam.y / T * s - vh / 2, vw, vh);
}

// ---------- iconen voor de interface ----------
const ICONS = {};
function itemIcon(it) { return ICONS[it] || (ICONS[it] = itemSprite(it).toDataURL()); }
function buildIcon(type) {
  if (ICONS['b_' + type]) return ICONS['b_' + type];
  const d = BUILD[type], c = mk(96, 96), g = c.getContext('2d'), s = Math.min(80 / (d.w * T), 80 / (d.h * T)), w = d.w * T * s, h = d.h * T * s;
  g.translate((96 - w) / 2, (96 - h) / 2); g.scale(s, s);
  if (type === 'belt') beltD(g, 16, 16, 0, 0, S4); else g.drawImage(dSprite(type), 0, 0, d.w * T, d.h * T);
  if (type === 'turret') gunD(g, T, T, -Math.PI / 4, false, S4);
  if (ICON_EXTRA[type]) ICON_EXTRA[type](g);
  return ICONS['b_' + type] = c.toDataURL();
}
