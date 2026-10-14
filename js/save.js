// ===== 存档 =====
(function () {
  const KEY = 'yongcheng_save_v1';
  const S = {};
  S.newItem = (id, n = 1) => {
    const d = G.D.items[id];
    const it = { id, n };
    if (d.type === 'gun') it.mag = d.mag;
    if (d.type === 'armor') it.dur = d.dur;
    if (d.chainsaw) it.fuel = d.fuelMax;
    return it;
  };
  S.fresh = (hardcore = false) => ({
    v: 1, day: 1, money: 300, hardcore,
    stash: [S.newItem('noodle', 3), S.newItem('bandage', 2), S.newItem('brick', 3), S.newItem('water', 2), S.newItem('nail', 30)],
    loadout: { primary: null, secondary: S.newItem('nailgun'), melee: S.newItem('cleaver'), helmet: S.newItem('helm_delivery'), body: S.newItem('body_work'), bag: S.newItem('bag_school') },
    pack: [S.newItem('nail', 60), S.newItem('bandage', 2), S.newItem('noodle', 1)],
    skills: {}, skillPts: 1, xpBank: 0, level: 1,
    stats: { raids: 0, extracts: 0, deaths: 0, kills: 0, best: 0 },
    insured: [], claims: [], diary: 0, evac: false, introSeen: false,
    shop: null,
  });
  S.load = () => {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) {}
    return null;
  };
  S.save = (st) => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  S.wipe = () => localStorage.removeItem(KEY);
  S.sk = (st, id) => (st.skills[id] || 0);
  G.S = S;
})();
