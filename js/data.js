// ===== 游戏数据：物品 / 敌人 / 技能 / 天赋 / 剧情 =====
(function () {
  const D = {};

  // rarity 1 普通 2 优良 3 稀有 4 罕见 5 传说
  // 枪械参数尽量贴近现实：伤害以普通人体为基准(丧尸约60~120)，射程以格(4米)计
  const I = {
    // ---------- 枪械 ----------
    nailgun: { name: '气动射钉枪', type: 'gun', slot: 'secondary', r: 1, value: 260, dmg: 16, rpm: 180, mag: 30, ammo: 'nail', spread: 0.07, recoil: 0.02, reload: 2.2, range: 7, noise: 6, auto: false, desc: '工地顺来的，声音小，近距离能钉穿头骨。' },
    slingbow: { name: '复合弩', type: 'gun', slot: 'primary', r: 3, value: 900, dmg: 85, rpm: 30, mag: 1, ammo: 'bolt', spread: 0.015, recoil: 0, reload: 1.8, range: 16, noise: 2, auto: false, desc: '几乎无声，一发一装，适合摸尸。' },
    pistol92: { name: '92式手枪', type: 'gun', slot: 'secondary', r: 3, value: 1500, dmg: 30, rpm: 300, mag: 15, ammo: '9mm', spread: 0.05, recoil: 0.05, reload: 1.6, range: 14, noise: 22, auto: false, desc: '派出所制式配枪，9×19mm。可靠。' },
    revolver: { name: '警用转轮手枪', type: 'gun', slot: 'secondary', r: 2, value: 1100, dmg: 38, rpm: 140, mag: 5, ammo: '9mm', spread: 0.045, recoil: 0.09, reload: 2.6, range: 13, noise: 24, auto: false, desc: '老式警用左轮，装弹慢但每发都扎实。' },
    huntshot: { name: '单管猎枪', type: 'gun', slot: 'primary', r: 2, value: 1300, dmg: 14, pellets: 8, rpm: 50, mag: 1, ammo: '12g', spread: 0.16, recoil: 0.25, reload: 1.9, range: 9, noise: 30, auto: false, desc: '乡下亲戚藏在床底的，近距离一枪一个。' },
    shotgun97: { name: '97式防暴霰弹枪', type: 'gun', slot: 'primary', r: 3, value: 2600, dmg: 15, pellets: 8, rpm: 70, mag: 5, ammo: '12g', spread: 0.15, recoil: 0.22, reload: 3.2, range: 10, noise: 30, auto: false, desc: '18.4mm防暴霰弹枪改装实弹。巷战之王。' },
    smg05: { name: '05式冲锋枪', type: 'gun', slot: 'primary', r: 4, value: 4200, dmg: 22, rpm: 800, mag: 50, ammo: '58x21', spread: 0.065, recoil: 0.025, reload: 2.8, range: 13, noise: 26, auto: true, desc: '特警装备，射速快，后坐小。' },
    rifle95: { name: '95式自动步枪', type: 'gun', slot: 'primary', r: 5, value: 6800, dmg: 42, rpm: 650, mag: 30, ammo: '58mm', spread: 0.04, recoil: 0.04, reload: 3.0, range: 22, noise: 38, auto: true, desc: '武警卡口遗落的制式步枪。5.8mm，能打穿两只丧尸。', pierce: 2 },
    // ---------- 近战 ----------
    fist: { name: '拳头', type: 'melee', slot: 'melee', r: 1, value: 0, dmg: 6, speed: 0.45, range: 0.9, arc: 1.0, stamina: 6, noise: 1, knock: 0.3, desc: '打工人最后的尊严。' },
    cleaver: { name: '菜刀', type: 'melee', slot: 'melee', r: 1, value: 80, dmg: 22, speed: 0.5, range: 1.1, arc: 1.2, stamina: 8, noise: 2, knock: 0.2, bleed: 0.3, desc: '粉店后厨拿的，剁骨头不卷刃。' },
    pipe: { name: '镀锌钢管', type: 'melee', slot: 'melee', r: 1, value: 60, dmg: 20, speed: 0.65, range: 1.4, arc: 1.4, stamina: 10, noise: 3, knock: 0.6, desc: '工地脚手架拆下来的，够长。' },
    hammer: { name: '羊角锤', type: 'melee', slot: 'melee', r: 1, value: 90, dmg: 26, speed: 0.6, range: 1.0, arc: 1.0, stamina: 9, noise: 2, knock: 0.4, desc: '五金店常客。敲头一下是一下。' },
    baton: { name: '伸缩甩棍', type: 'melee', slot: 'melee', r: 2, value: 220, dmg: 22, speed: 0.42, range: 1.2, arc: 1.2, stamina: 7, noise: 2, knock: 0.5, desc: '保安亭里找到的，出手快。' },
    shovel: { name: '工兵铲', type: 'melee', slot: 'melee', r: 2, value: 260, dmg: 30, speed: 0.75, range: 1.4, arc: 1.5, stamina: 12, noise: 3, knock: 0.7, desc: '能砍能拍，还能挖坑。' },
    machete: { name: '开山刀', type: 'melee', slot: 'melee', r: 2, value: 340, dmg: 36, speed: 0.62, range: 1.3, arc: 1.4, stamina: 11, noise: 2, knock: 0.3, bleed: 0.5, desc: '十八子作，乡下砍甘蔗用的。', cleave: 2 },
    fireaxe: { name: '消防斧', type: 'melee', slot: 'melee', r: 3, value: 600, dmg: 52, speed: 0.95, range: 1.4, arc: 1.3, stamina: 16, noise: 3, knock: 0.9, desc: '消防栓箱里拆下来的。重，但劈得开颅骨。', cleave: 2 },
    chainsaw: { name: '油锯', type: 'melee', slot: 'melee', r: 4, value: 2200, dmg: 14, speed: 0.1, range: 1.3, arc: 0.9, stamina: 1.2, noise: 18, knock: 0.05, chainsaw: true, fuelMax: 100, desc: '园林绿化队的油锯。持续切割，噪音巨大，耗油。' },
    // ---------- 投掷 ----------
    brick: { name: '红砖', type: 'throw', r: 1, value: 2, stack: 8, dmg: 15, desc: '扔出去能制造响动，引开丧尸。' },
    firecracker: { name: '鞭炮', type: 'throw', r: 2, value: 40, stack: 6, desc: '过年剩的。点燃后持续噼啪作响，吸引附近丧尸。' },
    molotov: { name: '燃烧瓶', type: 'throw', r: 2, value: 120, stack: 4, desc: '三花酒+布条。落地形成火海。' },
    // ---------- 弹药 ----------
    nail: { name: '射钉', type: 'ammo', r: 1, value: 1, stack: 120, desc: '射钉枪用。' },
    bolt: { name: '弩箭', type: 'ammo', r: 2, value: 18, stack: 20, desc: '碳纤维弩箭。' },
    '9mm': { name: '9mm手枪弹', type: 'ammo', r: 2, value: 8, stack: 90, desc: '9×19mm 手枪弹。' },
    '12g': { name: '12号霰弹', type: 'ammo', r: 2, value: 14, stack: 40, desc: '12号鹿弹。' },
    '58x21': { name: '5.8×21mm弹', type: 'ammo', r: 3, value: 12, stack: 120, desc: '冲锋枪弹药。' },
    '58mm': { name: '5.8×42mm弹', type: 'ammo', r: 4, value: 20, stack: 90, desc: '步枪弹，稀缺。' },
    fuel: { name: '汽油(升)', type: 'ammo', r: 2, value: 45, stack: 10, desc: '油锯燃料，也能做燃烧瓶。每升加30%。' },
    // ---------- 防具 ----------
    helm_delivery: { name: '外卖头盔', type: 'armor', slot: 'helmet', r: 1, value: 60, armor: 0.12, dur: 60, desc: '黄色的，某团。至少能挡一口。' },
    helm_moto: { name: '全盔摩托头盔', type: 'armor', slot: 'helmet', r: 2, value: 260, armor: 0.22, dur: 100, desc: '鬼火少年的遗物。' },
    helm_riot: { name: '防暴头盔', type: 'armor', slot: 'helmet', r: 3, value: 700, armor: 0.32, dur: 160, desc: '带面罩的警用防暴头盔。' },
    body_work: { name: '加厚工装', type: 'armor', slot: 'body', r: 1, value: 80, armor: 0.10, dur: 80, desc: '仓库发的冬季工装，牙齿咬不穿第一层。' },
    body_leather: { name: '摩托皮衣', type: 'armor', slot: 'body', r: 2, value: 320, armor: 0.2, dur: 120, desc: '牛皮，防咬防刮。' },
    body_stab: { name: '防刺服', type: 'armor', slot: 'body', r: 3, value: 900, armor: 0.32, dur: 180, desc: '保安/辅警装备，对咬抓非常有效。' },
    body_vest: { name: '防弹背心', type: 'armor', slot: 'body', r: 4, value: 2200, armor: 0.42, dur: 240, bulletproof: true, desc: '特警防弹背心，能挡手枪弹。' },
    // ---------- 背包 ----------
    bag_plastic: { name: '红白蓝编织袋', type: 'bag', slot: 'bag', r: 1, value: 10, cap: 8, desc: '春运同款。8格。' },
    bag_school: { name: '双肩书包', type: 'bag', slot: 'bag', r: 1, value: 60, cap: 12, desc: '12格。' },
    bag_delivery: { name: '外卖保温箱', type: 'bag', slot: 'bag', r: 2, value: 160, cap: 16, desc: '背在身后的外卖箱。16格。' },
    bag_hiking: { name: '登山包', type: 'bag', slot: 'bag', r: 3, value: 600, cap: 22, desc: '户外店的。22格。' },
    bag_tactical: { name: '战术背包', type: 'bag', slot: 'bag', r: 4, value: 1500, cap: 28, desc: '军警款。28格。' },
    // ---------- 医疗 ----------
    bandage: { name: '纱布绷带', type: 'med', r: 1, value: 30, stack: 6, heal: 8, stopBleed: true, use: 2.0, desc: '止血，回复少量生命。' },
    baiyao: { name: '云南白药', type: 'med', r: 2, value: 120, stack: 4, heal: 30, stopBleed: true, use: 2.5, desc: '止血神药，回复30生命。' },
    firstaid: { name: '急救包', type: 'med', r: 3, value: 380, stack: 3, heal: 65, stopBleed: true, use: 4.0, desc: '医院的标准急救包。' },
    antibiotic: { name: '抗生素', type: 'med', r: 2, value: 200, stack: 5, infect: -25, use: 1.2, desc: '头孢，降低25感染。别喝酒。' },
    serum: { name: '抗变异血清', type: 'med', r: 5, value: 3000, stack: 2, infect: -100, heal: 20, use: 3.0, desc: '人民医院隔离区流出的实验血清，清除感染。' },
    painkiller: { name: '布洛芬', type: 'med', r: 1, value: 50, stack: 6, heal: 5, staminaBuff: 20, use: 1.0, desc: '20秒内体力恢复加快。' },
    // ---------- 食物 ----------
    noodle: { name: '老友粉(料包)', type: 'food', r: 1, value: 25, stack: 5, food: 30, use: 2.5, desc: '酸笋豆豉辣椒，南宁人的魂。' },
    luosifen: { name: '螺蛳粉', type: 'food', r: 1, value: 30, stack: 5, food: 35, use: 2.5, desc: '气味可以掩盖人味(也许)。' },
    biscuit: { name: '压缩饼干', type: 'food', r: 1, value: 20, stack: 8, food: 20, use: 1.5, desc: '' },
    redbull: { name: '红牛', type: 'food', r: 1, value: 25, stack: 6, food: 5, stamina: 60, use: 1.0, desc: '打工人的燃料，立即回复体力。' },
    water: { name: '矿泉水', type: 'food', r: 1, value: 10, stack: 6, food: 8, use: 1.0, desc: '' },
    // ---------- 物资/贵重品 ----------
    cig: { name: '真龙香烟', type: 'loot', r: 1, value: 60, stack: 10, desc: '广西本地烟，硬通货。' },
    sanhua: { name: '桂林三花酒', type: 'loot', r: 2, value: 90, stack: 4, desc: '可以交易，也能做燃烧瓶。' },
    battery: { name: '电动车电池', type: 'loot', r: 2, value: 220, stack: 2, desc: '卡口那边收电池发电。' },
    powerbank: { name: '充电宝', type: 'loot', r: 1, value: 70, stack: 5, desc: '' },
    phone: { name: '智能手机', type: 'loot', r: 2, value: 160, stack: 5, desc: '没信号了，但零件值钱。' },
    goldchain: { name: '金项链', type: 'loot', r: 3, value: 900, stack: 3, desc: '黄金依旧值钱。' },
    maotai: { name: '飞天茅台', type: 'loot', r: 4, value: 2200, stack: 2, desc: '末日也有人收。' },
    medkit_box: { name: '一箱处方药', type: 'loot', r: 3, value: 800, stack: 2, desc: '卡口医疗站急需。' },
    harddisk: { name: '加密硬盘', type: 'loot', r: 4, value: 1800, stack: 2, desc: '政府机关的硬盘，有人出高价。' },
    sample: { name: '变异组织样本', type: 'loot', r: 4, value: 1500, stack: 3, desc: '从变异体身上取下的。疾控的人要。' },
    tools: { name: '工具套装', type: 'loot', r: 2, value: 180, stack: 3, desc: '' },
    rice: { name: '一袋大米', type: 'loot', r: 1, value: 120, stack: 2, desc: '村里最缺的东西。' },
    express: { name: '无主快递', type: 'loot', r: 1, value: 40, stack: 6, desc: '拆开可能有好东西(可直接卖)。' },
  };
  for (const k in I) { I[k].id = k; if (!I[k].stack) I[k].stack = 1; }
  D.items = I;
  D.rarityName = ['', '普通', '优良', '稀有', '罕见', '传说'];

  // 建筑种类 -> 中文 & 搜索时间 & 掉落表
  D.kinds = {
    residential: { name: '居民楼', t: 4, loot: [['noodle', 6], ['water', 6], ['biscuit', 4], ['bandage', 4], ['cleaver', 2], ['cig', 4], ['phone', 3], ['powerbank', 3], ['goldchain', 1], ['sanhua', 2], ['painkiller', 3], ['rice', 2], ['bag_school', 1], ['helm_delivery', 1], ['hammer', 1]] },
    village: { name: '城中村自建房', t: 3, loot: [['noodle', 6], ['luosifen', 4], ['water', 5], ['cig', 5], ['sanhua', 3], ['brick', 6], ['firecracker', 3], ['cleaver', 2], ['battery', 2], ['bag_plastic', 2], ['helm_delivery', 2], ['huntshot', 0.4], ['12g', 1], ['rice', 2], ['powerbank', 2], ['machete', 0.6]] },
    shop: { name: '临街商铺', t: 3, loot: [['phone', 4], ['powerbank', 4], ['cig', 4], ['water', 4], ['redbull', 4], ['express', 5], ['tools', 2], ['bag_school', 1], ['goldchain', 0.6], ['maotai', 0.3]] },
    restaurant: { name: '粉店', t: 3, loot: [['noodle', 10], ['luosifen', 8], ['cleaver', 4], ['water', 5], ['sanhua', 4], ['fuel', 1], ['rice', 2]] },
    pharmacy: { name: '药店', t: 4, loot: [['bandage', 8], ['baiyao', 6], ['antibiotic', 5], ['painkiller', 6], ['firstaid', 1.5], ['medkit_box', 0.8]] },
    convenience: { name: '便利店', t: 3, loot: [['redbull', 8], ['water', 8], ['biscuit', 6], ['cig', 6], ['noodle', 4], ['powerbank', 3], ['firecracker', 2]] },
    hardware: { name: '五金店', t: 4, loot: [['hammer', 5], ['pipe', 5], ['shovel', 3], ['nailgun', 3], ['nail', 6], ['tools', 5], ['fuel', 3], ['machete', 2], ['chainsaw', 0.5], ['fireaxe', 0.8], ['bag_plastic', 2]] },
    mall: { name: '商场', t: 6, loot: [['phone', 5], ['goldchain', 2], ['maotai', 0.8], ['powerbank', 4], ['redbull', 4], ['bag_hiking', 1.2], ['body_leather', 1], ['helm_moto', 1], ['slingbow', 0.4], ['bolt', 1.5], ['baton', 1.5], ['sanhua', 2], ['express', 3]] },
    hospital: { name: '医院', t: 6, loot: [['firstaid', 4], ['baiyao', 5], ['antibiotic', 6], ['bandage', 6], ['medkit_box', 3], ['serum', 0.5], ['sample', 1], ['painkiller', 4]] },
    office: { name: '写字楼', t: 5, loot: [['phone', 4], ['harddisk', 1], ['powerbank', 4], ['redbull', 4], ['water', 3], ['biscuit', 3], ['baton', 1.2], ['body_work', 1]] },
    gov: { name: '机关单位', t: 6, loot: [['harddisk', 2], ['maotai', 1], ['baton', 2], ['body_stab', 0.8], ['helm_riot', 0.6], ['pistol92', 0.4], ['9mm', 1.5], ['cig', 3], ['firstaid', 1]] },
    police: { name: '派出所', t: 6, loot: [['pistol92', 3], ['revolver', 2], ['9mm', 6], ['shotgun97', 1.2], ['12g', 3], ['baton', 3], ['body_stab', 2], ['helm_riot', 2], ['body_vest', 0.6], ['smg05', 0.4], ['58x21', 1], ['firstaid', 1.5], ['bag_tactical', 0.3]] },
    hotel: { name: '宾馆', t: 5, loot: [['water', 5], ['biscuit', 3], ['cig', 4], ['sanhua', 3], ['phone', 3], ['goldchain', 1], ['bandage', 2], ['bag_hiking', 0.5]] },
    culture: { name: '文化场馆', t: 5, loot: [['water', 3], ['fireaxe', 1.5], ['firstaid', 1], ['harddisk', 0.6], ['goldchain', 1], ['bag_school', 1]] },
    temple: { name: '寺庙', t: 3, loot: [['cig', 3], ['goldchain', 1.5], ['firecracker', 5], ['water', 2]] },
    bank: { name: '银行', t: 6, loot: [['goldchain', 4], ['baton', 2], ['pistol92', 0.5], ['9mm', 1], ['body_stab', 0.6], ['harddisk', 0.8]] },
    parking: { name: '立体车库', t: 4, loot: [['fuel', 5], ['battery', 4], ['tools', 3], ['helm_moto', 1.5], ['body_leather', 1]] },
    school: { name: '学校', t: 5, loot: [['water', 4], ['biscuit', 4], ['bandage', 3], ['bag_school', 3], ['pipe', 2], ['fireaxe', 0.6]] },
    market: { name: '菜市场', t: 4, loot: [['rice', 6], ['cleaver', 5], ['noodle', 4], ['luosifen', 4], ['machete', 2], ['sanhua', 2], ['water', 3]] },
    warehouse: { name: '仓库', t: 5, loot: [['express', 8], ['battery', 3], ['tools', 3], ['fuel', 2], ['bag_delivery', 1.5], ['body_work', 2], ['rice', 3], ['chainsaw', 0.3]] },
    // 室外容器
    car: { name: '废弃汽车', t: 3, loot: [['fuel', 4], ['water', 3], ['cig', 4], ['powerbank', 3], ['tools', 2], ['phone', 2], ['baton', 0.6], ['huntshot', 0.15], ['12g', 0.8], ['goldchain', 0.4]] },
    ebike: { name: '外卖电动车', t: 2, loot: [['noodle', 5], ['luosifen', 4], ['redbull', 4], ['battery', 4], ['helm_delivery', 3], ['bag_delivery', 1], ['water', 3]] },
    locker: { name: '快递柜', t: 4, loot: [['express', 10], ['phone', 3], ['powerbank', 3], ['maotai', 0.4], ['goldchain', 0.6], ['tools', 1]] },
    airdrop: { name: '政府投放物资', t: 5, loot: [['firstaid', 4], ['antibiotic', 4], ['9mm', 3], ['12g', 3], ['58x21', 1.5], ['biscuit', 4], ['water', 4], ['serum', 0.6], ['body_stab', 1], ['bag_hiking', 1]] },
    body: { name: '尸体', t: 2, loot: [] },
  };

  // ---------- 敌人 ----------
  // spd: 格/秒  (玩家行走 ~3.4)
  D.enemies = {
    walker: { name: '行尸', hp: 70, spd: 1.25, dmg: 11, reach: 0.75, r: 0.3, xp: 6, color: '#8a9473', infect: 6 },
    runner: { name: '奔尸', hp: 45, spd: 3.6, dmg: 8, reach: 0.7, r: 0.28, xp: 9, color: '#9a8f78', infect: 5 },
    crawler: { name: '爬行者', hp: 35, spd: 2.4, dmg: 9, reach: 0.6, r: 0.26, xp: 8, color: '#776b5a', infect: 8, low: true },
    bloater: { name: '肿胀者', hp: 210, spd: 0.85, dmg: 18, reach: 0.9, r: 0.48, xp: 20, color: '#8f9a5a', infect: 10 },
    tentacle: { name: '触手者', hp: 150, spd: 1.6, dmg: 14, reach: 0.8, r: 0.34, xp: 28, color: '#87675f', infect: 9, lash: 3.4 },
    thrower: { name: '投掷者', hp: 160, spd: 1.7, dmg: 14, reach: 0.85, r: 0.38, xp: 26, color: '#7e7a68', infect: 7 },
    brute: { name: '巨尸', hp: 650, spd: 1.2, dmg: 30, reach: 1.1, r: 0.6, xp: 80, color: '#6f6a5c', infect: 12 },
    bandit: { name: '掠夺者', hp: 100, spd: 2.8, dmg: 0, reach: 0, r: 0.3, xp: 30, color: '#4a5560', human: true },
  };

  // ---------- 永久技能树 ----------
  D.skillTree = [
    { branch: '枪械', nodes: [
      { id: 'steady', name: '稳定射击', max: 5, desc: (l) => `射击散布 -${l * 8}%` },
      { id: 'reload', name: '快速换弹', max: 5, desc: (l) => `换弹速度 +${l * 8}%` },
      { id: 'focus', name: '专注(主动Q)', max: 3, desc: (l) => l ? `解锁专注：${3 + l}秒内散布与后坐大幅降低，冷却${30 - l * 4}秒` : '解锁主动技能：专注' },
      { id: 'recoil', name: '压枪', max: 5, desc: (l) => `连射后坐 -${l * 10}%` },
    ]},
    { branch: '近战', nodes: [
      { id: 'power', name: '力气活', max: 5, desc: (l) => `近战伤害 +${l * 10}%` },
      { id: 'endure', name: '耐力', max: 5, desc: (l) => `最大体力 +${l * 10}` },
      { id: 'kick', name: '踢门脚', max: 3, desc: (l) => `踢击击退 +${l * 30}%，伤害 +${l * 5}` },
      { id: 'saw', name: '油锯精通', max: 3, desc: (l) => `油锯耗油 -${l * 20}%，伤害 +${l * 10}%` },
    ]},
    { branch: '生存', nodes: [
      { id: 'vital', name: '体质', max: 5, desc: (l) => `最大生命 +${l * 10}` },
      { id: 'medic', name: '急救常识', max: 5, desc: (l) => `治疗效果 +${l * 10}%，用药速度 +${l * 10}%` },
      { id: 'agile', name: '跑外卖的腿', max: 5, desc: (l) => `移动速度 +${l * 3}%，翻滚耗体 -${l * 6}%` },
      { id: 'immune', name: '免疫力', max: 5, desc: (l) => `感染累积 -${l * 8}%` },
    ]},
    { branch: '搜刮', nodes: [
      { id: 'quick', name: '手脚麻利', max: 5, desc: (l) => `搜索速度 +${l * 10}%` },
      { id: 'eye', name: '仓管的眼光', max: 5, desc: (l) => `稀有物品出现率 +${l * 10}%` },
      { id: 'carry', name: '扛包', max: 4, desc: (l) => `背包容量 +${l * 2}格` },
      { id: 'stealth', name: '轻手轻脚', max: 5, desc: (l) => `行动噪音 -${l * 10}%` },
    ]},
  ];

  // ---------- 局内肉鸽天赋(升级三选一) ----------
  D.perks = [
    { id: 'p_adren', name: '肾上腺素', desc: '生命低于30%时移速+20%，伤害+15%', w: 3 },
    { id: 'p_scav', name: '翻箱倒柜', desc: '本局搜索时间-30%', w: 3 },
    { id: 'p_luck', name: '运气不错', desc: '本局每次搜索额外+1件物品', w: 2 },
    { id: 'p_tough', name: '皮糙肉厚', desc: '最大生命+25，立即回复25', w: 3 },
    { id: 'p_lung', name: '肺活量', desc: '体力恢复+35%', w: 3 },
    { id: 'p_head', name: '准头', desc: '枪械伤害+15%', w: 3 },
    { id: 'p_butcher', name: '屠夫', desc: '近战伤害+20%，近战击杀回复3生命', w: 3 },
    { id: 'p_quiet', name: '屏息', desc: '本局所有噪音-25%', w: 2 },
    { id: 'p_mag', name: '扩容弹匣', desc: '枪械弹匣容量+25%(下次换弹生效)', w: 2 },
    { id: 'p_clot', name: '凝血体质', desc: '不会持续流血', w: 2 },
    { id: 'p_resist', name: '抗体', desc: '感染累积-35%', w: 2 },
    { id: 'p_hunger', name: '饭量小', desc: '饥饿下降速度-50%', w: 2 },
    { id: 'p_kick', name: '飞踹', desc: '踢击冷却-50%，可踢倒肿胀者', w: 2 },
    { id: 'p_reload', name: '肌肉记忆', desc: '换弹速度+25%', w: 3 },
    { id: 'p_sprint', name: '外卖超时冲刺', desc: '冲刺耗体-40%', w: 3 },
    { id: 'p_scrap', name: '拆解', desc: '击杀变异体必掉一件物资', w: 2 },
    { id: 'p_eye', name: '夜视', desc: '夜晚/暴雨视野+40%', w: 2 },
    { id: 'p_armor', name: '缝补', desc: '护甲耐久立即回满，护甲减伤+8%', w: 2 },
  ];

  // ---------- 局内修饰(肉鸽随机事件) ----------
  D.mods = [
    { id: 'rain', name: '暴雨', desc: '南宁的雨说下就下：视野降低，噪音传播-30%' },
    { id: 'night', name: '停电夜', desc: '全城停电，只能靠手电' },
    { id: 'dusk', name: '黄昏', desc: '光线昏暗' },
    { id: 'airdrop', name: '无人机投放', desc: '4分钟后政府无人机将在某处投放物资' },
    { id: 'bandits', name: '掠夺者出没', desc: '一伙持枪掠夺者在附近活动' },
    { id: 'mutants', name: '变异潮', desc: '变异体出现率大幅提高' },
    { id: 'horde', name: '尸潮提前', desc: '尸潮会提前3分钟到达' },
    { id: 'survivor', name: '求救信号', desc: '对讲机里有人求救，救下他会有报酬' },
    { id: 'quiet', name: '难得的安静', desc: '丧尸数量较少' },
  ];

  // ---------- 商人 ----------
  D.shop = ['cleaver', 'pipe', 'hammer', 'nailgun', 'nail', 'brick', 'firecracker', 'molotov', '9mm', '12g', 'bandage', 'baiyao', 'antibiotic', 'painkiller', 'noodle', 'redbull', 'water', 'helm_delivery', 'body_work', 'bag_school', 'bag_delivery', 'huntshot', 'fuel'];
  D.shopRare = ['revolver', 'pistol92', 'shotgun97', 'machete', 'fireaxe', 'helm_moto', 'body_leather', 'body_stab', 'bag_hiking', 'firstaid', 'bolt', 'slingbow', 'chainsaw', '58x21', 'smg05'];

  D.EVAC_COST = 50000; // 撤离名额

  // ---------- 背景故事 ----------
  D.intro = [
    '2027年6月28日，南宁，暴雨。',
    '江南区一座冷链物流园里，一批来路不明的走私冻品在断电的冷库里化开了。第二天，物流园的分拣工开始高烧、咬人。',
    '疾控把它叫作“急性感染性狂躁综合征”，南宁人管它叫——“邕江热”。',
    '感染者的肌肉和骨骼会疯狂增生：有的变得肿胀如气球，有的肋骨与肌腱撕开皮肤长成触手，有的力气大得能把电动车抡起来砸人。',
    '第三天，绕城高速被封锁，城市被划为隔离区。第七天，信号中断。朝阳广场、民族大道、邕江两岸……繁华的老城区沦陷了。',
    '你叫韦小东，26岁，宾阳人，原本是那座物流园的夜班分拣员。爆发那晚你请假回了出租屋，侥幸活了下来。',
    '现在你和一群幸存者躲在西乡塘的城中村里，用铁皮和电动车堵住了巷口。',
    '邕江北岸的民兵卡口还在运作：用药品、电池、粮食、情报换“撤离积分”，攒够 5 万积分，就能坐上开往外环安置区的撤离车。',
    '你没有超能力，只是个普通打工人。你有的，只是一把从粉店后厨拿的菜刀，和必须活下去的理由。',
    '每天，进城、搜刮、在尸潮到来之前撤出来。',
  ];

  D.diary = [
    '第1天。村口的阿婆给了我一碗老友粉，说我瘦。我想起物流园那批冻品，箱子上印着我看不懂的字。也许我知道的比别人多一点。',
    '第2天。卡口的民兵说，攒够积分就能走。我算了一下，要跑很多趟。朝阳广场那边的商场还没人搜过。',
    '第3天。今天看见一只“投掷者”把一辆共享单车扔过了马路。我躲在车底下，听着它喘气，像拉风箱。',
    '第4天。电台里说人民医院隔离区还有实验血清。去那里的人都没回来。',
    '第5天。村里的老黄开始收茅台了。他说这东西末日也值钱。我笑他，他也笑。',
    '第6天。雨一直下。邕江的水涨到了江北大道的台阶。我梦见我还在分拣线上，传送带上全是人。',
    '第7天。保险员阿秦居然还在卖保险。她说：“人可能回不来，装备总得回来吧。”我竟然买了。',
    '第8天。我开始能分辨它们的脚步声了。行尸拖着脚，奔尸像下雨，巨尸……巨尸的时候地面会抖。',
    '第9天。在百货大楼里看见一张全家福，被血泡烂了。我把它放回了原处。',
    '第10天。村里有人发烧了。我们没说话，把他锁进了二楼。',
    '第11天。我有点想家。宾阳的炮龙节，今年还会有人舞吗？',
    '第12天。卡口的车每天都在开走。总有一辆，会是我的。',
  ];

  D.endings = {
    evac: '你把最后一袋物资交给卡口的民兵。他在本子上划了一笔，递给你一张盖着红章的纸。\n\n撤离车在清晨开过邕江大桥，你回头望——朝阳广场的大屏幕早已熄灭，邕江在晨雾里静静地流。\n\n你活下来了。一个普通的打工人，在一座死去的城市里，活了下来。',
  };

  G.D = D;
})();
