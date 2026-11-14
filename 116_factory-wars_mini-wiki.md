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
- Kaart + terrein + ertsklompjes → `src/map.js` genMap / renderTerrain / drawOre
- Regels → `src/sim.js`: place/canPlace/removeB, banden updBelts (max 2 items/tegel, p 0..1), machines updDrill/updFurnace/updAsm, uitvoer emit (voorkant = rot), geschut gun, vijanden updEnemies + computeFlow (Dijkstra vanaf álle gebouwtegels → vijanden gaan naar dichtstbijzijnde gebouw), golven startWave, handwerk updHand/updMine
- Tekenen → `src/render.js`: SPRITE_FN (per gebouw), drawBuilding (bewegende delen), drawEnemy, drawNest, draw, drawMini, iconen
- HUD → `src/ui.js` updUI/infoHTML (pointerdown + data-act); invoer + lus → `src/main.js`; geluid → `src/audio.js`; stijl → `src/style.css`

## Status
- v0.1 (2026-11-14): modus Vesting speelbaar opgezet, ongetest. Run-modus = knop "komt nog".

## Beslissingen
- Focus verdedigen + automatiseren, geen megafabriek. Hoofdmodus = belegerde vesting + voorposten uitbreiden (RTS); roguelite-runs later als extra modus.
- Stijl: rauw industrieel top-down (gedempte aardtinten, oranje accent), route B = Canvas-sprites (licht, geen 3D).
- Bouwen alleen binnen bereik van kern (14) / voorpost (10). Winnen = alle nesten weg; verliezen = kern weg.
- Vervuiling (machines) → grotere golven. Afbreken geeft alles terug.

## Valkuilen
- (nog geen)

## Volgende stappen
- Gebruiker speelt v0.1 → balans/bugs.
- Ideeën: splitser/sorteerder, ondergrondse band, stroom (stoom), lasertoren/vlammenwerper, opslaan, run-modus, stijlvarianten via `PAL`.
- Data-lake kandidaten: grid-pathfinding-regions, swarm-sim-core, webgl-mass-units-renderer, worker-module-blob, pixel-island-terrain, pixel-iso-sprite-engine, forge-ambience, positional-synth-sfx, particle-fx-soa. Zie ook buurprojecten 89_Golem-rts, 89b_Golem-swarm.
