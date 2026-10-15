// ===== 骨骼纸偶动画：头/躯干/上臂/前臂/大腿/小腿 =====
(function () {
  const RIG = {};
  const TUNE = { player: { sx: 6 }, brute: { sx: 4 }, thrower: { sx: 2 } };
  const part = (rig, p) => G.A.rigMeta[rig][p];
  function img(rig, p, dark) { const n = 'r_' + rig + '_' + p; return dark ? G.A.dark[n] : G.A.img[n]; }
  function blit(c, rig, p, dark, x, y, white) {
    const im = img(rig, p, dark); if (!im) return;
    c.drawImage(im, x, y);
    if (white > 0) { const w = G.A.white['r_' + rig + '_' + p]; if (w) { c.globalAlpha *= Math.min(0.85, white); c.drawImage(w, x, y); c.globalAlpha = RIG._a; } }
  }
  RIG.height = (rig) => { const m = G.A.rigMeta[rig]; return m.head.h * 0.85 + m.torso.h * 0.9 + m.thigh.h * 0.85 + m.shin.h * 0.92; };
  RIG.has = (rig) => !!(G.A.rigMeta && G.A.rigMeta[rig] && G.A.img['r_' + rig + '_torso']);

  // 一条肢体：上段绕根部转 a1（向前为正），下段相对转 a2
  function limb(c, rig, up, lo, a1, a2, dark, white, wep) {
    const U = part(rig, up), L = part(rig, lo);
    c.save(); c.rotate(-a1);
    c.save(); c.translate(U.bot - U.top, U.h * 0.86); c.rotate(-a2);
    blit(c, rig, lo, dark, -L.top, -L.h * 0.05, white);
    if (wep) { // 武器握在手里
      c.translate(L.bot - L.top, L.h * 0.84); c.rotate(wep.rel);
      if (wep.flipY) c.scale(1, -1);
      const k = 1 / RIG._s;
      c.drawImage(wep.img, -wep.L * wep.piv * k, -wep.H * 0.5 * k, wep.L * k, wep.H * k);
    }
    c.restore();
    blit(c, rig, up, dark, -U.top, -U.h * 0.06, white);
    c.restore();
  }

  // pose: bob 上下, lean 躯干前倾, head 头部倾角, thF/shF/thB/shB 腿, uaF/faF/uaB/faB 臂, wep 武器, lay 倒地角
  RIG.draw = (c, rig, x, y, H, pose, flip, white = 0) => {
    const M = G.A.rigMeta[rig];
    const s = H / RIG.height(rig); RIG._s = s; RIG._a = c.globalAlpha;
    const T = M.torso, HD = M.head;
    const legLen = M.thigh.h * 0.85 + M.shin.h * 0.92;
    c.save(); c.translate(x, y);
    if (pose.lay) { c.rotate(pose.lay * (flip ? -1 : 1)); }
    c.scale(flip ? -s : s, s);
    const hipY = -legLen * (pose.crouch || 1) - (pose.bob || 0) / s;
    const shx = (TUNE[rig] && TUNE[rig].sx) || 0;
    const shoulder = [T.top - T.bot + shx, -T.h * 0.8];
    const torsoFrame = (fn) => { c.save(); c.translate(0, hipY); c.rotate(pose.lean || 0); fn(); c.restore(); };
    // 远侧手臂
    torsoFrame(() => { c.translate(shoulder[0] - 3, shoulder[1]); limb(c, rig, 'uarm', 'farm', pose.uaB || 0, pose.faB || 0, true, white, pose.wepB); });
    // 双腿
    c.save(); c.translate(-2, hipY); limb(c, rig, 'thigh', 'shin', pose.thB || 0, pose.shB || 0, true, white); c.restore();
    c.save(); c.translate(2, hipY); limb(c, rig, 'thigh', 'shin', pose.thF || 0, pose.shF || 0, false, white); c.restore();
    // 躯干 + 头 + 近侧手臂
    torsoFrame(() => {
      blit(c, rig, 'torso', false, -T.bot, -T.h * 0.95, white);
      c.save(); c.translate(T.top - T.bot, -T.h * 0.9); c.rotate(pose.head || 0); c.scale(1.18, 1.18);
      blit(c, rig, 'head', false, -HD.bot, -HD.h * 0.9, white); c.restore();
      c.translate(shoulder[0], shoulder[1]); limb(c, rig, 'uarm', 'farm', pose.uaF || 0, pose.faF || 0, false, white, pose.wep);
    });
    c.restore();
  };

  // 走路循环
  RIG.walk = (p, amp = 1, pose = {}) => {
    const sn = Math.sin(p), cs = Math.cos(p);
    pose.thF = 0.55 * amp * sn; pose.thB = -0.55 * amp * sn;
    pose.shF = -0.15 - 0.75 * amp * Math.max(0, Math.sin(p - 1.2));
    pose.shB = -0.15 - 0.75 * amp * Math.max(0, Math.sin(p + Math.PI - 1.2));
    pose.uaF = -0.45 * amp * sn; pose.uaB = 0.45 * amp * sn;
    pose.faF = 0.35 + 0.25 * amp * Math.max(0, -sn); pose.faB = 0.35 + 0.25 * amp * Math.max(0, sn);
    pose.bob = Math.abs(cs) * 2.2 * amp;
    return pose;
  };
  RIG.idle = (t, pose = {}) => {
    const b = Math.sin(t * 2.2);
    Object.assign(pose, { thF: 0.06, thB: -0.06, shF: -0.08, shB: -0.08, uaF: 0.08 + b * 0.04, uaB: -0.06 - b * 0.04, faF: 0.3, faB: 0.25, bob: b * 0.6, head: b * 0.03 });
    return pose;
  };
  G.RIG = RIG;
})();
