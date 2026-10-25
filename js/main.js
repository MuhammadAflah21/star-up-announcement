(() => {
  'use strict';

  // Path asli tetap. Timpa PNG pada path ini; tidak perlu mengubah kode.
  const ASSET_REGISTRY = Object.freeze({
    background: ['assets/images/bawah-laut.png', 'BACKGROUND'],
    form: ['assets/images/gelembung.png', 'FORM ACCENT'],
    hero: ['assets/jellyfish/jellyfish-hero.png', 'JELLYFISH HERO'],
    left: ['assets/jellyfish/jellyfish-left.png', 'JELLYFISH LEFT'],
    right: ['assets/jellyfish/spombob-ramai.png', 'JELLYFISH RIGHT'],
    checking: ['assets/jellyfish/jellyfish-checking.png', 'JELLYFISH CHECKING'],
    accepted: ['assets/jellyfish/jellyfish-accepted.png', 'JELLYFISH ACCEPTED'],
    notAccepted: ['assets/jellyfish/jellyfish-not-accepted.png', 'JELLYFISH NOT ACCEPTED'],
    coralLeft: ['assets/coral/jellyfish-hero.png', 'CORAL LEFT'],
    coralRight: ['assets/coral/spombob-ramai.png', 'CORAL RIGHT'],
    starfishLeft: ['assets/starfish/starfish-left.png', 'BINTANG LAUT LEFT'],
    starfishRight: ['assets/starfish/gelembung.png', 'BINTANG LAUT RIGHT'],
    sparkles: ['assets/sparkles/sparkle-cluster.png', 'SPARKLE']
  });

  function initializeAssets() {
    const isLocal = location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    // Hanya lingkungan lokal; ?assets=off untuk melihat tampilan produksi.
    const showGuides = isLocal && new URLSearchParams(location.search).get('assets') !== 'off';
    document.querySelectorAll('[data-asset]').forEach((slot) => {
      const [source, label] = ASSET_REGISTRY[slot.dataset.asset];
      const image = new Image();
      image.alt = '';
      image.draggable = false;
      image.decoding = 'async';
      slot.dataset.status = 'loading';
      function showEmpty(status) {
        slot.dataset.status = status;
        slot.replaceChildren();
        slot.hidden = !showGuides;
        if (showGuides) {
          const guide = document.createElement('span');
          guide.className = 'asset-placeholder';
          guide.textContent = label;
          guide.title = `${label} — ${source}`;
          guide.dataset.shortLabel = label.replace('JELLYFISH', 'JF').replace('BINTANG LAUT', 'BL').replace('LEFT', 'L').replace('RIGHT', 'R').replace('HERO', 'H').replace('SPARKLE', 'SP').replace('BACKGROUND', 'BG');
          slot.append(guide);
        }
      }
      image.onload = () => {
        // Paket awal berisi PNG transparan 1×1. Ini bukan ilustrasi final.
        if (image.naturalWidth <= 1 || image.naturalHeight <= 1) {
          showEmpty('placeholder');
          return;
        }
        image.width = image.naturalWidth;
        image.height = image.naturalHeight;
        slot.replaceChildren(image);
        slot.dataset.status = 'loaded';
        slot.hidden = false;
      };
      image.onerror = () => showEmpty('missing');
      image.src = source;
    });
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
  /**
   * Satu titik integrasi backend. Belum ada fetch atau data peserta lokal.
   * Ganti ISI fungsi ini saat layanan resmi siap; gunakan options.signal untuk fetch.
   * Kontrak lengkap dan kewajiban backend: docs/BACKEND.md.
   * @param {string} nim NIM yang sudah dinormalisasi dan divalidasi.
   * @param {{signal: AbortSignal}} options Sinyal pembatalan ketika timeout.
   * @returns {Promise<object>} Respons dengan status kontrak.
   */
  async function checkNim(nim, options = {}) {
      try {
          const response = await fetch("/api/cek-nim", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({ nim }),
              cache: "no-store",
              signal: options.signal
          });

          const hasil = await response.json();

          // Tangani respons error dari server
          if (!response.ok) {
              console.error(
                  "API gagal:",
                  response.status,
                  hasil.message
              );

              return {
                  status: "service-unavailable"
              };
          }

          // Pastikan hasil sesuai tiga kondisi seleksi
          const statusValid = [
              "accepted",
              "not-accepted",
              "not-found"
          ];

          if (!statusValid.includes(hasil.status)) {
              return {
                  status: "service-unavailable"
              };
          }

          return hasil;

      } catch (error) {
          // Pertahankan mekanisme pembatalan request
          if (error.name === "AbortError") {
              throw error;
          }

          console.error("Koneksi backend gagal:", error);

          return {
              status: "service-unavailable"
          };
      }
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
      if (result.status === 'accepted' && !requiredText(result.division)) throw new Error('Divisi tidak tersedia.');
      return result;
    }
    if (['not-found', 'service-unavailable', 'error'].includes(result.status)) return result;
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
    error: byId('error-view')
  };
  const RESULT_EMOTES = Object.freeze({ accepted: '🤩', 'not-accepted': '😥', 'not-found': '🤔' });
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
    ['result-heading', 'result-emote', 'result-name', 'result-status', 'result-message', 'result-division', 'coordinator-contact']
      .forEach((id) => { byId(id).textContent = ''; });
    ['result-name', 'result-summary', 'result-message', 'coordinator-contact']
      .forEach((id) => { byId(id).hidden = true; });
    byId('coordinator-contact').removeAttribute('href');
  }

  function renderResult(result) {
    clearResult();
    if (!['accepted', 'not-accepted'].includes(result.status)) return;
    const accepted = result.status === 'accepted';
    byId('result-emote').textContent = RESULT_EMOTES[result.status];
    byId('result-heading').textContent = accepted ? 'SELAMATTT!!' : 'YAHHH...';
    if (!accepted) {
      byId('result-message').hidden = false;
      byId('result-message').textContent = 'Kamu belum lolos, tetap semangat ya!';
      return;
    }
    byId('result-name').hidden = false;
    byId('result-name').textContent = result.name;
    byId('result-summary').hidden = false;
    byId('result-status').textContent = 'Lolos';
    byId('result-division').textContent = result.division;
    const contactUrl = whatsappUrl(result.coordinator?.whatsapp);
    if (contactUrl) {
      byId('coordinator-contact').href = contactUrl;
      byId('coordinator-contact').textContent = `Hubungi Koor ${result.division}`;
      byId('coordinator-contact').hidden = false;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || currentState !== 'landing' || event.isComposing) return;
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
      activeGacha = window.StarUpMotion?.startGacha?.(byId('gacha'), Object.values(RESULT_EMOTES)) || null;
      const result = validateResponse(await requestResult(nim), nim);
      await activeGacha?.finish(RESULT_EMOTES[result.status] || null);
      renderResult(result);
      resultAnnouncement = {
        accepted: `Kamu diterima di divisi ${result.division}.`,
        'not-accepted': 'Kamu belum lolos. Tetap semangat, ya!',
        'not-found': 'NIM tidak ditemukan.',
        'service-unavailable': 'Layanan pengecekan hasil belum tersedia.',
        error: 'Pencarian gagal. Silakan coba lagi.'
      }[result.status];
      await setState(result.status);
    } catch {
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
      // Coba lagi mempertahankan NIM; cek NIM lain mengosongkan input.
      if (event.currentTarget.dataset.action === 'reset') form.reset();
      validationStarted = false;
      showValidation('');
      await setState('landing');
      clearResult();
      announcement.textContent = '';
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
    activeGacha?.cancel();
    activeRequest?.abort();
  });
  initializeAssets();
  setBusy(false);
})();
