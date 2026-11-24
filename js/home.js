// Home page: navigasi akun, showcase karakter, dan detail dunia dari data game.
(function () {
  Portal.init();

  const session = Auth.current();
  const playTarget = session ? 'dashboard.html' : 'login.html';
  const createTarget = session ? 'dashboard.html#character' : 'register.html';

  ['heroPlay', 'ctaPlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = playTarget;
  });
  ['heroCreate', 'ctaCreate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.href = createTarget;
      if (session) el.textContent = 'Open Dashboard';
    }
  });

  // Tampilkan emas & rekor nyata bila sudah login.
  if (session) {
    const raw = Store.get(KEYS.data(session.username), {}) || {};
    const gold = Number(raw.wallet) || 0;
    const record = Number(raw.highScore) || 0;
    const bottom = document.querySelector('.world-bottom');
    if (bottom) {
      bottom.innerHTML =
        '<span>HP <span class="hearts">' +
          '<img src="assets/sprites/ui/heart.png" alt=""><img src="assets/sprites/ui/heart.png" alt="">' +
          '<img src="assets/sprites/ui/heart.png" alt=""><img src="assets/sprites/ui/heart.png" alt="">' +
        '</span></span>' +
        '<span>Emas <b>' + gold + '</b></span>' +
        '<span>Rekor <b>' + record + '</b></span>';
    }
    const note = document.querySelector('.hero-note');
    if (note) note.innerHTML = '<img src="assets/icons/user.svg" alt=""> Selamat datang kembali, <b class="gold">' + Portal.escape(session.username) + '</b>.';
  }

  // Showcase karakter dari katalog asli game.
  const grid = document.getElementById('charGrid');
  if (grid) {
    const target = session ? 'dashboard.html#character' : 'register.html';
    grid.innerHTML = CHARS.map(c => {
      const price = c.price === 0
        ? '<span class="tag green">Gratis</span>'
        : '<span class="char-price"><img src="assets/sprites/items/coinIcon.png" alt=""> ' + c.price + ' emas</span>';
      const bonus = c.spd ? '+10% kecepatan' : c.dmg ? '+25% damage' : c.hp ? '+1 hati maksimal' : 'Seimbang';
      return (
        '<article class="char-card reveal">' +
          '<div class="char-stage">' +
            '<div class="char-shadow"></div>' +
            '<span class="sprite-wrap" style="--scale:5"><span class="sprite spr-player spr-char' + c.id + ' anim-idle"></span></span>' +
          '</div>' +
          '<div class="char-body">' +
            '<h3>' + Portal.escape(c.name) + '</h3>' +
            '<p>' + Portal.escape(c.desc) + '</p>' +
            '<div class="char-foot">' + price + '<a class="btn btn-sm ' + (session ? 'btn-ghost' : 'btn-gold') + '" href="' + target + '">' + (session ? 'Atur' : 'Pilih') + '</a></div>' +
            '<div style="margin-top:8px"><span class="tag">' + Portal.escape(bonus) + '</span></div>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  // Animasi masuk ringan saat elemen terlihat.
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const items = Portal.$$('.feature-card, .how-card, .level-row, .about-stat');
    items.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = 'opacity .5s ease, transform .5s ease';
      el.style.transitionDelay = Math.min(i * 35, 240) + 'ms';
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.style.opacity = '';
        entry.target.style.transform = '';
        io.unobserve(entry.target);
      });
    }, { threshold: .12 });
    items.forEach(el => io.observe(el));
  }
})();
