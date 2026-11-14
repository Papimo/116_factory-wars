'use strict';
// Alle spelgetallen op één plek. Eenheden: tegels (1 tegel = T wereldpixels), seconden.
const T = 32, MAP_W = 96, MAP_H = 64;
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
};
const ITEM_ORDER = ['ironOre', 'copperOre', 'coal', 'stone', 'ironPlate', 'copperPlate', 'brick', 'gear', 'ammo'];
const ORE_KEYS = [null, 'ironOre', 'copperOre', 'coal', 'stone'];

const SMELT = { ironOre: 'ironPlate', copperOre: 'copperPlate', stone: 'brick' };
const SMELT_IN = { ironOre: 1, copperOre: 1, stone: 2 };
const SMELT_T = 2.5, DRILL_T = 2.0, BELT_SPEED = 1.8, FUEL_PER_COAL = 4, MINE_T = 0.6;

const RECIPES = {
  ammo: { n: 'Munitie',  in: { ironPlate: 2, copperPlate: 1 }, out: 'ammo', qty: 2, time: 2.0 },
  gear: { n: 'Tandwiel', in: { ironPlate: 2 },                 out: 'gear', qty: 1, time: 1.2 },
};
// Handwerk in de kern: traag, maar zonder machines.
const HAND = {
  ironPlate:   { in: { ironOre: 1 },                 qty: 1, time: 2.0 },
  copperPlate: { in: { copperOre: 1 },               qty: 1, time: 2.0 },
  brick:       { in: { stone: 2 },                   qty: 1, time: 2.0 },
  gear:        { in: { ironPlate: 2 },               qty: 1, time: 1.5 },
  ammo:        { in: { ironPlate: 2, copperPlate: 1 }, qty: 2, time: 3.0 },
};

const BUILD = {
  belt:      { n: 'Transportband', key: '1', w: 1, h: 1, hp: 40,  rot: true,  cost: { ironPlate: 1 },
               desc: 'Vervoert spullen in de pijlrichting. Sleep om een lijn te leggen.' },
  drill:     { n: 'Boor',          key: '2', w: 2, h: 2, hp: 160, rot: true,  cost: { ironPlate: 8, gear: 3, brick: 2 },
               desc: 'Op erts zetten. Geeft erts af aan de kant van de pijl.' },
  furnace:   { n: 'Oven',          key: '3', w: 2, h: 2, hp: 160, rot: true,  cost: { brick: 6 },
               desc: 'Erts + steenkool → platen. Steen → baksteen.' },
  assembler: { n: 'Assembleur',    key: '4', w: 2, h: 2, hp: 160, rot: true,  cost: { ironPlate: 8, gear: 4, copperPlate: 4 },
               desc: 'Maakt munitie of tandwielen. Klik erop om het recept te kiezen.' },
  turret:    { n: 'Geschutstoren', key: '5', w: 2, h: 2, hp: 320, rot: false, cost: { ironPlate: 10, gear: 6, copperPlate: 6 },
               desc: 'Schiet op alles binnen 8 tegels. Voer munitie aan met een band.' },
  wall:      { n: 'Muur',          key: '6', w: 1, h: 1, hp: 380, rot: false, cost: { brick: 2 },
               desc: 'Houdt aanvallers op. Sleep om een rij te bouwen.' },
  outpost:   { n: 'Voorpost',      key: '7', w: 2, h: 2, hp: 450, rot: false, cost: { ironPlate: 15, brick: 12, copperPlate: 6 },
               desc: 'Vergroot je bouwgebied met straal 10. Trekt aanvallen aan!' },
  core:      { n: 'Kern',          w: 3, h: 3, hp: 2500, rot: false, cost: {} },
};
const BUILD_ORDER = ['belt', 'drill', 'furnace', 'assembler', 'turret', 'wall', 'outpost'];
const BUILD_RANGE = { core: 14, outpost: 10 };

const MAG = 10;                                           // schoten per munitie
const TURRET = { range: 8, rate: 0.22, dmg: 7 };
const CORE_GUN = { range: 6, rate: 0.45, dmg: 6 };

const ENEMY = {
  crawler: { n: 'Kruiper',      hp: 28,   speed: 1.6, dmg: 5,  rate: 0.8, r: 0.28, armor: 0, col: '#6a6b3a', dark: '#3c3d20', glow: '#c7e46a' },
  beetle:  { n: 'Pantserkever', hp: 170,  speed: 0.9, dmg: 16, rate: 1.1, r: 0.42, armor: 3, col: '#4d5236', dark: '#2a2d1c', glow: '#e0a040' },
  mother:  { n: 'Broedmoeder',  hp: 1400, speed: 0.6, dmg: 60, rate: 1.4, r: 0.8,  armor: 5, col: '#5e3d52', dark: '#33202c', glow: '#e07ad0' },
};
const NEST_HP = 2500;
const WAVE = { first: 240, every: 150 };

const START_STOCK = { ironOre: 0, copperOre: 0, coal: 8, stone: 0, ironPlate: 50, copperPlate: 20, brick: 24, gear: 10, ammo: 12 };

const GOALS = [
  ['mine',    'Delf erts met de hand (klik + vasthouden)'],
  ['drill',   'Bouw een boor op erts [2]'],
  ['smelt',   'Smelt erts in een oven (met steenkool) [3]'],
  ['turret',  'Bouw een geschutstoren [5]'],
  ['ammo',    'Laat een assembleur munitie maken [4]'],
  ['feed',    'Voer munitie via een band naar een toren'],
  ['outpost', 'Bouw een voorpost richting een nest [7]'],
  ['nest',    'Vernietig een nest'],
];

// Kleurtokens van de stijl (later te wisselen voor stijlvarianten).
const PAL = {
  metalT: '#5d5f5c', metalF: '#3a3c3a', steelT: '#757a7b', steelF: '#474b4d',
  brickT: '#7b6556', brickF: '#4f3f35', concT: '#8a8579', concF: '#5c584f',
  accent: '#e58b2a', hazard: '#c9a227',
};
