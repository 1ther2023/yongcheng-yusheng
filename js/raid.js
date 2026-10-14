// ===== 一局（搜打撤）逻辑 =====
(function () {
  const U = G.U, D = G.D, M = () => G.M;
  const RAID_TIME = 900; // 15 分钟

  class Raid {
    constructor(st, opt) {
      this.st = st; this.opt = opt;
      this.mods = {}; for (const m of opt.mods) this.mods[m] = true;
      this.time = 0; this.timeLimit = RAID_TIME;
      this.hordeAt = this.timeLimit - (this.mods.horde ? 360 : 180); this.hordeOn = false;
      this.night = !!this.mods.night;
      this.dark = this.mods.night ? 0.86 : this.mods.dusk ? 0.5 : 0;
      if (this.mods.rain) this.dark = Math.max(this.dark, 0.25) + (this.mods.night ? 0.04 : 0.1);
      this.enemies = []; this.decals = []; this.fires = []; this.projectiles = []; this.tracers = []; this.particles = []; this.floats = []; this.lights = []; this.noisePings = [];
      this.specialContainers = []; this.perks = new Set(); this.xp = 0; this.level = 1; this.kills = 0; this.pendingPerks = 0;
      this.deathCause = null; this.ended = false; this.logs = [];
      // 重置容器
      G.M.resetContainers();
      for (const c of G.M.containers) { c.searched = false; c.items = null; }
      const dp = opt.deploy;
      this.player = new G.E.Player(this, st, dp.x, dp.y);
      this.targets = [this.player];
      this.deployDanger = this.dangerAt(dp.x, dp.y);
      this.sightRange = (this.mods.night ? 6 : this.mods.dusk ? 8 : 11) * (this.mods.rain ? 0.75 : 1);
      this.flashRange = 10;
      // 撤离点：3个开放，保证至少1个在 200 格内
      const defs = G.M.extractsDef.map(e => Object.assign({}, e, { open: false, prog: 0 }));
      defs.sort((a, b) => U.d2(dp.x, dp.y, a.x, a.y) - U.d2(dp.x, dp.y, b.x, b.y));
      const near = defs.filter(e => U.dist(dp.x, dp.y, e.x, e.y) > 60 && U.dist(dp.x, dp.y, e.x, e.y) < 230);
      const chosen = new Set();
      if (near.length) chosen.add(U.pick(near));
      const rest = U.shuffle(defs.filter(e => !chosen.has(e) && U.dist(dp.x, dp.y, e.x, e.y) > 40));
      while (chosen.size < 3 && rest.length) chosen.add(rest.pop());
      for (const e of defs) { e.open = chosen.has(e); if (e.kind === 'checkpoint' && e.open) { e.opensAt = 480; e.open = false; e.pending = true; } }
      this.extracts = defs;
      this.extractHold = 0;
      // 空间哈希
      this.hash = new Map();
      this.spawnT = 0; this.flowT = 0;
      this.populate();
      if (this.mods.airdrop) this.airdropAt = 240;
      if (this.mods.bandits) this.banditAt = 50;
      else if (Math.random() < 0.35) this.banditAt = U.rand(200, 500);
      if (this.mods.survivor) this.spawnSurvivor();
      this.zone = G.M.zoneAt(dp.x, dp.y);
      this.log('你从【' + dp.name + '】潜入。找到物资，在尸潮前撤离。');
      const open = this.extracts.filter(e => e.open || e.pending).map(e => e.name + (e.pending ? '(8分钟后开放)' : '')).join('、');
      this.log('今日开放撤离点：' + open);
      this.visibleEntities = [];
    }

    dangerAt(x, y) { return G.M.zoneAt(x, y).danger; }
    log(t) { this.logs.push(t); if (G.UI) G.UI.log(t); }
    float(x, y, text, col, big) { this.floats.push({ x, y, text, col, big, life: 1.5 }); }
    particle(x, y, col, z = 8) { this.particles.push({ x, y, vx: U.rand(-1, 1), vy: U.rand(-1, 1), z, vz: U.rand(10, 40), col, s: U.rand(2, 4), life: 0.6, max: 0.6 }); }
    blood(x, y, n, col) {
      for (let i = 0; i < n; i++) this.particles.push({ x, y, vx: U.rand(-2, 2), vy: U.rand(-2, 2), z: 12, vz: U.rand(20, 60), col: col || 'rgba(140,20,15,0.9)', s: U.rand(2, 4), life: 0.5, max: 0.5 });
      if (this.decals.length > 500) this.decals.splice(0, 50);
      if (Math.random() < 0.5) this.decals.push({ type: 'blood', x: x + U.rand(-.4, .4), y: y + U.rand(-.3, .3), r: U.rand(3, 8), seed: (Math.random() * 1e9) | 0, col });
    }
    muzzle(x, y, a, loud) {
      this.lights.push({ x, y, r: loud ? 5 : 2.5, life: 0.06, a: 0.95, warm: true });
      for (let i = 0; i < 3; i++) this.particles.push({ x: x + Math.cos(a) * .3, y: y + Math.sin(a) * .3, vx: Math.cos(a + U.rand(-.4, .4)) * 4, vy: Math.sin(a + U.rand(-.4, .4)) * 4, z: 12, vz: 0, col: 'rgba(255,220,120,0.95)', s: 3, life: 0.08, max: 0.08 });
    }

    // ---------- 噪音系统：枪声会把整条街的丧尸引过来 ----------
    noise(x, y, radius, kind) {
      if (radius <= 0.5) return;
      if (radius > 8) this.noisePings.push({ x, y, life: 1 });
      for (const e of this.enemiesNear(x, y, radius)) {
        if (e.state === 'chase' && e.target) continue;
        const d = U.dist(x, y, e.x, e.y);
        if (d > radius) continue;
        e.state = 'investigate'; e.gx = x + U.rand(-1.5, 1.5); e.gy = y + U.rand(-1.5, 1.5); e.idleT = U.rand(2, 4);
        if (d < radius * 0.35 && kind === 'gun') e.alert(this.player);
      }
    }

    rebuildHash() {
      this.hash.clear();
      for (const e of this.enemies) {
        const k = ((e.y / 4) | 0) * 4096 + ((e.x / 4) | 0);
        let b = this.hash.get(k); if (!b) { b = []; this.hash.set(k, b); } b.push(e);
      }
    }
    enemiesNear(x, y, r) {
      const out = [];
      const x0 = ((x - r) / 4) | 0, x1 = ((x + r) / 4) | 0, y0 = ((y - r) / 4) | 0, y1 = ((y + r) / 4) | 0;
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const b = this.hash.get(cy * 4096 + cx); if (!b) continue;
        for (const e of b) if (!e.dead && U.d2(x, y, e.x, e.y) <= (r + e.r) * (r + e.r)) out.push(e);
      }
      return out;
    }

    // ---------- 刷怪 ----------
    pickType(danger) {
      const ms = this.mods.mutants ? 2.5 : 1;
      const late = this.time / this.timeLimit;
      return U.weighted([
        ['walker', 60], ['runner', 10 + danger * 3 + late * 10], ['crawler', 5 + danger],
        ['bloater', (2 + danger) * ms], ['tentacle', (0.5 + danger * 1.1) * ms], ['thrower', (0.5 + danger) * ms],
        ['brute', (danger >= 2.5 || late > 0.5 ? 0.2 + danger * 0.35 : 0) * ms],
      ]);
    }
    spawnEnemy(type, x, y) {
      const e = new G.E.Enemy(this, type, x, y);
      this.enemies.push(e);
      if (e.kind === 'bandit') this.targets.push(e);
      return e;
    }
    populate() {
      const P = this.player;
      const n = Math.round((35 + this.deployDanger * 8) * (this.mods.quiet ? 0.55 : 1));
      for (let i = 0; i < n; i++) {
        const p = G.M.randomWalkableNear(P.x, P.y, 13, 70); if (!p) continue;
        this.spawnEnemy(this.pickType(this.dangerAt(p[0], p[1])), p[0], p[1]);
      }
      // 地标守卫：高危地标附近放置变异体
      for (const l of G.M.landmarks) {
        if (l.danger < 3 || U.dist(P.x, P.y, l.x, l.y) < 30 || U.dist(P.x, P.y, l.x, l.y) > 260) continue;
        for (let i = 0; i < l.danger + 2; i++) {
          const p = G.M.randomWalkableNear(l.x, l.y, 2, 18); if (!p) continue;
          this.spawnEnemy(i === 0 && l.danger >= 4 ? 'brute' : this.pickType(l.danger + 1), p[0], p[1]);
        }
      }
    }
    dynamicSpawn() {
      const P = this.player;
      const danger = this.dangerAt(P.x, P.y);
      let near = 0; for (const e of this.enemies) if (U.d2(P.x, P.y, e.x, e.y) < 70 * 70) near++;
      let target = (26 + danger * 9) * (1 + this.time / this.timeLimit * 0.6) * (this.mods.quiet ? 0.6 : 1) * (this.mods.night ? 1.2 : 1);
      if (this.hordeOn) target *= 2.4;
      const toSpawn = Math.min(6, Math.round(target - near));
      const halfW = G.R.W / 2 / G.U.TS + 3, halfH = G.R.H / 2 / G.U.TS + 4;
      for (let i = 0; i < toSpawn; i++) {
        if (this.enemies.length > 170) break;
        const p = G.M.randomWalkableNear(P.x, P.y, this.hordeOn ? 24 : 30, 58, 10); if (!p) continue;
        if (Math.abs(p[0] - P.x) < halfW && Math.abs(p[1] - P.y) < halfH) continue;
        const e = this.spawnEnemy(this.hordeOn && Math.random() < .6 ? U.pick(['runner', 'walker', 'walker']) : this.pickType(this.dangerAt(p[0], p[1])), p[0], p[1]);
        if (this.hordeOn) e.alert(P);
      }
      // 清理远处
      for (const e of this.enemies) if (!e.dead && U.d2(P.x, P.y, e.x, e.y) > 95 * 95 && e.state !== 'chase') { e.dead = true; e.despawn = true; }
    }
    spawnBandits(n) {
      const P = this.player;
      const p = G.M.randomWalkableNear(P.x, P.y, 35, 55, 30); if (!p) return;
      for (let i = 0; i < n; i++) { const q = G.M.randomWalkableNear(p[0], p[1], 0, 3) || p; this.spawnEnemy('bandit', q[0], q[1]); }
      this.log('远处传来几声枪响……有掠夺者在附近活动。');
      this.noisePings.push({ x: p[0], y: p[1], life: 1 });
    }
    spawnSurvivor() {
      const P = this.player;
      const p = G.M.randomWalkableNear(P.x, P.y, 50, 110, 60); if (!p) return;
      this.npc = new G.E.NPC(this, p[0], p[1]);
      this.targets.push(this.npc);
      for (let i = 0; i < 5; i++) { const q = G.M.randomWalkableNear(p[0], p[1], 4, 10); if (q) this.spawnEnemy(this.pickType(2), q[0], q[1]); }
      this.log('对讲机：“有人吗？我被困在这里了……”（地图上标记了位置）');
    }
    spawnAirdrop() {
      const P = this.player;
      const p = G.M.randomWalkableNear(P.x, P.y, 40, 90, 60); if (!p) return;
      const box = { type: 'airdrop', kind: 'airdrop', x: p[0], y: p[1], marked: true };
      this.specialContainers.push(box); G.M.addBucket(box); G.M.containers.push(box);
      this.log('嗡——政府无人机在附近投下了一箱救灾物资！');
      this.noise(p[0], p[1], 30);
      for (let i = 0; i < 6; i++) { const q = G.M.randomWalkableNear(p[0], p[1], 3, 12); if (q) this.spawnEnemy(this.pickType(3), q[0], q[1]).alert(P); }
      this.lights.push({ x: p[0], y: p[1], r: 4, life: 9999, a: 0.8, warm: true, flicker: true });
    }

    // ---------- 战斗 ----------
    hitscan(x, y, a, range, dmg, opt) {
      const wallD = G.M.ray(x, y, a, range, G.M.isBlockBullet);
      const dx = Math.cos(a), dy = Math.sin(a);
      const hits = [];
      const cands = this.enemiesNear(x + dx * wallD / 2, y + dy * wallD / 2, wallD / 2 + 1);
      const tgts = opt.owner === 'player' ? cands.filter(e => e.kind !== 'npc') : cands.filter(e => e !== opt.src);
      if (opt.owner !== 'player') { tgts.push(this.player); if (this.npc && !this.npc.rescued) tgts.push(this.npc); }
      for (const e of tgts) {
        if (e.dead || e.hp <= 0) continue;
        if (e.kind === 'player' && e.rollT > 0.1) continue;
        const ex = e.x - x, ey = (e.y - 0.25) - y;
        const t = ex * dx + ey * dy;
        if (t < 0 || t > wallD) continue;
        const px = ex - dx * t, py = ey - dy * t;
        const rr = e.r + (e.type === 'crawler' ? 0 : 0.08);
        if (px * px + py * py < rr * rr) hits.push([t, e]);
      }
      hits.sort((p, q) => p[0] - q[0]);
      let endD = wallD, pierce = opt.pierce || 1;
      for (const [t, e] of hits) {
        let dd = dmg; if (opt.falloff && t > opt.falloff) dd *= U.clamp(1 - (t - opt.falloff) / (range - opt.falloff + 0.01) * 0.6, 0.3, 1);
        if (e.kind === 'player') { e.hurt(dd, '掠夺者', false, { bullet: true }); }
        else if (e.kind === 'npc') { e.hp -= dd; }
        else e.damage(dd, x, y, 0.25, opt.owner === 'player' ? 'player' : 'bandit');
        pierce--; if (pierce <= 0) { endD = t; break; }
      }
      this.tracers.push({ x0: x, y0: y, x1: x + dx * endD, y1: y + dy * endD, life: 0.07, max: 0.07 });
      if (endD === wallD && wallD < range) for (let i = 0; i < 2; i++) this.particle(x + dx * wallD, y + dy * wallD, 'rgba(200,190,170,0.9)', 12);
    }
    hitTarget(t, dmg, src, opts) {
      if (t.kind === 'player') t.hurt(dmg, src.def.name, false, opts);
      else if (t.kind === 'bandit') t.damage(dmg, src.x, src.y, 0.3, 'zombie');
      else if (t.kind === 'npc') { t.hp -= dmg; this.blood(t.x, t.y, 3); }
    }
    explodeBile(x, y) {
      const P = this.player;
      this.decals.push({ type: 'bile', x, y, r: 2.0, life: 7, seed: (Math.random() * 1e9) | 0 });
      for (let i = 0; i < 25; i++) this.particles.push({ x, y, vx: U.rand(-5, 5), vy: U.rand(-5, 5), z: 14, vz: U.rand(20, 80), col: 'rgba(150,160,60,0.9)', s: U.rand(3, 6), life: 0.7, max: 0.7 });
      if (U.dist(x, y, P.x, P.y) < 2.3) { P.hurt(18, '肿胀者的腐液', false, { infect: 12 }); P.slowT = 3; this.float(P.x, P.y, '腐液！', '#c8d080'); }
      for (const e of this.enemiesNear(x, y, 2.3)) if (e.kind === 'zombie' && !e.dead) e.damage(35, x, y, 1, 'bile');
      this.noise(x, y, 8);
      G.R.cam.shake = Math.max(G.R.cam.shake, 6);
    }
    addFire(x, y) {
      this.fires.push({ x, y, r: 2.0, life: 7, seed: (Math.random() * 1000) | 0 });
      this.lights.push({ x, y, r: 6, life: 7, a: 0.9, warm: true, flicker: true });
      this.decals.push({ type: 'scorch', x, y, r: 2, seed: (Math.random() * 1e9) | 0 });
    }
    landProjectile(p) {
      const P = this.player;
      if (p.kind === 'debris') {
        for (const t of this.targets) if (!t.dead && U.dist(p.x, p.y, t.x, t.y) < 1.0 + t.r) {
          if (t.kind === 'player') { t.hurt(p.dmg, '投掷者', false, { bleedChance: 0.1 }); const a = U.ang(p.sx, p.sy, t.x, t.y); t.pullVX = Math.cos(a) * 5; t.pullVY = Math.sin(a) * 5; this.float(t.x, t.y, '被' + p.name + '砸中', '#ffb0a0'); }
          else this.hitTarget(t, p.dmg, { def: { name: '投掷者' }, x: p.sx, y: p.sy }, {});
        }
        for (const e of this.enemiesNear(p.x, p.y, 1)) if (e.kind === 'zombie') e.damage(p.dmg * 0.5, p.x, p.y, 0.8, 'debris');
        for (let i = 0; i < 8; i++) this.particle(p.x, p.y, 'rgba(150,130,110,0.9)', 4);
        this.noise(p.x, p.y, 6); G.R.cam.shake = Math.max(G.R.cam.shake, 4);
      } else if (p.kind === 'brick') {
        for (const e of this.enemiesNear(p.x, p.y, 0.8)) e.damage(15, p.sx, p.sy, 0.8, 'player');
        this.noise(p.x, p.y, 10); this.noisePings.push({ x: p.x, y: p.y, life: 1 });
        for (let i = 0; i < 5; i++) this.particle(p.x, p.y, 'rgba(160,72,42,0.9)', 4);
      } else if (p.kind === 'firecracker') {
        this.crackers = this.crackers || [];
        this.crackers.push({ x: p.x, y: p.y, life: 6, t: 0 });
      } else if (p.kind === 'molotov') {
        if (G.M.isSolid(Math.floor(p.x), Math.floor(p.y)) && G.M.tile(Math.floor(p.x), Math.floor(p.y)) === G.M.T.WATER) { this.float(p.x, p.y, '掉江里了', '#ccc'); return; }
        this.addFire(p.x, p.y); this.noise(p.x, p.y, 8);
      }
    }

    onEnemyDeath(e, src) {
      const P = this.player;
      if (e.despawn) return;
      if (src === 'player' || src === 'bile' || src === 'debris' || src === 'brute') {
        if (src === 'player') this.gainXp(e.def.xp);
        if (src === 'player') { this.kills++; if (P.perk('p_butcher') && P.slot === 'melee') P.hp = Math.min(P.maxhp, P.hp + 3); }
      }
      if (e.type === 'bloater') this.explodeBile(e.x, e.y);
      const corpse = { type: 'corpse', x: e.x, y: e.y, rot: Math.random() * 6.28, col: e.kind === 'bandit' ? '#3a4048' : e.col, seed: e.seed, size: e.type === 'brute' ? 1.8 : e.type === 'bloater' ? 1.4 : 1 };
      // 掉落
      const items = [];
      const special = ['bloater', 'tentacle', 'thrower', 'brute'].includes(e.type);
      if (e.kind === 'bandit') {
        items.push(G.S.newItem(e.weapon.id)); const ad = D.items[e.weapon.id].ammo; items.push(G.S.newItem(ad, U.randi(6, 20)));
        for (let i = 0; i < 2; i++) items.push(this.rollItem('residential', 2));
      } else if (special) {
        if (Math.random() < (P.perk('p_scrap') ? 1 : 0.45)) items.push(G.S.newItem(Math.random() < 0.5 ? 'sample' : U.pick(['tools', 'cig', 'phone', 'battery'])));
      } else if (Math.random() < 0.12) items.push(this.rollItem('residential', 1));
      if (items.length) { corpse.loot = true; corpse.kind = 'body'; corpse.items = items; corpse.searched = false; this.specialContainers.push(corpse); G.M.addBucket(corpse); }
      this.decals.push(corpse);
    }

    gainXp(x) {
      this.xp += x;
      const need = (l) => 40 + (l - 1) * 55;
      let acc = 0; for (let l = 1; l < this.level; l++) acc += need(l);
      while (this.xp >= acc + need(this.level)) { acc += need(this.level); this.level++; this.pendingPerks++; }
      if (this.pendingPerks > 0 && G.UI) G.UI.offerPerk();
    }
    xpProgress() {
      const need = (l) => 40 + (l - 1) * 55;
      let acc = 0; for (let l = 1; l < this.level; l++) acc += need(l);
      return (this.xp - acc) / need(this.level);
    }
    applyPerk(id) {
      this.perks.add(id);
      const P = this.player;
      if (id === 'p_tough') { P.maxhp += 25; P.hp += 25; }
      if (id === 'p_armor') for (const s of ['helmet', 'body']) { const a = P.equip[s]; if (a) a.dur = D.items[a.id].dur; }
      if (id === 'p_eye') { this.sightRange *= 1; this.flashRange *= 1.4; this.dark *= 0.75; }
    }

    // ---------- 搜刮 ----------
    rollItem(kind, bonus = 0) {
      const k = D.kinds[kind] || D.kinds.residential;
      const eye = G.S.sk(this.st, 'eye');
      const dg = this.dangerAt(this.player.x, this.player.y);
      const tbl = k.loot.map(([id, w]) => { const r = D.items[id].r; return [id, w * (r >= 3 ? (1 + eye * 0.1 + (dg - 1) * 0.15 + bonus * 0.2) : 1)]; });
      const id = U.weighted(tbl);
      const d = D.items[id];
      let n = 1;
      if (d.type === 'ammo') n = Math.max(1, Math.round(U.rand(0.25, 0.6) * Math.min(d.stack, id === 'nail' ? 60 : id === 'fuel' ? 2 : 30)));
      else if (d.stack > 1) n = U.randi(1, Math.min(3, d.stack));
      const it = G.S.newItem(id, n);
      if (d.type === 'gun') it.mag = U.randi(0, d.mag);
      if (d.type === 'armor') it.dur = Math.round(d.dur * U.rand(0.4, 1));
      if (d.chainsaw) it.fuel = U.randi(10, 60);
      return it;
    }
    genLoot(c) {
      if (c.items) return c.items;
      const P = this.player;
      let n;
      if (c.type === 'door') { const a = (G.M.buildings[c.bid].a || 30); n = U.randi(1, 2) + (a > 150 ? 1 : 0) + (a > 600 ? 1 : 0); if (Math.random() < 0.15) n = 0; }
      else if (c.type === 'airdrop') n = U.randi(4, 6);
      else n = U.randi(0, 2);
      if (P.perk('p_luck') && n > 0) n++;
      c.items = [];
      for (let i = 0; i < n; i++) c.items.push(this.rollItem(c.kind, c.type === 'airdrop' ? 2 : 0));
      return c.items;
    }
    searchTime(c) {
      const k = D.kinds[c.kind] || D.kinds.residential;
      let t = (c.type === 'door' ? k.t : (c.type === 'body' || c.type === 'corpse' || c.type === 'pile' ? 1.2 : k.t));
      t *= (1 - G.S.sk(this.st, 'quick') * 0.1) * (this.player.perk('p_scav') ? 0.7 : 1);
      if (c.searched) t = 0.2;
      return t;
    }
    findInteract() {
      const P = this.player;
      let best = null, bd = 1e9;
      const pool = G.M.nearContainers(P.x, P.y, 2.2);
      for (const c of pool) {
        if (c.type === 'corpse' && !c.loot) continue;
        const rr = c.type === 'car' ? 1.7 : c.type === 'door' ? 1.1 : 1.3;
        const d = U.dist(P.x, P.y, c.x, c.y);
        if (d < rr && d < bd) { bd = d; best = c; }
      }
      if (this.npc && !this.npc.rescued && U.dist(P.x, P.y, this.npc.x, this.npc.y) < 1.5) return { type: 'npc' };
      return best;
    }
    containerName(c) {
      if (c.type === 'door') { const b = G.M.buildings[c.bid]; return (b.n ? b.n : (D.kinds[b.k] || {}).name || '建筑'); }
      if (c.type === 'pile') return '地上的物品';
      return (D.kinds[c.kind] || {}).name || '容器';
    }
    completeSearch(c) {
      const P = this.player;
      const first = !c.searched;
      c.searched = true;
      this.genLoot(c);
      if (first && c.type === 'door') {
        this.noise(c.x, c.y, 4 * P.noiseMul());
        const dg = this.dangerAt(c.x, c.y);
        if (Math.random() < 0.08 + dg * 0.04) { // 屋里有东西
          const t = Math.random() < 0.2 + dg * 0.05 ? this.pickType(dg) : 'walker';
          const z = this.spawnEnemy(t, c.x, c.y); z.alert(P); z.attackCd = 0.6;
          this.float(c.x, c.y, '屋里有东西冲出来了！', '#ff9a80', true);
          G.R.cam.shake = 6;
        }
      }
      if (first) this.gainXp(c.type === 'airdrop' ? 25 : 2);
      if (G.UI) G.UI.openLoot(c);
    }
    rescueNpc() {
      const P = this.player, n = this.npc;
      n.rescued = true; n.fleeA = Math.random() * 6.28; n.fleeT = 4;
      const reward = [G.S.newItem(U.pick(['huntshot', 'revolver', 'machete', 'body_stab', 'bag_hiking'])), G.S.newItem(U.pick(['firstaid', 'baiyao', 'antibiotic']))];
      const pile = { type: 'pile', kind: 'body', x: P.x, y: P.y, items: reward, searched: true };
      this.specialContainers.push(pile); G.M.addBucket(pile);
      this.gainXp(60);
      this.log('幸存者：“谢谢！这些你拿着，我自己能走到卡口。”');
      this.st.money += 300; this.log('卡口记录了你的救援行为：+300 积分');
      if (G.UI) G.UI.openLoot(pile);
    }
    dropItem(it) {
      const P = this.player;
      let pile = G.M.nearContainers(P.x, P.y, 1).find(c => c.type === 'pile');
      if (!pile) { pile = { type: 'pile', kind: 'body', x: P.x, y: P.y, items: [], searched: true }; this.specialContainers.push(pile); G.M.addBucket(pile); }
      pile.items.push(it);
    }

    // ---------- 主循环 ----------
    update(dt, inp) {
      if (this.ended) return;
      const P = this.player;
      this.time += dt;
      const ox = P.x, oy = P.y;
      P.update(dt, inp);
      P.vx = (P.x - ox) / dt; P.vy = (P.y - oy) / dt;
      if (P.hp <= 0) return this.end('dead');
      // 流场
      this.flowT -= dt;
      if (this.flowT <= 0) { G.M.updateFlow(P.x, P.y); this.flowT = 0.35; }
      if (G.M.flow) G.M.flow.age += dt;
      this.rebuildHash();
      // 敌人(只更新附近，远处降频)
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d2 = U.d2(P.x, P.y, e.x, e.y);
        if (d2 > 60 * 60) { e.farT = (e.farT || 0) + dt; if (e.farT < 0.5) continue; e.update(e.farT); e.farT = 0; continue; }
        e.update(dt);
      }
      this.enemies = this.enemies.filter(e => !e.dead);
      this.targets = this.targets.filter(t => !t.dead && (t.kind !== 'bandit' || t.hp > 0) && !t.gone);
      if (this.npc) {
        this.npc.update(dt);
        if (this.npc.hp <= 0 && !this.npc.dead) { this.npc.dead = true; this.log('求救的幸存者没能撑住……'); this.decals.push({ type: 'corpse', x: this.npc.x, y: this.npc.y, rot: 1, col: '#8a6a4a', seed: 5 }); }
        if (this.npc.gone || this.npc.dead) { this.targets = this.targets.filter(t => t !== this.npc); if (this.npc.dead || this.npc.gone) this.npcDone = true; }
      }
      // 投射物
      for (const p of this.projectiles) {
        p.prog += dt / p.dur;
        const t = Math.min(1, p.prog);
        p.x = U.lerp(p.sx, p.tx, t); p.y = U.lerp(p.sy, p.ty, t);
        if (p.prog >= 1) { p.done = true; this.landProjectile(p); }
      }
      this.projectiles = this.projectiles.filter(p => !p.done);
      // 鞭炮
      if (this.crackers) {
        for (const c of this.crackers) {
          c.life -= dt; c.t -= dt;
          if (c.t <= 0) { c.t = 0.15; this.noise(c.x, c.y, 16, 'lure'); for (const e of this.enemiesNear(c.x, c.y, 16)) { if (e.kind === 'zombie' && !(e.state === 'chase' && U.dist(e.x, e.y, P.x, P.y) < 3)) { e.state = 'investigate'; e.target = null; e.gx = c.x; e.gy = c.y; e.idleT = 2; } } for (let i = 0; i < 3; i++) this.particle(c.x, c.y, U.pick(['rgba(255,220,100,1)', 'rgba(255,90,60,1)']), 6); this.lights.push({ x: c.x, y: c.y, r: 2.5, life: 0.1, a: 0.8, warm: true }); }
        }
        this.crackers = this.crackers.filter(c => c.life > 0);
      }
      // 火
      for (const f of this.fires) {
        f.life -= dt;
        for (const e of this.enemiesNear(f.x, f.y, f.r)) { e.burnT = Math.max(e.burnT, 3); }
        if (U.dist(P.x, P.y, f.x, f.y) < f.r * 0.9) { P.hurt(dt * 12, '火', true); P.hitT = 0.1; }
        if (Math.random() < dt * 12) this.particle(f.x + U.rand(-f.r, f.r) * .6, f.y + U.rand(-f.r, f.r) * .5, 'rgba(240,150,50,0.8)', 10);
      }
      this.fires = this.fires.filter(f => f.life > 0);
      for (const d of this.decals) if (d.type === 'bile') {
        d.life -= dt;
        if (U.dist(P.x, P.y, d.x, d.y) < d.r && d.life > 0) { P.hurt(dt * 3, '腐液', true); P.slowT = Math.max(P.slowT, 0.3); P.infect = Math.min(100, P.infect + dt * 1.5); }
      }
      this.decals = this.decals.filter(d => d.type !== 'bile' || d.life > 0);
      // 特效
      for (const l of this.lights) l.life -= dt;
      this.lights = this.lights.filter(l => l.life > 0);
      for (const t of this.tracers) t.life -= dt;
      this.tracers = this.tracers.filter(t => t.life > 0);
      for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 150 * dt; if (p.z < 0) { p.z = 0; p.vx *= 0.5; p.vy *= 0.5; } }
      this.particles = this.particles.filter(p => p.life > 0);
      if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
      for (const f of this.floats) f.life -= dt;
      this.floats = this.floats.filter(f => f.life > 0);
      for (const n of this.noisePings) n.life -= dt * 0.7;
      this.noisePings = this.noisePings.filter(n => n.life > 0);
      // 刷怪 & 事件
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.dynamicSpawn(); this.spawnT = 1.2; this.zone = G.M.zoneAt(P.x, P.y); }
      if (this.airdropAt && this.time >= this.airdropAt) { this.airdropAt = 0; this.spawnAirdrop(); }
      if (this.banditAt && this.time >= this.banditAt) { this.banditAt = 0; this.spawnBandits(this.mods.bandits ? 3 : 2); }
      if (!this.hordeOn && this.time >= this.hordeAt) { this.hordeOn = true; this.log('⚠ 尸潮来了！整座城市都在往这边涌，立刻撤离！'); G.UI && G.UI.toast('尸 潮 来 袭'); G.R.cam.shake = 8; }
      for (const ex of this.extracts) if (ex.pending && this.time >= ex.opensAt) { ex.pending = false; ex.open = true; this.log(ex.name + ' 已开放！'); }
      // 撤离
      let inEx = null;
      for (const ex of this.extracts) if (ex.open && U.dist(P.x, P.y, ex.x, ex.y) < 1.6) inEx = ex;
      if (inEx) {
        this.extractHold += dt;
        this.extractNeed = inEx.kind === 'metro' ? 10 : 8;
        this.extractName = inEx.name;
        if (this.extractHold >= this.extractNeed) return this.end('extract', inEx);
      } else this.extractHold = 0;
      if (this.time >= this.timeLimit) { this.deathCause = '撤离窗口关闭，被困在城里'; return this.end('dead'); }
      // 可见实体
      const hw = G.R.W / 2 / G.U.TS + 3, hh = G.R.H / 2 / G.U.TS + 4;
      this.visibleEntities = this.enemies.filter(e => Math.abs(e.x - G.R.cam.x) < hw && Math.abs(e.y - G.R.cam.y) < hh);
      this.visibleEntities.push(P);
      if (this.npc && !this.npc.gone && !this.npc.dead) this.visibleEntities.push(this.npc);
    }
    end(how, ex) {
      if (this.ended) return;
      this.ended = true; this.result = how; this.extractedAt = ex;
      if (G.UI) G.UI.raidEnded(this);
    }
  }
  G.Raid = Raid;
})();
