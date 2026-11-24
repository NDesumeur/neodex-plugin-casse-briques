// lancé par le test « local » de NeoDex : les règles des briques, l'écran titre, une partie (la balle part et casse des briques),
// la raquette et le lancer à la manette, les briques en relief et leurs éclats, le bouton son, le plein écran et la place prise (avec NEO_SHOTS : garde des images)
module.exports = async ({ pj, sleep }) => {
  const K = code => pj(`(() => { const T = document.getElementById('bkCanvas').__bk, bk = T.st(), BK = T.BK; ${code} })()`);
  const key = (k, type = 'keydown') => pj(`document.dispatchEvent(new KeyboardEvent('${type}', {key: '${k}', bubbles: true})), 0`);
  const shot = async n => { if (!process.env.NEO_SHOTS) return; const d = await pj(`document.getElementById('bkCanvas').toDataURL()`); require('fs').writeFileSync(require('path').join(process.env.NEO_SHOTS, 'casse-briques-' + n + '.png'), Buffer.from(d.split(',')[1], 'base64')); };
  await pj(`window.__e = []; addEventListener('error', e => __e.push(e.message)); 0`);
  const chk = await K('return T.check();'); if (chk !== 'ok') throw new Error('règles : ' + chk);
  await sleep(300); await shot('0-titre');
  // la manette : A lance la partie, la croix déplace la raquette, A lance la balle
  await pj(`(() => { const pad = {axes: [0, 0], buttons: Array.from({length: 17}, () => ({pressed: false}))}; window.__pad = pad; navigator.getGamepads = () => [pad]; return 0; })()`);
  const tap = async i => { await pj(`(__pad.buttons[${i}].pressed = true, 0)`); await sleep(80); await pj(`(__pad.buttons[${i}].pressed = false, 0)`); await sleep(80); };
  await tap(0); const m = await K('return bk.mode;'); if (m !== 'play') throw new Error('A ne lance pas la partie (' + m + ')');
  await sleep(2200);  // le bandeau du niveau
  const x0 = await K('return bk.px;');
  await pj(`(__pad.buttons[14].pressed = true, 0)`); await sleep(300); await pj(`(__pad.buttons[14].pressed = false, 0)`);
  const x1 = await K('return bk.px;'); if (!(x1 < x0 - 20)) throw new Error('la croix ne déplace pas la raquette : ' + x0 + ' → ' + x1);
  await tap(0); const v = await K('return bk.balls[0].stuck == null && bk.balls[0].vy < 0;'); if (!v) throw new Error('A ne lance pas la balle');
  await pj(`navigator.getGamepads = () => [], 0`);
  // la raquette suit la balle tout seule pendant quelques secondes : des briques cassent
  const n0 = await K('return bk.bricks.length;');
  for (let i = 0; i < 40; i++) { await K('const b = bk.balls[0]; if (b) bk.target = b.x; return 0;'); await sleep(100); }
  const n1 = await K('return bk.bricks.length;'); if (!(n1 < n0)) throw new Error('aucune brique cassée (' + n0 + ' → ' + n1 + ')');
  // les briques de toutes sortes (simple, solide fissurée, à 3 coups, métal, explosive, bonus) et des éclats, pour l'image
  await K(`bk.bricks = []; bk.balls = [{x: 160, y: 200, vx: 0, vy: 0, stuck: 0}]; const t = ['1', '2', '3', '#', 'x', '*'];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) bk.bricks.push({x: BK.X0 + (i * 2 + 1) * (BK.BW + 2), y: BK.Y0 + 20 + j * 30, type: t[i], hp: t[i] === '#' ? Infinity : +t[i] ? +t[i] - j : 1, max: +t[i] || 1, flash: 0});
    bk.banner = null; bk.tip = null; return 0;`);
  await K(`const k = {x: 149, y: 130, type: '3', hp: 1, max: 3, flash: 0}; bk.bricks.push(k); bk.mode = 'play'; T.hit(k); return 0;`);  // une brique qui casse : ses éclats
  await sleep(100); await shot('1-briques');
  // le niveau 7 (rangées qui glissent, briques vertes) puis le boss du niveau 10, pour l'image
  await K('bk.level = 7; T.load(); bk.banner = null; return 0;'); await sleep(600); await shot('2-glissent');
  await K('bk.level = 10; T.boss(); bk.banner = null; bk.balls = [{x: 120, y: 120, vx: 1.5, vy: 2, spin: .01}]; return 0;'); await sleep(2500); await shot('3-boss');
  const bh = await K('return bk.boss && !bk.boss.dead && bk.boss.d.name;'); if (bh !== 'Le Gardien') throw new Error('pas de boss au niveau 10 : ' + bh);
  const errs = await pj(`window.__e.join(' | ')`); if (errs) throw new Error('erreur : ' + errs);
  // le bouton son fait le tour : effets, coupé, tout
  const snd = []; for (let i = 0; i < 3; i++) { await pj(`document.getElementById('bkSnd').click(), 0`); snd.push(await pj(`document.getElementById('bkSnd').textContent`)); }
  if (snd.join('|') !== 'SON : EFFETS|SON : COUPÉ|SON : TOUT') throw new Error('bouton son : ' + snd.join('|'));
  // plein écran, et la zone de jeu qui tient dans la fenêtre
  await pj(`document.getElementById('bkFs').click(), 0`); await sleep(700);
  const fs = await pj(`(() => { const c = document.getElementById('bkCanvas'), r = c.getBoundingClientRect(); return document.fullscreenElement === c.parentElement && (Math.abs(r.height - innerHeight) < 3 || Math.abs(r.width - innerWidth) < 3); })()`);
  await pj(`document.fullscreenElement && document.exitFullscreen(), 0`); await sleep(300);
  if (!fs) throw new Error('le plein écran ne remplit pas l\'écran');
  const L = await pj(`(() => { const r = document.getElementById('bkCanvas').getBoundingClientRect(); let s = 0; for (let e = document.getElementById('bkCanvas').parentElement; e; e = e.parentElement) s += e.scrollTop; return { bottom: Math.round(r.bottom + s), h: Math.round(r.height), wh: innerHeight, ww: innerWidth, sw: document.documentElement.scrollWidth }; })()`);
  if (process.env.NEO_FIT_LOG) console.log('FIT', JSON.stringify(L));
  if (L.bottom > L.wh + 1 || L.sw > L.ww + 1 || L.h < 240) throw new Error('la zone de jeu dépasse la fenêtre ou reste petite : ' + JSON.stringify(L));
  return 'règles ok · partie lancée à la manette · ' + (n0 - n1) + ' briques cassées · boss · son · plein écran · terrain ' + L.h + ' px dans ' + L.ww + '×' + L.wh;
};
