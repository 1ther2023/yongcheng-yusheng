// ===== 通用工具 & 手绘笔触 =====
window.G = window.G || {};
(function () {
  const U = {};
  U.TS = 32; // 每格像素
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  U.d2 = (ax, ay, bx, by) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
  U.ang = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  U.angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; h = h ^ (h >>> 16); return (h >>> 0) / 4294967296; };
  U.rng = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  U.weighted = (list, rnd = Math.random) => { // [[val, w],...]
    let tot = 0; for (const l of list) tot += l[1];
    let r = rnd() * tot; for (const l of list) { r -= l[1]; if (r <= 0) return l[0]; } return list[list.length - 1][0];
  };
  U.fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60), ss = s % 60; return m + ':' + (ss < 10 ? '0' : '') + ss; };
  U.shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- 手绘笔触 ----------
  const SK = {};
  // 抖动直线：用若干中点轻微偏移，形成手绘感
  SK.line = (c, x1, y1, x2, y2, rnd, jit = 1.2) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(1, Math.floor(len / 14));
    const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
    c.moveTo(x1 + (rnd() - .5) * jit, y1 + (rnd() - .5) * jit);
    for (let i = 1; i <= n; i++) {
      const t = i / n, o = (rnd() - .5) * jit * 2;
      c.lineTo(x1 + (x2 - x1) * t + nx * o, y1 + (y2 - y1) * t + ny * o);
    }
  };
  SK.stroke = (c, pts, rnd, jit = 1.2, close = false) => {
    c.beginPath();
    for (let i = 0; i < pts.length - (close ? 0 : 1); i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (i === 0) c.moveTo(a[0], a[1]);
      SK.line(c, a[0], a[1], b[0], b[1], rnd, jit);
    }
  };
  SK.circle = (c, x, y, r, rnd, jit = 0.12, steps = 14) => {
    c.beginPath();
    const off = rnd() * 6.28;
    for (let i = 0; i <= steps + 1; i++) {
      const a = off + (i / steps) * Math.PI * 2;
      const rr = r * (1 + (rnd() - .5) * jit);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
  };
  SK.hatch = (c, x, y, w, h, rnd, spacing = 6, angle = 0.8) => {
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.beginPath();
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const L = w + h;
    for (let s = -L; s < L; s += spacing + rnd() * 2) {
      const cx = x + w / 2 + s * dy, cy = y + h / 2 - s * dx;
      SK.line(c, cx - dx * L, cy - dy * L, cx + dx * L, cy + dy * L, rnd, 0.8);
    }
    c.stroke(); c.restore();
  };

  // 纸张纹理
  U.makePaper = (w, h) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    const img = c.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const n = Math.random();
      const v = 128 + (n - .5) * 40;
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 22;
    }
    c.putImageData(img, 0, 0);
    // 纤维
    const r = U.rng(7);
    c.strokeStyle = 'rgba(90,70,40,0.05)'; c.lineWidth = 1;
    for (let i = 0; i < w * h / 900; i++) {
      const x = r() * w, y = r() * h, a = r() * 6.28, l = 6 + r() * 20;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + 1) * l / 2, y + Math.sin(a + 1) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    return cv;
  };

  U.shade = (hex, f) => { // f<1 darker, >1 lighter
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f < 1) { r *= f; g *= f; b *= f; } else { r += (255 - r) * (f - 1); g += (255 - g) * (f - 1); b += (255 - b) * (f - 1); }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  };

  G.U = U; G.SK = SK;
})();
