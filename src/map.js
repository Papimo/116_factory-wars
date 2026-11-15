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
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
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
  // Productie B: zwavelzand + oliebronnen verderop (eigen toeval, zodat de rest van de kaart gelijk blijft)
  const R2 = mulberry(seed ^ 0x5bd1e995), spot = (dmin) => {
    for (let t = 0; t < 80; t++) {
      const x = 6 + R2() * (W - 12), y = 6 + R2() * (H - 12), i = (y | 0) * W + (x | 0);
      if (Math.hypot(x - M.cx, y - M.cy) < dmin || M.ground[i] === 3 || M.ore[i]) continue;
      if (M.nests.some(n => Math.hypot(n.x - x, n.y - y) < 8)) continue;
      return [x, y];
    }
    return null;
  };
  for (let k = 0; k < 4; k++) { const p = spot(18); if (p) blob(p[0], p[1], 5, 2.4 + R2() * 1.6, 700); }
  for (let k = 0; k < 6; k++) { const p = spot(16); if (p) { const r = 1.3 + R2() * .6; for (let y = Math.floor(p[1] - 2); y <= p[1] + 2; y++) for (let x = Math.floor(p[0] - 2); x <= p[0] + 2; x++) { if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue; const i = y * W + x; if (M.ground[i] !== 3 && Math.hypot(x + .5 - p[0], y + .5 - p[1]) < r) { M.ore[i] = OIL; M.amt[i] = 60 + (R2() * 80 | 0); } } } }
  return M;
}
// Terrein tekenen: zie theme.js (initTerrain/buildChunk). Ground 3 = rots (was water).
