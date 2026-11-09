(function () {
  function arrangeResult() {
    const view = document.getElementById("result-view");

    if (!view || view.querySelector(".starup-result-stack")) {
      return;
    }

    const ids = [
      "result-emote",
      "result-heading",
      "result-name",
      "result-summary",
      "result-message",
      "coordinator-contact"
    ];

    const nodes = ids.map(id => document.getElementById(id));

    if (nodes.some(node => !node || !view.contains(node))) {
      console.error("Struktur elemen hasil tidak lengkap.");
      return;
    }

    const resetButton = view.querySelector("[data-action]");

    if (resetButton) {
      nodes.push(resetButton);
    }

    let host = nodes[0].parentElement;

    while (host && !nodes.every(node => host.contains(node))) {
      host = host.parentElement;
    }

    if (!host || !view.contains(host)) {
      host = view;
    }

    const stack = document.createElement("div");
    stack.className = "starup-result-stack";

    host.classList.add("starup-result-layout");
    host.insertBefore(stack, host.firstChild);

    nodes.forEach(node => stack.appendChild(node));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrangeResult, {
      once: true
    });
  } else {
    arrangeResult();
  }
})();