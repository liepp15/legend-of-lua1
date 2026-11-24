// Data permainan per pengguna (Local Storage): skor, riwayat, emas, upgrade, buff, kosmetik, progres level.
// Bentuk data dipertahankan agar engine game (js/engine.js) tetap membaca kunci yang sama.
const GameData = {
  _cache: null,
  _user: null,

  empty() {
    return {
      highScore: 0,
      plays: 0,
      wins: 0,
      kills: 0,
      bestTime: null,
      history: [],
      wallet: 0,
      owned: {},
      stock: {},
      own: {},
      progress: 1,
      sound: true,
      lastLevel: 1,
      cos: { char: 5, hue: 0, hat: null, face: null, neck: null, pet: null, petHue: 0, colors: {} }
    };
  },

  _num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  },

  _int(v, fallback = 0) {
    return Math.max(0, Math.floor(this._num(v, fallback)));
  },

  normalize(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const d = this.empty();

    d.highScore = this._int(raw.highScore);
    d.plays = this._int(raw.plays);
    d.wins = this._int(raw.wins);
    d.kills = this._int(raw.kills);
    d.bestTime = raw.bestTime === null || raw.bestTime === undefined ? null : Math.max(1, Math.round(this._num(raw.bestTime)));
    d.wallet = this._int(raw.wallet);
    d.progress = Math.max(1, Math.min(LEVELS.length, this._int(raw.progress, 1) || 1));
    d.lastLevel = Math.max(1, Math.min(d.progress, this._int(raw.lastLevel, 1) || 1));
    d.sound = raw.sound !== false;

    d.history = Array.isArray(raw.history) ? raw.history.slice(0, 10).map(h => ({
      date: this._num(h && h.date, Date.now()),
      score: this._int(h && h.score),
      kills: this._int(h && h.kills),
      time: this._int(h && h.time),
      win: !!(h && h.win),
      lv: Math.max(1, Math.min(LEVELS.length, this._int(h && h.lv, 1) || 1)),
      gold: this._int(h && h.gold)
    })) : [];

    d.owned = {};
    if (raw.owned && typeof raw.owned === 'object') {
      for (const [k, v] of Object.entries(raw.owned)) if (v) d.owned[k] = true;
    }
    d.own = raw.own && typeof raw.own === 'object' ? { ...raw.own } : {};
    d.stock = {};
    for (const key of ['dmg', 'shield', 'regen']) {
      d.stock[key] = this._int(raw.stock && raw.stock[key]);
    }

    const rc = raw.cos && typeof raw.cos === 'object' ? raw.cos : {};
    d.cos = {
      char: this._int(rc.char, 5) || 5,
      hue: Math.max(0, Math.min(360, this._num(rc.hue, 0))),
      hat: rc.hat || null,
      face: rc.face || null,
      neck: rc.neck || null,
      pet: rc.pet || null,
      petHue: Math.max(0, Math.min(360, this._num(rc.petHue, 0))),
      colors: {}
    };
    if (![5, 6, 7, 8].includes(d.cos.char)) d.cos.char = 5;
    // Data lama yang sudah memilih karakter/aksesoris tetap dipertahankan.
    if (d.cos.char !== 5) d.owned['char_' + d.cos.char] = true;

    for (const slot of ['hat', 'face', 'neck']) {
      const id = d.cos[slot];
      if (id && Catalog.accessory(slot, id)) d.owned['acc_' + slot + '_' + id] = true;
      else d.cos[slot] = null;
    }
    if (d.cos.pet && !Catalog.pet(d.cos.pet)) d.cos.pet = null;
    else if (d.cos.pet) d.owned['pet_' + d.cos.pet] = true;

    if (rc.colors && typeof rc.colors === 'object') {
      for (const [k, v] of Object.entries(rc.colors)) {
        if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) d.cos.colors[k] = v;
      }
    }
    return d;
  },

  load() {
    const session = Auth.current();
    if (!session) return this.empty();
    if (this._user !== session.username) {
      this._user = session.username;
      this._cache = this.normalize(Store.get(KEYS.data(session.username), {}));
    }
    return this._cache;
  },

  forUser(username) {
    return this.normalize(Store.get(KEYS.data(username), {}));
  },

  save() {
    const session = Auth.current();
    if (!session) return false;
    const data = this.load();
    return Store.set(KEYS.data(session.username), data);
  },

  patch(fn) {
    fn(this.load());
    this.save();
  },

  clearCache() { this._cache = null; this._user = null; },

  addGold(n) {
    const amount = Math.floor(Number(n) || 0);
    if (!amount) return;
    this.patch(d => { d.wallet = Math.max(0, d.wallet + amount); });
  },

  spendGold(n) {
    const amount = Math.floor(Number(n) || 0);
    const d = this.load();
    if (amount < 0 || d.wallet < amount) return false;
    d.wallet -= amount;
    this.save();
    return true;
  },

  unlock(level) {
    this.patch(d => { d.progress = Math.min(LEVELS.length, Math.max(d.progress, level)); });
  },

  useStock(k) {
    this.patch(d => { d.stock[k] = Math.max(0, (d.stock[k] || 0) - 1); });
  },

  _result(ok, message, extra = {}) { return { ok, message, ...extra }; },

  buyUpgrade(key) {
    const item = Catalog.upgrade(key);
    if (!item) return this._result(false, 'Upgrade tidak ditemukan.');
    const d = this.load();
    if (d.owned[key]) return this._result(false, 'Upgrade ini sudah dimiliki.');
    if (d.wallet < item.price) return this._result(false, 'Emas belum cukup untuk membeli ' + item.name + '.');
    d.wallet -= item.price;
    d.owned[key] = true;
    this.save();
    return this._result(true, item.name + ' berhasil dibeli dan langsung aktif.');
  },

  buyBuff(key) {
    const item = Catalog.buff(key);
    if (!item) return this._result(false, 'Ramuan tidak ditemukan.');
    const d = this.load();
    if (d.wallet < item.price) return this._result(false, 'Emas belum cukup untuk membeli ' + item.name + '.');
    d.wallet -= item.price;
    d.stock[key] = (d.stock[key] || 0) + 1;
    this.save();
    return this._result(true, item.name + ' ditambahkan ke persediaan.');
  },

  buyCharacter(id) {
    const char = Catalog.character(id);
    const d = this.load();
    const ownKey = 'char_' + char.id;
    if (char.id === 5 || d.owned[ownKey]) {
      d.cos.char = char.id;
      this.save();
      return this._result(true, char.name + ' dipakai.');
    }
    if (d.wallet < char.price) return this._result(false, 'Emas belum cukup untuk membeli ' + char.name + '.');
    d.wallet -= char.price;
    d.owned[ownKey] = true;
    d.cos.char = char.id;
    this.save();
    return this._result(true, char.name + ' berhasil dibeli dan dipakai.');
  },

  buyAccessory(slot, id) {
    const item = Catalog.accessory(slot, id);
    if (!item) return this._result(false, 'Kosmetik tidak ditemukan.');
    const d = this.load();
    const ownKey = 'acc_' + slot + '_' + id;
    if (d.owned[ownKey]) {
      d.cos[slot] = id;
      this.save();
      return this._result(true, item.name + ' dipakai.');
    }
    if (d.wallet < item.price) return this._result(false, 'Emas belum cukup untuk membeli ' + item.name + '.');
    d.wallet -= item.price;
    d.owned[ownKey] = true;
    d.cos[slot] = id;
    this.save();
    return this._result(true, item.name + ' berhasil dibeli dan dipakai.');
  },

  buyPet(id) {
    const pet = Catalog.pet(id);
    if (!pet) return this._result(false, 'Pet tidak ditemukan.');
    const d = this.load();
    const ownKey = 'pet_' + id;
    if (d.owned[ownKey]) {
      d.cos.pet = id;
      this.save();
      return this._result(true, pet.name + ' dipakai.');
    }
    if (d.wallet < pet.price) return this._result(false, 'Emas belum cukup untuk membeli ' + pet.name + '.');
    d.wallet -= pet.price;
    d.owned[ownKey] = true;
    d.cos.pet = id;
    this.save();
    return this._result(true, pet.name + ' berhasil dibeli dan dipakai.');
  },

  equipCharacter(id) {
    const char = Catalog.character(id);
    const d = this.load();
    if (char.id !== 5 && !d.owned['char_' + char.id]) return this._result(false, 'Karakter belum dimiliki.');
    d.cos.char = char.id;
    this.save();
    return this._result(true, char.name + ' sekarang dipakai.');
  },

  equipAccessory(slot, id) {
    const d = this.load();
    if (!id) { d.cos[slot] = null; this.save(); return this._result(true, 'Kosmetik dilepas.'); }
    const item = Catalog.accessory(slot, id);
    if (!item) return this._result(false, 'Kosmetik tidak ditemukan.');
    if (!d.owned['acc_' + slot + '_' + id]) return this._result(false, 'Kosmetik belum dimiliki.');
    d.cos[slot] = id;
    this.save();
    return this._result(true, item.name + ' dipakai.');
  },

  equipPet(id) {
    const d = this.load();
    if (!id) { d.cos.pet = null; this.save(); return this._result(true, 'Pet dilepas.'); }
    const pet = Catalog.pet(id);
    if (!pet) return this._result(false, 'Pet tidak ditemukan.');
    if (!d.owned['pet_' + id]) return this._result(false, 'Pet belum dimiliki.');
    d.cos.pet = id;
    this.save();
    return this._result(true, pet.name + ' mengikutimu.');
  },

  setHue(value) {
    this.patch(d => { d.cos.hue = Math.max(0, Math.min(360, Number(value) || 0)); });
  },

  setPetHue(value) {
    this.patch(d => { d.cos.petHue = Math.max(0, Math.min(360, Number(value) || 0)); });
  },

  setColor(accessoryId, color) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    this.patch(d => { d.cos.colors[accessoryId] = color; });
  },

  toggleSound() {
    let value = true;
    this.patch(d => { d.sound = !d.sound; value = d.sound; });
    return value;
  },

  resetAll() {
    this._cache = this.empty();
    this._user = Auth.current() ? Auth.current().username : null;
    this.save();
  },

  saveRun({ score, kills, time, win, lv, gold }) {
    const session = Auth.current();
    if (!session) return;
    const d = this.load();
    d.plays++;
    d.kills += Math.max(0, Math.floor(kills || 0));
    d.highScore = Math.max(d.highScore, Math.floor(score || 0));
    if (win) {
      d.wins++;
      const t = Math.max(1, Math.round(time || 1));
      d.bestTime = d.bestTime === null ? t : Math.min(d.bestTime, t);
    }
    d.lastLevel = Math.max(1, Math.min(LEVELS.length, Math.floor(lv || 1)));
    d.history.unshift({
      date: Date.now(),
      score: Math.floor(score || 0),
      kills: Math.max(0, Math.floor(kills || 0)),
      time: Math.max(0, Math.round(time || 0)),
      win: !!win,
      lv: d.lastLevel,
      gold: Math.max(0, Math.floor(gold || 0))
    });
    d.history = d.history.slice(0, 10);
    this.save();
  }
};
