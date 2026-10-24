(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function waitForAnimation(element) {
    if (reducedMotion.matches || getComputedStyle(element).animationName === 'none') return Promise.resolve();
    return new Promise((resolve) => {
      let timer;
      function finish(event) {
        if (event && event.target !== element) return;
        clearTimeout(timer);
        element.removeEventListener('animationend', finish);
        element.removeEventListener('animationcancel', finish);
        resolve();
      }
      element.addEventListener('animationend', finish);
      element.addEventListener('animationcancel', finish);
      // Tab di background tidak selalu mengirim animationend.
      timer = setTimeout(finish, 400);
    });
  }

  async function changeView(currentView, nextView, swap) {
    if (currentView === nextView || reducedMotion.matches) {
      swap();
      return;
    }
    currentView.classList.add('is-leaving');
    await waitForAnimation(currentView);
    swap();
  }

  // Satu controller untuk satu pencarian. Tidak memilih atau mengambil hasil.
  function startGacha(container, sequence) {
    const emote = container.querySelector('.gacha-emote');
    const startedAt = performance.now();
    const waits = new Map();
    let loopTimer = null;
    let index = 0;
    let active = true;
    let finishing = false;
    let finalEmote = null;

    function stopLoop() {
      clearTimeout(loopTimer);
      loopTimer = null;
    }

    function releaseWaits() {
      waits.forEach((resolve, timer) => { clearTimeout(timer); resolve(); });
      waits.clear();
    }

    function wait(ms) {
      if (!active || reducedMotion.matches || ms <= 0) return Promise.resolve();
      return new Promise((resolve) => {
        const timer = setTimeout(() => { waits.delete(timer); resolve(); }, ms);
        waits.set(timer, resolve);
      });
    }

    function spin() {
      if (!active || reducedMotion.matches) return;
      emote.textContent = sequence[index];
      index = (index + 1) % sequence.length;
      loopTimer = setTimeout(spin, 190);
    }

    function onMotionChange() {
      stopLoop();
      releaseWaits();
      if (!active) return;
      if (reducedMotion.matches) {
        container.dataset.phase = 'static';
        emote.textContent = finalEmote || '🤔';
      } else if (!finishing) {
        container.dataset.phase = 'spinning';
        spin();
      }
    }

    function cancel() {
      if (!active) return;
      active = false;
      stopLoop();
      releaseWaits();
      reducedMotion.removeEventListener('change', onMotionChange);
      container.dataset.phase = 'idle';
      emote.textContent = '🤔';
    }

    async function finish(target) {
      if (!active || finishing) return;
      finishing = true;
      // Error/layanan belum aktif tidak boleh berhenti pada simbol hasil seleksi.
      if (!sequence.includes(target)) {
        cancel();
        return;
      }
      finalEmote = target;
      // Hasil cepat cukup diberi satu putaran; hasil lambat tidak menunggu lagi.
      await wait(Math.max(0, 570 - (performance.now() - startedAt)));
      if (!active) return;
      stopLoop();
      if (!reducedMotion.matches) {
        container.dataset.phase = 'settling';
        emote.textContent = sequence[index];
        await wait(280);
      }
      if (!active) return;
      emote.textContent = finalEmote;
      container.dataset.phase = reducedMotion.matches ? 'static' : 'resolved';
      await wait(480);
    }

    reducedMotion.addEventListener('change', onMotionChange);
    onMotionChange();
    return Object.freeze({ finish, cancel });
  }

  window.StarUpMotion = Object.freeze({ changeView, startGacha });
})();
