// Dashboard controller: profil, statistik, karakter, inventory, toko, leaderboard, pengaturan.
(function () {
  const session = Portal.requireUser();
  if (!session) return;
  Portal.init();

  const $ = id => document.getElementById(id);
  const $$ = Portal.$$;
  const VIEW_META = {
    dashboard: { title: 'Dashboard', sub: 'Ringkasan petualangan dan progres akunmu.' },
    character: { title: 'Character', sub: 'Pilih karakter, kosmetik, pet, dan warna.' },
    inventory: { title: 'Inventory', sub: 'Semua perlengkapan dan koleksi yang kamu miliki.' },
    shop: { title: 'Shop', sub: 'Belanja upgrade, ramuan, karakter, kosmetik, dan pet.' },
    leaderboard: { title: 'Leaderboard', sub: 'Peringkat pemain di browser ini.' },
    settings: { title: 'Settings', sub: 'Akun, suara, password, dan data permainan.' }
  };

  let currentView = 'dashboard';
  let cosmeticSlot = 'hat';
  let invFilter = 'all';
  let shopTab = 'character';
  const mounted = {};

  function mountCanvas(id) {
    if (mounted[id]) return;
    const cv = $(id);
    if (!cv) return;
    try { Cos.mount(cv); mounted[id] = true; } catch (err) { console.warn('Preview gagal dimuat', err); }
  }

  function setText(selector, value) {
    $$(selector).forEach(el => { el.textContent = value; });
  }

  function closeSidebar() {
    const side = $('sidebar');
    const backdrop = $('sideBackdrop');
    if (side) side.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
    document.body.classList.remove('side-open');
  }

  function showView(view, push = true) {
    if (!VIEW_META[view]) view = 'dashboard';
    currentView = view;
    $$('.dash-view').forEach(section => section.classList.toggle('active', section.id === 'view-' + view));
    $$('.side .nav-item[data-view]').forEach(link => link.classList.toggle('on', link.dataset.view === view));
    if ($('pageTitle')) $('pageTitle').textContent = VIEW_META[view].title;
    if ($('pageSub')) $('pageSub').textContent = VIEW_META[view].sub;
    if (push && location.hash !== '#' + view) history.pushState(null, '', '#' + view);
    refreshAll();
    closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- header / overview ----------
  function refreshHeader() {
    const d = GameData.load();
    const char = Catalog.character(d.cos.char);
    setText('[data-username]', session.username);
    setText('[data-char-name]', char.name);
    setText('[data-gold]', String(d.wallet));
    setText('[data-side-gold]', String(d.wallet));
    setText('[data-side-char]', char.name);
    setText('[data-level-tag]', 'Level ' + d.progress);
    setText('[data-progress-tag]', d.progress + ' / ' + LEVELS.length + ' wilayah');
    setText('[data-progress-label]', d.progress + ' / ' + LEVELS.length);
    if ($('headGold')) $('headGold').textContent = d.wallet;
    if ($('statHighScore')) $('statHighScore').textContent = d.highScore;
    if ($('statPlays')) $('statPlays').textContent = d.plays;
    if ($('statWins')) $('statWins').textContent = d.wins;
    if ($('statKills')) $('statKills').textContent = d.kills;
    if ($('statBestTime')) $('statBestTime').textContent = d.bestTime ? Portal.fmtTime(d.bestTime) : '—';
    const pct = Portal.progressPct(d.progress);
    $$('[data-progress-bar]').forEach(el => { el.style.width = pct + '%'; });
  }

  function renderOverview() {
    const d = GameData.load();
    const last = Catalog.level(d.lastLevel);
    const banner = $('continueBanner');
    if (banner) {
      banner.style.setProperty('--map', "url('../" + last.map + "')");
      banner.style.setProperty('--map-filter', last.id === 2
        ? 'hue-rotate(-40deg) saturate(1.15) brightness(.68)'
        : 'brightness(.55) saturate(.9)');
    }
    setText('[data-last-level-tag]', 'Level ' + d.lastLevel);
    setText('[data-last-level-name]', last.n);
    setText('[data-last-level-desc]', last.desc);
    const run = d.history[0];
    setText('[data-last-status]', run ? (run.win ? 'Kemenangan terakhir' : 'Petualangan terakhir') : 'Belum dimulai');
    setText('[data-last-time]', run ? Portal.fmtTime(run.time) : '—');
    setText('[data-last-kills]', String(run ? run.kills : 0));
    setText('[data-best-time]', d.bestTime ? Portal.fmtTime(d.bestTime) : '—');
    if ($('continuePlay')) $('continuePlay').href = 'game.html?lv=' + d.lastLevel;

    const chips = $('levelChips');
    if (chips) {
      chips.innerHTML = LEVELS.map(level => {
        const unlocked = level.id <= d.progress;
        const current = level.id === d.lastLevel;
        if (!unlocked) {
          return '<span class="level-chip locked" title="Selesaikan level sebelumnya"><img src="assets/icons/lock.svg" alt=""> L' + level.id + ' ' + Portal.escape(level.short) + '</span>';
        }
        return '<a class="level-chip unlocked' + (current ? ' current' : '') + '" href="game.html?lv=' + level.id + '" title="' + Portal.escape(level.n) + '"><img src="assets/icons/' + (level.boss ? 'skull' : 'map') + '.svg" alt=""> L' + level.id + ' ' + Portal.escape(level.short) + '</a>';
      }).join('');
    }

    const body = $('activityBody');
    const empty = $('activityEmpty');
    const wrap = body ? body.closest('.table-wrap') : null;
    if (body) {
      if (!d.history.length) {
        body.innerHTML = '';
        if (empty) empty.hidden = false;
        if (wrap) wrap.hidden = true;
      } else {
        if (empty) empty.hidden = true;
        if (wrap) wrap.hidden = false;
        body.innerHTML = d.history.map(h => {
          const lv = Catalog.level(h.lv);
          return '<tr>' +
            '<td class="muted nowrap">' + Portal.fmtDate(h.date) + '</td>' +
            '<td><span class="tag">' + Portal.escape(lv.short) + '</span></td>' +
            '<td>' + (h.win ? '<span class="tag green">Menang</span>' : '<span class="tag red">Kalah</span>') + '</td>' +
            '<td class="gold">' + h.score + '</td>' +
            '<td>' + h.kills + '</td>' +
            '<td>' + Portal.fmtTime(h.time) + '</td>' +
            '<td><span class="nowrap"><img src="assets/sprites/items/coinIcon.png" alt="" width="13" height="13"> ' + h.gold + '</span></td>' +
          '</tr>';
        }).join('');
      }
      if ($('activityCount')) $('activityCount').textContent = d.history.length + ' riwayat';
    }

    const equipped = $('equippedList');
    if (equipped) {
      const char = Catalog.character(d.cos.char);
      const tags = ['<span class="tag gold">' + Portal.escape(char.name) + '</span>'];
      for (const slot of ['hat', 'face', 'neck']) {
        if (!d.cos[slot]) continue;
        const item = Catalog.accessory(slot, d.cos[slot]);
        if (item) tags.push('<span class="tag">' + Portal.escape(item.name) + '</span>');
      }
      if (d.cos.pet) {
        const pet = Catalog.pet(d.cos.pet);
        if (pet) tags.push('<span class="tag green">' + Portal.escape(pet.name) + '</span>');
      }
      if (d.cos.hue) tags.push('<span class="tag">Hue ' + Math.round(d.cos.hue) + '°</span>');
      equipped.innerHTML = tags.join('');
    }

    mountCanvas('profileCanvas');
    mountCanvas('charMiniCanvas');
  }

  // ---------- character ----------
  function renderCharacter() {
    const d = GameData.load();
    const char = Catalog.character(d.cos.char);
    if ($('charPreviewName')) $('charPreviewName').textContent = char.name;
    if ($('charPreviewDesc')) $('charPreviewDesc').textContent = char.desc;

    const bonus = char.spd ? '+10% kecepatan' : char.dmg ? '+25% damage' : char.hp ? '+1 hati maksimal' : 'Seimbang';
    const speed = Math.round((1 + (d.owned.boots ? .15 : 0) + (char.spd || 0)) * 100);
    const damage = Math.round((d.owned.sword2 ? 2 : 1) * (1 + (char.dmg || 0)) * 100);
    const hearts = 4 + (d.owned.heart ? 1 : 0) + (char.hp || 0);
    const pet = d.cos.pet ? Catalog.pet(d.cos.pet) : null;
    if ($('sumBonus')) $('sumBonus').textContent = bonus;
    if ($('sumSpeed')) $('sumSpeed').textContent = speed + '%';
    if ($('sumDamage')) $('sumDamage').textContent = damage + '%';
    if ($('sumHearts')) $('sumHearts').textContent = hearts;
    if ($('sumPet')) $('sumPet').textContent = pet ? pet.name : 'Tidak ada';

    const choices = $('charChoices');
    if (choices) {
      choices.innerHTML = CHARS.map(c => {
        const owned = c.id === 5 || d.owned['char_' + c.id];
        const selected = d.cos.char === c.id;
        const state = selected ? 'Dipakai' : owned ? 'Dimiliki' : c.price + ' emas';
        return '<button type="button" class="char-choice ' + (selected ? 'selected ' : '') + (owned ? '' : 'locked') + '" data-pick-char="' + c.id + '" aria-pressed="' + selected + '">' +
          '<span class="mini-sprite"><span class="sprite-wrap" style="--scale:3"><span class="sprite spr-player spr-char' + c.id + '"></span></span></span>' +
          '<span><h4>' + Portal.escape(c.name) + '</h4><p>' + Portal.escape(c.desc) + '</p><span class="state">' + state + '</span></span>' +
        '</button>';
      }).join('');
    }

    $$('#cosmeticTabs button').forEach(btn => btn.classList.toggle('on', btn.dataset.slot === cosmeticSlot));
    const grid = $('cosmeticGrid');
    if (grid) {
      const list = ACC[cosmeticSlot] || [];
      grid.innerHTML = list.map(item => {
        const owned = !!d.owned['acc_' + cosmeticSlot + '_' + item.id];
        const equipped = d.cos[cosmeticSlot] === item.id;
        const color = (d.cos.colors || {})[item.id] || item.col;
        let action;
        if (owned && equipped) action = '<button type="button" class="btn btn-ghost" data-cos-action="unequip" data-cos-slot="' + cosmeticSlot + '" data-cos-id="' + item.id + '">Lepas</button>';
        else if (owned) action = '<button type="button" class="btn btn-gold" data-cos-action="equip" data-cos-slot="' + cosmeticSlot + '" data-cos-id="' + item.id + '">Pakai</button>';
        else action = '<button type="button" class="btn btn-gold" data-cos-action="buy" data-cos-slot="' + cosmeticSlot + '" data-cos-id="' + item.id + '">Beli ' + item.price + '</button>';
        return '<div class="cosmetic-card ' + (equipped ? 'equipped ' : '') + (owned ? '' : 'locked') + '">' +
          '<div class="swatch"><span style="background:' + color + '"></span></div>' +
          '<h4>' + Portal.escape(item.name) + '</h4>' +
          '<p>' + (owned ? (equipped ? 'Sedang dipakai' : 'Dimiliki') : item.price + ' emas') + '</p>' +
          '<div class="actions">' + action + '</div>' +
        '</div>';
      }).join('');
    }

    const pets = $('petGrid');
    if (pets) {
      pets.innerHTML = PETS.map(p => {
        const owned = !!d.owned['pet_' + p.id];
        const equipped = d.cos.pet === p.id;
        let action;
        if (owned && equipped) action = '<button type="button" class="btn btn-ghost" data-pet-action="unequip" data-pet-id="' + p.id + '">Lepas</button>';
        else if (owned) action = '<button type="button" class="btn btn-gold" data-pet-action="equip" data-pet-id="' + p.id + '">Pakai</button>';
        else action = '<button type="button" class="btn btn-gold" data-pet-action="buy" data-pet-id="' + p.id + '">Beli ' + p.price + '</button>';
        return '<div class="pet-card ' + (equipped ? 'equipped ' : '') + '">' +
          '<div class="pet-stage"><span class="sprite-wrap" style="--scale:2"><span class="sprite spr-pet spr-pet-' + p.id + '"></span></span></div>' +
          '<h4>' + Portal.escape(p.name) + '</h4>' +
          '<p>' + (owned ? (equipped ? 'Mengikuti' : 'Dimiliki') : p.price + ' emas') + '</p>' +
          action +
        '</div>';
      }).join('');
    }

    if ($('hueSlider')) $('hueSlider').value = d.cos.hue;
    if ($('hueValue')) $('hueValue').textContent = Math.round(d.cos.hue) + '°';
    if ($('petHueSlider')) $('petHueSlider').value = d.cos.petHue;
    if ($('petHueValue')) $('petHueValue').textContent = Math.round(d.cos.petHue) + '°';

    const target = $('colorTarget');
    if (target) {
      const previous = target.value;
      const options = [];
      for (const slot of ['hat', 'face', 'neck']) {
        if (!d.cos[slot]) continue;
        const item = Catalog.accessory(slot, d.cos[slot]);
        if (item) options.push({ value: slot + ':' + item.id, label: item.name + ' · ' + Catalog.accessorySlotLabel(slot), item });
      }
      target.innerHTML = options.length
        ? options.map(o => '<option value="' + o.value + '">' + Portal.escape(o.label) + '</option>').join('')
        : '<option value="">Belum ada aksesoris</option>';
      if (options.some(o => o.value === previous)) target.value = previous;
      const chosen = options.find(o => o.value === target.value) || options[0];
      if (chosen && $('accColor')) $('accColor').value = (d.cos.colors || {})[chosen.item.id] || chosen.item.col;
      target.disabled = !options.length;
      if ($('accColor')) $('accColor').disabled = !options.length;
    }

    mountCanvas('charCanvas');
  }

  // ---------- inventory ----------
  function inventoryItems(d) {
    const items = [];
    UPGRADES.forEach(u => {
      if (d.owned[u.key]) items.push({ kind: 'upgrade', id: u.key, name: u.name, desc: u.desc, icon: u.icon, tag: 'Permanen', status: 'Aktif' });
    });
    BUFFS.forEach(b => {
      const count = d.stock[b.key] || 0;
      if (count > 0) items.push({ kind: 'buff', id: b.key, name: b.name, desc: b.desc, icon: b.icon, tag: 'Ramuan', status: count + '× siap dipakai', count });
    });
    Catalog.allAccessories().forEach(a => {
      if (!d.owned['acc_' + a.slot + '_' + a.id]) return;
      items.push({
        kind: 'cosmetic', slot: a.slot, id: a.id, name: a.name,
        desc: Catalog.accessorySlotLabel(a.slot), color: (d.cos.colors || {})[a.id] || a.col,
        tag: 'Kosmetik', equipped: d.cos[a.slot] === a.id,
        status: d.cos[a.slot] === a.id ? 'Dipakai' : 'Dimiliki'
      });
    });
    PETS.forEach(p => {
      if (!d.owned['pet_' + p.id]) return;
      items.push({
        kind: 'pet', id: p.id, name: p.name, desc: 'Magnet loot ' + p.magnet,
        tag: 'Pet', pet: p, equipped: d.cos.pet === p.id,
        status: d.cos.pet === p.id ? 'Mengikuti' : 'Dimiliki'
      });
    });
    CHARS.forEach(c => {
      if (c.id !== 5 && !d.owned['char_' + c.id]) return;
      items.push({
        kind: 'character', id: c.id, name: c.name, desc: c.desc,
        tag: 'Karakter', char: c, equipped: d.cos.char === c.id,
        status: d.cos.char === c.id ? 'Dipakai' : 'Dimiliki'
      });
    });
    return items;
  }

  function itemThumb(item) {
    if (item.kind === 'upgrade' || item.kind === 'buff') {
      return '<img src="' + item.icon + '" alt="">';
    }
    if (item.kind === 'cosmetic') {
      return '<span style="display:block;width:26px;height:26px;background:' + item.color + ';border:2px solid #000"></span>';
    }
    if (item.kind === 'pet') {
      return '<span class="sprite-wrap" style="--scale:2"><span class="sprite spr-pet spr-pet-' + item.id + '"></span></span>';
    }
    return '<span class="sprite-wrap" style="--scale:2"><span class="sprite spr-player spr-char' + item.id + '"></span></span>';
  }

  function renderInventory() {
    const d = GameData.load();
    if ($('invGold')) $('invGold').textContent = d.wallet;
    const upgrades = UPGRADES.filter(u => d.owned[u.key]).length;
    const buffs = BUFFS.reduce((n, b) => n + (d.stock[b.key] || 0), 0);
    const cosmetics = Catalog.allAccessories().filter(a => d.owned['acc_' + a.slot + '_' + a.id]).length;
    const pets = PETS.filter(p => d.owned['pet_' + p.id]).length;
    const chars = CHARS.filter(c => c.id === 5 || d.owned['char_' + c.id]).length;
    if ($('invUpgrades')) $('invUpgrades').textContent = upgrades;
    if ($('invBuffs')) $('invBuffs').textContent = buffs;
    if ($('invCosmetics')) $('invCosmetics').textContent = cosmetics;
    if ($('invPets')) $('invPets').textContent = pets + chars;

    $$('#invTabs button').forEach(btn => btn.classList.toggle('on', btn.dataset.inv === invFilter));
    const all = inventoryItems(d);
    const list = invFilter === 'all' ? all : all.filter(item => item.kind === invFilter);
    const grid = $('invGrid');
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = '<div class="inv-empty" style="grid-column:1/-1">Belum ada item di kategori ini. <a href="#shop" data-view="shop">Buka Shop</a> untuk membeli perlengkapan.</div>';
      bindViewLinks(grid);
      return;
    }
    grid.innerHTML = list.map(item => {
      let action = '';
      if (item.kind === 'cosmetic') {
        action = item.equipped
          ? '<button type="button" class="btn btn-ghost" data-inv-action="unequip" data-inv-kind="cosmetic" data-inv-slot="' + item.slot + '" data-inv-id="' + item.id + '">Lepas</button>'
          : '<button type="button" class="btn btn-gold" data-inv-action="equip" data-inv-kind="cosmetic" data-inv-slot="' + item.slot + '" data-inv-id="' + item.id + '">Pakai</button>';
      } else if (item.kind === 'pet') {
        action = item.equipped
          ? '<button type="button" class="btn btn-ghost" data-inv-action="unequip" data-inv-kind="pet" data-inv-id="' + item.id + '">Lepas</button>'
          : '<button type="button" class="btn btn-gold" data-inv-action="equip" data-inv-kind="pet" data-inv-id="' + item.id + '">Pakai</button>';
      } else if (item.kind === 'character') {
        action = item.equipped
          ? '<span class="tag gold">Dipakai</span>'
          : '<button type="button" class="btn btn-gold" data-inv-action="equip" data-inv-kind="character" data-inv-id="' + item.id + '">Pakai</button>';
      } else {
        action = '<span class="tag green">' + (item.kind === 'buff' ? 'Siap dipakai di run berikutnya' : 'Aktif') + '</span>';
      }
      return '<div class="inv-card">' +
        '<div class="inv-thumb">' + itemThumb(item) + '</div>' +
        '<div><h4>' + Portal.escape(item.name) + '</h4><p>' + Portal.escape(item.desc) + '</p>' +
          '<div class="meta"><span class="tag">' + Portal.escape(item.tag) + '</span><span class="tag ' + (item.equipped ? 'gold' : 'green') + '">' + Portal.escape(item.status) + '</span></div>' +
        '</div>' +
        '<div class="actions">' + action + '</div>' +
      '</div>';
    }).join('');
  }

  // ---------- shop ----------
  function shopItems() {
    if (shopTab === 'character') {
      return CHARS.map(c => ({
        kind: 'character', id: c.id, name: c.name, desc: c.desc, price: c.price,
        kindLabel: c.price === 0 ? 'Karakter gratis' : 'Karakter'
      }));
    }
    if (shopTab === 'cosmetic') {
      return Catalog.allAccessories().map(a => ({
        kind: 'cosmetic', slot: a.slot, id: a.id, name: a.name,
        desc: 'Slot ' + Catalog.accessorySlotLabel(a.slot) + ' · warna dapat diubah di Character',
        price: a.price, color: a.col, kindLabel: 'Kosmetik'
      }));
    }
    if (shopTab === 'pet') {
      return PETS.map(p => ({
        kind: 'pet', id: p.id, name: p.name,
        desc: 'Menarik loot dalam radius ' + p.magnet + ' dan mengikuti pemain.',
        price: p.price, kindLabel: 'Pet'
      }));
    }
    if (shopTab === 'upgrade') {
      return UPGRADES.map(u => ({
        kind: 'upgrade', id: u.key, name: u.name, desc: u.desc,
        price: u.price, icon: u.icon, kindLabel: 'Upgrade permanen'
      }));
    }
    return BUFFS.map(b => ({
      kind: 'buff', id: b.key, name: b.name, desc: b.desc,
      price: b.price, icon: b.icon, kindLabel: 'Ramuan sekali pakai'
    }));
  }

  function shopThumb(item) {
    if (item.kind === 'character') {
      return '<span class="sprite-wrap" style="--scale:2"><span class="sprite spr-player spr-char' + item.id + '"></span></span>';
    }
    if (item.kind === 'cosmetic') {
      return '<span style="display:block;width:26px;height:26px;background:' + item.color + ';border:2px solid #000"></span>';
    }
    if (item.kind === 'pet') {
      return '<span class="sprite-wrap" style="--scale:2"><span class="sprite spr-pet spr-pet-' + item.id + '"></span></span>';
    }
    return '<img src="' + item.icon + '" alt="">';
  }

  function renderShop() {
    const d = GameData.load();
    if ($('shopGold')) $('shopGold').textContent = d.wallet;
    $$('#shopTabs button').forEach(btn => btn.classList.toggle('on', btn.dataset.shop === shopTab));
    const grid = $('shopGrid');
    if (!grid) return;
    grid.innerHTML = shopItems().map(item => {
      let owned = false;
      let equipped = false;
      let action = '';
      if (item.kind === 'character') {
        owned = item.id === 5 || !!d.owned['char_' + item.id];
        equipped = d.cos.char === item.id;
      } else if (item.kind === 'cosmetic') {
        owned = !!d.owned['acc_' + item.slot + '_' + item.id];
        equipped = d.cos[item.slot] === item.id;
      } else if (item.kind === 'pet') {
        owned = !!d.owned['pet_' + item.id];
        equipped = d.cos.pet === item.id;
      } else if (item.kind === 'upgrade') {
        owned = !!d.owned[item.id];
      }
      const stock = item.kind === 'buff' ? (d.stock[item.id] || 0) : 0;

      if (item.kind === 'buff') {
        action = '<button type="button" class="btn btn-gold" data-shop-action="buy" data-shop-kind="buff" data-shop-id="' + item.id + '">Beli</button>';
      } else if (owned) {
        if (item.kind === 'upgrade') action = '<span class="tag green">Aktif</span>';
        else if (equipped) action = '<span class="tag gold">Dipakai</span>';
        else action = '<button type="button" class="btn btn-gold" data-shop-action="equip" data-shop-kind="' + item.kind + '" data-shop-id="' + item.id + '" data-shop-slot="' + (item.slot || '') + '">Pakai</button>';
      } else {
        action = '<button type="button" class="btn btn-gold" data-shop-action="buy" data-shop-kind="' + item.kind + '" data-shop-id="' + item.id + '" data-shop-slot="' + (item.slot || '') + '">Beli</button>';
      }

      return '<article class="shop-card ' + (owned ? 'owned' : '') + '">' +
        (stock ? '<span class="stock-badge">×' + stock + '</span>' : '') +
        '<div class="shop-top"><div class="shop-thumb">' + shopThumb(item) + '</div><div><h3>' + Portal.escape(item.name) + '</h3><span class="kind">' + Portal.escape(item.kindLabel) + '</span></div></div>' +
        '<p>' + Portal.escape(item.desc) + '</p>' +
        '<div class="shop-foot">' +
          (item.price === 0 ? '<span class="tag green">Gratis</span>' : '<span class="shop-price"><img src="assets/sprites/items/coinIcon.png" alt=""> ' + item.price + '</span>') +
          action +
        '</div>' +
      '</article>';
    }).join('');
  }

  // ---------- leaderboard ----------
  function renderLeaderboard() {
    const users = Auth.users();
    const rows = users.map(u => {
      const d = GameData.forUser(u.username);
      return {
        username: u.username,
        highScore: d.highScore,
        wins: d.wins,
        kills: d.kills,
        plays: d.plays
      };
    }).sort((a, b) => b.highScore - a.highScore || b.wins - a.wins || b.kills - a.kills || a.username.localeCompare(b.username));

    const body = $('lbBody');
    const empty = $('lbEmpty');
    const table = body ? body.closest('.table-wrap') : null;
    const podium = $('podium');
    if (!rows.length) {
      if (body) body.innerHTML = '';
      if (table) table.hidden = true;
      if (empty) empty.classList.remove('hidden');
      if (podium) podium.innerHTML = '';
      return;
    }
    if (table) table.hidden = false;
    if (empty) empty.classList.add('hidden');

    if (podium) {
      const top = rows.slice(0, 3);
      const order = [2, 1, 3];
      podium.innerHTML = top.map((r, i) => {
        const rank = i + 1;
        return '<div class="podium-card ' + (rank === 1 ? 'first' : '') + '" style="order:' + order[i] + '">' +
          '<div class="rank-badge">' + rank + '</div>' +
          '<div class="p-name">' + Portal.escape(r.username) + (r.username === session.username ? ' (kamu)' : '') + '</div>' +
          '<div class="p-score">' + r.highScore + '</div>' +
          '<div class="p-meta">' + r.wins + ' menang · ' + r.kills + ' musuh</div>' +
        '</div>';
      }).join('');
    }

    if (body) {
      body.innerHTML = rows.map((r, i) => '<tr class="' + (r.username === session.username ? 'me' : '') + '">' +
        '<td><span class="rank-num">' + (i + 1) + '</span></td>' +
        '<td>' + Portal.escape(r.username) + (r.username === session.username ? ' <span class="tag gold">kamu</span>' : '') + '</td>' +
        '<td class="gold">' + r.highScore + '</td>' +
        '<td>' + r.wins + '</td>' +
        '<td>' + r.kills + '</td>' +
        '<td>' + r.plays + '</td>' +
      '</tr>').join('');
    }
  }

  // ---------- settings ----------
  function renderSettings() {
    const d = GameData.load();
    const account = Auth.find(session.username);
    const char = Catalog.character(d.cos.char);
    if ($('setUsername')) $('setUsername').textContent = session.username;
    if ($('setCreated')) $('setCreated').textContent = account && account.createdAt ? Portal.fmtDate(account.createdAt) : '—';
    if ($('setChar')) $('setChar').textContent = char.name;
    if ($('soundToggle')) $('soundToggle').checked = d.sound !== false;
  }

  function refreshAll() {
    mountCanvas('profileCanvas');
    mountCanvas('charMiniCanvas');
    mountCanvas('charCanvas');
    refreshHeader();
    renderOverview();
    renderCharacter();
    renderInventory();
    renderShop();
    renderLeaderboard();
    renderSettings();
    bindViewLinks(document);
  }

  // ---------- event handlers ----------
  function bindViewLinks(root) {
    Portal.$$('[data-view]', root).forEach(el => {
      if (el.dataset.boundView) return;
      el.dataset.boundView = '1';
      el.addEventListener('click', e => {
        e.preventDefault();
        showView(el.dataset.view);
      });
    });
  }

  function afterChange(message, type = 'success') {
    if (message) Portal.toast(message, type);
    refreshAll();
  }

  document.addEventListener('click', e => {
    const pick = e.target.closest('[data-pick-char]');
    if (pick) {
      const id = Number(pick.dataset.pickChar);
      const d = GameData.load();
      if (id !== 5 && !d.owned['char_' + id]) {
        shopTab = 'character';
        showView('shop');
        Portal.toast('Karakter ini belum dimiliki. Beli dulu di Shop.', 'gold');
        return;
      }
      const result = GameData.equipCharacter(id);
      afterChange(result.message, result.ok ? 'success' : 'error');
      return;
    }

    const cos = e.target.closest('[data-cos-action]');
    if (cos) {
      const slot = cos.dataset.cosSlot;
      const id = cos.dataset.cosId;
      const action = cos.dataset.cosAction;
      let result;
      if (action === 'buy') result = GameData.buyAccessory(slot, id);
      else if (action === 'equip') result = GameData.equipAccessory(slot, id);
      else result = GameData.equipAccessory(slot, null);
      afterChange(result.message, result.ok ? 'success' : 'error');
      return;
    }

    const pet = e.target.closest('[data-pet-action]');
    if (pet) {
      const id = pet.dataset.petId;
      const action = pet.dataset.petAction;
      let result;
      if (action === 'buy') result = GameData.buyPet(id);
      else if (action === 'equip') result = GameData.equipPet(id);
      else result = GameData.equipPet(null);
      afterChange(result.message, result.ok ? 'success' : 'error');
      return;
    }

    const inv = e.target.closest('[data-inv-action]');
    if (inv) {
      const kind = inv.dataset.invKind;
      const id = inv.dataset.invId;
      const slot = inv.dataset.invSlot;
      let result;
      if (kind === 'cosmetic') result = inv.dataset.invAction === 'equip' ? GameData.equipAccessory(slot, id) : GameData.equipAccessory(slot, null);
      else if (kind === 'pet') result = inv.dataset.invAction === 'equip' ? GameData.equipPet(id) : GameData.equipPet(null);
      else if (kind === 'character') result = GameData.equipCharacter(Number(id));
      if (result) afterChange(result.message, result.ok ? 'success' : 'error');
      return;
    }

    const shop = e.target.closest('[data-shop-action]');
    if (shop) {
      const kind = shop.dataset.shopKind;
      const id = shop.dataset.shopId;
      const slot = shop.dataset.shopSlot;
      let result;
      if (shop.dataset.shopAction === 'equip') {
        if (kind === 'character') result = GameData.equipCharacter(Number(id));
        else if (kind === 'cosmetic') result = GameData.equipAccessory(slot, id);
        else if (kind === 'pet') result = GameData.equipPet(id);
      } else {
        if (kind === 'character') result = GameData.buyCharacter(Number(id));
        else if (kind === 'cosmetic') result = GameData.buyAccessory(slot, id);
        else if (kind === 'pet') result = GameData.buyPet(id);
        else if (kind === 'upgrade') result = GameData.buyUpgrade(id);
        else if (kind === 'buff') result = GameData.buyBuff(id);
      }
      if (result) afterChange(result.message, result.ok ? 'success' : 'error');
    }
  });

  $$('#cosmeticTabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      cosmeticSlot = btn.dataset.slot;
      renderCharacter();
    });
  });

  $$('#invTabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      invFilter = btn.dataset.inv;
      renderInventory();
    });
  });

  $$('#shopTabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      shopTab = btn.dataset.shop;
      renderShop();
    });
  });

  let hueRaf = null;
  if ($('hueSlider')) {
    $('hueSlider').addEventListener('input', () => {
      const value = Number($('hueSlider').value);
      if ($('hueValue')) $('hueValue').textContent = value + '°';
      if (hueRaf) return;
      hueRaf = requestAnimationFrame(() => { GameData.setHue(value); hueRaf = null; });
    });
  }
  if ($('petHueSlider')) {
    $('petHueSlider').addEventListener('input', () => {
      const value = Number($('petHueSlider').value);
      if ($('petHueValue')) $('petHueValue').textContent = value + '°';
      if (hueRaf) return;
      hueRaf = requestAnimationFrame(() => { GameData.setPetHue(value); hueRaf = null; });
    });
  }

  if ($('colorTarget')) {
    $('colorTarget').addEventListener('change', () => {
      const d = GameData.load();
      const [slot, id] = $('colorTarget').value.split(':');
      if (!slot || !id) return;
      const item = Catalog.accessory(slot, id);
      if (item && $('accColor')) $('accColor').value = (d.cos.colors || {})[id] || item.col;
    });
  }
  if ($('accColor')) {
    $('accColor').addEventListener('change', () => {
      const value = $('colorTarget') ? $('colorTarget').value : '';
      const [slot, id] = value.split(':');
      if (!slot || !id) return;
      GameData.setColor(id, $('accColor').value);
      Portal.toast('Warna aksesoris diperbarui.', 'success');
      refreshAll();
    });
  }

  if ($('soundToggle')) {
    $('soundToggle').addEventListener('change', () => {
      GameData.patch(d => { d.sound = $('soundToggle').checked; });
      Portal.toast($('soundToggle').checked ? 'Suara game diaktifkan.' : 'Suara game dimatikan.', 'info');
    });
  }

  function doLogout() {
    Auth.logout();
    location.href = 'login.html?loggedout=1';
  }
  if ($('logoutBtn')) $('logoutBtn').addEventListener('click', doLogout);
  if ($('logoutBtn2')) $('logoutBtn2').addEventListener('click', doLogout);

  if ($('passwordForm')) {
    $('passwordForm').addEventListener('submit', async e => {
      e.preventDefault();
      const current = $('currentPassword').value;
      const next = $('newPassword').value;
      const confirm = $('confirmPassword').value;
      const box = $('passwordAlert');
      box.innerHTML = '';
      if (!current || !next || !confirm) {
        box.innerHTML = '<div class="alert error">Semua kolom password wajib diisi.</div>';
        return;
      }
      if (next !== confirm) {
        box.innerHTML = '<div class="alert error">Konfirmasi password baru tidak sama.</div>';
        return;
      }
      const btn = $('passwordBtn');
      btn.disabled = true;
      btn.textContent = 'Menyimpan…';
      try {
        const result = await Auth.changePassword(current, next);
        box.innerHTML = '<div class="alert ' + (result.ok ? 'success' : 'error') + '">' + Portal.escape(result.message) + '</div>';
        if (result.ok) $('passwordForm').reset();
      } catch {
        box.innerHTML = '<div class="alert error">Gagal mengubah password. Coba lagi.</div>';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Simpan password';
      }
    });
  }

  if ($('resetData')) {
    $('resetData').addEventListener('click', async () => {
      const ok = await Portal.confirm('Reset SEMUA data permainan? Skor, emas, inventory, kosmetik, pet, dan progres akan dihapus. Akun tetap bisa login.', 'Reset data permainan');
      if (!ok) return;
      GameData.resetAll();
      Portal.toast('Data permainan direset. Akun dan sesi tetap aman.', 'info');
      showView('dashboard');
    });
  }

  addEventListener('popstate', () => {
    showView((location.hash || '#dashboard').slice(1), false);
  });

  // initial route
  bindViewLinks(document);
  const initial = (location.hash || '#dashboard').slice(1);
  showView(VIEW_META[initial] ? initial : 'dashboard', false);
})();
