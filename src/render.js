'use strict';
// Tekenen: sprites worden één keer in code getekend (2x resolutie) en gecachet; bewegende delen per frame.
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
let DPR = 1, VW = 0, VH = 0;
const cam = { x: 0, y: 0, z: 1 };
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight; cv.width = VW * DPR | 0; cv.height = VH * DPR | 0; cv.style.width = VW + 'px'; cv.style.height = VH + 'px'; }
addEventListener('resize', resize); resize();

// ---------- tekenhulpjes ----------
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, 7); }
function box(g, x, y, w, h, dep, top, front, r = 2) {
  g.fillStyle = front; rr(g, x, y, w, h, r); g.fill();
  g.fillStyle = top; rr(g, x, y, w, h - dep, r); g.fill();
  const gr = g.createLinearGradient(0, y, 0, y + h - dep);
  gr.addColorStop(0, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(0,0,0,.14)');
  g.fillStyle = gr; rr(g, x, y, w, h - dep, r); g.fill();
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(x + 1, y + h - dep + .5); g.lineTo(x + w - 1, y + h - dep + .5); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(x + r + 1, y + 1.5); g.lineTo(x + w - r - 1, y + 1.5); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.6)'; rr(g, x + .5, y + .5, w - 1, h - 1, r); g.stroke();
}
function grit(g, x, y, w, h, n, seed) {
  const R = mulberry(seed || 7);
  for (let i = 0; i < n; i++) {
    const v = R();
    g.fillStyle = v < .6 ? `rgba(0,0,0,${.08 + R() * .14})` : v < .85 ? `rgba(255,255,255,${.04 + R() * .06})` : `rgba(130,70,30,${.15 + R() * .2})`;
    g.fillRect(x + R() * w, y + R() * h, 1 + R() * 1.5, 1 + R() * 1.5);
  }
}
function rivets(g, pts) {
  for (const [x, y] of pts) {
    g.fillStyle = 'rgba(0,0,0,.5)'; circ(g, x + .4, y + .6, 1.4); g.fill();
    g.fillStyle = '#9a9a92'; circ(g, x, y, 1); g.fill();
  }
}
function hazard(g, x, y, w, h) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = PAL.hazard; g.fillRect(x, y, w, h);
  g.strokeStyle = '#1c1b18'; g.lineWidth = 2.6;
  for (let i = -h; i < w + h; i += 7) { g.beginPath(); g.moveTo(x + i, y + h); g.lineTo(x + i + h, y); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x, y, w, h);
  g.restore(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1);
}
function poly(g, pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }

// ---------- vaste sprites ----------
const SPR = {};
function bSprite(type) {
  if (SPR[type]) return SPR[type];
  const d = BUILD[type], w = d.w * T, h = d.h * T, c = mk(w * 2, h * 2), g = c.getContext('2d');
  g.scale(2, 2); SPRITE_FN[type](g, w, h);
  return SPR[type] = c;
}
const SPRITE_FN = {
  belt(g, w, h) { drawBeltAt(g, w / 2, h / 2, 0, 0); },
  drill(g, w, h) {
    box(g, 3, 3, w - 6, h - 6, 7, PAL.metalT, PAL.metalF, 4); grit(g, 4, 4, w - 8, h - 12, 60, 11);
    hazard(g, 8, h - 9, w - 16, 4);
    g.fillStyle = '#4a4c48'; circ(g, w / 2, h / 2 - 3, 20); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#1b1a17'; circ(g, w / 2, h / 2 - 3, 16.5); g.fill();
    const gr = g.createRadialGradient(w / 2, h / 2 - 3, 4, w / 2, h / 2 - 3, 17); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.6)');
    g.fillStyle = gr; circ(g, w / 2, h / 2 - 3, 16.5); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(w / 2, h / 2 - 3, 19.5, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
    box(g, w - 15, 7, 9, 12, 3, PAL.steelT, PAL.steelF, 1);
    rivets(g, [[8, 8], [w - 8, h - 14], [8, h - 14]]);
  },
  furnace(g, w, h) {
    box(g, 3, 3, w - 6, h - 6, 9, PAL.brickT, PAL.brickF, 3);
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1;
    for (let y = 8, r = 0; y < h - 12; y += 5, r++) {
      g.beginPath(); g.moveTo(4, y + .5); g.lineTo(w - 4, y + .5); g.stroke();
      for (let x = 4 + (r % 2) * 5; x < w - 4; x += 10) { g.beginPath(); g.moveTo(x + .5, y); g.lineTo(x + .5, y - 5); g.stroke(); }
    }
    grit(g, 4, 4, w - 8, h - 13, 70, 23);
    g.fillStyle = PAL.metalF; g.fillRect(3, h / 2 - 6, w - 6, 3);
    box(g, 7, 5, 15, 14, 4, '#5a4c42', '#3b322c', 2);
    g.fillStyle = '#0f0c0a'; g.beginPath(); g.ellipse(14.5, 9.5, 4.6, 3.3, 0, 0, 7); g.fill();
    box(g, w - 26, 9, 20, 15, 3, PAL.steelT, PAL.steelF, 2);
    rivets(g, [[w - 23, 12], [w - 9, 12]]);
    g.fillStyle = '#17110e'; rr(g, w / 2 - 10, h - 21, 20, 13, [6, 6, 1, 1]); g.fill();
    g.strokeStyle = '#2b2522'; g.lineWidth = 2; rr(g, w / 2 - 11, h - 22, 22, 14, [7, 7, 1, 1]); g.stroke();
  },
  assembler(g, w, h) {
    box(g, 2, 2, w - 4, h - 4, 8, PAL.steelT, PAL.steelF, 4); grit(g, 3, 3, w - 6, h - 12, 50, 31);
    g.fillStyle = '#23272a'; rr(g, 12, 10, w - 24, h - 30, 3); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1; rr(g, 12.5, 10.5, w - 25, h - 31, 3); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.5)'; rr(g, 11.5, 9.5, w - 23, h - 29, 3); g.stroke();
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(10 + i * 9, h - 8, 6, 1.5); }
    hazard(g, 4, 5, 6, h - 22);
    box(g, w - 10, 6, 6, 18, 2, '#666b6c', '#3c4042', 2);
    rivets(g, [[7, h - 15], [w - 7, h - 15]]);
  },
  turret(g, w, h) {
    const cx = w / 2, cy = h / 2 - 2, oct = r => { const p = []; for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * 6.283; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; };
    g.fillStyle = '#2c2d2a'; poly(g, oct(29).map(p => [p[0], p[1] + 3])); g.fill();
    g.fillStyle = PAL.concT; poly(g, oct(29)); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke();
    grit(g, 4, 4, w - 8, h - 8, 50, 41);
    g.fillStyle = '#4c4b46'; circ(g, cx, cy, 17); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.stroke();
    g.fillStyle = '#2d2e2b'; circ(g, cx, cy, 13); g.fill();
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; rivets(g, [[cx + Math.cos(a) * 22.5, cy + Math.sin(a) * 22.5]]); }
    box(g, w - 17, h - 14, 12, 9, 3, '#5b5a3a', '#3d3c27', 1);
  },
  wall(g, w, h) {
    box(g, 0, 0, w, h, 9, PAL.concT, PAL.concF, 2); grit(g, 1, 1, w - 2, h - 10, 30, 51);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(6, 6); g.lineTo(11, 11); g.lineTo(10, 16); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 3; i++) g.fillRect(5 + i * 9, h - 6, 4, 2);
  },
  outpost(g, w, h) {
    box(g, 3, 3, w - 6, h - 6, 5, '#4f504c', '#33342f', 4); grit(g, 4, 4, w - 8, h - 10, 50, 61);
    hazard(g, 6, 6, w - 12, 4); hazard(g, 6, h - 14, w - 12, 4);
    box(g, w / 2 - 9, 13, 18, 22, 7, PAL.steelT, PAL.steelF, 3);
    g.fillStyle = '#1e2224'; g.fillRect(w / 2 - 5, 17, 10, 4);
    rivets(g, [[9, 15], [w - 9, 15], [9, h - 19], [w - 9, h - 19]]);
  },
  core(g, w, h) {
    box(g, 2, 2, w - 4, h - 4, 11, '#585a56', '#373935', 6); grit(g, 3, 3, w - 6, h - 15, 160, 71);
    g.fillStyle = '#464844'; circ(g, w / 2, h / 2 - 5, 32); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = PAL.accent; g.lineWidth = 2; g.setLineDash([6, 5]); circ(g, w / 2, h / 2 - 5, 28); g.stroke(); g.setLineDash([]);
    const gr = g.createRadialGradient(w / 2 - 6, h / 2 - 12, 2, w / 2, h / 2 - 5, 20);
    gr.addColorStop(0, '#a9aea9'); gr.addColorStop(.6, '#5e625f'); gr.addColorStop(1, '#2e302e');
    g.fillStyle = gr; circ(g, w / 2, h / 2 - 5, 19); g.fill();
    for (const [x, y] of [[6, 6], [w - 20, 6], [6, h - 30], [w - 20, h - 30]]) { box(g, x, y, 14, 14, 4, PAL.steelT, PAL.steelF, 2); }
    hazard(g, 24, h - 20, w - 48, 5);
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(12 + i * 13, h - 9, 8, 2); }
  },
};

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
  }
}

// ---------- bewegende delen ----------
function drawBeltAt(g, cx, cy, rot, off) {
  g.save(); g.translate(cx, cy); g.rotate(rot * Math.PI / 2);
  g.fillStyle = '#211f1c'; g.fillRect(-16, -12, 32, 24);
  g.strokeStyle = '#3a372f'; g.lineWidth = 2;
  for (let i = -16 + off; i < 16; i += 8) { g.beginPath(); g.moveTo(i, -11); g.lineTo(i, 11); g.stroke(); }
  g.fillStyle = 'rgba(229,139,42,.22)'; g.beginPath(); g.moveTo(-3, -5); g.lineTo(3, 0); g.lineTo(-3, 5); g.lineTo(-1, 0); g.closePath(); g.fill();
  g.fillStyle = '#5f5d55'; g.fillRect(-16, -15, 32, 4); g.fillRect(-16, 11, 32, 4);
  g.fillStyle = '#8b887c'; g.fillRect(-16, -15, 32, 1); g.fillRect(-16, 11, 32, 1);
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-16, -11, 32, 1.5); g.fillRect(-16, 14, 32, 1);
  g.restore();
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
function drawBeltCurve(g, b, side, off) {
  // in lokaal frame: band loopt naar +x, invoer komt van y = side*16 (−1 = links/boven, 1 = rechts/onder)
  g.save(); g.translate(b.x * T + 16, b.y * T + 16); g.rotate(b.rot * Math.PI / 2); if (side > 0) g.scale(1, -1);
  // draaipunt in hoek (16,-16): band = kwartring tussen straal 4 en 28
  const ring = (r0, r1) => { g.beginPath(); g.arc(16, -16, r1, Math.PI / 2, Math.PI); g.arc(16, -16, r0, Math.PI, Math.PI / 2, true); g.closePath(); };
  g.fillStyle = '#5f5d55'; ring(1, 31); g.fill();
  g.fillStyle = '#211f1c'; ring(5, 27); g.fill();
  g.strokeStyle = '#3a372f'; g.lineWidth = 2;
  for (let a = off / 8 * (Math.PI / 8); a < Math.PI / 2; a += Math.PI / 8) {
    const ang = Math.PI - a; g.beginPath(); g.moveTo(16 + Math.cos(ang) * 6, -16 + Math.sin(ang) * 6); g.lineTo(16 + Math.cos(ang) * 26, -16 + Math.sin(ang) * 26); g.stroke();
  }
  g.strokeStyle = '#8b887c'; g.lineWidth = 1; g.beginPath(); g.arc(16, -16, 30.5, Math.PI / 2, Math.PI); g.stroke();
  g.restore();
}
function drawGunHead(g, x, y, ang, s, flash) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
  g.fillStyle = '#242523'; g.fillRect(4, -6, 20, 3.4); g.fillRect(4, 2.6, 20, 3.4);
  g.fillStyle = '#50524e'; g.fillRect(4, -5.6, 20, 1.1); g.fillRect(4, 3, 20, 1.1);
  g.fillStyle = '#151514'; g.fillRect(22, -6.4, 3, 4.2); g.fillRect(22, 2.2, 3, 4.2);
  rr(g, -11, -9, 20, 18, 4); g.fillStyle = '#5f6461'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1; g.stroke();
  rr(g, -9, -7, 13, 8, 3); g.fillStyle = 'rgba(255,255,255,.13)'; g.fill();
  g.fillStyle = PAL.accent; g.fillRect(-10, 5.5, 6, 2);
  if (flash > 0) {
    g.fillStyle = 'rgba(255,214,130,.95)';
    for (const yy of [-4.3, 4.3]) { g.beginPath(); g.moveTo(25, yy - 3); g.lineTo(33, yy); g.lineTo(25, yy + 3); g.lineTo(28, yy); g.closePath(); g.fill(); circ(g, 26, yy, 2.4); g.fill(); }
  }
  g.restore();
}
function drawChute(b) {
  const cx = (b.x + b.w / 2) * T, cy = (b.y + b.h / 2) * T, e = b.w * T / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(b.rot * Math.PI / 2);
  ctx.fillStyle = '#2e2f2c'; rr(ctx, e - 6, -7, 9, 14, 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = PAL.accent; ctx.beginPath(); ctx.moveTo(e - 3, -4); ctx.lineTo(e + 2, 0); ctx.lineTo(e - 3, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function blink(rt, x, y, col, r = 2.5) { if ((rt * 2 | 0) % 2) return; ctx.fillStyle = col; circ(ctx, x, y, r); ctx.fill(); }
function drawBuilding(b, rt) {
  const X = b.x * T, Y = b.y * T, w = b.w * T, h = b.h * T;
  ctx.drawImage(bSprite(b.type), X, Y, w, h);
  switch (b.type) {
    case 'drill': {
      ctx.save(); ctx.translate(X + w / 2, Y + h / 2 - 3); ctx.rotate(b.spin);
      for (let k = 0; k < 3; k++) {
        ctx.rotate(2.094); ctx.fillStyle = '#7d817b'; poly(ctx, [[3, -2.5], [15, -4.5], [15, 4.5], [3, 2.5]]); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.fillStyle = '#4a4c49'; circ(ctx, 0, 0, 5.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; circ(ctx, -1.5, -1.5, 2); ctx.fill();
      ctx.restore();
      drawChute(b);
      if (b.empty) blink(rt, X + w - 10, Y + 13, '#e0533a'); else if (b.hold) blink(rt, X + w - 10, Y + 13, '#e5b02a');
      else { ctx.fillStyle = '#8cc65a'; circ(ctx, X + w - 10, Y + 13, 2); ctx.fill(); }
      break;
    }
    case 'furnace': {
      if (b.cur) {
        const fl = .75 + Math.sin(rt * 17 + b.id) * .12 + Math.sin(rt * 7.3) * .1, fx = X + w / 2, fy = Y + h - 14;
        ctx.fillStyle = `rgba(255,${120 + fl * 60 | 0},40,${.85 * fl})`; rr(ctx, fx - 9, fy - 6, 18, 12, [5, 5, 1, 1]); ctx.fill();
        const gr = ctx.createRadialGradient(fx, fy, 2, fx, fy, 22); gr.addColorStop(0, `rgba(255,160,60,${.45 * fl})`); gr.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = gr; circ(ctx, fx, fy, 22); ctx.fill();
      }
      drawChute(b);
      if (b.nofuel) { ctx.globalAlpha = (rt * 2 | 0) % 2 ? .4 : 1; ctx.drawImage(itemSprite('coal'), X + w / 2 - 8, Y + 22, 16, 16); ctx.globalAlpha = 1; }
      break;
    }
    case 'assembler': {
      const cx = X + w / 2, cy = Y + 10 + (h - 30) / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(b.spin); ctx.globalAlpha = .5; ctx.drawImage(itemSprite('gear'), -12, -12, 24, 24); ctx.restore(); ctx.globalAlpha = 1;
      ctx.drawImage(itemSprite(RECIPES[b.recipe].out), cx - 8, cy - 8, 16, 16);
      ctx.fillStyle = b.t > 0 ? '#8cc65a' : b.idle ? '#e5b02a' : '#555'; circ(ctx, X + w - 7, Y + 28, 2); ctx.fill();
      drawChute(b);
      break;
    }
    case 'turret':
      drawGunHead(ctx, X + w / 2, Y + h / 2 - 3, b.ang, 1, b.flash);
      if (b.mags === 0 && b.shots === 0) { ctx.globalAlpha = (rt * 2 | 0) % 2 ? .3 : 1; ctx.drawImage(itemSprite('ammo'), X + w - 18, Y + 2, 16, 16); ctx.globalAlpha = 1; }
      break;
    case 'core':
      drawGunHead(ctx, X + w / 2, Y + h / 2 - 6, b.ang, .85, b.flash);
      for (const [x, y] of [[13, 13], [w - 13, 13], [13, h - 23], [w - 13, h - 23]]) blink(rt + x * .01, X + x, Y + y, PAL.accent, 2);
      break;
    case 'outpost': {
      ctx.strokeStyle = '#9a9a90'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X + w / 2, Y + 17); ctx.lineTo(X + w / 2, Y - 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X + w / 2 - 5, Y - 2); ctx.lineTo(X + w / 2 + 5, Y - 2); ctx.stroke();
      blink(rt, X + w / 2, Y - 9, PAL.accent, 2.5);
      const p = (rt % 2) / 2; ctx.strokeStyle = `rgba(229,139,42,${.5 * (1 - p)})`; circ(ctx, X + w / 2, Y - 9, 3 + p * 14); ctx.stroke();
      break;
    }
  }
}

// ---------- vijanden en nesten ----------
function drawEnemy(e) {
  const D = ENEMY[e.type], s = D.r * T;
  ctx.save(); ctx.translate(e.x * T, e.y * T);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(3, 4, s * 1.15, s * .85, 0, 0, 7); ctx.fill();
  ctx.rotate(e.ang);
  ctx.strokeStyle = D.dark; ctx.lineWidth = Math.max(1.2, s * .14); ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) {
    const lx = (i - 1) * s * .55, sw = Math.sin(e.anim * 2 + i * 2 + (sd > 0 ? Math.PI : 0)) * s * .3;
    ctx.beginPath(); ctx.moveTo(lx, sd * s * .35); ctx.lineTo(lx + sw * .5, sd * s * .9); ctx.lineTo(lx + sw, sd * s * 1.2); ctx.stroke();
  }
  ctx.fillStyle = D.dark; ctx.beginPath(); ctx.ellipse(-s * .35, 0, s * .8, s * .62, 0, 0, 7); ctx.fill();
  ctx.fillStyle = D.col; ctx.beginPath(); ctx.ellipse(-s * .38, -s * .04, s * .72, s * .54, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-s * .1 - i * s * .3, 0, s * .5, -1.1, 1.1); ctx.stroke(); }
  ctx.fillStyle = D.dark; ctx.beginPath(); ctx.ellipse(s * .5, 0, s * .45, s * .4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = D.col; ctx.beginPath(); ctx.ellipse(s * .48, -s * .03, s * .38, s * .33, 0, 0, 7); ctx.fill();
  const op = e.bite > 0 ? .5 : .2;
  ctx.strokeStyle = D.dark; ctx.lineWidth = Math.max(1, s * .1);
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * .8, sd * s * .15); ctx.quadraticCurveTo(s * 1.15, sd * s * (.2 + op), s * 1.2, sd * s * (op * .3)); ctx.stroke(); }
  ctx.fillStyle = D.glow; ctx.globalAlpha = .8;
  for (let i = 0; i < 3; i++) { circ(ctx, -s * .2 - i * s * .3, (i % 2 ? 1 : -1) * s * .22, Math.max(1, s * .09)); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,220,.16)'; ctx.beginPath(); ctx.ellipse(-s * .45, -s * .25, s * .4, s * .15, 0, 0, 7); ctx.fill();
  if (e.hitT > 0) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-s * .1, 0, s * 1.05, s * .62, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawNest(n, rt) {
  if (n.dead) return;
  const X = n.x * T, Y = n.y * T, R = mulberry(n.seed);
  const gr = ctx.createRadialGradient(X, Y, 10, X, Y, 2.8 * T); gr.addColorStop(0, 'rgba(60,30,50,.6)'); gr.addColorStop(1, 'rgba(60,30,50,0)');
  ctx.fillStyle = gr; circ(ctx, X, Y, 2.8 * T); ctx.fill();
  for (let k = 0; k < 8; k++) {
    const a = R() * 6.283, d = R() * 1.3 * T, r = (.35 + R() * .45) * T, x = X + Math.cos(a) * d, y = Y + Math.sin(a) * d * .8;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; circ(ctx, x + 3, y + 4, r); ctx.fill();
    ctx.fillStyle = '#4d3445'; circ(ctx, x, y, r); ctx.fill();
    ctx.fillStyle = '#6e4d62'; ctx.beginPath(); ctx.ellipse(x - r * .3, y - r * .35, r * .5, r * .3, -.4, 0, 7); ctx.fill();
    if (k < 3) { ctx.fillStyle = '#120a10'; ctx.beginPath(); ctx.ellipse(x + r * .1, y + r * .1, r * .4, r * .3, 0, 0, 7); ctx.fill(); }
  }
  for (let k = 0; k < 6; k++) {
    const a = R() * 6.283, d = R() * 1.4 * T, p = .5 + .5 * Math.sin(rt * 3 + k * 1.7);
    ctx.fillStyle = `rgba(199,228,106,${.3 + .5 * p})`; circ(ctx, X + Math.cos(a) * d, Y + Math.sin(a) * d * .8, 2.5 + R() * 2.5); ctx.fill();
  }
}
function bar(x, y, w, frac, col) {
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, frac), 3);
}

// ---------- spookbeeld bij bouwen ----------
function ghostTile() { const d = BUILD[G.tool]; return { tx: Math.floor(mouse.wx / T - d.w / 2 + .5), ty: Math.floor(mouse.wy / T - d.h / 2 + .5) }; }
function drawGhost() {
  if (!G.tool || !mouse.in) return;
  const d = BUILD[G.tool], { tx, ty } = ghostTile(), X = tx * T, Y = ty * T, err = canPlace(G.tool, tx, ty);
  ctx.globalAlpha = .6;
  if (G.tool === 'belt') drawBeltAt(ctx, X + 16, Y + 16, G.rot, 0); else ctx.drawImage(bSprite(G.tool), X, Y, d.w * T, d.h * T);
  if (G.tool === 'turret') drawGunHead(ctx, X + T, Y + T - 3, -Math.PI / 2, 1, 0);
  ctx.globalAlpha = 1;
  if (d.rot && G.tool !== 'belt') drawChute({ x: tx, y: ty, w: d.w, h: d.h, rot: G.rot });
  ctx.fillStyle = err ? 'rgba(220,50,30,.35)' : 'rgba(120,220,90,.18)'; ctx.fillRect(X, Y, d.w * T, d.h * T);
  if (G.tool === 'turret') ring((tx + 1) * T, (ty + 1) * T, TURRET.range * T, 'rgba(255,214,130,.6)');
}
function ring(x, y, r, col, fill) {
  ctx.setLineDash([8, 6]); ctx.strokeStyle = col; ctx.lineWidth = 1.5; circ(ctx, x, y, r); ctx.stroke(); ctx.setLineDash([]);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}

// ---------- hoofdtekening ----------
function draw() {
  const z = cam.z * DPR, W = cv.width, H = cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#14120f'; ctx.fillRect(0, 0, W, H);
  if (!G) return;
  ctx.setTransform(z, 0, 0, z, W / 2 - cam.x * z, H / 2 - cam.y * z);
  const vx0 = cam.x - W / 2 / z, vy0 = cam.y - H / 2 / z, vx1 = cam.x + W / 2 / z, vy1 = cam.y + H / 2 / z;
  const sx = Math.max(0, vx0), sy = Math.max(0, vy0), ex = Math.min(G.terrain.width, vx1), ey = Math.min(G.terrain.height, vy1);
  if (ex > sx && ey > sy) ctx.drawImage(G.terrain, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
  const rt = performance.now() / 1000, vis = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;

  for (const n of G.M.nests) if (vis(n.x * T, n.y * T, 3 * T)) drawNest(n, rt);
  if (G.tool) for (const b of G.bmap.values()) { const r = BUILD_RANGE[b.type]; if (r) ring((b.x + b.w / 2) * T, (b.y + b.h / 2) * T, r * T, 'rgba(229,139,42,.55)', 'rgba(229,139,42,.04)'); }

  const L = [], belts = [];
  for (const b of G.bmap.values()) {
    if ((b.x + b.w) * T < vx0 || b.x * T > vx1 || (b.y + b.h) * T < vy0 - T || b.y * T > vy1) continue;
    (b.type === 'belt' ? belts : L).push(b);
  }
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  for (const b of L) { rr(ctx, b.x * T + 5, b.y * T + 6, b.w * T - 2, b.h * T - 2, 4); ctx.fill(); }
  const off = (G.time * BELT_SPEED * 32) % 8;
  for (const b of belts) {
    const c = beltCurve(b);
    if (c) drawBeltCurve(ctx, b, c, off); else drawBeltAt(ctx, b.x * T + 16, b.y * T + 16, b.rot, off);
  }
  for (const b of belts) for (const it of b.items) {
    let x, y; const cx = b.x + .5, cy = b.y + .5;
    if (it.p < .5) { const k = 1 - it.p * 2; x = cx - DX[it.d] * .5 * k; y = cy - DY[it.d] * .5 * k; }
    else { const k = (it.p - .5) * 2; x = cx + DX[b.rot] * .5 * k; y = cy + DY[b.rot] * .5 * k; }
    ctx.drawImage(itemSprite(it.t), x * T - 7, y * T - 7, 14, 14);
  }
  L.sort((a, b) => (a.y + a.h) - (b.y + b.h));
  for (const b of L) drawBuilding(b, rt);

  for (const e of G.enemies) if (vis(e.x * T, e.y * T, T)) drawEnemy(e);

  for (const p of G.fx) {
    const a = p.life / p.max, X = p.x * T, Y = p.y * T;
    if (p.k === 'smoke') { ctx.fillStyle = `rgba(62,58,52,${a * .45})`; circ(ctx, X, Y, p.sz * T); ctx.fill(); }
    else if (p.k === 'flash') { ctx.fillStyle = `rgba(255,180,90,${a * .8})`; circ(ctx, X, Y, p.sz * T * (1.5 - a)); ctx.fill(); }
    else { ctx.globalAlpha = a; ctx.fillStyle = p.col; const s = p.sz * T; ctx.fillRect(X - s / 2, Y - s / 2, s, s); ctx.globalAlpha = 1; }
  }
  ctx.lineWidth = 1.5;
  for (const t of G.tracers) { ctx.strokeStyle = `rgba(255,214,140,${t.life / .07})`; ctx.beginPath(); ctx.moveTo(t.x1 * T, t.y1 * T); ctx.lineTo(t.x2 * T, t.y2 * T); ctx.stroke(); }

  for (const b of L) if (b.hp < b.maxhp) bar(b.x * T + 4, b.y * T - 6, b.w * T - 8, b.hp / b.maxhp, b.hp / b.maxhp > .5 ? '#8cc65a' : '#e0533a');
  for (const e of G.enemies) if (e.hp < e.maxhp && vis(e.x * T, e.y * T, T)) { const s = ENEMY[e.type].r * T; bar(e.x * T - s, e.y * T - s - 8, s * 2, e.hp / e.maxhp, '#e0533a'); }
  for (const n of G.M.nests) if (!n.dead && n.hp < n.maxhp) bar(n.x * T - 40, n.y * T - 56, 80, n.hp / n.maxhp, '#c14fa0');

  if (G.sel && G.bmap.has(G.sel.id)) {
    const b = G.sel; ctx.strokeStyle = PAL.accent; ctx.lineWidth = 2; ctx.strokeRect(b.x * T - 2, b.y * T - 2, b.w * T + 4, b.h * T + 4);
    if (b.type === 'turret') ring((b.x + 1) * T, (b.y + 1) * T, TURRET.range * T, 'rgba(255,214,130,.6)');
    if (b.type === 'core') ring((b.x + 1.5) * T, (b.y + 1.5) * T, CORE_GUN.range * T, 'rgba(255,214,130,.6)');
  }
  if (G.mine) {
    const m = G.mine; ctx.strokeStyle = PAL.accent; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc((m.x + .5) * T, (m.y + .5) * T, 12, -Math.PI / 2, -Math.PI / 2 + m.t / MINE_T * 6.283); ctx.stroke();
  }
  drawGhost();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (G.poll > 50) { ctx.fillStyle = `rgba(90,70,40,${Math.min(.2, G.poll / 5000)})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- minikaart ----------
const mini = document.getElementById('mini'), mctx = mini.getContext('2d');
let miniBase = null;
function drawMini() {
  const M = G.M, s = 2;
  if (!miniBase || miniBase.seed !== M.seed) {
    miniBase = mk(M.W * s, M.H * s); miniBase.seed = M.seed;
    miniBase.getContext('2d').drawImage(G.terrain, 0, 0, M.W * s, M.H * s);
    mini.width = M.W * s; mini.height = M.H * s;
  }
  mctx.drawImage(miniBase, 0, 0);
  for (const b of G.bmap.values()) {
    mctx.fillStyle = b.type === 'core' ? '#ffb04a' : b.type === 'turret' ? '#e58b2a' : b.type === 'wall' ? '#cfcac0' : b.type === 'belt' ? '#77746a' : '#a6aaa8';
    mctx.fillRect(b.x * s, b.y * s, b.w * s, b.h * s);
  }
  for (const n of M.nests) { mctx.fillStyle = n.dead ? '#222' : '#c14fa0'; mctx.fillRect(n.x * s - 4, n.y * s - 4, 8, 8); }
  mctx.fillStyle = '#ff4030'; for (const e of G.enemies) mctx.fillRect(e.x * s - 1, e.y * s - 1, 2, 2);
  const vw = VW / cam.z / T * s, vh = VH / cam.z / T * s;
  mctx.strokeStyle = 'rgba(255,255,255,.8)'; mctx.lineWidth = 1; mctx.strokeRect(cam.x / T * s - vw / 2, cam.y / T * s - vh / 2, vw, vh);
}

// ---------- iconen voor de interface ----------
const ICONS = {};
function itemIcon(it) { return ICONS[it] || (ICONS[it] = itemSprite(it).toDataURL()); }
function buildIcon(type) {
  if (ICONS['b_' + type]) return ICONS['b_' + type];
  const d = BUILD[type], c = mk(96, 96), g = c.getContext('2d'), s = Math.min(80 / (d.w * T), 80 / (d.h * T)), w = d.w * T * s, h = d.h * T * s;
  g.translate((96 - w) / 2, (96 - h) / 2); g.scale(s, s);
  if (type === 'belt') drawBeltAt(g, 16, 16, 0, 0); else g.drawImage(bSprite(type), 0, 0, d.w * T, d.h * T);
  if (type === 'turret') drawGunHead(g, T, T - 3, -Math.PI / 4, 1, 0);
  return ICONS['b_' + type] = c.toDataURL();
}
