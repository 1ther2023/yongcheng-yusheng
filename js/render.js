// ===== 渲染：镜头、角色手绘、特效、光照、小地图 =====
(function () {
  const U = G.U, SK = G.SK, TS = U.TS;
  const R = {};
  let cv, c, W = 0, H = 0, bcv, bc, lcv, lc, paper;
  R.cam = { x: 0, y: 0, shake: 0 };

  R.init = () => {
    cv = document.getElementById('game'); c = cv.getContext('2d');
    bcv = document.createElement('canvas'); bc = bcv.getContext('2d');
    lcv = document.createElement('canvas'); lc = lcv.getContext('2d');
    R.resize(); window.addEventListener('resize', R.resize);
    paper = U.makePaper(256, 256);
    R.paperPat = c.createPattern(paper, 'repeat');
    R.ctx = c; R.canvas = cv;
  };
  R.resize = () => {
    const dpr = 1; // 手绘风无需高分屏，保证性能
    W = cv.width = Math.floor(window.innerWidth * dpr); H = cv.height = Math.floor(window.innerHeight * dpr);
    bcv.width = W; bcv.height = H; lcv.width = W; lcv.height = H;
    R.W = W; R.H = H;
    if (c) R.paperPat = paper && c.createPattern(paper, 'repeat');
  };
  R.sx = (wx) => (wx - R.cam.x) * TS + W / 2;
  R.sy = (wy) => (wy - R.cam.y) * TS + H / 2;
  R.toWorld = (px, py) => [(px - W / 2) / TS + R.cam.x, (py - H / 2) / TS + R.cam.y];

  // ---------- 角色绘制 ----------
  const INK = '#2b2420';
  function boilRnd(e, t) { return U.rng((e.seed || 1) + Math.floor(t * 8) * 7919); }

  function drawShadow(x, y, rx, ry) { c.fillStyle = 'rgba(30,22,15,0.28)'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.29); c.fill(); }

  function drawWeapon(x, y, ang, w, e, t) {
    if (!w) return;
    const d = G.D.items[w.id];
    c.save(); c.translate(x, y);
    let a = ang;
    if (d.type === 'melee' && e.swingT > 0 && !d.chainsaw) {
      const p = 1 - e.swingT / e.swingDur;
      a = ang - 1.1 + p * 2.2;
    }
    c.rotate(a);
    c.lineCap = 'round';
    if (d.type === 'gun') {
      const len = d.slot === 'primary' ? 22 : 12;
      c.strokeStyle = '#1e1c1a'; c.lineWidth = d.slot === 'primary' ? 4.5 : 4; c.beginPath(); c.moveTo(2, 0); c.lineTo(len, 0); c.stroke();
      if (w.id === 'slingbow') { c.strokeStyle = '#4a3a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(len - 4, -8); c.quadraticCurveTo(len + 2, 0, len - 4, 8); c.stroke(); }
      if (w.id === 'nailgun') { c.fillStyle = '#d8a020'; c.fillRect(2, -4, 10, 8); }
      if (d.slot === 'primary') { c.fillStyle = '#4a3a2a'; c.fillRect(0, -2, 8, 4); }
    } else if (d.chainsaw) {
      c.fillStyle = '#d06a1a'; c.fillRect(0, -5, 10, 10); c.strokeStyle = INK; c.lineWidth = 1; c.strokeRect(0, -5, 10, 10);
      c.fillStyle = '#9a9a96'; c.fillRect(10, -3, 18, 6);
      c.strokeStyle = '#333'; c.setLineDash([2, 2]); c.lineDashOffset = -t * 60; c.strokeRect(10, -3.5, 18, 7); c.setLineDash([]);
    } else {
      const len = { cleaver: 12, pipe: 22, hammer: 13, baton: 16, shovel: 22, machete: 18, fireaxe: 20, fist: 0 }[w.id] || 14;
      if (len) {
        c.strokeStyle = w.id === 'pipe' ? '#8a8e90' : '#5a3a22'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(len, 0); c.stroke();
        c.fillStyle = '#c8ccd0'; c.strokeStyle = INK; c.lineWidth = 1;
        if (w.id === 'cleaver') { c.fillRect(len - 6, -6, 9, 7); c.strokeRect(len - 6, -6, 9, 7); }
        if (w.id === 'machete') { c.beginPath(); c.moveTo(5, -1); c.lineTo(len + 4, -4); c.lineTo(len + 2, 2); c.lineTo(5, 2); c.closePath(); c.fill(); c.stroke(); }
        if (w.id === 'fireaxe') { c.fillStyle = '#b8322a'; c.beginPath(); c.moveTo(len - 4, -2); c.lineTo(len + 2, -9); c.lineTo(len + 4, 3); c.closePath(); c.fill(); c.stroke(); }
        if (w.id === 'hammer') { c.fillStyle = '#555'; c.fillRect(len - 2, -5, 5, 10); }
        if (w.id === 'shovel') { c.fillStyle = '#6a7a5a'; c.fillRect(len - 2, -5, 8, 10); c.strokeRect(len - 2, -5, 8, 10); }
      }
    }
    c.restore();
  }

  R.drawHuman = (e, t, opts) => {
    const x = R.sx(e.x), y = R.sy(e.y);
    const rnd = boilRnd(e, t);
    const walk = e.moving ? Math.sin(e.walkT * 12) : 0;
    drawShadow(x, y + 1, 9, 4);
    if (e.rollT > 0) { // 翻滚
      c.save(); c.translate(x, y - 7); c.rotate(t * 25);
      c.fillStyle = opts.body; SK.circle(c, 0, 0, 8, rnd, .15); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke(); c.restore(); return;
    }
    // 腿
    c.strokeStyle = '#2a2a30'; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath();
    c.moveTo(x - 3, y - 6); c.lineTo(x - 3 + walk * 3, y);
    c.moveTo(x + 3, y - 6); c.lineTo(x + 3 - walk * 3, y); c.stroke();
    const facingUp = Math.sin(e.aim) < -0.3;
    // 背包
    if (opts.bag && !facingUp) { c.fillStyle = opts.bag; c.fillRect(x - 6, y - 19, 12, 10); }
    // 身体
    c.fillStyle = opts.body; SK.circle(c, x, y - 12, 7.5, rnd, .14, 10); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
    if (opts.bag && facingUp) { c.fillStyle = opts.bag; c.fillRect(x - 6, y - 17, 12, 10); c.strokeStyle = INK; c.lineWidth = 1; c.strokeRect(x - 6, y - 17, 12, 10); }
    // 手臂 + 武器
    const hx = x + Math.cos(e.aim) * 6, hy = y - 12 + Math.sin(e.aim) * 5;
    c.strokeStyle = opts.skin; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 4, y - 13); c.lineTo(hx, hy); c.moveTo(x + 4, y - 13); c.lineTo(hx, hy); c.stroke();
    drawWeapon(hx, hy, e.aim, opts.weapon, e, t);
    // 头
    c.fillStyle = opts.skin; SK.circle(c, x, y - 22, 5.5, rnd, .12, 9); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
    if (opts.helmet) { c.fillStyle = opts.helmet; c.beginPath(); c.arc(x, y - 23, 6.2, Math.PI, 0); c.fill(); c.strokeStyle = INK; c.stroke(); }
    else if (opts.hair) { c.fillStyle = opts.hair; c.beginPath(); c.arc(x, y - 23.5, 5.5, Math.PI * 1.05, Math.PI * 1.95); c.fill(); }
    if (opts.mask) { c.fillStyle = opts.mask; c.fillRect(x - 5, y - 21, 10, 4); }
    if (e.hitT > 0) { c.fillStyle = 'rgba(255,255,255,' + (e.hitT * 3) + ')'; c.beginPath(); c.arc(x, y - 14, 11, 0, 6.29); c.fill(); }
  };

  R.drawZombie = (e, t) => {
    const def = G.D.enemies[e.type];
    const x = R.sx(e.x), y = R.sy(e.y);
    const rnd = boilRnd(e, t);
    const walk = Math.sin(e.walkT * (e.type === 'runner' ? 14 : 7));
    const col = e.col || def.color;
    const a = e.face;
    let alpha = 1;
    if (e.type === 'crawler' && e.hidden) alpha = 0.35;
    c.globalAlpha = alpha;
    const sc = e.type === 'brute' ? 1.9 : e.type === 'bloater' ? 1.5 : e.type === 'thrower' ? 1.25 : 1;
    drawShadow(x, y + 1, 9 * sc, 4 * sc);
    c.lineCap = 'round';
    if (e.type === 'crawler') {
      c.fillStyle = col; SK.circle(c, x, y - 5, 8, rnd, .2); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = col; c.lineWidth = 3; c.beginPath();
      c.moveTo(x, y - 5); c.lineTo(x + Math.cos(a - .5 + walk * .3) * 13, y - 5 + Math.sin(a - .5) * 9);
      c.moveTo(x, y - 5); c.lineTo(x + Math.cos(a + .5 - walk * .3) * 13, y - 5 + Math.sin(a + .5) * 9); c.stroke();
      c.fillStyle = '#9a8c78'; SK.circle(c, x + Math.cos(a) * 7, y - 7 + Math.sin(a) * 4, 4.5, rnd, .2); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
      c.globalAlpha = 1; return;
    }
    // 腿
    c.strokeStyle = '#3a3630'; c.lineWidth = 3 * sc; c.beginPath();
    c.moveTo(x - 3 * sc, y - 6 * sc); c.lineTo(x - 3 * sc + walk * 3, y);
    c.moveTo(x + 3 * sc, y - 6 * sc); c.lineTo(x + 3 * sc - walk * 3, y); c.stroke();
    // 触手(身后)
    if (e.type === 'tentacle') {
      for (let k = 0; k < 4; k++) {
        const base = a + Math.PI + (k - 1.5) * 0.6;
        const wav = Math.sin(t * 3 + k * 1.7) * 0.6;
        const L = 20 + k % 2 * 6;
        c.strokeStyle = '#6e4038'; c.lineWidth = 4 - k * 0.5;
        c.beginPath(); c.moveTo(x, y - 14);
        c.quadraticCurveTo(x + Math.cos(base + wav) * L * .6, y - 14 + Math.sin(base + wav) * L * .4 - 8, x + Math.cos(base - wav) * L, y - 14 + Math.sin(base - wav) * L * .6 - 10);
        c.stroke();
      }
    }
    // 身体
    const by = y - 12 * sc;
    c.fillStyle = col;
    if (e.type === 'bloater') {
      SK.circle(c, x, by, 10 * sc * (1 + Math.sin(t * 2) * 0.03), rnd, .12, 14); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.8; c.stroke();
      c.fillStyle = '#b8b060'; for (let k = 0; k < 5; k++) { const aa = k * 1.3 + e.seed % 5, rr = 7 * sc; c.beginPath(); c.arc(x + Math.cos(aa) * rr * .7, by + Math.sin(aa) * rr * .6, 2.5, 0, 6.29); c.fill(); }
    } else {
      SK.circle(c, x, by, 7.5 * sc, rnd, .2, 10); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
      // 破衣服
      c.fillStyle = e.cloth; c.beginPath(); c.moveTo(x - 6 * sc, by - 2 * sc); c.lineTo(x + 6 * sc, by - 3 * sc); c.lineTo(x + 5 * sc, by + 5 * sc); c.lineTo(x + 1, by + 2 * sc); c.lineTo(x - 5 * sc, by + 6 * sc); c.closePath(); c.fill();
    }
    // 手臂向前伸
    const reach = e.attackT > 0 ? 1.4 : 1;
    const armL = (e.type === 'brute' || e.type === 'thrower' ? 15 : 11) * sc * .7 * reach;
    c.strokeStyle = col; c.lineWidth = (e.type === 'brute' ? 7 : e.type === 'thrower' ? 5 : 3);
    c.beginPath();
    c.moveTo(x - 4 * sc, by); c.lineTo(x - 4 * sc + Math.cos(a - 0.2) * armL, by + Math.sin(a - 0.2) * armL * .7 + walk);
    c.moveTo(x + 4 * sc, by); c.lineTo(x + 4 * sc + Math.cos(a + 0.2) * armL, by + Math.sin(a + 0.2) * armL * .7 - walk);
    c.stroke();
    c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    // 头
    const hr = e.type === 'brute' ? 5.5 : 5;
    const hx = x + Math.cos(e.tilt) * 1.5, hy = by - 9 * sc;
    c.fillStyle = '#a49a84'; SK.circle(c, hx, hy, hr, rnd, .2, 9); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.3; c.stroke();
    c.fillStyle = '#5a1a12'; c.fillRect(hx - 3, hy - 1, 2, 2); c.fillRect(hx + 1, hy - 1, 2, 2);
    // 投掷者举着的东西
    if (e.type === 'thrower' && e.hold) {
      const hold = e.holdT > 0 ? 1 - e.holdT / 1.1 : 1;
      c.fillStyle = e.hold.col; c.strokeStyle = INK; c.lineWidth = 1.5;
      c.fillRect(x - 9, hy - 10 - hold * 8, 18, 9); c.strokeRect(x - 9, hy - 10 - hold * 8, 18, 9);
    }
    // 触手鞭打
    if (e.type === 'tentacle' && e.lashT > 0) {
      const p = e.lashPhase; // 0~1 伸出
      const tx = R.sx(e.lashX), ty = R.sy(e.lashY) - 10;
      const ex = U.lerp(x, tx, p), ey = U.lerp(by, ty, p);
      c.strokeStyle = '#6e4038'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, by);
      c.quadraticCurveTo((x + ex) / 2 + Math.sin(t * 20) * 8, (by + ey) / 2 - 12, ex, ey); c.stroke();
      c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
    }
    if (e.windT > 0 && e.type === 'brute') { c.strokeStyle = 'rgba(190,40,30,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(x, by, 16, 0, 6.29); c.stroke(); }
    if (e.windT > 0 && e.type === 'tentacle') { c.strokeStyle = 'rgba(190,40,30,0.6)'; c.lineWidth = 2; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(x, by); c.lineTo(R.sx(e.lashX), R.sy(e.lashY) - 10); c.stroke(); c.setLineDash([]); }
    if (e.hitT > 0) { c.fillStyle = 'rgba(255,240,220,' + Math.min(.7, e.hitT * 4) + ')'; c.beginPath(); c.arc(x, by, 9 * sc, 0, 6.29); c.fill(); }
    if (e.stunT > 0) { c.fillStyle = '#f3d08a'; c.font = '12px KaiTi'; c.fillText('晕', x - 6, hy - 10); }
    // 血条(受伤后)
    if (e.hp < e.maxhp && (def.hp >= 150)) {
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(x - 14, hy - 14, 28, 4); c.fillStyle = '#c03a2a'; c.fillRect(x - 14, hy - 14, 28 * e.hp / e.maxhp, 4);
    }
    c.globalAlpha = 1;
  };

  R.drawCorpse = (d) => {
    const x = R.sx(d.x), y = R.sy(d.y);
    const rnd = U.rng(d.seed);
    c.save(); c.translate(x, y); c.rotate(d.rot);
    const s = d.size || 1;
    c.fillStyle = 'rgba(100,20,15,0.45)'; SK.circle(c, 0, 0, 12 * s, rnd, .5, 12); c.fill();
    c.fillStyle = d.col; c.beginPath(); c.ellipse(0, 0, 10 * s, 5 * s, 0, 0, 6.29); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#a49a84'; c.beginPath(); c.arc(11 * s, 0, 4 * s, 0, 6.29); c.fill(); c.stroke();
    c.restore();
    if (d.loot && !d.searched) { c.fillStyle = '#f3d08a'; c.font = 'bold 14px KaiTi'; c.fillText('?', x - 3, y - 10); }
  };

  R.drawProp = (p, t, near) => {
    const x = R.sx(p.x), y = R.sy(p.y);
    if (x < -80 || y < -80 || x > W + 80 || y > H + 80) return;
    const rnd = U.rng(p.seed || 99);
    if (p.type === 'car') {
      c.save(); c.translate(x, y); if (!p.horiz) c.rotate(Math.PI / 2);
      c.fillStyle = 'rgba(30,22,15,0.3)'; c.fillRect(-29, -12, 62, 28);
      c.fillStyle = p.color; c.beginPath(); c.roundRect(-30, -15, 60, 28, 7); c.fill();
      c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
      c.fillStyle = 'rgba(40,50,60,0.75)'; c.fillRect(-14, -12, 8, 22); c.fillRect(10, -12, 7, 22);
      c.fillStyle = U.shade(p.color, .85); c.fillRect(-5, -12, 14, 22);
      c.strokeStyle = 'rgba(90,50,30,0.5)'; c.lineWidth = 1; c.beginPath(); for (let k = 0; k < 3; k++) SK.line(c, -25 + rnd() * 40, -10 + rnd() * 18, -25 + rnd() * 40, -10 + rnd() * 18, rnd, 2); c.stroke();
      c.restore();
    } else if (p.type === 'ebike') {
      c.save(); c.translate(x, y); c.rotate(p.rot);
      c.strokeStyle = '#222'; c.lineWidth = 3; c.beginPath(); c.moveTo(-11, 0); c.lineTo(11, 0); c.stroke();
      c.fillStyle = p.color; c.fillRect(-12, -9, 10, 9); c.strokeStyle = INK; c.lineWidth = 1; c.strokeRect(-12, -9, 10, 9);
      c.restore();
    } else if (p.type === 'pile') {
      if (!p.items || !p.items.length) return;
      c.fillStyle = '#c8b48a'; c.strokeStyle = INK; c.lineWidth = 1.4; SK.circle(c, x, y - 4, 8, rnd || Math.random, .3, 8); c.fill(); c.stroke();
      c.fillStyle = INK; c.font = 'bold 10px KaiTi'; c.textAlign = 'center'; c.fillText('物', x, y - 1); c.textAlign = 'left'; return;
    } else if (p.type === 'locker') {
      c.fillStyle = '#3f8a5a'; c.fillRect(x - 13, y - 26, 26, 30); c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(x - 13, y - 26, 26, 30);
      c.strokeStyle = 'rgba(20,40,20,0.6)'; c.lineWidth = 1; c.beginPath(); for (let k = 1; k < 4; k++) { c.moveTo(x - 13, y - 26 + k * 7.5); c.lineTo(x + 13, y - 26 + k * 7.5); } c.moveTo(x, y - 26); c.lineTo(x, y + 4); c.stroke();
    }
    if (near && !p.searched) R.searchMark(x, y - 22, t);
  };
  R.searchMark = (x, y, t) => {
    c.fillStyle = 'rgba(243,208,138,0.95)'; c.strokeStyle = INK; c.lineWidth = 1.5;
    const b = Math.sin(t * 5) * 2;
    c.beginPath(); c.arc(x, y + b, 8, 0, 6.29); c.fill(); c.stroke();
    c.fillStyle = INK; c.font = 'bold 11px KaiTi'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('搜', x, y + b + 1); c.textAlign = 'left';
  };

  // ---------- 世界绘制 ----------
  R.drawWorld = (raid, t) => {
    const P = raid.player;
    const cam = R.cam;
    const shx = (Math.random() - .5) * cam.shake, shy = (Math.random() - .5) * cam.shake;
    cam.shake *= 0.88;
    c.save(); c.translate(shx, shy);
    c.fillStyle = '#e6dabd'; c.fillRect(0, 0, W, H);
    const M = G.M, CH = M.CH, CPX = M.CPX;
    const vx0 = cam.x - W / 2 / TS, vy0 = cam.y - H / 2 / TS;
    const cx0 = Math.floor(vx0 / CH), cy0 = Math.floor(vy0 / CH), cx1 = Math.floor((vx0 + W / TS) / CH), cy1 = Math.floor((vy0 + H / TS + 4) / CH);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      if (cx < 0 || cy < 0 || cx * CH >= M.w || cy * CH >= M.h) continue;
      c.drawImage(M.getGround(cx, cy), Math.round(R.sx(cx * CH)), Math.round(R.sy(cy * CH)));
    }
    // 贴花
    for (const d of raid.decals) {
      const x = R.sx(d.x), y = R.sy(d.y); if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
      if (d.type === 'blood') { c.fillStyle = d.col || 'rgba(110,25,20,0.5)'; SK.circle(c, x, y, d.r, U.rng(d.seed), .6, 10); c.fill(); }
      else if (d.type === 'corpse') R.drawCorpse(d);
      else if (d.type === 'bile') { c.fillStyle = 'rgba(150,160,60,' + (0.5 * Math.min(1, d.life / 3)) + ')'; SK.circle(c, x, y, d.r * TS, U.rng(d.seed), .4, 12); c.fill(); }
      else if (d.type === 'scorch') { c.fillStyle = 'rgba(30,25,20,0.35)'; SK.circle(c, x, y, d.r * TS, U.rng(d.seed), .4, 12); c.fill(); }
    }
    // 火
    for (const f of raid.fires) {
      const x = R.sx(f.x), y = R.sy(f.y);
      for (let k = 0; k < 10; k++) {
        const a = k * 0.63 + t, rr = (f.r * TS) * (0.3 + U.hash(k, f.seed, Math.floor(t * 10)) * 0.7);
        c.fillStyle = ['rgba(240,140,40,0.6)', 'rgba(250,200,60,0.55)', 'rgba(200,60,30,0.5)'][k % 3];
        c.beginPath(); c.ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6, 6, 10 + Math.sin(t * 12 + k) * 3, 0, 0, 6.29); c.fill();
      }
    }
    // 道具 & 门
    const near = M.nearContainers(P.x, P.y, 26);
    for (const p of near) {
      if (p.type === 'door') { if (!p.searched && U.d2(P.x, P.y, p.x, p.y) < 36) R.searchMark(R.sx(p.x), R.sy(p.y) - 8, t); }
      else R.drawProp(p, t, U.d2(P.x, P.y, p.x, p.y) < 36);
    }
    for (const p of raid.specialContainers) { if (p.type === 'airdrop') R.drawAirdrop(p, t); }
    // 撤离点
    for (const ex of raid.extracts) R.drawExtract(ex, t, raid);
    // 实体
    const ents = raid.visibleEntities;
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) R.drawEntity(e, t, raid);
    // 投射物(低空)
    for (const p of raid.projectiles) R.drawProjectile(p, t);
    // 建筑层
    bc.clearRect(0, 0, W, H);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      if (cx < 0 || cy < 0 || cx * CH >= M.w || cy * CH >= M.h) continue;
      bc.drawImage(M.getBuild(cx, cy, raid.night), Math.round(R.sx(cx * CH)), Math.round(R.sy(cy * CH)) - M.BTOP);
    }
    // 玩家附近挖空(透视)
    const px = R.sx(P.x), py = R.sy(P.y) - 12;
    bc.save(); bc.globalCompositeOperation = 'destination-out';
    const g = bc.createRadialGradient(px, py, 20, px, py, 105);
    g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    bc.fillStyle = g; bc.fillRect(px - 110, py - 110, 220, 220); bc.restore();
    c.drawImage(bcv, 0, 0);
    // 紧贴建筑南侧的实体需画在建筑前
    for (const e of ents) {
      const fx = Math.floor(e.x), fy = Math.floor(e.y);
      if (M.tile(fx, fy - 1) === M.T.BUILD || M.treeSet.has((fy - 1) * M.w + fx) || M.tile(fx, fy) === M.T.BUILD) R.drawEntity(e, t, raid);
    }
    // 空中投射物
    for (const p of raid.projectiles) if (p.arc) R.drawProjectile(p, t, true);
    // 弹道 / 粒子
    for (const tr of raid.tracers) {
      c.strokeStyle = tr.col || 'rgba(255,235,160,' + (tr.life / tr.max) + ')'; c.lineWidth = tr.w || 1.6;
      c.beginPath(); c.moveTo(R.sx(tr.x0), R.sy(tr.y0) - 12); c.lineTo(R.sx(tr.x1), R.sy(tr.y1) - 12); c.stroke();
    }
    for (const p of raid.particles) {
      c.fillStyle = p.col; c.globalAlpha = Math.max(0, p.life / p.max);
      c.fillRect(R.sx(p.x) - p.s / 2, R.sy(p.y) - p.z - p.s / 2, p.s, p.s);
    }
    c.globalAlpha = 1;
    for (const f of raid.floats) {
      c.font = (f.big ? 'bold 18px ' : 'bold 13px ') + 'KaiTi, serif'; c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,' + Math.min(1, f.life) + ')'; c.fillText(f.text, R.sx(f.x) + 1, R.sy(f.y) - 30 - (1.5 - f.life) * 20 + 1);
      c.fillStyle = f.col || '#fff3c8'; c.globalAlpha = Math.min(1, f.life); c.fillText(f.text, R.sx(f.x), R.sy(f.y) - 30 - (1.5 - f.life) * 20);
      c.globalAlpha = 1;
    }
    c.textAlign = 'left';
    c.restore();
    R.drawLighting(raid, t);
    if (raid.mods.rain) R.drawRain(t);
    // 纸张纹理
    c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = R.paperPat; c.fillRect(0, 0, W, H); c.restore();
    // 暗角
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(40,25,15,0)'); vg.addColorStop(1, 'rgba(40,25,15,0.45)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    // 低血量红晕
    if (P.hp / P.maxhp < 0.3) { c.fillStyle = 'rgba(160,20,10,' + (0.15 + Math.sin(t * 6) * 0.08) + ')'; c.fillRect(0, 0, W, H); }
    R.drawOffscreenMarkers(raid, t);
    R.drawCrosshair(raid);
  };

  R.drawEntity = (e, t, raid) => {
    if (e.kind === 'player') {
      const L = e.equip;
      const armorCol = { body_work: '#4a6a8a', body_leather: '#3a2a22', body_stab: '#2a3a4a', body_vest: '#3a4a3a' };
      const helmCol = { helm_delivery: '#e8c020', helm_moto: '#b8322a', helm_riot: '#2a3550' };
      R.drawHuman(e, t, { body: L.body ? armorCol[L.body.id] : '#6a7a8a', skin: '#d6b08a', helmet: L.helmet ? helmCol[L.helmet.id] : null, hair: '#1a1410', bag: L.bag ? '#5a5048' : null, weapon: e.curWeapon() });
    } else if (e.kind === 'bandit') {
      R.drawHuman(e, t, { body: '#3a4048', skin: '#c9a080', mask: '#a02a22', hair: '#111', weapon: e.weapon });
    } else if (e.kind === 'npc') {
      R.drawHuman(e, t, { body: '#8a6a4a', skin: '#d6b08a', hair: '#222', weapon: null });
      c.fillStyle = '#fff3c8'; c.font = 'bold 13px KaiTi'; c.textAlign = 'center'; c.fillText('幸存者', R.sx(e.x), R.sy(e.y) - 34); c.textAlign = 'left';
    } else R.drawZombie(e, t);
  };

  R.drawProjectile = (p, t, air) => {
    const x = R.sx(p.x), y = R.sy(p.y);
    const z = p.arc ? Math.sin(Math.PI * p.prog) * p.h * TS : 0;
    if (!air) { if (p.arc) { drawShadow(x, y, 6, 3); } return; }
    c.save(); c.translate(x, y - z - 8); c.rotate(t * 10);
    c.fillStyle = p.col || '#8a4a2a'; c.strokeStyle = INK; c.lineWidth = 1.2;
    const s = p.size || 6;
    c.fillRect(-s, -s * .6, s * 2, s * 1.2); c.strokeRect(-s, -s * .6, s * 2, s * 1.2);
    c.restore();
  };

  R.drawExtract = (ex, t, raid) => {
    const x = R.sx(ex.x), y = R.sy(ex.y);
    if (x < -100 || y < -100 || x > W + 100 || y > H + 100) return;
    c.strokeStyle = ex.open ? 'rgba(60,140,60,0.9)' : 'rgba(120,120,120,0.6)'; c.lineWidth = 3; c.setLineDash([8, 6]); c.lineDashOffset = -t * 20;
    c.beginPath(); c.arc(x, y, 1.6 * TS, 0, 6.29); c.stroke(); c.setLineDash([]);
    if (ex.open) { c.fillStyle = 'rgba(200,40,30,' + (0.6 + Math.sin(t * 8) * 0.3) + ')'; c.beginPath(); c.arc(x, y - 4, 4, 0, 6.29); c.fill(); }
    c.font = 'bold 15px KaiTi, serif'; c.textAlign = 'center'; c.fillStyle = '#1a2a1a'; c.fillText(ex.name, x + 1, y - 1.6 * TS - 5); c.fillStyle = ex.open ? '#d8f0c0' : '#ccc'; c.fillText(ex.name, x, y - 1.6 * TS - 6); c.textAlign = 'left';
    if (ex.kind === 'metro') { c.fillStyle = '#1f6fb0'; c.fillRect(x - 10, y - 10, 20, 20); c.fillStyle = '#fff'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('M', x, y + 5); c.textAlign = 'left'; }
    if (ex.kind === 'boat') { c.fillStyle = '#d06a1a'; c.beginPath(); c.moveTo(x - 16, y); c.lineTo(x + 16, y); c.lineTo(x + 10, y + 8); c.lineTo(x - 10, y + 8); c.closePath(); c.fill(); c.strokeStyle = INK; c.stroke(); }
    if (ex.kind === 'truck' || ex.kind === 'checkpoint') { c.fillStyle = '#4a5a3a'; c.fillRect(x - 18, y - 9, 36, 18); c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(x - 18, y - 9, 36, 18); c.fillStyle = '#c0302a'; c.fillRect(x - 3, y - 6, 6, 12); c.fillRect(x - 6, y - 3, 12, 6); }
  };
  R.drawAirdrop = (p, t) => {
    const x = R.sx(p.x), y = R.sy(p.y);
    c.fillStyle = '#5a6a3a'; c.fillRect(x - 12, y - 18, 24, 18); c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(x - 12, y - 18, 24, 18);
    c.fillStyle = '#e8e0c8'; c.font = 'bold 9px KaiTi'; c.textAlign = 'center'; c.fillText('救灾', x, y - 6); c.textAlign = 'left';
    if (!p.searched) { c.fillStyle = 'rgba(230,60,40,' + (0.4 + Math.sin(t * 6) * .3) + ')'; c.beginPath(); c.arc(x, y - 30, 5, 0, 6.29); c.fill(); }
  };

  // ---------- 光照 ----------
  R.drawLighting = (raid, t) => {
    let dark = raid.dark;
    if (dark <= 0.01) return;
    const P = raid.player;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, W, H);
    lc.fillStyle = raid.mods.rain ? 'rgba(12,18,30,' + dark + ')' : 'rgba(10,10,24,' + dark + ')';
    lc.fillRect(0, 0, W, H);
    lc.globalCompositeOperation = 'destination-out';
    const px = R.sx(P.x), py = R.sy(P.y) - 10;
    // 身边微光
    let g = lc.createRadialGradient(px, py, 5, px, py, 2.6 * TS);
    g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = g; lc.beginPath(); lc.arc(px, py, 2.6 * TS, 0, 6.29); lc.fill();
    // 手电光锥 (被建筑遮挡)
    const len = raid.flashRange, half = 0.36;
    lc.beginPath(); lc.moveTo(px, py);
    for (let i = 0; i <= 28; i++) {
      const a = P.aim - half + (i / 28) * half * 2;
      const d = G.M.ray(P.x, P.y - 0.3, a, len, G.M.isBlockSight);
      lc.lineTo(R.sx(P.x + Math.cos(a) * d), R.sy(P.y - 0.3 + Math.sin(a) * d) - 4);
    }
    lc.closePath();
    g = lc.createRadialGradient(px, py, 10, px, py, len * TS);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.7, 'rgba(0,0,0,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = g; lc.fill();
    // 其他光源
    for (const L of raid.lights) {
      const lx = R.sx(L.x), ly = R.sy(L.y);
      if (lx < -200 || ly < -200 || lx > W + 200 || ly > H + 200) continue;
      const rr = L.r * TS * (L.flicker ? (0.85 + Math.random() * 0.3) : 1);
      g = lc.createRadialGradient(lx, ly, 2, lx, ly, rr);
      g.addColorStop(0, 'rgba(0,0,0,' + (L.a || 0.9) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g; lc.beginPath(); lc.arc(lx, ly, rr, 0, 6.29); lc.fill();
    }
    lc.globalCompositeOperation = 'source-over';
    c.drawImage(lcv, 0, 0);
    // 暖色光晕
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const L of raid.lights) {
      if (!L.warm) continue;
      const lx = R.sx(L.x), ly = R.sy(L.y);
      g = c.createRadialGradient(lx, ly, 2, lx, ly, L.r * TS * 0.7);
      g.addColorStop(0, 'rgba(120,60,10,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(lx, ly, L.r * TS * 0.7, 0, 6.29); c.fill();
    }
    c.restore();
  };
  const drops = Array.from({ length: 260 }, () => [Math.random(), Math.random(), 0.6 + Math.random() * 0.6]);
  R.drawRain = (t) => {
    c.strokeStyle = 'rgba(200,215,230,0.35)'; c.lineWidth = 1; c.beginPath();
    for (const d of drops) {
      const x = ((d[0] * W + t * 120 * d[2]) % (W + 40)) - 20, y = ((d[1] * H + t * 900 * d[2]) % (H + 40)) - 20;
      c.moveTo(x, y); c.lineTo(x - 3, y + 14);
    }
    c.stroke();
  };

  R.drawOffscreenMarkers = (raid, t) => {
    const P = raid.player;
    const mark = (wx, wy, col, label) => {
      const x = R.sx(wx), y = R.sy(wy);
      if (x > 30 && y > 30 && x < W - 30 && y < H - 30) return;
      const a = Math.atan2(y - H / 2, x - W / 2);
      const ex = U.clamp(W / 2 + Math.cos(a) * W, 40, W - 40), ey = U.clamp(H / 2 + Math.sin(a) * H, 40, H - 40);
      c.save(); c.translate(ex, ey); c.rotate(a);
      c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(14, 0); c.lineTo(-6, -8); c.lineTo(-6, 8); c.closePath(); c.fill(); c.stroke(); c.restore();
      c.font = 'bold 13px KaiTi'; c.fillStyle = '#fff3c8'; c.textAlign = 'center';
      c.fillText(label + ' ' + Math.round(U.dist(P.x, P.y, wx, wy) * 4) + 'm', ex - Math.cos(a) * 30, ey - Math.sin(a) * 22 + 4); c.textAlign = 'left';
    };
    for (const ex of raid.extracts) if (ex.open) mark(ex.x, ex.y, '#7fc06a', '撤');
    for (const p of raid.specialContainers) if (!p.searched && p.type === 'airdrop' && p.marked) mark(p.x, p.y, '#e06a4a', '空投');
    if (raid.npc && !raid.npc.rescued) mark(raid.npc.x, raid.npc.y, '#e8d06a', '求救');
  };

  R.drawCrosshair = (raid) => {
    const m = G.input.mouse, P = raid.player;
    const sp = P.currentSpread ? P.currentSpread() : 0.05;
    const d = U.dist(P.x, P.y, ...R.toWorld(m.x, m.y));
    const rad = Math.max(6, Math.tan(sp) * d * TS);
    c.strokeStyle = 'rgba(255,245,220,0.9)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(m.x, m.y, rad, 0, 6.29); c.stroke();
    c.beginPath(); c.moveTo(m.x - rad - 5, m.y); c.lineTo(m.x - rad + 2, m.y); c.moveTo(m.x + rad - 2, m.y); c.lineTo(m.x + rad + 5, m.y);
    c.moveTo(m.x, m.y - rad - 5); c.lineTo(m.x, m.y - rad + 2); c.moveTo(m.x, m.y + rad - 2); c.lineTo(m.x, m.y + rad + 5); c.stroke();
    if (P.reloadT > 0) { c.strokeStyle = '#f3d08a'; c.lineWidth = 3; c.beginPath(); c.arc(m.x, m.y, rad + 8, -Math.PI / 2, -Math.PI / 2 + (1 - P.reloadT / P.reloadDur) * 6.28); c.stroke(); }
  };

  // ---------- 小地图 ----------
  R.drawMinimap = (raid, big) => {
    const mm = document.getElementById('minimap');
    const m = mm.getContext('2d');
    const P = raid.player, M = G.M;
    const S = 200, scale = 1.25, rad = S / 2 / scale;
    m.clearRect(0, 0, S, S);
    m.save(); m.beginPath(); m.arc(S / 2, S / 2, S / 2, 0, 6.29); m.clip();
    m.imageSmoothingEnabled = false;
    m.drawImage(M.miniBase, P.x - rad, P.y - rad, rad * 2, rad * 2, 0, 0, S, S);
    const tx = (wx) => (wx - P.x) * scale + S / 2, ty = (wy) => (wy - P.y) * scale + S / 2;
    for (const ex of raid.extracts) { m.fillStyle = ex.open ? '#2a8a2a' : '#888'; m.beginPath(); m.arc(tx(ex.x), ty(ex.y), 4, 0, 6.29); m.fill(); }
    for (const p of raid.specialContainers) if (!p.searched && p.marked) { m.fillStyle = '#d04a2a'; m.fillRect(tx(p.x) - 3, ty(p.y) - 3, 6, 6); }
    if (raid.npc && !raid.npc.rescued) { m.fillStyle = '#e0b020'; m.beginPath(); m.arc(tx(raid.npc.x), ty(raid.npc.y), 4, 0, 6.29); m.fill(); }
    for (const n of raid.noisePings) { m.strokeStyle = 'rgba(200,40,30,' + n.life + ')'; m.beginPath(); m.arc(tx(n.x), ty(n.y), (1 - n.life) * 10 + 2, 0, 6.29); m.stroke(); }
    m.font = '11px KaiTi'; m.fillStyle = '#2b2420';
    for (const l of M.landmarks) { const x = tx(l.x), y = ty(l.y); if (x > 0 && x < S && y > 0 && y < S) m.fillText(l.name, x - 18, y); }
    m.fillStyle = '#c0302a'; m.save(); m.translate(S / 2, S / 2); m.rotate(P.aim); m.beginPath(); m.moveTo(7, 0); m.lineTo(-4, -4); m.lineTo(-4, 4); m.closePath(); m.fill(); m.restore();
    m.restore();
  };

  // 全图(M键)
  R.drawBigMap = (raid) => {
    const M = G.M, P = raid.player;
    const s = Math.min((H - 80) / M.h, (W - 80) / M.w);
    const ox = (W - M.w * s) / 2, oy = (H - M.h * s) / 2;
    c.fillStyle = 'rgba(20,15,10,0.8)'; c.fillRect(0, 0, W, H);
    c.drawImage(M.miniBase, ox, oy, M.w * s, M.h * s);
    c.strokeStyle = '#2b2420'; c.lineWidth = 3; c.strokeRect(ox, oy, M.w * s, M.h * s);
    c.font = 'bold 14px KaiTi'; c.textAlign = 'center';
    for (const l of M.landmarks) { c.fillStyle = 'rgba(255,250,235,0.85)'; c.fillText(l.name, ox + l.x * s + 1, oy + l.y * s + 1); c.fillStyle = '#2b2420'; c.fillText(l.name, ox + l.x * s, oy + l.y * s); }
    for (const ex of raid.extracts) { c.fillStyle = ex.open ? '#2a8a2a' : '#777'; c.beginPath(); c.arc(ox + ex.x * s, oy + ex.y * s, 6, 0, 6.29); c.fill(); c.fillStyle = ex.open ? '#1a4a1a' : '#555'; c.fillText(ex.name + (ex.open ? '' : '(关闭)'), ox + ex.x * s, oy + ex.y * s - 9); }
    for (const p of raid.specialContainers) if (!p.searched && p.marked) { c.fillStyle = '#d04a2a'; c.fillRect(ox + p.x * s - 5, oy + p.y * s - 5, 10, 10); c.fillText('空投', ox + p.x * s, oy + p.y * s - 8); }
    if (raid.npc && !raid.npc.rescued) { c.fillStyle = '#e0b020'; c.beginPath(); c.arc(ox + raid.npc.x * s, oy + raid.npc.y * s, 6, 0, 6.29); c.fill(); }
    c.fillStyle = '#c0302a'; c.beginPath(); c.arc(ox + P.x * s, oy + P.y * s, 6, 0, 6.29); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#efe5cf'; c.font = '13px KaiTi'; c.fillText('南宁市 · 兴宁区/青秀区老城  ' + MAP_DATA.attribution + '  （M 关闭）', W / 2, oy + M.h * s + 22);
    c.textAlign = 'left';
  };

  G.R = R;
})();
