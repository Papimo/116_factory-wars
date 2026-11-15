'use strict';
// Speelfiguur: lopen (WASD), delven binnen 3 tegels, bouwen binnen 8 tegels, kan geraakt worden (respawn bij de kern).
// Drie uiterlijken (Stofjas, Duiker, Stofduiker = mix) met eigen kleuren; keuze wordt in de browser onthouden.
const FIG_SPEED = 4.5, FIG_REACH = 3, FIG_BUILD = 8, FIG_HP = 100, FIG_RESPAWN = 5, STRIDE = .55 * T;
const FIG_DEFS = {
  mix: { n: 'Stofduiker', line: 'Stofjas met sjaal, koperen duikhelm met leren rand, rugtank met slang en een houweel.', trail: 'boots', tool: 'pick', big: 1.4,
    def: { coat: '#8f6c3e', helm: '#c47a40', scarf: '#e2571e', tank: '#6f9f96' }, lab: { coat: 'Jas', helm: 'Helm', scarf: 'Sjaal', tank: 'Rugtank' } },
  stofjas: { n: 'Stofjas', line: 'Verkenner met brede hoed, rugtank, wapperende sjaal en houweel.', trail: 'feet', tool: 'pick', big: 1,
    def: { coat: '#8f6c3e', helm: '#8a5a32', scarf: '#e2571e', tank: '#6f9f96' }, lab: { coat: 'Jas', helm: 'Hoed', scarf: 'Sjaal', tank: 'Rugtank' } },
  duiker: { n: 'Duiker', line: 'Ingenieur in drukpak met koperen helm, kijkglas, twee tanks en een moker.', trail: 'boots', tool: 'hammer', big: 1.6,
    def: { coat: '#c9b28a', helm: '#c47a40', scarf: '#5a3a22', tank: '#6f9f96' }, lab: { coat: 'Pak', helm: 'Helm', scarf: 'Riemen', tank: 'Tanks' } },
};
const FIG_KEYS = ['mix', 'stofjas', 'duiker'];
const FIGSET = (() => {
  let s = null; try { s = JSON.parse(localStorage.getItem('fw_fig') || 'null'); } catch (e) { }
  if (!s || !FIG_DEFS[s.id]) s = { id: 'mix', col: {} };
  for (const k of FIG_KEYS) s.col[k] = { ...FIG_DEFS[k].def, ...(s.col[k] || {}) };
  return s;
})();
function saveFig() { try { localStorage.setItem('fw_fig', JSON.stringify(FIGSET)); } catch (e) { } }
function figDef() { return FIG_DEFS[FIGSET.id]; }
function figPal(id) { return FIGSET.col[id || FIGSET.id]; }

// ---------- gedeelde stukjes ----------
function lerpA(a, b, u) { const d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return a + d * u; }
function inkS(c, S, w = 1.1) { c.strokeStyle = S.ink; c.lineWidth = w; }
function swingTh(sw) { return sw < .6 ? .25 + 2 * smooth(0, .6, sw) : sw < .72 ? 2.25 - 2.25 * smooth(.6, .72, sw) : .25 * smooth(.72, 1, sw); }
function lightLocal(S, f) { return Math.atan2(S.ly, S.lx) - f.ang; }
// gereedschap in bovenaanzicht: steel vooruit, korter naarmate hij omhoog staat
function tool(c, S, s, hx, hy, th, L, kind) {
  const ex = hx + Math.cos(th) * L, ey = hy - Math.sin(th) * L * .12;
  c.lineCap = 'round'; c.strokeStyle = S.ink; c.lineWidth = s * .16; c.beginPath(); c.moveTo(hx, hy); c.lineTo(ex, ey); c.stroke();
  c.strokeStyle = '#9a6a3a'; c.lineWidth = s * .08; c.stroke();
  const sc = .65 + .35 * Math.abs(Math.cos(th));
  if (kind === 'pick') {
    c.strokeStyle = S.ink; c.lineWidth = s * .2; c.beginPath(); c.moveTo(ex - s * .06, ey - s * .38 * sc); c.quadraticCurveTo(ex + s * .08, ey, ex - s * .06, ey + s * .38 * sc); c.stroke();
    c.strokeStyle = S.metal; c.lineWidth = s * .1; c.stroke();
  } else {
    c.fillStyle = shade(S.metal, -.15); rr(c, ex - s * .14, ey - s * .3 * sc, s * .28, s * .6 * sc, s * .05); c.fill(); inkS(c, S, .9); c.stroke();
    c.fillStyle = 'rgba(255,246,225,.35)'; c.fillRect(ex - s * .1, ey - s * .26 * sc, s * .07, s * .52 * sc);
  }
}
function coatFlap(c, f, S, s, col) {
  const flap = f.moving ? Math.sin(f.ph * 2) * s * .07 : Math.sin(f.t * 2.2) * s * .025;
  poly(c, [[-s * .1, -s * .5], [-s * .84 + flap, -s * .48], [-s * .95 - flap, 0], [-s * .84 + flap, s * .48], [-s * .1, s * .5]]); c.fillStyle = col; c.fill(); inkS(c, S); c.stroke();
}
function scarfD(c, f, S, s, col) {
  const wv = Math.sin(f.t * 9) * s * .1 * (f.moving ? 1 : .4);
  c.lineCap = 'round'; c.strokeStyle = S.ink; c.lineWidth = s * .2; c.beginPath(); c.moveTo(-s * .05, s * .18); c.quadraticCurveTo(-s * .5, s * .3 + wv, -s * .95, s * .22 - wv); c.stroke();
  c.strokeStyle = col; c.lineWidth = s * .12; c.stroke();
}
function armsPick(c, f, S, s, sw, col, kind, L) {
  c.fillStyle = col; circ(c, s * .1 - sw * s * .2, -s * .5, s * .15); c.fill(); inkS(c, S); c.stroke();
  if (f.mine) { tool(c, S, s, s * .2, s * .3, swingTh(f.sw), L * 1.1, kind); c.fillStyle = col; circ(c, s * .2, s * .3, s * .15); c.fill(); inkS(c, S); c.stroke(); }
  else { c.fillStyle = col; circ(c, s * .1 + sw * s * .2, s * .5, s * .15); c.fill(); c.stroke(); tool(c, S, s, s * .1 + sw * s * .2, s * .5, 2.5, L * .95, kind); }
}
function copperDome(c, f, S, s, P, r) {
  const la = lightLocal(S, f), g = c.createRadialGradient(s * .06 + Math.cos(la) * r * .45, Math.sin(la) * r * .45, s * .03, s * .06, 0, r);
  g.addColorStop(0, shade(P.helm, .5)); g.addColorStop(.55, P.helm); g.addColorStop(1, shade(P.helm, -.42));
  circ(c, s * .06, 0, r); c.fillStyle = g; c.fill(); inkS(c, S, 1.2); c.stroke();
  c.strokeStyle = '#e0b060'; c.lineWidth = s * .07; circ(c, s * .06, 0, r * .83); c.stroke();
  for (const sd of [-1, 1]) { c.fillStyle = '#e0b060'; circ(c, s * .06, sd * r * .83, s * .07); c.fill(); inkS(c, S, .6); c.stroke(); }
  circ(c, s * .32, 0, s * .16); c.fillStyle = '#e0b060'; c.fill(); inkS(c, S, .9); c.stroke();
  circ(c, s * .33, 0, s * .11); c.fillStyle = '#1d2a2c'; c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; circ(c, s * .3, -s * .04, s * .035); c.fill();
}

// ---------- Stofjas ----------
function drawStofjas(c, f, S, s, P) {
  const sw = Math.sin(f.ph) * f.moving;
  for (const sd of [-1, 1]) { c.fillStyle = '#3a2616'; c.beginPath(); c.ellipse(sd * sw * s * .42 + s * .05, sd * s * .24, s * .21, s * .13, 0, 0, 7); c.fill(); inkS(c, S, .8); c.stroke(); }
  coatFlap(c, f, S, s, P.coat);
  scarfD(c, f, S, s, P.scarf);
  rr(c, -s * .7, -s * .34, s * .36, s * .68, s * .08); c.fillStyle = shade(P.coat, -.35); c.fill(); inkS(c, S); c.stroke();
  rr(c, -s * .66, -s * .22, s * .26, s * .44, s * .12); c.fillStyle = P.tank; c.fill(); c.stroke(); c.fillStyle = 'rgba(255,246,225,.4)'; c.fillRect(-s * .62, -s * .17, s * .06, s * .34);
  c.beginPath(); c.ellipse(-s * .04, 0, s * .42, s * .62, 0, 0, 7); c.fillStyle = shade(P.coat, .25); c.fill(); c.stroke();
  armsPick(c, f, S, s, sw, shade(P.coat, .15), 'pick', s * .95);
  const la = lightLocal(S, f);
  circ(c, s * .06, 0, s * .42); c.fillStyle = P.helm; c.fill(); inkS(c, S, 1.2); c.stroke();
  c.strokeStyle = 'rgba(255,236,200,.35)'; c.lineWidth = s * .07; c.beginPath(); c.arc(s * .06, 0, s * .35, la - .9, la + .9); c.stroke();
  circ(c, s * .06, 0, s * .25); c.fillStyle = shade(P.helm, -.2); c.fill(); inkS(c, S, .9); c.stroke();
  c.strokeStyle = P.scarf; c.lineWidth = s * .07; circ(c, s * .06, 0, s * .27); c.stroke();
  c.fillStyle = 'rgba(255,240,210,.3)'; circ(c, s * .04 + Math.cos(la) * s * .1, Math.sin(la) * s * .1, s * .1); c.fill();
}
// ---------- Duiker ----------
function drawDuiker(c, f, S, s, P) {
  const sw = Math.sin(f.ph) * f.moving, glove = shade(P.scarf, -.05);
  for (const sd of [-1, 1]) { c.fillStyle = '#2e2018'; rr(c, sd * sw * s * .4 - s * .12, sd * s * .27 - s * .13, s * .38, s * .26, s * .08); c.fill(); inkS(c, S, .8); c.stroke(); }
  for (const y of [-s * .34, s * .02]) { rr(c, -s * .82, y, s * .36, s * .32, s * .14); c.fillStyle = P.tank; c.fill(); inkS(c, S); c.stroke(); c.fillStyle = shade(P.tank, .55); c.fillRect(-s * .7, y + s * .02, s * .08, s * .28); }
  c.beginPath(); c.ellipse(-s * .05, 0, s * .4, s * .62, 0, 0, 7); c.fillStyle = P.coat; c.fill(); inkS(c, S, 1.2); c.stroke();
  c.strokeStyle = P.scarf; c.lineWidth = s * .09; c.beginPath(); c.moveTo(-s * .32, -s * .45); c.lineTo(s * .18, s * .4); c.moveTo(-s * .32, s * .45); c.lineTo(s * .18, -s * .4); c.stroke();
  c.lineCap = 'round'; c.strokeStyle = S.ink; c.lineWidth = s * .16; c.beginPath(); c.moveTo(-s * .22, s * .1); c.bezierCurveTo(-s * .5, s * .35, -s * .75, s * .3, -s * .64, s * .02); c.stroke();
  c.strokeStyle = '#3d3a36'; c.lineWidth = s * .08; c.stroke();
  c.fillStyle = glove; circ(c, s * .08 - sw * s * .2, -s * .56, s * .17); c.fill(); inkS(c, S); c.stroke();
  if (f.mine) tool(c, S, s, s * .18, s * .34, swingTh(f.sw), s * .95, 'hammer'); else tool(c, S, s, s * .06 + sw * s * .2, s * .56, 2.6, s * .8, 'hammer');
  c.fillStyle = glove; circ(c, f.mine ? s * .18 : s * .06 + sw * s * .2, f.mine ? s * .34 : s * .56, s * .17); c.fill(); inkS(c, S); c.stroke();
  copperDome(c, f, S, s, P, s * .41);
}
// ---------- Stofduiker (mix) ----------
function drawMix(c, f, S, s, P) {
  const sw = Math.sin(f.ph) * f.moving;
  for (const sd of [-1, 1]) { c.fillStyle = '#2e2018'; rr(c, sd * sw * s * .4 - s * .1, sd * s * .25 - s * .12, s * .34, s * .24, s * .08); c.fill(); inkS(c, S, .8); c.stroke(); }
  coatFlap(c, f, S, s, P.coat);
  scarfD(c, f, S, s, P.scarf);
  // rugtank met dop
  rr(c, -s * .78, -s * .3, s * .42, s * .6, s * .14); c.fillStyle = P.tank; c.fill(); inkS(c, S); c.stroke();
  c.fillStyle = shade(P.tank, .55); c.fillRect(-s * .68, -s * .26, s * .07, s * .52);
  c.fillStyle = '#e0b060'; circ(c, -s * .78, 0, s * .08); c.fill(); inkS(c, S, .7); c.stroke();
  c.beginPath(); c.ellipse(-s * .04, 0, s * .42, s * .6, 0, 0, 7); c.fillStyle = shade(P.coat, .25); c.fill(); inkS(c, S, 1.1); c.stroke();
  // luchtslang van helm naar tank
  c.lineCap = 'round'; c.strokeStyle = S.ink; c.lineWidth = s * .15; c.beginPath(); c.moveTo(-s * .2, -s * .12); c.bezierCurveTo(-s * .42, -s * .4, -s * .62, -s * .34, -s * .56, -s * .12); c.stroke();
  c.strokeStyle = '#3d3a36'; c.lineWidth = s * .075; c.stroke();
  armsPick(c, f, S, s, sw, shade(P.coat, -.3), 'pick', s * .95);
  // leren rand (de hoed) met koperen duikhelm erop
  const la = lightLocal(S, f);
  circ(c, s * .06, 0, s * .47); c.fillStyle = shade(P.coat, -.28); c.fill(); inkS(c, S, 1.2); c.stroke();
  c.strokeStyle = 'rgba(255,236,200,.3)'; c.lineWidth = s * .06; c.beginPath(); c.arc(s * .06, 0, s * .42, la - .9, la + .9); c.stroke();
  c.strokeStyle = P.scarf; c.lineWidth = s * .06; circ(c, s * .06, 0, s * .37); c.stroke();
  copperDome(c, f, S, s, P, s * .33);
}
FIG_DEFS.mix.draw = drawMix; FIG_DEFS.stofjas.draw = drawStofjas; FIG_DEFS.duiker.draw = drawDuiker;

// ---------- toestand ----------
function newPlayer() {
  const c = G.core, p = { x: c.x + 1.5, y: c.y + c.h + .7, ang: Math.PI / 2, dist: 0, moving: 0, hp: FIG_HP, dead: false, rT: 0, hitT: 0, lastHit: -99, trail: [], step: 0 };
  G.pl = p; G.follow = true;
}
function walkable(x, y) {
  const M = G.M, tx = Math.floor(x), ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= M.W || ty >= M.H) return false;
  if (M.ground[ty * M.W + tx] === 3) return false;
  const b = bAt(tx, ty); return !b || !!BUILD[b.type].walk;
}
function stepPlayer(dt) {
  const p = G.pl; if (!p) return;
  p.hitT = Math.max(0, p.hitT - dt);
  if (p.dead) { p.rT -= dt; if (p.rT <= 0) respawn(); return; }
  let vx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), vy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  const L = Math.hypot(vx, vy); p.moving = 0;
  if (L) {
    vx /= L; vy /= L; const sp = FIG_SPEED * dt, ox = p.x, oy = p.y, stuck = !walkable(p.x, p.y), m = .28;
    const nx = p.x + vx * sp, ny = p.y + vy * sp;
    if (stuck || walkable(nx + Math.sign(vx) * m, p.y)) p.x = nx;
    if (stuck || walkable(p.x, ny + Math.sign(vy) * m)) p.y = ny;
    p.x = Math.max(.3, Math.min(G.M.W - .3, p.x)); p.y = Math.max(.3, Math.min(G.M.H - .3, p.y));
    const mv = Math.hypot(p.x - ox, p.y - oy) * T; p.dist += mv; p.moving = mv > .01 ? 1 : 0;
    p.ang = lerpA(p.ang, Math.atan2(vy, vx), Math.min(1, dt * 14));
    const st = Math.floor(p.dist / STRIDE);
    if (st !== p.step) { p.step = st; const [nx2, ny2] = [-Math.sin(p.ang), Math.cos(p.ang)], sd = st % 2 ? 1 : -1; p.trail.push({ x: p.x * T + nx2 * sd * T * .36 * .26, y: p.y * T + ny2 * sd * T * .36 * .26, ang: p.ang, t: G.time }); if (p.trail.length > 60) p.trail.shift(); }
  }
  if (G.mine) {
    const m = G.mine;
    if (Math.hypot(m.x + .5 - p.x, m.y + .5 - p.y) > FIG_REACH + .3) G.mine = null;
    else if (!p.moving) p.ang = lerpA(p.ang, Math.atan2(m.y + .5 - p.y, m.x + .5 - p.x), Math.min(1, dt * 10));
  }
  if (G.time - p.lastHit > 4 && p.hp < FIG_HP) p.hp = Math.min(FIG_HP, p.hp + 6 * dt);
}
function hurtPlayer(dmg) {
  const p = G.pl; if (!p || p.dead) return;
  p.hp -= dmg; p.hitT = .15; p.lastHit = G.time;
  addP('spark', p.x, p.y, (Math.random() - .5) * 2, (Math.random() - .5) * 2, .25, .04, '#ffcf7a');
  if (p.hp <= 0) {
    p.dead = true; p.rT = FIG_RESPAWN; G.mine = null;
    for (let i = 0; i < 14; i++) { const a = Math.random() * 6.283, s = Math.random() * 3; addP('debris', p.x, p.y, Math.cos(a) * s, Math.sin(a) * s, .6, .05, figPal().coat); }
    addP('flash', p.x, p.y, 0, 0, .25, .8); sfx('boom', .6, p.x, p.y);
    toast(`Je figuur is uitgeschakeld · terug bij de kern over ${FIG_RESPAWN} s`, 'bad');
  }
}
function respawn() {
  const p = G.pl, c = G.core; p.dead = false; p.hp = FIG_HP; p.x = c.x + 1.5; p.y = c.y + c.h + .7; p.ang = Math.PI / 2; p.trail = []; G.follow = true;
}
function nearPlayer(x, y, r) { const p = G.pl; return p && !p.dead && Math.hypot(x - p.x, y - p.y) <= r; }

// figuurtoestand voor de tekenfuncties (wereldpixels)
function figState() {
  const p = G.pl, rt = performance.now() / 1000, m = G.mine;
  return { x: p.x * T, y: p.y * T, ang: p.ang, moving: p.moving, dist: p.dist, ph: p.dist / STRIDE * Math.PI, t: rt,
    mine: m ? [(m.x + .5) * T, (m.y + .5) * T] : null, mt: m ? m.t : 0, sw: m ? m.t / MINE_T : 0, ore: m ? ORE_KEYS[G.M.ore[m.i]] : null };
}

// ---------- tekenen ----------
function drawTrail(c, S) {
  const p = G.pl; if (!p) return; const s = T * .36, w = figDef().trail === 'boots' ? .26 : .2;
  for (const q of p.trail) { const a = 1 - (G.time - q.t) / 8; if (a <= 0) continue; c.fillStyle = rgba(S.shadeC, .4 * a); c.beginPath(); c.ellipse(q.x, q.y, s * w, s * w * .6, q.ang, 0, 7); c.fill(); }
}
function figShadow(l, S) {
  const p = G.pl; if (!p || p.dead) return; const x = p.x * T, y = p.y * T, L = 20 * S.shK, ox = S.sx * L, oy = S.sy * L, r = 6.5;
  l.fillStyle = '#000'; l.strokeStyle = '#000'; l.lineCap = 'round'; l.lineWidth = r * 1.4;
  l.beginPath(); l.moveTo(x, y); l.lineTo(x + ox * .8, y + oy * .8); l.stroke(); circ(l, x + ox, y + oy, r); l.fill();
}
function drawFigAt(c, f, S, id) {
  const d = FIG_DEFS[id || FIGSET.id]; c.save(); c.translate(f.x, f.y); c.rotate(f.ang); c.lineJoin = 'round'; d.draw(c, f, S, T * .36, figPal(id)); c.restore();
}
function mineFx(c, f, S) {
  if (!f.mine) return; const O = f.mine, P = MINE_T, big = figDef().big;
  c.save(); c.strokeStyle = 'rgba(255,248,230,.6)'; c.lineWidth = 1.2; c.setLineDash([4, 4]); c.lineDashOffset = -f.t * 8; circ(c, f.x, f.y, FIG_REACH * T); c.stroke(); c.setLineDash([]); c.restore();
  const age = f.mt - P * .66;
  if (age > 0 && age < .3) { c.fillStyle = rgba(S.sandA, .5 * (1 - age / .3)); circ(c, O[0], O[1], (5 + age * 60) * big); c.fill(); }
  const u = f.mt / P; if (f.ore && u < .5) { const e = (u / .5) ** 2, x = O[0] + (f.x - O[0]) * e, y = O[1] + (f.y - O[1]) * e - Math.sin(u / .5 * Math.PI) * 10, sz = 14 * (1 - e * .6); if (G.mine.n) c.drawImage(itemSprite(f.ore), x - sz / 2, y - sz / 2, sz, sz); }
}
// klein teken met vaste schermgrootte (z = zoom)
function figToken(c, f, z, t, S) {
  const r = 6.5 / z, p = .5 + .5 * Math.sin(t * 4);
  c.strokeStyle = `rgba(255,248,230,${.35 + .4 * p})`; c.lineWidth = 1.5 / z; circ(c, f.x, f.y, r * (1.5 + p * .5)); c.stroke();
  c.save(); c.translate(f.x, f.y); c.rotate(f.ang);
  poly(c, [[r * 1.55, 0], [-r * .9, -r], [-r * .45, 0], [-r * .9, r]]); c.fillStyle = figPal().scarf; c.fill(); c.strokeStyle = S.ink; c.lineWidth = 2 / z; c.lineJoin = 'round'; c.stroke();
  c.restore();
}
function drawPlayer(c, S, z, asToken) {
  const p = G.pl; if (!p) return;
  if (p.dead) {
    const c0 = G.core, x = (c0.x + 1.5) * T, y = (c0.y + c0.h + .7) * T, a = .4 + .3 * Math.sin(performance.now() / 200);
    c.strokeStyle = `rgba(255,248,230,${a})`; c.lineWidth = 2 / z; c.setLineDash([4 / z, 4 / z]); circ(c, x, y, 10); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#fff6e0'; c.font = `600 ${12 / z}px system-ui, sans-serif`; c.textAlign = 'center'; c.fillText(Math.ceil(p.rT) + '', x, y + 4 / z); c.textAlign = 'left';
    return;
  }
  const f = figState();
  if (asToken) { figToken(c, f, z, f.t, S); return; }
  mineFx(c, f, S);
  drawFigAt(c, f, S);
  if (p.hitT > 0) { c.fillStyle = 'rgba(255,90,60,.45)'; circ(c, f.x, f.y, T * .4); c.fill(); }
  if (p.hp < FIG_HP) bar(f.x - 14, f.y - 24, 28, p.hp / FIG_HP, p.hp / FIG_HP > .5 ? '#8cc65a' : '#e0533a');
}

// ---------- paneel: figuur kiezen + kleuren ----------
function initFigPanel() {
  const el = document.getElementById('figpanel');
  el.innerHTML = `<div class="fhead"><h3>Figuur</h3><button class="x" data-fa="close" title="Sluiten (F)">✕</button></div>
    <div class="fopts">${FIG_KEYS.map(k => `<button class="fopt" data-fa="pick" data-v="${k}"><canvas width="144" height="144"></canvas><span>${FIG_DEFS[k].n}</span></button>`).join('')}</div>
    <p class="fline dim"></p><div class="fcols"></div><button class="act" data-fa="reset">Standaardkleuren</button>`;
  el.addEventListener('pointerdown', e => {
    const a = e.target.closest('[data-fa]'); if (!a) return;
    if (a.dataset.fa === 'close') toggleFigPanel(false);
    else if (a.dataset.fa === 'pick') { FIGSET.id = a.dataset.v; saveFig(); figPanelFill(); }
    else if (a.dataset.fa === 'reset') { FIGSET.col[FIGSET.id] = { ...figDef().def }; saveFig(); figPanelFill(); }
  });
  el.addEventListener('input', e => { const k = e.target.dataset.col; if (!k) return; figPal()[k] = e.target.value; saveFig(); figPreview(); });
  figPanelFill();
}
function figPanelFill() {
  const el = document.getElementById('figpanel'), d = figDef(), P = figPal();
  el.querySelectorAll('.fopt').forEach(b => b.classList.toggle('on', b.dataset.v === FIGSET.id));
  el.querySelector('.fline').textContent = d.line;
  el.querySelector('.fcols').innerHTML = Object.keys(d.def).map(k => `<label><span>${d.lab[k]}</span><input type="color" data-col="${k}" value="${P[k]}"></label>`).join('');
  figPreview();
}
function figPreview() {
  const el = document.getElementById('figpanel'); if (el.classList.contains('hidden')) return;
  const t = performance.now() / 1000;
  el.querySelectorAll('.fopt canvas').forEach(cv => {
    const id = cv.parentElement.dataset.v, g = cv.getContext('2d'), sc = cv.width / 40;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    const gr = g.createRadialGradient(cv.width * .45, cv.height * .4, 4, cv.width / 2, cv.height / 2, cv.width * .6); gr.addColorStop(0, rgba(S4.sandHi, 1)); gr.addColorStop(1, rgba(S4.sandLo, 1));
    g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(sc, 0, 0, sc, 0, 0);
    const walk = id === FIGSET.id, f = { x: 20, y: 20, ang: -Math.PI / 4, moving: walk ? 1 : 0, dist: t * FIG_SPEED * T * .5, ph: t * FIG_SPEED * T * .5 / STRIDE * Math.PI, t, mine: null, sw: 0 };
    g.fillStyle = S4.shCol; circ(g, 20 + S4.sx * 9, 20 + S4.sy * 9, 6.5); g.fill();
    drawFigAt(g, f, S4, id);
  });
}
function toggleFigPanel(on) {
  const el = document.getElementById('figpanel'); on = on ?? el.classList.contains('hidden');
  el.classList.toggle('hidden', !on); if (on) figPanelFill();
}
