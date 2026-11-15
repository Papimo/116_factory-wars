'use strict';
// Stijl 4A "Middagzon" (woestijn-dieselpunk): palet, gebouwsprites, banden, kruipers, nesten, erts en terrein.
// Overgezet uit design/index.html (THEMES['4a'] + gedeelde tekenset).
const S4 = {
  id: '4a', seed: 31, sun: [.5, .86], shK: .45, shCol: 'rgba(84,40,14,.5)',
  sandHi: [242, 216, 162], sandLo: [216, 172, 114], hi: [255, 242, 210], shadeC: [160, 92, 58], hiA: .55, loA: .6, castA: .5, hsK: 1.1,
  clay: [212, 158, 112], rock: [184, 112, 72], rockHi: [232, 178, 124], rip: 1, ripD: [.8, .6],
  paint: '#6f9f96', paint2: '#ddd1b0', metal: '#9e9584', rivet: '#d3cab4', rust: '#9a4a22', accent: '#e2571e', dark: '#2a1f18', ink: '#24170e', inkW: 1.2,
  bag: ['#cfb68c', '#b49b72'], clayB: '#c98c5c', sandA: [232, 200, 146], dust: .38, sheen: .14, edge: .6, rustP: .35, beltBed: '#2c231c', beltTread: '#4d4034',
  goo: [50, 24, 12], nestGround: [150, 96, 60], nest: { a: '#b47c50', b: '#e3b27c', hole: '#24120a', glow: [255, 140, 58] },
  shrub: ['#6b5636', '#9a8456'], bone: '#f1e8d4', smoke: [96, 86, 78], smokeA: .32, wind: [.9, -.45],
};
(S => { const l = Math.hypot(S.sun[0], S.sun[1]); S.sx = S.sun[0] / l; S.sy = S.sun[1] / l; S.lx = -S.sx; S.ly = -S.sy; })(S4);
// kruipers per soort (zelfde vorm, eigen kleur en glans)
const BUGPAL = {
  crawler: { col: '#3e2c22', dark: '#1a110b', glow: '#ff8a2a', sheen: .35 },
  beetle:  { col: '#4a4030', dark: '#1c160c', glow: '#ffc840', sheen: .5 },
  mother:  { col: '#4a2632', dark: '#1c0a10', glow: '#ff6ab0', sheen: .4 },
};
// erts per soort (1 ijzer, 2 koper, 3 kool, 4 steen)
const ORE4 = {
  1: { a: '#3a3940', b: '#5e5b64', hi: '#b2aeb6', sp: '#c2602e', stain: [150, 72, 36], map: [92, 88, 100] },
  2: { a: '#5a3424', b: '#8a5236', hi: '#d89a6a', sp: '#4fa58a', stain: [70, 120, 96], map: [168, 96, 60] },
  3: { a: '#1c1916', b: '#2e2a26', hi: '#6e6862', sp: '#9aa0a6', stain: [40, 30, 24], map: [44, 38, 34] },
  4: { a: '#a0805e', b: '#c4a27a', hi: '#ecd6b2', sp: '#7a5e44', stain: [140, 104, 70], map: [206, 176, 134] },
};
const MAPCOL = { belt: '#3a2c22', drill: '#6f9f96', furnace: '#c98c5c', assembler: '#cfc29e', turret: '#e2571e', wall: '#2a1f18', outpost: '#f6eedc', core: '#ffd27a' };

// ---------- hulpjes ----------
function fbm2(x, y, s) { return vnoise(x, y, s) * .66 + vnoise(x * 2, y * 2, s + 17) * .34; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(.01, r), 0, 7); }
function poly(g, pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }
function hex(c) { c = c.replace('#', ''); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
function shade(c, f) { const a = hex(c), t = f < 0 ? 0 : 255, p = Math.abs(f); return '#' + a.map(v => Math.round(v + (t - v) * p).toString(16).padStart(2, '0')).join(''); }
function rgba(a, al) { return `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${al})`; }
function octP(g, cx, cy, r) { const p = []; for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * 6.283; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } poly(g, p); }
function glow(c, x, y, r, col, a) { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); c.fillStyle = gr; circ(c, x, y, r); c.fill(); }

// ---------- plaatstaal-kit ----------
function rivetD(g, x, y, S, R) {
  g.fillStyle = 'rgba(0,0,0,.45)'; circ(g, x + .5, y + .6, 1.3); g.fill(); g.fillStyle = S.rivet; circ(g, x, y, .95); g.fill();
  if (R && R() < S.rustP) { const gr = g.createLinearGradient(0, y, 0, y + 6 + R() * 6); gr.addColorStop(0, rgba(hex(S.rust), .6)); gr.addColorStop(1, rgba(hex(S.rust), 0)); g.fillStyle = gr; g.fillRect(x - .6, y + 1, 1.3, 12); }
}
function plateD(g, x, y, w, h, dep, top, S, o = {}) {
  const r = o.r ?? 2, R = mulberry(o.seed || 3), th = h - dep;
  g.fillStyle = shade(top, -.48); rr(g, x, y, w, h, r); g.fill();
  g.save(); rr(g, x, y, w, h, r); g.clip();
  for (let i = 0; i < w; i += 3) { g.fillStyle = `rgba(0,0,0,${.05 + R() * .14})`; g.fillRect(x + i, y + th, 1.2, dep); }
  g.restore();
  g.fillStyle = top; rr(g, x, y, w, th, r); g.fill();
  g.save(); rr(g, x, y, w, th, r); g.clip();
  const cx = x + w / 2, cy = y + th / 2, gr = g.createLinearGradient(cx + S.lx * w / 2, cy + S.ly * th / 2, cx - S.lx * w / 2, cy - S.ly * th / 2);
  gr.addColorStop(0, `rgba(255,240,210,${S.sheen})`); gr.addColorStop(1, `rgba(0,0,0,${S.sheen})`); g.fillStyle = gr; g.fillRect(x, y, w, th);
  for (let k = 0; k < (o.wear ?? 10); k++) {
    const side = R(), ccx = side < .5 ? x + R() * w : (R() < .5 ? x + 2 : x + w - 3), ccy = side < .5 ? (R() < .5 ? y + 2 : y + th - 3) : y + R() * th;
    g.fillStyle = S.metal; g.globalAlpha = .75; poly(g, [[ccx, ccy], [ccx + 1.5 + R() * 2.2, ccy + R()], [ccx + R(), ccy + 1.5 + R() * 2]]); g.fill(); g.globalAlpha = 1;
  }
  const dg = g.createLinearGradient(0, y + th * .5, 0, y + th); dg.addColorStop(0, rgba(S.sandA, 0)); dg.addColorStop(1, rgba(S.sandA, S.dust)); g.fillStyle = dg; g.fillRect(x, y, w, th);
  g.restore();
  g.lineWidth = 1.2; g.strokeStyle = `rgba(255,246,225,${S.edge})`; g.beginPath();
  if (S.ly < .2) { g.moveTo(x + r, y + 1.2); g.lineTo(x + w - r, y + 1.2); }
  if (S.lx < -.2) { g.moveTo(x + 1.2, y + r); g.lineTo(x + 1.2, y + th - 1); }
  if (S.lx > .2) { g.moveTo(x + w - 1.2, y + r); g.lineTo(x + w - 1.2, y + th - 1); }
  g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 1, y + th + .5); g.lineTo(x + w - 1, y + th + .5); g.stroke();
  g.strokeStyle = S.ink; g.lineWidth = S.inkW; rr(g, x + S.inkW / 2, y + S.inkW / 2, w - S.inkW, h - S.inkW, r); g.stroke();
  if (o.rivets !== false) { const rv = o.rv || 7; for (let q = x + 4; q < x + w - 2; q += rv) { rivetD(g, q, y + 3.2, S, R); rivetD(g, q, y + th - 3, S, R); } }
}
function hazardD(g, x, y, w, h, S) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = S.accent; g.fillRect(x, y, w, h);
  g.strokeStyle = S.dark; g.lineWidth = 2.6; for (let i = -h; i < w + h; i += 7) { g.beginPath(); g.moveTo(x + i, y + h); g.lineTo(x + i + h, y); g.stroke(); }
  const R = mulberry(x * 13 + y); g.fillStyle = rgba(S.sandA, .5); for (let i = 0; i < w / 3; i++) g.fillRect(x + R() * w, y + R() * h, 1 + R() * 2, 1);
  g.restore(); g.strokeStyle = S.ink; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1);
}
function stencilD(g, txt, x, y, size, col) {
  g.save(); g.font = `${size}px Impact, "Haettenschweiler", "Arial Black", sans-serif`; g.textBaseline = 'alphabetic'; g.fillStyle = col; g.fillText(txt, x, y);
  g.globalCompositeOperation = 'destination-out'; const w = g.measureText(txt).width, R = mulberry(txt.length * 99 + x);
  for (let i = 0; i < txt.length; i++) g.fillRect(x + (i + .5) * w / txt.length, y - size, .6, size);
  for (let i = 0; i < 8; i++) g.fillRect(x + R() * w, y - R() * size, .8, .8);
  g.restore();
}
function sandbag(g, cx, cy, l, wd, ang, col, S) {
  g.save(); g.translate(cx, cy); g.rotate(ang);
  g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, -l / 2 + .8, -wd / 2 + 1.2, l, wd, wd * .45); g.fill();
  const gr = g.createLinearGradient(-S.lx * wd, -S.ly * wd, S.lx * wd, S.ly * wd); gr.addColorStop(0, shade(col, .22)); gr.addColorStop(1, shade(col, -.32));
  g.fillStyle = gr; rr(g, -l / 2, -wd / 2, l, wd, wd * .45); g.fill(); g.strokeStyle = S.ink; g.lineWidth = .9; g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = .7; g.beginPath(); g.moveTo(-l / 2 + 2.6, -wd / 2 + 1.3); g.lineTo(-l / 2 + 2.6, wd / 2 - 1.3); g.moveTo(l / 2 - 2.6, -wd / 2 + 1.3); g.lineTo(l / 2 - 2.6, wd / 2 - 1.3); g.stroke();
  g.strokeStyle = 'rgba(255,255,240,.2)'; g.beginPath(); g.moveTo(-l / 2 + 3.5, -wd * .15); g.quadraticCurveTo(0, -wd * .32, l / 2 - 3.5, -wd * .15); g.stroke();
  g.restore();
}

// ---------- gebouwsprites (vast deel; bewegende delen in render.js) ----------
const DS = {
  belt(g, w, h, S) { beltD(g, 16, 16, 0, 0, S); },
  drill(g, w, h, S) {
    g.fillStyle = S.ink; g.fillRect(1, 6, 5, h - 10); g.fillRect(w - 6, 6, 5, h - 10);
    g.fillStyle = shade(S.metal, -.25); g.fillRect(1.6, 6.6, 3.8, h - 11.2); g.fillRect(w - 5.4, 6.6, 3.8, h - 11.2);
    plateD(g, 4, 3, w - 8, h - 6, 8, S.paint, S, { seed: 11, r: 4 });
    const cx = w / 2 - 2, cy = h / 2 - 4;
    g.fillStyle = S.metal; circ(g, cx, cy, 19); g.fill(); g.strokeStyle = S.ink; g.lineWidth = S.inkW; g.stroke();
    g.strokeStyle = 'rgba(255,246,225,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, 17.8, Math.atan2(S.ly, S.lx) - 1, Math.atan2(S.ly, S.lx) + 1); g.stroke();
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; rivetD(g, cx + Math.cos(a) * 16.3, cy + Math.sin(a) * 16.3, S); }
    g.fillStyle = '#120c08'; circ(g, cx, cy, 13.6); g.fill();
    const gr = g.createRadialGradient(cx, cy, 3, cx, cy, 14); gr.addColorStop(0, 'rgba(60,40,20,.5)'); gr.addColorStop(1, 'rgba(0,0,0,.7)'); g.fillStyle = gr; circ(g, cx, cy, 13.6); g.fill();
    const ex = w - 12, ey = 11, sg = g.createRadialGradient(ex, ey, 3, ex, ey, 11); sg.addColorStop(0, 'rgba(10,6,4,.55)'); sg.addColorStop(1, 'rgba(10,6,4,0)'); g.fillStyle = sg; circ(g, ex, ey, 11); g.fill();
    g.fillStyle = S.ink; circ(g, ex, ey, 5.8); g.fill(); g.fillStyle = shade(S.metal, -.1); circ(g, ex, ey, 4.9); g.fill(); g.fillStyle = '#0c0806'; circ(g, ex, ey, 3); g.fill();
    g.fillStyle = S.ink; circ(g, 9, 8, 3); g.fill(); g.fillStyle = '#5a4a30'; circ(g, 9, 8, 2); g.fill();
    stencilD(g, 'B-02', 10, h - 4.5, 6.5, shade(S.paint, .35));
    hazardD(g, w - 24, h - 13.5, 14, 3.5, S);
  },
  furnace(g, w, h, S) {
    const top = S.clayB;
    g.fillStyle = shade(top, -.5); rr(g, 3, 4, w - 6, h - 6, 12); g.fill();
    const gr = g.createRadialGradient(w / 2 + S.lx * 14, h / 2 - 6 + S.ly * 14, 4, w / 2, h / 2 - 5, 36); gr.addColorStop(0, shade(top, .2)); gr.addColorStop(1, shade(top, -.16));
    g.fillStyle = gr; rr(g, 3, 3, w - 6, h - 14, 12); g.fill();
    const R = mulberry(23);
    g.save(); rr(g, 3, 3, w - 6, h - 14, 12); g.clip();
    g.strokeStyle = 'rgba(60,30,15,.22)'; g.lineWidth = 1;
    for (let y = 9; y < h - 14; y += 5) { g.beginPath(); g.moveTo(3, y); for (let x = 3; x <= w - 3; x += 6) g.lineTo(x, y + (R() - .5) * 1.6); g.stroke(); }
    for (let k = 0; k < 50; k++) { g.fillStyle = R() < .6 ? 'rgba(60,30,15,.2)' : 'rgba(255,230,190,.16)'; g.beginPath(); g.ellipse(4 + R() * (w - 8), 4 + R() * (h - 18), .8 + R() * 1.6, .5 + R(), 0, 0, 7); g.fill(); }
    const dg = g.createLinearGradient(0, h * .4, 0, h - 14); dg.addColorStop(0, rgba(S.sandA, 0)); dg.addColorStop(1, rgba(S.sandA, S.dust)); g.fillStyle = dg; g.fillRect(0, 0, w, h);
    g.restore();
    for (const yy of [17, h - 27]) { g.fillStyle = S.metal; g.fillRect(3, yy, w - 6, 3.4); g.fillStyle = 'rgba(255,246,225,.35)'; g.fillRect(3, yy, w - 6, .8); g.fillStyle = S.ink; g.fillRect(3, yy + 3.4, w - 6, .9); rivetD(g, 7, yy + 1.7, S, R); rivetD(g, w - 7, yy + 1.7, S, R); rivetD(g, w / 2, yy + 1.7, S, R); }
    g.strokeStyle = S.ink; g.lineWidth = S.inkW; rr(g, 3.5, 3.5, w - 7, h - 7, 12); g.stroke();
    const cx = w - 17, cy = 14, sg = g.createRadialGradient(cx, cy, 5, cx, cy, 15); sg.addColorStop(0, 'rgba(12,6,4,.6)'); sg.addColorStop(1, 'rgba(12,6,4,0)'); g.fillStyle = sg; circ(g, cx, cy, 15); g.fill();
    g.fillStyle = S.ink; circ(g, cx, cy, 7.8); g.fill(); g.fillStyle = shade(S.metal, -.12); circ(g, cx, cy, 6.8); g.fill();
    g.strokeStyle = 'rgba(255,246,225,.3)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, 6, Math.atan2(S.ly, S.lx) - 1.1, Math.atan2(S.ly, S.lx) + 1.1); g.stroke();
    g.fillStyle = '#0b0705'; circ(g, cx, cy, 4.4); g.fill();
    plateD(g, 7, 6, 16, 14, 4, S.paint, S, { seed: 4, rv: 6, wear: 4, rivets: false });
    g.fillStyle = '#120d0a'; rr(g, 10, 8.5, 10, 5.5, 1.5); g.fill(); g.fillStyle = '#3a3634'; for (let i = 0; i < 5; i++) { circ(g, 11.5 + i * 1.8, 11.5 + (i % 2), 1); g.fill(); }
    g.fillStyle = '#120b07'; rr(g, w / 2 - 10, h - 23, 20, 14, [8, 8, 1, 1]); g.fill();
    g.strokeStyle = S.metal; g.lineWidth = 2.4; rr(g, w / 2 - 11, h - 24, 22, 15, [9, 9, 1, 1]); g.stroke();
    g.strokeStyle = S.ink; g.lineWidth = 1; rr(g, w / 2 - 12.3, h - 25.3, 24.6, 17.6, [10, 10, 1, 1]); g.stroke();
    stencilD(g, 'OVEN', 26, h - 4.5, 6, 'rgba(255,240,215,.55)');
  },
  assembler(g, w, h, S) {
    plateD(g, 2, 2, w - 4, h - 4, 8, S.paint2, S, { seed: 31, r: 4 });
    g.fillStyle = '#16110c'; rr(g, 12, 10, w - 24, h - 30, 3); g.fill(); g.strokeStyle = S.ink; g.lineWidth = 1.4; g.stroke();
    hazardD(g, 5, h - 17, w - 10, 4, S);
    g.fillStyle = S.metal; g.fillRect(w - 9, 6, 4, h - 22); g.strokeStyle = S.ink; g.lineWidth = 1; g.strokeRect(w - 9, 6, 4, h - 22);
    stencilD(g, 'A-4', 7, 9, 6, shade(S.paint2, -.55));
  },
  turret(g, w, h, S) {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = shade(S.metal, -.45); octP(g, cx, cy, 27); g.fill(); g.strokeStyle = S.ink; g.lineWidth = S.inkW; g.stroke();
    g.fillStyle = S.metal; circ(g, cx, cy, 19); g.fill(); g.stroke();
    g.fillStyle = shade(S.metal, -.5); circ(g, cx, cy, 12.5); g.fill();
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; rivetD(g, cx + Math.cos(a) * 16, cy + Math.sin(a) * 16, S); }
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + .1; sandbag(g, cx + Math.cos(a) * 25, cy + Math.sin(a) * 25, 12.5, 8, a + Math.PI / 2, S.bag[i % 2], S); }
    plateD(g, w - 18, h - 16, 14, 12, 3, '#5d5c3c', S, { seed: 9, rivets: false, wear: 3 });
    stencilD(g, '7.62', w - 16.5, h - 8, 5.5, 'rgba(240,225,180,.7)');
  },
  wall(g, w, h, S) {
    g.fillStyle = shade(S.bag[1], -.55); g.fillRect(0, 0, w, h);
    g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip();
    [[5.3, [8, 24]], [16, [0, 16, 32]], [26.7, [8, 24]]].forEach(([y, xs], ri) => xs.forEach((x, k) => sandbag(g, x, y, 16.5, 11, 0, S.bag[(ri + k) % 2], S)));
    g.restore();
  },
  outpost(g, w, h, S) {
    plateD(g, 3, 3, w - 6, h - 6, 6, S.metal, S, { seed: 61, r: 4 });
    hazardD(g, 7, h - 15, w - 14, 4, S);
    g.fillStyle = S.paint; circ(g, w / 2, h / 2 - 4, 11); g.fill(); g.strokeStyle = S.ink; g.lineWidth = S.inkW; g.stroke();
    g.strokeStyle = S.ink; g.lineWidth = 1.2; for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283 + .5; g.beginPath(); g.moveTo(w / 2, h / 2 - 4); g.lineTo(w / 2 + Math.cos(a) * 20, h / 2 - 4 + Math.sin(a) * 20); g.stroke(); }
    g.fillStyle = S.paint2; g.beginPath(); g.ellipse(w / 2 + 8, h / 2 - 10, 6, 3.5, -.6, 0, 7); g.fill(); g.strokeStyle = S.ink; g.stroke();
    stencilD(g, 'VP-1', 8, 14, 7, S.ink);
  },
  core(g, w, h, S) {
    plateD(g, 3, 3, w - 6, h - 6, 11, S.metal, S, { seed: 71, r: 6, rv: 9 });
    for (const [x, y] of [[9, 9], [w - 27, 9], [9, h - 39], [w - 27, h - 39]]) plateD(g, x, y, 18, 18, 4, S.paint2, S, { seed: x + y, rivets: false, wear: 3 });
    hazardD(g, 22, h - 22, w - 44, 5, S);
    const cx = w / 2, cy = h / 2 - 6;
    g.fillStyle = S.ink; circ(g, cx, cy, 29); g.fill();
    const gr = g.createRadialGradient(cx + S.lx * 12, cy + S.ly * 12, 3, cx, cy, 28); gr.addColorStop(0, shade(S.paint, .4)); gr.addColorStop(.6, S.paint); gr.addColorStop(1, shade(S.paint, -.4));
    g.fillStyle = gr; circ(g, cx, cy, 27.5); g.fill();
    g.strokeStyle = S.accent; g.lineWidth = 2; g.setLineDash([6, 5]); circ(g, cx, cy, 23); g.stroke(); g.setLineDash([]);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; rivetD(g, cx + Math.cos(a) * 26, cy + Math.sin(a) * 26, S); }
    stencilD(g, 'KERN', 10, h - 6, 8, 'rgba(255,240,215,.6)');
  },
};
// schaduwvormen met hoogte: [hoogte, vorm]
const DSH = {
  belt: () => [],
  drill: (w, h) => [[10, g => { rr(g, 1, 3, w - 2, h - 6, 4); g.fill(); }], [26, g => { circ(g, w - 12, 11, 5.8); g.fill(); }]],
  furnace: (w, h) => [[11, g => { rr(g, 3, 3, w - 6, h - 6, 12); g.fill(); }], [36, g => { circ(g, w - 17, 14, 7.8); g.fill(); }]],
  assembler: (w, h) => [[10, g => { rr(g, 2, 2, w - 4, h - 4, 4); g.fill(); }]],
  turret: (w, h) => [[8, g => { circ(g, w / 2, h / 2, 30); g.fill(); }]],
  wall: (w, h) => [[13, g => { g.fillRect(0, 0, w, h); }]],
  outpost: (w, h) => [[8, g => { rr(g, 3, 3, w - 6, h - 6, 4); g.fill(); }], [40, g => { circ(g, w / 2, h / 2 - 4, 3); g.fill(); }]],
  core: (w, h) => [[12, g => { rr(g, 3, 3, w - 6, h - 6, 6); g.fill(); }], [22, g => { circ(g, w / 2, h / 2 - 6, 29); g.fill(); }]],
};
const SPRD = {}, SHM = {}, MIP = {};
function dSprite(type) {
  if (SPRD[type]) return SPRD[type];
  const d = BUILD[type], c = mk(d.w * T * 3, d.h * T * 3), g = c.getContext('2d'); g.scale(3, 3); DS[type](g, d.w * T, d.h * T, S4);
  return SPRD[type] = c;
}
// verkleinde sprite (minder flikkering bij ver uitzoomen)
function mipSprite(type, sc) {
  const key = type + sc; if (MIP[key]) return MIP[key];
  const d = BUILD[type]; let c = dSprite(type);
  for (let s = 1.5; s >= sc - 1e-6; s /= 2) { const n = mk(d.w * T * s, d.h * T * s); n.getContext('2d').drawImage(c, 0, 0, n.width, n.height); c = n; }
  return MIP[key] = c;
}
function shMask(type) {
  if (SHM[type]) return SHM[type];
  const S = S4, d = BUILD[type], w = d.w * T, h = d.h * T, pad = Math.ceil(42 * S.shK) + 4, R = 2;
  const c = mk((w + 2 * pad) * R, (h + 2 * pad) * R), g = c.getContext('2d');
  for (const [hg, fn] of DSH[type](w, h)) {
    const m = mk(c.width, c.height), mg = m.getContext('2d'); mg.setTransform(R, 0, 0, R, pad * R, pad * R); mg.fillStyle = '#000'; fn(mg);
    const n = Math.max(1, Math.round(hg * S.shK * R));
    for (let i = 0; i <= n; i++) g.drawImage(m, S.sx * i, S.sy * i);
  }
  return SHM[type] = { c, pad, w: w + 2 * pad, h: h + 2 * pad };
}

// ---------- banden, geschut, uitvoer ----------
function beltD(g, cx, cy, rot, off, S) {
  g.save(); g.translate(cx, cy); g.rotate(rot * Math.PI / 2);
  g.fillStyle = S.beltBed; g.fillRect(-16, -11, 32, 22);
  g.save(); g.beginPath(); g.rect(-16, -11, 32, 22); g.clip();
  g.strokeStyle = S.beltTread; g.lineWidth = 2.4; g.lineJoin = 'miter';
  for (let i = -24 + off % 16; i < 26; i += 16) { g.beginPath(); g.moveTo(i - 5, -9); g.lineTo(i + 1, 0); g.lineTo(i - 5, 9); g.stroke(); }
  g.fillStyle = rgba(S.sandA, .12); g.fillRect(-16, -11, 32, 22);
  g.restore();
  g.fillStyle = S.metal; g.fillRect(-16, -15, 32, 4); g.fillRect(-16, 11, 32, 4);
  g.fillStyle = 'rgba(255,245,225,.38)'; g.fillRect(-16, -15, 32, 1); g.fillRect(-16, 11, 32, 1);
  g.fillStyle = S.ink; g.fillRect(-16, -11, 32, 1); g.fillRect(-16, 14.2, 32, .8); g.fillRect(-16, -15.5, 32, .6);
  for (const bx of [-9, 7]) { g.fillStyle = S.ink; circ(g, bx, -13, 1.1); g.fill(); circ(g, bx, 13, 1.1); g.fill(); }
  g.restore();
}
function qring(g, r0, r1) { g.beginPath(); g.arc(16, -16, r1, Math.PI / 2, Math.PI); g.arc(16, -16, r0, Math.PI, Math.PI / 2, true); g.closePath(); }
// bocht: lokaal frame, band loopt naar +x, invoer van y = side*16
function beltCurveD(g, b, side, off, S) {
  g.save(); g.translate(b.x * T + 16, b.y * T + 16); g.rotate(b.rot * Math.PI / 2); if (side > 0) g.scale(1, -1);
  g.fillStyle = S.metal; qring(g, 1, 31); g.fill();
  g.fillStyle = S.beltBed; qring(g, 5, 27); g.fill();
  g.save(); qring(g, 5, 27); g.clip();
  g.strokeStyle = S.beltTread; g.lineWidth = 2.4;
  for (let a = (off % 16) / 16 * (Math.PI / 4) - Math.PI / 4; a < Math.PI / 2 + .2; a += Math.PI / 4) {
    const p = r => { const ang = Math.PI - a + (r - 16) * -.012; return [16 + Math.cos(ang) * r, -16 + Math.sin(ang) * r]; }, m = Math.PI - a - .18;
    const A = p(7), B = [16 + Math.cos(m) * 16, -16 + Math.sin(m) * 16], C = p(25);
    g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineTo(C[0], C[1]); g.stroke();
  }
  g.fillStyle = rgba(S.sandA, .12); g.fillRect(-16, -16, 32, 32);
  g.restore();
  g.strokeStyle = 'rgba(255,245,225,.38)'; g.lineWidth = 1; g.beginPath(); g.arc(16, -16, 30.5, Math.PI / 2, Math.PI); g.stroke();
  g.strokeStyle = S.ink; g.beginPath(); g.arc(16, -16, 27, Math.PI / 2, Math.PI); g.stroke(); g.beginPath(); g.arc(16, -16, 5, Math.PI / 2, Math.PI); g.stroke();
  g.restore();
}
function gunD(g, x, y, ang, flash, S, sc = 1) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(sc, sc);
  g.fillStyle = S.ink; g.fillRect(2, -6.6, 24, 4.6); g.fillRect(2, 2, 24, 4.6);
  g.fillStyle = shade(S.metal, -.2); g.fillRect(2, -6, 23, 3.4); g.fillRect(2, 2.6, 23, 3.4);
  g.fillStyle = S.ink; for (let q = 9; q < 19; q += 3) { g.fillRect(q, -5.2, 1.3, 1.6); g.fillRect(q, 3.6, 1.3, 1.6); }
  g.fillStyle = shade(S.metal, -.4); g.fillRect(23, -7.4, 4.5, 6.2); g.fillRect(23, 1.2, 4.5, 6.2); g.strokeStyle = S.ink; g.lineWidth = .8; g.strokeRect(23, -7.4, 4.5, 6.2); g.strokeRect(23, 1.2, 4.5, 6.2);
  rr(g, -13, -10, 20, 20, 3); g.fillStyle = S.paint; g.fill(); g.strokeStyle = S.ink; g.lineWidth = S.inkW; g.stroke();
  poly(g, [[4, -12.5], [10, -9], [10, 9], [4, 12.5]]); g.fillStyle = shade(S.paint, -.28); g.fill(); g.stroke();
  circ(g, -4, 0, 4.6); g.fillStyle = shade(S.paint, -.16); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,246,225,.35)'; rr(g, -11, -8.5, 13, 2.6, 1.3); g.fill();
  g.fillStyle = S.accent; g.fillRect(-12.4, 5.6, 8, 2.6);
  for (const [rx, ry] of [[-10.5, -7.5], [-10.5, 7.5], [4.5, -7.5], [4.5, 7.5]]) rivetD(g, rx, ry, S);
  if (flash) { g.fillStyle = 'rgba(255,224,140,.95)'; for (const yy of [-3.9, 3.9]) { poly(g, [[28, yy - 3.6], [38, yy], [28, yy + 3.6], [31, yy]]); g.fill(); circ(g, 29, yy, 2.8); g.fill(); } }
  g.restore();
}
// uitvoerklep aan de kant van de pijl (b.rot)
function chuteD(c, b, S) {
  const cx = (b.x + b.w / 2) * T, cy = (b.y + b.h / 2) * T, e = b.w * T / 2;
  c.save(); c.translate(cx, cy); c.rotate(b.rot * Math.PI / 2);
  c.fillStyle = S.metal; rr(c, e - 7, -7.5, 10, 15, 2); c.fill(); c.strokeStyle = S.ink; c.lineWidth = S.inkW; c.stroke();
  c.fillStyle = S.accent; poly(c, [[e - 4, -4.5], [e + 1.5, 0], [e - 4, 4.5]]); c.fill(); c.strokeStyle = S.ink; c.lineWidth = .8; c.stroke();
  c.restore();
}

// ---------- kruiper (schorpioen) ----------
// e: { x, y (px), ang, r (px), anim, hit }
function bugD(c, e, S, B) {
  const s = e.r;
  c.save(); c.translate(e.x, e.y); c.rotate(e.ang); c.lineCap = 'round';
  c.strokeStyle = B.dark; c.lineWidth = Math.max(1, s * .13);
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
    const lx = s * (.38 - i * .3), sw = Math.sin(e.anim * 2 + i * 1.6 + (sd > 0 ? Math.PI : 0)) * s * .22;
    c.beginPath(); c.moveTo(lx, sd * s * .3); c.lineTo(lx + sw * .4 + s * .1, sd * s * .85); c.lineTo(lx + sw - s * .12, sd * s * 1.18); c.stroke();
  }
  const tw = Math.sin(e.anim * .7) * .1, tail = [[-.95, 0, .3], [-1.3, .08, .26], [-1.6, .03, .22], [-1.82, -.15, .19]];
  tail.forEach(([x, y, r], k) => { c.fillStyle = B.dark; circ(c, s * x, s * (y + tw * k), s * r + .6); c.fill(); c.fillStyle = B.col; circ(c, s * x - .3, s * (y + tw * k) - .4, s * r * .78); c.fill(); });
  c.fillStyle = B.dark; poly(c, [[s * -1.86, s * (-.32 + tw * 3)], [s * -1.62, s * (-.5 + tw * 3)], [s * -1.75, s * (-.2 + tw * 3)]]); c.fill();
  c.fillStyle = B.glow; circ(c, s * -1.84, s * (-.34 + tw * 3), Math.max(.8, s * .1)); c.fill();
  const op = .18 + Math.sin(e.anim * 1.3) * .1 + (e.bite ? .15 : 0);
  for (const sd of [-1, 1]) {
    c.strokeStyle = B.dark; c.lineWidth = Math.max(1.1, s * .17); c.beginPath(); c.moveTo(s * .45, sd * s * .22); c.lineTo(s * .95, sd * s * .5); c.stroke();
    c.fillStyle = B.col; c.beginPath(); c.ellipse(s * 1.1, sd * s * .5, s * .26, s * .17, sd * .3, 0, 7); c.fill(); c.strokeStyle = B.dark; c.lineWidth = .8; c.stroke();
    c.lineWidth = Math.max(1, s * .11); c.beginPath(); c.moveTo(s * 1.25, sd * s * .44); c.lineTo(s * 1.58, sd * s * (.42 - op)); c.moveTo(s * 1.28, sd * s * .56); c.lineTo(s * 1.6, sd * s * (.58 + op * .4)); c.stroke();
  }
  for (const [x, rx, ry] of [[-.6, .42, .36], [-.22, .5, .44], [.25, .42, .38]]) {
    c.fillStyle = B.dark; c.beginPath(); c.ellipse(s * x, 0, s * rx + .7, s * ry + .7, 0, 0, 7); c.fill();
    c.fillStyle = B.col; c.beginPath(); c.ellipse(s * x - .2, -.3, s * rx, s * ry, 0, 0, 7); c.fill();
  }
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = .8; for (const x of [-.4, -.05]) { c.beginPath(); c.arc(s * x, 0, s * .42, -1.2, 1.2); c.stroke(); }
  const la = Math.atan2(S.ly, S.lx) - e.ang; c.fillStyle = `rgba(255,240,210,${B.sheen})`; c.beginPath(); c.ellipse(Math.cos(la) * s * .22 - s * .1, Math.sin(la) * s * .22, s * .48, s * .18, la + Math.PI / 2, 0, 7); c.fill();
  c.fillStyle = B.glow; for (let i = 0; i < 3; i++) { circ(c, -s * .55 + i * s * .36, (i % 2 ? 1 : -1) * s * .13, Math.max(.8, s * .08)); c.fill(); }
  if (e.hit) { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-s * .2, 0, s * 1.1, s * .6, 0, 0, 7); c.fill(); }
  c.restore();
}

// ---------- nest: torentjes van klei met gloeiende gaten ----------
function nestParts(n) {
  if (n._sp) return n._sp;
  const R = mulberry(n.seed * 7 + 3), sp = [{ x: 0, y: 0, r: .62 * T }];
  for (let k = 0; k < 7; k++) { const an = R() * 6.283, d = (.55 + R() * .75) * T; sp.push({ x: Math.cos(an) * d, y: Math.sin(an) * d * .8, r: (.2 + R() * .3) * T }); }
  sp.sort((p, q) => p.y - q.y);
  const bones = [[-62 + R() * 20, 50, R() * 3], [18, -66 + R() * 20, R() * 3]];
  return n._sp = { sp, bones };
}
function nestD(c, n, t, S) {
  const X = n.x * T, Y = n.y * T, P = nestParts(n);
  const gr = c.createRadialGradient(X, Y, 8, X, Y, 2.7 * T); gr.addColorStop(0, rgba(S.nestGround, .6)); gr.addColorStop(1, rgba(S.nestGround, 0)); c.fillStyle = gr; circ(c, X, Y, 2.7 * T); c.fill();
  const R = mulberry(n.seed + 40);
  for (let k = 0; k < 9; k++) { const a = R() * 6.283, d = (1.4 + R()) * T, x = X + Math.cos(a) * d, y = Y + Math.sin(a) * d * .8; c.fillStyle = S.nest.hole; c.globalAlpha = .7; c.beginPath(); c.ellipse(x, y, 2.5 + R() * 2, 1.6 + R(), a, 0, 7); c.fill(); c.globalAlpha = 1; c.fillStyle = shade(S.nest.a, .2); c.beginPath(); c.arc(x - S.lx, y - S.ly + 1.5, 3, 0, Math.PI); c.fill(); }
  for (const [bx, by, ba] of P.bones) bone(c, X + bx, Y + by, ba, S);
  for (const sp of P.sp) {
    const x = X + sp.x, y = Y + sp.y, r = sp.r;
    const g2 = c.createRadialGradient(x + S.lx * r * .45, y + S.ly * r * .45, r * .1, x, y, r); g2.addColorStop(0, S.nest.b); g2.addColorStop(.6, S.nest.a); g2.addColorStop(1, shade(S.nest.a, -.45));
    c.fillStyle = g2; circ(c, x, y, r); c.fill(); c.strokeStyle = S.ink; c.lineWidth = .9; c.stroke();
    c.strokeStyle = 'rgba(40,20,10,.3)'; c.lineWidth = .8; for (const q of [.72, .48]) { c.beginPath(); c.arc(x, y, r * q, 0, 7); c.stroke(); }
    c.fillStyle = S.nest.hole; circ(c, x, y, r * .26); c.fill();
  }
  c.save(); c.globalCompositeOperation = 'lighter';
  P.sp.forEach((sp, k) => { const p = .5 + .5 * Math.sin(t * 2.6 + k * 1.9 + n.seed), x = X + sp.x, y = Y + sp.y, r2 = sp.r * .7; const g3 = c.createRadialGradient(x, y, 0, x, y, r2); g3.addColorStop(0, rgba(S.nest.glow, .55 * p)); g3.addColorStop(1, rgba(S.nest.glow, 0)); c.fillStyle = g3; circ(c, x, y, r2); c.fill(); });
  c.restore();
}
function nestShadow(l, n, S) {
  const P = nestParts(n); l.strokeStyle = '#000'; l.lineCap = 'round';
  for (const sp of P.sp) { const x = n.x * T + sp.x, y = n.y * T + sp.y, L = sp.r * 1.8 * S.shK; l.lineWidth = sp.r * 1.7; l.beginPath(); l.moveTo(x, y); l.lineTo(x + S.sx * L, y + S.sy * L); l.stroke(); }
}
function bone(c, x, y, a, S) {
  c.save(); c.translate(x, y); c.rotate(a); c.strokeStyle = S.bone; c.lineCap = 'round';
  c.lineWidth = 1.6; c.beginPath(); c.moveTo(-9, 0); c.lineTo(9, 0); c.stroke();
  c.lineWidth = 1.1; for (let i = -6; i <= 4; i += 3.3) for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(i, 0); c.quadraticCurveTo(i + 3, sd * 5, i + 1, sd * 7.5); c.stroke(); }
  c.fillStyle = S.bone; c.beginPath(); c.ellipse(11.5, 0, 3.2, 2.4, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(40,20,10,.6)'; circ(c, 12, -1, .7); c.fill(); circ(c, 12, 1, .7); c.fill();
  c.restore();
}
function shrub(g, x, y, S, R) {
  const r = 3 + R() * 4; g.fillStyle = rgba(S.shadeC, .45); g.beginPath(); g.ellipse(x + S.sx * r * S.shK * 1.5, y + S.sy * r * S.shK * 1.5, r * (1 + S.shK * .6), r * .7, Math.atan2(S.sy, S.sx), 0, 7); g.fill();
  g.lineCap = 'round'; g.lineWidth = .8;
  for (let i = 0; i < 16; i++) { const a = R() * 6.283, l = r * (.4 + R() * .7); g.strokeStyle = R() < .55 ? S.shrub[0] : S.shrub[1]; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + .5) * l * .5, y + Math.sin(a + .5) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
}
function oreD(g, x, y, type, amt, S) {
  if (type === OIL) return oilD(g, x, y, amt, S);
  const C = ORE4[type], R = mulberry(x * 7919 + y * 104729 + type), n = 4 + Math.min(3, amt / 140 | 0);
  const st = g.createRadialGradient(x * T + 16, y * T + 16, 2, x * T + 16, y * T + 16, 18); st.addColorStop(0, rgba(C.stain, .42)); st.addColorStop(1, rgba(C.stain, 0)); g.fillStyle = st; g.fillRect(x * T - 4, y * T - 4, T + 8, T + 8);
  for (let k = 0; k < n; k++) {
    const cx = x * T + 7 + R() * 18, cy = y * T + 7 + R() * 18, r = 3 + R() * 3.6, pts = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + R() * .5, q = r * (.75 + R() * .4); pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q * .85]); }
    const pl = (o, s) => { g.beginPath(); pts.forEach((p, i) => { const px = cx + (p[0] - cx) * s + o[0], py = cy + (p[1] - cy) * s + o[1]; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); };
    const L = 2.5 * (.6 + S.shK); pl([S.sx * L, S.sy * L], 1.05); g.fillStyle = rgba(S.shadeC, .7); g.fill();
    pl([0, 0], 1); g.fillStyle = C.a; g.fill(); g.strokeStyle = S.ink; g.lineWidth = .7; g.stroke();
    pl([S.lx * r * .22, S.ly * r * .22], .6); g.fillStyle = C.b; g.fill();
    g.fillStyle = C.hi; g.fillRect(cx + S.lx * r * .45, cy + S.ly * r * .45, 1.4, 1.2);
    g.fillStyle = C.sp; for (let i = 0; i < 3; i++) g.fillRect(cx + (R() - .5) * r, cy + (R() - .5) * r * .8, 1.3, 1.1);
  }
}
function smokeD(c, S, t, x, y, seed, n, len, big) {
  for (let i = 0; i < n; i++) {
    const a = (t * .3 + i / n + seed) % 1, px = x + S.wind[0] * a * len + Math.sin(a * 6 + i) * 3, py = y + S.wind[1] * a * len, r = (2.5 + a * 11) * big;
    const al = (1 - a) * Math.min(1, a * 8) * S.smokeA, gr = c.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, rgba(S.smoke, al)); gr.addColorStop(1, rgba(S.smoke, 0)); c.fillStyle = gr; circ(c, px, py, r); c.fill();
  }
}

// ---------- terrein: woestijn in stukken van 16×16 tegels, lui gebouwd ----------
// Rots (mesa) = waar de kaart "water" (ground 3) heeft: daar kun je niet bouwen of lopen.
const ZC = 16;
function rockF(M, x, y) {
  const tx = x / T, ty = y / T, n = fbm(tx / 13, ty / 13, M.seed), dc = Math.hypot(tx - M.cx, ty - M.cy);
  return Math.min((.3 - n) * 6, (dc - 14) * .6) + (fbm2(x / 22, y / 22, M.seed + 4) - .5) * .18;
}
function terH(M, x, y) {
  const S = S4, big = fbm(x / 260, y / 260, M.seed + 1), rk = rockF(M, x, y), rock = smooth(0, .07, rk);
  const f = Math.max(0, rk) * 4.5, terr = (Math.floor(f) + smooth(.72, 1, f % 1)) / 4.5;
  const rip = Math.sin((x * S.ripD[0] + y * S.ripD[1]) / 3.1 + fbm2(x / 50, y / 50, M.seed + 2) * 10), ripM = (1 - rock) * smooth(.3, .58, big) * S.rip;
  return [big * 14 + rip * ripM * .9 + rock * (8 + terr * 16), rock, big, rk];
}
const GRAIN = (() => { const c = mk(128, 128), g = c.getContext('2d'), R = mulberry(4); for (let i = 0; i < 2600; i++) { g.fillStyle = R() < .5 ? 'rgba(80,40,10,.09)' : 'rgba(255,245,220,.08)'; g.fillRect(R() * 128, R() * 128, 1 + R(), 1); } return c; })();
function initTerrain(M) {
  const zm = mk(M.W, M.H);
  G.ter = { first: true, ch: new Map(), dec: [], nx: Math.ceil(M.W / ZC), ny: Math.ceil(M.H / ZC), zmap: zm };
  drawZmap(M);
}
function drawZmap(M) {
  const c = G.ter.zmap, g = c.getContext('2d'), img = g.createImageData(M.W, M.H), d = img.data;
  for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) {
    const i = y * M.W + x, big = fbm((x + .5) * T / 260, (y + .5) * T / 260, M.seed + 1);
    let col = mix([226, 192, 140], [240, 214, 166], smooth(.3, .75, big));
    if (M.ground[i] === 3) col = [196, 128, 86]; else if (M.ore[i] && M.amt[i] > 0) col = ORE4[M.ore[i]].map;
    d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
function buildChunk(M, ci, cj) {
  const S = S4, X0 = ci * ZC * T, Y0 = cj * ZC * T, SW = Math.min(ZC, M.W - ci * ZC) * T, SH = Math.min(ZC, M.H - cj * ZC) * T, st = 4, NW = SW / st + 2, NH = SH / st + 2;
  const lo = mk(NW, NH), lg = lo.getContext('2d'), img = lg.createImageData(NW, NH), d = img.data;
  for (let py = 0; py < NH; py++) for (let px = 0; px < NW; px++) {
    const x = X0 + (px - 1 + .5) * st, y = Y0 + (py - 1 + .5) * st, [h0, rock, big, rk] = terH(M, x, y), [h1] = terH(M, x + S.sx * 2, y + S.sy * 2);
    let col = mix(S.sandLo, S.sandHi, smooth(.25, .78, big));
    const clayM = smooth(.58, .66, fbm(x / T / 9 + 50, y / T / 9, M.seed + 3)) * (1 - rock); if (clayM > 0) col = mix(col, S.clay, clayM * .55);
    if (rock > 0) { const sv = .5 + .5 * Math.sin(h0 * 1.6); col = mix(col, mix(S.rock, S.rockHi, sv * .45 + fbm2(x / 7, y / 7, M.seed + 9) * .35), rock); }
    const sv = Math.max(-1, Math.min(1, (h0 - h1) * S.hsK * .6)); col = sv > 0 ? mix(col, S.hi, sv * S.hiA) : mix(col, S.shadeC, -sv * S.loA);
    if (rk > -.45 && rock < .9) for (let k = 4; k <= 28 * S.shK; k += 4) { const [hh] = terH(M, x - S.sx * k, y - S.sy * k); if (hh - h0 > k / S.shK) { col = mix(col, S.shadeC, S.castA); break; } }
    const o = (py * NW + px) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
  }
  lg.putImageData(img, 0, 0);
  const c = mk(SW, SH), g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(lo, 1, 1, NW - 2, NH - 2, 0, 0, SW, SH);
  g.fillStyle = g.createPattern(GRAIN, 'repeat'); g.fillRect(0, 0, SW, SH);
  g.translate(-X0, -Y0); const Rn = mulberry(ci * 97 + cj * 13 + M.seed);
  const free = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T), i = ty * M.W + tx; return tx >= 0 && ty >= 0 && tx < M.W && ty < M.H && M.ground[i] !== 3 && !M.ore[i]; };
  for (let k = 0; k < 60; k++) { const x = X0 + Rn() * SW, y = Y0 + Rn() * SH; if (!free(x, y)) continue; const r = .8 + Rn() * 1.8; g.fillStyle = rgba(S.shadeC, .45); g.beginPath(); g.ellipse(x + S.sx * r * 1.2, y + S.sy * r * 1.2, r * 1.2, r * .8, 0, 0, 7); g.fill(); g.fillStyle = rgba(mix(S.rock, S.rockHi, Rn()), 1); g.beginPath(); g.ellipse(x, y, r, r * .78, 0, 0, 7); g.fill(); }
  for (let k = 0; k < 10; k++) { const x = X0 + Rn() * SW, y = Y0 + Rn() * SH; if (free(x, y)) shrub(g, x, y, S, Rn); }
  if (Rn() < .25) { const x = X0 + Rn() * SW, y = Y0 + Rn() * SH; if (free(x, y)) bone(g, x, y, Rn() * 6.283, S); }
  for (let ty = cj * ZC - 1; ty <= (cj + 1) * ZC; ty++) for (let tx = ci * ZC - 1; tx <= (ci + 1) * ZC; tx++) {
    if (tx < 0 || ty < 0 || tx >= M.W || ty >= M.H) continue; const i = ty * M.W + tx; if (M.ore[i] && M.amt[i] > 0) oreD(g, tx, ty, M.ore[i], M.amt[i], S);
  }
  for (const dc of G.ter.dec) if (dc.x * T + dc.r * T > X0 && dc.x * T - dc.r * T < X0 + SW && dc.y * T + dc.r * T > Y0 && dc.y * T - dc.r * T < Y0 + SH) paintDecal(g, dc);
  return c;
}
// vraag een stuk op; bouw het als er nog budget is (anders null → effen zand)
function getChunk(ci, cj, budget) {
  const key = ci + ',' + cj; let ch = G.ter.ch.get(key);
  if ((!ch || ch.dirty) && budget.n > 0) { budget.n--; ch = { c: buildChunk(G.M, ci, cj), dirty: false }; G.ter.ch.set(key, ch); }
  return ch;
}
function chunkOf(tx, ty) { return G.ter.ch.get(Math.floor(tx / ZC) + ',' + Math.floor(ty / ZC)); }
// erts op (x,y) is op: stuk opnieuw tekenen (ook buren, want de vlek steekt uit)
function oreChanged(x, y) {
  for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) { const ch = chunkOf(x + dx, y + dy); if (ch) ch.dirty = true; }
  drawZmap(G.M);
}
function paintDecal(g, dc) {
  const X = dc.x * T, Y = dc.y * T, R = dc.r * T;
  if (dc.kind === 'scorch') {
    const gr = g.createRadialGradient(X, Y, 0, X, Y, R);
    gr.addColorStop(0, 'rgba(30,16,8,.6)'); gr.addColorStop(.6, 'rgba(50,26,12,.3)'); gr.addColorStop(1, 'rgba(50,26,12,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(X, Y, R, 0, 7); g.fill();
  } else {
    const Rn = mulberry(dc.seed);
    for (let i = 0; i < 7; i++) {
      const a = Rn() * 6.283, d = Rn() * R * .8; g.fillStyle = rgba(S4.goo, .2 + Rn() * .3);
      g.beginPath(); g.arc(X + Math.cos(a) * d, Y + Math.sin(a) * d, R * (.15 + Rn() * .3), 0, 7); g.fill();
    }
  }
}
function terrainDecal(x, y, kind, r) {
  const dc = { x, y, kind, r, seed: (Math.random() * 1e9) | 0 }; G.ter.dec.push(dc);
  if (G.ter.dec.length > 600) G.ter.dec.shift();
  for (let cj = Math.floor((y - r) / ZC); cj <= Math.floor((y + r) / ZC); cj++) for (let ci = Math.floor((x - r) / ZC); ci <= Math.floor((x + r) / ZC); ci++) {
    const ch = G.ter.ch.get(ci + ',' + cj); if (!ch) continue;
    const g = ch.c.getContext('2d'); g.save(); g.translate(-ci * ZC * T, -cj * ZC * T); paintDecal(g, dc); g.restore();
  }
}
