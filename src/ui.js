'use strict';
// Interface (HTML boven het canvas). Knoppen werken via pointerdown + data-attributen,
// zodat het periodiek verversen van de HTML geen klikken opslokt.
const $ = s => document.querySelector(s);
function setHTML(el, html) { if (el._h !== html) { el._h = html; el.innerHTML = html; } }
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const costHTML = c => Object.keys(c).map(k => `<span class="cost ${(G && (G.stock[k] || 0) < c[k]) ? 'short' : ''}"><img src="${itemIcon(k)}">${c[k]}</span>`).join('');

function initUI() {
  const bb = $('#buildbar');
  bb.innerHTML = BUILD_GROUPS.map(gr => gr.map(k => `<button class="bbtn" data-b="${k}"><img src="${buildIcon(k)}"><span class="hk">${BUILD[k].key || ''}</span></button>`).join('')).join('<i class="bsep"></i>') +
    `<i class="bsep"></i><button class="bbtn bp" data-bp="1"><img src="${bpIcon()}"><span class="hk">B</span></button>`;
  bb.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-b]'); if (b) { selectTool(b.dataset.b); return; }
    if (e.target.closest('[data-bp]')) bpToggle(e.shiftKey);
  });
  bb.addEventListener('pointerover', e => {
    const tip = $('#tip');
    if (e.target.closest('[data-bp]')) { tip.innerHTML = `<h4>Blauwdruk <small>[B]</small></h4><p>Sleep een vak over je gebouwen om ze vast te leggen. Daarna klik je om het hele stuk opnieuw te bouwen. R draait. Shift+B = laatste blauwdruk.</p>`; tip.classList.remove('hidden'); return; }
    const b = e.target.closest('[data-b]'); if (!b) return;
    const d = BUILD[b.dataset.b];
    tip.innerHTML = `<h4>${d.n} ${d.key ? `<small>[${d.key}]</small>` : ''}</h4><div class="costs">${costHTML(d.cost)}</div><p>${d.desc}</p>` + (d.tech && G && !G.tech[d.tech] ? `<p class="bad">Eerst onderzoeken: ${TECH[d.tech].n}</p>` : '');
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
    else if (a.dataset.act === 'filter') b.filter = v || null;
    else if (logiAct(b, a.dataset.act, v)) { }
    else if (prodAct(b, a.dataset.act, v)) { }
    else if (a.dataset.act === 'empty') { for (const k in b.inv) addItem(k, b.inv[k]); b.inv = {}; b.n = 0; }
    else if (a.dataset.act === 'respanel') togglePanel('respanel', true);
    updUI();
  });
  for (const id of ['respanel', 'statpanel']) $('#' + id).addEventListener('pointerdown', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'close') togglePanel(id, false);
    else if (a.dataset.act === 'tech') setResearch(a.dataset.v);
    updUI();
  });
  $('#status').addEventListener('pointerdown', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'callwave') callWave();
    else if (a.dataset.act === 'speed') G.speed = G.speed >= 3 ? 1 : G.speed + 1;
    else if (a.dataset.act === 'pause') paused = !paused;
    else if (a.dataset.act === 'fig') toggleFigPanel();
    else if (a.dataset.act === 'res') togglePanel('respanel');
    else if (a.dataset.act === 'stats') togglePanel('statpanel');
    else if (a.dataset.act === 'alt') G.alt = !G.alt;
    else if (a.dataset.act === 'save') saveGame();
    updUI();
  });
}
function selectTool(k) {
  const d = BUILD[k];
  if (d.tech && !G.tech[d.tech] && G.tool !== k) { toastErr(`Eerst onderzoeken: ${TECH[d.tech].n} (T)`); return; }
  G.stamp = null; G.bpSel = null; document.querySelector('.bbtn.bp')?.classList.remove('on');
  G.tool = G.tool === k ? null : k; G.sel = null;
  document.querySelectorAll('.bbtn').forEach(b => b.classList.toggle('on', b.dataset.b === G.tool));
}

function togglePanel(id, on) {
  const el = $('#' + id), show = on === undefined ? el.classList.contains('hidden') : on;
  for (const o of ['respanel', 'statpanel']) if (o !== id && show) $('#' + o).classList.add('hidden');
  el.classList.toggle('hidden', !show); updUI();
}
function bpIcon() {
  const c = mk(96, 96), g = c.getContext('2d');
  g.fillStyle = '#20476e'; g.fillRect(10, 14, 76, 68); g.strokeStyle = 'rgba(200,225,255,.35)'; g.lineWidth = 1;
  for (let i = 18; i < 86; i += 8) { g.beginPath(); g.moveTo(i, 14); g.lineTo(i, 82); g.moveTo(10, i); g.lineTo(86, i); g.stroke(); }
  g.strokeStyle = '#e8f2ff'; g.lineWidth = 3; g.strokeRect(22, 26, 22, 22); g.strokeRect(52, 26, 22, 22); g.beginPath(); g.moveTo(33, 48); g.lineTo(33, 66); g.lineTo(63, 66); g.lineTo(63, 48); g.stroke();
  return c.toDataURL();
}
function bpToggle(last) {
  G.tool = null; document.querySelectorAll('.bbtn').forEach(b => b.classList.remove('on'));
  if (last) { const bp = G.stamp || bpLoad(); if (!bp) { toast('Nog geen blauwdruk gemaakt'); return; } G.stamp = bp; G.bpSel = null; }
  else if (G.bpSel || G.stamp) { G.bpSel = null; G.stamp = null; }
  else { G.bpSel = { a: null }; toast('Blauwdruk: sleep een vak over je gebouwen'); }
  document.querySelector('.bbtn.bp')?.classList.toggle('on', !!(G.bpSel || G.stamp));
}
function spark(a, col, mx) {
  if (!a.length) return '';
  const w = 120, h = 22, pts = a.map((v, i) => `${(i / Math.max(1, a.length - 1) * w).toFixed(1)},${(h - v / mx * (h - 2) - 1).toFixed(1)}`).join(' ');
  return `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.5"/>`;
}
function resHTML() {
  const labs = [...G.bmap.values()].filter(b => b.type === 'lab').length;
  let h = `<div class="fhead"><h3>Onderzoek</h3><button class="x" data-act="close">✕</button></div>` +
    `<p class="dim">${labs ? `${labs} werkplaats${labs > 1 ? 'en' : ''}.` : '<span class="warn">Bouw eerst een werkplaats [L].</span>'} Elke stap kost 1 van elke proefset en ${TECH_T} s. Maak proefsets in een assembleur (of met de hand: set A).</p><div class="techs">`;
  for (const k of TECH_ORDER) {
    const t = TECH[k], st = techState(k), done = G.rp[k] || 0;
    h += `<button class="tech ${st}" data-act="tech" data-v="${k}"${st === 'locked' || st === 'done' ? ' disabled' : ''}>` +
      `<b>${t.n}</b><span>${t.desc}</span><span class="kits">${t.kits.map(i => `<img src="${itemIcon(i)}">`).join('')} × ${t.units}` +
      (st === 'locked' ? ` · na ${t.req.map(r => TECH[r].n).join(', ')}` : st === 'done' ? ' · klaar' : st === 'cur' ? ' · bezig' : '') + `</span>` +
      (done && st !== 'done' ? `<div class="meter"><i style="width:${done / t.units * 100}%"></i></div>` : '') + `</button>`;
  }
  return h + '</div>';
}
function statHTML() {
  const S = G.st, n = S.hist.length;
  let rows = '';
  for (const k of ITEM_ORDER) {
    const p = statSeries('p', k), c = statSeries('c', k), sp = p.reduce((a, b) => a + b, 0), sc = c.reduce((a, b) => a + b, 0);
    if (!sp && !sc) continue;
    const mx = Math.max(1, ...p, ...c), f = n ? 60 / n : 1;
    rows += `<div class="srow"><img src="${itemIcon(k)}" title="${ITEMS[k].n}"><b class="good">+${Math.round(sp * f)}</b><b class="bad">−${Math.round(sc * f)}</b><svg viewBox="0 0 120 22" preserveAspectRatio="none">${spark(c, '#e0533a', mx)}${spark(p, '#8cc65a', mx)}</svg></div>`;
  }
  return `<div class="fhead"><h3>Productie · per minuut</h3><button class="x" data-act="close">✕</button></div>` +
    `<p class="dim">Groen = gemaakt (machines, delven, handwerk), rood = verbruikt (machines, bouwen, geschut, stoken). Lijn = laatste ${n} s.</p>` +
    (rows || '<p class="dim">Nog niets gemaakt.</p>');
}

function updUI() {
  if (!G) return;
  const s = G.stock;
  setHTML($('#stock'), ITEM_ORDER.filter((k, i) => i < ITEM_BASE || (s[k] || 0) > 0).map(k => `<div class="st ${(s[k] || 0) ? '' : 'zero'}" title="${ITEMS[k].n}"><img src="${itemIcon(k)}"><b>${s[k] || 0}</b></div>`).join(''));

  const alive = G.M.nests.filter(n => !n.dead).length, pct = Math.round(G.poll / 10), core = G.core;
  setHTML($('#status'),
    `<div class="sbox"><span>Golf ${G.wave}</span><b class="${G.waveT < 30 ? 'warn' : ''}">${mmss(Math.max(0, G.waveT))}</b><button data-act="callwave" title="Volgende golf nu laten komen">Nu</button></div>` +
    `<div class="sbox" title="Machines vervuilen. Meer vervuiling = grotere golven."><span>Vervuiling</span><div class="meter"><i style="width:${Math.min(100, pct / 2)}%"></i></div><small>+${pct}%</small></div>` +
    `<div class="sbox"><span>Kern</span><div class="meter hp"><i style="width:${core.hp / core.maxhp * 100}%"></i></div></div>` +
    `<div class="sbox" title="Stroomvraag / aanbod van al je netten. Kern levert ${CORE_POW.kw} kW."><span>Stroom</span><div class="meter ${G.pw.dem > G.pw.cap ? 'low' : 'pw'}"><i style="width:${G.pw.cap ? Math.min(100, G.pw.dem / G.pw.cap * 100) : 100}%"></i></div><small>${Math.round(G.pw.dem)}/${Math.round(G.pw.cap)} kW</small></div>` +
    `<div class="sbox"><span>Onderzoek</span>${G.res ? `<small>${TECH[G.res].n}</small><div class="meter"><i style="width:${(G.rp[G.res] || 0) / TECH[G.res].units * 100}%"></i></div>` : '<small class="dim">—</small>'}<button data-act="res" title="Onderzoek kiezen (T)">T</button></div>` +
    `<button data-act="stats" title="Productiestatistiek (I)">I</button><button data-act="alt" class="${G.alt ? 'on' : ''}" title="Alt-weergave: wat machines maken (Alt)">Alt</button><button data-act="save" title="Opslaan (ook elke minuut vanzelf)">💾</button>` +
    `<div class="sbox"><span>${figDef().n}</span>${G.pl.dead ? `<b class="warn">${Math.ceil(G.pl.rT)} s</b>` : `<div class="meter hp"><i style="width:${G.pl.hp / FIG_HP * 100}%"></i></div>`}<button data-act="fig" title="Figuur en kleuren (F)">Figuur</button></div>` +
    `<div class="sbox"><span>Vijanden</span><b>${G.enemies.length}</b></div>` +
    `<div class="sbox"><span>Nesten</span><b>${alive}/${G.M.nests.length}</b></div>` +
    `<button data-act="speed" title="Spelsnelheid">${G.speed}×</button><button data-act="pause" title="Pauze (P)">${paused ? '▶' : '❚❚'}</button>`);

  const q = {}; for (const k of G.hand) q[k] = (q[k] || 0) + 1;
  const hc = G.handCur;
  setHTML($('#hand'),
    `<h3>Kern · handwerk</h3><div class="hgrid">` +
    Object.keys(HAND).filter(k => !HAND[k].tech || G.tech[HAND[k].tech]).map(k => {
      const r = HAND[k], ok = canAfford(r.in), cur = hc && hc.k === k;
      return `<button data-h="${k}" class="hbtn ${ok ? '' : 'no'} ${cur ? 'cur' : ''}" title="${ITEMS[k].n} — shift-klik = 5×">` +
        `<img src="${itemIcon(k)}">${r.qty > 1 ? `<i class="q">×${r.qty}</i>` : ''}${q[k] ? `<i class="n">${q[k]}</i>` : ''}` +
        (cur ? `<i class="pr" style="width:${(1 - hc.t / hc.T) * 100}%"></i>` : '') + `<span>${Object.keys(r.in).map(i => `${r.in[i]}<img src="${itemIcon(i)}">`).join('')}</span></button>`;
    }).join('') + `</div><h3>Doelen</h3><ul class="goals">` +
    GOALS.map(([k, t]) => `<li class="${G.goals[k] ? 'done' : ''}">${t}</li>`).join('') + `</ul>`);

  const info = $('#info'), b = G.sel && G.bmap.has(G.sel.id) ? G.sel : null;
  info.classList.toggle('hidden', !b);
  if (b) setHTML(info, infoHTML(b));

  document.querySelectorAll('.bbtn[data-b]').forEach(el => { const d = BUILD[el.dataset.b], lock = !!(d.tech && !G.tech[d.tech]); el.classList.toggle('lock', lock); el.classList.toggle('no', lock || !canAfford(d.cost)); });
  if (!$('#respanel').classList.contains('hidden')) setHTML($('#respanel'), resHTML());
  if (!$('#statpanel').classList.contains('hidden')) setHTML($('#statpanel'), statHTML());

  let hv = '';
  if (mouse.in) {
    const tx = Math.floor(mouse.wx / T), ty = Math.floor(mouse.wy / T), M = G.M;
    if (G.bpSel) hv = 'Blauwdruk: sleep een vak · Esc = stoppen';
    else if (G.stamp) hv = `Blauwdruk (${G.stamp.items.length} gebouwen) · klik = bouwen · R = draaien · Esc = stoppen`;
    else if (G.tool) { const g = ghostTile(), err = canPlace(G.tool, g.tx, g.ty); hv = err ? `<span class="bad">${err}</span>` : `${BUILD[G.tool].n} · R = draaien${DRAG_TYPES.includes(G.tool) ? ' · sleep voor een rij' : ''} · rechtsklik = stoppen`; }
    else if (tx >= 0 && ty >= 0 && tx < M.W && ty < M.H && !G.seen[ty * M.W + tx]) hv = 'Onverkend gebied · loop erheen of bouw een voorpost';
    else if (tx >= 0 && ty >= 0 && tx < M.W && ty < M.H) {
      const bb = bAt(tx, ty), i = ty * M.W + tx;
      if (bb) hv = `${BUILD[bb.type].n} · klik = details${bb.type !== 'core' ? ' · rechtsklik = afbreken' : ''}${SETTABLE.includes(bb.type) ? ' · shift+rechts = kopiëren' : ''}${G.clip && G.clip.type === bb.type ? ' · shift+klik = plakken' : ''}`;
      else if (M.ore[i] === OIL) hv = `Oliebron · rijkdom ${M.amt[i]}% · zet er een oliepomp op${G.tech.oil ? '' : ' (onderzoek Olie)'}`;
      else if (M.ore[i]) hv = `${ITEMS[ORE_KEYS[M.ore[i]]].n} · ${M.amt[i]} over · ${nearPlayer(tx + .5, ty + .5, FIG_REACH) ? 'klik en houd vast om te delven' : `<span class="bad">loop dichterbij om te delven (max ${FIG_REACH} tegels)</span>`}`;
      else if (M.ground[i] === 3) hv = 'Rots · hier kun je niet bouwen of lopen';
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
    case 'drill': case 'drill3': {
      const M = G.M; let left = 0, typ = null;
      for (let k = 0; k < b.w * b.h; k++) { const m = (b.y + (k / b.w | 0)) * M.W + b.x + k % b.w; if (ORE_KEYS[M.ore[m]] && M.amt[m] > 0) { left += M.amt[m]; typ = ORE_KEYS[M.ore[m]]; } }
      h += typ ? row(typ, left, 'Erts over') : '<p class="warn">Geen erts meer</p>';
      if (b.hold) h += '<p class="warn">Uitvoer geblokkeerd: zet een band of machine voor de pijl.</p>';
      break;
    }
    case 'furnace':
      h += row('coal', b.fuel, 'Brandstof') + (b.ore ? row(b.ore, b.oreN, 'Invoer') : '<p class="dim">Geen erts</p>') + (b.outN ? row(b.outType, b.outN, 'Klaar') : '');
      if (b.nofuel) h += '<p class="warn">Geen steenkool!</p>';
      h += btn('fill', 'Bijvullen uit voorraad'); break;
    case 'assembler': {
      h += '<div class="seg">' + Object.keys(RECIPES).filter(k => !RECIPES[k].tech || G.tech[RECIPES[k].tech] || b.recipe === k).map(k => `<button data-act="recipe" data-v="${k}" class="${b.recipe === k ? 'on' : ''}"><img src="${itemIcon(RECIPES[k].out)}">${RECIPES[k].n}</button>`).join('') + '</div>';
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
    case 'core': h += `<p class="dim">Alles wat een band hierin voert, gaat naar je voorraad. De kern schiet zelf met munitie uit de voorraad (bereik 6) en levert ${CORE_POW.kw} kW stroom in een vak van 11×11.</p>`; break;
    case 'arm': case 'arm2':
      h += b.hold ? row(b.hold, 1, 'In de klauw') : '<p class="dim">Wacht op iets dat voor hem past.</p>';
      h += `<p class="dim">Filter (alleen dit pakken):</p>` + filterHTML(b) + condHTML(b); break;
    case 'splitter':
      h += `<p class="dim">Filter: dit spul gaat rechtdoor, de rest naar links/rechts.</p>` + filterHTML(b); break;
    case 'chest': {
      h += `<div class="row"><span>Gevuld</span><b>${b.n}/${CHEST_CAP}</b></div>`;
      for (const k in b.inv) h += row(k, b.inv[k]);
      if (b.n) h += btn('empty', 'Leeghalen naar voorraad'); break;
    }
    case 'tunnel':
      h += b.role === 'in' ? `<p class="dim">Ingang · uitgang ${b.len} tegels verder · ${b.q.length} onderweg</p>` : b.role === 'out' ? '<p class="dim">Uitgang</p>' : `<p class="warn">Geen partner: zet een tweede tunnelband in dezelfde richting, max ${TUN_MAX - 1} tegels ertussen.</p>`; break;
    case 'pole': {
      const n = G.pw.nets[b.net]; if (n) h += `<div class="row"><span>Net</span><b>${Math.round(n.dem)}/${Math.round(n.cap)} kW</b></div>` + (n.cap ? '' : '<p class="warn">Geen stroombron: verbind met de kern of een generator.</p>');
      break;
    }
    case 'boiler':
      h += row('coal', b.fuel, 'Brandstof') + `<div class="row"><span>Generatoren ertegen</span><b>${b.gens.length}</b></div>`;
      if (!b.gens.length) h += '<p class="warn">Zet een generator tegen de ketel.</p>'; else if (!b.fuel && !b.burning) h += '<p class="warn">Geen steenkool!</p>';
      h += btn('fill', 'Bijvullen uit voorraad'); break;
    case 'generator':
      h += `<div class="row"><span>Levert</span><b>${Math.round(b.out)} / ${Math.round(b.av || 0)} kW</b></div>`;
      if (!b.ketels.length) h += '<p class="warn">Zet hem tegen een ketel.</p>'; else if (!b.av) h += '<p class="warn">Ketel heeft geen steenkool.</p>';
      if (b.net < 0) h += '<p class="warn">Niet aan het net: zet een stroompaal in de buurt.</p>'; break;
    case 'lab':
      for (const k of KITS) if (k === 'kit1' || k === 'kit2' || b.inv[k] || (G.res && TECH[G.res].kits.includes(k))) h += row(k, b.inv[k] || 0);
      h += G.res ? `<p class="dim">Bezig: ${TECH[G.res].n}</p>` : '<p class="warn">Geen onderzoek gekozen.</p>';
      h += btn('respanel', 'Onderzoek kiezen (T)') + btn('fill', 'Bijvullen uit voorraad'); break;
    case 'flamer':
      h += row('coal', b.fuel, 'Brandstof'); if (b.nofuel) h += '<p class="warn">Geen steenkool!</p>';
      h += btn('fill', 'Bijvullen uit voorraad'); break;
    case 'wall2': h += '<p class="dim">Kruipers vallen het dichtstbijzijnde gebouw aan.</p>'; break;
    case 'outpost': h += '<p class="dim">Vergroot je bouwgebied met straal 10.</p>'; break;
    case 'wall': h += '<p class="dim">Kruipers vallen het dichtstbijzijnde gebouw aan. Laat dat een muur zijn.</p>'; break;
  }
  h += logiInfo(b) + prodInfo(b); if (b.type === 'drill' || b.type === 'drill3') h += condHTML(b);
  if (BUILD[b.type].pw) { const pf = pwr(b); h += `<div class="row"><span>Stroom</span><b class="${pf < .999 ? 'bad' : ''}">${b.net < 0 ? 'geen net' : Math.round(G.pw.nets[b.net].sat * 100) + '%'}</b></div>` + (pf < .999 ? `<p class="dim">Werkt op ${Math.round(pf * 100)}% snelheid.</p>` : ''); }
  if (b.hp < b.maxhp) h += btn('repair', `Repareer (${repairCost(b)} ijzerplaat)`);
  if (b.type !== 'core') h += btn('remove', 'Afbreken (alles terug)');
  return h;
}

function filterHTML(b) {
  return `<div class="fgrid"><button data-act="filter" data-v="" class="${b.filter ? '' : 'on'}">—</button>` + ITEM_ORDER.map(k => `<button data-act="filter" data-v="${k}" class="${b.filter === k ? 'on' : ''}" title="${ITEMS[k].n}"><img src="${itemIcon(k)}"></button>`).join('') + '</div>';
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
  o.classList.remove('hidden'); clearSave();
  $('#btnAgain').onclick = () => startGame();
}
