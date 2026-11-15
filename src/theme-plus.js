'use strict';
// Stijl 4A voor de nieuwe gebouwen: grijparm, kist, paal, verdeler, tunnelband, ketel, generator, werkplaats, vuurspuwer, betonmuur.
// Vaste delen → DS/DSH (zoals theme.js). Draaiende 1×1-gebouwen (BUILD.vec) → VEC, per beeld getekend.
Object.assign(MAPCOL, { arm: '#d9b44a', chest: '#8a6a44', pole: '#d0844c', splitter: '#5a4630', tunnel: '#4a3a2c', boiler: '#9a4a22', generator: '#5f8f86', lab: '#ddd1b0', flamer: '#ff7a2a', wall2: '#6a6050' });
const COPPER = '#c47a44', GLASS = [120, 190, 180];

// ---------- per beeld (draaien mee) ----------
const VEC = {
  arm(c, b, S, rt, det) {
    const cx = b.x * T + 16, cy = b.y * T + 16;
    c.fillStyle = S.ink; circ(c, cx, cy, 9.5); c.fill();
    c.fillStyle = shade(S.metal, -.15); circ(c, cx, cy, 8.4); c.fill();
    c.strokeStyle = S.accent; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 6.4, 0, 6.283); c.stroke();
    for (let i = 0; i < 4; i++) { const a = i * 1.571 + .785; rivetD(c, cx + Math.cos(a) * 6.4, cy + Math.sin(a) * 6.4, S); }
    // pijlpunt op de voet: richting van neerleggen
    c.save(); c.translate(cx, cy); c.rotate(b.rot * Math.PI / 2); c.fillStyle = S.accent; poly(c, [[10.5, -3], [14.5, 0], [10.5, 3]]); c.fill(); c.strokeStyle = S.ink; c.lineWidth = .7; c.stroke(); c.restore();
    const a = (b.rot + 2) * Math.PI / 2 + (b.sw || 0) * Math.PI, L = 13.5, tx = cx + Math.cos(a) * L, ty = cy + Math.sin(a) * L;
    c.lineCap = 'round'; c.strokeStyle = S.ink; c.lineWidth = 6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(tx, ty); c.stroke();
    c.strokeStyle = S.hazard || '#c9a227'; c.lineWidth = 3.8; c.beginPath(); c.moveTo(cx, cy); c.lineTo(tx, ty); c.stroke(); c.lineCap = 'butt';
    // klauw
    c.save(); c.translate(tx, ty); c.rotate(a); c.strokeStyle = S.ink; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(0, -3.5); c.lineTo(4, -3.5); c.moveTo(0, 3.5); c.lineTo(4, 3.5); c.moveTo(0, -3.5); c.lineTo(0, 3.5); c.stroke(); c.restore();
    if (b.hold && det !== false) c.drawImage(itemSprite(b.hold), tx - 6, ty - 6, 12, 12);
    c.fillStyle = S.ink; circ(c, cx, cy, 3.4); c.fill(); c.fillStyle = S.metal; circ(c, cx, cy, 2.3); c.fill();
  },
  splitter(c, b, S, rt, det) {
    c.save(); c.translate(b.x * T + 16, b.y * T + 16); c.rotate(b.rot * Math.PI / 2);
    c.fillStyle = S.beltBed; c.fillRect(-16, -16, 32, 32);
    c.fillStyle = S.metal; for (const [x, y] of [[-16, -16], [10, -16], [-16, 10], [10, 10]]) { c.fillRect(x, y, 6, 6); }
    c.strokeStyle = S.ink; c.lineWidth = 1; c.strokeRect(-15.5, -15.5, 31, 31);
    c.strokeStyle = S.beltTread; c.lineWidth = 2.2;
    for (const r of [0, -Math.PI / 2, Math.PI / 2]) { c.save(); c.rotate(r); const o = ((G ? G.time : 0) * beltSpd() * T) % 8; c.beginPath(); c.moveTo(6 + o - 3, -4); c.lineTo(6 + o, 0); c.lineTo(6 + o - 3, 4); c.stroke(); c.restore(); }
    c.fillStyle = S.ink; circ(c, 0, 0, 8.6); c.fill(); c.fillStyle = S.metal; circ(c, 0, 0, 7.6); c.fill();
    c.fillStyle = S.accent;
    poly(c, [[3, -2.4], [7, 0], [3, 2.4]]); c.fill(); poly(c, [[-2.4, -3], [0, -7], [2.4, -3]]); c.fill(); poly(c, [[-2.4, 3], [0, 7], [2.4, 3]]); c.fill();
    c.restore();
    const cx = b.x * T + 16, cy = b.y * T + 16;
    if (b.filter) { c.fillStyle = S.ink; circ(c, cx, cy, 5); c.fill(); c.drawImage(itemSprite(b.filter), cx - 5, cy - 5, 10, 10); }
    else if (b.hold && det !== false) c.drawImage(itemSprite(b.hold), cx - 5, cy - 5, 10, 10);
  },
  tunnel(c, b, S, rt, det) {
    const out = b.role === 'out';
    c.save(); c.translate(b.x * T + 16, b.y * T + 16); c.rotate(b.rot * Math.PI / 2);
    const bx = out ? 0 : -16;                                   // bandhelft (ingang: achter, uitgang: voor)
    c.fillStyle = S.beltBed; c.fillRect(bx, -11, 16, 22);
    c.save(); c.beginPath(); c.rect(bx, -11, 16, 22); c.clip(); c.strokeStyle = S.beltTread; c.lineWidth = 2.4;
    const o = ((G ? G.time : 0) * beltSpd() * T) % 16;
    for (let i = -24 + o; i < 26; i += 16) { c.beginPath(); c.moveTo(i - 5, -9); c.lineTo(i + 1, 0); c.lineTo(i - 5, 9); c.stroke(); }
    c.restore();
    c.fillStyle = S.metal; c.fillRect(bx, -15, 16, 4); c.fillRect(bx, 11, 16, 4);
    // kap
    const hx = out ? -16 : 0;
    c.fillStyle = S.ink; rr(c, hx, -15.5, 16, 31, out ? [4, 0, 0, 4] : [0, 4, 4, 0]); c.fill();
    c.fillStyle = shade(S.paint, -.1); rr(c, hx + 1, -14.5, 14, 29, out ? [3, 0, 0, 3] : [0, 3, 3, 0]); c.fill();
    c.fillStyle = 'rgba(255,246,225,.3)'; c.fillRect(hx + 2, -13.5, 12, 2);
    hazardD(c, out ? hx + 2 : hx + 10, -12, 4, 24, S);
    c.fillStyle = '#0c0806'; rr(c, out ? -2 : 0, -10, 2, 20, 1); c.fill();    // mond
    c.fillStyle = S.accent; const ax = out ? -10 : 4; poly(c, [[ax, -3.5], [ax + 5, 0], [ax, 3.5]]); c.fill();
    c.restore();
    if (!b.role && G && G.bmap.has(b.id) && (rt * 2 | 0) % 2) { c.fillStyle = '#e0533a'; circ(c, b.x * T + 16, b.y * T + 16, 2.5); c.fill(); }
  },
};
function beltSpd() { return G && G.mod ? BELT_SPEED * G.mod.belt : BELT_SPEED; }

// ---------- vaste sprites ----------
Object.assign(DS, {
  arm(g, w, h, S) { VEC.arm(g, { x: 0, y: 0, rot: 0, sw: .5 }, S, 0, false); },
  splitter(g, w, h, S) { VEC.splitter(g, { x: 0, y: 0, rot: 0 }, S, 0, false); },
  tunnel(g, w, h, S) { VEC.tunnel(g, { x: 0, y: 0, rot: 0, role: 'in' }, S, 0, false); },
  chest(g, w, h, S) {
    plateD(g, 3, 3, w - 6, h - 6, 5, '#8a6a44', S, { seed: 5, r: 2, rivets: false, wear: 4 });
    g.fillStyle = S.metal; g.fillRect(8, 3, 3, h - 8); g.fillRect(w - 11, 3, 3, h - 8);
    g.fillStyle = S.ink; g.fillRect(11, 3, .8, h - 8); g.fillRect(w - 8, 3, .8, h - 8);
    rivetD(g, 9.5, 7, S); rivetD(g, w - 9.5, 7, S); rivetD(g, 9.5, h - 10, S); rivetD(g, w - 9.5, h - 10, S);
    g.fillStyle = S.dark; g.fillRect(w / 2 - 2.5, h / 2 - 4, 5, 4);
  },
  pole(g, w, h, S) {
    g.fillStyle = S.ink; circ(g, 16, 18, 7.5); g.fill(); g.fillStyle = rgba(S.sandA, 1); circ(g, 16, 18, 6.5); g.fill();
    g.fillStyle = S.ink; rr(g, 4, 6, 24, 5.4, 1.5); g.fill(); g.fillStyle = shade(S.metal, -.1); rr(g, 4.6, 6.6, 22.8, 4.2, 1.2); g.fill();
    g.fillStyle = S.ink; circ(g, 16, 9, 3.8); g.fill(); g.fillStyle = S.metal; circ(g, 16, 9, 2.8); g.fill();
    for (const x of [6.5, 25.5]) { g.fillStyle = S.ink; circ(g, x, 8.7, 2.6); g.fill(); g.fillStyle = COPPER; circ(g, x, 8.7, 1.8); g.fill(); }
  },
  wall2(g, w, h, S) {
    plateD(g, 0, 0, w, h, 7, '#b5aa94', S, { seed: 81, r: 1, rivets: false, wear: 8 });
    g.strokeStyle = 'rgba(50,40,30,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h - 7); g.moveTo(0, (h - 7) / 2); g.lineTo(w, (h - 7) / 2); g.stroke();
    g.strokeStyle = 'rgba(40,30,20,.35)'; g.beginPath(); g.moveTo(5, 4); g.lineTo(9, 9); g.lineTo(8, 13); g.stroke();
  },
  boiler(g, w, h, S) {
    plateD(g, 2, 2, w - 4, h - 4, 7, shade(S.metal, -.25), S, { seed: 91, r: 4, rv: 8 });
    // ketel (liggende tank)
    const tx = 7, ty = 9, tw = w - 14, th = 26, gr = g.createLinearGradient(0, ty, 0, ty + th);
    gr.addColorStop(0, shade('#8f5a3a', .25)); gr.addColorStop(.5, '#8f5a3a'); gr.addColorStop(1, shade('#8f5a3a', -.4));
    g.fillStyle = S.ink; rr(g, tx - 1, ty - 1, tw + 2, th + 2, 13); g.fill(); g.fillStyle = gr; rr(g, tx, ty, tw, th, 12); g.fill();
    for (const x of [tx + 12, tx + tw / 2, tx + tw - 12]) { g.fillStyle = S.metal; g.fillRect(x - 1.5, ty, 3, th); g.fillStyle = S.ink; g.fillRect(x + 1.5, ty, .7, th); }
    g.fillStyle = 'rgba(255,246,225,.25)'; rr(g, tx + 5, ty + 3, tw - 10, 3, 1.5); g.fill();
    // stookdeur
    g.fillStyle = '#120b07'; rr(g, w / 2 - 11, h - 22, 22, 12, 2); g.fill();
    g.strokeStyle = S.metal; g.lineWidth = 2; rr(g, w / 2 - 12, h - 23, 24, 14, 2); g.stroke();
    g.strokeStyle = S.ink; g.lineWidth = 1; for (let q = -7; q <= 7; q += 3.5) { g.beginPath(); g.moveTo(w / 2 + q, h - 21); g.lineTo(w / 2 + q, h - 11); g.stroke(); }
    // schoorsteen
    g.fillStyle = S.ink; circ(g, w - 12, 10, 6.4); g.fill(); g.fillStyle = shade(S.metal, -.15); circ(g, w - 12, 10, 5.4); g.fill(); g.fillStyle = '#0c0806'; circ(g, w - 12, 10, 3.4); g.fill();
    stencilD(g, 'KETEL', 7, h - 4.5, 6, 'rgba(255,240,215,.55)');
  },
  generator(g, w, h, S) {
    plateD(g, 2, 2, w - 4, h - 4, 8, S.paint, S, { seed: 41, r: 4 });
    const cx = w / 2 - 7, cy = h / 2 - 4;
    g.fillStyle = S.ink; circ(g, cx, cy, 17); g.fill(); g.fillStyle = shade(S.metal, -.4); circ(g, cx, cy, 15.8); g.fill();
    g.fillStyle = '#16110c'; circ(g, cx, cy, 12.5); g.fill();
    for (const y of [10, 22, 34]) { g.fillStyle = S.ink; rr(g, w - 19, y - 1, 13, 9, 2); g.fill(); g.fillStyle = COPPER; rr(g, w - 18, y, 11, 7, 1.5); g.fill(); g.strokeStyle = 'rgba(80,40,15,.6)'; g.lineWidth = .8; for (let q = 0; q < 11; q += 2) { g.beginPath(); g.moveTo(w - 18 + q, y); g.lineTo(w - 18 + q, y + 7); g.stroke(); } }
    hazardD(g, 6, h - 14, w - 30, 4, S);
    stencilD(g, 'G-3', w - 22, h - 5, 6, shade(S.paint, .4));
  },
  lab(g, w, h, S) {
    plateD(g, 2, 2, w - 4, h - 4, 8, S.paint2, S, { seed: 51, r: 4 });
    const cx = w / 2, cy = h / 2 - 4;
    g.fillStyle = S.ink; circ(g, cx, cy, 17.5); g.fill(); g.fillStyle = S.metal; circ(g, cx, cy, 16.5); g.fill();
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; rivetD(g, cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, S); }
    const gr = g.createRadialGradient(cx + S.lx * 6, cy + S.ly * 6, 1, cx, cy, 13); gr.addColorStop(0, rgba(mix(GLASS, [255, 255, 255], .5), .95)); gr.addColorStop(1, rgba(mix(GLASS, [20, 30, 30], .5), .95));
    g.fillStyle = gr; circ(g, cx, cy, 12.6); g.fill(); g.strokeStyle = S.ink; g.lineWidth = 1; g.stroke();
    hazardD(g, 6, h - 14, w - 12, 4, S);
    stencilD(g, 'WERKPLAATS', 6, 10, 5.5, shade(S.paint2, -.55));
  },
  flamer(g, w, h, S) {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = shade(S.metal, -.5); octP(g, cx, cy, 27); g.fill(); g.strokeStyle = S.ink; g.lineWidth = S.inkW; g.stroke();
    g.fillStyle = shade(S.metal, -.15); circ(g, cx, cy, 18); g.fill(); g.stroke();
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 + .3; sandbag(g, cx + Math.cos(a) * 25, cy + Math.sin(a) * 25, 13, 8, a + Math.PI / 2, S.bag[i % 2], S); }
    // kolenbak
    g.fillStyle = S.ink; rr(g, 3, h - 18, 16, 15, 2); g.fill(); g.fillStyle = shade(S.metal, -.3); rr(g, 4, h - 17, 14, 13, 1.5); g.fill();
    g.fillStyle = '#1c1916'; for (let i = 0; i < 6; i++) { circ(g, 7 + (i % 3) * 4, h - 13 + (i / 3 | 0) * 4, 1.9); g.fill(); }
    stencilD(g, 'VUUR', w - 22, h - 5, 6, 'rgba(255,200,140,.75)');
  },
});
Object.assign(DSH, {
  arm: () => [[6, g => { circ(g, 16, 16, 9); g.fill(); }]],
  splitter: () => [],
  tunnel: () => [],
  chest: (w, h) => [[9, g => { g.fillRect(3, 3, w - 6, h - 6); }]],
  pole: () => [[6, g => { circ(g, 16, 18, 6); g.fill(); }], [30, g => { circ(g, 16, 9, 2.6); g.fill(); }], [30, g => { g.fillRect(5, 7, 22, 3.5); }]],
  wall2: (w, h) => [[16, g => { g.fillRect(0, 0, w, h); }]],
  boiler: (w, h) => [[12, g => { rr(g, 2, 2, w - 4, h - 4, 4); g.fill(); }], [34, g => { circ(g, w - 12, 10, 6.4); g.fill(); }]],
  generator: (w, h) => [[11, g => { rr(g, 2, 2, w - 4, h - 4, 4); g.fill(); }]],
  lab: (w, h) => [[10, g => { rr(g, 2, 2, w - 4, h - 4, 4); g.fill(); }], [18, g => { circ(g, w / 2, h / 2 - 4, 16); g.fill(); }]],
  flamer: (w, h) => [[8, g => { circ(g, w / 2, h / 2, 30); g.fill(); }]],
});

// vlammenwerper-loop (draait)
function flameGunD(g, x, y, ang, firing, S, rt) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = S.ink; rr(g, -13, -9, 18, 18, 4); g.fill(); g.fillStyle = S.rust; rr(g, -12, -8, 16, 16, 3.5); g.fill();
  for (const yy of [-4, 4]) { g.fillStyle = S.ink; circ(g, -6, yy, 3.6); g.fill(); g.fillStyle = shade('#8f5a3a', .15); circ(g, -6, yy, 2.7); g.fill(); }
  g.fillStyle = S.ink; g.fillRect(2, -3.4, 22, 6.8); g.fillStyle = shade(S.metal, -.2); g.fillRect(2, -2.6, 21, 5.2);
  g.fillStyle = S.ink; g.fillRect(22, -4.6, 5, 9.2); g.fillStyle = shade(S.metal, -.45); g.fillRect(22.6, -4, 3.8, 8);
  if (firing) { const fl = .7 + Math.sin(rt * 40) * .3; g.fillStyle = `rgba(255,200,90,${fl})`; circ(g, 29, 0, 3.4); g.fill(); glow(g, 30, 0, 12, '255,140,40', .5 * fl); }
  g.restore();
}
// stroompaal: bovenkant (waar de draad vastzit)
function poleTop(b) { return b.type === 'core' ? [(b.x + 1.5) * T, (b.y + 1.5) * T - 20] : [(b.x + .5) * T, (b.y + .5) * T - 7]; }
