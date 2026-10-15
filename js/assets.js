// ===== 美术资源加载：手绘角色、武器、道具、贴图 =====
(function () {
  const A = { img: {}, white: {}, pat: {} };
  const SPR = ['player', 'h_bandit', 'h_npc', 'z_walker', 'z_runner', 'z_crawler', 'z_bloater', 'z_tentacle', 'z_thrower', 'z_brute', 'tree', 'corpse',
    'w_fruitknife', 'w_melonknife', 'w_woodstick', 'w_cleaver', 'w_pipe', 'w_fireaxe', 'w_hammer', 'w_shovel', 'w_machete', 'w_baton', 'w_chainsaw', 'w_nailgun',
    'w_pistol92', 'w_revolver', 'w_huntshot', 'w_shotgun97', 'w_smg05', 'w_rifle95', 'w_slingbow',
    'p_car', 'p_ebike', 'p_locker', 'p_pile', 'p_airdrop', 'p_trash', 'p_stool'];
  const RIGS = {"player":{"head":{"w":62,"h":76,"top":30.946031746031746,"bot":34.27927927927928},"torso":{"w":79,"h":86,"top":46.294117647058826,"bot":48.78799249530957},"uarm":{"w":31,"h":74,"top":19.675213675213676,"bot":15.063829787234043},"farm":{"w":31,"h":96,"top":19.630434782608695,"bot":18.227272727272727},"thigh":{"w":38,"h":67,"top":17.019138755980862,"bot":15.178378378378378},"shin":{"w":44,"h":93,"top":14.550819672131148,"bot":23.46818181818182}},"bandit":{"head":{"w":59,"h":75,"top":27.942122186495176,"bot":41.385245901639344},"torso":{"w":67,"h":89,"top":23.34246575342466,"bot":37.64717741935484},"uarm":{"w":31,"h":74,"top":19.75423728813559,"bot":15.132867132867133},"farm":{"w":31,"h":96,"top":19.612903225806452,"bot":18.27127659574468},"thigh":{"w":38,"h":67,"top":17.091346153846153,"bot":15.382513661202186},"shin":{"w":44,"h":93,"top":14.594771241830065,"bot":23.74770642201835}},"npc":{"head":{"w":63,"h":72,"top":33.605947955390334,"bot":34.603896103896105},"torso":{"w":72,"h":101,"top":43.617283950617285,"bot":17.45},"uarm":{"w":31,"h":74,"top":19.906779661016948,"bot":14.424581005586592},"farm":{"w":31,"h":96,"top":19.78688524590164,"bot":18.202247191011235},"thigh":{"w":38,"h":65,"top":16.50574712643678,"bot":15.24223602484472},"shin":{"w":44,"h":93,"top":14.57843137254902,"bot":23.778280542986426}},"walker":{"head":{"w":60,"h":76,"top":31.635555555555555,"bot":32.864754098360656},"torso":{"w":58,"h":90,"top":29.103896103896105,"bot":26.704918032786885},"uarm":{"w":30,"h":69,"top":18.678260869565218,"bot":14.76923076923077},"farm":{"w":32,"h":99,"top":18.678947368421053,"bot":17.373737373737374},"thigh":{"w":38,"h":66,"top":16.059880239520957,"bot":15.784313725490197},"shin":{"w":44,"h":93,"top":14.631067961165048,"bot":23.95047169811321}},"thrower":{"head":{"w":64,"h":76,"top":28.303571428571427,"bot":31.08},"torso":{"w":54,"h":94,"top":27.0635593220339,"bot":29.678815489749432},"uarm":{"w":47,"h":94,"top":31.288537549407113,"bot":19.027397260273972},"farm":{"w":52,"h":103,"top":16.98406374501992,"bot":27.07668711656442},"thigh":{"w":34,"h":47,"top":8.985074626865671,"bot":15.472727272727273},"shin":{"w":46,"h":93,"top":14.863636363636363,"bot":24.45879732739421}},"tentacle":{"head":{"w":56,"h":74,"top":27.358139534883723,"bot":27.836601307189543},"torso":{"w":94,"h":99,"top":51.840616966580974,"bot":64.52631578947368},"uarm":{"w":32,"h":79,"top":18.959731543624162,"bot":5.435483870967742},"farm":{"w":32,"h":97,"top":18.70854271356784,"bot":17.80392156862745},"thigh":{"w":38,"h":78,"top":17.336032388663966,"bot":16.054054054054053},"shin":{"w":44,"h":94,"top":14.550819672131148,"bot":24.020881670533644}},"brute":{"head":{"w":33,"h":46,"top":15.536082474226804,"bot":12.328358208955224},"torso":{"w":84,"h":151,"top":46.359234234234236,"bot":57.510971786833856},"uarm":{"w":57,"h":125,"top":32.59763313609467,"bot":29.4338747099768},"farm":{"w":68,"h":133,"top":26.41544885177453,"bot":38.05467625899281},"thigh":{"w":37,"h":80,"top":15.414634146341463,"bot":14.841059602649006},"shin":{"w":50,"h":94,"top":17.199386503067483,"bot":26.93821510297483}},"runner":{"head":{"w":67,"h":80,"top":35.4,"bot":32.1},"torso":{"w":59,"h":91,"top":30.2,"bot":31.7},"uarm":{"w":32,"h":75,"top":20.3,"bot":15.7},"farm":{"w":27,"h":98,"top":16.8,"bot":12.9},"thigh":{"w":38,"h":67,"top":17.2,"bot":15.7},"shin":{"w":44,"h":93,"top":14.8,"bot":23.5}}};
  A.rigMeta = RIGS;
  for (const r in RIGS) for (const part in RIGS[r]) SPR.push('r_' + r + '_' + part);
  const TEX = ['tex_asphalt', 'tex_sidewalk', 'tex_grass', 'tex_water', 'tex_roof_concrete', 'tex_roof_tile', 'tex_roof_metal', 'tex_facade_res', 'tex_facade_glass', 'tex_facade_shop', 'tex_facade_tower', 'tex_facade_podium'];
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
    for (const n of SPR) if (A.img[n] && /^(player|h_|z_|r_)/.test(n)) A.white[n] = makeWhite(A.img[n]);
    A.dark = {};
    for (const n of SPR) if (A.img[n] && /^r_/.test(n)) { // 远侧肢体压暗
      const im = A.img[n], cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      const c = cv.getContext('2d'); c.drawImage(im, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(20,15,30,0.38)'; c.fillRect(0, 0, cv.width, cv.height);
      A.dark[n] = cv;
    }
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
