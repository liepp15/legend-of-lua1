// Halaman Game: bar portal di atas canvas (pemain, level, emas, rekor, tombol).
// File ini hanya mengatur UI portal; seluruh gameplay tetap ditangani js/engine.js.
if (Auth.requireLogin()) {
  const $ = id => document.getElementById(id);
  const session = Auth.current();

  // ---------- identitas pemain ----------
  const nameEl = $('playerName');
  const charEl = $('charName');
  if (nameEl && session) nameEl.textContent = session.displayName || session.username;

  function currentCharName() {
    try {
      const id = (typeof D !== 'undefined' && D && D.outfit) || GameData.load().cos.char;
      return Catalog.character(id).name;
    } catch {
      return 'Kesatria';
    }
  }
  if (charEl) charEl.textContent = currentCharName();

  // ---------- toast kecil di dalam halaman game ----------
  let toastTimer = 0;
  function toast(message) {
    const el = $('gameToast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
  }

  // ---------- tombol restart ----------
  const restartBtn = $('restartBtn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      if (window.restartGame) {
        window.restartGame();
        toast('Level dimulai ulang.');
      } else {
        toast('Dunia masih dimuat…');
      }
    });
  }

  // ---------- suara ----------
  const soundBtn = $('soundBtn');
  const soundIcon = $('soundIcon');
  function paintSound(on) {
    if (!soundBtn || !soundIcon) return;
    soundIcon.src = on ? 'assets/icons/sound-on.svg' : 'assets/icons/sound-off.svg';
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.title = on ? 'Matikan suara' : 'Nyalakan suara';
  }
  paintSound(GameData.load().sound !== false);
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      if (typeof initAudio === 'function') initAudio();
      const on = GameData.toggleSound();
      paintSound(on);
      toast(on ? 'Suara dinyalakan.' : 'Suara dimatikan.');
    });
  }

  // ---------- layar penuh ----------
  const fullBtn = $('fullBtn');
  if (fullBtn) {
    fullBtn.addEventListener('click', () => {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => toast('Layar penuh tidak didukung browser ini.'));
      } catch {
        toast('Layar penuh tidak didukung browser ini.');
      }
    });
  }

  // ---------- keluar dengan konfirmasi bila run belum tersimpan ----------
  function guardLeave(e) {
    let running = false;
    try {
      running = typeof RUN !== 'undefined' && RUN && !RUN.saved && RUN.time > 2 &&
        typeof G !== 'undefined' && G && G.st === 1 && !G.won && !G.dead;
    } catch { running = false; }
    if (!running) return;
    if (!confirm('Keluar ke dashboard? Progres petualangan yang sedang berjalan tidak disimpan.')) {
      e.preventDefault();
    }
  }
  document.querySelectorAll('[data-back]').forEach(a => a.addEventListener('click', guardLeave));

  // ---------- status langsung dari engine ----------
  function paintStats() {
    let data;
    try { data = GameData.load(); } catch { return; }
    const gold = $('gold');
    const rec = $('rec');
    const lv = $('lvName');
    if (gold) gold.textContent = data.wallet;
    if (rec) rec.textContent = data.highScore;
    if (charEl) charEl.textContent = currentCharName();
    if (lv) {
      let label = '';
      try { label = LV[RUN.lv].n; } catch {}
      if (!label) label = Catalog.levelName(data.progress);
      lv.textContent = label;
    }
  }
  paintStats();
  setInterval(paintStats, 500);
  addEventListener('focus', paintStats);
}
