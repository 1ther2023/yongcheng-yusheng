// ===== 美术资源加载：手绘角色、武器、道具、贴图 =====
(function () {
  const A = { img: {}, white: {}, pat: {} };
  const SPR = ['player', 'h_bandit', 'h_npc', 'z_walker', 'z_runner', 'z_crawler', 'z_bloater', 'z_tentacle', 'z_thrower', 'z_brute', 'tree', 'corpse',
    'w_fruitknife', 'w_melonknife', 'w_woodstick', 'w_cleaver', 'w_pipe', 'w_fireaxe', 'w_hammer', 'w_shovel', 'w_machete', 'w_baton', 'w_chainsaw', 'w_nailgun',
    'w_pistol92', 'w_revolver', 'w_huntshot', 'w_shotgun97', 'w_smg05', 'w_rifle95', 'w_slingbow',
    'p_car', 'p_ebike', 'p_locker', 'p_pile', 'p_airdrop', 'p_trash', 'p_stool'];
  const TEX = ['tex_asphalt', 'tex_sidewalk', 'tex_grass', 'tex_water', 'tex_roof_concrete', 'tex_roof_tile', 'tex_roof_metal', 'tex_facade_res', 'tex_facade_glass', 'tex_facade_shop'];
  const load = (name, ext) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { A.img[name] = im; res(); };
    im.onerror = () => { console.warn('missing asset ' + name); res(); };
    im.src = 'assets/' + name + '.' + ext;
  });
  // 受击时的白色剪影
  function makeWhite(im) {
    const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
    const c = cv.getContext('2d'); c.drawImage(im, 0, 0);
    c.globalCompositeOperation = 'source-in'; c.fillStyle = '#fff6e8'; c.fillRect(0, 0, cv.width, cv.height);
    return cv;
  }
  A.ready = Promise.all(SPR.map(n => load(n, 'png')).concat(TEX.map(n => load(n, 'jpg')))).then(() => {
    for (const n of SPR) if (A.img[n] && /^(player|h_|z_)/.test(n)) A.white[n] = makeWhite(A.img[n]);
  });
  // 世界对齐的贴图图案
  A.pattern = (c, name, ox, oy, scale = 0.5) => {
    const im = A.img[name]; if (!im) return null;
    const p = c.createPattern(im, 'repeat');
    p.setTransform(new DOMMatrix().translate(ox, oy).scale(scale));
    return p;
  };
  G.A = A;
})();
