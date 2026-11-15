'use strict';
// Stijl 4A voor productie B: pijp, tank, oliepomp, raffinaderij, chemiehal, staalpers, printplaatlijn, grote boor,
// steengroeve, recycler, wrakken, oliebronnen + zwavelzand, nieuwe spullen.
Object.assign(MAPCOL, { pipe: '#7a7064', tank: '#9e9584', pump: '#3a3028', refinery: '#b8402a', chem: '#6f9f96', press: '#7d8c9a', pcb: '#3f7a4a', drill3: '#5f8f86', quarry: '#a0805e', recycler: '#d9b44a' });
ORE4[5] = { a: '#a8862a', b: '#d8b83a', hi: '#fff0a0', sp: '#7a5e1e', stain: [200, 170, 60], map: [222, 196, 70] };
ORE4[6] = { a: '#120e0a', b: '#2a2218', hi: '#8a7a60', sp: '#000', stain: [30, 22, 14], map: [24, 18, 14] };
const PIPEC = '#8a8172', STEELC = '#7d8c9a';

// oliebron: glanzende zwarte plas in plaats van brokken
function oilD(g, x, y, amt, S) {
  const cx = x * T + 16, cy = y * T + 16, R = mulberry(x * 131 + y * 71);
  const st = g.createRadialGradient(cx, cy, 2, cx, cy, 22); st.addColorStop(0, 'rgba(20,14,8,.55)'); st.addColorStop(1, 'rgba(20,14,8,0)'); g.fillStyle = st; g.fillRect(x * T - 6, y * T - 6, T + 12, T + 12);
  const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, r = 10 + R() * 5; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * .8]); }
  poly(g, pts); g.fillStyle = '#0e0a07'; g.fill(); g.strokeStyle = 'rgba(60,40,20,.6)'; g.lineWidth = 1.2; g.stroke();
  const gr = g.createLinearGradient(cx + S.lx * 10, cy + S.ly * 10, cx - S.lx * 10, cy - S.ly * 10);
  gr.addColorStop(0, 'rgba(160,140,190,.35)'); gr.addColorStop(.5, 'rgba(90,120,110,.15)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  poly(g, pts.map(p => [cx + (p[0] - cx) * .7, cy + (p[1] - cy) * .7])); g.fillStyle = gr; g.fill();
  g.fillStyle = 'rgba(255,250,235,.55)'; g.beginPath(); g.ellipse(cx + S.lx * 4, cy + S.ly * 4, 3, 1.4, -.4, 0, 6.283); g.fill();
  if (amt > 110) { g.strokeStyle = 'rgba(200,190,170,.25)'; g.lineWidth = .8; g.beginPath(); g.arc(cx + 3, cy + 2, 4, 0, 6.283); g.stroke(); }
}

// ---------- pijp ----------
function pipeMask(x, y) { let m = 0; for (let d = 0; d < 4; d++) { const n = G && bAt(x + DX[d], y + DY[d]); if (isFLink(n)) m |= 1 << d; } return m; }
function pipeD(c, x, y, m, S, ft) {
  const cx = x * T + 16, cy = y * T + 16;
  if (!m) m = 5; else if (m === 1 || m === 4) m = 5; else if (m === 2 || m === 8) m = 10;
  for (let d = 0; d < 4; d++) if (m & 1 << d) {
    c.save(); c.translate(cx, cy); c.rotate(d * Math.PI / 2);
    c.fillStyle = S.ink; c.fillRect(0, -6.4, 16.5, 12.8);
    c.fillStyle = PIPEC; c.fillRect(0, -5.3, 16.5, 10.6);
    c.fillStyle = 'rgba(255,246,225,.35)'; c.fillRect(0, -4.2, 16.5, 2);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, 2.4, 16.5, 2.9);
    c.fillStyle = S.ink; c.fillRect(12.5, -7.2, 3.4, 14.4); c.fillStyle = shade(PIPEC, -.15); c.fillRect(13, -6.6, 2.4, 13.2);
    c.restore();
  }
  c.fillStyle = S.ink; circ(c, cx, cy, 7.4); c.fill(); c.fillStyle = shade(PIPEC, .08); circ(c, cx, cy, 6.4); c.fill();
  c.fillStyle = ft ? FLUIDS[ft].c : '#1a1410'; circ(c, cx, cy, 3.4); c.fill();
  if (ft) { c.fillStyle = FLUIDS[ft].h; circ(c, cx - 1, cy - 1, 1.2); c.fill(); }
}

// ---------- vaste sprites ----------
function tankD(g, w, h, S) {
  g.fillStyle = 'rgba(0,0,0,.25)'; circ(g, w / 2, h / 2 + 2, 28); g.fill();
  g.fillStyle = S.ink; circ(g, w / 2, h / 2, 28.5); g.fill();
  const gr = g.createRadialGradient(w / 2 + S.lx * 12, h / 2 + S.ly * 12, 3, w / 2, h / 2, 28); gr.addColorStop(0, shade(S.metal, .3)); gr.addColorStop(1, shade(S.metal, -.35));
  g.fillStyle = gr; circ(g, w / 2, h / 2, 27.3); g.fill();
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; rivetD(g, w / 2 + Math.cos(a) * 24.5, h / 2 + Math.sin(a) * 24.5, S); }
  g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; g.beginPath(); g.arc(w / 2, h / 2, 18, 0, 6.283); g.stroke();
  g.fillStyle = S.ink; circ(g, w / 2, h / 2, 6.5); g.fill(); g.fillStyle = shade(S.metal, -.1); circ(g, w / 2, h / 2, 5.4); g.fill();
  hazardD(g, w / 2 - 14, h - 9, 28, 4, S);
}
function pumpBaseD(g, w, h, S) {
  g.fillStyle = shade('#3a3028', -.2); rr(g, 3, 5, w - 6, h - 8, 3); g.fill();
  plateD(g, 4, h / 2 - 2, w - 8, h / 2 - 2, 4, shade(S.metal, -.3), S, { seed: 17, rivets: false, wear: 3 });
  g.fillStyle = S.ink; rr(g, 6, 8, 10, 14, 2); g.fill(); g.fillStyle = S.paint; rr(g, 7, 9, 8, 12, 1.5); g.fill();   // motor
  g.fillStyle = S.ink; g.fillRect(w / 2 - 3, 6, 6, h - 20); g.fillStyle = S.metal; g.fillRect(w / 2 - 2, 7, 4, h - 22);   // bok
  g.fillStyle = '#0e0a07'; circ(g, w - 12, h - 12, 5); g.fill(); g.fillStyle = S.ink; g.lineWidth = 1; g.strokeStyle = S.ink; circ(g, w - 12, h - 12, 5.6); g.stroke();
  stencilD(g, 'OP-1', 6, h - 4, 6, 'rgba(255,240,215,.55)');
}
function pumpBeamD(c, X, Y, w, h, ph, S) {
  const px = X + w / 2, py = Y + 10, a = Math.sin(ph) * .22, L = 22;
  c.save(); c.translate(px, py); c.rotate(a);
  c.fillStyle = S.ink; rr(c, -L + 4, -3.4, 2 * L - 2, 6.8, 2); c.fill();
  c.fillStyle = S.accent; rr(c, -L + 5, -2.4, 2 * L - 4, 4.8, 1.5); c.fill();
  c.fillStyle = S.ink; rr(c, L - 4, -6, 7, 12, [2, 5, 5, 2]); c.fill(); c.fillStyle = shade(S.metal, -.15); rr(c, L - 3.2, -5.2, 5.4, 10.4, [1.5, 4, 4, 1.5]); c.fill();   // kop
  c.fillStyle = S.ink; rr(c, -L - 2, -5, 8, 10, 2); c.fill(); c.fillStyle = shade(S.metal, -.4); rr(c, -L - 1.2, -4.2, 6.4, 8.4, 1.5); c.fill();   // contragewicht
  c.restore();
  c.fillStyle = S.ink; circ(c, px, py, 3.2); c.fill(); c.fillStyle = S.metal; circ(c, px, py, 2); c.fill();
}
function stackD(g, x, y, r, S, col) {
  g.fillStyle = S.ink; circ(g, x, y, r + 1); g.fill();
  const gr = g.createRadialGradient(x + S.lx * r * .5, y + S.ly * r * .5, 1, x, y, r); gr.addColorStop(0, shade(col, .3)); gr.addColorStop(1, shade(col, -.35));
  g.fillStyle = gr; circ(g, x, y, r); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; for (const f of [.62, .3]) { g.beginPath(); g.arc(x, y, r * f, 0, 6.283); g.stroke(); }
}
function drill3Head(c, cx, cy, spin, S, det) {
  c.save(); c.translate(cx, cy); c.rotate(spin);
  for (let q = 0; q < 4; q++) { c.rotate(Math.PI / 2); c.fillStyle = shade(S.metal, .1); poly(c, [[4, -4], [20, -7], [20, 7], [4, 4]]); c.fill(); c.strokeStyle = S.ink; c.lineWidth = 1.2; c.stroke(); if (det !== false) { c.fillStyle = S.accent; c.fillRect(17, -6.5, 3, 13); } }
  c.fillStyle = S.metal; circ(c, 0, 0, 7.5); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,246,225,.35)'; circ(c, -2, -2, 2.6); c.fill();
  c.restore();
}

Object.assign(DS, {
  pipe(g, w, h, S) { pipeD(g, 0, 0, 5, S, null); },
  tank: tankD,
  pump: pumpBaseD,
  refinery(g, w, h, S) {
    plateD(g, 2, 2, w - 4, h - 4, 9, shade(S.metal, -.2), S, { seed: 101, r: 4, rv: 9 });
    // leidingwerk
    g.strokeStyle = S.ink; g.lineWidth = 5.4; g.beginPath(); g.moveTo(22, 26); g.lineTo(w - 26, 26); g.lineTo(w - 26, h - 30); g.moveTo(22, 26); g.lineTo(22, h - 22); g.stroke();
    g.strokeStyle = PIPEC; g.lineWidth = 3.4; g.stroke();
    stackD(g, 24, 24, 13, S, S.paint2);                   // kolom
    stackD(g, w - 26, 26, 10, S, S.metal);
    stackD(g, w - 26, h - 30, 11, S, '#b8402a');
    stackD(g, 26, h - 26, 9, S, S.metal);
    g.fillStyle = S.ink; circ(g, w - 14, 12, 5); g.fill(); g.fillStyle = '#1a120c'; circ(g, w - 14, 12, 3.6); g.fill();   // fakkel
    hazardD(g, 40, h - 14, w - 54, 4, S);
    stencilD(g, 'RAF-3', 42, 16, 7, 'rgba(255,240,215,.6)');
  },
  chem(g, w, h, S) {
    plateD(g, 2, 2, w - 4, h - 4, 9, S.paint, S, { seed: 111, r: 5, rv: 9 });
    for (const [x, y] of [[26, 28], [w - 26, 28], [26, h - 34], [w - 26, h - 34]]) {
      g.fillStyle = S.ink; circ(g, x, y, 14); g.fill(); g.fillStyle = shade(S.metal, -.25); circ(g, x, y, 13); g.fill();
      g.fillStyle = '#16110c'; circ(g, x, y, 9.5); g.fill(); g.strokeStyle = 'rgba(255,246,225,.3)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 12, Math.atan2(S.ly, S.lx) - 1, Math.atan2(S.ly, S.lx) + 1); g.stroke();
    }
    g.fillStyle = S.ink; rr(g, w / 2 - 7, 10, 14, h - 34, 3); g.fill(); g.fillStyle = S.paint2; rr(g, w / 2 - 6, 11, 12, h - 36, 2.5); g.fill();
    hazardD(g, 10, h - 14, w - 20, 4, S);
    stencilD(g, 'CHEM', w / 2 - 11, h - 18, 7, shade(S.paint, .45));
  },
  press(g, w, h, S) {
    plateD(g, 2, 2, w - 4, h - 4, 8, STEELC, S, { seed: 121, r: 3 });
    g.fillStyle = S.ink; g.fillRect(7, 8, 6, h - 22); g.fillRect(w - 13, 8, 6, h - 22);
    g.fillStyle = S.metal; g.fillRect(8, 9, 4, h - 24); g.fillRect(w - 12, 9, 4, h - 24);
    g.fillStyle = '#16110c'; rr(g, 15, 18, w - 30, h - 34, 2); g.fill();
    hazardD(g, 6, h - 15, w - 12, 4, S);
    stencilD(g, 'SP-5', 16, 13, 6, 'rgba(20,14,10,.7)');
  },
  pcb(g, w, h, S) {
    plateD(g, 2, 2, w - 4, h - 4, 8, S.paint2, S, { seed: 131, r: 4 });
    g.fillStyle = S.ink; rr(g, 6, h / 2 - 9, w - 12, 16, 2); g.fill(); g.fillStyle = S.beltBed; g.fillRect(7, h / 2 - 8, w - 14, 14);
    g.strokeStyle = S.beltTread; g.lineWidth = 1.4; for (let x = 10; x < w - 8; x += 5) { g.beginPath(); g.moveTo(x, h / 2 - 7); g.lineTo(x, h / 2 + 5); g.stroke(); }
    g.fillStyle = S.ink; rr(g, w / 2 - 9, 6, 18, 12, 2); g.fill(); g.fillStyle = S.metal; rr(g, w / 2 - 8, 7, 16, 10, 1.5); g.fill();   // soldeerkop
    hazardD(g, 6, h - 13, w - 12, 4, S);
    stencilD(g, 'PCB', 7, 14, 6, shade(S.paint2, -.55));
  },
  drill3(g, w, h, S) {
    g.fillStyle = S.ink; g.fillRect(1, 8, 6, h - 14); g.fillRect(w - 7, 8, 6, h - 14);
    g.fillStyle = shade(S.metal, -.25); g.fillRect(1.7, 8.7, 4.6, h - 15.4); g.fillRect(w - 6.3, 8.7, 4.6, h - 15.4);
    plateD(g, 5, 4, w - 10, h - 8, 10, S.paint, S, { seed: 141, r: 5, rv: 9 });
    const cx = w / 2, cy = h / 2 - 4;
    g.fillStyle = S.metal; circ(g, cx, cy, 30); g.fill(); g.strokeStyle = S.ink; g.lineWidth = S.inkW; g.stroke();
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; rivetD(g, cx + Math.cos(a) * 26.5, cy + Math.sin(a) * 26.5, S); }
    g.fillStyle = '#120c08'; circ(g, cx, cy, 23); g.fill();
    for (const ex of [w - 14, 14]) { g.fillStyle = S.ink; circ(g, ex, 12, 5.4); g.fill(); g.fillStyle = shade(S.metal, -.1); circ(g, ex, 12, 4.4); g.fill(); g.fillStyle = '#0c0806'; circ(g, ex, 12, 2.6); g.fill(); }
    hazardD(g, 14, h - 15, w - 28, 4, S);
    stencilD(g, 'B-09', 12, h - 4.5, 7, shade(S.paint, .35));
  },
  quarry(g, w, h, S) {
    g.fillStyle = 'rgba(40,24,14,.35)'; rr(g, 2, 2, w - 4, h - 4, 6); g.fill();
    plateD(g, 4, 4, w - 8, 18, 5, shade(S.metal, -.15), S, { seed: 151, rivets: false, wear: 4 });
    g.fillStyle = '#1a120c'; rr(g, 8, 24, w - 16, h - 30, 4); g.fill(); g.strokeStyle = S.ink; g.lineWidth = 1.2; g.stroke();
    const R = mulberry(7); for (let i = 0; i < 14; i++) { g.fillStyle = R() < .5 ? '#a0805e' : '#c4a27a'; circ(g, 11 + R() * (w - 22), 28 + R() * (h - 38), 1.4 + R() * 2.2); g.fill(); }
    hazardD(g, 6, h - 9, w - 12, 4, S);
    stencilD(g, 'GR-2', 8, 17, 6, 'rgba(255,240,215,.6)');
  },
  recycler(g, w, h, S) {
    plateD(g, 2, 2, w - 4, h - 4, 7, '#7a6a5a', S, { seed: 161, r: 4 });
    g.fillStyle = S.ink; circ(g, w / 2, h / 2 - 3, 17); g.fill(); g.fillStyle = shade(S.metal, -.35); circ(g, w / 2, h / 2 - 3, 15.6); g.fill();
    g.strokeStyle = S.hazard || '#c9a227'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(w / 2, h / 2 - 3, 12, 0, 6.283); g.stroke(); g.setLineDash([]);
    hazardD(g, 6, h - 13, w - 12, 4, S);
    stencilD(g, 'RC', 6, 12, 6, 'rgba(255,240,215,.6)');
  },
});
Object.assign(DSH, {
  pipe: () => [[4, g => { g.fillRect(4, 11, 24, 10); }]],
  tank: (w, h) => [[24, g => { circ(g, w / 2, h / 2, 28); g.fill(); }]],
  pump: (w, h) => [[8, g => { rr(g, 3, 5, w - 6, h - 8, 3); g.fill(); }], [30, g => { g.fillRect(w / 2 - 20, 7, 40, 6); }]],
  refinery: (w, h) => [[12, g => { rr(g, 2, 2, w - 4, h - 4, 4); g.fill(); }], [46, g => { circ(g, 24, 24, 13); g.fill(); }], [30, g => { circ(g, w - 26, h - 30, 11); g.fill(); }], [40, g => { circ(g, w - 14, 12, 5); g.fill(); }]],
  chem: (w, h) => [[12, g => { rr(g, 2, 2, w - 4, h - 4, 5); g.fill(); }], [24, g => { for (const [x, y] of [[26, 28], [w - 26, 28], [26, h - 34], [w - 26, h - 34]]) { circ(g, x, y, 14); g.fill(); } }]],
  press: (w, h) => [[10, g => { rr(g, 2, 2, w - 4, h - 4, 3); g.fill(); }], [26, g => { g.fillRect(7, 8, 6, h - 22); g.fillRect(w - 13, 8, 6, h - 22); }]],
  pcb: (w, h) => [[10, g => { rr(g, 2, 2, w - 4, h - 4, 4); g.fill(); }]],
  drill3: (w, h) => [[12, g => { rr(g, 1, 4, w - 2, h - 8, 5); g.fill(); }], [30, g => { circ(g, w - 14, 12, 5.4); g.fill(); circ(g, 14, 12, 5.4); g.fill(); }]],
  quarry: (w, h) => [[8, g => { rr(g, 4, 4, w - 8, 18, 2); g.fill(); }]],
  recycler: (w, h) => [[9, g => { rr(g, 2, 2, w - 4, h - 4, 4); g.fill(); }], [22, g => { circ(g, w / 2, h / 2 - 3, 6); g.fill(); }]],
});
Object.assign(VEC, {
  pipe(c, b, S, rt, det) { pipeD(c, b.x, b.y, pipeMask(b.x, b.y), S, b.ft && b.fa > .5 ? b.ft : null); },
});

// ---------- per beeld: bewegende delen ----------
function fillGauge(c, x, y, w, f, col) {
  c.fillStyle = S4.ink; c.fillRect(x - 1, y - 1, w + 2, 5); c.fillStyle = '#1a1410'; c.fillRect(x, y, w, 3);
  c.fillStyle = col; c.fillRect(x, y, w * Math.max(0, Math.min(1, f)), 3);
}
const PDRAW = {
  tank(c, b, S, rt, det, X, Y, w, h) {
    const n = netOf(b); if (!n || !n.fl) return;
    const f = n.amt / n.cap; c.fillStyle = FLUIDS[n.fl].c; circ(c, X + w / 2, Y + h / 2, 4.2); c.fill();
    if (det) fillGauge(c, X + 14, Y + 6, w - 28, f, FLUIDS[n.fl].h);
  },
  pump(c, b, S, rt, det, X, Y, w, h) {
    pumpBeamD(c, X, Y, w, h, b.spin || 0, S);
    if (det && (b.fo.oil || 0) >= 59) blink(rt, X + w - 7, Y + 7, '#e0533a', 2);
  },
  refinery(c, b, S, rt, det, X, Y, w, h) {
    chuteD(c, b, S);
    if (b.act && det) {
      const fl = .7 + Math.sin(rt * 19 + b.id) * .2, fx = X + w - 14, fy = Y + 12;
      glow(c, fx, fy, 14, '255,150,60', .5 * fl);
      c.fillStyle = `rgba(255,${150 + fl * 80 | 0},60,.95)`; c.beginPath(); c.ellipse(fx + S.sx * -2, fy - 3, 2.6, 4.6 * fl, 0, 0, 6.283); c.fill();
      smokeD(c, S, rt, X + 24, Y + 18, b.id * .37 % 1, 8, 90, 1.3);
    }
    if (det && b.idle === 'vol') blink(rt, X + 9, Y + 9, '#e5b02a', 2.4);
  },
  chem(c, b, S, rt, det, X, Y, w, h) {
    chuteD(c, b, S);
    const col = b.recipe === 'explosive' ? '230,120,60' : '220,230,210';
    for (const [x, y] of [[26, 28], [w - 26, 28], [26, h - 34], [w - 26, h - 34]]) {
      if (b.act && det) { const q = Math.sin(rt * 6 + x * .3 + y) * .5 + .5; glow(c, X + x, Y + y, 10, col, .35 + q * .25); c.fillStyle = `rgba(${col},.7)`; circ(c, X + x + Math.sin(rt * 3 + y) * 4, Y + y + Math.cos(rt * 4 + x) * 3, 1.4 + q); c.fill(); }
    }
    if (det && PROD[b.recipe]) c.drawImage(itemSprite(PROD[b.recipe].out), X + w / 2 - 6, Y + h / 2 - 12, 12, 12);
  },
  press(c, b, S, rt, det, X, Y, w, h) {
    chuteD(c, b, S);
    const k = b.act ? Math.abs(Math.sin((b.spin || 0) * 1.4)) : 0, ry = Y + 12 + k * 14;
    c.fillStyle = S.ink; rr(c, X + 13, ry - 1, w - 26, 10, 2); c.fill(); c.fillStyle = shade(STEELC, .15); rr(c, X + 14, ry, w - 28, 8, 1.5); c.fill();
    c.fillStyle = 'rgba(255,246,225,.4)'; c.fillRect(X + 15, ry + 1, w - 30, 1.5);
  },
  pcb(c, b, S, rt, det, X, Y, w, h) {
    chuteD(c, b, S);
    if (det) { const o = b.act ? (b.spin * 6) % (w - 26) : 0; c.drawImage(itemSprite('circuit'), X + 8 + o, Y + h / 2 - 8, 12, 12); }
    if (b.act && det && (rt * 8 | 0) % 2) { glow(c, X + w / 2, Y + 18, 6, '255,220,140', .7); }
  },
  drill3(c, b, S, rt, det, X, Y, w, h) {
    if (det) drill3Head(c, X + w / 2, Y + h / 2 - 4, b.spin || 0, S, true);
    chuteD(c, b, S);
    if (b.empty) blink(rt, X + 12, Y + h - 12, '#e0533a', 2.4); else if (b.hold) blink(rt, X + 12, Y + h - 12, '#ffc533', 2.4);
    if (det && b.act && !b.hold) { smokeD(c, S, rt, X + w - 14, Y + 12, b.id * .37 % 1, 6, 60, 1); smokeD(c, S, rt, X + 14, Y + 12, (b.id * .53) % 1, 6, 60, 1); }
  },
  quarry(c, b, S, rt, det, X, Y, w, h) {
    chuteD(c, b, S);
    if (det) for (const dx of [-9, 9]) {
      c.save(); c.translate(X + w / 2 + dx, Y + 13); c.rotate((b.spin || 0) * (dx < 0 ? 1 : -1));
      c.fillStyle = S.ink; circ(c, 0, 0, 7.5); c.fill(); c.fillStyle = S.metal; circ(c, 0, 0, 6.4); c.fill();
      c.fillStyle = S.ink; for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.fillRect(3, -1.2, 4.5, 2.4); }
      c.restore();
    }
    if (det && b.act && Math.random() < .2) addP('debris', b.x + 1 + (Math.random() - .5), b.y + 1.3, (Math.random() - .5) * 2, (Math.random() - .5) * 2, .4, .04, '#c4a27a');
    if (b.hold) blink(rt, X + 9, Y + 9, '#ffc533', 2);
  },
  recycler(c, b, S, rt, det, X, Y, w, h) {
    chuteD(c, b, S);
    const cx = X + w / 2, cy = Y + h / 2 - 3, wr = G.wrecks[b.tgt];
    const a = wr ? Math.atan2(wr.y * T - cy, wr.x * T - cx) : (b.spin || 0) * .3, L = wr ? Math.min(RECYC.r * T, Math.hypot(wr.x * T - cx, wr.y * T - cy)) : 18;
    if (wr && b.act && det) {
      c.strokeStyle = `rgba(140,220,255,${.35 + Math.sin(rt * 20) * .2})`; c.lineWidth = 2; c.setLineDash([3, 4]); c.lineDashOffset = -rt * 30;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); c.stroke(); c.setLineDash([]);
      glow(c, cx + Math.cos(a) * L, cy + Math.sin(a) * L, 10, '140,220,255', .4);
    }
    c.save(); c.translate(cx, cy); c.rotate(a);
    c.fillStyle = S.ink; rr(c, -3, -3.5, 22, 7, 2); c.fill(); c.fillStyle = S.hazard || '#c9a227'; rr(c, -2, -2.5, 20, 5, 1.5); c.fill();
    c.fillStyle = S.ink; circ(c, 20, 0, 5.4); c.fill(); c.fillStyle = '#3a3a44'; circ(c, 20, 0, 4.3); c.fill(); c.fillStyle = 'rgba(160,200,230,.6)'; circ(c, 19, -1, 1.5); c.fill();
    c.restore();
    c.fillStyle = S.ink; circ(c, cx, cy, 4); c.fill(); c.fillStyle = S.accent; circ(c, cx, cy, 2.6); c.fill();
    if (b.hold) blink(rt, X + 9, Y + h - 10, '#ffc533', 2);
  },
};
// modules: kleine blokjes rechtsonder
function drawMods(c, b) {
  const X = (b.x + b.w) * T, Y = (b.y + b.h) * T;
  b.mods.forEach((m, i) => { const x = X - 10 - i * 9, y = Y - 10; c.fillStyle = S4.ink; c.fillRect(x - 1, y - 1, 9, 9); c.fillStyle = ITEMS[m].c; c.fillRect(x, y, 7, 7); c.fillStyle = ITEMS[m].h; c.fillRect(x + 1, y + 1, 5, 1.5); });
}

// ---------- wrakken ----------
function wreckD(c, w, S) {
  const R = mulberry(w.seed), X = w.x * T, Y = w.y * T, sz = (8 + w.s * 9) * (.55 + .45 * w.n / w.max);
  c.fillStyle = 'rgba(40,26,16,.35)'; c.beginPath(); c.ellipse(X + S.sx * 4, Y + S.sy * 4, sz * 1.1, sz * .8, 0, 0, 6.283); c.fill();
  for (let k = 0; k < 3 + w.s * 2; k++) {
    const a = R() * 6.283, d = R() * sz * .5, px = X + Math.cos(a) * d, py = Y + Math.sin(a) * d, r = sz * (.3 + R() * .35), pts = [];
    for (let i = 0; i < 5; i++) { const q = i / 5 * 6.283 + R() * .6; pts.push([px + Math.cos(q) * r * (.6 + R() * .5), py + Math.sin(q) * r * (.5 + R() * .4)]); }
    poly(c, pts); c.fillStyle = [shade(S.metal, -.35), '#5a4a3a', S.rust, shade(S.paint, -.3)][k % 4]; c.fill(); c.strokeStyle = S.ink; c.lineWidth = 1; c.stroke();
    c.strokeStyle = 'rgba(255,246,225,.25)'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.stroke();
  }
  c.fillStyle = S.ink; c.fillRect(X - sz * .4, Y - 1, sz * .8, 2);
}
function drawWrecks(vis, S, mid) {
  for (const w of G.wrecks) {
    if (!vis(w.x * T, w.y * T, 2 * T)) continue;
    if (!mid) { ctx.fillStyle = '#5a4a3a'; ctx.fillRect((w.x - .5) * T, (w.y - .5) * T, T * w.s, T * w.s); continue; }
    wreckD(ctx, w, S);
  }
}
// bouwbalk-icoon: bewegende delen die niet in de vaste sprite zitten
const ICON_EXTRA = { pump: g => pumpBeamD(g, 0, 0, 64, 64, 0, S4), drill3: g => drill3Head(g, 48, 44, .4, S4, true) };

// ---------- spullen ----------
const ITEM_SHAPES = {
  scrap(g, I) {
    poly(g, [[3, 9], [7, 4], [10, 6], [13, 3], [14, 10], [9, 13], [4, 13]]); g.fillStyle = 'rgba(0,0,0,.35)'; g.save(); g.translate(.6, 1); g.fill(); g.restore();
    g.fillStyle = I.c; g.fill(); g.strokeStyle = I.d; g.stroke();
    g.fillStyle = '#9a4a22'; g.fillRect(6, 8, 3, 2); g.fillStyle = I.h; g.fillRect(8, 5.5, 3, 1);
    g.strokeStyle = I.d; g.beginPath(); g.moveTo(5, 10); g.lineTo(11, 8); g.stroke();
  },
  wire(g, I) {
    g.fillStyle = 'rgba(0,0,0,.35)'; circ(g, 8.6, 9.3, 5.6); g.fill();
    g.fillStyle = '#4a3424'; circ(g, 8, 8.5, 5.6); g.fill();
    g.strokeStyle = I.c; g.lineWidth = 1.3; for (const r of [4.8, 3.6, 2.4]) { g.beginPath(); g.arc(8, 8.5, r, 0, 6.283); g.stroke(); }
    g.strokeStyle = I.h; g.lineWidth = .8; g.beginPath(); g.arc(8, 8.5, 4.8, 3.6, 4.6); g.stroke();
    g.fillStyle = '#2a1f18'; circ(g, 8, 8.5, 1.3); g.fill();
  },
  chip(g, I) {
    rr(g, 2.6, 4.4, 11.5, 9, 1); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    rr(g, 2, 3.6, 11.5, 9, 1); g.fillStyle = I.c; g.fill(); g.strokeStyle = I.d; g.stroke();
    g.strokeStyle = I.h; g.lineWidth = .7; g.beginPath(); g.moveTo(3, 6); g.lineTo(6, 6); g.lineTo(7, 8); g.moveTo(3, 10); g.lineTo(9, 10); g.lineTo(11, 7); g.lineTo(12.5, 7); g.stroke();
    g.fillStyle = '#1a1410'; g.fillRect(7.5, 5, 3.5, 3.5); g.fillStyle = I.h; for (let i = 0; i < 3; i++) { g.fillRect(7.6 + i * 1.3, 4.2, .6, .8); g.fillRect(7.6 + i * 1.3, 8.5, .6, .8); }
  },
  mod(g, I) {
    rr(g, 2.6, 3.6, 11.5, 10.5, 1.5); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    rr(g, 2, 2.8, 11.5, 10.5, 1.5); g.fillStyle = '#3a3c3a'; g.fill(); g.strokeStyle = '#141412'; g.stroke();
    rr(g, 3.5, 4.2, 8.5, 7.5, 1); g.fillStyle = I.c; g.fill();
    g.fillStyle = I.h; g.fillRect(4.5, 5.2, 6.5, 1.2);
    g.fillStyle = I.d; if (I.n.startsWith('Snel')) poly(g, [[6, 7], [10, 8.5], [6, 10.5]]); else { circ(g, 7.8, 8.6, 1.8); } g.fill();
  },
  tar(g, I) {
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(8.6, 10.2, 5.6, 3.8, 0, 0, 6.283); g.fill();
    poly(g, [[3, 10], [4, 6.5], [7, 5], [10.5, 5.5], [13, 8], [12.5, 11.5], [8, 12.8], [4.5, 12]]); g.fillStyle = I.c; g.fill(); g.strokeStyle = I.d; g.stroke();
    g.fillStyle = I.h; g.beginPath(); g.ellipse(7, 7.2, 2, .9, -.3, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(6.2, 6.8, 1, .7);
  },
  box(g, I) {
    rr(g, 3, 5, 11, 9, 1); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
    rr(g, 2.4, 4.2, 11, 9, 1); g.fillStyle = I.c; g.fill(); g.strokeStyle = I.d; g.stroke();
    g.save(); rr(g, 2.4, 7.2, 11, 2.6, 0); g.clip(); g.fillStyle = '#d9b44a'; g.fillRect(2, 7, 12, 3); g.strokeStyle = '#2a1f18'; g.lineWidth = 1; for (let i = 0; i < 14; i += 2.5) { g.beginPath(); g.moveTo(2 + i, 10); g.lineTo(4 + i, 7); g.stroke(); } g.restore();
    g.fillStyle = I.h; g.fillRect(3.4, 5, 9, .9);
  },
};
