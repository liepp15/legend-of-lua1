// Alamat root situs (folder yang berisi index.html), dipakai game dan portal agar tautan tidak bergantung folder halaman.
const ROOT = '';
// Pembungkus Local Storage: semua data disimpan sebagai JSON.
const KEYS = {
  users: 'lol_users',               // daftar akun terdaftar
  session: 'lol_session',           // sesi login aktif (localStorage jika "Ingat saya")
  data: u => 'lol_data_' + u        // data permainan per pengguna
};
const Store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch {} }
};
// Sesi sementara (Remember Me tidak dicentang) memakai sessionStorage.
const SessionStore = {
  get(key, fallback = null) {
    try { const v = sessionStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) { try { sessionStorage.removeItem(key); } catch {} }
};
