// ===== 现代城市：俯瞰透视的高楼（屋顶按高度向画面外"倒"） =====
(function () {
  const U = G.U, TS = U.TS;
  const C = {};
  const FLOOR = 13;      // 每层像素高
  const CAMD = 1100;     // 镜头离地高度（像素）
  C.FLOOR = FLOOR; C.CAMD = CAMD;
  const SHOPS = ['shop', 'restaurant', 'convenience', 'pharmacy', 'hardware'];
  const TINT = {
    residential: ['#f3ead8', '#e8dcc4', '#efe2cf', '#dfe4d8', '#f0d9c8', '#e2e2e6'], village: ['#d9a07c', '#cfb08c', '#e6d3b4', '#c9c2b2', '#dba782'],
    shop: ['#e8b48a', '#e6c79a'], restaurant: ['#e8a47a'], convenience: ['#b8dcb0'], pharmacy: ['#b6dcc0'], hardware: ['#d6bc8c'],
    mall: ['#9cc4d8', '#b8d0dc'], office: ['#8fb4d0', '#7fa6c4', '#a8c4d8'], hospital: ['#f6f4ee'], gov: ['#e6d0aa'], police: ['#b0c8e6'], culture: ['#d6b088'],
    temple: ['#c0503e'], hotel: ['#ecd2ae', '#e0c8a6'], bank: ['#e2dac6'], parking: ['#c4c2ba'], school: ['#f0d498'], market: ['#78b0be'], warehouse: ['#a8b8c4', '#bcc4bc'],
  };
  function floorsOf(b) {
    const h = U.hash(b.id, 7, 3), a = b.a || 20, lv = (b.h || 2) - 2;
    let f;
    switch (b.k) {
      case 'residential': f = a >= 110 ? 18 + h * 16 : a >= 45 ? 9 + h * 9 : 6 + h * 4; break;
      case 'village': f = 4 + h * 5; break;
      case 'mall': f = 5 + h * 4; break;
      case 'office': f = 26 + h * 20; break;
      case 'bank': f = 14 + h * 14; break;
      case 'hotel': f = 14 + h * 16; break;
      case 'hospital': f = 10 + h * 12; break;
      case 'gov': f = 6 + h * 10; break;
      case 'police': f = 6 + h * 4; break;
      case 'school': f = 4 + h * 2; break;
      case 'culture': f = 3 + h * 3; break;
      case 'temple': f = 1.4; break;
      case 'warehouse': f = 1.4 + h; break;
      case 'market': f = 2; break;
      case 'parking': f = 3; break;
      default: f = 3 + h * 5;
    }
    if (b.k !== 'temple' && b.k !== 'warehouse') f += lv * 2;
    return Math.max(1.2, Math.min(48, Math.round(f * 2) / 2));
  }
  C.init = () => {
    const M = G.M, w = M.w, h = M.h, bid = M.bid;
    const B = M.buildings;
    const info = C.info = new Array(B.length);
    for (let i = 1; i < B.length; i++) if (B[i]) {
      const b = B[i], fl = floorsOf(b);
      const pal = TINT[b.k] || TINT.residential;
      const glass = b.k === 'office' || b.k === 'bank' || (b.k === 'hotel' && U.hash(i, 1, 1) < 0.5);
      const tower = !glass && (fl >= 10 || ['hospital', 'gov', 'police', 'school', 'hotel'].includes(b.k));
      const metal = b.k === 'warehouse' || b.k === 'market' || b.k === 'parking';
      info[i] = {
        id: i, b, floors: fl, H: fl * FLOOR, runs: [], segs: [], x0: 1e9, y0: 1e9, x1: -1, y1: -1,
        tint: pal[Math.floor(U.hash(i, 2, 9) * pal.length)],
        facade: metal ? null : glass ? 'tex_facade_glass' : tower ? 'tex_facade_tower' : 'tex_facade_res',
        ground: b.k === 'mall' || (glass && fl > 20) ? 'tex_facade_podium' : SHOPS.includes(b.k) || (b.k === 'residential' && fl < 12 && U.hash(i, 5, 5) < 0.35) ? 'tex_facade_shop' : null,
        roof: metal ? 'tex_roof_metal' : (b.k === 'village' || b.k === 'temple') && i % 3 !== 0 ? 'tex_roof_tile' : 'tex_roof_concrete',
      };
    }
    // 行程（屋顶填充）与外轮廓线段（立面）
    for (let y = 0; y < h; y++) {
      let x = 0;
      while (x < w) {
        const b = bid[y * w + x];
        if (!b || !info[b]) { x++; continue; }
        let x2 = x; while (x2 + 1 < w && bid[y * w + x2 + 1] === b) x2++;
        const I = info[b]; I.runs.push([y, x, x2 + 1]);
        if (x < I.x0) I.x0 = x; if (x2 + 1 > I.x1) I.x1 = x2 + 1; if (y < I.y0) I.y0 = y; if (y + 1 > I.y1) I.y1 = y + 1;
        x = x2 + 1;
      }
    }
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : bid[y * w + x];
    // 横向边
    for (let y = 0; y <= h; y++) for (const side of [-1, 1]) {
      let x = 0;
      while (x < w) {
        const b = side < 0 ? at(x, y) : at(x, y - 1); // side<0：北边（该格的上沿）；side>0：南边
        const o = side < 0 ? at(x, y - 1) : at(x, y);
        if (!b || b === o || !info[b]) { x++; continue; }
        let x2 = x; while (x2 + 1 < w && (side < 0 ? at(x2 + 1, y) : at(x2 + 1, y - 1)) === b && (side < 0 ? at(x2 + 1, y - 1) : at(x2 + 1, y)) !== b) x2++;
        info[b].segs.push([x, y, x2 + 1, y, 0, side]);
        x = x2 + 1;
      }
    }
    for (let x = 0; x <= w; x++) for (const side of [-1, 1]) {
      let y = 0;
      while (y < h) {
        const b = side < 0 ? at(x, y) : at(x - 1, y);
        const o = side < 0 ? at(x - 1, y) : at(x, y);
        if (!b || b === o || !info[b]) { y++; continue; }
        let y2 = y; while (y2 + 1 < h && (side < 0 ? at(x, y2 + 1) : at(x - 1, y2 + 1)) === b && (side < 0 ? at(x - 1, y2 + 1) : at(x, y2 + 1)) !== b) y2++;
        info[b].segs.push([x, y, x, y2 + 1, side, 0]);
        y = y2 + 1;
      }
    }
    // 用平滑轮廓替换锯齿边（斜向楼不再是台阶状）
    const OL = window.MAP_OUTLINES || {};
    for (const key in OL) {
      const I = info[+key]; if (!I) continue;
      const rings = OL[key].map(r => { const a = []; for (let i = 0; i < r.length; i += 2) a.push([r[i] / 10, r[i + 1] / 10]); return a; });
      const segs = [];
      for (const ring of rings) {
        let u = 0;
        for (let i = 0; i < ring.length; i++) {
          const A = ring[i], Bp = ring[(i + 1) % ring.length];
          const dx = Bp[0] - A[0], dy = Bp[1] - A[1], L = Math.hypot(dx, dy); if (L < 0.05) continue;
          let nx = dy / L, ny = -dx / L;
          const mx = (A[0] + Bp[0]) / 2, my = (A[1] + Bp[1]) / 2;
          if (at(Math.floor(mx + nx * 0.4), Math.floor(my + ny * 0.4)) === I.id) { nx = -nx; ny = -ny; }
          segs.push([A[0], A[1], Bp[0], Bp[1], nx, ny, u]); u += L;
        }
      }
      I.segs = segs; I.rings = rings;
    }
    for (const I of info) if (I && !I.rings) for (const sg of I.segs) sg.push(sg[4] !== 0 ? sg[1] : sg[0]);
    // 空间分桶
    C.CB = 16; C.buckets = new Map();
    for (const I of info) if (I) {
      I.cx = (I.x0 + I.x1) / 2; I.cy = (I.y0 + I.y1) / 2;
      for (let by = Math.floor(I.y0 / 16); by <= Math.floor((I.y1 - 1) / 16); by++) for (let bx = Math.floor(I.x0 / 16); bx <= Math.floor((I.x1 - 1) / 16); bx++) {
        const k = by * 1000 + bx; if (!C.buckets.has(k)) C.buckets.set(k, []); C.buckets.get(k).push(I);
      }
    }
    // 每格高度（遮挡判断用）
    C.hgt = new Uint16Array(w * h);
    for (let i = 0; i < w * h; i++) { const b = bid[i]; if (b && info[b]) C.hgt[i] = info[b].H; }
    // 树木分桶
    C.treeB = new Map();
    for (const t of M.trees) { const k = Math.floor(t[1] / 16) * 1000 + Math.floor(t[0] / 16); if (!C.treeB.has(k)) C.treeB.set(k, []); C.treeB.get(k).push(t); }
    C.pats = null; C.stamp = 0;
  };

  // 视野内地面点是否被楼挡住（从该点向镜头的射线穿过楼体）
  C.occluded = (x, y) => {
    const cx = G.R.cam.x, cy = G.R.cam.y, M = G.M;
    const dx = cx - x, dy = cy - y, dist = Math.hypot(dx, dy) * TS;
    if (dist < 8) return false;
    const tmax = 620 / CAMD, steps = Math.ceil(dist * tmax / 14);
    for (let i = 1; i <= steps; i++) {
      const t = tmax * i / steps;
      const qx = Math.floor(x + dx * t), qy = Math.floor(y + dy * t);
      if (!M.inb(qx, qy)) continue;
      const hh = C.hgt[qy * M.w + qx];
      if (hh && hh > CAMD * t) return true;
    }
    return false;
  };

  function pats(c) {
    if (C.pats) return C.pats;
    const P = {};
    for (const n of ['tex_facade_glass', 'tex_facade_tower', 'tex_facade_res', 'tex_facade_podium', 'tex_facade_shop', 'tex_roof_metal', 'tex_roof_tile', 'tex_roof_concrete']) {
      const im = G.A.img[n]; if (im) P[n] = c.createPattern(im, 'repeat');
    }
    return (C.pats = P);
  }

  // 主绘制
  C.draw = (c, night, t) => {
    const R = G.R, M = G.M, W = R.W, H = R.H;
    const P = pats(c);
    const cx = R.sx(R.cam.x), cy = R.sy(R.cam.y);
    const vx0 = R.cam.x - W / 2 / TS - 1, vy0 = R.cam.y - H / 2 / TS - 1, vx1 = R.cam.x + W / 2 / TS + 1, vy1 = R.cam.y + H / 2 / TS + 1;
    const stamp = ++C.stamp, list = [];
    for (let by = Math.floor(vy0 / 16); by <= Math.floor(vy1 / 16); by++) for (let bx = Math.floor(vx0 / 16); bx <= Math.floor(vx1 / 16); bx++) {
      const arr = C.buckets.get(by * 1000 + bx); if (!arr) continue;
      for (const I of arr) {
        if (I.st === stamp) continue; I.st = stamp;
        if (I.x1 < vx0 || I.x0 > vx1 || I.y1 < vy0 || I.y0 > vy1) continue;
        I.d = Math.hypot(Math.max(I.x0 - R.cam.x, 0, R.cam.x - I.x1), Math.max(I.y0 - R.cam.y, 0, R.cam.y - I.y1));
        list.push(I);
      }
    }
    list.sort((a, b) => b.d - a.d || a.H - b.H);
    const ox = R.sx(0), oy = R.sy(0);
    for (const I of list) drawBuilding(c, I, P, cx, cy, ox, oy, night, t);
  };

  const FLAT = { tex_facade_glass: '#5f7f96', tex_facade_tower: '#c9c2b4', tex_facade_res: '#bdb5a3' };
  const proj = (sx, sy, k, cx, cy) => [cx + (sx - cx) * k, cy + (sy - cy) * k];
  function shadeFor(nx, ny) { return Math.max(0, 0.16 * (1 - ny) + 0.03 * nx); }

  function drawBuilding(c, I, P, cx, cy, ox, oy, night, t) {
    const Hb = I.H, kTop = CAMD / (CAMD - Hb);
    const fl = I.floors;
    // ---- 立面 ----
    for (const s of I.segs) {
      const ax = ox + s[0] * TS, ay = oy + s[1] * TS, bx = ox + s[2] * TS, by = oy + s[3] * TS;
      const nx = s[4], ny = s[5];
      if ((cx - ax) * nx + (cy - ay) * ny <= 0.01) continue; // 背向镜头
      const Lw = Math.hypot(bx - ax, by - ay);
      const bands = Math.max(1, Math.min(8, Math.ceil(fl / 5)));
      const gH = I.ground ? Math.min(1, fl) : 0; // 底商层数
      const kAt = (f) => CAMD / (CAMD - f * FLOOR);
      // 主墙面
      const tex = I.facade ? P[I.facade] : null;
      const texW = FLOOR / 36; // 贴图像素 → 世界像素（与层高同比例）
      for (let i = 0; i < bands; i++) {
        const f0 = gH + (fl - gH) * i / bands, f1 = gH + (fl - gH) * (i + 1) / bands;
        const k0 = kAt(f0), k1 = kAt(f1);
        const A0 = proj(ax, ay, k0, cx, cy), B0 = proj(bx, by, k0, cx, cy), A1 = proj(ax, ay, k1, cx, cy), B1 = proj(bx, by, k1, cx, cy);
        c.beginPath(); c.moveTo(A0[0], A0[1]); c.lineTo(B0[0], B0[1]); c.lineTo(B1[0], B1[1]); c.lineTo(A1[0], A1[1]); c.closePath();
        const pxf = Math.hypot(A0[0] - A1[0], A0[1] - A1[1]) / Math.max(0.01, f1 - f0);
        if (tex && pxf < 3.2) { c.fillStyle = FLAT[I.facade]; }
        else if (tex) {
          const Ltex = Lw / texW, vPer = 36; // 贴图每层 36px
          const Ux = (B1[0] - A1[0]) / Ltex, Uy = (B1[1] - A1[1]) / Ltex;
          const vs = (f1 - f0) * vPer, Vx = (A0[0] - A1[0]) / vs, Vy = (A0[1] - A1[1]) / vs;
          const v1 = (fl - f1) * vPer;
          const uOff = s[6] * TS / texW;
          tex.setTransform(new DOMMatrix([Ux, Uy, Vx, Vy, A1[0] - v1 * Vx - uOff * Ux, A1[1] - v1 * Vy - uOff * Uy]));
          c.fillStyle = tex;
        } else c.fillStyle = I.tint;
        c.fill();
        if (!tex) { // 仓库：横向压型钢板线
          c.strokeStyle = 'rgba(60,70,80,0.25)'; c.lineWidth = 1; c.beginPath();
          for (let q = 0.2; q < 1; q += 0.2) { c.moveTo(A0[0] + (A1[0] - A0[0]) * q, A0[1] + (A1[1] - A0[1]) * q); c.lineTo(B0[0] + (B1[0] - B0[0]) * q, B0[1] + (B1[1] - B0[1]) * q); }
          c.stroke();
        }
      }
      // 底商
      if (gH > 0) {
        const k1 = kAt(gH), A1 = proj(ax, ay, k1, cx, cy), B1 = proj(bx, by, k1, cx, cy);
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(B1[0], B1[1]); c.lineTo(A1[0], A1[1]); c.closePath();
        const gt = P[I.ground];
        if (gt) {
          const Ltex = Lw / (FLOOR / 44), Ux = (B1[0] - A1[0]) / Ltex, Uy = (B1[1] - A1[1]) / Ltex, Vx = (ax - A1[0]) / 44, Vy = (ay - A1[1]) / 44;
          const uOff = s[6] * TS / (FLOOR / 44);
          gt.setTransform(new DOMMatrix([Ux, Uy, Vx, Vy, A1[0] - uOff * Ux, A1[1] - uOff * Uy])); c.fillStyle = gt; c.fill();
        }
      }
      // 整面墙：色调 + 朝向明暗 + 墙根暗角
      const AT = proj(ax, ay, kTop, cx, cy), BT = proj(bx, by, kTop, cx, cy);
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(BT[0], BT[1]); c.lineTo(AT[0], AT[1]); c.closePath();
      c.globalAlpha = I.facade === 'tex_facade_glass' ? 0.14 : 0.24; c.fillStyle = I.tint; c.fill();
      const sh = shadeFor(nx, ny) + (night ? 0.15 : 0);
      if (sh > 0) { c.globalAlpha = sh; c.fillStyle = '#1c1830'; c.fill(); }
      c.globalAlpha = 1;
      c.strokeStyle = 'rgba(30,24,20,0.55)'; c.lineWidth = 1; c.stroke();
      // 夜里亮着的窗
      if (night && fl >= 3) {
        const bays = Math.max(1, Math.round(Lw / 16));
        c.fillStyle = 'rgba(255,214,120,0.85)';
        for (let f = 1; f < fl - 0.5; f++) for (let q = 0; q < bays; q++) {
          if (U.hash(I.id * 7 + q, f, s[0] + s[1] * 3) > 0.07) continue;
          const kk = kAt(f + 0.35), u = (q + 0.3) / bays, u2 = (q + 0.7) / bays;
          const p0 = proj(ax + (bx - ax) * u, ay + (by - ay) * u, kk, cx, cy), p1 = proj(ax + (bx - ax) * u2, ay + (by - ay) * u2, kk, cx, cy), p2 = proj(ax + (bx - ax) * u, ay + (by - ay) * u, kAt(f + 0.75), cx, cy);
          c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p1[0] + p2[0] - p0[0], p1[1] + p2[1] - p0[1]); c.lineTo(p2[0], p2[1]); c.fill();
        }
      }
    }
    // ---- 屋顶 ----
    const rp = P[I.roof];
    c.beginPath();
    if (I.rings) {
      for (const ring of I.rings) ring.forEach((q, i) => { const p = proj(ox + q[0] * TS, oy + q[1] * TS, kTop, cx, cy); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
    } else for (const r of I.runs) {
      const p0 = proj(ox + r[1] * TS, oy + r[0] * TS, kTop, cx, cy), p1 = proj(ox + r[2] * TS, oy + (r[0] + 1) * TS, kTop, cx, cy);
      c.rect(p0[0], p0[1], p1[0] - p0[0] + 0.6, p1[1] - p0[1] + 0.6);
    }
    const rule = I.rings ? 'evenodd' : 'nonzero';
    const conc = I.roof === 'tex_roof_concrete';
    if (conc) { c.fillStyle = I.roofCol || (I.roofCol = U.shade(I.tint, 0.86)); c.fill(rule); }
    if (rp) {
      const sc = (conc ? 0.7 : 0.26) * kTop;
      rp.setTransform(new DOMMatrix([sc, 0, 0, sc, cx + (ox - cx) * kTop, cy + (oy - cy) * kTop]));
      c.fillStyle = rp; if (conc) c.globalAlpha = 0.16; c.fill(rule); c.globalAlpha = 1;
    }
    c.globalAlpha = conc ? 0 : 0.15; c.fillStyle = I.tint; c.fill(rule);
    if (night) { c.globalAlpha = 0.12; c.fillStyle = '#1c1830'; c.fill(rule); }
    c.globalAlpha = 1;
    // 女儿墙轮廓
    c.beginPath();
    for (const s of I.segs) { const a = proj(ox + s[0] * TS, oy + s[1] * TS, kTop, cx, cy), b = proj(ox + s[2] * TS, oy + s[3] * TS, kTop, cx, cy); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
    c.strokeStyle = '#2b2420'; c.lineWidth = fl >= 6 ? 4.5 : 2.4; c.stroke();
    c.strokeStyle = fl >= 6 ? '#ece6d8' : 'rgba(255,250,235,0.55)'; c.lineWidth = fl >= 6 ? 2.6 : 1; c.stroke();
    // 屋顶设备：电梯机房、水箱、空调
    const wT = I.x1 - I.x0, hT = I.y1 - I.y0;
    if (fl >= 8 && wT >= 2 && hT >= 2) {
      const bxw = Math.min(2.2, wT * 0.35), byh = Math.min(1.6, hT * 0.3);
      const mx = I.cx - bxw / 2 + (U.hash(I.id, 3, 3) - 0.5) * (wT - bxw) * 0.4, my = I.cy - byh / 2;
      if (M_tileIs(I, mx + bxw / 2, my + byh / 2)) box(c, mx, my, mx + bxw, my + byh, Hb, Hb + FLOOR * 1.6, '#cfc8b8', cx, cy, ox, oy);
      if (fl >= 18 && I.b.k === 'office' && wT >= 4 && hT >= 4) { // 停机坪
        const p = proj(ox + I.cx * TS, oy + I.cy * TS, kTop, cx, cy);
        c.strokeStyle = 'rgba(240,200,60,0.9)'; c.lineWidth = 2; c.beginPath(); c.arc(p[0], p[1], 14 * kTop, 0, 6.29); c.stroke();
        c.fillStyle = 'rgba(240,240,230,0.9)'; c.font = 'bold ' + Math.round(14 * kTop) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', p[0], p[1]); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      }
    } else if (I.b.k === 'village' || I.b.k === 'residential') {
      const n = Math.min(3, Math.floor(wT * hT / 6));
      for (let q = 0; q < n; q++) {
        const tx = I.x0 + 0.5 + U.hash(I.id, q, 1) * (wT - 1), ty = I.y0 + 0.5 + U.hash(I.id, q, 2) * (hT - 1);
        if (!M_tileIs(I, tx, ty)) continue;
        if (q === 0) { // 不锈钢水箱
          box(c, tx - 0.3, ty - 0.2, tx + 0.3, ty + 0.2, Hb, Hb + FLOOR * 0.6, '#c8ccd0', cx, cy, ox, oy);
        } else box(c, tx - 0.22, ty - 0.15, tx + 0.22, ty + 0.15, Hb, Hb + FLOOR * 0.35, '#e4e0d4', cx, cy, ox, oy);
      }
    }
    // 楼名（地标）
    if (I.b.n && (I.b.a > 90 || fl >= 20)) {
      const p = proj(ox + I.cx * TS, oy + I.cy * TS, kTop, cx, cy);
      const txt = I.b.n.replace(/广西壮族自治区/, '').slice(0, 9);
      c.font = 'bold ' + Math.round(11 * Math.min(1.6, kTop)) + 'px KaiTi, serif'; c.textAlign = 'center';
      c.fillStyle = 'rgba(30,24,20,0.75)'; c.fillText(txt, p[0] + 1, p[1] + 1); c.fillStyle = '#fff2c8'; c.fillText(txt, p[0], p[1]); c.textAlign = 'left';
    }
  }
  function M_tileIs(I, x, y) { return G.M.bidAt(Math.floor(x), Math.floor(y)) === I.id; }
  // 小型挤出方块（屋顶设备）
  function box(c, x0, y0, x1, y1, h0, h1, col, cx, cy, ox, oy) {
    const k0 = CAMD / (CAMD - h0), k1 = CAMD / (CAMD - h1);
    const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(p => [ox + p[0] * TS, oy + p[1] * TS]);
    const lo = pts.map(p => proj(p[0], p[1], k0, cx, cy)), hi = pts.map(p => proj(p[0], p[1], k1, cx, cy));
    const sides = [[0, 1, 0, -1], [1, 2, 1, 0], [2, 3, 0, 1], [3, 0, -1, 0]];
    for (const [a, b, nx, ny] of sides) {
      const ex = pts[a][0], ey = pts[a][1];
      if (nx !== 0 ? (nx > 0 ? cx <= ex : cx >= ex) : (ny > 0 ? cy <= ey : cy >= ey)) continue;
      c.beginPath(); c.moveTo(lo[a][0], lo[a][1]); c.lineTo(lo[b][0], lo[b][1]); c.lineTo(hi[b][0], hi[b][1]); c.lineTo(hi[a][0], hi[a][1]); c.closePath();
      c.fillStyle = U.shade(col, 0.72 - shadeFor(nx, ny) * 0.5); c.fill(); c.strokeStyle = 'rgba(30,24,20,0.6)'; c.lineWidth = 0.8; c.stroke();
    }
    c.beginPath(); c.moveTo(hi[0][0], hi[0][1]); for (let i = 1; i < 4; i++) c.lineTo(hi[i][0], hi[i][1]); c.closePath();
    c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(30,24,20,0.7)'; c.stroke();
  }

  // 行道树（动态绘制，避免被区块裁切）
  C.drawTrees = (c) => {
    const R = G.R, W = R.W, H = R.H, im = G.A.img.tree; if (!im) return;
    const vx0 = R.cam.x - W / 2 / TS - 2, vy0 = R.cam.y - H / 2 / TS - 1, vx1 = R.cam.x + W / 2 / TS + 2, vy1 = R.cam.y + H / 2 / TS + 3;
    for (let by = Math.floor(vy0 / 16); by <= Math.floor(vy1 / 16); by++) for (let bx = Math.floor(vx0 / 16); bx <= Math.floor(vx1 / 16); bx++) {
      const arr = C.treeB.get(by * 1000 + bx); if (!arr) continue;
      for (const tr of arr) {
        if (tr[0] < vx0 || tr[0] > vx1 || tr[1] < vy0 || tr[1] > vy1) continue;
        const hv = U.hash(tr[0], tr[1], 77), w = 50 + hv * 22, h = im.height * w / im.width;
        const x = R.sx(tr[0] + 0.5), y = R.sy(tr[1] + 0.8);
        c.fillStyle = 'rgba(30,40,20,0.22)'; c.beginPath(); c.ellipse(x + 3, y, w * 0.4, w * 0.15, 0, 0, 6.29); c.fill();
        if (hv < 0.5) { c.save(); c.translate(x, 0); c.scale(-1, 1); c.drawImage(im, -w / 2, y - h, w, h); c.restore(); }
        else c.drawImage(im, x - w / 2, y - h, w, h);
      }
    }
  };
  G.C = C;
})();
