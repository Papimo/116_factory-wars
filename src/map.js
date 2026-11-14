'use strict';
// Kaartgeneratie + terrein tekenen (eenmalig naar een offscreen canvas).
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s) { let t = 0, a = .5, f = 1; for (let i = 0; i < 4; i++) { t += vnoise(x * f, y * f, s + i * 17) * a; f *= 2; a *= .5; } return t / .9375; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

function field(M, x, y) {
  const n = fbm(x / 13, y / 13, M.seed), m = fbm(x / 9 + 50, y / 9, M.seed + 3), dc = Math.hypot(x - M.cx, y - M.cy);
  return { n, m, dc, water: n < 0.3 && dc > 14 };
}

function genMap(seed) {
  const W = MAP_W, H = MAP_H, R = mulberry(seed);
  const M = { W, H, seed, cx: W / 2 + .5, cy: H / 2 + .5, ground: new Uint8Array(W * H), ore: new Uint8Array(W * H), amt: new Uint16Array(W * H), nests: [] };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const f = field(M, x + .5, y + .5);
    M.ground[y * W + x] = f.water ? 3 : f.m > 0.6 ? 1 : f.m < 0.34 ? 2 : 0;
  }
  const blob = (ox, oy, type, rad, rich) => {
    for (let y = Math.floor(oy - rad - 2); y <= oy + rad + 2; y++) for (let x = Math.floor(ox - rad - 2); x <= ox + rad + 2; x++) {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      const i = y * W + x; if (M.ground[i] === 3) continue;
      const d = Math.hypot(x + .5 - ox, y + .5 - oy) / rad + (vnoise(x / 2.5, y / 2.5, seed + type * 9) - .5) * .7;
      if (d < 1) { M.ore[i] = type; M.amt[i] = Math.round(rich * (1.2 - d) * (.8 + R() * .4)); }
    }
  };
  const a0 = R() * 6.283;
  // Vier kleine velden dicht bij de kern (ijzer, koper, kool, steen)
  for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 2 + (R() - .5) * .5, d = 7.5 + R() * 2.5; blob(M.cx + Math.cos(a) * d, M.cy + Math.sin(a) * d, k + 1, 2.4, 320); }
  // Rijke velden verderop: reden om voorposten te bouwen
  for (let k = 0; k < 12; k++) {
    let x, y, t = 0;
    do { x = 6 + R() * (W - 12); y = 6 + R() * (H - 12); t++; } while ((Math.hypot(x - M.cx, y - M.cy) < 20 || M.ground[(y | 0) * W + (x | 0)] === 3) && t < 60);
    blob(x, y, 1 + k % 4, 2.5 + R() * 2.5, 900);
  }
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) M.ore[((M.cy | 0) + y) * W + (M.cx | 0) + x] = 0;
  // Nesten aan de randen, op land
  for (let k = 0; k < 5; k++) {
    let best = null;
    for (let t = 0; t < 40; t++) {
      const a = a0 + Math.PI / 4 + k * 2 * Math.PI / 5 + (R() - .5) * .7, rx = W * (.40 + R() * .07), ry = H * (.38 + R() * .07);
      const x = Math.max(4, Math.min(W - 5, M.cx + Math.cos(a) * rx)), y = Math.max(4, Math.min(H - 5, M.cy + Math.sin(a) * ry));
      let ok = true;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (M.ground[((y | 0) + j) * W + (x | 0) + i] === 3) ok = false;
      best = { x, y }; if (ok) break;
    }
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) M.ore[((best.y | 0) + j) * W + (best.x | 0) + i] = 0;
    M.nests.push({ isNest: true, x: best.x, y: best.y, hp: NEST_HP, maxhp: NEST_HP, dead: false, prov: -99, seed: k * 7 + 3 });
  }
  return M;
}

const GC = { dirt: [98, 82, 60], grass: [80, 88, 54], sand: [150, 130, 94], mud: [66, 56, 44], water: [40, 60, 66], deep: [22, 36, 44] };

function renderTerrain(M) {
  const S = 8, w = M.W * S, h = M.H * S, c = mk(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const x = (px + .5) / S, y = (py + .5) / S, f = field(M, x, y);
    let col;
    if (f.water) {
      col = mix(GC.water, GC.deep, smooth(.29, .2, f.n));
      const r = vnoise(x * 1.3, y * 3, M.seed + 5); if (r > .72) col = mix(col, [74, 96, 100], (r - .72) * 1.5);
    } else {
      col = mix(GC.dirt, GC.sand, smooth(.4, .28, f.m));
      col = mix(col, GC.grass, smooth(.55, .68, f.m));
      if (f.dc > 14) col = mix(col, GC.mud, smooth(.34, .3, f.n));
    }
    const det = .86 + vnoise(x * 1.6, y * 1.6, M.seed + 9) * .18 + vnoise(x * 4.5, y * 4.5, M.seed + 11) * .1;
    const o = (py * w + px) * 4; d[o] = col[0] * det; d[o + 1] = col[1] * det; d[o + 2] = col[2] * det; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const big = mk(M.W * T, M.H * T), bg = big.getContext('2d');
  bg.imageSmoothingEnabled = true; bg.imageSmoothingQuality = 'high';
  bg.drawImage(c, 0, 0, big.width, big.height);
  // Korrel over alles
  const gr = mk(128, 128), gg = gr.getContext('2d'), R = mulberry(M.seed + 77);
  for (let i = 0; i < 2600; i++) {
    const v = R();
    gg.fillStyle = v < .55 ? `rgba(0,0,0,${.05 + R() * .12})` : `rgba(255,240,210,${.03 + R() * .06})`;
    gg.fillRect(R() * 128 | 0, R() * 128 | 0, R() < .2 ? 2 : 1, 1);
  }
  bg.fillStyle = bg.createPattern(gr, 'repeat'); bg.fillRect(0, 0, big.width, big.height);
  // Kiezels en plukjes
  for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) {
    const i = y * M.W + x; if (M.ground[i] === 3) continue;
    const r = hash2(x, y, M.seed + 21);
    if (r < .1) pebbles(bg, x, y);
    else if (r < .22 && M.ground[i] === 1) tuft(bg, x, y, '#7d8a48', '#a3a35a');
    else if (r < .16 && M.ground[i] !== 1) tuft(bg, x, y, '#6e6440', '#8f8452');
  }
  return big;
}

function pebbles(g, x, y) {
  const R = mulberry(x * 977 + y * 131), n = 1 + (R() * 3 | 0);
  for (let k = 0; k < n; k++) {
    const px = x * T + 4 + R() * 24, py = y * T + 4 + R() * 24, r = 1.2 + R() * 2.2;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(px + .8, py + 1, r, r * .75, 0, 0, 7); g.fill();
    g.fillStyle = R() < .5 ? '#7d7466' : '#94897a'; g.beginPath(); g.ellipse(px, py, r, r * .75, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(px - r * .3, py - r * .3, r * .4, r * .3, 0, 0, 7); g.fill();
  }
}
function tuft(g, x, y, c1, c2) {
  const R = mulberry(x * 613 + y * 389), px = x * T + 6 + R() * 20, py = y * T + 10 + R() * 16;
  g.lineWidth = 1; g.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (R() - .5) * 1.4, l = 3 + R() * 4;
    g.strokeStyle = R() < .5 ? c1 : c2; g.beginPath(); g.moveTo(px + (R() - .5) * 3, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke();
  }
}

const ORE_COL = {
  1: { a: '#5f6871', b: '#8a96a1', hi: '#c4ccd2', sp: '#6fa3cc' },
  2: { a: '#6e4630', b: '#9c6440', hi: '#dc9a66', sp: '#5fb08e' },
  3: { a: '#1b1a18', b: '#2f2d29', hi: '#77757070', sp: '#b9c0c8' },
  4: { a: '#857660', b: '#ab9b7c', hi: '#dfd3b6', sp: '#76684f' },
};
function drawOre(g, x, y, type, amt) {
  const C = ORE_COL[type], R = mulberry(x * 7919 + y * 104729 + type), n = 3 + Math.min(4, amt / 120 | 0);
  g.fillStyle = 'rgba(0,0,0,.10)'; g.beginPath(); g.arc(x * T + 16, y * T + 16, 14, 0, 7); g.fill();
  for (let k = 0; k < n; k++) {
    const cx = x * T + 8 + R() * 16, cy = y * T + 8 + R() * 16, r = 3 + R() * 3.5, pts = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + R() * .5, rr = r * (.75 + R() * .4); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .85]); }
    const poly = (o, s) => { g.beginPath(); pts.forEach((p, i) => { const px = cx + (p[0] - cx) * s + o[0], py = cy + (p[1] - cy) * s + o[1]; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); };
    poly([1.2, 1.6], 1); g.fillStyle = 'rgba(0,0,0,.4)'; g.fill();
    poly([0, 0], 1); g.fillStyle = C.a; g.fill();
    poly([-r * .18, -r * .22], .62); g.fillStyle = C.b; g.fill();
    g.fillStyle = C.hi; g.fillRect(cx - r * .45, cy - r * .5, 1.4, 1.2);
    g.fillStyle = C.sp; for (let i = 0; i < 2; i++) g.fillRect(cx + (R() - .5) * r, cy + (R() - .5) * r * .8, 1.2, 1.2);
  }
}
