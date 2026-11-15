'use strict';
// Alle spelgetallen op één plek. Eenheden: tegels (1 tegel = T wereldpixels), seconden.
const T = 32, MAP_W = 128, MAP_H = 88;
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];           // 0 oost, 1 zuid, 2 west, 3 noord
const NX = [1, 0, -1, 0, 1, 1, -1, -1], NY = [0, 1, 0, -1, 1, -1, 1, -1];

const ITEMS = {
  ironOre:     { n: 'IJzererts',  k: 'chunk', c: '#7c8791', d: '#4c535a', h: '#b5bec6', s: '#6fa0c8' },
  copperOre:   { n: 'Kopererts',  k: 'chunk', c: '#8a5a3a', d: '#553521', h: '#c98a5a', s: '#5fae8c' },
  coal:        { n: 'Steenkool',  k: 'chunk', c: '#2a2825', d: '#121110', h: '#5d5b57', s: '#a9b0b8' },
  stone:       { n: 'Steen',      k: 'chunk', c: '#a8977a', d: '#6e624f', h: '#d8ccb0', s: '#8b7c64' },
  ironPlate:   { n: 'IJzerplaat', k: 'plate', c: '#a9b2b9', d: '#636b72', h: '#e1e6ea' },
  copperPlate: { n: 'Koperplaat', k: 'plate', c: '#d0844c', d: '#87502a', h: '#f2b48a' },
  brick:       { n: 'Baksteen',   k: 'brick', c: '#9a4e35', d: '#5e2c1c', h: '#c4704f' },
  gear:        { n: 'Tandwiel',   k: 'gear',  c: '#8e969c', d: '#50565b', h: '#c9cfd3' },
  ammo:        { n: 'Munitie',    k: 'ammo',  c: '#5d5c3c', d: '#383722', h: '#d9b44a' },
  kit1:        { n: 'Proefset A', k: 'kit',   c: '#c94a2a', d: '#6e2412', h: '#f08a5a' },
  kit2:        { n: 'Proefset B', k: 'kit',   c: '#3f8a6a', d: '#1f4a38', h: '#8ad0a8' },
  // ---- productie B ----
  sulfur:      { n: 'Zwavelzand', k: 'chunk', c: '#d8b83a', d: '#8a7018', h: '#f6e48a', s: '#a08a3a' },
  scrap:       { n: 'Schroot',    k: 'scrap', c: '#7a6a5a', d: '#3e342a', h: '#b0a090' },
  steel:       { n: 'Staal',      k: 'plate', c: '#7d8c9a', d: '#3c4650', h: '#c8d6e2' },
  wire:        { n: 'Koperdraad', k: 'wire',  c: '#d0844c', d: '#6e3e1c', h: '#f6c08a' },
  circuit:     { n: 'Printplaat', k: 'chip',  c: '#3f7a4a', d: '#1c3a22', h: '#d9b44a' },
  tar:         { n: 'Teer',       k: 'tar',   c: '#2a2420', d: '#0e0b09', h: '#6e625a' },
  plastic:     { n: 'Kunststof',  k: 'plate', c: '#e4ddd0', d: '#8a8274', h: '#ffffff' },
  explosive:   { n: 'Springstof', k: 'box',   c: '#b8402a', d: '#5a1a10', h: '#f0a060' },
  kit3:        { n: 'Proefset C', k: 'kit',   c: '#3f6aa8', d: '#1c3258', h: '#8ab0e8' },
  kit4:        { n: 'Proefset D', k: 'kit',   c: '#8a4aa8', d: '#42204e', h: '#d09ae8' },
  modS:        { n: 'Snelheidsmodule', k: 'mod', c: '#3f6aa8', d: '#1c3258', h: '#8ab0e8' },
  modE:        { n: 'Zuinigheidsmodule', k: 'mod', c: '#4f9a4a', d: '#1f4a1c', h: '#a8e08a' },
};
const ITEM_ORDER = ['ironOre', 'copperOre', 'coal', 'stone', 'ironPlate', 'copperPlate', 'brick', 'gear', 'ammo', 'kit1', 'kit2',
  'sulfur', 'scrap', 'steel', 'wire', 'circuit', 'tar', 'plastic', 'explosive', 'kit3', 'kit4', 'modS', 'modE'];
const ITEM_BASE = 11;                                      // de eerste 11 staan altijd in de voorraadbalk, de rest pas als je ze hebt
const KITS = ['kit1', 'kit2', 'kit3', 'kit4'];
const OIL = 6;                                             // ore-code voor een oliebron (niet te delven, wel te pompen)
const ORE_KEYS = [null, 'ironOre', 'copperOre', 'coal', 'stone', 'sulfur', null];

const SMELT = { ironOre: 'ironPlate', copperOre: 'copperPlate', stone: 'brick', scrap: 'ironPlate' };
const SMELT_IN = { ironOre: 1, copperOre: 1, stone: 2, scrap: 1 };
const SMELT_T = 2.5, DRILL_T = 2.0, BELT_SPEED = 1.8, FUEL_PER_COAL = 4, MINE_T = 0.6;

const RECIPES = {
  ammo: { n: 'Munitie',  in: { ironPlate: 2, copperPlate: 1 }, out: 'ammo', qty: 2, time: 2.0 },
  gear: { n: 'Tandwiel', in: { ironPlate: 2 },                 out: 'gear', qty: 1, time: 1.2 },
  kit1: { n: 'Set A',    in: { copperPlate: 1, gear: 1 },       out: 'kit1', qty: 1, time: 4.0 },
  kit2: { n: 'Set B',    in: { ammo: 1, brick: 2, ironPlate: 1 }, out: 'kit2', qty: 1, time: 6.0 },
  wire: { n: 'Draad',    in: { copperPlate: 1 },               out: 'wire', qty: 2, time: 0.8, tech: 'elec' },
  kit3: { n: 'Set C',    in: { circuit: 1, steel: 1 },          out: 'kit3', qty: 1, time: 8.0, tech: 'elec' },
  kit4: { n: 'Set D',    in: { plastic: 1, explosive: 1, circuit: 1 }, out: 'kit4', qty: 1, time: 10.0, tech: 'chem' },
};
// Productiemachines (B). in = spullen, fin/fout = vloeistof (eenheden), m = welke machine, poll = vervuiling per ronde.
const FLUIDS = {
  oil:  { n: 'Ruwe olie', c: '#2a2218', h: '#7a6a4a' },
  fuel: { n: 'Brandstof', c: '#d9a030', h: '#ffe08a' },
};
const PROD = {
  refine:    { n: 'Raffineren', m: 'refinery', fin: { oil: 40 }, fout: { fuel: 30 }, out: 'tar', qty: 1, time: 4, poll: 2.5 },
  steel:     { n: 'Staal',      m: 'press', in: { ironPlate: 5 }, out: 'steel', qty: 1, time: 5, poll: 1 },
  circuit:   { n: 'Printplaat', m: 'pcb', in: { wire: 3, ironPlate: 1 }, out: 'circuit', qty: 1, time: 2.5, poll: .4 },
  modS:      { n: 'Snel',       m: 'pcb', in: { circuit: 5, steel: 2 }, out: 'modS', qty: 1, time: 12, tech: 'mods' },
  modE:      { n: 'Zuinig',     m: 'pcb', in: { circuit: 5, plastic: 2 }, out: 'modE', qty: 1, time: 12, tech: 'mods' },
  explosive: { n: 'Springstof', m: 'chem', in: { sulfur: 1, coal: 1 }, fin: { fuel: 10 }, out: 'explosive', qty: 2, time: 3, poll: 1.5 },
  plastic:   { n: 'Kunststof',  m: 'chem', in: { tar: 1 }, fin: { fuel: 10 }, out: 'plastic', qty: 2, time: 3, poll: 1.2 },
};
const PIPE_CAP = 50, TANK_CAP = 1500, PUMP_RATE = 2.5, FUEL_KJ = 400, FUEL_FLAME = 4;   // pomp: eenheden/s per olietegel (bij rijkdom 100)
const DRILL3_SP = 2.5, QUARRY_T = 2.5, RECYC = { r: 7, t: 1.5 };
// modules: sp = snelheid, pw = stroom, poll = vervuiling (vermenigvuldigers, per module)
const MODS = { modS: { sp: 1.3, pw: 1.5, poll: 1.2 }, modE: { sp: 1, pw: .6, poll: .7 } };
const MOD_SLOTS = { drill: 1, drill3: 3, assembler: 2, lab: 2, press: 2, pcb: 2, chem: 2, refinery: 3, pump: 2, quarry: 2, recycler: 1 };
// Handwerk in de kern: traag, maar zonder machines.
const HAND = {
  ironPlate:   { in: { ironOre: 1 },                 qty: 1, time: 2.0 },
  copperPlate: { in: { copperOre: 1 },               qty: 1, time: 2.0 },
  brick:       { in: { stone: 2 },                   qty: 1, time: 2.0 },
  gear:        { in: { ironPlate: 2 },               qty: 1, time: 1.5 },
  ammo:        { in: { ironPlate: 2, copperPlate: 1 }, qty: 2, time: 3.0 },
  kit1:        { in: { copperPlate: 1, gear: 1 },      qty: 1, time: 6.0 },
  wire:        { in: { copperPlate: 1 },               qty: 2, time: 1.5, tech: 'elec' },
};

// cat = groep in de bouwbalk · tech = eerst onderzoeken · pw = stroomvraag (kW) · walk = figuur kan erover · vec = per beeld getekend (draait mee)
const BUILD = {
  belt:      { n: 'Transportband', key: '1', w: 1, h: 1, hp: 40,  rot: true,  walk: true, cost: { ironPlate: 1 },
               desc: 'Vervoert spullen in de pijlrichting. Sleep om een lijn te leggen.' },
  drill:     { n: 'Boor',          key: '2', w: 2, h: 2, hp: 160, rot: true,  pw: 90, cost: { ironPlate: 8, gear: 3, brick: 2 },
               desc: 'Op erts zetten. Geeft erts af aan de kant van de pijl. Stroom: 90 kW (zonder stroom 30% snelheid).' },
  furnace:   { n: 'Oven',          key: '3', w: 2, h: 2, hp: 160, rot: true,  cost: { brick: 6 },
               desc: 'Erts + steenkool → platen. Steen → baksteen. Geen stroom nodig.' },
  assembler: { n: 'Assembleur',    key: '4', w: 2, h: 2, hp: 160, rot: true,  pw: 75, cost: { ironPlate: 8, gear: 4, copperPlate: 4 },
               desc: 'Maakt munitie, tandwielen of proefsets. Klik erop om het recept te kiezen. Stroom: 75 kW.' },
  turret:    { n: 'Geschutstoren', key: '5', w: 2, h: 2, hp: 320, rot: false, cost: { ironPlate: 10, gear: 6, copperPlate: 6 },
               desc: 'Schiet op alles binnen 8 tegels. Voer munitie aan met een band of grijparm.' },
  wall:      { n: 'Muur',          key: '6', w: 1, h: 1, hp: 380, rot: false, cost: { brick: 2 },
               desc: 'Houdt aanvallers op. Sleep om een rij te bouwen.' },
  outpost:   { n: 'Voorpost',      key: '7', w: 2, h: 2, hp: 450, rot: false, cost: { ironPlate: 15, brick: 12, copperPlate: 6 },
               desc: 'Vergroot je bouwgebied met straal 10 en verkent de omgeving. Trekt aanvallen aan!' },
  arm:       { n: 'Grijparm',      key: '8', w: 1, h: 1, hp: 60,  rot: true,  pw: 15, vec: true, cost: { ironPlate: 1, gear: 1, copperPlate: 1 },
               desc: 'Pakt spullen achter zich (band, kist, machine of kern) en legt ze in de pijlrichting neer. Klik voor een filter. Stroom: 15 kW.' },
  chest:     { n: 'Kist',          key: '9', w: 1, h: 1, hp: 120, rot: false, sig: true, cost: { ironPlate: 4 },
               desc: 'Buffer voor 48 spullen. Banden en grijparmen kunnen erin, grijparmen halen eruit.' },
  pole:      { n: 'Stroompaal',    key: '0', w: 1, h: 1, hp: 50,  rot: false, cost: { ironPlate: 1, copperPlate: 2 },
               desc: 'Geeft stroom in een vak van 7×7. Palen tot 8 tegels uit elkaar (en de kern) koppelen zich tot één net.' },
  splitter:  { n: 'Verdeler',      key: 'X', w: 1, h: 1, hp: 80,  rot: true,  walk: true, vec: true, tech: 'logi', cost: { ironPlate: 4, gear: 2, copperPlate: 2 },
               desc: 'Verdeelt spullen om de beurt over voor, links en rechts. Met filter: dat spul rechtdoor, de rest opzij.' },
  tunnel:    { n: 'Tunnelband',    key: 'U', w: 1, h: 1, hp: 80,  rot: true,  walk: true, vec: true, tech: 'logi', cost: { ironPlate: 5, brick: 2 },
               desc: 'Zet er twee in dezelfde richting met hooguit 4 tegels ertussen: spullen gaan eronderdoor.' },
  boiler:    { n: 'Ketel',         key: 'K', w: 2, h: 2, hp: 200, rot: false, cost: { brick: 8, ironPlate: 4 },
               desc: 'Stookt steenkool tot stoom voor generatoren die ertegenaan staan (2 op vol vermogen). Vervuilt.' },
  generator: { n: 'Generator',     key: 'G', w: 2, h: 2, hp: 200, rot: false, cost: { ironPlate: 10, gear: 6, copperPlate: 6 },
               desc: 'Tegen een ketel zetten: tot 300 kW. Met een stroompaal aan het net koppelen.' },
  lab:       { n: 'Werkplaats',    key: 'L', w: 2, h: 2, hp: 180, rot: false, pw: 60, cost: { ironPlate: 8, gear: 6, copperPlate: 8 },
               desc: 'Verbruikt proefsets voor onderzoek (T = kiezen). Stroom: 60 kW.' },
  flamer:    { n: 'Vuurspuwer',    key: 'V', w: 2, h: 2, hp: 360, rot: false, tech: 'flame', cost: { ironPlate: 14, gear: 6, brick: 6, copperPlate: 4 },
               desc: 'Spuwt vuur tot 5 tegels in een boog: raakt alles daarin, pantser helpt maar half. Stookt steenkool.' },
  wall2:     { n: 'Betonmuur',     key: 'M', w: 1, h: 1, hp: 900, rot: false, tech: 'wall2', cost: { brick: 4, ironPlate: 2 },
               desc: 'Veel sterker dan een muur. Sleep om een rij te bouwen.' },
  // ---- logistiek 2 ----
  arm2:      { n: 'Lange arm',     key: 'J', w: 1, h: 1, hp: 70,  rot: true,  pw: 25, vec: true, tech: 'logi2', cost: { ironPlate: 2, gear: 2, copperPlate: 2 },
               desc: 'Grijparm die 2 tegels ver reikt: pakt over een band heen. Filter en voorwaarde instelbaar. Stroom: 25 kW.' },
  counter:   { n: 'Weegschaal',    key: 'N', w: 1, h: 1, hp: 80,  rot: true,  walk: true, vec: true, sig: true, tech: 'logi2', cost: { ironPlate: 3, copperPlate: 3 },
               desc: 'Stuk band dat telt wat erlangs gaat (per minuut). Met een voorwaarde wordt het een poort.' },
  rail:      { n: 'Spoor',         key: 'H', w: 1, h: 1, hp: 60,  rot: false, walk: true, vec: true, ground: true, tech: 'rail', cost: { ironPlate: 1, brick: 1 },
               desc: 'Spoor voor lorries. Sleep om een lijn te leggen; bochten en splitsingen gaan vanzelf.' },
  station:   { n: 'Station',       key: 'O', w: 1, h: 1, hp: 150, rot: false, walk: true, vec: true, ground: true, tech: 'rail', cost: { ironPlate: 6, brick: 4 },
               desc: 'Stuk spoor waar een lorrie stopt. Grijparmen laden en lossen hier. Klik om in te stellen wanneer hij vertrekt.' },
  lorry:     { n: 'Lorrie',        key: 'Y', w: 1, h: 1, hp: 200, rot: false, vec: true, lorry: true, tech: 'rail', cost: { ironPlate: 12, gear: 6 },
               desc: 'Op het spoor zetten. Rijdt om de beurt naar elk station dat hij kan bereiken. Laadt 80 spullen.' },
  dock:      { n: 'Drone-dok',     key: 'E', w: 2, h: 2, hp: 260, rot: false, pw: 80, tech: 'drone', cost: { ironPlate: 16, gear: 8, copperPlate: 12 },
               desc: '4 drones brengen spul uit aanbodkisten (en de kern) naar vraagkisten, tot 24 tegels ver. Stroom: 80 kW.' },
  chestP:    { n: 'Aanbodkist',    key: 'C', w: 1, h: 1, hp: 120, rot: false, sig: true, tech: 'drone', cost: { ironPlate: 4, copperPlate: 4 },
               desc: 'Kist waar drones uit halen. Vul hem met een band of grijparm.' },
  chestR:    { n: 'Vraagkist',     key: 'Z', w: 1, h: 1, hp: 120, rot: false, sig: true, tech: 'drone', cost: { ironPlate: 4, copperPlate: 4 },
               desc: 'Klik om te kiezen wat erin moet. Drones vullen hem aan; grijparmen halen eruit.' },
  // ---- productie B (geen sneltoets meer vrij: via de bouwbalk) ----
  pipe:      { n: 'Pijp',          w: 1, h: 1, hp: 50,  rot: false, walk: true, vec: true, fnode: PIPE_CAP, tech: 'oil', cost: { ironPlate: 1 },
               desc: 'Vervoert vloeistof (olie, brandstof). Sleep om een lijn te leggen. Eén soort per leiding: houd olie en brandstof gescheiden.' },
  tank:      { n: 'Tank',          w: 2, h: 2, hp: 300, rot: false, fnode: TANK_CAP, tech: 'oil', cost: { ironPlate: 12, steel: 4 },
               desc: `Buffer voor ${TANK_CAP} eenheden vloeistof. Koppelt aan pijpen en machines die ertegen staan.` },
  pump:      { n: 'Oliepomp',      w: 2, h: 2, hp: 220, rot: false, pw: 60, fport: true, oil: true, tech: 'oil', cost: { ironPlate: 10, gear: 6, steel: 2 },
               desc: 'Op een oliebron zetten. Pompt ruwe olie in pijpen of een tank ernaast. Stroom: 60 kW.' },
  refinery:  { n: 'Raffinaderij',  w: 3, h: 3, hp: 400, rot: true,  pw: 150, fport: true, tech: 'oil', cost: { steel: 10, gear: 10, brick: 10, copperPlate: 6 },
               desc: '40 olie → 30 brandstof + 1 teer. Olie en brandstof via (aparte) pijpen ernaast, teer komt uit de pijl. Vervuilt flink. Stroom: 150 kW.' },
  chem:      { n: 'Chemiehal',     w: 3, h: 3, hp: 360, rot: true,  pw: 100, fport: true, tech: 'chem', cost: { steel: 8, circuit: 6, brick: 8 },
               desc: 'Brandstof (pijp) + zwavel + kool → springstof, of brandstof + teer → kunststof. Klik voor het recept. Stroom: 100 kW.' },
  press:     { n: 'Staalpers',     w: 2, h: 2, hp: 260, rot: true,  pw: 60, tech: 'steel', cost: { ironPlate: 12, gear: 6, brick: 6 },
               desc: '5 ijzerplaat → 1 staal. Stroom: 60 kW.' },
  pcb:       { n: 'Printplaatlijn', w: 2, h: 2, hp: 220, rot: true, pw: 80, tech: 'elec', cost: { steel: 4, gear: 4, copperPlate: 8 },
               desc: '3 koperdraad + 1 ijzerplaat → printplaat. Na onderzoek Modules ook modules. Stroom: 80 kW.' },
  drill3:    { n: 'Grote boor',    w: 3, h: 3, hp: 420, rot: true,  pw: 200, tech: 'drill3', cost: { steel: 12, gear: 12, circuit: 4 },
               desc: `3×3 boor: ${DRILL3_SP}× zo snel als een boor en delft alle 9 tegels eronder. Stroom: 200 kW.` },
  quarry:    { n: 'Steengroeve',   w: 2, h: 2, hp: 300, rot: true,  pw: 70, rock: true, tech: 'quarry', cost: { ironPlate: 10, gear: 8, brick: 4 },
               desc: 'Alleen op rots. Breekt eindeloos steen uit de rots (langzaam). Stroom: 70 kW.' },
  recycler:  { n: 'Recycler',      w: 2, h: 2, hp: 240, rot: true,  pw: 60, tech: 'recyc', cost: { ironPlate: 10, gear: 6, copperPlate: 4 },
               desc: `Haalt wrakken binnen ${RECYC.r} tegels uit elkaar → schroot (smelt in een oven tot ijzerplaat). Stroom: 60 kW.` },
  core:      { n: 'Kern',          w: 3, h: 3, hp: 2500, rot: false, cost: {} },
};
// vloeistof aan boiler/vuurspuwer: brandstof uit een pijp ernaast
BUILD.boiler.fport = true; BUILD.flamer.fport = true;
const BUILD_GROUPS = [['belt', 'arm', 'arm2', 'splitter', 'tunnel', 'counter', 'chest'], ['rail', 'station', 'lorry', 'dock', 'chestP', 'chestR'], ['drill', 'furnace', 'assembler', 'lab'],
  ['pipe', 'tank', 'pump', 'refinery', 'chem', 'press', 'pcb', 'drill3', 'quarry', 'recycler'], ['pole', 'boiler', 'generator'], ['turret', 'flamer', 'wall', 'wall2', 'outpost']];
const BUILD_ORDER = BUILD_GROUPS.flat();
const DRAG_TYPES = ['belt', 'wall', 'wall2', 'pole', 'rail', 'pipe'];
const BUILD_RANGE = { core: 14, outpost: 10 };

// logistiek
const ARM_T = .9, CHEST_CAP = 48, TUN_MAX = 5;
const CHESTS = ['chest', 'chestP', 'chestR'];
const SIG_T = .5;                                          // schakelnet: signalen per stroomnet, elke 0,5 s
const LORRY = { cap: 80, speed: 5, rest: 3 };              // rust = vertrekken na 3 s zonder laden/lossen
const DOCK = { n: 4, r: 24, cap: 4, speed: 6 };            // drones per dok, bereik (tegels), lading, snelheid
// stroom (kW / kJ). Paal: vak = halve breedte rond het midden, reach = verbindingsafstand.
const POLE = { box: 3.5, reach: 8 }, CORE_POW = { kw: 200, box: 5.5, reach: 9 };
const GEN_KW = 300, BOILER_KW = 600, COAL_KJ = 3000, NOPOW = .3;
// onderzoek: units × (1 van elke set), TECH_T seconden per unit per werkplaats
const TECH_T = 3;
const TECH = {
  logi:  { n: 'Logistiek',       units: 10, kits: ['kit1'],         desc: 'Verdeler en tunnelband.' },
  drill1:{ n: 'Boorkoppen',      units: 25, kits: ['kit1'],         desc: 'Boren werken 50% sneller.' },
  belt1: { n: 'Snellere banden', units: 20, kits: ['kit1'],         req: ['logi'], desc: 'Alle banden 50% sneller.' },
  wall2: { n: 'Betonmuur',       units: 20, kits: ['kit1', 'kit2'], desc: 'Muur met 900 punten.' },
  dmg1:  { n: 'Scherpe kogels',  units: 20, kits: ['kit1', 'kit2'], desc: 'Geschut en kern +40% schade.' },
  flame: { n: 'Vuurspuwer',      units: 30, kits: ['kit1', 'kit2'], req: ['dmg1'], desc: 'Vuurtoren op steenkool, sterk tegen groepen.' },
  logi2: { n: 'Logistiek 2',     units: 20, kits: ['kit1'],         req: ['logi'], desc: 'Lange arm, weegschaal en voorwaarden (schakelnet via het stroomnet).' },
  rail:  { n: 'Spoor',           units: 30, kits: ['kit1', 'kit2'], req: ['logi'], desc: 'Spoor, station en lorrie voor verre ertsvelden.' },
  drone: { n: 'Drones',          units: 40, kits: ['kit1', 'kit2'], req: ['logi2'], desc: 'Drone-dok, aanbodkist en vraagkist.' },
  belt2: { n: 'Snelle banden',   units: 40, kits: ['kit1', 'kit2'], req: ['belt1'], desc: 'Banden 2× zo snel als in het begin.' },
  // ---- productie B: trap 2 (A+B), trap 3 (+C), trap 4 (+D) ----
  recyc: { n: 'Recycler',        units: 15, kits: ['kit1'],         desc: 'Recycler: wrakken → schroot. Schroot smelt tot ijzerplaat.' },
  steel: { n: 'Staal',           units: 30, kits: ['kit1', 'kit2'], desc: 'Staalpers: 5 ijzerplaat → 1 staal.' },
  quarry:{ n: 'Steengroeve',     units: 20, kits: ['kit1', 'kit2'], desc: 'Steengroeve op rots: eindeloos steen.' },
  oil:   { n: 'Olie',            units: 30, kits: ['kit1', 'kit2'], req: ['steel'], desc: 'Oliepomp, pijp, tank en raffinaderij. Brandstof stookt ketels en vuurspuwers via pijpen.' },
  elec:  { n: 'Elektronica',     units: 40, kits: ['kit1', 'kit2'], req: ['steel'], desc: 'Koperdraad, printplaatlijn en Proefset C (derde onderzoekstrap).' },
  chem:  { n: 'Chemie',          units: 40, kits: ['kit1', 'kit2', 'kit3'], req: ['oil', 'elec'], desc: 'Chemiehal: springstof en kunststof. Proefset D (vierde trap).' },
  drill3:{ n: 'Grote boor',      units: 40, kits: ['kit1', 'kit2', 'kit3'], req: ['drill1', 'elec'], desc: '3×3 boor, veel sneller.' },
  mods:  { n: 'Modules',         units: 50, kits: ['kit1', 'kit2', 'kit3'], req: ['elec'], desc: 'Printplaatlijn maakt snelheids- en zuinigheidsmodules voor machines.' },
  drill2:{ n: 'Diamantkoppen',   units: 60, kits: ['kit1', 'kit2', 'kit3', 'kit4'], req: ['drill3', 'chem'], desc: 'Alle boren nog eens 50% sneller.' },
  dmg2:  { n: 'Springstofkogels', units: 60, kits: ['kit1', 'kit2', 'kit3', 'kit4'], req: ['dmg1', 'chem'], desc: 'Geschut en kern nog eens +40% schade.' },
};
const TECH_ORDER = Object.keys(TECH);

const MAG = 10;                                           // schoten per munitie
const TURRET = { range: 8, rate: 0.22, dmg: 7 };
const CORE_GUN = { range: 6, rate: 0.45, dmg: 6 };
const FLAMER = { range: 5, rate: .1, dmg: 4.5, arc: .42, coalT: 5 };

const ENEMY = {
  crawler: { n: 'Kruiper',      hp: 28,   speed: 1.6, dmg: 5,  rate: 0.8, r: 0.28, armor: 0, col: '#6a6b3a', dark: '#3c3d20', glow: '#c7e46a' },
  beetle:  { n: 'Pantserkever', hp: 170,  speed: 0.9, dmg: 16, rate: 1.1, r: 0.42, armor: 3, col: '#4d5236', dark: '#2a2d1c', glow: '#e0a040' },
  mother:  { n: 'Broedmoeder',  hp: 1400, speed: 0.6, dmg: 60, rate: 1.4, r: 0.8,  armor: 5, col: '#5e3d52', dark: '#33202c', glow: '#e07ad0' },
};
const NEST_HP = 2500;
const WAVE = { first: 240, every: 150 };

const START_STOCK = { kit1: 0, kit2: 0, ironOre: 0, copperOre: 0, coal: 8, stone: 0, ironPlate: 50, copperPlate: 20, brick: 24, gear: 10, ammo: 12 };

const GOALS = [
  ['mine',    'Delf erts met de hand (klik + vasthouden)'],
  ['drill',   'Bouw een boor op erts [2]'],
  ['smelt',   'Smelt erts in een oven (met steenkool) [3]'],
  ['turret',  'Bouw een geschutstoren [5]'],
  ['ammo',    'Laat een assembleur munitie maken [4]'],
  ['feed',    'Voer munitie via een band of grijparm naar een toren'],
  ['power',   'Geef een boor stroom met een stroompaal [0]'],
  ['research','Rond een onderzoek af in een werkplaats [L, T]'],
  ['outpost', 'Bouw een voorpost richting een nest [7]'],
  ['nest',    'Vernietig een nest'],
];

// Kleurtokens van de stijl (later te wisselen voor stijlvarianten).
const PAL = {
  metalT: '#5d5f5c', metalF: '#3a3c3a', steelT: '#757a7b', steelF: '#474b4d',
  brickT: '#7b6556', brickF: '#4f3f35', concT: '#8a8579', concF: '#5c584f',
  accent: '#e2571e', hazard: '#c9a227',
};
