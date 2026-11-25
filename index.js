// Casse-briques : ton appli d'origine (HTML et code inchangés), livrée en plugin.
// Ses données sont dans le dossier du plugin, que NeoDex sauvegarde (synchro cloud et sauvegardes) ; à la première ouverture elle reprend ce que tu avais dans NeoDex.
// Elle tourne dans le bac à sable de NeoDex, avec ses outils d'interface (ctx.host) et seulement les autorisations de son plugin.json.
const HTML = "<div class=\"appWrap\">\n      <div class=\"agHead\"><span class=\"label\">Casse-briques</span><span class=\"hint\" id=\"bkInfo\"></span><div class=\"agNav\"><select class=\"f gSel\" id=\"bkLevel\" title=\"Niveau de départ\"></select></div></div>\n      <div class=\"gameBox g43\"><canvas id=\"bkCanvas\" width=\"320\" height=\"240\"></canvas></div>\n      <div class=\"row\" style=\"justify-content:center;margin-top:8px\"><button class=\"btn px\" id=\"bkSnd\">SON : TOUT</button><button class=\"btn px\" id=\"bkFs\">PLEIN ÉCRAN</button></div>\n      <div class=\"hint\">Souris ou flèches : raquette · clic ou espace : lancer la balle (et tirer avec les lasers) · P ou Échap : pause · écran titre, ← → : niveau de départ. Manette : croix ou stick pour la raquette, A pour lancer (maintenu : lasers), Start pour la pause. Capsules : E large, M multi-balle, L lasers, S lente, C colle, F feu, V vie, R courte (piège). Bouge la raquette au moment du rebond : la balle prend de l'effet et sa course se courbe. Briques bleues fléchées : elles glissent ; briques vertes : elles repoussent si tu tardes. Tous les 10 niveaux, un boss.</div>\n    </div>";
/*CSS-MOVED*/ const CSS = `.gameBox{display:grid;place-items:center;padding:10px;background:#05010b;box-shadow:0 0 0 3px var(--line2)}
.gameBox canvas{width:min(100%,1152px);aspect-ratio:384/144;image-rendering:pixelated;cursor:var(--cp,pointer)}
.gameBox.tall canvas{width:auto;height:min(720px,72vh);aspect-ratio:240/320}
.gSel{width:auto;font-size:14px;padding:6px 10px;margin-right:8px}
.gameBox.g43 canvas{aspect-ratio:320/240;width:min(100%,max(320px,calc((100vh - 280px) * 4 / 3)))}
.gameBox:fullscreen{padding:0;display:grid;place-items:center;background:#05010b}
.gameBox.g43:fullscreen canvas{width:min(100vw,calc(100vh * 4 / 3))}
`;  // le style de ce plugin (il utilise les variables du thème de NeoDex)
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const host = ctx.host, { el, toast, sfx, ask, newTab, pixIcon, PIX, WX } = host;
  const folder = ctx.folder, legacy = ctx.legacy || {};
  ctx.host.addStyle(CSS);
  view.innerHTML = HTML;
  const $ = id => id === "breakoutApp" ? view : (view.querySelector('#' + id) || document.getElementById(id));  // les identifiants de ta vue d'abord, puis ceux de la page (fenêtres, menus)
  const doc = async n => { try { return await folder.read(n); } catch { return null; } };
  const __icon = () => ctx.icon;  // l'icône de ce plugin
  const LEGACY_GAMES = {"top":[],"best":"^breakout"};
  let games = await doc('games');
  if (games == null) {  // première ouverture : tu retrouves tes records et tes parties d'avant
    const old = legacy.api ? await legacy.api('games').catch(() => null) : null; games = { best: {} };
    if (old) { const re = new RegExp(LEGACY_GAMES.best); for (const [k, v] of Object.entries(old.best || {})) if (re.test(k)) games.best[k] = v; for (const k of LEGACY_GAMES.top) if (old[k] !== undefined) games[k] = old[k]; await folder.write('games', games); }
  }
  games = { best: {}, ...games };
  let gamesTimer = null;
  const saveGames = () => { clearTimeout(gamesTimer); gamesTimer = setTimeout(() => { gamesTimer = null; folder.write('games', games).catch(() => {}); }, 500); };
  const best = (k, v, higher = true) => { const b = games.best[k]; if (b == null || (higher ? v > b : v < b)) { games.best[k] = v; saveGames(); return true; } return false; };
  const gstore = (k, init) => (games[k] ??= init);  // la section d'un jeu
  // les trophées de NeoDex (3.4.8 et plus) : succès et records déclarés dans plugin.json ; sur un NeoDex plus ancien, rien ne se passe
  const trophy = id => { ctx.games?.unlock(id).catch(() => {}); };
  const trophyRecord = (id, v) => { if (v != null && Number.isFinite(+v)) ctx.games?.record(id, +v).catch(() => {}); };
function gameLoop(st, appKey, update, draw) {
  cancelAnimationFrame(st.raf);
  const STEP = 1000 / 60; let acc = 0, last = performance.now();
  const frame = t => {
    if (!view.classList.contains('on')) { st.raf = 0; if (st.mode === 'play') st.mode = 'pause'; return; }  // leaving the tab pauses the game
    st.raf = requestAnimationFrame(frame);
    acc += Math.min(200, t - last); last = t;
    while (acc >= STEP) { if (st.mode === 'play') update(); st.tick++; acc -= STEP; }
    draw();
  };
  st.raf = requestAnimationFrame(frame);
}
function gameText(g, w, lines, y0) {  // centred pixel-font lines over a dark band
  g.fillStyle = 'rgba(11,3,28,.72)'; g.fillRect(0, y0 - 14, w, lines.length * 14 + 14);
  g.textAlign = 'center';
  lines.forEach(([text, color, size], i) => { g.fillStyle = color; g.font = (size || 8) + 'px "Press Start 2P", monospace'; g.fillText(text, w / 2, y0 + i * 14); });
  g.textAlign = 'left';
}
const px = (g, color, x, y, w = 1, h = 1) => { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), w, h); };
function sprite(g, rows, x, y, pal) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = pal[r[i]]; if (c) px(g, c, x + i, y + j); } }); }
  // ---- ton code d'origine ----
const seeded = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pxFont = (g, text, x, y, color, size = 8, align = 'left') => { g.font = size + 'px "Press Start 2P", monospace'; g.textAlign = align; g.fillStyle = '#05010b'; g.fillText(text, x + 1, y + 1); g.fillStyle = color; g.fillText(text, x, y); g.textAlign = 'left'; };

/* ---------- Casse-briques: 12 designed levels then generated ones, bricks with 1 to 3 hits, metal, explosive and bonus bricks, 8 capsules ---------- */
const BK = {W: 320, H: 240, BW: 22, BH: 8, X0: 5, Y0: 26, PY: 224,
  LEVELS: [
    ['.............', '1111111111111', '1111111111111', '2222222222222', '1111111111111'],
    ['......3......', '.....222.....', '....11111....', '...2222*22...', '..111111111..', '.22222222222.'],
    ['1.2.1.2.1.2.1', '.2.1.2.1.2.1.', '1.2.1*2.1.2.1', '.2.1.2.1.2.1.', '1.2.1.2.1.2.1'],
    ['3333333333333', '3#.........#3', '3#.*11111*.#3', '3#.1x222x1.#3', '3#.1122211.#3', '3#.........#3', '3###.....###3'],
    ['....33333....', '..331111133..', '.31111*11113.', '#1111x1x1111#', '.31111111113.', '..331111133..', '....33333....'],
    ['1............', '21...........', '321..........', '#321.........', '.#321...x....', '..#321.......', '...#321......', '....#3211111*'],
    ['3333333333333', '...mmmmmmm...', '#22222222222#', '..rrr...rrr..', 'x11111*11111x', '....mmmmm....', '3333333333333'],
    ['..333...333..', '.32223.32223.', '3221123211223', '3211111111123', '.32111x11123.', '..321111123..', '...3211123...', '....32123....', '.....323.....', '......3......'],
    ['#############', '1....1#1....1', '1.##.1#1.##.1', '1.#*.1x1.*#.1', '1.#..222..#.1', '1.#.......#.1', '111###.###111'],
    ['x2x2x2x2x2x2x', '2x2x2x2x2x2x2', '.............', '3333333333333', '33333*3333333'],
    ['3.3.3.3.3.3.3', '2.2.2.2.2.2.2', '2.2.2.*.2.2.2', '1.1.1.1.1.1.1', '#.#.#.#.#.#.#', '1.1.1.1.1.1.1'],
    ['3333333333333', '3###########3', '3#222222222#3', '3#2x22*22x2#3', '3#222222222#3', '3#####.#####3', '3333333333333'],
    ['..1.......1..', '...1.....1...', '..222222222..', '.22.22222.22.', '2222222222222', '2.222222222.2', '2.2.......2.2', '...33...33...'],
    ['....33333....', '..331111133..', '.31133333113.', '3111111111113', '3333*333*3333', '....22222....', '....2x2x2....', '....22222....'],
    ['......3......', '.....333.....', '.....2*2.....', '....22222....', '....2.x.2....', '....22222....', '...#22222#...', '..##.1.1.##..', '......1......'],
    ['3.3.3.3.3.3.3', '.2.2.2.2.2.2.', '3.3.3x3.3.3.3', '.2.2.2.2.2.2.', '3.3.3.3.3x3.3', '.2.2.2*2.2.2.', '3.3.3.3.3.3.3'],
    ['...3333333...', '..333333333..', '.33..333..33.', '.33..3x3..33.', '..333333333..', '...3.3.3.3...', '...3333333...', '....#...#....'],
    ['......3......', '.....323.....', '....32123....', '...321*123...', '..321x1x123..', '...3211123...', '....32123....', '.....323.....', '......3......'],
    ['1.....1.....1', '.1...1.1...1.', '..1.1...1.1..', '...2.....2...', '2.....2.....2', '.2...2x2...2.', '..2.2...2.2..', '...3.....3...'],
    ['#.#.#.#.#.#.#', '2222222222222', '#.#.#*#.#.#.#', '3333333333333', '#.#.#.#.#.#.#', '2222x2222x222', '#.#.#.#.#.#.#'],
    ['.3.........3.', '.33.......33.', '.3333333333..', '.33.333.333..', '.33333x33333.', '..3.33333.3..', '...3333333...', '....2...2....'],
    ['3333333333333', '.33333333333.', '..222222222..', '...2*222*2...', '....11111....', '.....1x1.....', '....11111....', '...2222222...', '..333333333..', '3333333333333'],
    ['....22222....', '..222222222..', '.22..222..22.', '.22..2x2..22.', '.22222222222.', '.22222*22222.', '.22.222.2.22.', '.2...2...2.2.'],
    ['..333333333..', '.33222222233.', '332211111223.', '3221.....1223', '321.......123', '32.........23', '3*.........*3'],
    ['3333333333333', '............3', '.22222222..x3', '.2......2..23', '.2.1111.2..23', '.2.1*.1.2..23', '.2.1..1.2..23', '.2....1....23', '.2222222222.3'],
    ['..33.....33..', '..33.....33..', '..22..#..22..', '..2*..#..*2..', '..22..#..22..', '..22..x..22..', '..11.mmm.11..', '#####...#####'],
    ['......3......', '.....333.....', '3333322233333', '.33322*22333.', '..332222233..', '..3322x2233..', '.333.....333.', '33.........33'],
    ['...3333333...', '...3.*.*.3...', '...3333333...', '.....222.....', '.22222222222.', '.2.2222222.2.', '.2.22x2x22.2.', '...22...22...', '...33...33...'],
    ['3.....3.....3', '33...333...33', '333.33333.333', '3333333333333', '3x33*333*33x3', '2222222222222', '1111111111111'],
    ['..111...111..', '.1...1.1...1.', '.1.x.1.1.*.1.', '..111...111..', '.....222.....', '....2...2....', '....2.x.2....', '.....222.....'],
    ['#############', '#3333333333.#', '#3.........3#', '#3.22222.2.3#', '#3.2*x*2.2.3#', '#3.22222.2.3#', '#3.......2.3#', '#33333333.33#', '####.....####'],
    ['3...3...3...3', '.2...2...2...', '..x...x...x..', '...2...2...2.', '3...3...3...3', '.2...*...2...', '..1...1...1..', '...1...1...1.'],
    ['..333333333..', '.32222222223.', '3211111111123', '3211.....1123', '3211..x..1123', '3211.....1123', '3211111111123', '.32222222223.', '..333333333..'],
    ['#############', '3...#.....#.3', '3.#.#.###.#.3', '3.#...#*#...3', '3.#####.###.3', '3.....x.....3', '###.#####.###', '..2.......2..'],
    ['......33.....', '.....3333....', '....33*33..3.', '...333333.33.', '..3333.33333.', '.33x3...333..', '.33.3...33...', '..2..2..2.2..', '.2..2..2...2.'],
    ['x3x3x3x3x3x3x', '3333333333333', '2222222222222', '3333333333333', '2222*222*2222', '3333333333333', '#.#.#.#.#.#.#'],
    ['....33333....', '..33.....33..', '.3..22222..3.', '3..2.....2..3', '3.2..1x1..2.3', '3..2..*..2..3', '.3..22222..3.', '..33.....33..', '....33333....'],
    ['3#3#3#3#3#3#3', '3333333333333', '#22222222222#', '#2##2x2##222#', '#22222222222#', '#22##2*2##22#', '#22222222222#', '#####...#####'],
    ['1.1.1.1.1.1.1', '2222222222222', '3x3x3x3x3x3x3', '3333333333333', '#3333*3333*3#', '3333333333333', '2222222222222', '##..##.##..##'],
    ['3333333333333', '3###########3', '3#333333333#3', '3#3#######3#3', '3#3#x*x*x#3#3', '3#3#######3#3', '3#333333333#3', '3#####.#####3', '3333333333333'],
  ],
  NAMES: ['Premier contact', 'Pyramide', 'Damier', 'Forteresse', 'Planète', 'Escalier', 'Bandes', 'Cœur', 'Labyrinthe', 'Mèches courtes', 'Colonnes', 'Bastion',
    'Envahisseur', 'Champignon', 'Fusée', 'Damier fou', 'Crâne', 'Diamant', 'Vagues', 'Grille', 'Chat', 'Sablier', 'Fantôme', 'Arc-en-ciel', 'Spirale', 'Tours jumelles', 'Étoile', 'Robot', 'Couronne', 'Bulles', 'Pont-levis', 'Pluie de météores', 'Cible', 'Labyrinthe II', 'Dragon', 'Mur de feu', 'Galaxie', 'Forteresse II', 'Invasion finale', 'Cœur de l\'étoile'],
  DROPS: [['E', 18, '#7fe0ee', 'Raquette large'], ['M', 15, '#ff5ad9', 'Multi-balle'], ['L', 12, '#ff4f6d', 'Lasers'], ['S', 14, '#8ee8a0', 'Balle lente'], ['C', 11, '#ffd07a', 'Colle'], ['F', 8, '#ff9a3c', 'Boule de feu'], ['V', 5, '#ffffff', 'Vie en plus'], ['R', 10, '#8f7bb8', 'Raquette courte']],
  HP: {1: ['#7fe0ee', '#1f8098'], 2: ['#b46aee', '#4a2296'], 3: ['#ff5ad9', '#8a1a7a']},
};
let bk = null;
const bks = gstore('breakout', {snd: 0});  // le réglage du son : 0 tout, 1 effets seulement, 2 coupé
// ---- les sons et la petite musique, faits sur place (Web Audio)
let bkAc = null;
const bkAudio = () => { try { bkAc ??= new AudioContext(); if (bkAc.state === 'suspended') bkAc.resume(); return bkAc; } catch { return null; } };
function bkTone(f, d, {type = 'square', vol = .05, slide = 0, at = 0} = {}) {
  if (!bk || bk.mode === 'check' || (bks.snd || 0) === 2) return; const ac = bkAudio(); if (!ac) return;
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + .02);
}
function bkNoise(d, vol) {
  if (!bk || bk.mode === 'check' || (bks.snd || 0) === 2) return; const ac = bkAudio(); if (!ac) return;
  const n = Math.ceil(ac.sampleRate * d), buf = ac.createBuffer(1, n, ac.sampleRate), data = buf.getChannelData(0); for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const src = ac.createBufferSource(), g = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200; g.gain.value = vol; src.buffer = buf; src.connect(lp).connect(g).connect(ac.destination); src.start();
}
const bkSemi = (f, s) => f * 2 ** (s / 12);
const BK_SFX = {
  paddle: rel => bkTone(bkSemi(330, Math.round(rel * 5)), .06, {vol: .05, slide: bkSemi(440, Math.round(rel * 5))}),
  wall: () => bkTone(180, .03, {type: 'triangle', vol: .04}),
  hit: hp => bkTone(bkSemi(520, hp * 3), .05, {vol: .035}),
  brk: row => { bkTone(bkSemi(660, 9 - Math.min(9, row)), .08, {vol: .04, slide: bkSemi(880, 9 - Math.min(9, row))}); bkNoise(.05, .04); },
  metal: () => { bkTone(1760, .09, {type: 'triangle', vol: .04}); bkTone(2349, .07, {type: 'triangle', vol: .02}); },
  boom: () => { bkNoise(.45, .2); bkTone(110, .35, {type: 'sawtooth', vol: .06, slide: 35}); },
  get: bad => (bad ? [0, -3, -6] : [0, 4, 7, 12]).forEach((s, i) => bkTone(bkSemi(bad ? 392 : 523, s), .09, {at: i * .05, vol: .045})),
  zap: () => bkTone(1400, .08, {type: 'sawtooth', vol: .02, slide: 500}),
  lose: () => [0, -2, -5, -9].forEach((s, i) => bkTone(bkSemi(392, s), .16, {type: 'triangle', at: i * .12, vol: .07})),
  over: () => [0, -3, -7, -12].forEach((s, i) => bkTone(bkSemi(330, s), .3, {type: 'triangle', at: i * .2, vol: .07})),
  win: () => [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => bkTone(bkSemi(523, s), .13, {at: i * .09, vol: .045})),
};
// la musique : 32 croches entraînantes en do (do, la mineur, fa, sol) ; elle accélère un peu avec le niveau et ne joue que pendant la partie
const BK_MEL = [12, null, 16, 19, 24, null, 19, 16, 12, null, 16, 21, 24, null, 21, null, 17, null, 21, 24, 29, null, 24, 21, 19, null, 23, 26, 24, null, null, null];
const BK_BASS = [-12, -24, -15, -27, -19, -31, -17, -29];
const bkMus = {step: 0, at: 0};
function bkMusic() {  // appelée à chaque image : prépare les notes du quart de seconde qui vient
  if (!bk || bk.mode !== 'play' || bk.clear || (bks.snd || 0) !== 0 || !bkAc) { bkMus.at = 0; return; }
  const ac = bkAc, eighth = 30 / Math.min(160, 120 + bk.level * 2);
  if (bkMus.at < ac.currentTime) bkMus.at = ac.currentTime + .05;
  while (bkMus.at < ac.currentTime + .25) {
    const i = bkMus.step++ % 32, m = BK_MEL[i], at = bkMus.at - ac.currentTime;
    if (m != null) bkTone(bkSemi(262, m), eighth * 1.4, {vol: .012, at});
    if (i % 2 === 0) bkTone(bkSemi(262, BK_BASS[(i >> 3) * 2 + (i % 4 ? 1 : 0)]), eighth * 1.6, {type: 'triangle', vol: .05, at});
    bkMus.at += eighth;
  }
}
// les couleurs d'une brique : lumière, face, ombre
const BK_PAL = {1: ['#c8f6ff', '#7fe0ee', '#1f8098'], 2: ['#e4c8ff', '#b46aee', '#4a2296'], 3: ['#ffc0f0', '#ff5ad9', '#8a1a7a'], '#': ['#f4f0ff', '#c9bdf0', '#5e4d85'], x: ['#ffd0a0', '#ff9a3c', '#8a3c10'], '*': ['#fff0c8', '#ffd07a', '#b8641c'], m: ['#d0e0ff', '#5a8aff', '#1f3a8a'], r: ['#d0ffd8', '#5ee07a', '#1a7a34']};
const bkPal = k => BK_PAL['#x*mr'.includes(k.type) ? k.type : Math.min(3, Math.max(1, k.hp))];  // une brique cassée d'un coup (feu, explosion) garde sa couleur
function bkBrick(g, k, t) {  // une brique en léger relief : contour sombre, lumière en haut à gauche, ombre en bas à droite, et sa marque
  const [L, F, D] = bkPal(k), {x, y} = k, W = BK.BW, H = BK.BH, fl = k.flash > 0;
  px(g, '#05010b', x, y, W, H); px(g, fl ? '#ffffff' : D, x + 1, y + 1, W - 2, H - 2); px(g, fl ? '#ffffff' : F, x + 1, y + 1, W - 3, H - 3);
  px(g, fl ? '#ffffff' : L, x + 1, y + 1, W - 3, 1); px(g, fl ? '#ffffff' : L, x + 1, y + 1, 1, H - 3);
  if (fl) return;
  if (k.type === '#') { for (const [a, b] of [[3, 2], [W - 5, 2], [3, H - 4], [W - 5, H - 4]]) { px(g, D, x + a, y + b, 2, 2); px(g, L, x + a, y + b, 1, 1); } px(g, L, x + 9, y + 2, 1, 1); px(g, L, x + 10, y + 3, 1, 1); px(g, L, x + 11, y + 4, 1, 1); return; }
  if (k.type === 'x') { px(g, '#3e0f4a', x + 7, y + 2, 8, 4); px(g, '#ff4f6d', x + 8, y + 3, 6, 2); px(g, '#3e0f4a', x + 14, y + 1, 2, 1); px(g, t % 16 < 8 ? '#fff6b0' : '#ffd07a', x + 16, y, 1, 1); return; }
  if (k.type === '*') { const c = (t + x) % 60 < 8 ? '#ffffff' : L; px(g, c, x + 10, y + 1, 2, 5); px(g, c, x + 8, y + 3, 6, 1); px(g, c, x + 9, y + 2, 4, 3); return; }
  if (k.type === 'm') { for (const [a, s] of [[4, 1], [W - 6, -1]]) { px(g, L, x + a + (s < 0 ? 1 : 0), y + 2, 1, 3); px(g, L, x + a + (s < 0 ? 0 : 1), y + 3, 1, 1); } px(g, D, x + 8, y + 3, 6, 1); return; }
  if (k.type === 'r') { px(g, D, x + 10, y + 3, 1, 3); px(g, L, x + 8, y + 2, 2, 1); px(g, L, x + 11, y + 2, 2, 1); px(g, L, x + 7, y + 1, 1, 1); px(g, L, x + 13, y + 1, 1, 1); return; }
  if (k.max >= 2) px(g, D, x + 4, y + 4, W - 8, 1);  // une rainure : brique solide
  if (k.max >= 3) { px(g, D, x + 3, y + 2, 1, 1); px(g, D, x + W - 5, y + 2, 1, 1); }
  for (let c = 0; c < k.max - k.hp; c++) { const cx = x + 6 + c * 9; px(g, '#05010b', cx, y + 1, 1, 2); px(g, '#05010b', cx + 1, y + 3, 1, 2); px(g, '#05010b', cx, y + 5, 1, 2); px(g, D, cx + 2, y + 4, 1, 1); }  // les fissures
}
function bkShards(k, n = 8) {  // la brique qui casse part en éclats de ses trois couleurs, plus un peu de poussière
  const P = bkPal(k);
  for (let i = 0; i < n; i++) bk.parts.push({x: k.x + 2 + Math.random() * (BK.BW - 4), y: k.y + 1 + Math.random() * (BK.BH - 3), vx: (Math.random() - .5) * 2.6, vy: -Math.random() * 1.8 - .3, life: 28 + Math.random() * 20, color: P[i % 3], w: 2 + (i % 2), h: 2, edge: true});
  for (let i = 0; i < 5; i++) bk.parts.push({x: k.x + Math.random() * BK.BW, y: k.y + BK.BH / 2, vx: (Math.random() - .5) * 1.2, vy: -Math.random() * .8, life: 14 + Math.random() * 10, color: '#d9c6ff', w: 1, h: 1});
}
const BK_BOSS = [
  {name: 'Le Gardien', body: ['#c8f6ff', '#7fe0ee', '#1f8098'], hp: 24, sp: .6, fire: 110, shield: 'r'},
  {name: 'La Méduse', body: ['#ffc0f0', '#ff5ad9', '#8a1a7a'], hp: 32, sp: .9, fire: 85, shield: 'm'},
  {name: 'Le Forgeron', body: ['#ffd0a0', '#ff9a3c', '#8a3c10'], hp: 40, sp: .7, fire: 70, shield: '#'},
];
function bkBoss() {  // après chaque niveau 10, 20, 30… : un boss au-dessus d'une rangée de briques qui le protège
  const tier = Math.max(1, Math.round(bk.level / 10)), d = BK_BOSS[(tier - 1) % 3], hp = Math.round(d.hp * (1 + .5 * Math.floor((tier - 1) / 3)));
  bkLoad(); bk.bricks = []; bk.rows = {};
  bk.boss = {d, x: BK.W / 2, y: 40, w: 76, h: 30, hp, max: hp, vx: d.sp, t: 1, flash: 0};
  const Y = BK.Y0 + 7 * (BK.BH + 2);
  for (let c = 1; c < 12; c++) if (d.shield !== '#' || c % 3 === 0) bk.bricks.push({x: BK.X0 + c * (BK.BW + 2), y: Y, type: d.shield, hp: d.shield === '#' ? Infinity : 1, max: 1, flash: 0});
  if (d.shield === 'm') bk.rows[Y] = .5;
  bk.banner = {text: 'BOSS : ' + d.name.toUpperCase(), sub: 'Niveau ' + bk.level + ' · ' + hp + ' coups', t: 140}; BK_SFX.boom();
}
function bkBossHit(n) {
  const B = bk.boss; B.hp -= n; B.flash = 6; bk.score += 50 * n; bk.lastHit = bk.lt; BK_SFX.metal();
  if (B.hp > 0) return;
  const pts = 2000 * Math.max(1, Math.round(bk.level / 10));
  B.hp = 0; B.dead = true; bk.shots = []; bk.bricks = []; bk.seeds = []; bk.score += pts; bk.shake = 20; bks.bosses = (bks.bosses || 0) + 1; if (bk.mode !== 'check') saveGames();
  for (let i = 0; i < 8; i++) bkBurst(B.x + (Math.random() - .5) * B.w, B.y + Math.random() * B.h, B.d.body[i % 3], 18);
  BK_SFX.boom(); BK_SFX.win(); bk.bossWon = true; bk.clear = 150; bk.banner = {text: B.d.name.toUpperCase() + ' VAINCU', sub: '+' + pts + ' points', t: 150};
}
function bkStep() {  // les rangées qui glissent font demi-tour au mur ou contre une autre brique ; les briques vertes repoussent ; le boss bouge et tire
  for (const y in bk.rows) { const dx = bk.rows[y], m = bk.bricks.filter(k => k.type === 'm' && k.y === +y); if (!m.length) continue;
    const hit = m.some(k => { const nx = k.x + dx; return nx < BK.X0 || nx + BK.BW > BK.W - BK.X0 || bk.bricks.some(o => o.type !== 'm' && Math.abs(o.y - k.y) < BK.BH && nx < o.x + BK.BW + 2 && nx + BK.BW + 2 > o.x); });
    if (hit) bk.rows[y] = -dx; else for (const k of m) k.x += dx; }
  for (const s of bk.seeds) if (--s.t <= 0) { if (bk.bricks.some(o => Math.abs(o.y - s.k.y) < BK.BH && Math.abs(o.x - s.k.x) < BK.BW + 2)) s.t = 30; else { s.k.hp = 1; s.k.flash = 8; bk.bricks.push(s.k); s.done = true; BK_SFX.hit(1); } }
  bk.seeds = bk.seeds.filter(s => !s.done);
  const B = bk.boss; if (!B || B.dead) return;
  const mad = B.hp < B.max / 2; B.t++; if (B.flash > 0) B.flash--;
  B.x += B.vx * (mad ? 1.5 : 1); if (B.x < B.w / 2 + 6 || B.x > BK.W - B.w / 2 - 6) { B.vx = -B.vx; B.x = Math.max(B.w / 2 + 6, Math.min(BK.W - B.w / 2 - 6, B.x)); }
  if (B.d.shield === 'm') B.y = 40 + Math.sin(B.t / 30) * 8;
  if (B.t % Math.round(B.d.fire * (mad ? .7 : 1)) === 0) { bk.shots.push({x: B.x, y: B.y + B.h, vx: (bk.px - B.x) / 160}); BK_SFX.zap(); }
  for (const s of bk.shots) { s.x += s.vx; s.y += 1.5; if (s.y >= BK.PY - 2 && s.y <= BK.PY + 6 && Math.abs(s.x - bk.px) < bkPW() / 2 + 2) { s.dead = true; bk.stun = 50; BK_SFX.get(true); } }
  bk.shots = bk.shots.filter(s => !s.dead && s.y < BK.H + 4);
}
function bkBossDraw(g) {  // un gros bloc vivant à un seul œil, qui suit la balle du regard
  const B = bk.boss; if (!B || B.dead) return; const fl = B.flash > 0, [L, F, D] = fl ? ['#ffffff', '#ffffff', '#ffffff'] : B.d.body, x = Math.round(B.x - B.w / 2), y = Math.round(B.y), w = B.w, h = B.h;
  if (B.d.shield === 'm') for (let i = 0; i < 6; i++) { const tx = x + 8 + i * 12, wv = Math.round(Math.sin(B.t / 8 + i) * 2); px(g, '#05010b', tx - 1, y + h - 2, 5, 10); px(g, F, tx, y + h - 2, 3, 8 + wv); }
  if (B.d.shield === '#') for (const hx of [x + 6, x + w - 12]) { px(g, '#05010b', hx - 1, y - 7, 8, 9); px(g, L, hx, y - 6, 6, 7); px(g, D, hx + 4, y - 6, 2, 7); }
  if (B.d.shield === 'r') { px(g, '#05010b', x + w / 2 - 2, y - 9, 4, 10); px(g, D, x + w / 2 - 1, y - 8, 2, 9); px(g, B.t % 40 < 20 ? '#ff4f6d' : '#ffd07a', x + w / 2 - 2, y - 11, 4, 3); }
  px(g, '#05010b', x + 2, y, w - 4, h); px(g, '#05010b', x, y + 2, w, h - 4);
  px(g, D, x + 1, y + 2, w - 2, h - 4); px(g, D, x + 3, y + 1, w - 6, h - 2); px(g, F, x + 2, y + 2, w - 5, h - 6); px(g, L, x + 4, y + 2, w - 10, 2); px(g, L, x + 2, y + 4, 2, h - 10);
  if (fl) return;
  const b = bk.balls[0], ex = x + w / 2, ey = y + 12, lx = b ? Math.round(Math.max(-4, Math.min(4, (b.x - ex) / 20))) : 0, ly = b ? Math.round(Math.max(-2, Math.min(2, (b.y - ey) / 40))) : 0;
  px(g, '#05010b', ex - 10, ey - 6, 20, 12); px(g, '#ffffff', ex - 9, ey - 5, 18, 10);
  if (B.t % 160 < 7) px(g, D, ex - 9, ey - 5, 18, 10); else { px(g, '#05010b', ex - 3 + lx, ey - 3 + ly, 6, 6); px(g, B.hp < B.max / 2 ? '#ff4f6d' : '#5a8aff', ex - 2 + lx, ey - 2 + ly, 4, 4); px(g, '#ffffff', ex - 2 + lx, ey - 2 + ly, 1, 1); }
  for (let i = 0; i < 6; i++) { px(g, '#05010b', x + 12 + i * 9, y + h - 8, 7, 4); px(g, '#ffffff', x + 13 + i * 9, y + h - 8, 5, 2); }
}
function bkMap(n) {  // designed levels, then symmetric generated ones that get harder
  if (n <= BK.LEVELS.length) return BK.LEVELS[n - 1];
  const r = seeded(n * 7919), rows = 6 + Math.min(4, Math.floor((n - BK.LEVELS.length) / 3)), out = [];
  for (let y = 0; y < rows; y++) {
    let half = '';
    if (y % 3 === 1 && r() < .35) { out.push('...mmmmmmm...'); continue; }  // une rangée qui glisse
    for (let x = 0; x < 7; x++) { const v = r(); half += v < .12 ? '.' : v < .17 + n * .002 ? '#' : v < .22 ? 'x' : v < .25 ? '*' : v < .29 ? 'r' : String(1 + Math.min(2, Math.floor(r() * (1.4 + n / 10)))); }
    out.push(half + [...half.slice(0, 6)].reverse().join(''));
  }
  return out;
}
function bkLoad() {
  bk.bricks = [];
  bk.rows = {}; bk.seeds = []; bk.shots = []; bk.boss = null; bk.stun = 0;
  bkMap(bk.level).forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.') return; const Y = BK.Y0 + y * (BK.BH + 2); bk.bricks.push({x: BK.X0 + x * (BK.BW + 2), y: Y, type: ch, hp: ch === '#' ? Infinity : +ch || 1, max: +ch || 1, flash: 0}); if (ch === 'm') bk.rows[Y] = y % 2 ? -.35 : .35; }));
  bk.balls = [{x: bk.px, y: BK.PY - 3, vx: 0, vy: 0, stuck: 0}];
  bk.drops = []; bk.bolts = []; bk.lt = 0; bk.lastHit = 0; bk.fx = {wide: 0, narrow: 0, laser: 0, slow: 0, glue: 0, fire: 0};
  bk.banner = {text: 'NIVEAU ' + bk.level, sub: BK.NAMES[bk.level - 1] || 'Secteur ' + bk.level, t: 120};
}
// the level picker: every designed level, the ones not reached yet locked (then « ← → » on the title screen still go further)
function bkLevels() {
  const max = Math.max(1, games?.best.breakoutLvl || 1), n = Math.max(BK.LEVELS.length, max);
  $('bkLevel').replaceChildren(...Array.from({length: n}, (_, i) => { const o = el('option', '', (i + 1) + '. ' + (BK.NAMES[i] || 'Secteur ' + (i + 1)) + (i + 1 > max ? ' 🔒' : '')); o.value = i + 1; o.disabled = i + 1 > max; return o; }));
  if (bk) $('bkLevel').value = String(bk.level);
}
function bkStart(level = 1) {
  bk = bk || {raf: 0};
  Object.assign(bk, {g: $('bkCanvas').getContext('2d'), mode: 'ready', tick: 0, level, lives: 3, score: 0, px: BK.W / 2, target: null, keys: {}, parts: [], shake: 0, cool: 0, overAt: 0,
    stars: Array.from({length: 60}, () => [Math.random() * BK.W, Math.random() * BK.H, Math.random()])});
  bkLoad(); bkLevels();
  gameLoop(bk, 'neodex:breakout', bkUpdate, bkDraw);
}
const bkPW = () => bk.fx.wide ? 66 : bk.fx.narrow ? 28 : 44;
const bkSpeed = () => (Math.min(3.9, 2.3 + (bk.level - 1) * .12) + Math.min(.6, bk.lt * .00025)) * (bk.fx.slow ? .7 : 1);
function bkBurst(x, y, color, n = 10) { for (let i = 0; i < n; i++) bk.parts.push({x, y, vx: (Math.random() - .5) * 3, vy: (Math.random() - .8) * 2.5, life: 20 + Math.random() * 20, color}); }
function bkHit(k, power) {
  if (k.type === '#') { k.flash = 6; BK_SFX.metal(); return; }
  k.hp -= power ? 99 : 1; k.flash = 6; bk.score += 10; bk.lastHit = bk.lt;
  if (k.hp > 0) { BK_SFX.hit(k.hp); for (let i = 0; i < 3; i++) bk.parts.push({x: k.x + 4 + Math.random() * (BK.BW - 8), y: k.y + BK.BH, vx: (Math.random() - .5), vy: Math.random() * .5, life: 16, color: bkPal(k)[2], w: 1, h: 1}); return; }
  bk.bricks.splice(bk.bricks.indexOf(k), 1);
  if (k.type === 'r' && (bk.boss || bk.bricks.some(o => o.type !== '#'))) bk.seeds.push({k, t: 420});  // la brique verte repousse, sauf si c'était la dernière
  bk.score += 40 + bk.level * 5;
  bkShards(k); if (k.type === 'x') { bkBurst(k.x + BK.BW / 2, k.y + BK.BH / 2, '#ff9a3c', 22); BK_SFX.boom(); } else BK_SFX.brk((k.y - BK.Y0) / (BK.BH + 2));
  if (k.type === '*' || Math.random() < .11) {
    let r = Math.random() * BK.DROPS.reduce((a, d) => a + d[1], 0); const d = BK.DROPS.find(d => (r -= d[1]) < 0);
    bk.drops.push({x: k.x + BK.BW / 2, y: k.y + BK.BH / 2, type: d[0]});
  }
  if (k.type === 'x') { bk.shake = 8; for (const o of bk.bricks.filter(o => Math.abs(o.x - k.x) <= BK.BW + 2 && Math.abs(o.y - k.y) <= BK.BH + 2)) bkHit(o, true); }  // chain reactions
}
function bkCatch(t) {
  const fx = bk.fx;
  if (t === 'E') { fx.wide = 1200; fx.narrow = 0; } if (t === 'R') { fx.narrow = 720; fx.wide = 0; }
  if (t === 'L') fx.laser = 600; if (t === 'S') fx.slow = 720; if (t === 'C') fx.glue = 900; if (t === 'F') fx.fire = 480;
  if (t === 'V') bk.lives = Math.min(6, bk.lives + 1);
  if (t === 'M') bk.balls = bk.balls.flatMap(b => b.stuck != null ? [b] : [b, ...[-.5, .5].map(a => { const c = Math.cos(a), s = Math.sin(a); return {x: b.x, y: b.y, vx: b.vx * c - b.vy * s, vy: b.vx * s + b.vy * c}; })]).slice(0, 12);
  bk.score += 25;
  bk.tip = {text: BK.DROPS.find(d => d[0] === t)[3], t: 70};
}
function bkLaunch() {
  for (const b of bk.balls) if (b.stuck != null) { const a = (b.stuck / (bkPW() / 2)) * .7 || -.25, sp = bkSpeed(); b.vx = sp * Math.sin(a); b.vy = -sp * Math.cos(a); b.stuck = null; }
  if (bk.fx.laser && bk.cool <= 0) { const w = bkPW(); bk.bolts.push({x: bk.px - w / 2 + 3, y: BK.PY - 2}, {x: bk.px + w / 2 - 3, y: BK.PY - 2}); bk.cool = 18; BK_SFX.zap(); }
}
function bkPress() {  // true when the press started, resumed or restarted the game
  if (!bk) return true;
  if (bk.mode === 'ready' || bk.mode === 'pause') { bk.mode = 'play'; return true; }
  if (bk.mode === 'over') { if (Date.now() - bk.overAt > 700) { bkStart(); bk.mode = 'play'; } return true; }
  bkLaunch(); return false;
}
function bkUpdate() {
  bk.lt++;
  for (const k in bk.fx) if (bk.fx[k] > 0) bk.fx[k]--;
  if (bk.cool > 0) bk.cool--;
  const w = bkPW(), dir = (bk.keys.ArrowRight || bk.keys.d || bk.keys.padR ? 1 : 0) - (bk.keys.ArrowLeft || bk.keys.q || bk.keys.a || bk.keys.padL ? 1 : 0);
  const ppx = bk.px;
  if (bk.stun > 0) bk.stun--; else if (dir) { bk.px += dir * 4.5; bk.target = null; } else if (bk.target != null) bk.px += Math.max(-7, Math.min(7, bk.target - bk.px));
  bk.px = Math.max(w / 2 + 2, Math.min(BK.W - w / 2 - 2, bk.px)); bk.pv = bk.px - ppx;
  if (bk.fx.laser && (bk.keys[' '] || bk.keys.padA) && bk.cool <= 0) bkLaunch();
  if (bk.banner) { bk.banner.t--; if (bk.banner.t <= 0) bk.banner = null; }
  if (bk.tip && --bk.tip.t <= 0) bk.tip = null;
  if (bk.clear) { if (--bk.clear <= 0) { bk.clear = 0; if (bk.level % 10 === 0 && !bk.bossWon) bkBoss(); else { bk.bossWon = false; bk.level++; best('breakoutLvl', bk.level); saveGames(); bkTrophies(); bkLoad(); bkLevels(); } } return; }
  bkStep();
  const sp = bkSpeed();
  for (const b of bk.balls) {
    if (b.stuck != null) { b.x = bk.px + b.stuck; b.y = BK.PY - 3; continue; }
    const cur = Math.hypot(b.vx, b.vy) || 1; b.vx *= sp / cur; b.vy *= sp / cur;
    if (Math.abs(b.vy) < sp * .3) { b.vy = Math.sign(b.vy || -1) * sp * .3; b.vx = Math.sign(b.vx) * Math.sqrt(sp * sp - b.vy * b.vy); }  // never stuck going sideways
    const n = Math.ceil(sp / 1.2); b.spin = (b.spin || 0) * .985;
    for (let i = 0; i < n && !b.dead; i++) {
      if (b.spin) { const c = Math.cos(b.spin / n), s = Math.sin(b.spin / n), vx = b.vx; b.vx = vx * c - b.vy * s; b.vy = vx * s + b.vy * c; }  // l'effet courbe la course
      const ox = b.x, oy = b.y; b.x += b.vx / n; b.y += b.vy / n;
      if (b.x < 3) { b.x = 3; b.vx = Math.abs(b.vx); b.spin = -(b.spin || 0) * .6; BK_SFX.wall(); } if (b.x > BK.W - 3) { b.x = BK.W - 3; b.vx = -Math.abs(b.vx); b.spin = -(b.spin || 0) * .6; BK_SFX.wall(); }
      if (b.y < 16) { b.y = 16; b.vy = Math.abs(b.vy); b.spin = -(b.spin || 0) * .6; BK_SFX.wall(); }
      if (b.vy > 0 && b.y + 2 >= BK.PY && oy + 2 <= BK.PY + 2 && b.x >= bk.px - w / 2 - 2 && b.x <= bk.px + w / 2 + 2) {  // the paddle: where it hits sets the angle
        const rel = Math.max(-1, Math.min(1, (b.x - bk.px) / (w / 2))), stuck = bk.lt - (bk.lastHit || 0) > 1200 && bk.bricks.find(k => k.type !== '#');
        const sv = Math.max(-1, Math.min(1, (bk.pv || 0) / 6));  // la raquette qui bouge donne de l'effet
        const a = stuck ? Math.max(-1.05, Math.min(1.05, Math.atan2(stuck.x + BK.BW / 2 - b.x, BK.PY - stuck.y))) : Math.max(-1.1, Math.min(1.1, rel * 1.05 + sv * .3));  // 20 s without hitting a brick: this bounce heads for one
        b.vx = sp * Math.sin(a); b.vy = -sp * Math.cos(a); b.y = BK.PY - 2; b.spin = stuck ? 0 : sv * .012;
        if (bk.fx.glue) b.stuck = b.x - bk.px;
        BK_SFX.paddle(rel); break;
      }
      const k = bk.bricks.find(k => b.x + 2 > k.x && b.x - 2 < k.x + BK.BW && b.y + 2 > k.y && b.y - 2 < k.y + BK.BH);
      if (k) {
        if (!(bk.fx.fire && k.type !== '#')) { if (ox + 2 <= k.x || ox - 2 >= k.x + BK.BW) b.vx = -b.vx; else b.vy = -b.vy; b.x = ox; b.y = oy; b.spin = -(b.spin || 0) * .6; }
        bkHit(k, bk.fx.fire); break;
      }
      const B = bk.boss;
      if (B && !B.dead && b.x + 2 > B.x - B.w / 2 && b.x - 2 < B.x + B.w / 2 && b.y + 2 > B.y && b.y - 2 < B.y + B.h) {  // le boss : la balle rebondit et le blesse
        if (ox + 2 <= B.x - B.w / 2 || ox - 2 >= B.x + B.w / 2) { b.vx = -b.vx; b.x = ox; } else { b.vy = (oy < B.y + B.h / 2 ? -1 : 1) * Math.abs(b.vy); b.y = oy; }
        if (b.y + 2 > B.y && b.y - 2 < B.y + B.h && b.x + 2 > B.x - B.w / 2 && b.x - 2 < B.x + B.w / 2) { b.y = B.y + B.h + 3; b.vy = Math.abs(b.vy); }
        b.spin = 0; bkBossHit(bk.fx.fire ? 3 : 1); break;
      }
      if (b.y > BK.H + 6) b.dead = true;
    }
  }
  bk.balls = bk.balls.filter(b => !b.dead);
  for (const d of bk.drops) { d.y += .9; if (d.y >= BK.PY - 3 && d.y <= BK.PY + 6 && Math.abs(d.x - bk.px) < w / 2 + 6) { d.got = true; bkCatch(d.type); BK_SFX.get(d.type === 'R'); } }
  bk.drops = bk.drops.filter(d => !d.got && d.y < BK.H + 8);
  for (const s of bk.bolts) { s.y -= 4; const k = bk.bricks.find(k => s.x > k.x && s.x < k.x + BK.BW && s.y > k.y && s.y < k.y + BK.BH), B = bk.boss; if (k) { s.dead = true; bkHit(k, false); } else if (B && !B.dead && Math.abs(s.x - B.x) < B.w / 2 && s.y > B.y && s.y < B.y + B.h) { s.dead = true; bkBossHit(1); } }
  bk.bolts = bk.bolts.filter(s => !s.dead && s.y > 14);
  for (const p of bk.parts) { p.x += p.vx; p.y += p.vy; p.vy += .08; p.life--; }
  bk.parts = bk.parts.filter(p => p.life > 0);
  if (bk.shake > 0) bk.shake--;
  if (!bk.balls.length) {
    bk.lives--; bk.shake = 10;
    if (bk.lives <= 0) { bk.mode = 'over'; bk.overAt = Date.now(); const rec = best('breakout', bk.score); bk.record = rec; saveGames(); bkTrophies(); (rec ? BK_SFX.win : BK_SFX.over)(); return; }
    BK_SFX.lose();
    bk.fx = {wide: 0, narrow: 0, laser: 0, slow: 0, glue: 0, fire: 0}; bk.drops = []; bk.lt = 0; bk.lastHit = 0;
    bk.balls = [{x: bk.px, y: BK.PY - 3, vx: 0, vy: 0, stuck: 0}];
  }
  if (!bk.boss && !bk.bricks.some(k => k.type !== '#')) { bk.seeds = []; bk.score += 500 + bk.lives * 100; bk.clear = 110; bk.banner = {text: 'NIVEAU ' + bk.level + ' RÉUSSI', sub: '+' + (500 + bk.lives * 100) + ' points', t: 110}; BK_SFX.win(); }
}
function bkDraw() {
  const g = bk.g, {W, H} = BK;
  bkMusic();
  g.save(); if (bk.shake) g.translate(Math.round((Math.random() - .5) * bk.shake / 2), Math.round((Math.random() - .5) * bk.shake / 2));
  g.fillStyle = '#07021a'; g.fillRect(-4, -4, W + 8, H + 8);
  for (const [x, y, z] of bk.stars) px(g, z > .7 ? '#8f7bb8' : '#3a2a6e', x, (y + bk.tick * z * .15) % H);
  g.fillStyle = 'rgba(138,92,240,.05)'; for (let x = 0; x < W; x += 16) g.fillRect(x, 14, 1, H); for (let y = 14; y < H; y += 16) g.fillRect(0, y, W, 1);
  px(g, '#2a1d52', 0, 13, W, 1);
  for (const s of bk.seeds || []) { const p = 1 - s.t / 420, h = Math.max(1, Math.round(p * 6)); px(g, '#1a7a34', s.k.x + BK.BW / 2 - 1, s.k.y + BK.BH - h, 2, h); if (p > .5) { px(g, '#5ee07a', s.k.x + BK.BW / 2 - 3, s.k.y + BK.BH - h, 2, 1); px(g, '#5ee07a', s.k.x + BK.BW / 2 + 1, s.k.y + BK.BH - h + 1, 2, 1); } }
  for (const k of bk.bricks) { bkBrick(g, k, bk.tick); if (k.flash > 0) k.flash--; }
  bkBossDraw(g);
  for (const s of bk.shots || []) { px(g, '#05010b', s.x - 2, s.y - 3, 5, 7); px(g, '#ff9a3c', s.x - 1, s.y - 2, 3, 5); px(g, '#fff0c8', s.x - 1, s.y - 2, 1, 2); }
  for (const d of bk.drops) { const def = BK.DROPS.find(x => x[0] === d.type); px(g, '#05010b', d.x - 10, d.y - 5, 20, 11); px(g, def[2], d.x - 9, d.y - 4, 18, 9); px(g, 'rgba(255,255,255,.55)', d.x - 8, d.y - 4, 16, 1); px(g, 'rgba(5,1,11,.35)', d.x - 9, d.y + 3, 18, 2); g.font = '8px "Press Start 2P", monospace'; g.textAlign = 'center'; g.fillStyle = '#130a20'; g.fillText(d.type, d.x + .5, d.y + 4); g.textAlign = 'left'; }
  for (const s of bk.bolts) { px(g, '#ff4f6d', s.x - 1, s.y - 4, 2, 6); px(g, '#ffd0f4', s.x - 1, s.y - 4, 2, 2); }
  const w = bkPW(), x0 = Math.round(bk.px - w / 2);
  px(g, '#05010b', x0 - 1, BK.PY - 1, w + 2, 8); px(g, bk.stun ? '#3a2a6e' : '#8a1a7a', x0, BK.PY, w, 6); px(g, bk.stun ? (bk.stun % 8 < 4 ? '#8f7bb8' : '#5e4d85') : bk.fx.glue ? '#ffd07a' : '#ff5ad9', x0, BK.PY, w, 4); px(g, '#ffd0f4', x0 + 3, BK.PY + 1, w - 6, 1);
  px(g, '#7fe0ee', x0, BK.PY, 4, 6); px(g, '#7fe0ee', x0 + w - 4, BK.PY, 4, 6);
  if (bk.fx.laser) { px(g, '#ff4f6d', x0 + 2, BK.PY - 4, 2, 4); px(g, '#ff4f6d', x0 + w - 4, BK.PY - 4, 2, 4); }
  for (const b of bk.balls) {
    const fire = bk.fx.fire;
    if (fire) for (let i = 1; i < 5; i++) px(g, i < 3 ? '#ff9a3c' : '#8a3c10', b.x - b.vx * i * .8 - 1, b.y - b.vy * i * .8 - 1, 3, 3);
    else if (Math.abs(b.spin || 0) > .002) for (let i = 1; i < 4; i++) px(g, i < 2 ? '#7fe0ee' : '#1f8098', b.x - b.vx * i * 1.2 - 1, b.y - b.vy * i * 1.2 - 1, 2, 2);  // la traînée de l'effet
    px(g, fire ? '#ffd07a' : '#ffffff', b.x - 2, b.y - 2, 4, 4); px(g, fire ? '#ff4f6d' : '#c9bdf0', b.x, b.y, 2, 2);
  }
  for (const p of bk.parts) { if (p.edge) px(g, '#05010b', p.x, p.y + 1, p.w, p.h); px(g, p.color, p.x, p.y, p.w || 2, p.h || 2); }
  px(g, 'rgba(11,3,28,.9)', 0, 0, W, 13);
  pxFont(g, String(bk.score).padStart(6, '0'), 4, 10, '#ffffff', 8);
  if (bk.boss && !bk.boss.dead) { px(g, '#05010b', W / 2 - 51, 3, 102, 7); px(g, '#3e0f4a', W / 2 - 50, 4, 100, 5); px(g, '#ff4f6d', W / 2 - 50, 4, Math.ceil(100 * bk.boss.hp / bk.boss.max), 5); px(g, '#ffd0f4', W / 2 - 50, 4, Math.ceil(100 * bk.boss.hp / bk.boss.max), 1); }
  else pxFont(g, 'NIV ' + bk.level, W / 2, 10, '#d9c6ff', 8, 'center');
  for (let i = 0; i < bk.lives; i++) { px(g, '#ff4f6d', W - 10 - i * 9, 4, 6, 4); px(g, '#ff4f6d', W - 9 - i * 9, 8, 4, 1); }
  const timers = [['wide', '#7fe0ee', 1200], ['narrow', '#8f7bb8', 720], ['laser', '#ff4f6d', 600], ['slow', '#8ee8a0', 720], ['glue', '#ffd07a', 900], ['fire', '#ff9a3c', 480]].filter(([k]) => bk.fx[k]);
  timers.forEach(([k, c, max], i) => { px(g, '#2a1d52', 4 + i * 26, H - 5, 22, 3); px(g, c, 4 + i * 26, H - 5, Math.ceil(22 * bk.fx[k] / max), 3); });
  if (bk.banner && bk.mode === 'play') gameText(g, W, [[bk.banner.text, '#ff5ad9', 10], [bk.banner.sub, '#d9c6ff']], H / 2);
  else if (bk.tip) pxFont(g, bk.tip.text, W / 2, H - 30, '#ffd07a', 6, 'center');
  if (bk.balls.some(b => b.stuck != null) && bk.mode === 'play' && !bk.banner && !bk.tip) pxFont(g, 'Clic ou espace : lancer', W / 2, H - 30, '#8f7bb8', 6, 'center');
  const maxLvl = Math.max(1, games?.best.breakoutLvl || 1);
  if (bk.mode === 'ready') { gameText(g, W, [['CASSE-BRIQUES', '#ff5ad9', 12], ['', ''], ['Niveau ' + bk.level + ' : ' + (BK.NAMES[bk.level - 1] || 'Secteur ' + bk.level), '#ffffff'], ['Clic ou espace : jouer', '#d9c6ff'], maxLvl > 1 ? ['< Départ : niveau ' + bk.level + ' >', '#7fe0ee'] : ['Souris ou flèches : raquette', '#8f7bb8'], ['Record : ' + (games?.best.breakout ?? 0), '#ffd07a']], H / 2 - 16); }
  if (bk.mode === 'pause') gameText(g, W, [['PAUSE', '#ffffff', 12], ['Clic ou espace : reprendre', '#d9c6ff']], H / 2);
  if (bk.mode === 'over') gameText(g, W, [['PARTIE TERMINÉE', '#ff4f6d', 10], ['Score : ' + bk.score + ' · niveau ' + bk.level, '#ffffff'], [bk.record ? 'NOUVEAU RECORD !' : 'Record : ' + (games?.best.breakout ?? 0), '#ffd07a'], ['Clic ou espace : rejouer', '#d9c6ff']], H / 2 - 14);
  g.restore();
  $('bkInfo').textContent = 'Record : ' + (games?.best.breakout ?? 0) + ' points · meilleur niveau atteint : ' + maxLvl + (bks.bosses ? ' · boss vaincus : ' + bks.bosses : '');
}
$('bkCanvas').onpointermove = e => { if (!bk) return; const r = e.currentTarget.getBoundingClientRect(); bk.target = (e.clientX - r.left) / r.width * BK.W; };
$('bkCanvas').onpointerdown = () => bkPress();

document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (view.classList.contains('on') && bk) {
    if ([' ', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    if (bk.mode === 'ready' && (k === 'ArrowLeft' || k === 'ArrowRight')) { bkPick(k === 'ArrowRight' ? 1 : -1); return; }
    if (k === ' ' && !e.repeat && bkPress()) return;
    if ((k === 'p' || k === 'Escape') && bk.mode === 'play') bk.mode = 'pause';
    bk.keys[k] = true;
  }
});

document.addEventListener('keyup', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (bk) bk.keys[k] = false;
});

function bkPick(d) { const max = Math.max(1, games.best.breakoutLvl || 1); bk.level = Math.max(1, Math.min(max, bk.level + d)); bkLoad(); bkLevels(); }
// la manette : croix ou stick pour la raquette, A pour lancer (maintenu : les lasers tirent), Start pour la pause ; sur l'écran titre, gauche et droite choisissent le niveau
{ let prev = [];
  const loop = () => { requestAnimationFrame(loop); if (!view.classList.contains('on') || !bk) return;
    const p = [...(navigator.getGamepads?.() || [])].find(Boolean); if (!p) return;
    const b = i => !!p.buttons[i]?.pressed, ax = p.axes[0] || 0;
    const now = [b(14) || ax < -.4, b(15) || ax > .4, b(0) || b(2), b(9)], hit = i => now[i] && !prev[i];
    if (bk.mode === 'ready' && (hit(0) || hit(1))) bkPick(hit(1) ? 1 : -1);
    bk.keys.padL = bk.mode === 'play' && now[0]; bk.keys.padR = bk.mode === 'play' && now[1]; bk.keys.padA = now[2];
    if (hit(2)) bkPress();
    if (hit(3)) { if (bk.mode === 'play') bk.mode = 'pause'; else bkPress(); }
    prev = now; };
  requestAnimationFrame(loop); }
$('bkFs').onclick = () => { $('bkFs').blur(); if (document.fullscreenElement) document.exitFullscreen(); else $('bkCanvas').parentElement.requestFullscreen?.().catch(() => {}); };
const BK_SND = ['SON : TOUT', 'SON : EFFETS', 'SON : COUPÉ'];
$('bkSnd').onclick = () => { bks.snd = ((bks.snd || 0) + 1) % 3; saveGames(); $('bkSnd').textContent = BK_SND[bks.snd]; $('bkSnd').blur(); };
$('bkSnd').textContent = BK_SND[bks.snd || 0];
// les trophées, tirés des records et des boss vaincus (aussi à l'ouverture : ce qui a été fait avant compte) ; jamais pendant la vérification
function bkTrophies() {
  if (bk?.mode === 'check') return;
  const sc = games.best.breakout || 0, lv = games.best.breakoutLvl || 1, bo = bks.bosses || 0;
  trophyRecord('score', games.best.breakout); trophyRecord('niveau', games.best.breakoutLvl);
  if (lv >= 10) trophy('niveau-10'); if (lv >= 20) trophy('niveau-20'); if (lv > 40) trophy('niveau-41');
  if (bo) trophy('boss'); if (bo >= 4) trophy('boss-4'); if (sc >= 10000) trophy('score-10000'); if (sc >= 50000) trophy('score-50000');
}
function bkCheck() {  // vérification : une brique simple casse en éclats, une brique à 3 coups se fissure, le métal tient, l'explosive emporte ses voisines
  const keep = bk, bad = [];
  bk = {mode: 'check', bricks: [], parts: [], drops: [], score: 0, level: 1, shake: 0, lt: 0};
  const mk = (x, y, type) => { const k = {x: BK.X0 + x * (BK.BW + 2), y: BK.Y0 + y * (BK.BH + 2), type, hp: type === '#' ? Infinity : type === 'x' || type === '*' ? 1 : +type, max: +type || 1, flash: 0}; bk.bricks.push(k); return k; };
  const one = mk(0, 0, '1'), three = mk(5, 0, '3'), metal = mk(8, 0, '#'), boom = mk(2, 3, 'x'), nb = mk(3, 3, '2'), far = mk(10, 5, '1');
  bkHit(one); if (bk.bricks.includes(one) || !bk.parts.some(p => p.edge)) bad.push('brique simple');
  bkHit(three); if (three.hp !== 2 || !bk.bricks.includes(three)) bad.push('brique à 3 coups');
  for (let i = 0; i < 5; i++) bkHit(metal); if (!bk.bricks.includes(metal)) bad.push('métal');
  bkHit(boom); if (bk.bricks.includes(boom) || bk.bricks.includes(nb) || !bk.bricks.includes(far)) bad.push('explosion');
  const kb = bks.bosses, fresh = level => { bk = {mode: 'check', tick: 0, level, lives: 3, score: 0, px: BK.W / 2, target: null, keys: {}, parts: [], shake: 0, cool: 0, lt: 0, stars: []}; bkLoad(); };
  fresh(7); const ms = bk.bricks.filter(k => k.type === 'm'), y0 = Object.keys(bk.rows)[0], d0 = bk.rows[y0], mx = ms[0].x;  // les briques qui glissent : elles bougent, font demi-tour, restent dans le cadre
  for (let i = 0; i < 400; i++) bkStep(); if (ms[0].x === mx || !ms.every(k => k.x >= BK.X0 && k.x + BK.BW <= BK.W - BK.X0)) bad.push('briques qui glissent');
  { let flip = false; const d = bk.rows[y0]; for (let i = 0; i < 400 && !flip; i++) { bkStep(); flip = bk.rows[y0] !== d; } if (!flip) bad.push('pas de demi-tour'); }
  const rr = bk.bricks.find(k => k.type === 'r'); bkHit(rr); if (bk.bricks.includes(rr) || bk.seeds.length !== 1) bad.push('brique verte cassée');  // la verte repousse
  bk.seeds[0].t = 1; bkStep(); if (!bk.bricks.includes(rr) || bk.seeds.length) bad.push('brique verte qui repousse');
  bk.bricks = [rr]; bkHit(rr); if (bk.seeds.length) bad.push('la dernière brique verte repousse');
  fresh(1); bk.balls = [{x: 160, y: BK.PY - 4, vx: 0, vy: 2}]; bk.keys.ArrowRight = true; bkUpdate();  // l'effet : la raquette qui va à droite courbe la balle vers la droite
  const sb = bk.balls[0]; if (!(sb && sb.spin > .005 && sb.vx > 0)) bad.push('effet de la raquette'); else { const v0 = sb.vx; bk.keys.ArrowRight = false; for (let i = 0; i < 5; i++) bkUpdate(); if (!(sb.vx > v0)) bad.push('la balle ne se courbe pas'); }
  fresh(10); bkBoss(); const B = bk.boss;  // le boss : sa protection, la balle qui le blesse, sa défaite
  if (!B || bk.bricks.length !== 11 || bk.bricks.some(k => k.type !== 'r')) bad.push('boss du niveau 10');
  else { bk.balls = [{x: B.x, y: B.y + B.h + 4, vx: 0, vy: -3}]; bkUpdate(); if (B.hp !== B.max - 1 || !(bk.balls[0].vy > 0)) bad.push('la balle ne blesse pas le boss : ' + B.hp + '/' + B.max);
    bkBossHit(B.hp - 1); if (B.dead) bad.push('boss mort trop tôt'); bkBossHit(1); if (!(B.dead && bk.clear > 0 && bk.bossWon && !bk.bricks.length)) bad.push('boss vaincu'); }
  fresh(20); bkBoss(); if (bk.boss.d.name !== 'La Méduse' || !Object.keys(bk.rows).length) bad.push('boss du niveau 20');
  fresh(30); bkBoss(); if (bk.bricks.filter(k => k.type === '#').length !== 3) bad.push('boss du niveau 30');
  bks.bosses = kb;
  bk = keep;
  return bad.length ? bad.join(', ') : 'ok';
}
console.assert(bkCheck() === 'ok', 'casse-briques', bkCheck());
$('bkCanvas').__bk = {st: () => bk, BK, check: bkCheck, hit: k => bkHit(k), boss: bkBoss, load: bkLoad};  // pour l'auto-test
$('bkLevel').onchange = () => bkStart(+$('bkLevel').value);  // (non indenté : les textes sur plusieurs lignes restent exactement les tiens)
  // ---- fin ----
  ctx.onOpen(() => { bk ? gameLoop(bk, 'neodex:breakout', bkUpdate, bkDraw) : bkStart(); bkTrophies(); });
}
