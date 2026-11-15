# 116_factory-wars_mini-wiki

## Doel
- Eigen fabrieks-/automatiseringsgame, RTS-stijl, top-down.
- Loop: handwerk → eerste automatisering (mijn, oven, band) → logistiek (banden, sorteerders, pijpen, treinen) → stroom/chemie → uitbreiden.
- Druk: vervuiling maakt inheemse fauna agressief → muren, torens, munitie automatiseren.
- Eigen genre-game: geen namen/art/eenheden/recepten van bestaande games overnemen.

## Stack
- Vanilla JS + Canvas 2D, geen build. Klassieke `<script>`-tags (geen modules → werkt via file://). Gedeelde globals tussen bestanden.
- Sprites in code getekend (route B), gecachet op 2× resolutie. Geluid gesynthetiseerd (Web Audio).

## Waar staat wat
- Alle getallen/balans (kosten, recepten, vijanden, golven, doelen, kleuren `PAL`) → `src/data.js`
- Kaart → `src/map.js` genMap (ground 3 = rots, was water; 128×88)
- Stijl 4A → `src/theme.js`: palet `S4`, `BUGPAL` (per vijand), `ORE4` (per erts), `MAPCOL`; sprites `DS`/`DSH` → dSprite/mipSprite/shMask; beltD/beltCurveD/gunD/chuteD/bugD/nestD; terrein in stukken van 16×16: rockF/terH/buildChunk/getChunk, oreChanged (stuk opnieuw), terrainDecal, drawZmap (1 px/tegel, minikaart + kaartmodus)
- Speelfiguur → `src/figure.js`: FIG_DEFS (mix/stofjas/duiker + standaardkleuren), FIGSET (localStorage `fw_fig`), stepPlayer/hurtPlayer/respawn, drawMix/drawStofjas/drawDuiker, drawTrail/figShadow/figToken/mineFx, paneel initFigPanel/toggleFigPanel
- Regels → `src/sim.js`: place/canPlace/removeB, banden updBelts (max 2 items/tegel, p 0..1), machines updDrill/updFurnace/updAsm, uitvoer emit (voorkant = rot), geschut gun, vijanden updEnemies + computeFlow (Dijkstra vanaf álle gebouwtegels → vijanden gaan naar dichtstbijzijnde gebouw), golven startWave, handwerk updHand/updMine
- Tekenen → `src/render.js` draw(): terrein → banden → schaduwlaag (alles zwart, 1× inkleuren) → nesten → gebouwen (drawBuilding) → kruipers → figuur → deeltjes → rook → kaartlaag (mapF) → ringen/spookbeeld → zon. Zoom: ≥55% alles, ≥30% minder detail, <42% inktrand, 30→20% kaart + stromen. drawMini, buildIcon
- HUD → `src/ui.js` updUI/infoHTML (pointerdown + data-act); invoer + lus → `src/main.js`; geluid → `src/audio.js`; stijl → `src/style.css`

## Status
- v0.1 (2026-11-14): modus Vesting speelbaar opgezet. Run-modus = knop "komt nog".
- 2026-11-15: stijl 4A + speelfiguur + kaartzoom overgezet uit `design/index.html`, ongetest.

## Beslissingen
- Focus verdedigen + automatiseren, geen megafabriek. Hoofdmodus = belegerde vesting + voorposten uitbreiden (RTS); roguelite-runs later als extra modus.
- Stijl: rauw industrieel top-down (gedempte aardtinten, oranje accent), route B = Canvas-sprites (licht, geen 3D).
- Bouwen alleen binnen bereik van kern (14) / voorpost (10). Winnen = alle nesten weg; verliezen = kern weg.
- Vervuiling (machines) → grotere golven. Afbreken geeft alles terug.
- Stijlkeuze (design/index.html): Wereld 4A Middagzon (zonder hittetrilling), Interface 0 Huidig (style.css), Figuur = mix Stofjas + Duiker ("Stofduiker"), wisselbaar met beide + 4 eigen kleuren (paneel F), Ver uitzoomen D kaart + stromen (stippen = echte spullen op banden).
- Figuur: WASD lopen, camera volgt (slepen = los, spatie = terug), P = pauze. Bouwen binnen 8 tegels van figuur/kern/voorpost; delven max 3 tegels. Kruipers bijten de figuur als hij binnen 1,6 tegel komt; uitgeschakeld → 5 s → terug bij de kern.
- Kaart 128×88 (was 96×64) zodat ver uitzoomen zin heeft; nesten liggen daardoor verder weg.

## Valkuilen
- `terrainD` per pixel op de hele kaart is te zwaar → terrein in stukken op 1/4 resolutie, lui gebouwd (zichtbaar eerst, dan 1 per beeld).
- 8× inktmasker per gebouw voor omlijning = te traag; rechthoek/cirkel in inkt eronder is genoeg.
- make_shots toont alleen het startmenu (geen PREP die op Vesting klikt).

## Volgende stappen
- Gebruiker speelt de 4A-versie → bugs/balans (laadtijd terrein, figuur in de weg?, kaart groter = trager tempo?).
- Ideeën: splitser/sorteerder, ondergrondse band, stroom (stoom), lasertoren/vlammenwerper, opslaan, run-modus, stijlvarianten via `PAL`.
- Data-lake kandidaten: grid-pathfinding-regions, swarm-sim-core, webgl-mass-units-renderer, worker-module-blob, pixel-island-terrain, pixel-iso-sprite-engine, forge-ambience, positional-synth-sfx, particle-fx-soa. Zie ook buurprojecten 89_Golem-rts, 89b_Golem-swarm.
