// ===== 界面：标题 / 剧情 / 据点 / 背包 / 搜刮 / 天赋 / 结算 =====
(function () {
  const U = G.U, D = G.D, S = G.S;
  const UI = {};
  const $ = (id) => document.getElementById(id);
  const scr = () => $('screen');
  const esc = (s) => String(s).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

  UI.show = (html) => { const s = scr(); s.innerHTML = html; s.classList.remove('hidden'); s.scrollTop = 0; };
  UI.hide = () => { scr().classList.add('hidden'); scr().innerHTML = ''; };
  UI.toast = (t, ms = 2200) => { const el = $('toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(UI._tt); UI._tt = setTimeout(() => el.style.opacity = 0, ms); };
  UI.log = (t) => { const el = $('hud-log'); const d = document.createElement('div'); d.textContent = t; el.appendChild(d); while (el.children.length > 7) el.removeChild(el.firstChild); setTimeout(() => d.remove(), 6200); };

  // ---------- 物品显示 ----------
  UI.itemInfo = (it) => {
    const d = D.items[it.id];
    let s = '';
    if (d.type === 'gun') s = `伤害${d.dmg}${d.pellets ? '×' + d.pellets : ''} · 弹匣${it.mag}/${d.mag} · ${D.items[d.ammo].name}`;
    else if (d.type === 'melee') s = d.chainsaw ? `持续切割 · 油量${Math.round(it.fuel || 0)}%` : `伤害${d.dmg} · 攻速${(1 / d.speed).toFixed(1)}/秒`;
    else if (d.type === 'armor') s = `减伤${Math.round(d.armor * 100)}% · 耐久${Math.round(it.dur)}/${d.dur}`;
    else if (d.type === 'bag') s = `容量${d.cap}格`;
    else if (d.heal || d.infect || d.food) s = [d.heal ? '生命+' + d.heal : '', d.infect ? '感染' + d.infect : '', d.food ? '饱食+' + d.food : '', d.stopBleed ? '止血' : ''].filter(Boolean).join(' ');
    return s;
  };
  UI.itemHTML = (it, act, extra = '') => {
    const d = D.items[it.id];
    return `<div class="item r${d.r}" data-act="${act}">${it.n > 1 ? `<span class="ct">×${it.n}</span>` : ''}${it.ins ? '<span class="ct" style="top:22px;color:#2f5f9f">保</span>' : ''}<div class="nm">${d.name}</div><div class="ds">${UI.itemInfo(it) || D.rarityName[d.r]}</div>${extra}</div>`;
  };
  const bind = (sel, fn) => document.querySelectorAll(sel).forEach((el) => el.onclick = (ev) => fn(el, ev));

  // ---------- 标题 ----------
  UI.title = () => {
    G.game.mode = 'menu';
    $('hud').classList.add('hidden');
    const has = !!S.load();
    UI.show(`<div class="paper story" style="text-align:center">
      <h1>邕城余生</h1>
      <div class="sub">南宁 · 丧尸末日 · 搜打撤 Roguelite</div>
      <p style="margin:18px 0">一个普通打工人，一座沦陷的绿城。<br>进城、搜刮、在尸潮到来前撤离。</p>
      ${has ? '<div class="btn big" id="b-cont">继续求生</div><br>' : ''}
      <div class="btn big" id="b-new">新的开始</div><br>
      <div class="btn" id="b-hard">硬核模式（死亡即删档）</div>
      <p class="sub" style="margin-top:20px;font-size:13px">地图依据南宁兴宁区/青秀区老城真实街道生成 · ${MAP_DATA.attribution}<br>本作纯属虚构，与现实人物、单位无关。</p>
    </div>`);
    if (has) $('b-cont').onclick = () => { G.st = S.load(); UI.hub(); };
    $('b-new').onclick = () => UI.confirmNew(false);
    $('b-hard').onclick = () => UI.confirmNew(true);
  };
  UI.confirmNew = (hard) => {
    if (S.load() && !confirm('开始新游戏会覆盖现有存档，确定吗？')) return;
    G.st = S.fresh(hard); S.save(G.st); UI.intro();
  };
  UI.intro = () => {
    let i = 0;
    const step = () => {
      const ps = D.intro.slice(0, i + 1).map((p, k) => `<p style="opacity:${k === i ? 1 : .75}">${p}</p>`).join('');
      UI.show(`<div class="paper story"><h2>邕江热</h2>${ps}<div style="text-align:right"><div class="btn" id="b-next">${i < D.intro.length - 1 ? '继续' : '回到出租屋'}</div> <div class="btn small" id="b-skip">跳过</div></div></div>`);
      $('b-next').onclick = () => { i++; if (i >= D.intro.length) { G.st.introSeen = true; S.save(G.st); UI.hub(); } else step(); };
      $('b-skip').onclick = () => { G.st.introSeen = true; S.save(G.st); UI.hub(); };
    };
    step();
  };

  // ---------- 据点 ----------
  UI.packCap = (st) => (st.loadout.bag ? D.items[st.loadout.bag.id].cap : 4) + S.sk(st, 'carry') * 2;
  UI.addStash = (st, it) => {
    const d = D.items[it.id];
    if (d.stack > 1) { const ex = st.stash.find(s => s.id === it.id); if (ex) { ex.n += it.n; return; } }
    st.stash.push(Object.assign({}, it));
  };
  UI.sellPrice = (it) => { const d = D.items[it.id]; return Math.round(d.value * (d.type === 'loot' ? 1 : 0.5)) * it.n; };
  UI.buyPrice = (id) => Math.ceil(D.items[id].value * 1.25);
  UI.refreshShop = (st) => {
    if (st.shop && st.shop.day === st.day) return;
    const items = U.shuffle(D.shop.slice()).slice(0, 12).map(id => ({ id, n: D.items[id].stack > 1 ? Math.min(D.items[id].stack, U.randi(2, 30)) : 1 }));
    const rare = U.shuffle(D.shopRare.slice()).slice(0, 3 + Math.min(3, Math.floor(st.day / 4))).map(id => ({ id, n: D.items[id].stack > 1 ? U.randi(5, 30) : 1 }));
    st.shop = { day: st.day, items: items.concat(rare) };
  };

  UI.hub = (tab = 'home') => {
    const st = G.st;
    G.game.mode = 'hub'; G.raid = null;
    $('hud').classList.add('hidden');
    UI.refreshShop(st);
    if (st.claims && st.claims.length) {
      for (const it of st.claims) UI.addStash(st, it);
      UI.toast('阿秦送来了理赔：' + st.claims.map(i => D.items[i.id].name).join('、'), 3500);
      st.claims = [];
    }
    S.save(st);
    const tabs = [['home', '出租屋'], ['gear', '装备与仓库'], ['trade', '卡口 · 交易'], ['skill', '技能' + (st.skillPts ? `(${st.skillPts})` : '')], ['ins', '保险'], ['go', '出发进城']];
    const head = `<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap"><h1 style="font-size:34px">西乡塘 · 城中村 <span class="sub">第 ${st.day} 天${st.hardcore ? ' · 硬核' : ''}</span></h1><div style="font-size:20px">积分 <span class="money">${st.money}</span> / ${D.EVAC_COST}</div></div>
      <div class="tabs">${tabs.map(([k, n]) => `<span class="btn ${k === tab ? 'on' : ''}" data-tab="${k}">${n}</span>`).join('')}<span class="btn small" id="b-title" style="float:right">标题</span></div>`;
    let body = '';
    if (tab === 'home') body = UI.tabHome(st);
    else if (tab === 'gear') body = UI.tabGear(st);
    else if (tab === 'trade') body = UI.tabTrade(st);
    else if (tab === 'skill') body = UI.tabSkill(st);
    else if (tab === 'ins') body = UI.tabIns(st);
    else if (tab === 'go') body = UI.tabGo(st);
    UI.show(`<div class="paper">${head}${body}</div>`);
    bind('[data-tab]', (el) => UI.hub(el.dataset.tab));
    $('b-title').onclick = () => UI.title();
    UI['bind_' + tab] && UI['bind_' + tab](st);
  };

  UI.tabHome = (st) => {
    const di = D.diary[Math.min(st.diary, D.diary.length - 1)];
    const pct = Math.min(100, st.money / D.EVAC_COST * 100);
    return `<div class="cols"><div><h2>日记</h2><div class="diary">${st.diary < D.diary.length ? di : '第' + st.day + '天。又活过了一天。'}</div>
      <h3>撤离名额进度</h3><div class="bar"><div class="track" style="height:18px"><div class="fill hp" style="width:${pct}%"></div></div></div>
      <p class="sub">邕江北岸民兵卡口：交物资换积分，攒够 ${D.EVAC_COST} 积分可换一张撤离车票。</p></div>
      <div><h2>韦小东</h2><table class="tb">
      <tr><td>身份</td><td>物流园夜班分拣员，26岁，宾阳人</td></tr>
      <tr><td>可用技能点</td><td>${st.skillPts}</td></tr>
      <tr><td>进城次数</td><td>${st.stats.raids}</td></tr><tr><td>成功撤离</td><td>${st.stats.extracts}</td></tr>
      <tr><td>倒下次数</td><td>${st.stats.deaths}</td></tr><tr><td>累计击杀</td><td>${st.stats.kills}</td></tr></table>
      <h3>村里的人</h3><p><b>老黄</b>：开小卖部的，什么都收，什么都卖。<br><b>阿秦</b>：以前跑保险的，现在还在“跑”——给大家的装备上保险。<br><b>民兵小覃</b>：卡口登记员，凭物资给积分。</p>
      <div class="btn big" data-tab="go">出发进城 →</div></div></div>`;
  };

  // 装备 & 仓库
  UI.sel = null;
  UI.tabGear = (st) => {
    const L = st.loadout;
    const slotNames = { primary: '主武器', secondary: '副武器', melee: '近战', helmet: '头盔', body: '护甲', bag: '背包' };
    const slots = Object.keys(slotNames).map(k => `<div class="slot"><span class="k">${slotNames[k]}</span><span class="v">${L[k] ? `<b>${D.items[L[k].id].name}</b> <span class="sub">${UI.itemInfo(L[k])}</span>${L[k].ins ? ' <span style="color:#2f5f9f">[已保]</span>' : ''}` : '<span class="sub">空</span>'}</span>${L[k] ? `<span class="btn small" data-unequip="${k}">卸下</span>` : ''}</div>`).join('');
    const cap = UI.packCap(st);
    return `<div class="cols"><div><h2>身上的装备</h2>${slots}
      <h2>随身背包 <span class="sub">${st.pack.length}/${cap} 格 · 带进城的东西</span></h2><div class="grid">${st.pack.map((it, i) => UI.itemHTML(it, 'pack:' + i)).join('') || '<span class="sub">空</span>'}</div></div>
      <div><h2>仓库</h2><div class="grid">${st.stash.map((it, i) => UI.itemHTML(it, 'stash:' + i)).join('') || '<span class="sub">空空如也</span>'}</div>
      <div class="detail" id="detail">点击物品查看操作。</div></div></div>`;
  };
  UI.bind_gear = (st) => {
    bind('[data-unequip]', (el) => { const k = el.dataset.unequip; UI.addStash(st, st.loadout[k]); st.loadout[k] = null; UI.trimPack(st); S.save(st); UI.hub('gear'); });
    bind('[data-act]', (el) => {
      const [where, i] = el.dataset.act.split(':'); const list = where === 'pack' ? st.pack : st.stash; const it = list[+i]; const d = D.items[it.id];
      const btns = [];
      if (where === 'stash') {
        if (d.slot) btns.push(`<span class="btn" id="a-eq">装备</span>`);
        btns.push(`<span class="btn" id="a-pk">放入背包</span>`);
        if (d.stack > 1 && it.n > 1) btns.push(`<span class="btn" id="a-pkall">放入背包(尽量多)</span>`);
      } else btns.push(`<span class="btn" id="a-back">放回仓库</span>`);
      $('detail').innerHTML = `<b style="font-size:18px">${d.name}</b> <span class="sub">${D.rarityName[d.r]} · 价值${d.value}</span><p>${d.desc || ''}</p><p class="sub">${UI.itemInfo(it)}</p>${btns.join('')}`;
      const eq = $('a-eq'); if (eq) eq.onclick = () => { const old = st.loadout[d.slot]; st.loadout[d.slot] = Object.assign({}, it, { n: 1 }); if (it.n > 1) it.n--; else st.stash.splice(+i, 1); if (old) UI.addStash(st, old); UI.trimPack(st); S.save(st); UI.hub('gear'); };
      const pk = $('a-pk'); if (pk) pk.onclick = () => UI.toPack(st, +i, false);
      const pka = $('a-pkall'); if (pka) pka.onclick = () => UI.toPack(st, +i, true);
      const bk = $('a-back'); if (bk) bk.onclick = () => { UI.addStash(st, it); st.pack.splice(+i, 1); S.save(st); UI.hub('gear'); };
    });
  };
  UI.toPack = (st, i, all) => {
    const it = st.stash[i], d = D.items[it.id];
    const cap = UI.packCap(st);
    let moved = 0;
    do {
      if (st.pack.length >= cap) { UI.toast('背包满了'); break; }
      const n = Math.min(d.stack, it.n);
      st.pack.push(Object.assign({}, it, { n })); it.n -= n; moved++;
    } while (all && it.n > 0);
    if (it.n <= 0) st.stash.splice(i, 1);
    S.save(st); UI.hub('gear');
  };
  UI.trimPack = (st) => { const cap = UI.packCap(st); while (st.pack.length > cap) UI.addStash(st, st.pack.pop()); };

  // 交易
  UI.tabTrade = (st) => {
    const canEvac = st.money >= D.EVAC_COST;
    return `<div class="cols"><div><h2>老黄的小卖部 <span class="sub">每天进货不同</span></h2><div class="grid">${st.shop.items.map((s, i) => UI.itemHTML(s, 'buy:' + i, `<div class="money">${UI.buyPrice(s.id)} 积分/件</div>`)).join('')}</div></div>
      <div><h2>卖给卡口 / 老黄 <span class="sub">物资类全价，其他半价</span></h2><div class="grid">${st.stash.map((it, i) => UI.itemHTML(it, 'sell:' + i, `<div class="money">${UI.sellPrice(it)}</div>`)).join('') || '<span class="sub">仓库是空的</span>'}</div>
      <div class="detail" id="detail">点击左侧商品购买 1 件；点击右侧仓库物品出售（整组）。</div>
      <h2>撤离车票</h2><p>民兵小覃：“${canEvac ? '够了，你的名字我写上了。明早六点，邕江大桥北桥头。' : '还差 ' + (D.EVAC_COST - st.money) + ' 积分。药、电池、粮食，卡口都要。'}”</p>
      <span class="btn big ${canEvac ? '' : ''}" id="b-evac" ${canEvac ? '' : 'disabled'}>兑换撤离名额（${D.EVAC_COST}）</span></div></div>`;
  };
  UI.bind_trade = (st) => {
    bind('[data-act]', (el) => {
      const [k, i] = el.dataset.act.split(':');
      if (k === 'buy') {
        const s = st.shop.items[+i], p = UI.buyPrice(s.id);
        if (st.money < p) return UI.toast('积分不够');
        st.money -= p; UI.addStash(st, S.newItem(s.id, 1)); s.n--; if (s.n <= 0) st.shop.items.splice(+i, 1);
      } else {
        const it = st.stash[+i]; st.money += UI.sellPrice(it); st.stash.splice(+i, 1);
      }
      S.save(st); UI.hub('trade');
    });
    const e = $('b-evac'); if (e) e.onclick = () => { if (st.money < D.EVAC_COST) return; st.money -= D.EVAC_COST; st.evac = true; S.save(st); UI.ending(); };
  };

  // 技能
  UI.tabSkill = (st) => {
    return `<p>可用技能点：<b class="money">${st.skillPts}</b> <span class="sub">（成功撤离按本局经验获得技能点；倒下只保留三成经验）</span></p>` +
      D.skillTree.map(b => `<div class="skill"><h3>${b.branch}</h3>${b.nodes.map(n => { const l = S.sk(st, n.id); return `<div class="node ${l >= n.max ? 'max' : ''}"><span class="lv">${l}/${n.max}</span><b>${n.name}</b><div class="sub">${n.desc(Math.max(1, l))}</div>${l < n.max ? `<span class="btn small" data-sk="${n.id}" ${st.skillPts ? '' : 'disabled'}>+ 学习</span>` : ''}</div>`; }).join('')}</div>`).join('');
  };
  UI.bind_skill = (st) => bind('[data-sk]', (el) => { if (!st.skillPts) return; st.skills[el.dataset.sk] = S.sk(st, el.dataset.sk) + 1; st.skillPts--; S.save(st); UI.hub('skill'); });

  // 保险
  UI.tabIns = (st) => {
    const list = [];
    for (const k in st.loadout) if (st.loadout[k]) list.push(['L', k, st.loadout[k]]);
    st.pack.forEach((it, i) => list.push(['P', i, it]));
    const rows = list.map(([w, k, it]) => { const d = D.items[it.id]; const cost = Math.ceil(d.value * it.n * 0.2); return `<tr><td>${d.name}${it.n > 1 ? '×' + it.n : ''}</td><td>${d.value * it.n}</td><td>${it.ins ? '<span style="color:#2f5f9f">已投保</span>' : `<span class="btn small" data-ins="${w}:${k}">投保 ${cost} 积分</span>`}</td></tr>`; }).join('');
    return `<div class="cols"><div style="max-width:420px"><h2>阿秦的“邕城互助保”</h2>
      <p>“小东，又要进城啊？人保不了，装备我还能保一保。”</p>
      <p class="sub">规则：保费为物品价值的20%，仅对下一次进城有效。若你在城里倒下，每件投保物品有 70% 概率被“理赔”送回仓库（阿秦会托人去捡）。成功撤离则保单作废。</p>
      <p class="sub">——干了七年保险，阿秦说她最怕的不是丧尸，是客户说“我再考虑考虑”。</p></div>
      <div><h2>可投保物品</h2><table class="tb"><tr><th>物品</th><th>价值</th><th></th></tr>${rows || '<tr><td colspan=3 class="sub">先在【装备与仓库】里装备或放入背包。</td></tr>'}</table></div></div>`;
  };
  UI.bind_ins = (st) => bind('[data-ins]', (el) => {
    const [w, k] = el.dataset.ins.split(':'); const it = w === 'L' ? st.loadout[k] : st.pack[+k];
    const cost = Math.ceil(D.items[it.id].value * it.n * 0.2);
    if (st.money < cost) return UI.toast('积分不够');
    st.money -= cost; it.ins = true; S.save(st); UI.hub('ins');
  });

  // 出发
  UI.genRaidOpts = () => {
    const M = G.M;
    const opts = [];
    const deps = U.shuffle(M.deploys.slice());
    for (let i = 0; i < 3; i++) {
      const dp = deps[i];
      const mods = [];
      const tod = U.weighted([['day', 5], ['dusk', 2], ['night', 2]]);
      if (tod !== 'day') mods.push(tod);
      if (Math.random() < .35) mods.push('rain');
      const ev = U.shuffle(['airdrop', 'bandits', 'mutants', 'horde', 'survivor', 'quiet', 'airdrop', 'survivor']);
      mods.push(ev[0]); if (Math.random() < .35 && ev[1] !== ev[0]) mods.push(ev[1]);
      const z = M.zoneAt(dp.x, dp.y);
      const near = M.landmarks.filter(l => U.dist(l.x, l.y, dp.x, dp.y) < 160).sort((a, b) => U.d2(a.x, a.y, dp.x, dp.y) - U.d2(b.x, b.y, dp.x, dp.y)).slice(0, 3).map(l => l.name);
      opts.push({ deploy: dp, mods: [...new Set(mods)], danger: z.danger, near });
    }
    return opts;
  };
  UI.tabGo = (st) => {
    if (!G.game.raidOpts || G.game.raidOptsDay !== st.day) { G.game.raidOpts = UI.genRaidOpts(); G.game.raidOptsDay = st.day; }
    const L = st.loadout;
    const warn = (!L.primary && !L.secondary) ? '<p class="danger">提醒：你没有带任何枪械。</p>' : '';
    return `<p>选择今天的潜入路线。每条路线的天气与城中事件都不同——这是一座每天都在变化的死城。</p>${warn}` +
      G.game.raidOpts.map((o, i) => `<div class="raidcard"><div class="t">${o.deploy.name}</div>
        <div class="danger">危险度 ${'★'.repeat(Math.round(o.danger))}</div>
        <p class="sub">附近：${o.near.join('、') || '老城街巷'}</p>
        <ul style="padding-left:18px;margin:6px 0">${o.mods.map(m => { const md = D.mods.find(x => x.id === m); return `<li><b>${md.name}</b>：<span class="sub">${md.desc}</span></li>`; }).join('')}</ul>
        <span class="btn big" data-go="${i}">从这里进城</span></div>`).join('') +
      `<p class="sub">撤离窗口 15 分钟；12 分钟时尸潮来袭（部分事件会提前）。背包里的东西都会带进城——倒下就全部丢失。</p>`;
  };
  UI.bind_go = (st) => bind('[data-go]', (el) => { const o = G.game.raidOpts[+el.dataset.go]; G.startRaid(o); });

  // ---------- 局内 HUD ----------
  UI.enterRaid = () => { UI.hide(); $('hud').classList.remove('hidden'); $('hud-log').innerHTML = ''; };
  UI.updateHud = (raid) => {
    const P = raid.player;
    const left = raid.timeLimit - raid.time;
    const tm = $('hud-timer'); tm.textContent = (raid.hordeOn ? '尸潮！撤离窗口 ' : '撤离窗口 ') + U.fmtTime(left);
    tm.className = left < 200 || raid.hordeOn ? 'warn' : '';
    $('hud-zone').textContent = raid.zone.name + ' · 危险 ' + '★'.repeat(Math.round(raid.zone.danger));
    $('hud-mods').textContent = raid.opt.mods.map(m => D.mods.find(x => x.id === m).name).join(' · ');
    $('b-hp').style.width = (P.hp / P.maxhp * 100) + '%'; $('t-hp').textContent = Math.ceil(P.hp) + '/' + P.maxhp;
    $('b-st').style.width = (P.stamina / P.maxst * 100) + '%';
    $('b-hu').style.width = P.hunger + '%';
    $('b-in').style.width = P.infect + '%'; $('t-in').textContent = Math.floor(P.infect) + '%';
    const stt = [];
    if (P.bleed) stt.push('流血'); if (P.hunger < 20) stt.push('饥饿'); if (P.infect > 50) stt.push('高烧'); if (P.slowT > 0) stt.push('减速'); if (P.focusT > 0) stt.push('专注'); if (P.useT > 0) stt.push('使用中…'); if (P.exhausted) stt.push('脱力');
    for (const id of raid.perks) { const pk = D.perks.find(p => p.id === id); }
    $('hud-status').textContent = stt.join(' · ') + (raid.perks.size ? '  天赋:' + [...raid.perks].map(id => D.perks.find(p => p.id === id).name).join('/') : '');
    const w = P.curWeapon(), d = D.items[w.id];
    $('w-name').textContent = d.name;
    if (d.type === 'gun') $('w-ammo').innerHTML = `${w.mag} <small>/ ${P.countItem(d.ammo)} ${D.items[d.ammo].name}</small>`;
    else if (d.chainsaw) $('w-ammo').innerHTML = `<small>油量</small> ${Math.round(w.fuel || 0)}% <small>汽油×${P.countItem('fuel')}</small>`;
    else $('w-ammo').innerHTML = '<small>近战</small>';
    const sl = (k, n) => P.equip[k] || k === 'melee' ? `${P.slot === k ? '<b>' : ''}${n}.${P.equip[k] ? D.items[P.equip[k].id].name : '拳头'}${P.slot === k ? '</b>' : ''}` : '';
    $('w-slots').innerHTML = [sl('primary', 1), sl('secondary', 2), sl('melee', 3)].filter(Boolean).join(' · ');
    const th = P.curThrow();
    $('w-throw').textContent = th ? `G 投掷：${D.items[th].name}×${P.countItem(th)}（T 切换）` : '无投掷物';
    $('b-xp').style.width = (raid.xpProgress() * 100) + '%'; $('t-lv').textContent = `本局等级 ${raid.level} · 经验 ${raid.xp} · 击杀 ${raid.kills}`;
    $('hud-extract').innerHTML = '<b>撤离点</b>' + raid.extracts.filter(e => e.open || e.pending).map(e => `<div class="${e.open ? 'open' : 'closed'}">${e.name} ${Math.round(U.dist(P.x, P.y, e.x, e.y) * 4)}m${e.pending ? ' (' + U.fmtTime(e.opensAt - raid.time) + '后开)' : ''}</div>`).join('');
    // 交互提示
    const it = raid.findInteract();
    const pr = $('hud-prompt'), pg = $('hud-progress');
    if (raid.extractHold > 0) {
      pr.textContent = '正在撤离：' + raid.extractName + (raid.extractName.includes('地铁') ? '（等待检修门打开）' : '');
      pg.classList.remove('hidden'); $('prog-fill').style.width = (raid.extractHold / raid.extractNeed * 100) + '%'; $('prog-text').textContent = U.fmtTime(raid.extractNeed - raid.extractHold);
    } else if (G.game.searching) {
      const s = G.game.searching;
      pr.textContent = '搜索中：' + raid.containerName(s.c) + '（按住 E）';
      pg.classList.remove('hidden'); $('prog-fill').style.width = (s.t / s.need * 100) + '%'; $('prog-text').textContent = '';
    } else {
      pg.classList.add('hidden');
      if (it && it.type === 'npc') pr.textContent = '[E] 救援幸存者';
      else if (it) pr.textContent = `[E] ${it.searched ? '查看' : '搜索'}：${raid.containerName(it)}`;
      else pr.textContent = '';
    }
  };

  // ---------- 天赋三选一 ----------
  UI.offerPerk = () => {
    const raid = G.raid; if (!raid || G.game.panel) return;
    if (raid.pendingPerks <= 0) return;
    const pool = D.perks.filter(p => !raid.perks.has(p.id));
    const picks = [];
    while (picks.length < 3 && pool.length) { const p = U.weighted(pool.map(x => [x, x.w])); picks.push(p); pool.splice(pool.indexOf(p), 1); }
    G.game.panel = 'perk';
    UI.show(`<div class="paper" style="text-align:center;max-width:900px"><h2>升级！本局等级 ${raid.level - raid.pendingPerks + 1}</h2><p class="sub">肾上腺素让你学得很快。选择一项本局天赋（撤离或倒下后失效）。</p>
      ${picks.map(p => `<div class="perk" data-perk="${p.id}"><div class="t">${p.name}</div><p>${p.desc}</p></div>`).join('')}</div>`);
    bind('[data-perk]', (el) => { raid.applyPerk(el.dataset.perk); raid.pendingPerks--; G.game.panel = null; UI.hide(); if (raid.pendingPerks > 0) setTimeout(UI.offerPerk, 50); });
  };

  // ---------- 搜刮面板 ----------
  UI.openLoot = (c) => {
    G.game.panel = 'loot'; G.game.lootC = c;
    UI.renderLoot();
  };
  UI.renderLoot = () => {
    const raid = G.raid, P = raid.player, c = G.game.lootC;
    const items = c.items || [];
    UI.show(`<div class="paper"><span class="btn small close-x" id="b-close">关闭 (E/Esc)</span><h2>${esc(raid.containerName(c))}</h2>
      <div class="cols"><div><h3>找到的东西</h3><div class="grid">${items.map((it, i) => UI.itemHTML(it, 'take:' + i)).join('') || '<span class="sub">什么都没有了。</span>'}</div>
      ${items.length ? '<span class="btn" id="b-all">全部拿走</span>' : ''}</div>
      <div><h3>背包 ${P.pack.length}/${P.capacity()}</h3><div class="grid">${P.pack.map((it, i) => UI.itemHTML(it, 'put:' + i)).join('') || '<span class="sub">空</span>'}</div><p class="sub">点击左侧拿取（空槽位的武器/防具会直接装备）；点击背包物品放回。时间仍在流逝，注意身后。</p></div></div></div>`);
    $('b-close').onclick = UI.closePanel;
    const all = $('b-all'); if (all) all.onclick = () => { for (let i = items.length - 1; i >= 0; i--) UI.takeLoot(i, true); UI.renderLoot(); };
    bind('[data-act]', (el) => {
      const [k, i] = el.dataset.act.split(':');
      if (k === 'take') UI.takeLoot(+i); else { const it = P.pack.splice(+i, 1)[0]; c.items.push(it); }
      UI.renderLoot();
    });
  };
  UI.takeLoot = (i, quiet) => {
    const raid = G.raid, P = raid.player, c = G.game.lootC;
    const it = c.items[i], d = D.items[it.id];
    if (d.slot && !P.equip[d.slot]) { P.equip[d.slot] = it; c.items.splice(i, 1); raid.log('装备了 ' + d.name); return; }
    const left = P.addItem(it);
    if (left === 0) c.items.splice(i, 1); else { it.n = left; if (!quiet) UI.toast('背包满了'); }
  };
  UI.closePanel = () => { G.game.panel = null; G.game.lootC = null; UI.hide(); };

  // ---------- 背包(Tab) ----------
  UI.openInv = () => { G.game.panel = 'inv'; UI.renderInv(); };
  UI.renderInv = (msg) => {
    const raid = G.raid, P = raid.player;
    const names = { primary: '主武器', secondary: '副武器', melee: '近战', helmet: '头盔', body: '护甲', bag: '背包' };
    UI.show(`<div class="paper"><span class="btn small close-x" id="b-close">关闭 (Tab)</span><h2>背包</h2><div class="cols">
      <div><h3>装备</h3>${Object.keys(names).map(k => `<div class="slot"><span class="k">${names[k]}</span><span class="v">${P.equip[k] ? `<b>${D.items[P.equip[k].id].name}</b> <span class="sub">${UI.itemInfo(P.equip[k])}</span>` : '<span class="sub">空</span>'}</span>${P.equip[k] && k !== 'bag' ? `<span class="btn small" data-un="${k}">卸下</span>` : ''}</div>`).join('')}
      <p>生命 ${Math.ceil(P.hp)}/${P.maxhp} · 饱食 ${Math.round(P.hunger)} · 感染 ${Math.floor(P.infect)}% ${P.bleed ? '· <span class="danger">流血中</span>' : ''} · 护甲减伤 ${Math.round(P.armorValue() * 100)}%</p></div>
      <div><h3>背包 ${P.pack.length}/${P.capacity()}</h3><div class="grid">${P.pack.map((it, i) => UI.itemHTML(it, 'inv:' + i)).join('') || '<span class="sub">空</span>'}</div>
      <div class="detail" id="detail">${msg || '点击物品：使用 / 装备 / 丢弃。'}</div></div></div></div>`);
    $('b-close').onclick = UI.closePanel;
    bind('[data-un]', (el) => { const k = el.dataset.un; const it = P.equip[k]; if (P.addItem(it) === 0) { P.equip[k] = null; if (P.slot === k) P.slot = 'melee'; } else UI.toast('背包满了'); UI.renderInv(); });
    bind('[data-act]', (el) => {
      const i = +el.dataset.act.split(':')[1], it = P.pack[i], d = D.items[it.id];
      const b = [];
      if (d.use) b.push('<span class="btn" id="a-use">使用</span>');
      if (d.slot) b.push('<span class="btn" id="a-eq">装备</span>');
      b.push('<span class="btn red" id="a-drop">丢弃</span>');
      $('detail').innerHTML = `<b>${d.name}</b> <span class="sub">${UI.itemInfo(it)}</span><p>${d.desc || ''}</p>${b.join('')}`;
      const u = $('a-use'); if (u) u.onclick = () => { P.startUse(it); UI.closePanel(); };
      const e = $('a-eq'); if (e) e.onclick = () => {
        const old = P.equip[d.slot]; P.equip[d.slot] = Object.assign({}, it, { n: 1 });
        if (it.n > 1) it.n--; else P.pack.splice(i, 1);
        if (old) { if (P.addItem(old) > 0) raid.dropItem(old); }
        while (P.pack.length > P.capacity()) raid.dropItem(P.pack.pop());
        if (d.type === 'gun' || d.type === 'melee') P.slot = d.slot;
        UI.renderInv('已装备 ' + d.name);
      };
      $('a-drop').onclick = () => { P.pack.splice(i, 1); raid.dropItem(it); UI.renderInv('丢在了地上'); };
    });
  };

  // ---------- 暂停 ----------
  UI.pause = () => {
    G.game.panel = 'pause';
    UI.show(`<div class="paper story" style="text-align:center"><h2>暂停</h2>
      <p class="sub">WASD 移动 · 鼠标瞄准射击 · R 换弹 · E 搜索/交互(按住) · 1/2/3 或滚轮切换武器 · G 投掷 T 切换投掷物 · 空格翻滚 · Shift 冲刺 · F 踢击 · Q 专注 · H 快速治疗 · Tab 背包 · M 全图</p>
      <p class="sub">技巧：枪声会把整条街的丧尸引来；鞭炮能把尸群引开；巨尸冲锋撞墙会眩晕；触手者出手前会有红色虚线预警，翻滚躲开。</p>
      <span class="btn big" id="b-res">继续</span><br><span class="btn red" id="b-quit">放弃本局（视为倒下）</span></div>`);
    $('b-res').onclick = UI.closePanel;
    $('b-quit').onclick = () => { UI.closePanel(); G.raid.deathCause = '放弃了'; G.raid.end('dead'); };
  };

  // ---------- 结算 ----------
  UI.raidEnded = (raid) => {
    const st = G.st, P = raid.player;
    G.game.panel = 'end';
    st.stats.raids++; st.stats.kills += raid.kills;
    let html = '';
    if (raid.result === 'extract') {
      st.stats.extracts++;
      for (const k in P.equip) if (P.equip[k]) delete P.equip[k].ins;
      st.loadout = P.equip;
      const brought = P.pack.slice();
      for (const it of brought) { delete it.ins; UI.addStash(st, it); }
      st.pack = [];
      const pts = Math.max(1, Math.floor(raid.xp / 90));
      st.skillPts += pts;
      const val = brought.reduce((s, it) => s + D.items[it.id].value * it.n, 0);
      st.stats.best = Math.max(st.stats.best, val);
      html = `<h2>撤离成功 <span class="stamp" style="border-color:#3f7a3a;color:#3f7a3a">活着回来</span></h2>
        <p>你从【${raid.extractedAt.name}】撤出了城区，回到了城中村。</p>
        <table class="tb"><tr><td>用时</td><td>${U.fmtTime(raid.time)}</td></tr><tr><td>击杀</td><td>${raid.kills}</td></tr><tr><td>本局经验</td><td>${raid.xp}（获得技能点 ${pts}）</td></tr><tr><td>带回物资价值</td><td>${val}</td></tr></table>
        <h3>带回的东西（已放入仓库）</h3><div class="grid">${brought.map(it => UI.itemHTML(it, 'x')).join('') || '<span class="sub">两手空空</span>'}</div>`;
      st.day++; st.diary++;
    } else {
      st.stats.deaths++;
      const ins = [];
      for (const k in P.equip) if (P.equip[k] && P.equip[k].ins) ins.push(P.equip[k]);
      for (const it of P.pack) if (it.ins) ins.push(it);
      const back = ins.filter(() => Math.random() < 0.7).map(it => { const c = Object.assign({}, it); delete c.ins; return c; });
      st.claims = (st.claims || []).concat(back);
      st.loadout = { primary: null, secondary: null, melee: null, helmet: null, body: null, bag: null };
      st.pack = [];
      const pts = Math.floor(raid.xp * 0.3 / 90);
      st.skillPts += pts;
      // 免费救济：保底一把菜刀和编织袋
      if (!st.stash.some(i => D.items[i.id].type === 'melee')) UI.addStash(st, S.newItem('cleaver'));
      if (!st.stash.some(i => D.items[i.id].type === 'bag')) UI.addStash(st, S.newItem('bag_plastic'));
      html = `<h2>你倒下了 <span class="stamp">${esc(raid.deathCause || '死亡')}</span></h2>
        <p>${st.hardcore ? '硬核模式：韦小东的故事到此为止。' : '巡逻的民兵在街口发现了昏迷的你，把你拖回了村。身上的东西，全丢在了城里。'}</p>
        <table class="tb"><tr><td>坚持了</td><td>${U.fmtTime(raid.time)}</td></tr><tr><td>击杀</td><td>${raid.kills}</td></tr><tr><td>保留经验</td><td>${Math.floor(raid.xp * 0.3)}（技能点 ${pts}）</td></tr>
        <tr><td>保险理赔</td><td>${ins.length ? back.length + '/' + ins.length + ' 件将送回：' + (back.map(i => D.items[i.id].name).join('、') || '无') : '未投保'}</td></tr></table>`;
      st.day += 2; st.diary++;
    }
    if (st.hardcore && raid.result !== 'extract') { S.wipe(); }
    else S.save(st);
    G.game.raidOpts = null;
    setTimeout(() => {
      $('hud').classList.add('hidden');
      UI.show(`<div class="paper">${html}<div style="margin-top:14px"><span class="btn big" id="b-back">${st.hardcore && raid.result !== 'extract' ? '回到标题' : '回到城中村'}</span></div></div>`);
      $('b-back').onclick = () => { G.game.panel = null; if (st.hardcore && raid.result !== 'extract') UI.title(); else UI.hub(); };
    }, raid.result === 'extract' ? 300 : 1200);
  };

  UI.ending = () => {
    G.game.mode = 'menu';
    UI.show(`<div class="paper story"><h2>结局 · 撤离车</h2><div class="diary">${D.endings.evac}</div>
      <p class="sub">第 ${G.st.day} 天 · 进城 ${G.st.stats.raids} 次 · 撤离 ${G.st.stats.extracts} 次 · 击杀 ${G.st.stats.kills}</p>
      <span class="btn big" id="b-t">回到标题</span> <span class="btn" id="b-c">继续留在城中村（无尽模式）</span></div>`);
    $('b-t').onclick = () => UI.title();
    $('b-c').onclick = () => UI.hub();
  };

  G.UI = UI;
})();
