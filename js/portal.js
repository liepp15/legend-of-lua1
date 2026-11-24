// Utilitas UI bersama untuk seluruh halaman portal.
const Portal = {
  $: (sel, root = document) => root.querySelector(sel),
  $$: (sel, root = document) => Array.from(root.querySelectorAll(sel)),

  escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  },

  fmtTime(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  },

  fmtDate(ts) {
    const d = new Date(Number(ts) || Date.now());
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).replace('.', ':');
  },

  levelName(n) { return (typeof Catalog !== 'undefined' ? Catalog.levelName(n) : 'Level ' + n); },
  charName(id) { return (typeof Catalog !== 'undefined' ? Catalog.character(id).name : 'Kesatria'); },
  petName(id) {
    if (!id || typeof Catalog === 'undefined') return '';
    const pet = Catalog.pet(id);
    return pet ? pet.name : '';
  },

  icon(name, size = 18, alt = '') {
    return '<img class="ico" src="assets/icons/' + name + '.svg" width="' + size + '" height="' + size + '" alt="' + this.escape(alt) + '" loading="lazy">';
  },

  spriteIcon(path, size = 24, alt = '') {
    return '<img class="ico pixel" src="' + path + '" width="' + size + '" height="' + size + '" alt="' + this.escape(alt) + '" loading="lazy">';
  },

  init() {
    document.body.classList.add('js-ready');
    this.setAuthNav();
    this.initNavToggle();
    this.initTransitions();
    this.initYears();
    this.initSmoothHash();
  },

  setAuthNav() {
    const session = Auth.current();
    this.$$('[data-auth-links]').forEach(box => {
      if (session) {
        box.innerHTML =
          '<a href="dashboard.html" class="nav-link">Dashboard</a>' +
          '<a href="game.html" class="btn btn-sm btn-gold">Play Game</a>' +
          '<button type="button" class="nav-link linklike" data-logout>Logout</button>';
      } else {
        box.innerHTML =
          '<a href="login.html" class="nav-link">Login</a>' +
          '<a href="register.html" class="btn btn-sm btn-gold">Register</a>';
      }
    });
    this.$$('[data-auth-name]').forEach(el => { el.textContent = session ? session.username : 'Tamu'; });
    this.$$('[data-auth-avatar]').forEach(el => { el.hidden = !session; });
    this.$$('[data-logout]').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        Auth.logout();
        this.toast('Kamu telah keluar. Akun dan progres tetap tersimpan.', 'info');
        setTimeout(() => location.href = 'index.html', 450);
      });
    });
  },

  initNavToggle() {
    const toggle = this.$('.nav-toggle');
    const links = this.$('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.addEventListener('click', e => {
        if (e.target.closest('a')) {
          links.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    const sideToggle = this.$('.side-toggle');
    const side = this.$('.side');
    const backdrop = this.$('.side-backdrop');
    const closeSide = () => {
      if (!side) return;
      side.classList.remove('open');
      if (backdrop) backdrop.classList.remove('show');
      document.body.classList.remove('side-open');
    };
    if (sideToggle && side) {
      sideToggle.addEventListener('click', () => {
        const open = side.classList.toggle('open');
        if (backdrop) backdrop.classList.toggle('show', open);
        document.body.classList.toggle('side-open', open);
        sideToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    if (backdrop) backdrop.addEventListener('click', closeSide);
    addEventListener('keydown', e => { if (e.key === 'Escape') closeSide(); });
    if (side) side.addEventListener('click', e => { if (e.target.closest('a')) closeSide(); });
  },

  initTransitions() {
    requestAnimationFrame(() => document.body.classList.remove('page-enter'));
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      if (a.target || a.hasAttribute('download') || a.dataset.noTransition !== undefined) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
      let url;
      try { url = new URL(a.href, location.href); } catch { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash && url.search === location.search) return;
      if (url.pathname === location.pathname && !url.hash && !url.search) return;
      e.preventDefault();
      document.body.classList.add('page-leaving');
      setTimeout(() => location.href = a.href, 170);
    });
  },

  initYears() {
    this.$$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  },

  initSmoothHash() {
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
    this.$$('a[href^="#"]').forEach(a => {
      if (a.dataset.view !== undefined || a.dataset.noSmooth !== undefined) return;
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', id);
      });
    });
  },

  toast(message, type = 'info', timeout = 3400) {
    let root = this.$('#toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      root.className = 'toast-root';
      root.setAttribute('aria-live', 'polite');
      document.body.appendChild(root);
    }
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    const iconName = type === 'success' ? 'check' : type === 'error' ? 'close' : type === 'gold' ? 'coin' : 'info';
    el.innerHTML = this.icon(iconName, 18) + '<span></span>';
    el.querySelector('span').textContent = message;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 240);
    }, timeout);
  },

  modal({ title = 'Konfirmasi', body = '', actions = [], danger = false, wide = false }) {
    return new Promise(resolve => {
      const root = document.createElement('div');
      root.className = 'modal-root';
      root.innerHTML =
        '<div class="modal-backdrop"></div>' +
        '<div class="modal' + (wide ? ' modal-wide' : '') + (danger ? ' modal-danger' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
          '<div class="modal-head"><h2 id="modal-title">' + this.escape(title) + '</h2><button type="button" class="icon-btn modal-x" aria-label="Tutup">' + this.icon('close', 16) + '</button></div>' +
          '<div class="modal-body">' + body + '</div>' +
          '<div class="modal-actions"></div>' +
        '</div>';
      document.body.appendChild(root);
      const actionsBox = root.querySelector('.modal-actions');
      const close = value => {
        root.classList.add('closing');
        setTimeout(() => { root.remove(); resolve(value); }, 180);
      };
      actions.forEach(action => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn ' + (action.className || 'btn-ghost');
        btn.textContent = action.label;
        btn.addEventListener('click', () => close(action.value));
        actionsBox.appendChild(btn);
      });
      if (!actions.length) {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'btn btn-gold'; btn.textContent = 'Tutup';
        btn.addEventListener('click', () => close(null));
        actionsBox.appendChild(btn);
      }
      root.querySelector('.modal-x').addEventListener('click', () => close(null));
      root.querySelector('.modal-backdrop').addEventListener('click', () => close(null));
      const onKey = e => { if (e.key === 'Escape') { removeEventListener('keydown', onKey); close(null); } };
      addEventListener('keydown', onKey);
      requestAnimationFrame(() => root.classList.add('show'));
      const first = actionsBox.querySelector('button');
      if (first) first.focus();
    });
  },

  confirm(message, title = 'Konfirmasi') {
    return this.modal({
      title,
      body: '<p>' + this.escape(message) + '</p>',
      actions: [
        { label: 'Batal', value: false, className: 'btn-ghost' },
        { label: 'Ya, lanjutkan', value: true, className: 'btn-red' }
      ]
    }).then(v => v === true);
  },

  nextUrl(fallback = 'dashboard.html') {
    const raw = new URLSearchParams(location.search).get('next');
    if (!raw) return fallback;
    let decoded = raw;
    try { decoded = decodeURIComponent(raw); } catch {}
    if (/^[A-Za-z0-9._-]+\.html(\?[^#]*)?$/.test(decoded) && !decoded.startsWith('//')) return decoded;
    return fallback;
  },

  requireUser() {
    const session = Auth.current();
    if (!session) {
      const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      location.replace('login.html?next=' + next);
      return null;
    }
    return session;
  },

  requireGuest() {
    if (Auth.current()) {
      location.replace('dashboard.html');
      return false;
    }
    return true;
  },

  setActiveNav() {
    const file = location.pathname.split('/').pop() || 'index.html';
    this.$$('[data-nav]').forEach(a => {
      if (a.dataset.nav === file) a.classList.add('on');
    });
  },

  progressPct(progress) {
    return Math.round(Math.max(1, Math.min(LEVELS.length, progress || 1)) / LEVELS.length * 100);
  },

  equippedSummary(cos) {
    const parts = [];
    if (cos.hat) parts.push(Catalog.accessory('hat', cos.hat)?.name);
    if (cos.face) parts.push(Catalog.accessory('face', cos.face)?.name);
    if (cos.neck) parts.push(Catalog.accessory('neck', cos.neck)?.name);
    if (cos.pet) parts.push(Catalog.pet(cos.pet)?.name);
    return parts.filter(Boolean);
  }
};
