// ===== 实体：玩家 / 丧尸与变异体 / 掠夺者 / 幸存者 =====
(function () {
  const U = G.U, D = G.D;
  const E = {};
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  // ======================= 玩家 =======================
  class Player {
    constructor(raid, st, x, y) {
      this.kind = 'player'; this.raid = raid; this.st = st;
      this.x = x; this.y = y; this.r = 0.28; this.seed = 12345;
      this.equip = JSON.parse(JSON.stringify(st.loadout));
      this.pack = JSON.parse(JSON.stringify(st.pack));
      const sk = (id) => G.S.sk(st, id);
      this.sk = sk;
      this.maxhp = 100 + sk('vital') * 10; this.hp = this.maxhp;
      this.maxst = 100 + sk('endure') * 10; this.stamina = this.maxst;
      this.hunger = 85; this.infect = 0; this.bleed = false;
      this.slot = this.equip.primary ? 'primary' : (this.equip.secondary ? 'secondary' : 'melee');
      this.aim = 0; this.vx = 0; this.vy = 0; this.moving = false; this.walkT = 0;
      this.fireCd = 0; this.reloadT = 0; this.reloadDur = 1; this.bloom = 0;
      this.swingT = 0; this.swingDur = 0.4; this.sawTick = 0; this.sawNoise = 0;
      this.rollT = 0; this.rollCd = 0; this.rollDx = 0; this.rollDy = 0;
      this.kickCd = 0; this.focusT = 0; this.focusCd = 0;
      this.useT = 0; this.useItem = null; this.useDur = 1;
      this.hitT = 0; this.slowT = 0; this.painT = 0; this.exhausted = false;
      this.throwIdx = 0; this.stepNoise = 0; this.iframe = 0; this.pullVX = 0; this.pullVY = 0;
    }
    perk(id) { return this.raid.perks.has(id); }
    curWeapon() { return this.equip[this.slot] || (this.slot === 'melee' ? { id: 'fist', n: 1 } : null); }
    capacity() { const b = this.equip.bag; return (b ? D.items[b.id].cap : 4) + this.sk('carry') * 2; }
    magSize(d) { return d.mag <= 1 ? d.mag : Math.round(d.mag * (this.perk('p_mag') ? 1.25 : 1)); }
    countItem(id) { let n = 0; for (const it of this.pack) if (it.id === id) n += it.n; return n; }
    takeItem(id, n) {
      let need = n;
      for (let i = this.pack.length - 1; i >= 0 && need > 0; i--) {
        const it = this.pack[i]; if (it.id !== id) continue;
        const t = Math.min(it.n, need); it.n -= t; need -= t; if (it.n <= 0) this.pack.splice(i, 1);
      }
      return n - need;
    }
    // 尝试放入背包；返回未放入的数量
    addItem(item) {
      const d = D.items[item.id];
      let left = item.n;
      if (d.stack > 1) {
        for (const it of this.pack) {
          if (it.id === item.id && it.n < d.stack) { const t = Math.min(d.stack - it.n, left); it.n += t; left -= t; if (!left) return 0; }
        }
      }
      while (left > 0 && this.pack.length < this.capacity()) {
        const t = Math.min(d.stack, left);
        const ni = Object.assign({}, item, { n: t }); this.pack.push(ni); left -= t;
      }
      return left;
    }
    armorValue() {
      let a = 0;
      const h = this.equip.helmet, b = this.equip.body;
      if (h && h.dur > 0) a += D.items[h.id].armor * 0.4;
      if (b && b.dur > 0) a += D.items[b.id].armor * 0.8;
      if (this.perk('p_armor')) a += 0.08;
      return Math.min(0.6, a);
    }
    speedMul() {
      let s = 1 + this.sk('agile') * 0.03;
      if (this.perk('p_adren') && this.hp < this.maxhp * 0.3) s *= 1.2;
      if (this.slowT > 0) s *= 0.55;
      if (this.useT > 0) s *= 0.5;
      if (this.reloadT > 0) s *= 0.85;
      if (this.hunger <= 0) s *= 0.85;
      return s;
    }
    noiseMul() { return (1 - this.sk('stealth') * 0.1) * (this.perk('p_quiet') ? 0.75 : 1) * (this.raid.mods.rain ? 0.7 : 1); }
    currentSpread() {
      const w = this.curWeapon(); if (!w) return 0.05;
      const d = D.items[w.id]; if (d.type !== 'gun') return 0.03;
      let s = d.spread * (1 - this.sk('steady') * 0.08);
      if (this.moving) s *= this.sprinting ? 2.2 : 1.5;
      s += this.bloom;
      if (this.focusT > 0) s *= 0.35;
      return s;
    }

    update(dt, inp) {
      const raid = this.raid;
      const [mx, my] = G.R.toWorld(inp.mouse.x, inp.mouse.y);
      this.aim = Math.atan2(my - (this.y - 0.4), mx - this.x);
      // 计时
      for (const k of ['fireCd', 'rollCd', 'kickCd', 'focusCd', 'hitT', 'slowT', 'painT', 'iframe', 'focusT']) if (this[k] > 0) this[k] = Math.max(0, this[k] - dt);
      this.bloom = Math.max(0, this.bloom - dt * 0.35);
      // 移动
      let ix = 0, iy = 0;
      if (inp.keys['KeyW'] || inp.keys['ArrowUp']) iy -= 1;
      if (inp.keys['KeyS'] || inp.keys['ArrowDown']) iy += 1;
      if (inp.keys['KeyA'] || inp.keys['ArrowLeft']) ix -= 1;
      if (inp.keys['KeyD'] || inp.keys['ArrowRight']) ix += 1;
      const il = Math.hypot(ix, iy); if (il) { ix /= il; iy /= il; }
      this.moving = il > 0;
      const wantSprint = inp.keys['ShiftLeft'] || inp.keys['ShiftRight'];
      if (this.stamina <= 0) this.exhausted = true; if (this.stamina > 25) this.exhausted = false;
      this.sprinting = wantSprint && this.moving && !this.exhausted && this.useT <= 0 && this.reloadT <= 0;
      let spd = 3.3 * this.speedMul() * (this.sprinting ? 1.55 : 1);
      if (this.rollT > 0) {
        this.rollT -= dt;
        G.M.moveCircle(this, this.rollDx * 7.5 * dt, this.rollDy * 7.5 * dt);
      } else {
        G.M.moveCircle(this, ix * spd * dt, iy * spd * dt);
      }
      if (this.pullVX || this.pullVY) { G.M.moveCircle(this, this.pullVX * dt, this.pullVY * dt); this.pullVX *= Math.pow(0.02, dt); this.pullVY *= Math.pow(0.02, dt); if (Math.hypot(this.pullVX, this.pullVY) < 0.1) this.pullVX = this.pullVY = 0; }
      if (this.moving) this.walkT += dt * (this.sprinting ? 1.4 : 1);
      // 体力
      const hungerPen = this.hunger < 20 ? 0.5 : 1;
      if (this.sprinting) this.stamina -= dt * 14 * (this.perk('p_sprint') ? 0.6 : 1);
      else if (this.swingT <= 0) this.stamina += dt * 18 * (this.perk('p_lung') ? 1.35 : 1) * hungerPen * (this.painT > 0 ? 1.8 : 1) * (this.infect > 50 ? 0.7 : 1);
      const mxSt = this.maxst * (this.infect > 50 ? 0.8 : 1);
      this.stamina = U.clamp(this.stamina, 0, mxSt);
      // 脚步噪音
      this.stepNoise -= dt;
      if (this.moving && this.stepNoise <= 0) { raid.noise(this.x, this.y, (this.sprinting ? 6 : 2.2) * this.noiseMul(), 'step'); this.stepNoise = 0.5; }
      // 饥饿/感染/流血
      this.hunger = Math.max(0, this.hunger - dt * 0.11 * (this.perk('p_hunger') ? 0.5 : 1));
      if (this.hunger <= 0) this.hurt(dt * 0.6, null, true);
      if (this.infect > 30) this.infect += dt * 0.07;
      if (this.infect >= 100) { this.hp = 0; raid.deathCause = '感染尸变'; }
      if (this.bleed && !this.perk('p_clot')) this.hurt(dt * 1.1, null, true);
      if (this.hunger > 60 && this.infect < 30 && !this.bleed) this.hp = Math.min(this.maxhp, this.hp + dt * 0.15);
      // 使用物品
      if (this.useT > 0) {
        this.useT -= dt;
        if (this.useT <= 0) this.finishUse();
      }
      // 换弹
      const w = this.curWeapon(), d = w && D.items[w.id];
      if (this.reloadT > 0) {
        this.reloadT -= dt;
        if (this.reloadT <= 0) {
          const need = this.magSize(d) - w.mag;
          const got = this.takeItem(d.ammo, need);
          w.mag += got;
        }
      }
      if (this.swingT > 0) this.swingT -= dt;
      // 输入动作
      if (inp.pressed['KeyR']) this.startReload();
      if (inp.pressed['Digit1'] && this.equip.primary) this.switchSlot('primary');
      if (inp.pressed['Digit2'] && this.equip.secondary) this.switchSlot('secondary');
      if (inp.pressed['Digit3']) this.switchSlot('melee');
      if (inp.wheel) { const order = ['primary', 'secondary', 'melee'].filter(s => s === 'melee' || this.equip[s]); const i = order.indexOf(this.slot); this.switchSlot(order[(i + (inp.wheel > 0 ? 1 : order.length - 1)) % order.length]); }
      if (inp.pressed['Space']) this.roll(ix, iy);
      if (inp.pressed['KeyF']) this.kick();
      if (inp.pressed['KeyQ']) this.focus();
      if (inp.pressed['KeyH']) this.quickHeal();
      if (inp.pressed['KeyG']) this.throwItem(mx, my);
      if (inp.pressed['KeyT']) this.cycleThrow();
      if (inp.mouse.down && this.rollT <= 0 && this.useT <= 0) this.attack(inp.mouse.clicked);
      else if (d && d.chainsaw) this.sawIdle(dt);
      if (d && d.chainsaw && inp.mouse.down) this.sawTickUpdate(dt);
    }
    switchSlot(s) {
      if (this.slot === s) return;
      this.slot = s; this.reloadT = 0; this.fireCd = Math.max(this.fireCd, 0.25); this.swingT = 0;
    }
    startReload() {
      const w = this.curWeapon(); if (!w) return; const d = D.items[w.id];
      if (d.type !== 'gun' || this.reloadT > 0 || w.mag >= this.magSize(d)) return;
      if (this.countItem(d.ammo) <= 0) { this.raid.float(this.x, this.y, '没有' + D.items[d.ammo].name, '#ffb0a0'); return; }
      this.reloadDur = d.reload * (1 - this.sk('reload') * 0.08) * (this.perk('p_reload') ? 0.75 : 1);
      this.reloadT = this.reloadDur;
    }
    roll(ix, iy) {
      if (this.rollCd > 0 || this.rollT > 0) return;
      const cost = 22 * (1 - this.sk('agile') * 0.06);
      if (this.stamina < cost) return;
      this.stamina -= cost;
      if (!ix && !iy) { ix = Math.cos(this.aim); iy = Math.sin(this.aim); }
      this.rollDx = ix; this.rollDy = iy; this.rollT = 0.32; this.rollCd = 0.6; this.iframe = 0.22;
      this.useT = 0; this.useItem = null;
    }
    kick() {
      if (this.kickCd > 0 || this.stamina < 12) return;
      this.stamina -= 12; this.kickCd = 1.1 * (this.perk('p_kick') ? 0.5 : 1);
      const kl = this.sk('kick');
      this.swingT = 0.2; this.swingDur = 0.2;
      for (const e of this.raid.enemiesNear(this.x, this.y, 1.6)) {
        const a = U.ang(this.x, this.y, e.x, e.y);
        if (Math.abs(U.angDiff(this.aim, a)) > 0.9) continue;
        if (U.dist(this.x, this.y, e.x, e.y) > 1.1 + e.r) continue;
        const heavy = e.type === 'brute' || (e.type === 'bloater' && !this.perk('p_kick'));
        e.damage(5 + kl * 5, this.x, this.y, heavy ? 0.2 : 1.6 * (1 + kl * 0.3), 'player');
        if (!heavy) e.stunT = Math.max(e.stunT, 0.6);
      }
      this.raid.noise(this.x, this.y, 3 * this.noiseMul());
    }
    focus() {
      const l = this.sk('focus'); if (!l) { this.raid.log('需要在技能树解锁【专注】'); return; }
      if (this.focusCd > 0) return;
      this.focusT = 3 + l; this.focusCd = 30 - l * 4; this.raid.float(this.x, this.y, '专注', '#a0d0ff');
    }
    quickHeal() {
      if (this.useT > 0) return;
      const meds = this.pack.filter(it => D.items[it.id].type === 'med');
      if (!meds.length) { this.raid.log('背包里没有药品'); return; }
      let pick;
      if (this.infect > 40) pick = meds.find(m => D.items[m.id].infect);
      if (!pick && this.bleed && this.hp > this.maxhp * 0.7) pick = meds.find(m => m.id === 'bandage') || meds.find(m => D.items[m.id].stopBleed);
      if (!pick) pick = meds.filter(m => D.items[m.id].heal).sort((a, b) => D.items[a.id].heal - D.items[b.id].heal).find(m => D.items[m.id].heal >= this.maxhp - this.hp) || meds.filter(m => D.items[m.id].heal).sort((a, b) => D.items[b.id].heal - D.items[a.id].heal)[0];
      if (!pick) pick = meds[0];
      this.startUse(pick);
    }
    startUse(it) {
      const d = D.items[it.id];
      if (!d.use) return;
      this.useItem = it.id;
      this.useDur = d.use * (d.type === 'med' ? (1 - this.sk('medic') * 0.1) : 1);
      this.useT = this.useDur;
      this.raid.log('正在使用：' + d.name);
    }
    finishUse() {
      const id = this.useItem; this.useItem = null;
      if (!id || this.takeItem(id, 1) < 1) return;
      const d = D.items[id];
      const mul = d.type === 'med' ? 1 + this.sk('medic') * 0.1 : 1;
      if (d.heal) this.hp = Math.min(this.maxhp, this.hp + d.heal * mul);
      if (d.stopBleed) this.bleed = false;
      if (d.infect) this.infect = Math.max(0, this.infect + d.infect);
      if (d.food) this.hunger = Math.min(100, this.hunger + d.food);
      if (d.stamina) this.stamina = Math.min(this.maxst, this.stamina + d.stamina);
      if (d.staminaBuff) this.painT = d.staminaBuff;
      this.raid.float(this.x, this.y, d.name, '#b8f0a0');
    }
    throwables() { return ['brick', 'firecracker', 'molotov'].filter(id => this.countItem(id) > 0); }
    curThrow() { const t = this.throwables(); if (!t.length) return null; return t[this.throwIdx % t.length]; }
    cycleThrow() { this.throwIdx++; }
    throwItem(mx, my) {
      const id = this.curThrow(); if (!id) { this.raid.log('没有可投掷物'); return; }
      if (this.fireCd > 0) return;
      this.takeItem(id, 1); this.fireCd = 0.6;
      let d = U.dist(this.x, this.y, mx, my); const maxD = 9;
      let tx = mx, ty = my; if (d > maxD) { tx = this.x + (mx - this.x) / d * maxD; ty = this.y + (my - this.y) / d * maxD; d = maxD; }
      this.raid.projectiles.push({ kind: id, x: this.x, y: this.y, sx: this.x, sy: this.y, tx, ty, prog: 0, dur: 0.35 + d * 0.06, arc: true, h: 1 + d * 0.15, col: id === 'brick' ? '#a0482a' : id === 'molotov' ? '#6a8a4a' : '#c0302a', size: 5, owner: 'player' });
    }
    sawIdle(dt) { // 油锯怠速
      const w = this.curWeapon(); if (!w || !w.fuel) return;
      this.sawNoise -= dt; if (this.sawNoise <= 0) { this.raid.noise(this.x, this.y, 9 * this.noiseMul()); this.sawNoise = 0.8; }
    }
    sawTickUpdate(dt) {
      const w = this.curWeapon(); const d = D.items[w.id];
      if (!w.fuel || w.fuel <= 0) {
        // 自动加油
        if (this.countItem('fuel') > 0 && this.useT <= 0) { this.takeItem('fuel', 1); w.fuel = Math.min(100, (w.fuel || 0) + 30); this.raid.float(this.x, this.y, '加油', '#f3d08a'); }
        return;
      }
      w.fuel -= dt * 2.2 * (1 - this.sk('saw') * 0.2);
      this.sawNoise -= dt; if (this.sawNoise <= 0) { this.raid.noise(this.x, this.y, d.noise * this.noiseMul()); this.sawNoise = 0.3; }
      this.sawTick -= dt;
      if (this.sawTick > 0) return;
      this.sawTick = 0.1;
      if (this.stamina < 1) return;
      this.stamina -= d.stamina;
      const dmg = d.dmg * (1 + this.sk('saw') * 0.1) * this.meleeMul();
      for (const e of this.raid.enemiesNear(this.x, this.y, d.range + 0.8)) {
        const a = U.ang(this.x, this.y, e.x, e.y);
        if (Math.abs(U.angDiff(this.aim, a)) > d.arc / 2 + 0.2) continue;
        if (U.dist(this.x, this.y, e.x, e.y) > d.range + e.r) continue;
        e.damage(dmg, this.x, this.y, d.knock, 'player', 'melee');
        if (Math.random() < .5) this.raid.blood(e.x, e.y, 3);
      }
      G.R.cam.shake = Math.max(G.R.cam.shake, 2);
    }
    meleeMul() {
      let m = 1 + this.sk('power') * 0.1;
      if (this.perk('p_butcher')) m *= 1.2;
      if (this.perk('p_adren') && this.hp < this.maxhp * 0.3) m *= 1.15;
      return m;
    }
    attack(clicked) {
      const w = this.curWeapon(); if (!w) return;
      const d = D.items[w.id];
      if (d.chainsaw) return; // 由 sawTickUpdate 处理
      if (this.fireCd > 0) return;
      if (d.type === 'gun') {
        if (!d.auto && !clicked) return;
        if (this.reloadT > 0) return;
        if (w.mag <= 0) { this.startReload(); if (clicked) this.raid.float(this.x, this.y, '咔哒', '#ccc'); this.fireCd = 0.25; return; }
        w.mag--; this.fireCd = 60 / d.rpm;
        const sp = this.currentSpread();
        const n = d.pellets || 1;
        let dmg = d.dmg * (this.perk('p_head') ? 1.15 : 1);
        if (this.perk('p_adren') && this.hp < this.maxhp * 0.3) dmg *= 1.15;
        const ox = this.x + Math.cos(this.aim) * 0.5, oy = this.y - 0.1 + Math.sin(this.aim) * 0.5;
        for (let i = 0; i < n; i++) {
          const a = this.aim + gauss() * sp;
          this.raid.hitscan(ox, oy, a, d.range, dmg, { owner: 'player', pierce: d.pierce || 1, falloff: d.range * 0.6, weapon: w.id });
        }
        const rec = d.recoil * (1 - this.sk('recoil') * 0.1) * (this.focusT > 0 ? 0.3 : 1);
        this.bloom = Math.min(0.35, this.bloom + rec);
        this.raid.noise(this.x, this.y, d.noise * this.noiseMul() * (d.noise > 8 ? 1 : 1), 'gun');
        this.raid.muzzle(ox, oy, this.aim, d.noise > 8);
        G.R.cam.shake = Math.max(G.R.cam.shake, d.pellets ? 6 : d.noise > 8 ? 3 : 1);
        if (w.mag <= 0 && this.countItem(d.ammo) > 0) this.startReload();
      } else {
        // 近战
        if (this.stamina < d.stamina * 0.5) { if (clicked) this.raid.float(this.x, this.y, '没力气了', '#ffb0a0'); return; }
        this.stamina -= d.stamina;
        this.fireCd = d.speed; this.swingT = Math.min(0.25, d.speed * 0.6); this.swingDur = this.swingT;
        const targets = this.raid.enemiesNear(this.x, this.y, d.range + 1)
          .filter(e => U.dist(this.x, this.y, e.x, e.y) <= d.range + e.r && Math.abs(U.angDiff(this.aim, U.ang(this.x, this.y, e.x, e.y))) <= d.arc / 2 + 0.15)
          .sort((a, b) => U.d2(this.x, this.y, a.x, a.y) - U.d2(this.x, this.y, b.x, b.y));
        const max = d.cleave || 1;
        const dmg = d.dmg * this.meleeMul();
        for (let i = 0; i < Math.min(max, targets.length); i++) {
          const e = targets[i];
          e.damage(dmg * (i ? 0.6 : 1), this.x, this.y, d.knock, 'player', 'melee');
          if (d.bleed && Math.random() < d.bleed) e.bleedT = 4;
        }
        this.raid.noise(this.x, this.y, d.noise * this.noiseMul());
        if (targets.length) G.R.cam.shake = Math.max(G.R.cam.shake, 2);
      }
    }
    hurt(dmg, src, silent, opts = {}) {
      if (this.iframe > 0 && !silent) return 0;
      let real = dmg;
      if (!silent) {
        let arm = this.armorValue();
        if (opts.bullet) { const b = this.equip.body; arm = (b && b.dur > 0 && D.items[b.id].bulletproof) ? 0.55 : arm * 0.3; }
        real = dmg * (1 - arm);
        for (const s of ['helmet', 'body']) { const a = this.equip[s]; if (a && a.dur > 0) a.dur = Math.max(0, a.dur - dmg * 0.35); }
        this.hitT = 0.25; G.R.cam.shake = Math.max(G.R.cam.shake, 5);
        if (opts.infect) this.infect = Math.min(100, this.infect + opts.infect * (1 - this.sk('immune') * 0.08) * (this.perk('p_resist') ? 0.65 : 1) * (1 - arm));
        if (opts.bleedChance && Math.random() < opts.bleedChance * (1 - arm * 1.4) && !this.perk('p_clot')) { if (!this.bleed) this.raid.log('你在流血！按 H 包扎'); this.bleed = true; }
        this.raid.blood(this.x, this.y, 4);
        this.useT = 0; this.useItem = null;
      }
      this.hp -= real;
      if (this.hp <= 0 && !this.raid.deathCause) this.raid.deathCause = src ? ('被' + src + '杀死') : (this.bleed ? '失血过多' : '饿死');
      return real;
    }
  }
  E.Player = Player;

  // ======================= 敌人 =======================
  const DEBRIS = [{ name: '红砖', col: '#a0482a', dmg: 16 }, { name: '井盖', col: '#4a4a48', dmg: 26 }, { name: '共享单车', col: '#e8c020', dmg: 24 }, { name: '灭火器', col: '#c0302a', dmg: 20 }, { name: '电动车电瓶', col: '#2a2a2a', dmg: 22 }, { name: '空调外机', col: '#e0ded4', dmg: 28 }, { name: '路边石墩', col: '#9a968c', dmg: 28 }];
  const CLOTH = ['#4a5a7a', '#8a3a2a', '#e0d8c8', '#3a6a4a', '#d8a020', '#5a4a6a', '#2a2a2a', '#c86a3a', '#7a8a9a'];
  let eid = 1;
  class Enemy {
    constructor(raid, type, x, y) {
      const d = D.enemies[type];
      this.raid = raid; this.kind = type === 'bandit' ? 'bandit' : 'zombie'; this.type = type; this.def = d;
      this.id = eid++;
      this.x = x; this.y = y; this.r = d.r;
      const hpMul = 1 + (raid.dangerAt(x, y) - 1) * 0.06;
      this.maxhp = this.hp = d.hp * hpMul * U.rand(0.9, 1.1);
      this.spd = d.spd * U.rand(0.88, 1.12);
      this.state = 'idle'; this.target = null; this.gx = x; this.gy = y; this.lastX = x; this.lastY = y;
      this.face = Math.random() * 6.28; this.walkT = Math.random() * 10; this.seed = (Math.random() * 1e9) | 0;
      this.tilt = Math.random() * 6.28; this.cloth = U.pick(CLOTH); this.col = d.color;
      this.attackCd = 0; this.attackT = 0; this.windT = 0; this.stunT = 0; this.hitT = 0; this.kvx = 0; this.kvy = 0;
      this.thinkT = Math.random() * 0.3; this.idleT = U.rand(1, 4); this.bleedT = 0; this.burnT = 0;
      this.lashCd = U.rand(1, 3); this.lashT = 0; this.lashPhase = 0; this.chargeCd = U.rand(2, 4); this.chargeT = 0; this.hold = null; this.holdT = 0; this.throwCd = 2;
      this.hidden = type === 'crawler'; this.dead = false; this.moving = false;
      if (type === 'bandit') {
        this.weapon = { id: U.pick(['pistol92', 'pistol92', 'revolver', 'shotgun97', 'huntshot', 'smg05']), n: 1 };
        const wd = D.items[this.weapon.id]; this.weapon.mag = wd.mag; this.fireCd = 0; this.reloadT = 0; this.aim = 0; this.strafe = Math.random() < .5 ? 1 : -1; this.strafeT = 2;
      }
    }
    damage(dmg, fx, fy, knock, src, how) {
      if (this.dead) return;
      this.hp -= dmg; this.hitT = 0.12;
      if (this.hidden) this.hidden = false;
      const a = Math.atan2(this.y - fy, this.x - fx);
      const km = this.type === 'brute' ? 0.15 : this.type === 'bloater' ? 0.4 : 1;
      this.kvx += Math.cos(a) * knock * 6 * km; this.kvy += Math.sin(a) * knock * 6 * km;
      this.raid.blood(this.x, this.y, how === 'melee' ? 4 : 2, this.type === 'bloater' ? 'rgba(140,150,60,0.55)' : null);
      if (src === 'player') { this.alert(this.raid.player); }
      if (this.hp <= 0) this.die(src);
    }
    alert(t) { if (!t) return; this.state = 'chase'; this.target = t; this.lastX = t.x; this.lastY = t.y; this.hidden = false; }
    die(src) { this.dead = true; this.raid.onEnemyDeath(this, src); }
    update(dt) {
      const raid = this.raid;
      for (const k of ['attackCd', 'hitT', 'stunT', 'lashCd', 'chargeCd', 'throwCd']) if (this[k] > 0) this[k] = Math.max(0, this[k] - dt);
      if (this.bleedT > 0) { this.bleedT -= dt; this.hp -= dt * 6; if (Math.random() < dt * 3) raid.blood(this.x, this.y, 1); if (this.hp <= 0) return this.die('player'); }
      if (this.burnT > 0) { this.burnT -= dt; this.hp -= dt * 14; if (Math.random() < dt * 10) raid.particle(this.x, this.y, 'rgba(240,140,40,0.9)', 12); if (this.hp <= 0) return this.die('player'); }
      // 击退
      if (Math.abs(this.kvx) + Math.abs(this.kvy) > 0.05) {
        this.hitWall = false;
        G.M.moveCircle(this, this.kvx * dt, this.kvy * dt);
        const f = Math.pow(0.004, dt); this.kvx *= f; this.kvy *= f;
      }
      if (this.stunT > 0) { this.moving = false; return; }
      if (this.kind === 'bandit') return this.updateBandit(dt);
      this.think(dt);
      this.special(dt);
      if (this.windT > 0 || this.holdT > 0) { this.moving = false; return; }
      if (this.chargeT > 0) return;
      this.move(dt);
      this.tryAttack(dt);
    }
    think(dt) {
      this.thinkT -= dt;
      if (this.thinkT > 0) return;
      this.thinkT = 0.25 + Math.random() * 0.15;
      const raid = this.raid;
      const sight = raid.sightRange * (this.type === 'runner' ? 1.1 : 1);
      // 选择目标：玩家/掠夺者/幸存者
      let best = null, bd = 1e9;
      for (const t of raid.targets) {
        if (t.dead || t.hp <= 0) continue;
        const d = U.dist(this.x, this.y, t.x, t.y);
        const s = t.kind === 'player' ? sight : sight * 0.7;
        if (d < 1.4 || (d < s && G.M.los(this.x, this.y - 0.3, t.x, t.y - 0.3))) { if (d < bd) { bd = d; best = t; } }
      }
      if (best) { this.state = 'chase'; this.target = best; this.lastX = best.x; this.lastY = best.y; this.hidden = this.type === 'crawler' && bd > 4; return; }
      if (this.state === 'chase') {
        if (U.dist(this.x, this.y, this.lastX, this.lastY) < 1) { this.state = 'investigate'; this.gx = this.lastX; this.gy = this.lastY; this.idleT = 2; }
      }
    }
    move(dt) {
      const raid = this.raid;
      let tx = null, ty = null, sp = this.spd;
      if (this.state === 'chase' && this.target) {
        const t = this.target;
        const seen = U.dist(this.x, this.y, t.x, t.y) < 14 && G.M.los(this.x, this.y, t.x, t.y);
        if (seen) { this.lastX = t.x; this.lastY = t.y; tx = t.x; ty = t.y; }
        else if (t.kind === 'player') { const f = G.M.flowDir(this.x, this.y); if (f) { tx = this.x + f[0]; ty = this.y + f[1]; } else { tx = this.lastX; ty = this.lastY; } }
        else { tx = this.lastX; ty = this.lastY; }
        if (this.type === 'thrower' && seen) { // 保持距离
          const d = U.dist(this.x, this.y, t.x, t.y);
          if (d < 5) { tx = this.x - (t.x - this.x); ty = this.y - (t.y - this.y); } else if (d < 9 && this.hold) { tx = null; }
        }
      } else if (this.state === 'investigate') {
        tx = this.gx; ty = this.gy; sp *= 0.8;
        if (U.dist(this.x, this.y, this.gx, this.gy) < 0.8) { this.idleT -= dt; tx = null; if (this.idleT <= 0) { this.state = 'idle'; this.idleT = U.rand(2, 5); } }
      } else {
        this.idleT -= dt;
        if (this.idleT <= 0) {
          const p = G.M.randomWalkableNear(this.x, this.y, 2, 7, 6);
          if (p) { this.gx = p[0]; this.gy = p[1]; this.state = 'wander'; }
          this.idleT = U.rand(3, 8);
        }
        if (this.state === 'wander') { tx = this.gx; ty = this.gy; sp *= this.type === 'runner' ? 0.25 : 0.4; if (U.dist(this.x, this.y, tx, ty) < 0.6) this.state = 'idle'; }
      }
      if (this.type === 'runner' && this.state !== 'chase') sp = Math.min(sp, 1.1);
      this.moving = tx !== null;
      if (tx === null) return;
      let dx = tx - this.x, dy = ty - this.y; const l = Math.hypot(dx, dy);
      if (l < 0.05) return;
      dx /= l; dy /= l;
      // 分离
      let sx = 0, sy = 0;
      for (const o of raid.enemiesNear(this.x, this.y, 1)) {
        if (o === this) continue;
        const ddx = this.x - o.x, ddy = this.y - o.y, dd = Math.hypot(ddx, ddy), min = this.r + o.r;
        if (dd < min && dd > 0.001) { sx += ddx / dd * (min - dd); sy += ddy / dd * (min - dd); }
      }
      this.face = Math.atan2(dy, dx);
      this.walkT += dt * sp / 1.5;
      this.hitWall = false;
      const oldx = this.x, oldy = this.y;
      G.M.moveCircle(this, dx * sp * dt + sx * 0.5, dy * sp * dt + sy * 0.5);
      // 卡墙时尝试流场
      if (this.hitWall && U.dist(oldx, oldy, this.x, this.y) < sp * dt * 0.3 && this.target && this.target.kind === 'player') {
        const f = G.M.flowDir(this.x, this.y); if (f) G.M.moveCircle(this, f[0] * sp * dt, f[1] * sp * dt);
      }
    }
    tryAttack(dt) {
      const t = this.target;
      if (this.attackT > 0) {
        this.attackT -= dt;
        if (this.attackT <= 0 && t && !t.dead) {
          if (U.dist(this.x, this.y, t.x, t.y) <= this.def.reach + t.r + this.r + 0.15) {
            this.raid.hitTarget(t, this.def.dmg * U.rand(0.85, 1.15), this, { infect: this.def.infect, bleedChance: 0.22 });
            if (this.type === 'brute') { const a = U.ang(this.x, this.y, t.x, t.y); if (t.kind === 'player') { t.pullVX = Math.cos(a) * 9; t.pullVY = Math.sin(a) * 9; } }
          }
        }
        return;
      }
      if (this.state !== 'chase' || !t || t.dead || this.attackCd > 0) return;
      if (U.dist(this.x, this.y, t.x, t.y) <= this.def.reach + t.r + this.r) {
        this.attackT = this.type === 'brute' ? 0.55 : 0.35; this.attackCd = this.type === 'runner' ? 0.8 : 1.2;
      }
    }
    special(dt) {
      const raid = this.raid, t = this.target;
      const chasing = this.state === 'chase' && t && !t.dead;
      if (this.type === 'tentacle') {
        if (this.windT > 0) {
          this.windT -= dt; if (this.windT <= 0) { this.lashT = 0.35; this.lashPhase = 0; }
        } else if (this.lashT > 0) {
          this.lashT -= dt; this.lashPhase = Math.min(1, this.lashPhase + dt / 0.18);
          if (this.lashPhase >= 1 && !this.lashHit) {
            this.lashHit = true;
            for (const tg of raid.targets) {
              if (tg.dead) continue;
              const d = distToSeg(tg.x, tg.y, this.x, this.y, this.lashX, this.lashY);
              if (d < 0.55 + tg.r) {
                raid.hitTarget(tg, 14, this, { infect: 6, bleedChance: 0.3 });
                const a = U.ang(tg.x, tg.y, this.x, this.y);
                if (tg.kind === 'player') { tg.pullVX = Math.cos(a) * 6; tg.pullVY = Math.sin(a) * 6; raid.float(tg.x, tg.y, '被触手卷住！', '#ffb0a0'); }
              }
            }
          }
        } else if (chasing && this.lashCd <= 0) {
          const d = U.dist(this.x, this.y, t.x, t.y);
          if (d > 1.3 && d < this.def.lash && G.M.los(this.x, this.y, t.x, t.y)) {
            this.windT = 0.6; this.lashCd = 3.2; this.lashHit = false;
            const a = U.ang(this.x, this.y, t.x, t.y);
            this.lashX = this.x + Math.cos(a) * this.def.lash; this.lashY = this.y + Math.sin(a) * this.def.lash;
            const L = G.M.ray(this.x, this.y, a, this.def.lash, G.M.isBlockBullet);
            this.lashX = this.x + Math.cos(a) * L; this.lashY = this.y + Math.sin(a) * L;
          }
        }
      } else if (this.type === 'thrower') {
        if (this.holdT > 0) { this.holdT -= dt; return; }
        if (!this.hold && chasing && this.throwCd <= 0) {
          this.hold = U.pick(DEBRIS); this.holdT = 1.1;
          if (U.dist(this.x, this.y, raid.player.x, raid.player.y) < 16) raid.float(this.x, this.y, '抓起了' + this.hold.name, '#ffd0a0');
        } else if (this.hold && chasing) {
          const d = U.dist(this.x, this.y, t.x, t.y);
          if (d < 12 && G.M.los(this.x, this.y, t.x, t.y)) {
            const lead = 0.55;
            let tx = t.x + (t.vx || 0) * lead + U.rand(-0.8, 0.8), ty = t.y + (t.vy || 0) * lead + U.rand(-0.8, 0.8);
            raid.projectiles.push({ kind: 'debris', x: this.x, y: this.y, sx: this.x, sy: this.y, tx, ty, prog: 0, dur: 0.55 + d * 0.035, arc: true, h: 1.5 + d * 0.1, col: this.hold.col, size: this.hold.dmg > 22 ? 9 : 6, dmg: this.hold.dmg, owner: 'enemy', name: this.hold.name });
            this.hold = null; this.throwCd = 2.4; this.attackT = 0.3;
          }
        }
      } else if (this.type === 'brute') {
        if (this.windT > 0) { this.windT -= dt; if (this.windT <= 0) { this.chargeT = 1.3; } return; }
        if (this.chargeT > 0) {
          this.chargeT -= dt; this.hitWall = false;
          G.M.moveCircle(this, Math.cos(this.chargeA) * 8.5 * dt, Math.sin(this.chargeA) * 8.5 * dt);
          this.walkT += dt * 4;
          if (Math.random() < dt * 20) raid.particle(this.x, this.y + 0.2, 'rgba(120,100,80,0.6)', 3);
          for (const tg of raid.targets) {
            if (!tg.dead && U.dist(this.x, this.y, tg.x, tg.y) < this.r + tg.r + 0.2 && !this.chargeHit) {
              this.chargeHit = true;
              raid.hitTarget(tg, 34, this, { infect: 5, bleedChance: 0.2 });
              if (tg.kind === 'player') { tg.pullVX = Math.cos(this.chargeA) * 12; tg.pullVY = Math.sin(this.chargeA) * 12; }
            }
          }
          for (const o of raid.enemiesNear(this.x, this.y, 1.2)) if (o !== this && o.kind === 'zombie') { o.kvx += Math.cos(this.chargeA) * 6; o.kvy += Math.sin(this.chargeA) * 6; o.damage(15, this.x, this.y, 0, 'brute'); }
          if (this.hitWall) { this.chargeT = 0; this.stunT = 1.8; G.R.cam.shake = 10; raid.float(this.x, this.y, '撞墙了！', '#f3d08a'); raid.noise(this.x, this.y, 10); }
          return;
        }
        if (chasing && this.chargeCd <= 0) {
          const d = U.dist(this.x, this.y, t.x, t.y);
          if (d > 3 && d < 11 && G.M.los(this.x, this.y, t.x, t.y)) {
            this.windT = 0.8; this.chargeCd = 6.5; this.chargeHit = false; this.chargeA = U.ang(this.x, this.y, t.x, t.y); this.face = this.chargeA;
            raid.float(this.x, this.y, '吼——', '#ff9a80');
          }
        }
      } else if (this.type === 'crawler') {
        if (this.state !== 'chase') this.hidden = true;
      }
    }
    updateBandit(dt) {
      const raid = this.raid, wd = D.items[this.weapon.id];
      if (this.fireCd > 0) this.fireCd -= dt;
      if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.weapon.mag = wd.mag; }
      this.thinkT -= dt;
      if (this.thinkT <= 0) {
        this.thinkT = 0.3;
        let best = null, bd = 1e9;
        const P = raid.player;
        const dp = U.dist(this.x, this.y, P.x, P.y);
        if (dp < 15 && G.M.los(this.x, this.y, P.x, P.y)) { best = P; bd = dp * 0.7; }
        for (const z of raid.enemiesNear(this.x, this.y, 9)) {
          if (z.kind !== 'zombie') continue;
          const d = U.dist(this.x, this.y, z.x, z.y);
          if (d < bd && G.M.los(this.x, this.y, z.x, z.y)) { bd = d; best = z; }
        }
        if (best) { this.target = best; this.state = 'chase'; this.lastX = best.x; this.lastY = best.y; }
        else if (this.state === 'chase' && this.target && this.target.dead) { this.state = 'idle'; this.target = null; }
      }
      let mx = 0, my = 0;
      const t = this.target;
      if (this.state === 'chase' && t && !t.dead) {
        const d = U.dist(this.x, this.y, t.x, t.y);
        const seen = G.M.los(this.x, this.y, t.x, t.y);
        this.aim = U.ang(this.x, this.y, t.x, t.y); this.face = this.aim;
        if (!seen || d > wd.range * 0.8) { const a = U.ang(this.x, this.y, this.lastX, this.lastY); mx = Math.cos(a); my = Math.sin(a); }
        else if (d < 4) { mx = -Math.cos(this.aim); my = -Math.sin(this.aim); }
        else { this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe *= -1; this.strafeT = U.rand(1, 2.5); } mx = Math.cos(this.aim + Math.PI / 2) * this.strafe * 0.6; my = Math.sin(this.aim + Math.PI / 2) * this.strafe * 0.6; }
        if (seen) { this.lastX = t.x; this.lastY = t.y; }
        if (seen && d < wd.range && this.fireCd <= 0 && this.reloadT <= 0) {
          if (this.weapon.mag <= 0) { this.reloadT = wd.reload * 1.3; }
          else {
            this.weapon.mag--; this.fireCd = 60 / wd.rpm * (wd.auto ? 1.6 : 2.2);
            const n = wd.pellets || 1;
            const ox = this.x + Math.cos(this.aim) * 0.5, oy = this.y - 0.1 + Math.sin(this.aim) * 0.5;
            for (let i = 0; i < n; i++) raid.hitscan(ox, oy, this.aim + gauss() * (wd.spread + 0.07), wd.range, wd.dmg * 0.7, { owner: 'bandit', src: this, pierce: 1, falloff: wd.range * 0.6 });
            raid.noise(this.x, this.y, wd.noise, 'gun');
            raid.muzzle(ox, oy, this.aim, true);
          }
        }
      } else {
        // 巡逻
        this.idleT -= dt;
        if (this.idleT <= 0) { const p = G.M.randomWalkableNear(this.x, this.y, 3, 8, 6); if (p) { this.gx = p[0]; this.gy = p[1]; } this.idleT = U.rand(3, 7); }
        const d = U.dist(this.x, this.y, this.gx, this.gy);
        if (d > 0.5) { mx = (this.gx - this.x) / d * 0.5; my = (this.gy - this.y) / d * 0.5; this.aim = Math.atan2(my, mx); }
      }
      this.moving = Math.abs(mx) + Math.abs(my) > 0.01;
      if (this.moving) { this.walkT += dt; G.M.moveCircle(this, mx * this.spd * dt, my * this.spd * dt); }
    }
  }
  function distToSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy || 1;
    const t = U.clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  E.distToSeg = distToSeg;
  E.Enemy = Enemy;

  // 幸存者 NPC
  class NPC {
    constructor(raid, x, y) { this.raid = raid; this.kind = 'npc'; this.x = x; this.y = y; this.r = 0.28; this.hp = 60; this.maxhp = 60; this.aim = 1.5; this.seed = 777; this.walkT = 0; this.moving = false; this.rescued = false; this.dead = false; }
    update(dt) {
      if (this.rescued) { // 撤走
        const a = this.fleeA; this.moving = true; this.walkT += dt; G.M.moveCircle(this, Math.cos(a) * 3 * dt, Math.sin(a) * 3 * dt);
        this.fleeT -= dt; if (this.fleeT <= 0) this.gone = true;
      }
    }
  }
  E.NPC = NPC;
  G.E = E;
})();
