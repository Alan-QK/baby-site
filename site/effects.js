// 页面交互特效：滚动分镜、入场故障切换与 WebAudio 节奏联动。
(function initEffects() {
  const root = document.documentElement;
  const body = document.body;
  const cursorGlow = document.getElementById("cursor-glow");
  const hero = document.querySelector(".hero__content");
  const audioButton = document.getElementById("audio-toggle");
  const audioStatus = document.getElementById("audio-status");

  body.classList.add("js-enhanced");

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

  const flicker = () => {
    if (!hero) {
      return;
    }
    hero.classList.add("is-flicker");
    window.setTimeout(() => {
      hero.classList.remove("is-flicker");
    }, 130);
  };
  window.setInterval(flicker, 4200);

  const cards = Array.from(document.querySelectorAll(".card"));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        const element = entry.target;
        element.classList.add("is-visible", "is-glitch-in");
        window.setTimeout(() => element.classList.remove("is-glitch-in"), 280);
        observer.unobserve(element);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );
  cards.forEach((card) => observer.observe(card));

  const updateScrollProgress = () => {
    const scrollTop = window.scrollY;
    const maxScrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(scrollTop / maxScrollable, 1);
    root.style.setProperty("--scroll-progress", progress.toFixed(4));
    window.dispatchEvent(
      new CustomEvent("cyber-scroll", {
        detail: { progress }
      })
    );
  };
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  updateScrollProgress();

  if (!audioButton || !audioStatus) {
    return;
  }

  let audioContext = null;
  let analyser = null;
  let oscMain = null;
  let oscAccent = null;
  let pulseGain = null;
  let tickTimer = null;
  let rafId = 0;
  let isAudioLive = false;

  const setAudioStatus = (text, isError = false) => {
    audioStatus.textContent = text;
    audioStatus.style.color = isError ? "#ff8fcb" : "#f0b4ff";
  };

  const stopAudio = () => {
    if (!isAudioLive) {
      return;
    }
    isAudioLive = false;
    body.classList.remove("audio-live");
    audioButton.classList.remove("is-active");
    audioButton.textContent = "启动节奏引擎";
    root.style.setProperty("--beat-energy", "0");
    window.__cyberBeatEnergy = 0;
    setAudioStatus("节奏引擎待机 · 点击启动");

    if (tickTimer) {
      window.clearInterval(tickTimer);
      tickTimer = null;
    }
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (oscMain) {
      oscMain.stop();
      oscMain.disconnect();
      oscMain = null;
    }
    if (oscAccent) {
      oscAccent.stop();
      oscAccent.disconnect();
      oscAccent = null;
    }
    if (pulseGain) {
      pulseGain.disconnect();
      pulseGain = null;
    }
    if (analyser) {
      analyser.disconnect();
      analyser = null;
    }
    if (audioContext) {
      void audioContext.close();
      audioContext = null;
    }
  };

  const readEnergy = () => {
    if (!analyser || !isAudioLive) {
      return;
    }
    const bins = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(bins);
    let sum = 0;
    const useBins = Math.max(Math.floor(bins.length * 0.16), 1);
    for (let i = 0; i < useBins; i += 1) {
      sum += bins[i];
    }
    const average = sum / useBins / 255;
    const energy = Math.min(1, average * 1.8);
    root.style.setProperty("--beat-energy", energy.toFixed(3));
    window.__cyberBeatEnergy = energy;
    rafId = window.requestAnimationFrame(readEnergy);
  };

  const startAudio = async () => {
    try {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) {
        setAudioStatus("当前浏览器不支持 WebAudio 节奏引擎。", true);
        return;
      }

      audioContext = new AudioContextConstructor();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      pulseGain = audioContext.createGain();
      pulseGain.gain.value = 0.0001;

      const sink = audioContext.createGain();
      sink.gain.value = 0;

      oscMain = audioContext.createOscillator();
      oscMain.type = "sawtooth";
      oscMain.frequency.value = 88;

      oscAccent = audioContext.createOscillator();
      oscAccent.type = "triangle";
      oscAccent.frequency.value = 176;

      oscMain.connect(pulseGain);
      oscAccent.connect(pulseGain);
      pulseGain.connect(analyser);
      analyser.connect(sink);
      sink.connect(audioContext.destination);

      oscMain.start();
      oscAccent.start();

      const triggerBeat = () => {
        if (!pulseGain || !audioContext) {
          return;
        }
        const now = audioContext.currentTime;
        pulseGain.gain.cancelScheduledValues(now);
        pulseGain.gain.setValueAtTime(0.0001, now);
        pulseGain.gain.linearRampToValueAtTime(0.35, now + 0.012);
        pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      };
      triggerBeat();
      tickTimer = window.setInterval(triggerBeat, 430);

      isAudioLive = true;
      body.classList.add("audio-live");
      audioButton.classList.add("is-active");
      audioButton.textContent = "关闭节奏引擎";
      setAudioStatus("节奏引擎已激活 · 光效与场景同步中");
      readEnergy();
    } catch (error) {
      console.error("WebAudio 节奏引擎启动失败：", error);
      setAudioStatus("节奏引擎启动失败，请重试。", true);
      stopAudio();
    }
  };

  audioButton.addEventListener("click", () => {
    if (isAudioLive) {
      stopAudio();
      return;
    }
    void startAudio();
  });

  window.addEventListener("beforeunload", stopAudio);
})();
