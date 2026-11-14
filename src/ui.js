'use strict';
// Interface (HTML boven het canvas). Knoppen werken via pointerdown + data-attributen,
// zodat het periodiek verversen van de HTML geen klikken opslokt.
const $ = s => document.querySelector(s);
function setHTML(el, html) { if (el._h !== html) { el._h = html; el.innerHTML = html; } }
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const costHTML = c => Object.keys(c).map(k => `<span class="cost ${(G && (G.stock[k] || 0) < c[k]) ? 'short' : ''}"><img src="${itemIcon(k)}">${c[k]}</span>`).join('');

function initUI() {
  const bb = $('#buildbar');
  bb.innerHTML = BUILD_ORDER.map(k => `<button class="bbtn" data-b="${k}"><img src="${buildIcon(k)}"><span class="hk">${BUILD[k].key}</span></button>`).join('');
  bb.addEventListener('pointerdown', e => { const b = e.target.closest('[data-b]'); if (b) selectTool(b.dataset.b); });
  bb.addEventListener('pointerover', e => {
    const b = e.target.closest('[data-b]'); if (!b) return;
    const d = BUILD[b.dataset.b], tip = $('#tip');
    tip.innerHTML = `<h4>${d.n} <small>[${d.key}]</small></h4><div class="costs">${costHTML(d.cost)}</div><p>${d.desc}</p>`;
    tip.classList.remove('hidden');
  });
  bb.addEventListener('pointerout', e => { if (!e.relatedTarget || !bb.contains(e.relatedTarget)) $('#tip').classList.add('hidden'); });
  $('#hand').addEventListener('pointerdown', e => { const a = e.target.closest('[data-h]'); if (a) queueHand(a.dataset.h, e.shiftKey ? 5 : 1); });
  $('#info').addEventListener('pointerdown', e => {
    const a = e.target.closest('[data-act]'), b = G && G.sel; if (!a || !b) return;
    const v = a.dataset.v;
    if (a.dataset.act === 'recipe') setRecipe(b, v);
    else if (a.dataset.act === 'fill') fillFromStock(b);
    else if (a.dataset.act === 'load') loadAmmo(b);
    else if (a.dataset.act === 'repair') repair(b);
    else if (a.dataset.act === 'remove') { removeB(b, true); sfx('build'); }
    updUI();
  });
  $('#status').addEventListener('pointerdown', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'callwave') callWave();
    else if (a.dataset.act === 'speed') G.speed = G.speed >= 3 ? 1 : G.speed + 1;
    else if (a.dataset.act === 'pause') paused = !paused;
    updUI();
  });
}
function selectTool(k) {
  G.tool = G.tool === k ? null : k; G.sel = null;
  document.querySelectorAll('.bbtn').forEach(b => b.classList.toggle('on', b.dataset.b === G.tool));
}

function updUI() {
  if (!G) return;
  const s = G.stock;
  setHTML($('#stock'), ITEM_ORDER.map(k => `<div class="st ${(s[k] || 0) ? '' : 'zero'}" title="${ITEMS[k].n}"><img src="${itemIcon(k)}"><b>${s[k] || 0}</b></div>`).join(''));

  const alive = G.M.nests.filter(n => !n.dead).length, pct = Math.round(G.poll / 10), core = G.core;
  setHTML($('#status'),
    `<div class="sbox"><span>Golf ${G.wave}</span><b class="${G.waveT < 30 ? 'warn' : ''}">${mmss(Math.max(0, G.waveT))}</b><button data-act="callwave" title="Volgende golf nu laten komen">Nu</button></div>` +
    `<div class="sbox" title="Machines vervuilen. Meer vervuiling = grotere golven."><span>Vervuiling</span><div class="meter"><i style="width:${Math.min(100, pct / 2)}%"></i></div><small>+${pct}%</small></div>` +
    `<div class="sbox"><span>Kern</span><div class="meter hp"><i style="width:${core.hp / core.maxhp * 100}%"></i></div></div>` +
    `<div class="sbox"><span>Vijanden</span><b>${G.enemies.length}</b></div>` +
    `<div class="sbox"><span>Nesten</span><b>${alive}/${G.M.nests.length}</b></div>` +
    `<button data-act="speed" title="Spelsnelheid">${G.speed}×</button><button data-act="pause" title="Pauze (spatie)">${paused ? '▶' : '❚❚'}</button>`);

  const q = {}; for (const k of G.hand) q[k] = (q[k] || 0) + 1;
  const hc = G.handCur;
  setHTML($('#hand'),
    `<h3>Kern · handwerk</h3><div class="hgrid">` +
    Object.keys(HAND).map(k => {
      const r = HAND[k], ok = canAfford(r.in), cur = hc && hc.k === k;
      return `<button data-h="${k}" class="hbtn ${ok ? '' : 'no'} ${cur ? 'cur' : ''}" title="${ITEMS[k].n} — shift-klik = 5×">` +
        `<img src="${itemIcon(k)}">${r.qty > 1 ? `<i class="q">×${r.qty}</i>` : ''}${q[k] ? `<i class="n">${q[k]}</i>` : ''}` +
        (cur ? `<i class="pr" style="width:${(1 - hc.t / hc.T) * 100}%"></i>` : '') + `<span>${Object.keys(r.in).map(i => `${r.in[i]}<img src="${itemIcon(i)}">`).join('')}</span></button>`;
    }).join('') + `</div><h3>Doelen</h3><ul class="goals">` +
    GOALS.map(([k, t]) => `<li class="${G.goals[k] ? 'done' : ''}">${t}</li>`).join('') + `</ul>`);

  const info = $('#info'), b = G.sel && G.bmap.has(G.sel.id) ? G.sel : null;
  info.classList.toggle('hidden', !b);
  if (b) setHTML(info, infoHTML(b));

  document.querySelectorAll('.bbtn').forEach(el => el.classList.toggle('no', !canAfford(BUILD[el.dataset.b].cost)));

  let hv = '';
  if (mouse.in) {
    const tx = Math.floor(mouse.wx / T), ty = Math.floor(mouse.wy / T), M = G.M;
    if (G.tool) { const g = ghostTile(), err = canPlace(G.tool, g.tx, g.ty); hv = err ? `<span class="bad">${err}</span>` : `${BUILD[G.tool].n} · R = draaien${G.tool === 'belt' || G.tool === 'wall' ? ' · sleep voor een rij' : ''} · rechtsklik = stoppen`; }
    else if (tx >= 0 && ty >= 0 && tx < M.W && ty < M.H) {
      const bb = bAt(tx, ty), i = ty * M.W + tx;
      if (bb) hv = `${BUILD[bb.type].n} · klik = details${bb.type !== 'core' ? ' · rechtsklik = afbreken' : ''}`;
      else if (M.ore[i]) hv = `${ITEMS[ORE_KEYS[M.ore[i]]].n} · ${M.amt[i]} over · klik en houd vast om te delven`;
    }
  }
  setHTML($('#hover'), hv);
}

function infoHTML(b) {
  const d = BUILD[b.type];
  const row = (it, n, label) => `<div class="row"><img src="${itemIcon(it)}"><span>${label || ITEMS[it].n}</span><b>${n}</b></div>`;
  const btn = (act, txt, v = '') => `<button class="act" data-act="${act}" data-v="${v}">${txt}</button>`;
  let h = `<h3>${d.n}</h3><div class="meter hp"><i style="width:${b.hp / b.maxhp * 100}%"></i></div><small class="dim">${Math.ceil(b.hp)} / ${b.maxhp}</small>`;
  switch (b.type) {
    case 'belt': h += `<p class="dim">${b.items.length} item(s) op de band. R draait hem.</p>`; break;
    case 'drill': {
      const M = G.M; let left = 0, typ = null;
      for (let k = 0; k < 4; k++) { const m = (b.y + (k >> 1)) * M.W + b.x + (k & 1); if (M.ore[m]) { left += M.amt[m]; typ = ORE_KEYS[M.ore[m]]; } }
      h += typ ? row(typ, left, 'Erts over') : '<p class="warn">Geen erts meer</p>';
      if (b.hold) h += '<p class="warn">Uitvoer geblokkeerd: zet een band of machine voor de pijl.</p>';
      break;
    }
    case 'furnace':
      h += row('coal', b.fuel, 'Brandstof') + (b.ore ? row(b.ore, b.oreN, 'Invoer') : '<p class="dim">Geen erts</p>') + (b.outN ? row(b.outType, b.outN, 'Klaar') : '');
      if (b.nofuel) h += '<p class="warn">Geen steenkool!</p>';
      h += btn('fill', 'Bijvullen uit voorraad'); break;
    case 'assembler': {
      h += '<div class="seg">' + Object.keys(RECIPES).map(k => `<button data-act="recipe" data-v="${k}" class="${b.recipe === k ? 'on' : ''}"><img src="${itemIcon(RECIPES[k].out)}">${RECIPES[k].n}</button>`).join('') + '</div>';
      const r = RECIPES[b.recipe];
      for (const k in r.in) h += row(k, `${b.inv[k] || 0}/${r.in[k]}`);
      h += row(r.out, b.outN, 'Klaar');
      h += `<div class="meter"><i style="width:${b.t > 0 ? (1 - b.t / r.time) * 100 : 0}%"></i></div>`;
      h += btn('fill', 'Bijvullen uit voorraad'); break;
    }
    case 'turret':
      h += row('ammo', b.mags, 'Munitie') + `<div class="row"><span>Schoten geladen</span><b>${b.shots}</b></div>`;
      if (!b.mags && !b.shots) h += '<p class="warn">Geen munitie!</p>';
      h += btn('load', 'Laad 5 munitie uit voorraad'); break;
    case 'core': h += '<p class="dim">Alles wat een band hierin voert, gaat naar je voorraad. De kern schiet zelf met munitie uit de voorraad (bereik 6).</p>'; break;
    case 'outpost': h += '<p class="dim">Vergroot je bouwgebied met straal 10.</p>'; break;
    case 'wall': h += '<p class="dim">Kruipers vallen het dichtstbijzijnde gebouw aan. Laat dat een muur zijn.</p>'; break;
  }
  if (b.hp < b.maxhp) h += btn('repair', `Repareer (${repairCost(b)} ijzerplaat)`);
  if (b.type !== 'core') h += btn('remove', 'Afbreken (alles terug)');
  return h;
}

function toast(msg, kind = '') {
  const box = $('#toasts'), last = box.lastElementChild;
  if (last && last.dataset.m === msg) {
    last.dataset.n = (+last.dataset.n || 1) + 1; last.textContent = `${msg} ×${last.dataset.n}`;
    clearTimeout(last._t); last._t = setTimeout(() => last.remove(), 3500); return;
  }
  const d = document.createElement('div'); d.className = 'toast ' + kind; d.dataset.m = msg; d.textContent = msg;
  box.appendChild(d); d._t = setTimeout(() => d.remove(), 3500);
  while (box.children.length > 4) box.firstElementChild.remove();
}

function showOver() {
  const o = $('#over');
  o.innerHTML = `<div class="menubox"><div class="kicker">${G.won ? 'Overwinning' : 'Verloren'}</div><h1>${G.won ? 'PLANEET<span>GEZUIVERD</span>' : 'KERN<span>GEVALLEN</span>'}</h1>
    <div class="stats"><div><b>${G.wave}</b><span>golven</span></div><div><b>${G.kills}</b><span>kruipers gedood</span></div><div><b>${mmss(G.time)}</b><span>speeltijd</span></div><div><b>${G.M.nests.filter(n => n.dead).length}/${G.M.nests.length}</b><span>nesten</span></div></div>
    <div class="modes"><button class="big" id="btnAgain">Opnieuw <small>nieuwe kaart</small></button></div></div>`;
  o.classList.remove('hidden');
  $('#btnAgain').onclick = startGame;
}
