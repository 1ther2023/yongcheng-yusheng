// ===== 主循环 & 输入 =====
(function () {
  const U = G.U;
  G.game = { mode: 'menu', panel: null, searching: null, bigMap: false };
  const input = G.input = { keys: {}, pressed: {}, mouse: { x: 0, y: 0, down: false, clicked: false }, wheel: 0 };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab') e.preventDefault();
    if (e.code === 'Space' && G.game.mode === 'raid') e.preventDefault();
    if (!input.keys[e.code]) input.pressed[e.code] = true;
    input.keys[e.code] = true;
    if (G.game.mode !== 'raid' || !G.raid || G.raid.ended) return;
    const p = G.game.panel;
    if (e.code === 'Escape') { if (p === 'loot' || p === 'inv' || p === 'pause') G.UI.closePanel(); else if (!p) G.UI.pause(); }
    if (e.code === 'Tab') { if (p === 'inv') G.UI.closePanel(); else if (!p) G.UI.openInv(); }
    if (e.code === 'KeyE' && p === 'loot' && !e.repeat) { G.UI.closePanel(); input.keys.KeyE = false; G.game.eLock = true; }
    if (e.code === 'KeyM' && !p) G.game.bigMap = !G.game.bigMap;
  });
  window.addEventListener('keyup', (e) => { input.keys[e.code] = false; if (e.code === 'KeyE') G.game.eLock = false; });
  window.addEventListener('blur', () => { input.keys = {}; input.mouse.down = false; });
  const cv = document.getElementById('game');
  cv.addEventListener('mousemove', (e) => { input.mouse.x = e.clientX; input.mouse.y = e.clientY; });
  cv.addEventListener('mousedown', (e) => { if (e.button === 0) { input.mouse.down = true; input.mouse.clicked = true; } });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) input.mouse.down = false; });
  cv.addEventListener('wheel', (e) => { input.wheel = e.deltaY > 0 ? 1 : -1; e.preventDefault(); }, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  G.startRaid = (opt) => {
    const st = G.st;
    G.UI.enterRaid();
    G.raid = new G.Raid(st, opt);
    G.game.mode = 'raid'; G.game.panel = null; G.game.searching = null; G.game.bigMap = false;
    G.M.clearCache();
    G.R.cam.x = G.raid.player.x; G.R.cam.y = G.raid.player.y;
    G.UI.toast(opt.deploy.name, 1800);
  };

  function handleSearch(raid, dt) {
    const P = raid.player;
    const g = G.game;
    if (g.panel) { g.searching = null; return; }
    const holding = input.keys['KeyE'] && !g.eLock;
    if (!holding) { g.searching = null; return; }
    const it = raid.findInteract();
    if (!it) { g.searching = null; return; }
    if (it.type === 'npc') { raid.rescueNpc(); g.eLock = true; return; }
    if (!g.searching || g.searching.c !== it) g.searching = { c: it, t: 0, need: raid.searchTime(it) };
    if (P.moving || P.rollT > 0) { g.searching.t = 0; return; }
    g.searching.t += dt;
    if (Math.random() < dt * 0.5 && !it.searched) raid.noise(P.x, P.y, 2.5 * P.noiseMul());
    if (g.searching.t >= g.searching.need) { const c = g.searching.c; g.searching = null; g.eLock = true; raid.completeSearch(c); }
  }

  let last = performance.now(), hudT = 0, t = 0;
  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += dt;
    const raid = G.raid;
    if (G.game.mode === 'raid' && raid) {
      const p = G.game.panel;
      let scale = 1;
      if (p === 'loot' || p === 'inv') scale = 0.25;
      if (p === 'perk' || p === 'pause' || p === 'end' || G.game.bigMap) scale = 0;
      if (raid.ended) scale = 0.3;
      if (scale > 0) {
        const pin = p ? { keys: {}, pressed: {}, mouse: { x: input.mouse.x, y: input.mouse.y, down: false, clicked: false }, wheel: 0 } : input;
        raid.update(dt * scale, pin);
        if (!p) handleSearch(raid, dt * scale);
      }
      // 镜头：略微偏向准星
      const P = raid.player;
      const [mx, my] = G.R.toWorld(input.mouse.x, input.mouse.y);
      const tx = P.x + U.clamp((mx - P.x) * 0.22, -5, 5), ty = P.y + U.clamp((my - P.y) * 0.22, -3.5, 3.5);
      G.R.cam.x += (tx - G.R.cam.x) * Math.min(1, dt * 6); G.R.cam.y += (ty - G.R.cam.y) * Math.min(1, dt * 6);
      G.R.drawWorld(raid, t);
      if (G.game.bigMap) G.R.drawBigMap(raid);
      hudT -= dt;
      if (hudT <= 0) { G.UI.updateHud(raid); G.R.drawMinimap(raid); hudT = 0.1; }
    } else {
      drawMenuBg(t);
    }
    input.pressed = {}; input.mouse.clicked = false; input.wheel = 0;
    requestAnimationFrame(frame);
  }

  // 菜单背景：缓慢平移的南宁地图
  let bgRaid = null;
  function drawMenuBg(t) {
    if (!bgRaid) {
      const d = G.M.landmarks[0];
      bgRaid = { player: { x: d.x, y: d.y, hp: 1, maxhp: 1, aim: 0, equip: {}, curWeapon: () => null }, decals: [], fires: [], projectiles: [], tracers: [], particles: [], floats: [], lights: [], noisePings: [], extracts: [], specialContainers: [], visibleEntities: [], mods: {}, dark: 0, night: false };
    }
    const c = G.R.ctx;
    G.R.cam.x = bgRaid.player.x + Math.sin(t * 0.03) * 60; G.R.cam.y = bgRaid.player.y + Math.cos(t * 0.025) * 40;
    bgRaid.player.x = G.R.cam.x; bgRaid.player.y = G.R.cam.y + 1000; // 挖空移出屏幕
    try { drawStatic(bgRaid); } catch (e) { c.fillStyle = '#1b1714'; c.fillRect(0, 0, G.R.W, G.R.H); }
  }
  function drawStatic(r) {
    const R = G.R, c = R.ctx, M = G.M, TS = U.TS, CH = M.CH;
    const W = R.W, H = R.H;
    c.fillStyle = '#e6dabd'; c.fillRect(0, 0, W, H);
    const vx0 = R.cam.x - W / 2 / TS, vy0 = R.cam.y - H / 2 / TS;
    const cx0 = Math.floor(vx0 / CH), cy0 = Math.floor(vy0 / CH), cx1 = Math.floor((vx0 + W / TS) / CH), cy1 = Math.floor((vy0 + H / TS + 4) / CH);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) if (cx >= 0 && cy >= 0 && cx * CH < M.w && cy * CH < M.h) c.drawImage(M.getGround(cx, cy), Math.round(R.sx(cx * CH)), Math.round(R.sy(cy * CH)));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) if (cx >= 0 && cy >= 0 && cx * CH < M.w && cy * CH < M.h) c.drawImage(M.getBuild(cx, cy, false), Math.round(R.sx(cx * CH)), Math.round(R.sy(cy * CH)) - M.BTOP);
    c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = R.paperPat; c.fillRect(0, 0, W, H); c.restore();
    c.fillStyle = 'rgba(20,15,10,0.35)'; c.fillRect(0, 0, W, H);
  }

  window.addEventListener('load', () => {
    G.M.init(); G.M.makeMiniBase(); G.R.init();
    G.UI.title();
    requestAnimationFrame(frame);
  });
})();
