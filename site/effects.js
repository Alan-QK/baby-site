// 页面交互特效：霓虹光标与轻量故障闪烁。
(function initEffects() {
  const cursorGlow = document.getElementById("cursor-glow");
  if (cursorGlow) {
    window.addEventListener(
      "pointermove",
      (event) => {
        cursorGlow.style.left = `${event.clientX}px`;
        cursorGlow.style.top = `${event.clientY}px`;
      },
      { passive: true }
    );
  }

  const hero = document.querySelector(".hero__content");
  if (!hero) {
    return;
  }

  const flicker = () => {
    hero.classList.add("is-flicker");
    window.setTimeout(() => {
      hero.classList.remove("is-flicker");
    }, 130);
  };

  window.setInterval(flicker, 4200);
})();
