// ===== 南宁地图：解码、碰撞、视线、寻路、分块手绘渲染 =====
(function () {
  const U = G.U, SK = G.SK, TS = U.TS;
  const T = { GROUND: 0, ROAD: 1, MAJOR: 2, WATER: 3, GRASS: 4, TREE: 5, BUILD: 6, RAIL: 7, ALLEY: 8, PLAZA: 9 };
  const M = { T };
  const MD = window.MAP_DATA;

  function unrle(b64, n) {
    const bin = atob(b64);
    const out = new Uint16Array(n);
    let p = 0;
    for (let i = 0; i < bin.length; i += 4) {
      const v = bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8);
      const c = bin.charCodeAt(i + 2) | (bin.charCodeAt(i + 3) << 8);
      out.fill(v, p, p + c); p += c;
    }
    return out;
  }

  M.init = () => {
    M.w = MD.w; M.h = MD.h;
    const n = M.w * M.h;
    M.grid = Uint8Array.from(unrle(MD.grid, n));
    M.bid = unrle(MD.bid, n);
    M.buildings = MD.buildings.map((b, i) => b ? { k: b[0], h: b[1], n: b[2], a: b[3], id: i } : null);
    M.solid = new Uint8Array(n);       // 1 阻挡移动
    M.bulletBlock = new Uint8Array(n); // 1 阻挡子弹
    for (let i = 0; i < n; i++) {
      const t = M.grid[i];
      if (t === T.BUILD) { M.solid[i] = 1; M.bulletBlock[i] = 1; }
      else if (t === T.WATER) M.solid[i] = 1;
    }
    M.trees = MD.trees;
    M.treeSet = new Set(MD.trees.map(t => t[1] * M.w + t[0]));
    M.landmarks = MD.landmarks.map(l => ({ name: l[0], x: l[1], y: l[2], danger: l[3] }));
    M.extractsDef = MD.extracts.map(e => ({ name: e[0], x: e[1] + 0.5, y: e[2] + 0.5, kind: e[3] }));
    M.deploys = MD.deploys.map(d => ({ name: d[0], x: d[1] + 0.5, y: d[2] + 0.5 }));
    M.roadLabels = MD.roads;
    M.genProps();
    M.chunkG = new Map(); M.chunkB = new Map();
    M.flow = null;
  };

  M.idx = (x, y) => y * M.w + x;
  M.inb = (x, y) => x >= 0 && y >= 0 && x < M.w && y < M.h;
  M.tile = (x, y) => M.inb(x, y) ? M.grid[y * M.w + x] : T.BUILD;
  M.isSolid = (x, y) => !M.inb(x, y) || M.solid[y * M.w + x] === 1;
  M.isBlockBullet = (x, y) => !M.inb(x, y) || M.bulletBlock[y * M.w + x] === 1;
  M.isBlockSight = (x, y) => !M.inb(x, y) || M.grid[y * M.w + x] === T.BUILD;
  M.bidAt = (x, y) => M.inb(x, y) ? M.bid[y * M.w + x] : 0;
  M.walkable = (x, y) => M.inb(x, y) && M.solid[y * M.w + x] === 0;

  // ---------- 场景道具：废弃车辆、外卖电动车、快递柜 ----------
  M.genProps = () => {
    const r = U.rng(6280);
    M.props = []; // 静态道具，也是可搜索容器
    const w = M.w, h = M.h;
    const isRoad = (x, y) => { const t = M.tile(x, y); return t === T.ROAD || t === T.MAJOR; };
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      const t = M.grid[y * w + x];
      if ((t === T.ROAD || t === T.MAJOR) && U.hash(x, y, 11) < 0.012) {
        const horiz = isRoad(x - 2, y) && isRoad(x + 2, y) ? (isRoad(x, y - 2) && isRoad(x, y + 2) ? r() < .5 : true) : false;
        const x2 = horiz ? x + 1 : x, y2 = horiz ? y : y + 1;
        if (!isRoad(x2, y2) || M.solid[y * w + x] || M.solid[y2 * w + x2]) continue;
        // 周围留空，避免堵死道路
        let crowd = 0; for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) if (M.solid[yy * w + xx]) crowd++;
        if (crowd > 0) continue;
        M.solid[y * w + x] = M.solid[y2 * w + x2] = 1;
        M.bulletBlock[y * w + x] = M.bulletBlock[y2 * w + x2] = 1;
        const cx = (x + x2) / 2 + 0.5, cy = (y + y2) / 2 + 0.5;
        M.props.push({ type: 'car', x: cx, y: cy, horiz, color: U.pick(['#b8423a', '#e8e4d8', '#3d5a7a', '#2e2e2e', '#c8b28a', '#6c7a5c', '#a0a4a8']), seed: (r() * 1e9) | 0, kind: 'car' });
      } else if (t === T.GROUND || t === T.ALLEY) {
        const hv = U.hash(x, y, 23);
        if (hv < 0.004) {
          M.props.push({ type: 'ebike', x: x + .5, y: y + .5, rot: r() * 6.28, seed: (r() * 1e9) | 0, kind: 'ebike', color: U.pick(['#d8b02a', '#3a7ac8', '#e8e4d8']) });
        } else if (hv < 0.0055) {
          // 快递柜靠墙
          let ok = false;
          for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0]]) { const b = M.bidAt(x + dx, y + dy); if (b && ['residential', 'village', 'office'].includes(M.buildings[b].k)) ok = true; }
          if (ok) M.props.push({ type: 'locker', x: x + .5, y: y + .5, seed: (r() * 1e9) | 0, kind: 'locker' });
        }
      }
    }
    // 建筑门
    M.doors = MD.doors.map(d => ({ type: 'door', x: d[0] + .5, y: d[1] + .5, bid: d[2], kind: M.buildings[d[2]].k }));
    M.resetContainers();
    // 招牌位置：每栋建筑选最长的一段南立面
    const best = new Map();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const b = M.bid[y * w + x]; if (!b) continue;
      if (M.bidAt(x, y + 1) === b) continue;
      if (M.bidAt(x - 1, y) === b && M.bidAt(x - 1, y + 1) !== b) continue;
      let run = 1; while (M.bidAt(x + run, y) === b && M.bidAt(x + run, y + 1) !== b && run < 12) run++;
      const score = run * 10 + y * 0.01;
      const cur = best.get(b); if (!cur || score > cur.s) best.set(b, { s: score, k: y * w + x });
    }
    M.signAt = new Set(); for (const v of best.values()) M.signAt.add(v.k);
  };
  M.resetContainers = () => {
    M.containers = M.props.concat(M.doors);
    M.cBuckets = new Map();
    for (const c of M.containers) M.addBucket(c);
  };
  M.addBucket = (c) => {
    const k = ((c.y / 16) | 0) * 1000 + ((c.x / 16) | 0);
    if (!M.cBuckets.has(k)) M.cBuckets.set(k, []);
    M.cBuckets.get(k).push(c);
  };
  M.nearContainers = (x, y, rad) => {
    const out = [];
    const cx0 = ((x - rad) / 16) | 0, cx1 = ((x + rad) / 16) | 0, cy0 = ((y - rad) / 16) | 0, cy1 = ((y + rad) / 16) | 0;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const b = M.cBuckets.get(cy * 1000 + cx); if (!b) continue;
      for (const c of b) if (U.d2(x, y, c.x, c.y) <= rad * rad) out.push(c);
    }
    return out;
  };

  // ---------- 碰撞：圆 vs 格子 ----------
  M.moveCircle = (e, dx, dy) => {
    const r = e.r;
    e.x += dx; M.resolve(e, r);
    e.y += dy; M.resolve(e, r);
  };
  M.resolve = (e, r) => {
    const x0 = Math.floor(e.x - r), x1 = Math.floor(e.x + r), y0 = Math.floor(e.y - r), y1 = Math.floor(e.y + r);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!M.isSolid(tx, ty)) continue;
      const nx = U.clamp(e.x, tx, tx + 1), ny = U.clamp(e.y, ty, ty + 1);
      let ddx = e.x - nx, ddy = e.y - ny;
      const d = Math.hypot(ddx, ddy);
      if (d < r) {
        if (d < 1e-6) { // 中心在格内，推向最近边
          const l = e.x - tx, rr = tx + 1 - e.x, t = e.y - ty, b = ty + 1 - e.y;
          const m = Math.min(l, rr, t, b);
          if (m === l) e.x = tx - r; else if (m === rr) e.x = tx + 1 + r; else if (m === t) e.y = ty - r; else e.y = ty + 1 + r;
        } else {
          e.x = nx + ddx / d * r; e.y = ny + ddy / d * r;
        }
        e.hitWall = true;
      }
    }
  };

  // ---------- 视线 / 射线 (DDA) ----------
  M.ray = (x0, y0, ang, maxD, blockFn) => {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let mx = Math.floor(x0), my = Math.floor(y0);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const tdx = Math.abs(1 / (dx || 1e-9)), tdy = Math.abs(1 / (dy || 1e-9));
    let tmx = (dx > 0 ? (mx + 1 - x0) : (x0 - mx)) * tdx;
    let tmy = (dy > 0 ? (my + 1 - y0) : (y0 - my)) * tdy;
    let t = 0;
    while (t < maxD) {
      if (tmx < tmy) { t = tmx; tmx += tdx; mx += sx; } else { t = tmy; tmy += tdy; my += sy; }
      if (t > maxD) break;
      if (blockFn(mx, my)) return t;
    }
    return maxD;
  };
  M.los = (x0, y0, x1, y1) => {
    const d = Math.hypot(x1 - x0, y1 - y0);
    if (d < 0.5) return true;
    return M.ray(x0, y0, Math.atan2(y1 - y0, x1 - x0), d, M.isBlockSight) >= d - 0.05;
  };

  // ---------- 流场寻路(以玩家为中心的窗口BFS) ----------
  const FW = 140;
  M.updateFlow = (px, py) => {
    const tx = Math.floor(px), ty = Math.floor(py);
    if (M.flow && M.flow.tx === tx && M.flow.ty === ty && M.flow.age < 0.6) return;
    const ox = tx - FW / 2, oy = ty - FW / 2;
    const dist = M.flow && M.flow.dist || new Int16Array(FW * FW);
    dist.fill(-1);
    const q = new Int32Array(FW * FW);
    let qh = 0, qt = 0;
    const s = (ty - oy) * FW + (tx - ox);
    dist[s] = 0; q[qt++] = s;
    while (qh < qt) {
      const c = q[qh++];
      const cx = c % FW, cy = (c / FW) | 0;
      const d = dist[c] + 1;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= FW || ny >= FW) continue;
        const ni = ny * FW + nx;
        if (dist[ni] !== -1) continue;
        const gx = nx + ox, gy = ny + oy;
        if (!M.walkable(gx, gy)) { dist[ni] = 32000; continue; }
        dist[ni] = d; q[qt++] = ni;
      }
    }
    M.flow = { tx, ty, ox, oy, dist, age: 0 };
  };
  // 返回朝玩家方向的移动向量(或null)
  M.flowDir = (x, y) => {
    const f = M.flow; if (!f) return null;
    const cx = Math.floor(x) - f.ox, cy = Math.floor(y) - f.oy;
    if (cx < 1 || cy < 1 || cx >= FW - 1 || cy >= FW - 1) return null;
    const here = f.dist[cy * FW + cx];
    if (here < 0 || here >= 32000) return null;
    let best = here, bx = 0, by = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const v = f.dist[(cy + dy) * FW + cx + dx];
      if (v < 0 || v >= 32000) continue;
      if (dx && dy) { // 对角需两侧都可走
        const a = f.dist[cy * FW + cx + dx], b = f.dist[(cy + dy) * FW + cx];
        if (a < 0 || a >= 32000 || b < 0 || b >= 32000) continue;
      }
      if (v < best) { best = v; bx = dx; by = dy; }
    }
    if (!bx && !by) return null;
    const tx = Math.floor(x) + bx + 0.5, ty = Math.floor(y) + by + 0.5;
    const l = Math.hypot(tx - x, ty - y) || 1;
    return [(tx - x) / l, (ty - y) / l];
  };

  M.randomWalkableNear = (x, y, rmin, rmax, tries = 40) => {
    for (let i = 0; i < tries; i++) {
      const a = Math.random() * 6.283, d = U.rand(rmin, rmax);
      const tx = Math.floor(x + Math.cos(a) * d), ty = Math.floor(y + Math.sin(a) * d);
      if (M.walkable(tx, ty) && M.walkable(tx + 1, ty) && M.walkable(tx, ty + 1)) return [tx + .5, ty + .5];
    }
    return null;
  };

  // 区域危险度 & 名称
  M.zoneAt = (x, y) => {
    let best = null, bd = 1e9;
    for (const l of M.landmarks) { const d = U.d2(x, y, l.x, l.y); if (d < bd) { bd = d; best = l; } }
    const d = Math.sqrt(bd);
    const danger = 1 + (best.danger - 1) * U.clamp(1 - d / 120, 0, 1);
    return { name: d < 90 ? best.name : '老城街巷', danger };
  };

  // ================= 渲染 =================
  const CH = 16, CPX = CH * TS, BTOP = 128;
  M.CH = CH; M.CPX = CPX; M.BTOP = BTOP;
  const HPX = [0, 28, 46, 66, 86];
  M.HPX = HPX;
  const COL = {
    ground: '#e6dabd', road: '#a19c92', major: '#8f8b84', alley: '#cfc2a2', plaza: '#ddd0ae', grass: '#a9c07c', tree: '#90ad6a', water: '#79a6b4', rail: '#8a7a68',
  };
  const PAL = {
    residential: ['#cfc7b8', '#bdb5a6', '#d8cfbf', '#c4b7a5'],
    village: ['#cbbba0', '#b9a688', '#d6c7aa', '#c7aa92', '#bfb3a3'],
    shop: ['#c9a383', '#b9967c', '#d0b08c'],
    restaurant: ['#c99a78'], convenience: ['#a9bfa0'], pharmacy: ['#a8c4a8'], hardware: ['#b0a080'],
    mall: ['#9fb3c0', '#a9bcc6', '#b3b0a6'], office: ['#a9b8c4', '#9eacb8', '#b8c0c4'], hospital: ['#e4e2d8'],
    gov: ['#cbb89c', '#c4ae90'], police: ['#a8b8d0'], culture: ['#b89c7a', '#c3a37f'], temple: ['#a8463a'], hotel: ['#d4c0a0', '#c8b49a'],
    bank: ['#c7c0b0'], parking: ['#a8a8a0'], school: ['#d8c090'], market: ['#b0a090'], warehouse: ['#a7a39a', '#9ea6a6'],
  };
  M.signText = (b, rnd) => {
    if (b.n && b.n.length) return b.n.replace(/广西壮族自治区/, '自治区').slice(0, 10);
    const opts = {
      shop: ['手机维修', '烟酒', '快递驿站', '理发', '五金', '服装', '彩票', '房产中介', '奶茶'], restaurant: ['老友粉', '螺蛳粉', '生榨米粉', '卷筒粉', '柠檬鸭', '烧烤'],
      convenience: ['便利店', '美宜佳', '超市'], pharmacy: ['大药房', '药店'], hardware: ['五金建材', '五金'], warehouse: ['仓库', '物流'],
    }[b.k];
    return opts ? opts[Math.floor(rnd() * opts.length)] : '';
  };
  const signColors = { restaurant: '#b8322a', convenience: '#2a7a4a', pharmacy: '#2a8a5a', hardware: '#2f5f9f', shop: '#b8322a', police: '#1f4fa0', hospital: '#b8322a', mall: '#2b2420', hotel: '#7a3a2a', bank: '#a01f1f', gov: '#a01f1f', culture: '#6a4a2a', market: '#b8322a' };

  function drawGroundChunk(cx, cy) {
    const cv = document.createElement('canvas'); cv.width = CPX; cv.height = CPX;
    const c = cv.getContext('2d');
    const rnd = U.rng(cx * 7919 + cy * 104729);
    const x0 = cx * CH, y0 = cy * CH;
    c.fillStyle = COL.ground; c.fillRect(0, 0, CPX, CPX);
    // 人行道地砖
    c.strokeStyle = 'rgba(120,100,70,0.13)'; c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i <= CH; i++) { SK.line(c, i * TS, 0, i * TS, CPX, rnd, 0.8); SK.line(c, 0, i * TS, CPX, i * TS, rnd, 0.8); }
    c.stroke();
    const groups = [
      { tiles: [T.GRASS, T.TREE], col: COL.grass, ink: '#5e7a40' },
      { tiles: [T.WATER], col: COL.water, ink: '#3d6878' },
      { tiles: [T.PLAZA], col: COL.plaza, ink: '#8a7a5a' },
      { tiles: [T.ALLEY], col: COL.alley, ink: '#7f705a' },
      { tiles: [T.RAIL], col: COL.rail, ink: '#4a3a2a' },
      { tiles: [T.ROAD, T.MAJOR], col: COL.road, ink: '#4a4640' },
    ];
    for (const g of groups) {
      const list = [];
      for (let y = y0 - 1; y <= y0 + CH; y++) for (let x = x0 - 1; x <= x0 + CH; x++) {
        if (g.tiles.includes(M.tile(x, y))) list.push([(x - x0) * TS + 16, (y - y0) * TS + 16, M.tile(x, y)]);
      }
      if (!list.length) continue;
      c.fillStyle = g.ink;
      c.beginPath(); for (const p of list) { const rr = 20 + (U.hash(p[0] + x0, p[1] + y0, 3) - .5) * 2; c.moveTo(p[0] + rr, p[1]); c.arc(p[0], p[1], rr, 0, 6.29); } c.fill();
      c.fillStyle = g.col;
      c.beginPath(); for (const p of list) { c.rect(p[0] - 16, p[1] - 16, 32, 32); c.moveTo(p[0] + 18, p[1]); c.arc(p[0], p[1], 18, 0, 6.29); } c.fill();
      if (g.tiles[0] === T.ROAD) { // 主干道颜色稍深
        c.fillStyle = COL.major;
        c.beginPath(); for (const p of list) if (p[2] === T.MAJOR) c.rect(p[0] - 16, p[1] - 16, 32, 32); c.fill();
      }
      // 水彩晕染
      for (const p of list) { const hv = U.hash(p[0] + x0 * 32, p[1] + y0 * 32, 41); if (hv < 0.3) { c.fillStyle = hv < 0.15 ? 'rgba(255,255,240,0.07)' : 'rgba(40,30,20,0.06)'; c.beginPath(); c.arc(p[0] + (hv - .15) * 40, p[1], 14 + hv * 20, 0, 6.29); c.fill(); } }
    }
    // 细节
    for (let y = y0; y < y0 + CH; y++) for (let x = x0; x < x0 + CH; x++) {
      const t = M.tile(x, y), X = (x - x0) * TS, Y = (y - y0) * TS, hv = U.hash(x, y, 5);
      if (t === T.WATER) {
        if (hv < 0.35) { c.strokeStyle = 'rgba(230,245,250,0.55)'; c.lineWidth = 1.2; c.beginPath(); const xx = X + rnd() * 20, yy = Y + rnd() * 26; c.moveTo(xx, yy); c.quadraticCurveTo(xx + 5, yy - 3, xx + 10, yy); c.stroke(); }
      } else if (t === T.GRASS || t === T.TREE) {
        c.strokeStyle = 'rgba(70,100,40,0.5)'; c.lineWidth = 1; c.beginPath();
        for (let k = 0; k < 3; k++) { const xx = X + rnd() * 28, yy = Y + rnd() * 28; c.moveTo(xx, yy); c.lineTo(xx + 2, yy - 4); c.lineTo(xx + 4, yy); }
        c.stroke();
      } else if (t === T.ROAD || t === T.MAJOR) {
        if (hv < 0.06) { c.strokeStyle = 'rgba(40,36,32,0.35)'; c.lineWidth = 1; c.beginPath(); SK.line(c, X + rnd() * 30, Y + rnd() * 30, X + rnd() * 30, Y + rnd() * 30, rnd, 3); c.stroke(); }
        if (hv > 0.995) { c.fillStyle = '#6a665e'; c.beginPath(); c.arc(X + 16, Y + 16, 6, 0, 6.29); c.fill(); c.strokeStyle = '#3a3630'; c.stroke(); }
        if (hv > 0.97 && hv < 0.975) { c.fillStyle = 'rgba(110,30,25,0.35)'; SK.circle(c, X + 16, Y + 16, 9 + rnd() * 8, rnd, .5); c.fill(); }
      } else if (t === T.RAIL) {
        c.strokeStyle = '#4a3a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(X + 4, Y + 4); c.lineTo(X + 28, Y + 28); c.moveTo(X + 28, Y + 4); c.lineTo(X + 4, Y + 28); c.stroke();
      } else if (t === T.GROUND || t === T.PLAZA || t === T.ALLEY) {
        if (hv < 0.02) { c.fillStyle = 'rgba(80,60,40,0.18)'; SK.circle(c, X + 16, Y + 16, 6 + rnd() * 6, rnd, .6); c.fill(); }
        if (hv > 0.985) { c.strokeStyle = 'rgba(60,50,40,0.5)'; c.lineWidth = 1; c.beginPath(); c.rect(X + 8 + rnd() * 8, Y + 8 + rnd() * 8, 6, 4); c.stroke(); }
      } else if (t === T.BUILD) {
        // 建筑东侧阴影
        if (M.tile(x + 1, y) !== T.BUILD) { c.fillStyle = 'rgba(40,30,20,0.16)'; c.fillRect(X + TS, Y, 10, TS); }
      }
    }
    // 路名
    c.font = 'bold 30px KaiTi, STKaiti, serif'; c.fillStyle = 'rgba(55,45,35,0.30)'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const [name, lx, ly] of M.roadLabels) {
      if (lx > x0 - 12 && lx < x0 + CH + 12 && ly > y0 - 2 && ly < y0 + CH + 2) c.fillText(name, (lx - x0) * TS + 16, (ly - y0) * TS + 16);
    }
    return cv;
  }

  function drawTree(c, X, Y, rnd, night) {
    c.fillStyle = '#6b4a2e'; c.fillRect(X + 14, Y + 6, 4, 18);
    const r = 15 + rnd() * 6;
    c.fillStyle = 'rgba(30,40,20,0.22)'; c.beginPath(); c.ellipse(X + 20, Y + 24, r * .9, r * .45, 0, 0, 6.29); c.fill();
    const g = ['#6d9a48', '#5f8c3e', '#7aa652', '#4f7d38'][Math.floor(rnd() * 4)];
    c.fillStyle = g; SK.circle(c, X + 16, Y - 6, r, rnd, .22, 12); c.fill();
    c.strokeStyle = '#2f4a22'; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = 'rgba(255,255,220,0.18)'; SK.circle(c, X + 11, Y - 11, r * .5, rnd, .3, 9); c.fill();
    c.strokeStyle = 'rgba(30,50,20,0.45)'; c.lineWidth = 1; c.beginPath();
    for (let k = 0; k < 4; k++) { const a = rnd() * 6.28, d = rnd() * r * .7; const px = X + 16 + Math.cos(a) * d, py = Y - 6 + Math.sin(a) * d; c.moveTo(px, py); c.lineTo(px + 4, py + 2); }
    c.stroke();
  }

  function drawBuildChunk(cx, cy, night) {
    const cv = document.createElement('canvas'); cv.width = CPX; cv.height = CPX + BTOP;
    const c = cv.getContext('2d');
    const x0 = cx * CH, y0 = cy * CH;
    const ink = '#2b2420';
    for (let y = y0; y < y0 + CH; y++) {
      for (let x = x0 - 1; x <= x0 + CH; x++) { // 多画一列避免缝
        const b = M.bidAt(x, y); if (!b) continue;
        const B = M.buildings[b];
        const rnd = U.rng(x * 9973 + y * 31337);
        const h = HPX[B.h] || 30;
        const X = (x - x0) * TS, Y = (y - y0) * TS + BTOP;
        const pal = PAL[B.k] || PAL.residential;
        const roof = pal[b % pal.length];
        const sameN = M.bidAt(x, y - 1) === b, sameS = M.bidAt(x, y + 1) === b, sameW = M.bidAt(x - 1, y) === b, sameE = M.bidAt(x + 1, y) === b;
        if (!sameS) {
          // 南立面
          const wall = U.shade(roof, 0.72);
          c.fillStyle = wall; c.fillRect(X, Y + TS - h, TS, h);
          const floors = Math.floor((h - 4) / 12);
          const glass = B.k === 'mall' || B.k === 'office';
          for (let f = 0; f < floors; f++) {
            const wy = Y + TS - h + 4 + f * 12;
            if (glass) { c.fillStyle = night ? 'rgba(30,40,50,0.8)' : 'rgba(80,110,130,0.55)'; c.fillRect(X + 1, wy, TS - 2, 8); continue; }
            for (const wx of [X + 5, X + 19]) {
              const lit = night && U.hash(x, y + f, wx) < 0.06;
              c.fillStyle = lit ? '#f2d27a' : (U.hash(x, f, wx) < 0.2 ? '#2a2622' : '#4c4842');
              c.fillRect(wx, wy, 8, 7);
              if (B.k === 'village' || B.k === 'residential') { // 防盗网
                c.strokeStyle = 'rgba(30,25,20,0.7)'; c.lineWidth = 1; c.beginPath();
                c.moveTo(wx + 2.5, wy - 1); c.lineTo(wx + 2.5, wy + 8); c.moveTo(wx + 5.5, wy - 1); c.lineTo(wx + 5.5, wy + 8); c.stroke();
              }
            }
          }
          const shopLike = ['shop', 'restaurant', 'convenience', 'pharmacy', 'hardware', 'market'].includes(B.k);
          if (shopLike) { // 卷帘门
            c.fillStyle = '#8a8a86'; c.fillRect(X + 2, Y + TS - 12, TS - 4, 12);
            c.strokeStyle = 'rgba(40,40,40,0.5)'; c.beginPath(); for (let k = 0; k < 4; k++) { c.moveTo(X + 2, Y + TS - 11 + k * 3); c.lineTo(X + TS - 2, Y + TS - 11 + k * 3); } c.stroke();
          }
          // 招牌：在立面段的起点绘制
          if (M.signAt.has(y * M.w + x)) {
            let txt = M.signText(B, U.rng(b * 17));
            let run = 1; while (M.bidAt(x + run, y) === b && M.bidAt(x + run, y + 1) !== b && run < 12) run++;
            const fit = Math.floor((run * TS - 14) / 10.5);
            if (txt.length > fit) txt = fit >= 2 ? txt.slice(0, fit) : '';
            if (txt && (signColors[B.k] || B.n)) {
              const sw = Math.min(run * TS - 4, txt.length * 10.5 + 12);
              const sy = Y + TS - h + (shopLike ? h - 24 : 2);
              c.fillStyle = signColors[B.k] || '#6a2a20'; c.fillRect(X + 2, sy, sw, 11);
              c.strokeStyle = ink; c.lineWidth = 1; c.strokeRect(X + 2, sy, sw, 11);
              c.fillStyle = B.k === 'mall' ? '#f0e0b0' : '#f8e6a0'; c.font = 'bold 10px KaiTi, STKaiti, serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
              c.fillText(txt, X + 7, sy + 6, sw - 8);
            }
          }
          c.strokeStyle = ink; c.lineWidth = 1.8;
          c.beginPath(); SK.line(c, X, Y + TS, X + TS, Y + TS, rnd, 1); c.stroke();
          if (!sameW) { c.beginPath(); SK.line(c, X, Y + TS - h, X, Y + TS, rnd, 1); c.stroke(); }
          if (!sameE) { c.beginPath(); SK.line(c, X + TS, Y + TS - h, X + TS, Y + TS, rnd, 1); c.stroke(); }
        }
        // 屋顶
        const RY = Y - h;
        c.fillStyle = roof; c.fillRect(X, RY, TS + 0.5, TS + 0.5);
        { const wv = U.hash(x, y, 77); if (wv < 0.5) { c.fillStyle = wv < 0.25 ? 'rgba(255,250,235,0.10)' : 'rgba(50,35,20,0.07)'; c.beginPath(); c.arc(X + 16 + (wv - .25) * 30, RY + 16, 12 + wv * 16, 0, 6.29); c.save(); c.clip(); c.fillRect(X, RY, TS, TS); c.restore(); } }
        if (B.k === 'warehouse' || B.k === 'market') { // 铁皮瓦楞
          c.strokeStyle = 'rgba(60,60,60,0.25)'; c.lineWidth = 1; c.beginPath(); for (let k = 2; k < TS; k += 5) { c.moveTo(X + k, RY); c.lineTo(X + k, RY + TS); } c.stroke();
        } else if (U.hash(b, 0, 9) < 0.5) {
          c.strokeStyle = 'rgba(60,45,30,0.12)'; c.lineWidth = 1; SK.hatch(c, X, RY, TS, TS, rnd, 7, 0.8);
        }
        // 女儿墙内线
        c.strokeStyle = 'rgba(255,250,235,0.45)'; c.lineWidth = 2; c.beginPath();
        if (!sameN) { c.moveTo(X, RY + 3); c.lineTo(X + TS, RY + 3); }
        if (!sameS) { c.moveTo(X, RY + TS - 3); c.lineTo(X + TS, RY + TS - 3); }
        if (!sameW) { c.moveTo(X + 3, RY); c.lineTo(X + 3, RY + TS); }
        if (!sameE) { c.moveTo(X + TS - 3, RY); c.lineTo(X + TS - 3, RY + TS); }
        c.stroke();
        c.strokeStyle = ink; c.lineWidth = 2; c.beginPath();
        if (!sameN) SK.line(c, X, RY, X + TS, RY, rnd, 1.2);
        if (!sameS) SK.line(c, X, RY + TS, X + TS, RY + TS, rnd, 1.2);
        if (!sameW) SK.line(c, X, RY, X, RY + TS, rnd, 1.2);
        if (!sameE) SK.line(c, X + TS, RY, X + TS, RY + TS, rnd, 1.2);
        c.stroke();
        // 屋顶设施
        const interior = sameN && sameS && sameW && sameE;
        const hv = U.hash(x, y, b);
        if (interior && hv < (B.a > 300 ? 0.035 : 0.08)) {
          if (B.k === 'hospital' && hv < 0.04) { c.fillStyle = '#c0302a'; c.fillRect(X + 12, RY + 5, 8, 22); c.fillRect(X + 5, RY + 12, 22, 8); }
          else if (B.k === 'village' || B.k === 'residential') {
            if (hv < 0.045) { // 太阳能热水器
              c.fillStyle = '#3a4a5a'; c.fillRect(X + 4, RY + 10, 22, 12);
              c.strokeStyle = '#cfd6da'; c.lineWidth = 1; c.beginPath(); for (let k = 6; k < 26; k += 3) { c.moveTo(X + k, RY + 10); c.lineTo(X + k, RY + 22); } c.stroke();
              c.fillStyle = '#c8c8c0'; c.fillRect(X + 3, RY + 6, 24, 4); c.strokeStyle = ink; c.strokeRect(X + 3, RY + 6, 24, 16);
            } else { // 不锈钢水塔
              c.fillStyle = '#d8dcdc'; c.beginPath(); c.ellipse(X + 16, RY + 16, 9, 9, 0, 0, 6.29); c.fill(); c.strokeStyle = ink; c.lineWidth = 1.4; c.stroke();
              c.strokeStyle = 'rgba(80,80,80,0.5)'; c.beginPath(); c.arc(X + 16, RY + 16, 5, 0, 6.29); c.stroke();
            }
          } else { // 空调外机
            c.fillStyle = '#e4e2da'; c.fillRect(X + 6, RY + 9, 18, 13); c.strokeStyle = ink; c.lineWidth = 1.2; c.strokeRect(X + 6, RY + 9, 18, 13);
            c.beginPath(); c.arc(X + 15, RY + 15.5, 4.5, 0, 6.29); c.stroke();
          }
        }
        if (B.k === 'temple' && interior && hv < 0.3) { c.strokeStyle = '#6a2a20'; c.lineWidth = 1; c.beginPath(); for (let k = 3; k < TS; k += 4) { c.moveTo(X, RY + k); c.lineTo(X + TS, RY + k); } c.stroke(); }
      }
      // 本行的树
      for (let x = x0 - 1; x <= x0 + CH; x++) {
        if (M.treeSet.has(y * M.w + x)) drawTree(c, (x - x0) * TS, (y - y0) * TS + BTOP, U.rng(x * 31 + y * 17), night);
      }
    }
    return cv;
  }

  function lru(map, key, make, limit) {
    let v = map.get(key);
    if (v) { map.delete(key); map.set(key, v); return v; }
    v = make(); map.set(key, v);
    if (map.size > limit) map.delete(map.keys().next().value);
    return v;
  }
  M.getGround = (cx, cy) => lru(M.chunkG, cy * 1000 + cx, () => drawGroundChunk(cx, cy), 40);
  M.getBuild = (cx, cy, night) => lru(M.chunkB, cy * 1000 + cx + (night ? 0.5 : 0), () => drawBuildChunk(cx, cy, night), 40);
  M.clearCache = () => { M.chunkG.clear(); M.chunkB.clear(); };

  // 小地图底图
  M.makeMiniBase = () => {
    const cv = document.createElement('canvas'); cv.width = M.w; cv.height = M.h;
    const c = cv.getContext('2d');
    const img = c.createImageData(M.w, M.h);
    const pal = [[226, 214, 186], [150, 146, 138], [130, 126, 120], [110, 160, 178], [160, 188, 120], [130, 168, 100], [178, 150, 128], [120, 100, 80], [205, 192, 165], [218, 205, 175]];
    for (let i = 0; i < M.w * M.h; i++) { const p = pal[M.grid[i]]; img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = 255; }
    c.putImageData(img, 0, 0);
    M.miniBase = cv;
  };

  G.M = M;
})();
