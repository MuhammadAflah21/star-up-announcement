(() => {
  'use strict';
  const layer = document.getElementById('result-effects');
  if (!layer) return; // Halaman tetap berfungsi jika layer dekorasi tidak tersedia.

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sources = Object.freeze({
    accepted: ['happy-1', 'happy-2', 'happy-3', 'happy-4'],
    'not-accepted': ['sad-1', 'sad-2', 'sad-3', 'sad-4']
  });
  const loads = new Map();
  let generation = 0;
  let activeStatus = null;
  let cleanupTimer = null;

  function clear() {
    generation += 1;
    activeStatus = null;
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
    layer.replaceChildren();
    // Batalkan preload yang belum selesai agar reset tidak meninggalkan timer.
    for (const [key, entry] of loads) {
      if (!entry.settled) {
        entry.cancel();
        loads.delete(key);
      }
    }
  }

  function load(key) {
    if (loads.has(key)) return loads.get(key).promise;
    const entry = { settled: false, cancel() {} };
    entry.promise = new Promise((resolve) => {
      const image = new Image();
      let timer;
      const finish = (value) => {
        if (entry.settled) return;
        entry.settled = true;
        clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        resolve(value);
      };
      entry.cancel = () => { finish(null); image.removeAttribute('src'); };
      image.alt = '';
      image.draggable = false;
      image.decoding = 'async';
      image.onload = () => finish(image.naturalWidth > 1 && image.naturalHeight > 1 ? image : null);
      image.onerror = () => finish(null);
      // Sekali per aset per halaman; kegagalan juga dicache, tanpa fallback gambar lain.
      timer = setTimeout(() => finish(null), 3000);
      image.src = `assets/images/effects/${key}.png`;
    });
    loads.set(key, entry);
    return entry.promise;
  }

  async function play(status) {
    if (!sources[status]) { clear(); return; }
    if (activeStatus === status) return;
    clear();
    const view = document.getElementById('result-view');
    const container = document.getElementById('announcement-views');
    if (motion.matches || document.hidden || !view || view.hidden || container?.dataset.state !== status) return;
    activeStatus = status;
    const token = generation;
    try {
      const images = (await Promise.all(sources[status].map(load))).filter(Boolean);
      if (token !== generation || motion.matches || document.hidden || view.hidden || container.dataset.state !== status || !images.length) return;
      const mobile = window.innerWidth < 640;
      const total = mobile ? 12 : 18;
      const fragment = document.createDocumentFragment();
      // Acak urutan, lalu putar agar semua gambar tersedia ikut digunakan.
      for (let i = images.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [images[i], images[j]] = [images[j], images[i]];
      }
      for (let i = 0; i < total; i += 1) {
        const particle = document.createElement('span');
        const image = images[i % images.length].cloneNode();
        particle.className = 'result-particle';
        image.className = 'result-particle-image';
        // Gagal saat clone dimuat: hapus hanya partikel, tidak menyentuh hasil.
        image.onerror = () => particle.remove();
        particle.style.left = `${((i + Math.random()) / total) * 94}%`;
        particle.style.setProperty('--rain-size', `${(mobile ? 24 : 30) + Math.random() * 16}px`);
        particle.style.setProperty('--rain-duration', `${3.8 + Math.random() * 1.6}s`);
        particle.style.setProperty('--rain-delay', `${Math.random() * 0.8}s`);
        particle.style.setProperty('--rain-drift', `${Math.random() * 48 - 24}px`);
        particle.style.setProperty('--rain-rotation', `${Math.random() * 100 - 50}deg`);
        particle.appendChild(image);
        fragment.appendChild(particle);
      }
      layer.appendChild(fragment);
      // Fallback cleanup jika animationend tidak dikirim browser.
      cleanupTimer = setTimeout(() => {
        layer.replaceChildren();
        cleanupTimer = null;
      }, 6500);
    } catch (error) {
      if (token === generation) clear();
      console.warn('[STAR UP emote rain] Efek dilewati:', error);
    }
  }

  layer.addEventListener('animationend', (event) => {
    if (!event.target.classList.contains('result-particle')) return;
    event.target.remove();
    if (!layer.childElementCount) {
      clearTimeout(cleanupTimer);
      cleanupTimer = null;
    }
  });
  motion.addEventListener('change', () => { if (motion.matches) clear(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  window.StarUpResultEffects = Object.freeze({ play, clear });
})();
