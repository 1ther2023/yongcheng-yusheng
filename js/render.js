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
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    // 镜头放大：人物和场景都画得更大更清楚
    R.Z = U.clamp(window.innerHeight / 600, 1.1, 2.0);
    W = Math.ceil(cv.width / R.Z); H = Math.ceil(cv.height / R.Z);
    bcv.width = W; bcv.height = H; lcv.width = W; lcv.height = H;
    R.W = W; R.H = H;
    if (c) R.paperPat = paper && c.createPattern(paper, 'repeat');
  };
  R.sx = (wx) => (wx - R.cam.x) * TS + W / 2;
  R.sy = (wy) => (wy - R.cam.y) * TS + H / 2;
  R.toWorld = (px, py) => [(px / R.Z - W / 2) / TS + R.cam.x, (py / R.Z - H / 2) / TS + R.cam.y];
  R.zoomOn = () => c.setTransform(R.Z, 0, 0, R.Z, 0, 0);
  R.zoomOff = () => c.setTransform(1, 0, 0, 1, 0, 0);

  // ---------- 角色绘制 ----------
  const INK = '#2b2420';
  function boilRnd(e, t) { return U.rng((e.seed || 1) + Math.floor(t * 8) * 7919); }

  function drawShadow(x, y, rx, ry) { c.fillStyle = 'rgba(30,22,15,0.30)'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.29); c.fill(); }
  // 带墨线的粗线条（四肢、棍棒）
  function inkLine(x1, y1, x2, y2, w, col) {
    c.lineCap = 'round';
    c.strokeStyle = INK; c.lineWidth = w + 2.4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function blob(x, y, r, col, lw = 1.8) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 6.29); c.fill(); c.strokeStyle = INK; c.lineWidth = lw; c.stroke(); }
  function rrect(x, y, w, h, r, col, lw = 1.8) { c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); c.strokeStyle = INK; c.lineWidth = lw; c.stroke(); }

  function drawWeapon(x, y, ang, w, e, t) {
    if (!w) return;
    const d = G.D.items[w.id];
    c.save(); c.translate(x, y);
    let a = ang;
    if (d.type === 'melee' && e.swingT > 0 && !d.chainsaw) {
      const p = 1 - e.swingT / e.swingDur, sd = e.swingSide || 1;
      a = ang - 1.25 * sd + p * 2.5 * sd;
    } else if (d.type === 'melee' && !d.chainsaw) a = ang - 0.55; // 待机时刀尖略抬
    c.rotate(a);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const steel = '#dfe4e8', edge = '#9aa3aa';
    if (d.type === 'gun') {
      const len = d.slot === 'primary' ? 22 : 13;
      c.fillStyle = '#26231f'; c.strokeStyle = INK; c.lineWidth = 1.2;
      c.beginPath(); c.roundRect(0, -2.6, len, 5.2, 1.5); c.fill(); c.stroke();
      if (d.slot === 'primary') { c.fillStyle = '#6a4a2e'; c.beginPath(); c.roundRect(-5, -2.8, 9, 5.6, 2); c.fill(); c.stroke(); c.fillStyle = '#26231f'; c.fillRect(7, 2, 4, 5); }
      else { c.fillStyle = '#26231f'; c.fillRect(1, 2, 4, 5); }
      if (w.id === 'nailgun') { c.fillStyle = '#e0a820'; c.beginPath(); c.roundRect(1, -5, 11, 9, 2); c.fill(); c.stroke(); }
      if (w.id === 'slingbow') { c.strokeStyle = '#4a3a2a'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(len - 4, -9); c.quadraticCurveTo(len + 3, 0, len - 4, 9); c.stroke(); }
    } else if (d.chainsaw) {
      rrect(-2, -6, 12, 12, 2, '#e07a1e', 1.4);
      c.fillStyle = '#aab0b4'; c.beginPath(); c.roundRect(10, -3.5, 20, 7, 3.5); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
      c.strokeStyle = '#333'; c.setLineDash([2, 2]); c.lineDashOffset = -t * 60; c.beginPath(); c.roundRect(10, -4, 20, 8, 4); c.stroke(); c.setLineDash([]);
    } else if (w.id === 'fruitknife') {
      inkLine(0, 0, 6, 0, 3.2, '#c8402a');
      c.fillStyle = steel; c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.moveTo(6, -2); c.lineTo(15, -1); c.lineTo(17, 0.6); c.lineTo(6, 2); c.closePath(); c.fill(); c.stroke();
    } else if (w.id === 'melonknife') {
      inkLine(0, 0, 6, 0, 3.4, '#3a2a1e');
      c.fillStyle = steel; c.strokeStyle = INK; c.lineWidth = 1.3; c.beginPath(); c.moveTo(6, -3.2); c.lineTo(23, -3.2); c.quadraticCurveTo(26, -1, 23, 3); c.lineTo(6, 3); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = edge; c.lineWidth = 1; c.beginPath(); c.moveTo(8, 1.6); c.lineTo(22, 1.6); c.stroke();
    } else if (w.id === 'woodstick') {
      inkLine(-3, 0, 25, 0, 3.8, '#9a6a3a');
      c.strokeStyle = 'rgba(70,40,15,0.6)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(4, -0.6); c.lineTo(12, -0.6); c.moveTo(15, 0.8); c.lineTo(22, 0.8); c.stroke();
    } else if (w.id !== 'fist') {
      const len = { cleaver: 12, pipe: 22, hammer: 13, baton: 16, shovel: 22, machete: 18, fireaxe: 20 }[w.id] || 14;
      inkLine(0, 0, len, 0, 3, w.id === 'pipe' || w.id === 'baton' ? '#8a8e90' : '#6a4426');
      c.fillStyle = steel; c.strokeStyle = INK; c.lineWidth = 1.2;
      if (w.id === 'cleaver') { c.beginPath(); c.roundRect(len - 7, -7, 11, 8, 1); c.fill(); c.stroke(); }
      if (w.id === 'machete') { c.beginPath(); c.moveTo(5, -1.5); c.lineTo(len + 5, -4.5); c.lineTo(len + 3, 2.5); c.lineTo(5, 2.5); c.closePath(); c.fill(); c.stroke(); }
      if (w.id === 'fireaxe') { c.fillStyle = '#c0362a'; c.beginPath(); c.moveTo(len - 4, -2); c.lineTo(len + 3, -10); c.lineTo(len + 5, 3); c.closePath(); c.fill(); c.stroke(); }
      if (w.id === 'hammer') { c.fillStyle = '#555'; c.beginPath(); c.roundRect(len - 2, -6, 6, 12, 1); c.fill(); c.stroke(); }
      if (w.id === 'shovel') { c.fillStyle = '#6a7a5a'; c.beginPath(); c.roundRect(len - 2, -5.5, 9, 11, 3); c.fill(); c.stroke(); }
    }
    c.restore();
  }

  // 挥砍刀光
  function drawSwing(e, cy) {
    const s = e.lastSwing; if (!s) return;
    const al = s.t / s.max, R0 = s.range * TS / 1.15;
    const a0 = s.aim - s.arc / 2, a1 = s.aim + s.arc / 2;
    c.fillStyle = 'rgba(255,250,228,' + (al * 0.55) + ')';
    c.beginPath(); c.arc(0, cy, R0, a0, a1); c.arc(0, cy, R0 * 0.55, a1, a0, true); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,' + (al * 0.9) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(0, cy, R0, a0, a1); c.stroke();
  }

  // 手绘人物（玩家 / 掠夺者 / 幸存者）
  R.drawHuman = (e, t, opts) => {
    const x = R.sx(e.x), y = R.sy(e.y);
    const S = 1.15;
    const ph = e.walkT * 11;
    const walk = e.moving ? Math.sin(ph) : 0;
    const bob = e.moving ? Math.abs(Math.cos(ph)) * 1.4 : Math.sin(t * 2.2) * 0.4;
    drawShadow(x, y + 1, 11, 4.8);
    c.save(); c.translate(x, y); c.scale(S, S);
    if (e.rollT > 0) { // 翻滚
      c.translate(0, -10); c.rotate(t * 22);
      blob(0, 0, 9, opts.body, 2); blob(5, -4, 5.5, opts.skin, 1.6);
      c.restore(); return;
    }
    const ca = Math.cos(e.aim), sa = Math.sin(e.aim);
    const up = sa < -0.35;
    const pants = opts.pants || '#2e3442';
    // 腿 + 鞋
    for (const k of [-1, 1]) {
      const sw = walk * k * 3.4;
      inkLine(k * 3.2, -10, k * 3.2 + sw, -2.5, 4.2, pants);
      c.fillStyle = '#1e1a18'; c.beginPath(); c.ellipse(k * 3.2 + sw + ca * 1.2, -1.6, 3, 2, 0, 0, 6.29); c.fill();
    }
    c.translate(0, -bob);
    const hx = ca * 10, hy = -16 + sa * 6;
    drawSwing(e, -15);
    if (up) drawWeapon(hx, hy, e.aim, opts.weapon, e, t);
    // 背包（面向下时在身后，露出一点）
    if (opts.bag && !up) rrect(-7, -24, 14, 7, 2, opts.bag, 1.4);
    // 躯干
    rrect(-7.5, -23, 15, 15, 5, opts.body, 2);
    c.fillStyle = 'rgba(0,0,0,0.16)'; c.beginPath(); c.roundRect(-7.5, -13, 15, 5, [0, 0, 5, 5]); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-5, -20); c.lineTo(-5, -14); c.stroke();
    if (opts.bag && up) { rrect(-6.5, -22, 13, 11, 3, opts.bag, 1.6); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -17); c.lineTo(6, -17); c.stroke(); }
    else if (opts.bag) { c.strokeStyle = U.shade(opts.bag, 0.8); c.lineWidth = 2; c.beginPath(); c.moveTo(-5, -23); c.lineTo(-4, -10); c.moveTo(5, -23); c.lineTo(4, -10); c.stroke(); }
    // 手臂
    const sleeve = opts.sleeve || opts.body;
    inkLine(-6, -20, hx - ca * 1 - sa * 2, hy + ca * 1.5, 3.4, sleeve);
    inkLine(6, -20, hx + sa * 2, hy - ca * 1.5, 3.4, sleeve);
    if (!up) drawWeapon(hx, hy, e.aim, opts.weapon, e, t);
    blob(hx, hy, 2.4, opts.skin, 1.2);
    // 头
    const hdx = ca * 0.8, hdy = -30;
    blob(hdx, hdy, 7.4, opts.skin, 2);
    if (opts.helmet) {
      c.fillStyle = opts.helmet; c.beginPath(); c.arc(hdx, hdy - 1, 8.2, Math.PI * 0.95, Math.PI * 2.05); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.8; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(hdx - 3, hdy - 5, 2.5, 1.4, -0.4, 0, 6.29); c.fill();
    } else if (opts.hair) {
      c.fillStyle = opts.hair; c.beginPath();
      if (up) { c.arc(hdx, hdy, 7.6, 0, 6.29); }
      else { c.arc(hdx, hdy - 0.5, 7.6, Math.PI * 0.98, Math.PI * 2.02); c.lineTo(hdx + 6, hdy - 2); c.lineTo(hdx + 2, hdy - 4); c.lineTo(hdx - 1, hdy - 2.5); c.lineTo(hdx - 4, hdy - 4); c.lineTo(hdx - 7, hdy - 1.5); }
      c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
    }
    if (!up) { // 眼睛
      const ex = hdx + ca * 2.6, ey = hdy + 1 + Math.max(0, sa) * 1.2;
      c.fillStyle = '#1a1412'; c.beginPath(); c.ellipse(ex - 2.6, ey, 1.1, 1.6, 0, 0, 6.29); c.ellipse(ex + 2.6, ey, 1.1, 1.6, 0, 0, 6.29); c.fill();
      c.fillStyle = 'rgba(220,110,90,0.35)'; c.beginPath(); c.arc(ex - 4.2, ey + 2.4, 1.4, 0, 6.29); c.arc(ex + 4.2, ey + 2.4, 1.4, 0, 6.29); c.fill();
    }
    if (opts.mask && !up) { c.fillStyle = opts.mask; c.beginPath(); c.roundRect(hdx - 6.5, hdy + 1.5, 13, 5, 2); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); }
    if (e.hitT > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.min(0.8, e.hitT * 3) + ')'; c.beginPath(); c.arc(0, -18, 14, 0, 6.29); c.fill(); }
    c.restore();
  };

  // 手绘丧尸与变异体
  R.drawZombie = (e, t) => {
    const def = G.D.enemies[e.type];
    const x = R.sx(e.x), y = R.sy(e.y);
    const col = e.col || def.color;
    const a = e.face;
    const ca = Math.cos(a), sa = Math.sin(a);
    let alpha = 1;
    if (e.type === 'crawler' && e.hidden) alpha = 0.35;
    c.globalAlpha = alpha;
    const sc = (e.type === 'brute' ? 1.85 : e.type === 'bloater' ? 1.45 : e.type === 'thrower' ? 1.25 : 1) * 1.12;
    const ph = e.walkT * (e.type === 'runner' ? 13 : 6.5);
    const walk = Math.sin(ph);
    drawShadow(x, y + 1, 10 * sc, 4.5 * sc);
    const skin = col, cloth = e.cloth || '#6a6a5a';
    c.save(); c.translate(x, y); c.scale(sc, sc);
    const up = sa < -0.35;
    if (e.type === 'crawler') {
      c.rotate(0);
      inkLine(-4, -4, -4 + ca * 10 - sa * 5 + walk * 2, -4 + sa * 6 + ca * 4, 3, skin);
      inkLine(4, -4, 4 + ca * 10 + sa * 5 - walk * 2, -4 + sa * 6 - ca * 4, 3, skin);
      c.fillStyle = cloth; c.beginPath(); c.ellipse(-ca * 3, -4, 9, 5.5, a, 0, 6.29); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.8; c.stroke();
      blob(ca * 7, -6 + sa * 3, 5.2, U.shade(skin, 1.15), 1.6);
      c.fillStyle = '#ff5030'; c.beginPath(); c.arc(ca * 9 - 1.8, -6.5 + sa * 3, 1, 0, 6.29); c.arc(ca * 9 + 1.8, -6.5 + sa * 3, 1, 0, 6.29); c.fill();
      c.restore(); c.globalAlpha = 1; return;
    }
    // 拖着脚的腿
    for (const k of [-1, 1]) inkLine(k * 3.3, -10, k * 3.3 + walk * k * 2.6, -2.5, 4, U.shade(cloth, 0.7));
    // 触手(身后)
    if (e.type === 'tentacle') {
      for (let k = 0; k < 4; k++) {
        const base = a + Math.PI + (k - 1.5) * 0.65, wav = Math.sin(t * 3 + k * 1.7) * 0.6, L = 18 + (k % 2) * 6;
        c.strokeStyle = INK; c.lineWidth = 6 - k * 0.6; c.lineCap = 'round';
        const path = () => { c.beginPath(); c.moveTo(0, -18); c.quadraticCurveTo(Math.cos(base + wav) * L * .6, -18 + Math.sin(base + wav) * L * .4 - 8, Math.cos(base - wav) * L, -18 + Math.sin(base - wav) * L * .6 - 10); };
        path(); c.stroke(); c.strokeStyle = '#8a4a40'; c.lineWidth = 3.8 - k * 0.6; path(); c.stroke();
      }
    }
    const lean = ca * 2.5; // 前倾
    const by = -16;
    if (e.type === 'bloater') {
      const r = 11 * (1 + Math.sin(t * 2) * 0.04);
      blob(lean * 0.5, by + 1, r, skin, 2);
      c.fillStyle = cloth; c.beginPath(); c.arc(lean * 0.5, by + 1, r, Math.PI * 1.1, Math.PI * 1.9); c.closePath(); c.fill();
      c.fillStyle = '#c8c060'; for (let k = 0; k < 6; k++) { const aa = k * 1.1 + (e.seed % 5), rr = r * 0.62; blob(lean * 0.5 + Math.cos(aa) * rr, by + 1 + Math.sin(aa) * rr * 0.8, 2.2, '#c8c060', 0.8); }
    } else {
      // 躯干 + 破衣服
      c.save(); c.translate(lean * 0.4, 0); c.rotate(ca * 0.12);
      rrect(-7.5, by - 7, 15, 15, 5, skin, 2);
      c.fillStyle = cloth; c.beginPath(); c.moveTo(-7.5, by - 4); c.lineTo(7.5, by - 5); c.lineTo(7.5, by + 4); c.lineTo(4, by + 7); c.lineTo(2, by + 3); c.lineTo(-1, by + 8); c.lineTo(-4, by + 4); c.lineTo(-7.5, by + 7); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 1.3; c.stroke();
      c.fillStyle = 'rgba(120,20,15,0.65)'; c.beginPath(); c.arc(-2 + (e.seed % 4), by - 1, 2.6, 0, 6.29); c.arc(3, by + 3, 1.6, 0, 6.29); c.fill();
      if (e.type === 'brute') { blob(-8, by - 5, 5, skin, 1.8); blob(8, by - 5, 5, skin, 1.8); }
      c.restore();
    }
    // 向前伸的手臂
    const reach = e.attackT > 0 ? 1.45 : 1;
    const armL = (e.type === 'brute' || e.type === 'thrower' ? 14 : 11) * reach;
    const aw = e.type === 'brute' ? 6 : e.type === 'thrower' ? 5 : 3.4;
    const sw = walk * 1.5;
    if (!(e.type === 'thrower' && e.hold)) {
      const lx = -5 + Math.cos(a - 0.25) * armL, ly = by - 3 + Math.sin(a - 0.25) * armL * 0.7 + sw;
      const rx = 5 + Math.cos(a + 0.25) * armL, ry = by - 3 + Math.sin(a + 0.25) * armL * 0.7 - sw;
      inkLine(-5, by - 4, lx, ly, aw, skin); inkLine(5, by - 4, rx, ry, aw, skin);
      c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); for (const [px, py] of [[lx, ly], [rx, ry]]) for (let k = -1; k <= 1; k++) { c.moveTo(px, py); c.lineTo(px + Math.cos(a + k * 0.5) * 3, py + Math.sin(a + k * 0.5) * 3); } c.stroke();
    } else {
      inkLine(-5, by - 4, -7, by - 20, aw, skin); inkLine(5, by - 4, 7, by - 20, aw, skin);
    }
    // 头（耷拉、前探）
    const hr = e.type === 'brute' ? 6 : e.type === 'bloater' ? 5.5 : 6.6;
    const hx = lean * 1.2 + Math.cos(e.tilt || 0) * 1.2, hy = (e.type === 'bloater' ? by - 12 : by - 12) + Math.abs(ca) * 1.5;
    blob(hx, hy, hr, U.shade(skin, 1.12), 1.9);
    c.fillStyle = 'rgba(40,30,20,0.55)'; c.beginPath(); c.arc(hx, hy - 1, hr, Math.PI * 1.05, Math.PI * 1.6); c.closePath(); c.fill();
    if (!up) {
      const ex = hx + ca * 2.2, ey = hy + 0.5 + Math.max(0, sa);
      c.fillStyle = '#ffdf70'; c.beginPath(); c.arc(ex - 2.4, ey, 1.6, 0, 6.29); c.arc(ex + 2.4, ey, 1.6, 0, 6.29); c.fill();
      c.fillStyle = '#d02010'; c.beginPath(); c.arc(ex - 2.4, ey, 0.9, 0, 6.29); c.arc(ex + 2.4, ey, 0.9, 0, 6.29); c.fill();
      c.strokeStyle = '#3a1410'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(ex - 2.5, ey + 3.3); c.lineTo(ex - 0.8, ey + 2.6); c.lineTo(ex + 0.8, ey + 3.6); c.lineTo(ex + 2.5, ey + 2.8); c.stroke();
    }
    if (e.type === 'thrower' && e.hold) {
      const hold = e.holdT > 0 ? 1 - e.holdT / 1.1 : 1;
      c.fillStyle = e.hold.col; c.strokeStyle = INK; c.lineWidth = 1.6;
      c.beginPath(); c.roundRect(-10, hy - 14 - hold * 7, 20, 10, 2); c.fill(); c.stroke();
    }
    if (e.hitT > 0) { c.fillStyle = 'rgba(255,240,220,' + Math.min(.75, e.hitT * 4) + ')'; c.beginPath(); c.arc(0, by - 3, 13, 0, 6.29); c.fill(); }
    c.restore();
    const BY = y + by * sc, HY = y + hy * sc;
    if (e.type === 'tentacle' && e.lashT > 0) {
      const p = e.lashPhase;
      const tx = R.sx(e.lashX), ty = R.sy(e.lashY) - 10;
      const ex = U.lerp(x, tx, p), ey = U.lerp(BY, ty, p);
      const path = () => { c.beginPath(); c.moveTo(x, BY); c.quadraticCurveTo((x + ex) / 2 + Math.sin(t * 20) * 8, (BY + ey) / 2 - 12, ex, ey); };
      c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 8.5; path(); c.stroke(); c.strokeStyle = '#8a4a40'; c.lineWidth = 6; path(); c.stroke();
    }
    if (e.windT > 0 && e.type === 'brute') { c.strokeStyle = 'rgba(210,40,30,0.85)'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, BY, 20, 0, 6.29); c.stroke(); }
    if (e.windT > 0 && e.type === 'tentacle') { c.strokeStyle = 'rgba(210,40,30,0.7)'; c.lineWidth = 2.5; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(x, BY); c.lineTo(R.sx(e.lashX), R.sy(e.lashY) - 10); c.stroke(); c.setLineDash([]); }
    if (e.stunT > 0) { c.fillStyle = '#f3d08a'; c.font = 'bold 12px KaiTi'; c.textAlign = 'center'; c.fillText('晕', x, HY - 12); c.textAlign = 'left'; }
    if (e.hp < e.maxhp) {
      const bw = def.hp >= 150 ? 30 : 20;
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - bw / 2, HY - 13 * sc, bw, 3.5); c.fillStyle = '#d0402a'; c.fillRect(x - bw / 2, HY - 13 * sc, bw * Math.max(0, e.hp) / e.maxhp, 3.5);
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
    R.zoomOn();
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
    // 道具
    const near = M.nearContainers(P.x, P.y, 26);
    for (const p of near) if (p.type !== 'door') R.drawProp(p, t, U.d2(P.x, P.y, p.x, p.y) < 36);
    for (const p of raid.specialContainers) { if (p.type === 'airdrop') R.drawAirdrop(p, t); }
    // 撤离点
    for (const ex of raid.extracts) R.drawExtract(ex, t, raid);
    // 投射物(低空)
    for (const p of raid.projectiles) if (!p.arc) R.drawProjectile(p, t);
    // 行道树 + 高楼
    G.C.drawTrees(c);
    G.C.draw(c, raid.night, t);
    // 实体：被楼挡住的只画半透明剪影
    const ents = raid.visibleEntities;
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) {
      const occ = e.kind !== 'player' && G.C.occluded(e.x, e.y);
      if (occ) { c.globalAlpha = 0.28; R.drawEntity(e, t, raid); c.globalAlpha = 1; }
      else R.drawEntity(e, t, raid);
    }
    // 门口的搜刮提示
    for (const p of near) if (p.type === 'door' && !p.searched && U.d2(P.x, P.y, p.x, p.y) < 36) R.searchMark(R.sx(p.x), R.sy(p.y) - 8, t);
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
    vg.addColorStop(0, 'rgba(40,25,15,0)'); vg.addColorStop(1, 'rgba(40,25,15,0.32)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    // 低血量红晕
    if (P.hp / P.maxhp < 0.3) { c.fillStyle = 'rgba(160,20,10,' + (0.15 + Math.sin(t * 6) * 0.08) + ')'; c.fillRect(0, 0, W, H); }
    R.drawOffscreenMarkers(raid, t);
    R.zoomOff();
    R.drawCrosshair(raid);
  };

  R.drawEntity = (e, t, raid) => {
    if (e.kind === 'player') {
      const L = e.equip;
      const armorCol = { body_work: '#3f74a8', body_leather: '#3a2a22', body_stab: '#2a3a4a', body_vest: '#3a4a3a' };
      const helmCol = { helm_delivery: '#e8c020', helm_moto: '#b8322a', helm_riot: '#2a3550' };
      R.drawHuman(e, t, { body: L.body ? armorCol[L.body.id] : '#e8e2d2', pants: '#34405a', skin: '#e2b88e', helmet: L.helmet ? helmCol[L.helmet.id] : null, hair: '#1a1410', bag: L.bag ? '#8a5e34' : null, weapon: e.curWeapon() });
    } else if (e.kind === 'bandit') {
      R.drawHuman(e, t, { body: '#3a4048', pants: '#2a2a2a', skin: '#c9a080', mask: '#a02a22', hair: '#111', weapon: e.weapon });
    } else if (e.kind === 'npc') {
      R.drawHuman(e, t, { body: '#c86a3a', pants: '#4a4038', skin: '#d6b08a', hair: '#222', weapon: null });
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
    const w = P.curWeapon && P.curWeapon(), isGun = w && G.D.items[w.id].type === 'gun';
    const rad = isGun ? Math.max(7, Math.tan(sp) * d * TS * R.Z) : 9;
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
    R.zoomOn();
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
    c.fillStyle = '#efe5cf'; c.font = '13px KaiTi'; c.fillText('南宁市 · 兴宁区/青秀区老城  ' + MAP_DATA.attribution + '  （点地图按钮或 M 关闭）', W / 2, oy + M.h * s + 22);
    c.textAlign = 'left';
    R.zoomOff();
  };


  // ================= 手绘素材版渲染（覆盖上面的程序化画法） =================
  const IMG = () => G.A.img;
  const WLEN = { fruitknife: 17, melonknife: 27, woodstick: 32, cleaver: 19, pipe: 32, fireaxe: 30, hammer: 19, shovel: 30, machete: 27, baton: 23, chainsaw: 32, nailgun: 15,
    pistol92: 15, revolver: 16, huntshot: 32, shotgun97: 31, smg05: 21, rifle95: 29, slingbow: 25 };
  const SH = { player: 58, h_bandit: 58, h_npc: 55, z_walker: 58, z_runner: 58, z_tentacle: 68, z_thrower: 68, z_brute: 100, z_bloater: 78 };

  function drawWeaponSpr(hx, hy, ang, w, e, t) {
    if (!w || w.id === 'fist') return;
    const d = G.D.items[w.id], im = IMG()['w_' + w.id]; if (!im) return;
    let a = ang;
    if (d.type === 'melee' && e.swingT > 0 && !d.chainsaw) { const p = 1 - e.swingT / e.swingDur, sd = e.swingSide || 1; a = ang - 1.3 * sd + p * 2.6 * sd; }
    else if (d.type === 'melee' && !d.chainsaw) a = ang + (Math.cos(ang) >= 0 ? -0.6 : 0.6);
    const L = (WLEN[w.id] || 20) * 1.3, H = im.height * L / im.width;
    const piv = d.type === 'gun' ? 0.3 : 0.12;
    c.save(); c.translate(hx, hy); c.rotate(a);
    if (Math.cos(a) < 0) c.scale(1, -1);
    if (d.type === 'gun' && e.fireCd > 0 && e.kind === 'player') c.translate(-1.5, 0); // 后坐
    if (d.chainsaw) c.translate(Math.random() - 0.5, Math.random() - 0.5);
    c.drawImage(im, -L * piv, -H * 0.5, L, H);
    c.restore();
  }

  function sprite(name, x, y, h, opts = {}) {
    const im = IMG()[name]; if (!im) return;
    const w = im.width * h / im.height;
    c.save(); c.translate(x, y);
    if (opts.rot) c.rotate(opts.rot);
    c.scale((opts.flip ? -1 : 1) * (opts.sx || 1), opts.sy || 1);
    c.drawImage(im, -w / 2, -h, w, h);
    if (opts.white > 0 && G.A.white[name]) { c.globalAlpha = Math.min(0.85, opts.white); c.drawImage(G.A.white[name], -w / 2, -h, w, h); c.globalAlpha = 1; }
    c.restore();
  }

  R.drawHuman = (e, t, opts) => {
    const x = R.sx(e.x), y = R.sy(e.y);
    const name = opts.spr || 'player', h = SH[name] || 58;
    const ph = e.walkT * 11;
    const walk = e.moving ? Math.sin(ph) : 0;
    const bob = e.moving ? Math.abs(Math.sin(ph)) * 2.2 : 0;
    const breath = e.moving ? 1 : 1 + Math.sin(t * 2.4) * 0.015;
    const ca = Math.cos(e.aim), sa = Math.sin(e.aim);
    const flip = ca < 0;
    drawShadow(x, y, 14, 5);
    if (e.rollT > 0) {
      const sp = (1 - e.rollT / 0.32) * Math.PI * 2 * (e.rollDx < 0 ? -1 : 1);
      c.save(); c.translate(x, y - h * 0.4); c.rotate(sp); sprite(name, 0, h * 0.4, h * 0.85, { flip }); c.restore();
      return;
    }
    const up = sa < -0.35;
    const hx = x + ca * 11, hy = y - h * 0.42 + sa * 6 - bob;
    c.save(); c.translate(x, y - bob); drawSwing(e, -h * 0.4); c.restore();
    if (up) drawWeaponSpr(hx, hy, e.aim, opts.weapon, e, t);
    sprite(name, x, y - bob, h, { flip, rot: walk * 0.07, sy: breath, white: e.hitT > 0 ? e.hitT * 3 : 0 });
    if (!up) drawWeaponSpr(hx, hy, e.aim, opts.weapon, e, t);
    if (opts.label) { c.font = 'bold 12px KaiTi, serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillText(opts.label, x + 1, y - h - 5); c.fillStyle = '#fff3c8'; c.fillText(opts.label, x, y - h - 6); c.textAlign = 'left'; }
  };

  R.drawZombie = (e, t) => {
    const def = G.D.enemies[e.type];
    const x = R.sx(e.x), y = R.sy(e.y);
    const name = 'z_' + e.type;
    const ca = Math.cos(e.face), flip = ca < 0;
    const fast = e.type === 'runner' || e.type === 'crawler';
    const ph = e.walkT * (fast ? 12 : 6);
    const walk = Math.sin(ph);
    const big = e.type === 'brute' ? 1.8 : e.type === 'bloater' ? 1.5 : e.type === 'thrower' || e.type === 'tentacle' ? 1.15 : 1;
    const var1 = 0.94 + ((e.seed || 7) % 13) / 100; // 个体大小差异
    c.globalAlpha = e.type === 'crawler' && e.hidden ? 0.35 : 1;
    drawShadow(x, y, 12 * big, 4.6 * big);
    const white = e.hitT > 0 ? e.hitT * 4 : 0;
    let h;
    if (e.type === 'crawler') {
      h = 30 * var1;
      sprite(name, x, y + 2, h, { flip, rot: walk * 0.04, white });
    } else {
      h = (SH[name] || 58) * var1;
      const lunge = e.attackT > 0 ? 0.18 : 0;
      const sway = walk * (e.type === 'brute' ? 0.05 : 0.09) + (flip ? -lunge : lunge);
      const bob = Math.abs(walk) * (fast ? 2.5 : 1.5);
      const puff = e.type === 'bloater' ? 1 + Math.sin(t * 2) * 0.03 : 1;
      sprite(name, x, y - bob, h, { flip, rot: sway, sx: puff, sy: 1 / puff, white });
    }
    const BY = y - h * 0.55, HY = y - h;
    if (e.type === 'thrower' && e.hold) {
      const hold = e.holdT > 0 ? 1 - e.holdT / 1.1 : 1;
      c.fillStyle = e.hold.col; c.strokeStyle = INK; c.lineWidth = 2;
      c.beginPath(); c.roundRect(x - 13, HY - 10 - hold * 8, 26, 12, 3); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(x - 10, HY - 8 - hold * 8, 14, 2.5);
    }
    if (e.type === 'tentacle' && e.lashT > 0) {
      const p = e.lashPhase;
      const tx = R.sx(e.lashX), ty = R.sy(e.lashY) - 10;
      const ex = U.lerp(x, tx, p), ey = U.lerp(BY, ty, p);
      const path = () => { c.beginPath(); c.moveTo(x, BY); c.quadraticCurveTo((x + ex) / 2 + Math.sin(t * 20) * 8, (BY + ey) / 2 - 12, ex, ey); };
      c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 8.5; path(); c.stroke(); c.strokeStyle = '#7a2a28'; c.lineWidth = 6; path(); c.stroke();
      c.strokeStyle = 'rgba(255,160,150,0.4)'; c.lineWidth = 1.5; path(); c.stroke();
    }
    if (e.windT > 0 && e.type === 'brute') { c.strokeStyle = 'rgba(210,40,30,0.85)'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, y, 26, 10, 0, 0, 6.29); c.stroke(); }
    if (e.windT > 0 && e.type === 'tentacle') { c.strokeStyle = 'rgba(210,40,30,0.7)'; c.lineWidth = 2.5; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(x, BY); c.lineTo(R.sx(e.lashX), R.sy(e.lashY) - 10); c.stroke(); c.setLineDash([]); }
    if (e.stunT > 0) { c.fillStyle = '#f3d08a'; c.font = 'bold 12px KaiTi'; c.textAlign = 'center'; c.fillText('晕', x, HY - 6); c.textAlign = 'left'; }
    if (e.hp < e.maxhp) {
      const bw = def.hp >= 150 ? 30 : 20;
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - bw / 2, HY - 4, bw, 3.5); c.fillStyle = '#d0402a'; c.fillRect(x - bw / 2, HY - 4, bw * Math.max(0, e.hp) / e.maxhp, 3.5);
    }
    c.globalAlpha = 1;
  };

  R.drawEntity = (e, t, raid) => {
    if (e.kind === 'player') R.drawHuman(e, t, { spr: 'player', weapon: e.curWeapon() });
    else if (e.kind === 'bandit') R.drawHuman(e, t, { spr: 'h_bandit', weapon: e.weapon });
    else if (e.kind === 'npc') R.drawHuman(e, t, { spr: 'h_npc', weapon: null, label: '幸存者' });
    else R.drawZombie(e, t);
  };

  R.drawCorpse = (d) => {
    const x = R.sx(d.x), y = R.sy(d.y);
    const im = IMG().corpse;
    const s = d.size || 1;
    if (im) { const w = 46 * s, h = im.height * w / im.width; c.save(); c.translate(x, y); if (d.rot > 3.14) c.scale(-1, 1); c.drawImage(im, -w / 2, -h / 2, w, h); c.restore(); }
    if (d.loot && !d.searched) R.searchMark(x, y - 16, performance.now() / 1000);
  };

  R.drawProp = (p, t, near) => {
    const x = R.sx(p.x), y = R.sy(p.y);
    if (x < -80 || y < -80 || x > W + 80 || y > H + 80) return;
    const flip = (p.seed || 1) % 2 === 0;
    if (p.type === 'car') { drawShadow(x, y + 6, 34, 9); sprite('p_car', x, y + 12, 36, { flip }); if (p.color && p.color !== '#e8e4d8') { /* 不同车色用色调区分 */ } }
    else if (p.type === 'ebike') { drawShadow(x, y, 14, 4); sprite('p_ebike', x, y + 2, 30, { flip }); }
    else if (p.type === 'locker') { drawShadow(x, y + 1, 13, 4); sprite('p_locker', x, y + 3, 40); }
    else if (p.type === 'pile') { if (!p.items || !p.items.length) return; drawShadow(x, y, 12, 4); sprite('p_pile', x, y + 3, 22); }
    if (near && !p.searched) R.searchMark(x, y - (p.type === 'locker' ? 44 : 34), t);
  };
  R.drawAirdrop = (p, t) => {
    const x = R.sx(p.x), y = R.sy(p.y);
    drawShadow(x, y, 18, 5); sprite('p_airdrop', x, y + 4, 30);
    if (!p.searched) { c.fillStyle = 'rgba(230,60,40,' + (0.4 + Math.sin(t * 6) * .3) + ')'; c.beginPath(); c.arc(x, y - 38, 5, 0, 6.29); c.fill(); }
  };

  // ================= 骨骼动画版角色 =================
  const RIGH = { player: 64, bandit: 64, npc: 60, walker: 64, runner: 64, tentacle: 68, thrower: 72, brute: 104 };
  const ease = (q) => q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
  function wepOf(w) {
    if (!w || w.id === 'fist') return null;
    const im = IMG()['w_' + w.id]; if (!im) return null;
    const L = (WLEN[w.id] || 20) * 1.3; const d = G.D.items[w.id];
    return { img: im, L, H: im.height * L / im.width, piv: d.type === 'gun' ? 0.3 : 0.1, d };
  }
  function armAim(pose, al, twoHand, e) {
    const aArm = Math.PI / 2 - al;
    pose.uaF = aArm - 0.2; pose.faF = 0.2;
    if (twoHand) { pose.uaB = aArm - 0.45; pose.faB = 0.6; }
    if (e.fireCd > 0 && e.kind === 'player') pose.uaF -= 0.1;
  }
  R.drawHuman = (e, t, opts) => {
    const rig = opts.rig || 'player';
    if (!G.RIG.has(rig)) return;
    const x = R.sx(e.x), y = R.sy(e.y), Hh = RIGH[rig] || 64;
    const flip = Math.cos(e.aim) < 0;
    const al = flip ? Math.PI - e.aim : e.aim; // 本地朝右的瞄准角
    const pose = {};
    const ph = e.walkT * (e.sprinting ? 13 : 11);
    if (e.moving) G.RIG.walk(ph, 1, pose); else G.RIG.idle(t + (e.seed || 0), pose);
    const wp = wepOf(opts.weapon);
    const white = e.hitT > 0 ? e.hitT * 3 : 0;
    drawShadow(x, y, 15, 5);
    if (e.rollT > 0) {
      const q = 1 - e.rollT / 0.32;
      Object.assign(pose, { thF: 1.7, shF: -2.3, thB: 1.4, shB: -2.1, uaF: 1.3, faF: 1.6, uaB: 1.0, faB: 1.6, crouch: 0.75, lean: 0.6, head: 0.5 });
      c.save(); c.translate(x, y - Hh * 0.32); c.rotate(q * Math.PI * 2 * (flip ? -1 : 1));
      G.RIG.draw(c, rig, 0, Hh * 0.32, Hh * 0.95, pose, flip, white); c.restore();
      return;
    }
    if (wp) {
      const d = wp.d; pose.wep = Object.assign({}, wp);
      if (d.type === 'gun' || d.chainsaw) {
        armAim(pose, al, d.twoHand !== false && wp.L > 26, e);
        pose.wep.rel = Math.PI / 2 - 0.2;
        pose.head = (Math.PI / 2 - (Math.PI / 2 - al)) * 0.25;
        if (d.chainsaw) pose.wep.rel += (Math.random() - 0.5) * 0.06;
      } else if (e.swingT > 0) { // 劈砍：举过头顶 → 狠狠劈下
        const q = 1 - e.swingT / e.swingDur, sd = e.swingSide || 1;
        const aArm = Math.PI / 2 - al;
        const k = q < 0.18 ? -q / 0.18 * 0.25 : ease((q - 0.18) / 0.82);
        if (sd > 0) { pose.uaF = aArm + 1.7 - 2.9 * k; pose.faF = 0.5 - 0.4 * k; }
        else { pose.uaF = aArm - 1.0 + 2.4 * k; pose.faF = 0.2 + 0.3 * k; }
        pose.uaB = -0.3 + 0.6 * k; pose.faB = 0.6;
        pose.wep.rel = Math.PI / 2 - 0.35;
        pose.lean = 0.12 + 0.3 * Math.sin(Math.min(1, q) * Math.PI);
        pose.thF = 0.45; pose.shF = -0.2; pose.thB = -0.35; pose.shB = -0.3; pose.bob = 0;
        pose.head = 0.15;
      } else { // 持刀戒备
        pose.uaF = 0.55 + (pose.uaF || 0) * 0.3; pose.faF = 1.0; pose.wep.rel = 0.35;
      }
    } else if (rig === 'npc' && !e.moving && !e.rescued) { pose.uaF = 2.7 + Math.sin(t * 9) * 0.35; pose.faF = 0.3; }
    else if (opts.weapon && opts.weapon.id === 'fist' && e.swingT > 0) { const q = 1 - e.swingT / e.swingDur; armAim(pose, al, false, e); pose.uaF -= Math.sin(q * Math.PI) * 0.0; pose.faF = 1.2 * (1 - Math.sin(q * Math.PI)); pose.lean = 0.25 * Math.sin(q * Math.PI); }
    if (e.hitT > 0) { pose.lean = (pose.lean || 0) - e.hitT * 2.2; pose.head = (pose.head || 0) - e.hitT * 2; }
    c.save(); c.translate(x, y); drawSwing(e, -Hh * 0.45); c.restore();
    G.RIG.draw(c, rig, x, y, Hh, pose, flip, white);
    if (opts.label) { c.font = 'bold 12px KaiTi, serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillText(opts.label, x + 1, y - Hh - 5); c.fillStyle = '#fff3c8'; c.fillText(opts.label, x, y - Hh - 6); c.textAlign = 'left'; }
  };

  const drawZombieSprite = R.drawZombie;
  function zombiePose(e, t) {
    const fast = e.type === 'runner';
    const ph = e.walkT * (fast ? 12 : 6.5) + (e.seed % 7);
    const pose = {};
    const amp = e.moving ? (fast ? 1.15 : e.type === 'brute' ? 0.55 : 0.6) : 0.12;
    G.RIG.walk(ph, amp, pose);
    const sw = Math.sin(ph * 0.5 + (e.seed % 5));
    if (e.type === 'walker' || e.type === 'tentacle') {
      pose.thB *= 0.55; // 拖着一条腿
      pose.uaF = 1.35 + 0.15 * sw; pose.faF = 0.12; pose.uaB = 1.15 - 0.15 * sw; pose.faB = 0.2;
      pose.lean = 0.25; pose.head = 0.3 + 0.12 * Math.sin(ph * 0.7);
      if (e.type === 'tentacle') { pose.uaF = 0.3 + 0.1 * sw; pose.uaB = 0.2; pose.faF = 0.4; }
    } else if (fast) {
      pose.uaF *= 1.8; pose.uaB *= 1.8; pose.faF = 1.2; pose.faB = 1.2; pose.lean = 0.5; pose.head = 0.35;
    } else if (e.type === 'brute') {
      pose.uaF = 0.2 + 0.25 * Math.sin(ph); pose.uaB = 0.2 - 0.25 * Math.sin(ph); pose.faF = 0.25; pose.faB = 0.25; pose.lean = 0.3; pose.head = 0.2;
      if (e.windT > 0) { pose.uaF = 2.9; pose.uaB = 2.7; pose.faF = 0.5; pose.faB = 0.5; pose.lean = -0.2; pose.head = -0.3; }
    } else if (e.type === 'thrower') {
      pose.uaF = 0.15 + 0.2 * Math.sin(ph); pose.faF = 0.2; pose.uaB = 0.4; pose.faB = 0.5; pose.lean = 0.2;
      if (e.hold) { const k = e.holdT > 0 ? 1 - e.holdT / 1.1 : 1; pose.uaF = 0.2 + 2.7 * k; pose.faF = 0.4; pose.lean = -0.15 * k; }
    }
    if (e.attackT > 0) {
      const dur = e.type === 'brute' ? 0.55 : 0.35, q = 1 - e.attackT / dur;
      const k = ease(Math.min(1, q));
      if (e.type === 'brute') { pose.uaF = 2.9 - 2.5 * k; pose.uaB = 2.7 - 2.4 * k; pose.lean = -0.2 + 0.7 * k; }
      else if (e.type === 'thrower') { pose.uaF = 2.8 - 2.3 * k; pose.lean = 0.45 * k; }
      else { pose.uaF = 2.4 - 1.9 * k; pose.faF = 0.6 - 0.5 * k; pose.uaB = 2.0 - 1.4 * k; pose.lean = 0.2 + 0.4 * k; pose.thF = 0.5; }
    }
    if (e.stunT > 0) { pose.lean = -0.1; pose.head = Math.sin(t * 6) * 0.3; pose.uaF = 0.1; pose.uaB = 0.05; }
    if (e.hitT > 0) { pose.lean = (pose.lean || 0) - e.hitT * 3; pose.head = (pose.head || 0) - e.hitT * 3; }
    return pose;
  }
  R.drawZombie = (e, t) => {
    if (!G.RIG.has(e.type)) { // 爬行者、肿胀者：整图 + 形变动画
      const x = R.sx(e.x), y = R.sy(e.y);
      if (e.type === 'crawler') {
        const ph = e.walkT * 12, k = Math.sin(ph);
        c.globalAlpha = e.hidden ? 0.35 : 1; drawShadow(x, y, 16, 5);
        sprite('z_crawler', x + k * 1.5, y + 2, 30 * (1 + 0.06 * Math.max(0, k)), { flip: Math.cos(e.face) < 0, rot: k * 0.06, sx: 1 + 0.1 * k, sy: 1 - 0.06 * k, white: e.hitT > 0 ? e.hitT * 4 : 0 });
        c.globalAlpha = 1;
        if (e.hp < e.maxhp) { c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - 10, y - 34, 20, 3.5); c.fillStyle = '#d0402a'; c.fillRect(x - 10, y - 34, 20 * Math.max(0, e.hp) / e.maxhp, 3.5); }
        return;
      }
      return drawZombieSprite(e, t);
    }
    const def = G.D.enemies[e.type];
    const x = R.sx(e.x), y = R.sy(e.y);
    const Hh = (RIGH[e.type] || 64) * (0.94 + ((e.seed || 7) % 13) / 100);
    const flip = Math.cos(e.face) < 0;
    drawShadow(x, y, e.type === 'brute' ? 26 : 15, e.type === 'brute' ? 8 : 5);
    G.RIG.draw(c, e.type, x, y, Hh, zombiePose(e, t), flip, e.hitT > 0 ? e.hitT * 4 : 0);
    const BY = y - Hh * 0.55, HY = y - Hh;
    if (e.type === 'thrower' && e.hold) {
      const k = e.holdT > 0 ? 1 - e.holdT / 1.1 : 1;
      c.fillStyle = e.hold.col; c.strokeStyle = INK; c.lineWidth = 2;
      c.beginPath(); c.roundRect(x - 14 + (flip ? -6 : 6), HY - 12 - k * 6, 28, 13, 3); c.fill(); c.stroke();
    }
    if (e.type === 'tentacle') { // 背后触手常态蠕动
      for (let i = 0; i < 3; i++) {
        const bx = x + (flip ? 6 : -6), by = BY - 6 + i * 4, a = (flip ? -0.6 : -2.5) + Math.sin(t * 3 + i * 2) * 0.4 + i * 0.3 * (flip ? 1 : -1);
        c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + Math.cos(a) * 10, by + Math.sin(a) * 14 - 6, bx + Math.cos(a + 0.5) * 18, by + Math.sin(a + 0.5) * 18 - 4); c.stroke();
        c.strokeStyle = '#7a2a28'; c.lineWidth = 3; c.stroke();
      }
    }
    if (e.type === 'tentacle' && e.lashT > 0) {
      const p = e.lashPhase, tx = R.sx(e.lashX), ty = R.sy(e.lashY) - 10;
      const ex = U.lerp(x, tx, p), ey = U.lerp(BY, ty, p);
      const path = () => { c.beginPath(); c.moveTo(x, BY); c.quadraticCurveTo((x + ex) / 2 + Math.sin(t * 20) * 8, (BY + ey) / 2 - 12, ex, ey); };
      c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 8.5; path(); c.stroke(); c.strokeStyle = '#7a2a28'; c.lineWidth = 6; path(); c.stroke();
    }
    if (e.windT > 0 && e.type === 'brute') { c.strokeStyle = 'rgba(210,40,30,0.85)'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, y, 30, 11, 0, 0, 6.29); c.stroke(); }
    if (e.windT > 0 && e.type === 'tentacle') { c.strokeStyle = 'rgba(210,40,30,0.7)'; c.lineWidth = 2.5; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(x, BY); c.lineTo(R.sx(e.lashX), R.sy(e.lashY) - 10); c.stroke(); c.setLineDash([]); }
    if (e.stunT > 0) { c.fillStyle = '#f3d08a'; c.font = 'bold 12px KaiTi'; c.textAlign = 'center'; c.fillText('晕', x, HY - 8); c.textAlign = 'left'; }
    if (e.hp < e.maxhp) {
      const bw = def.hp >= 150 ? 30 : 20;
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - bw / 2, HY - 5, bw, 3.5); c.fillStyle = '#d0402a'; c.fillRect(x - bw / 2, HY - 5, bw * Math.max(0, e.hp) / e.maxhp, 3.5);
    }
  };
  R.drawEntity = (e, t, raid) => {
    if (e.kind === 'player') R.drawHuman(e, t, { rig: 'player', weapon: e.curWeapon() });
    else if (e.kind === 'bandit') R.drawHuman(e, t, { rig: 'bandit', weapon: e.weapon });
    else if (e.kind === 'npc') R.drawHuman(e, t, { rig: 'npc', weapon: null, label: '幸存者' });
    else R.drawZombie(e, t);
  };
  const drawCorpseSprite = R.drawCorpse;
  R.drawCorpse = (d) => {
    if (!d.rig || !G.RIG.has(d.rig)) return drawCorpseSprite(d);
    const x = R.sx(d.x), y = R.sy(d.y);
    const age = (performance.now() - (d.born || 0)) / 1000;
    const q = d.born ? Math.min(1, age / 0.45) : 1;
    const k = q < 1 ? q * q : 1; // 倒地加速
    const flip = (d.seed || 0) % 2 === 0;
    const Hh = (RIGH[d.rig] || 64);
    c.fillStyle = 'rgba(95,18,14,' + (0.55 * Math.min(1, age / 1.5 + (d.born ? 0 : 1))) + ')';
    c.beginPath(); c.ellipse(x + (flip ? -1 : 1) * Hh * 0.35, y + 2, Hh * 0.38 * Math.min(1, 0.3 + age / 2), Hh * 0.12, 0, 0, 6.29); c.fill();
    const pose = { lay: Math.PI / 2 * k, thF: 0.25, shF: -0.3, thB: -0.1, shB: -0.5, uaF: 0.9 * k + 0.1, faF: 0.4, uaB: 1.6 * k, faB: 0.3, head: 0.4 * k, lean: 0 };
    c.save(); c.globalAlpha = 0.95;
    G.RIG.draw(c, d.rig, x, y, Hh, pose, flip, q < 1 ? (1 - q) * 0.6 : 0);
    c.restore();
    if (d.loot && !d.searched) R.searchMark(x, y - 16, performance.now() / 1000);
  };

  G.R = R;
})();
