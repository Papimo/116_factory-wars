'use strict';
// Invoer + spellus.
let paused = false, running = false, last = 0, uiT = 0, miniT = 0, errT = 0;
const keys = {}, mouse = { x: 0, y: 0, wx: 0, wy: 0, in: false };
let drag = null, placing = null;

function s2w() { mouse.wx = (mouse.x - VW / 2) / cam.z + cam.x; mouse.wy = (mouse.y - VH / 2) / cam.z + cam.y; }
function toastErr(msg) { const n = performance.now(); if (n - errT > 900) { errT = n; toast(msg, 'bad'); } }

function startGame() {
  initAudio();
  $('#menu').classList.add('hidden'); $('#over').classList.add('hidden');
  newGame();
  cam.x = G.M.cx * T; cam.y = G.M.cy * T; cam.z = 1.1;
  running = true; paused = false; $('#hud').classList.remove('hidden');
  document.querySelectorAll('.bbtn').forEach(b => b.classList.remove('on'));
  toast('Golf 1 komt over 4 minuten. Zorg voor geschut met munitie.');
  setTimeout(() => toast('Begin met erts delven (klik + vasthouden) of een boor op erts [2].'), 1800);
}

function dragPlace(tx, ty) {
  const p = placing;
  let guard = 0;
  while ((p.last.x !== tx || p.last.y !== ty) && guard++ < 200) {
    const ddx = tx - p.last.x, ddy = ty - p.last.y;
    let nx = p.last.x, ny = p.last.y, dir;
    if (ddx !== 0 && Math.abs(ddx) >= Math.abs(ddy)) { nx += Math.sign(ddx); dir = ddx > 0 ? 0 : 2; }
    else { ny += Math.sign(ddy); dir = ddy > 0 ? 1 : 3; }
    if (G.tool === 'belt') {
      const lb = bAt(p.last.x, p.last.y);
      // ook de band waarop de sleep begon meedraaien: zo maak je een bocht vanaf het eind van een bestaande rij
      if (lb && lb.type === 'belt' && (p.placed.has(lb.id) || lb === p.start)) lb.rot = dir;
      G.rot = dir;
    }
    const r = place(G.tool, nx, ny, G.rot);
    if (typeof r === 'object') { p.placed.add(r.id); sfx('build', .5); }
    else if (r !== 'Hier staat al iets') toastErr(r);
    p.last = { x: nx, y: ny };
  }
}

cv.addEventListener('pointerdown', e => {
  if (!running || G.over) return;
  initAudio();
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true; s2w();
  cv.setPointerCapture(e.pointerId);
  if (e.button === 1 || e.button === 2) { drag = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: false, btn: e.button }; return; }
  if (e.button !== 0) return;
  const tx = Math.floor(mouse.wx / T), ty = Math.floor(mouse.wy / T);
  if (G.tool) {
    const g = ghostTile(), r = place(G.tool, g.tx, g.ty, G.rot);
    if (typeof r === 'string') toastErr(r); else sfx('build');
    const sb = bAt(g.tx, g.ty);
    placing = { last: { x: g.tx, y: g.ty }, placed: new Set(typeof r === 'object' ? [r.id] : []), start: sb && sb.type === 'belt' ? sb : null };
    return;
  }
  const b = bAt(tx, ty);
  if (b) { G.sel = b; return; }
  G.sel = null; startMine(tx, ty);
});
cv.addEventListener('pointermove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true; s2w();
  if (!running) return;
  if (drag) {
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (drag.moved) { cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z; }
    return;
  }
  if (placing && (G.tool === 'belt' || G.tool === 'wall')) { const g = ghostTile(); dragPlace(g.tx, g.ty); }
  if (G.mine) { const tx = Math.floor(mouse.wx / T), ty = Math.floor(mouse.wy / T); if (tx !== G.mine.x || ty !== G.mine.y) G.mine = null; }
});
cv.addEventListener('pointerup', () => {
  if (drag) {
    if (!drag.moved && drag.btn === 2 && running && !G.over) {
      if (G.tool) selectTool(G.tool);
      else { const b = bAt(Math.floor(mouse.wx / T), Math.floor(mouse.wy / T)); if (b && b.type !== 'core') { removeB(b, true); sfx('build'); } }
    }
    drag = null;
  }
  placing = null; if (G) G.mine = null;
});
cv.addEventListener('pointerleave', () => { mouse.in = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => {
  e.preventDefault(); if (!running) return;
  s2w(); const wx = mouse.wx, wy = mouse.wy;
  cam.z = Math.max(.45, Math.min(2.6, cam.z * Math.exp(-e.deltaY * .0012)));
  cam.x = wx - (mouse.x - VW / 2) / cam.z; cam.y = wy - (mouse.y - VH / 2) / cam.z;
}, { passive: false });
mini.addEventListener('pointerdown', e => {
  if (!running) return;
  const r = mini.getBoundingClientRect();
  cam.x = (e.clientX - r.left) / r.width * G.M.W * T; cam.y = (e.clientY - r.top) / r.height * G.M.H * T;
});

addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (!running || G.over) return;
  const bk = BUILD_ORDER.find(b => BUILD[b].key === e.key);
  if (bk) { selectTool(bk); return; }
  if (k === 'r') {
    if (!G.tool && G.sel && BUILD[G.sel.type].rot) G.sel.rot = (G.sel.rot + 1) % 4;
    else G.rot = (G.rot + (e.shiftKey ? 3 : 1)) % 4;
  } else if (k === 'escape' || k === 'q') { if (G.tool) selectTool(G.tool); G.sel = null; }
  else if (k === 'delete' || k === 'backspace') { if (G.sel && G.sel.type !== 'core') { removeB(G.sel, true); sfx('build'); } }
  else if (k === ' ') { paused = !paused; e.preventDefault(); }
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

function pan(dt) {
  const sp = 700 / cam.z * dt;
  if (keys.w || keys.arrowup) cam.y -= sp;
  if (keys.s || keys.arrowdown) cam.y += sp;
  if (keys.a || keys.arrowleft) cam.x -= sp;
  if (keys.d || keys.arrowright) cam.x += sp;
  cam.x = Math.max(0, Math.min(G.M.W * T, cam.x)); cam.y = Math.max(0, Math.min(G.M.H * T, cam.y));
}

function frame(ts) {
  const rdt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  if (running && G) {
    pan(rdt); s2w();
    if (!paused && !G.over) for (let i = 0; i < G.speed; i++) { update(rdt); if (G.over) break; }
    draw();
    uiT -= rdt; if (uiT <= 0) { uiT = .12; updUI(); }
    miniT -= rdt; if (miniT <= 0) { miniT = .25; drawMini(); }
  }
  requestAnimationFrame(frame);
}

initUI();
$('#btnStart').onclick = startGame;
requestAnimationFrame(frame);
