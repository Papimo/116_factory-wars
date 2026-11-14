'use strict';
// Alle geluid gesynthetiseerd (Web Audio), geen bestanden.
let AC = null, MG = null, NB = null;
const lastS = {};
function initAudio() {
  if (AC) { if (AC.state !== 'running') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    MG = AC.createGain(); MG.gain.value = .4; MG.connect(AC.destination);
    const n = AC.sampleRate; NB = AC.createBuffer(1, n, n); const d = NB.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + dec); }
function noiseS(t, dur, type, freq, q, peak, dec, dest) {
  const s = AC.createBufferSource(); s.buffer = NB;
  const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = AC.createGain(); env(g, t, .003, peak, dec);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * .5, dur);
}
function toneS(t, type, f0, f1, peak, dec, dest) {
  const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec);
  const g = AC.createGain(); env(g, t, .005, peak, dec); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dec + .05);
}
function sfx(kind, vol = 1, x, y) {
  if (!AC) return;
  const t = AC.currentTime, gap = { shot: .05, die: .06, mine: .1, build: .05 }[kind] || 0;
  if (lastS[kind] && t - lastS[kind] < gap) return;
  if (x !== undefined) { const d = Math.hypot(x - cam.x / T, y - cam.y / T); if (d > 28) return; vol *= Math.max(.15, 1 - d / 28); }
  lastS[kind] = t;
  const out = AC.createGain(); out.gain.value = vol; out.connect(MG);
  switch (kind) {
    case 'shot': noiseS(t, .08, 'bandpass', 2200, 1.2, .5, .06, out); toneS(t, 'square', 160, 60, .12, .05, out); break;
    case 'die': noiseS(t, .15, 'lowpass', 700, 1, .4, .12, out); toneS(t, 'sine', 260, 70, .2, .12, out); break;
    case 'boom': noiseS(t, .9, 'lowpass', 380, .8, 1, .8, out); toneS(t, 'sine', 80, 30, .6, .6, out); break;
    case 'mine': noiseS(t, .06, 'bandpass', 1200, 3, .35, .05, out); toneS(t, 'triangle', 900, 700, .08, .04, out); break;
    case 'build': toneS(t, 'square', 520, 380, .08, .05, out); noiseS(t, .04, 'highpass', 3000, 1, .15, .03, out); break;
    case 'horn': {
      const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.connect(out);
      for (const [fr, dl] of [[110, 0], [82.4, .9]]) {
        const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr;
        const g = AC.createGain(); g.gain.setValueAtTime(.0001, t + dl); g.gain.exponentialRampToValueAtTime(.35, t + dl + .15); g.gain.exponentialRampToValueAtTime(.0001, t + dl + 1.1);
        o.connect(g); g.connect(f); o.start(t + dl); o.stop(t + dl + 1.2);
      }
      break;
    }
  }
}
