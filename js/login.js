// Login page controller.
(function () {
  if (!Portal.requireGuest()) return;
  Portal.init();

  const form = document.getElementById('loginForm');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const remember = document.getElementById('remember');
  const alertBox = document.getElementById('loginAlert');
  const button = document.getElementById('loginBtn');
  const params = new URLSearchParams(location.search);

  if (params.get('registered') === '1') {
    alertBox.innerHTML = '<div class="alert success">Akun berhasil dibuat. Silakan masuk dengan username dan password barumu.</div>';
  }
  if (params.get('loggedout') === '1') {
    alertBox.innerHTML = '<div class="alert info">Kamu telah keluar. Akun dan progres tetap tersimpan.</div>';
  }

  function setError(id, message) {
    const box = document.getElementById(id);
    if (box) box.textContent = message || '';
  }
  function showAlert(type, message) {
    alertBox.innerHTML = '<div class="alert ' + type + '">' + Portal.escape(message) + '</div>';
  }
  function clearAlert() { alertBox.innerHTML = ''; }

  Portal.$$('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const show = target.type === 'password';
      target.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
      btn.querySelector('img').src = show ? 'assets/icons/eye-off.svg' : 'assets/icons/eye.svg';
    });
  });

  [username, password].forEach(input => {
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      setError(input.id + 'Error', '');
      clearAlert();
    });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert();
    setError('usernameError', '');
    setError('passwordError', '');

    const name = username.value.trim();
    let valid = true;
    if (!name) { setError('usernameError', 'Username wajib diisi.'); username.setAttribute('aria-invalid', 'true'); valid = false; }
    if (!password.value) { setError('passwordError', 'Password wajib diisi.'); password.setAttribute('aria-invalid', 'true'); valid = false; }
    if (!valid) return;

    button.disabled = true;
    button.textContent = 'Memeriksa…';
    try {
      const result = await Auth.login(name, password.value, remember.checked);
      if (!result.ok) {
        showAlert('error', result.message);
        password.setAttribute('aria-invalid', 'true');
        password.focus();
        password.select();
        return;
      }
      Portal.toast('Login berhasil. Selamat datang, ' + result.session.username + '!', 'success', 1800);
      button.textContent = 'Berhasil!';
      setTimeout(() => { location.href = Portal.nextUrl('dashboard.html'); }, 480);
    } catch (err) {
      showAlert('error', 'Terjadi kesalahan saat login. Coba lagi.');
    } finally {
      if (button.textContent !== 'Berhasil!') {
        button.disabled = false;
        button.textContent = 'Masuk';
      }
    }
  });

  username.focus();
})();
