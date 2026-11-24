// Register page controller.
(function () {
  if (!Portal.requireGuest()) return;
  Portal.init();

  const form = document.getElementById('registerForm');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm');
  const alertBox = document.getElementById('registerAlert');
  const button = document.getElementById('registerBtn');
  const strength = document.getElementById('strength');
  const strengthText = document.getElementById('strengthText');

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

  function updateStrength() {
    const value = password.value;
    const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(value)).length;
    let level = 0;
    if (value.length >= 6) level = 1;
    if (value.length >= 8 && classes >= 2) level = 2;
    if (value.length >= 10 && classes >= 3) level = 3;
    strength.dataset.level = String(level);
    strength.querySelector('span').style.width = (level / 3 * 100) + '%';
    strengthText.textContent = level === 0
      ? 'Gunakan minimal 6 karakter.'
      : level === 1 ? 'Kekuatan password: cukup. Tambah panjang atau variasi karakter.'
      : level === 2 ? 'Kekuatan password: baik.'
      : 'Kekuatan password: kuat.';
  }

  function validateUsername(show) {
    const err = Auth.validateUsername(username.value.trim());
    let message = err;
    if (!message && Auth.find(username.value.trim())) message = 'Username sudah dipakai. Pilih nama lain.';
    if (show) setError('usernameError', message);
    return !message;
  }

  username.addEventListener('input', () => {
    username.removeAttribute('aria-invalid');
    setError('usernameError', '');
    clearAlert();
  });
  username.addEventListener('blur', () => { if (username.value.trim()) validateUsername(true); });
  password.addEventListener('input', () => {
    password.removeAttribute('aria-invalid');
    setError('passwordError', '');
    updateStrength();
    clearAlert();
    if (confirm.value) validateConfirm(false);
  });
  confirm.addEventListener('input', () => {
    confirm.removeAttribute('aria-invalid');
    setError('confirmError', '');
    clearAlert();
  });

  function validateConfirm(show) {
    let message = '';
    if (!confirm.value) message = 'Konfirmasi password wajib diisi.';
    else if (confirm.value !== password.value) message = 'Konfirmasi password tidak sama.';
    if (show) setError('confirmError', message);
    return !message;
  }

  updateStrength();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearAlert();
    setError('usernameError', '');
    setError('passwordError', '');
    setError('confirmError', '');

    const nameOk = validateUsername(true);
    const passError = Auth.validatePassword(password.value);
    if (passError) setError('passwordError', passError);
    const confirmOk = validateConfirm(true);
    if (!nameOk || passError || !confirmOk) {
      showAlert('error', 'Periksa kembali data yang kamu isi.');
      return;
    }

    button.disabled = true;
    button.textContent = 'Membuat akun…';
    try {
      const result = await Auth.register(username.value, password.value);
      if (!result.ok) {
        showAlert('error', result.message);
        if (result.message.toLowerCase().includes('username')) {
          setError('usernameError', result.message);
          username.setAttribute('aria-invalid', 'true');
          username.focus();
        }
        return;
      }
      Portal.toast('Akun berhasil dibuat. Mengarahkan ke halaman login…', 'success', 2200);
      button.textContent = 'Berhasil!';
      const next = Portal.nextUrl('dashboard.html');
      setTimeout(() => {
        location.href = 'login.html?registered=1&next=' + encodeURIComponent(next);
      }, 850);
    } catch (err) {
      showAlert('error', 'Terjadi kesalahan saat membuat akun. Coba lagi.');
    } finally {
      if (button.textContent !== 'Berhasil!') {
        button.disabled = false;
        button.textContent = 'Buat Akun';
      }
    }
  });

  username.focus();
})();
