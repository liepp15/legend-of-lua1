// Katalog bersama portal. Semua harga & efek mengikuti data yang dipakai engine game.
const LEVELS = [
  {
    id: 1,
    n: 'Level 1: Padang Hijau',
    short: 'Padang Hijau',
    map: 'assets/images/map-new1.png',
    desc: 'Padang rumput luas di tepi hutan tua. Kumpulkan 70 poin dari musuh dan harta karun untuk membuka jalan ke lembah.',
    goal: 70,
    boss: false,
    enemies: 'Kelelawar, Mata Terbang, Tengkorak'
  },
  {
    id: 2,
    n: 'Level 2: Lembah Senja',
    short: 'Lembah Senja',
    map: 'assets/images/map-new2.png',
    desc: 'Lembah berkabut yang dijaga pasukan tengkorak. Capai 160 poin sebelum senja berakhir.',
    goal: 160,
    boss: false,
    enemies: 'Kelelawar Merah, Mata Besar, Tengkorak, Penyembur'
  },
  {
    id: 3,
    n: 'Level 3: Gua Raja Tengkorak',
    short: 'Gua Raja Tengkorak',
    map: 'assets/images/map-new3.png',
    desc: 'Jantung kegelapan. Kalahkan Raja Tengkorak dan rebut kembali cahaya Lua.',
    goal: 0,
    boss: true,
    enemies: 'Brute, Tengkorak, Kelelawar Merah, Raja Tengkorak'
  }
];

const UPGRADES = [
  { key: 'boots', name: 'Sepatu Angin', desc: '+15% kecepatan gerak', price: 120, icon: 'assets/icons/boot.svg', tag: 'Permanen' },
  { key: 'heart', name: 'Hati Ekstra', desc: '+1 hati maksimal', price: 150, icon: 'assets/icons/heart-plus.svg', tag: 'Permanen' },
  { key: 'quiver', name: 'Quiver Besar', desc: '+10 anak panah maksimal', price: 90, icon: 'assets/sprites/items/quiver.png', tag: 'Permanen' },
  { key: 'bombbag', name: 'Tas Bom', desc: '+10 bom maksimal', price: 90, icon: 'assets/icons/bomb-bag.svg', tag: 'Permanen' },
  { key: 'sword2', name: 'Pedang Baja', desc: 'Damage dasar pedang menjadi 2', price: 200, icon: 'assets/icons/sword-up.svg', tag: 'Permanen' }
];

const BUFFS = [
  { key: 'dmg', name: 'Ramuan Kekuatan', desc: '+50% damage untuk petualangan berikutnya', price: 50, icon: 'assets/icons/potion-red.svg', tag: 'Sekali pakai' },
  { key: 'shield', name: 'Ramuan Perisai', desc: '2 lapis perisai di awal petualangan', price: 40, icon: 'assets/icons/potion-blue.svg', tag: 'Sekali pakai' },
  { key: 'regen', name: 'Ramuan Regenerasi', desc: 'Memulihkan setengah hati setiap 12 detik', price: 45, icon: 'assets/icons/potion-green.svg', tag: 'Sekali pakai' }
];

const Catalog = {
  level(n) { return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, (n || 1) - 1))]; },
  levelName(n) { return this.level(n).n; },
  upgrade(key) { return UPGRADES.find(u => u.key === key) || null; },
  buff(key) { return BUFFS.find(b => b.key === key) || null; },
  character(id) { return CHARS.find(c => c.id === Number(id)) || CHARS[0]; },
  accessory(slot, id) { return (ACC[slot] || []).find(a => a.id === id) || null; },
  pet(id) { return PETS.find(p => p.id === id) || null; },
  allCharacters() { return CHARS.map(c => ({ ...c, kind: 'character' })); },
  allAccessories() {
    return Object.entries(ACC).flatMap(([slot, list]) => list.map(a => ({ ...a, slot, kind: 'accessory' })));
  },
  allPets() { return PETS.map(p => ({ ...p, kind: 'pet' })); },
  accessorySlotLabel(slot) {
    return { hat: 'Kepala', face: 'Wajah', neck: 'Leher' }[slot] || slot;
  }
};
