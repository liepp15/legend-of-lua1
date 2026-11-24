// Autentikasi portal: akun di Local Storage, sesi di Local/Session Storage.
// Password disimpan sebagai hash + salt (SHA-256 bila tersedia, fallback hash lokal).
const Auth = {
  _users: null,
  _session: undefined,

  _invalidate() { this._users = null; this._session = undefined; },

  users() {
    if (this._users) return this._users;
    const list = Store.get(KEYS.users, []);
    this._users = Array.isArray(list) ? list : [];
    return this._users;
  },

  _saveUsers(list) {
    this._users = list;
    Store.set(KEYS.users, list);
  },

  _norm(name) { return String(name || '').trim().toLowerCase(); },

  find(username) {
    const key = this._norm(username);
    return this.users().find(u => this._norm(u.username) === key) || null;
  },

  current() {
    if (this._session !== undefined) return this._session;
    let raw = SessionStore.get(KEYS.session, null) || Store.get(KEYS.session, null);
    if (!raw || !raw.username) { this._session = null; return null; }
    const account = this.find(raw.username);
    if (!account) {
      this.logout(false);
      return null;
    }
    this._session = {
      username: account.username,
      displayName: account.displayName || account.username,
      loginAt: raw.loginAt || Date.now()
    };
    return this._session;
  },

  requireLogin(redirect = true) {
    const session = this.current();
    if (session) return true;
    if (redirect) {
      const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      location.replace('login.html?next=' + next);
    }
    return false;
  },

  requireGuest() {
    const session = this.current();
    if (!session) return true;
    location.replace('dashboard.html');
    return false;
  },

  _randomSalt() {
    const bytes = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  },

  _fallbackHash(text) {
    // FNV-1a 64-bit-ish untuk lingkungan yang tidak mendukung crypto.subtle.
    let h1 = 0x811c9dc5, h2 = 0x9e3779b9;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      h1 ^= c; h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= c + i; h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
    }
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  },

  async hashPassword(password, salt) {
    const text = salt + ':' + password;
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      try {
        const data = new TextEncoder().encode(text);
        const buf = await crypto.subtle.digest('SHA-256', data);
        return { algo: 'sha256', hash: Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('') };
      } catch {}
    }
    return { algo: 'fnv1a', hash: this._fallbackHash(text) };
  },

  async _check(account, password) {
    if (!account || !account.salt || !account.hash) return false;
    const result = await this.hashPassword(password, account.salt);
    if (account.algo && account.algo !== result.algo) return false;
    return result.hash === account.hash;
  },

  validateUsername(username) {
    const name = String(username || '').trim();
    if (name.length < 3) return 'Username minimal 3 karakter.';
    if (name.length > 16) return 'Username maksimal 16 karakter.';
    if (!/^[A-Za-z0-9_]+$/.test(name)) return 'Username hanya boleh huruf, angka, dan garis bawah (_).';
    return '';
  },

  validatePassword(password) {
    if (!password) return 'Password wajib diisi.';
    if (password.length < 6) return 'Password minimal 6 karakter.';
    if (password.length > 72) return 'Password maksimal 72 karakter.';
    return '';
  },

  async register(username, password) {
    const name = String(username || '').trim();
    const nameError = this.validateUsername(name);
    if (nameError) return { ok: false, message: nameError };
    const passError = this.validatePassword(password);
    if (passError) return { ok: false, message: passError };
    if (this.find(name)) return { ok: false, message: 'Username sudah dipakai. Pilih nama lain.' };

    const salt = this._randomSalt();
    const { algo, hash } = await this.hashPassword(password, salt);
    const account = {
      username: name,
      displayName: name,
      salt,
      hash,
      algo,
      createdAt: Date.now()
    };
    this._saveUsers([...this.users(), account]);
    return { ok: true, message: 'Akun berhasil dibuat. Silakan masuk.', account };
  },

  async login(username, password, remember = false) {
    const account = this.find(username);
    if (!account) return { ok: false, message: 'Username tidak ditemukan.' };
    const valid = await this._check(account, password);
    if (!valid) return { ok: false, message: 'Password salah. Coba lagi.' };

    const session = {
      username: account.username,
      displayName: account.displayName || account.username,
      loginAt: Date.now()
    };
    this.logout(false);
    if (remember) {
      Store.set(KEYS.session, session);
      SessionStore.remove(KEYS.session);
    } else {
      SessionStore.set(KEYS.session, session);
      Store.remove(KEYS.session);
    }
    this._session = session;
    return { ok: true, message: 'Login berhasil.', session };
  },

  logout(invalidate = true) {
    Store.remove(KEYS.session);
    SessionStore.remove(KEYS.session);
    this._session = null;
    if (invalidate) {
      this._invalidate();
      if (window.GameData && GameData.clearCache) GameData.clearCache();
    }
  },

  async changePassword(currentPassword, newPassword) {
    const session = this.current();
    if (!session) return { ok: false, message: 'Sesi tidak ditemukan. Silakan login ulang.' };
    const account = this.find(session.username);
    if (!account) return { ok: false, message: 'Akun tidak ditemukan.' };
    const valid = await this._check(account, currentPassword);
    if (!valid) return { ok: false, message: 'Password lama salah.' };
    const passError = this.validatePassword(newPassword);
    if (passError) return { ok: false, message: passError };

    const salt = this._randomSalt();
    const { algo, hash } = await this.hashPassword(newPassword, salt);
    const updated = this.users().map(u => u.username === account.username ? { ...u, salt, hash, algo } : u);
    this._saveUsers(updated);
    return { ok: true, message: 'Password berhasil diperbarui.' };
  }
};

// Sinkronkan cache antar-tab.
addEventListener('storage', e => {
  if (e.key === KEYS.users || e.key === KEYS.session) Auth._invalidate();
});
