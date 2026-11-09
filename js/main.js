(() => {
  'use strict';

  // PNG diprioritaskan; WebP dengan nama dasar sama dicoba jika PNG tidak ada.
  // Path dekorasi pengguna dipertahankan. Tidak ada placeholder debug/emoji.
  const ASSET_REGISTRY = Object.freeze({
    background: 'assets/images/elemen-conto.png',
    form: 'assets/starfish/starfishh.png',
    hero: 'assets/jellyfish/bunga-banyak.png',
    left: 'assets/jellyfish/ubur-ubur.png',
    right: 'assets/images/elemen-conto.png',
    accepted: 'assets/images/emoji-seneng.png',
    notAccepted: 'assets/images/emoji-sedih.png',
    notFound: 'assets/images/emoji-bingung.png',
    coralLeft: 'assets/coral/coral.png',
    coralRight: 'assets/coral/rumputlaut.png',
    starfishLeft: 'assets/images/elemen-conto.png',
    starfishRight: 'assets/images/elemen-conto.png',
    sparkles: 'assets/jellyfish/bunga.png'
  });
  const assetImages = new Map();
  const assetLoads = new Map();

  function loadAsset(key) {
    if (assetLoads.has(key)) return assetLoads.get(key);
    const source = ASSET_REGISTRY[key];
    const promise = new Promise((resolve) => {
      if (!source) return resolve(null);
      const image = new Image();
      let triedWebp = false;
      image.alt = '';
      image.draggable = false;
      image.decoding = 'async';
      function nextSource() {
        if (triedWebp) return resolve(null);
        triedWebp = true;
        image.src = source.replace(/\.png$/, '.webp');
      }
      image.onload = () => {
        if (image.naturalWidth <= 1 || image.naturalHeight <= 1) return nextSource();
        assetImages.set(key, image);
        resolve(image);
      };
      image.onerror = nextSource;
      image.src = source;
    });
    assetLoads.set(key, promise);
    return promise;
  }

  async function fillAsset(slot, key) {
    slot.dataset.asset = key;
    slot.dataset.status = 'loading';
    slot.hidden = true;
    slot.replaceChildren();
    const image = await loadAsset(key);
    if (slot.dataset.asset !== key) return;
    slot.dataset.status = image ? 'loaded' : 'missing';
    if (image) slot.replaceChildren(image.cloneNode());
    slot.hidden = !image;
  }

  function initializeAssets() {
    document.querySelectorAll('[data-asset]').forEach((slot) => fillAsset(slot, slot.dataset.asset));
    ['accepted', 'notAccepted', 'notFound'].forEach(loadAsset);
  }

  function renderGacha(key) {
    const visual = byId('gacha').querySelector('.gacha-visual');
    const image = assetImages.get(key);
    if (image) visual.replaceChildren(image.cloneNode());
    else {
      const orb = document.createElement('span');
      orb.className = 'gacha-orb';
      visual.replaceChildren(orb);
    }
    visual.dataset.asset = key || 'neutral';
  }

  function normalizeNim(value) {
    // Pertahankan simbol/spasi agar kesalahan terlihat, bukan diam-diam dihapus.
    return value.replace(/[a-z]/g, (letter) => letter.toUpperCase());
  }

  function validateNim(value) {
    if (!value) return 'Isi NIM kamu dulu, ya.';
    if (/\s/.test(value)) return 'NIM tidak boleh mengandung spasi.';
    if (/[^A-Z0-9]/.test(value)) return 'Gunakan huruf A–Z dan angka 0–9 saja, tanpa simbol.';
    if (value.length < 9) return 'NIM harus tepat 9 karakter; isianmu masih kurang.';
    if (value.length > 9) return 'NIM harus tepat 9 karakter; isianmu terlalu panjang.';
    if (!/[A-Z]/.test(value)) return 'NIM perlu memuat minimal satu huruf.';
    if (!/[0-9]/.test(value)) return 'NIM perlu memuat minimal satu angka.';
    return '';
  }
  // Adapter API tunggal. Status HTTP tidak disamakan dengan hasil seleksi.
  async function checkNim(nim, options = {}) {
    const response = await fetch('/api/cek-nim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nim }),
      cache: 'no-store',
      signal: options.signal
    });
    // Proses 429 sebelum membaca JSON: proxy juga bisa mengirim body non-JSON.
    if (response.status === 429) {
      const header = response.headers.get('Retry-After');
      let seconds = null;
      if (header && /^\d+$/.test(header.trim())) seconds = Number(header);
      else if (header && Number.isFinite(Date.parse(header))) {
        seconds = Math.max(0, (Date.parse(header) - Date.now()) / 1000);
      }
      return {
        status: 'rate-limited',
        retryAfter: Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : null
      };
    }
    if (response.status === 503) return { status: 'service-unavailable' };
    if (!response.ok) return { status: 'error' };
    return response.json();
  }

  async function requestResult(nim) {
    const controller = new AbortController();
    activeRequest = controller;
    let timer;
    let onAbort;
    try {
      const cancelled = new Promise((_, reject) => {
        onAbort = () => reject(new Error('Pencarian dibatalkan atau waktu tunggu habis.'));
        controller.signal.addEventListener('abort', onAbort, { once: true });
        timer = setTimeout(() => controller.abort(), 12000);
      });
      return await Promise.race([checkNim(nim, { signal: controller.signal }), cancelled]);
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener('abort', onAbort);
      if (activeRequest === controller) activeRequest = null;
    }
  }

  function requiredText(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function validateResponse(result, nim) {
    if (!result || typeof result !== 'object') throw new Error('Respons tidak valid.');
    if (['accepted', 'not-accepted'].includes(result.status)) {
      if (result.nim !== nim || !requiredText(result.name)) throw new Error('Identitas respons tidak sesuai.');
      // Hapus baris: if (result.status === 'accepted' && !requiredText(result.division)) ...
      return result;
    }
    if (['not-found', 'service-unavailable', 'rate-limited', 'error'].includes(result.status)) return result;
    throw new Error('Status respons tidak dikenali.');
  }

  function whatsappUrl(value) {
    // Hanya nomor internasional berbentuk string, bukan URL bebas.
    if (typeof value !== 'string' || !/^\+?[1-9]\d{7,14}$/.test(value)) return null;
    return `https://wa.me/${value.replace(/^\+/, '')}`;
  }

  const byId = (id) => document.getElementById(id);
  const form = byId('nim-form');
  const input = byId('nim-input');
  const submitButton = byId('check-button');
  const errorText = byId('nim-error');
  const container = byId('announcement-views');
  const announcement = byId('status-announcement');
  const resetButtons = document.querySelectorAll('[data-action]');
  const views = {
    landing: byId('landing-view'),
    checking: byId('checking-view'),
    accepted: byId('result-view'),
    'not-accepted': byId('result-view'),
    'not-found': byId('not-found-view'),
    'service-unavailable': byId('service-unavailable-view'),
    'rate-limited': byId('rate-limited-view'),
    error: byId('error-view')
  };
  const RESULT_ASSETS = Object.freeze({ accepted: 'accepted', 'not-accepted': 'notAccepted', 'not-found': 'notFound' });
  let activeGacha = null;
  let activeRequest = null;
  let currentState = 'landing';
  let busy = false;
  let validationStarted = false;

  function showValidation(message) {
    input.setAttribute('aria-invalid', String(Boolean(message)));
    errorText.textContent = message;
  }

  function handleInput(event) {
    if (event.isComposing) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = normalizeNim(input.value);
    input.setSelectionRange(start, end);
    showValidation(validationStarted ? validateNim(input.value) : '');
  }

  function setBusy(value) {
    busy = value;
    submitButton.disabled = value;
    input.readOnly = value;
    container.setAttribute('aria-busy', String(value));
    resetButtons.forEach((button) => { button.disabled = value; });
  }

  async function setState(nextState) {
    const previousView = views[currentState];
    const nextView = views[nextState];
    if (!nextView) throw new Error('State tidak dikenal.');
    const swap = () => {
      new Set(Object.values(views)).forEach((view) => {
        view.hidden = view !== nextView;
        view.classList.remove('is-leaving');
      });
      currentState = nextState;
      container.dataset.state = nextState;
    };
    if (!window.StarUpMotion) return swap();
    try {
      await window.StarUpMotion.changeView(previousView, nextView, swap);
    } catch {
      // Animasi tidak boleh menghalangi pergantian state.
      swap();
    }
  }

  function focusElement(element) {
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  function clearResult() {
    ['result-heading', 'result-name', 'result-message']
      .forEach((id) => { byId(id).textContent = ''; });
    ['result-name', 'result-message', 'coordinator-contact']
      .forEach((id) => { byId(id).hidden = true; });
    byId('coordinator-contact').removeAttribute('href');
    const media = byId('result-media');
    media.dataset.asset = '';
    media.hidden = true;
    media.replaceChildren();
  }



  function updateRateLimitNotice(result) {
    if (result.status !== 'rate-limited') return;
    const seconds = result.retryAfter;
    const wait = Number.isFinite(seconds) && seconds >= 0
      ? seconds === 0 ? 'Silakan coba lagi sekarang.' : `Silakan coba lagi sekitar ${Math.ceil(seconds / 60)} menit.`
      : 'Silakan coba lagi beberapa saat lagi.';
    byId('rate-limited-message').textContent = `Batas pencarian sudah tercapai. ${wait}`;
  }
  // Efek dekoratif tidak boleh mengubah hasil API menjadi halaman error.
  function resultEffects(method, ...args) {
    try {
      Promise.resolve(window.StarUpResultEffects?.[method]?.(...args)).catch((error) => {
        console.warn('[STAR UP emote rain] Efek dilewati:', error);
      });
    } catch (error) {
      console.warn('[STAR UP emote rain] Efek dilewati:', error);
    }
  }

  function renderResult(result) {
    clearResult();
    if (!['accepted', 'not-accepted'].includes(result.status)) return;
    const accepted = result.status === 'accepted';
    fillAsset(byId('result-media'), RESULT_ASSETS[result.status]);
    byId('result-heading').textContent = accepted ? 'SELAMAT KAMU LOLOS!' : 'YAHHH...';
    if (!accepted) {
      byId('result-message').hidden = false;
      byId('result-message').textContent = 'Kamu belum lolos, tetep semangat yah..';
      return;
    }
    byId('result-name').hidden = false;
    byId('result-name').textContent = result.name;
    const contactUrl = whatsappUrl(result.coordinator?.whatsapp);
    if (contactUrl) {
      byId('coordinator-contact').href = contactUrl;
      byId('coordinator-contact').hidden = false;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || currentState !== 'landing' || event.isComposing) return;
    resultEffects('clear');
    validationStarted = true;
    input.value = normalizeNim(input.value);
    const message = validateNim(input.value);
    showValidation(message);
    if (message) {
      focusElement(input);
      return;
    }
    const nim = input.value;
    setBusy(true);
    clearResult();
    input.blur();
    announcement.textContent = 'Sedang mencari hasilmu...';
    let resultAnnouncement = 'Pencarian gagal. Silakan coba lagi.';
    try {
      await setState('checking');
      activeGacha = window.StarUpMotion?.startGacha?.(byId('gacha'), Object.values(RESULT_ASSETS), renderGacha) || null;
      const result = validateResponse(await requestResult(nim), nim);
      updateRateLimitNotice(result);
      await activeGacha?.finish(RESULT_ASSETS[result.status] || null);
      renderResult(result);
      resultAnnouncement = {
        accepted: 'Selamat, kamu lolos!',
        'not-accepted': 'Kamu belum lolos. Tetap semangat, ya!',
        'not-found': 'NIM tidak ditemukan.',
        'service-unavailable': 'Layanan pengecekan hasil belum tersedia.',
        'rate-limited': byId('rate-limited-message').textContent,
        error: 'Pencarian gagal. Silakan coba lagi.'
      }[result.status];
      await setState(result.status);
      resultEffects('play', result.status);
    } catch (error) {
      console.error('[STAR UP pencarian] Pencarian/render gagal:', error);
      resultEffects('clear');
      activeGacha?.cancel();
      clearResult();
      await setState('error');
    } finally {
      activeGacha?.cancel();
      activeGacha = null;
      announcement.textContent = resultAnnouncement;
      setBusy(false);
      focusElement(views[currentState].querySelector('h2'));
    }
  }

  async function reset(event) {
    if (busy) return;
    setBusy(true);
    try {
      activeGacha?.cancel();
      activeGacha = null;
      resultEffects('clear');
      // Coba lagi mempertahankan NIM; cek NIM lain mengosongkan input.
      if (event.currentTarget.dataset.action === 'reset') form.reset();
      validationStarted = false;
      showValidation('');
      await setState('landing');
      clearResult();
      announcement.textContent = '';
      byId('rate-limited-message').textContent = '';
    } finally {
      setBusy(false);
      focusElement(input);
    }
  }

  input.addEventListener('input', handleInput);
  input.addEventListener('compositionend', handleInput);
  form.addEventListener('submit', handleSubmit);
  resetButtons.forEach((button) => button.addEventListener('click', reset));
  window.addEventListener('pagehide', () => {
    resultEffects('clear');
    activeGacha?.cancel();
    activeRequest?.abort();
  });
  initializeAssets();
  setBusy(false);
})();
