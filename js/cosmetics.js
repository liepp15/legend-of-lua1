// Katalog karakter, aksesoris, dan pet + fungsi menggambarnya (dipakai game & halaman Katalog).
const CHARS = [
  { id: 5, name: 'Kesatria', desc: 'Seimbang (gratis)', price: 0 },
  { id: 6, name: 'Rubah',    desc: '+10% kecepatan', spd: .1, price: 80 },
  { id: 7, name: 'Ninja',    desc: '+25% damage', dmg: .25, price: 80 },
  { id: 8, name: 'Robo',     desc: '+1 hati maksimal', hp: 1, price: 80 }
];
// art: c = warna pilihan, d = versi gelap, w = putih, k = hitam, . = kosong. fx/fy = koordinat di frame sprite 19x21.
const ACC = {
  hat: [
    { id: 'wizard', name: 'Topi Penyihir', price: 40, col: '#6a4bd8', fx: 3, fy: -6, show: 'both', art: ['......c......', '.....ccc.....', '.....ccc.....', '....ccccc....', '....ccccc....', '...ccccccc...', '...ccccccc...', '..ccccccccc..', 'ddddddddddddd', 'ddddddddddddd'] },
    { id: 'crown',  name: 'Mahkota', price: 120, col: '#ffd34a', fx: 5, fy: 1, show: 'both', art: ['c.c.c.c.c', 'ccccccccc', 'cdcdcdcdc'] },
    { id: 'helm',   name: 'Helm Besi', price: 60, col: '#9aa4ad', fx: 3, fy: 2, show: 'both', art: ['..ddddddddd..', '.dcccccccccd.', 'dcccccccccccd', 'dd.........dd'] }
  ],
  face: [
    { id: 'glasses', name: 'Kacamata', price: 30, col: '#ffd34a', fx: 5, fy: 7, show: 'f', art: ['ccc.c.ccc', 'c.c...c.c', 'ccc...ccc'] },
    { id: 'mask',    name: 'Masker', price: 25, col: '#f2f2f2', fx: 6, fy: 10, show: 'f', art: ['ccccccc', 'ccccccc', '.ddddd.'] }
  ],
  neck: [
    { id: 'scarf', name: 'Syal', price: 35, col: '#e08a2e', fx: 3, fy: 11, show: 'both', art: ['ccccccccccccc', 'dcdcdcdcdcdcd', '....cc.......'] },
    { id: 'cape',  name: 'Jubah', price: 90, col: '#2f6fd8', fx: 1, fy: 11, show: 'b', art: ['ccccccccccccccccc', 'cdcdcdcdcdcdcdcdc', '.ccccccccccccccc.', '..ddddddddddddd..'] },
    { id: 'bow',   name: 'Dasi Kupu', price: 20, col: '#e04040', fx: 7, fy: 11, show: 'f', art: ['cc.cc', 'ccwcc', 'cc.cc'] }
  ]
};
const PETS = [
  { id: 'slime',  name: 'Jeli Hijau',   price: 40,  magnet: 45, img: 'pets/slime',  fw: 16, fh: 16, fr: 2, ox: 8, oy: 8, sc: 1 },
  { id: 'ghost',  name: 'Hantu Kecil',  price: 60,  magnet: 60, img: 'pets/ghost',  fw: 16, fh: 16, fr: 2, ox: 8, oy: 8, sc: 1 },
  { id: 'cat',    name: 'Kucing Hitam', price: 80,  magnet: 35, img: 'pets/cat',    fw: 16, fh: 16, fr: 2, ox: 8, oy: 8, sc: 1 },
  { id: 'dragon', name: 'Naga Mungil',  price: 120, magnet: 70, img: 'pets/dragon', fw: 16, fh: 16, fr: 2, ox: 8, oy: 8, sc: 1 }
];
const Cos = {
  shade(hex, k) { const n = parseInt(hex.slice(1), 16); return 'rgb(' + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * k)).join(',') + ')'; },
  find(slot, id) { return (ACC[slot] || []).find(a => a.id === id); },
  // gambar aksesoris di atas sprite pemain; x,y = posisi pemain (origin sprite 9.5,15)
  draw(ctx, x, y, up, dirX, c) {
    c = c || {};
    for (const slot of ['neck', 'face', 'hat']) {
      const a = Cos.find(slot, c[slot]); if (!a || (a.show === 'f' && up) || (a.show === 'b' && !up)) continue;
      const col = (c.colors || {})[a.id] || a.col, dk = Cos.shade(col, .65), w = a.art[0].length;
      const bx = Math.round(x - 9.5), by = Math.round(y - 15);
      a.art.forEach((row, j) => { for (let i = 0; i < w; i++) {
        const ch = row[i]; if (ch === '.') continue;
        ctx.fillStyle = ch === 'c' ? col : ch === 'd' ? dk : ch === 'w' ? '#fff' : '#1a1a1a';
        ctx.fillRect(dirX < 0 ? bx + 18 - a.fx - i : bx + a.fx + i, by + a.fy + j, 1, 1);
      } });
    }
  },
  drawPet(ctx, get, p, x, y, t, hue) {
    const img = get(p.img); if (!img) return;
    ctx.save(); if (hue) ctx.filter = 'hue-rotate(' + hue + 'deg)';
    ctx.translate(x, y + Math.sin(t * 4) * 1.5); ctx.scale(p.sc, p.sc);
    ctx.drawImage(img, (Math.floor(t / .25) % p.fr) * p.fw, 0, p.fw, p.fh, -p.ox, -p.oy, p.fw, p.fh); ctx.restore();
  }
,
  // pratinjau animasi karakter + aksesoris + pet milik pemain yang sedang login (dipakai Dashboard, Katalog, Inventory)
  mount(cv) {
    const ctx = cv.getContext('2d'), IMG = {}, t0 = performance.now();
    const load = p => { const i = new Image(); i.src = 'assets/sprites/' + p + '.png'; IMG[p] = i; };
    CHARS.forEach(x => load('player/playerSheet' + x.id)); PETS.forEach(p => load(p.img)); load('player/playerShadow');
    const k = cv.width / 26.7;
    (function frame(now) {
      const t = (now - t0) / 1000, c = GameData.load().cos; ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.save(); ctx.scale(k, k);
      const ox = 13.5, oy = 17, sheet = IMG['player/playerSheet' + c.char];
      if (IMG['player/playerShadow'].complete) ctx.drawImage(IMG['player/playerShadow'], ox - 6, oy + 4);
      if (sheet.complete) { ctx.save(); if (c.hue) ctx.filter = 'hue-rotate(' + c.hue + 'deg)'; ctx.drawImage(sheet, 0, 0, 19, 21, ox - 9.5, oy - 15, 19, 21); ctx.restore(); }
      Cos.draw(ctx, ox, oy, false, 1, c);
      const pet = PETS.find(p => p.id === c.pet); if (pet) Cos.drawPet(ctx, p => IMG[p].complete ? IMG[p] : null, pet, 21 + Math.sin(t) * 1.5, 14, t, c.petHue);
      ctx.restore(); requestAnimationFrame(frame);
    })(t0);
  }
};
