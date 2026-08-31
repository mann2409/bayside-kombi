/* ============================================================================
   Bayside Kombi — scroll choreography
   Porsche mechanics on GSAP: long hero pin, sharpen type, digit drums,
   vertical-scroll → horizontal rail.
   ============================================================================ */

(() => {
  "use strict";

  const veil = document.getElementById("veil");
  function liftVeil() {
    if (veil) veil.classList.add("is-gone");
  }
  liftVeil();

  if (typeof gsap === "undefined") return;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isIOS =
    /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const progressBar = document.getElementById("progress");

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      if (progressBar) progressBar.style.width = `${self.progress * 100}%`;
    },
  });

  /* ----------------------------------------------------------------------
     Sharpen — blur / scale / Y settle + mask opens left → right
     ---------------------------------------------------------------------- */
  function clearMask(targets) {
    gsap.utils.toArray(targets).forEach((el) => {
      el.style.webkitMaskImage = "none";
      el.style.maskImage = "none";
    });
  }

  function sharpenSet(targets) {
    gsap.set(targets, {
      y: 28,
      scale: 0.96,
      filter: "blur(10px)",
      opacity: 0.7,
      "--open": 10,
    });
  }

  function sharpenTo(targets, vars) {
    const { onComplete, ...rest } = vars || {};
    return gsap.to(targets, {
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      opacity: 1,
      "--open": 100,
      duration: 1.05,
      stagger: 0.1,
      ease: "power3.out",
      overwrite: "auto",
      ...rest,
      onComplete: () => {
        clearMask(targets);
        if (typeof onComplete === "function") onComplete();
      },
    });
  }

  /* ----------------------------------------------------------------------
     1. HERO — 1080p video, time scrubbed to scroll
     ---------------------------------------------------------------------- */
  const hero = document.getElementById("hero");
  const video = document.getElementById("hero-video");
  const heroLines = gsap.utils.toArray(".hero__line");

  if (heroLines.length && !reduceMotion) sharpenSet(heroLines);

  const heroState = {
    duration: 0,
    target: 0,
    seeking: false,
    ready: false,
    seekTimer: 0,
  };

  function applyHeroTime() {
    if (!heroState.ready || !video) return;
    const next = heroState.target;
    if (!Number.isFinite(next)) return;
    if (Math.abs(video.currentTime - next) < (isIOS ? 0.05 : 0.02)) return;

    if (isIOS || !heroState.seeking) {
      heroState.seeking = true;
      try {
        video.currentTime = next;
      } catch (_) {
        heroState.seeking = false;
      }
      window.clearTimeout(heroState.seekTimer);
      heroState.seekTimer = window.setTimeout(() => {
        heroState.seeking = false;
      }, 90);
    }
  }

  if (video) {
    video.addEventListener("seeked", () => {
      heroState.seeking = false;
      applyHeroTime();
    });
  }

  gsap.ticker.add(applyHeroTime);

  function wireHeroCopy() {
    gsap.to(".hero__copy", {
      opacity: 0,
      y: -40,
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "28% top",
        scrub: true,
      },
    });

    gsap.to(".hero__scroll", {
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "12% top",
        scrub: true,
      },
    });
  }

  function wireHeroScrub() {
    if (!video || !hero || heroState.ready) return;
    const duration = video.duration;
    if (!duration || !Number.isFinite(duration)) return;

    heroState.duration = duration;
    heroState.ready = true;
    video.pause();
    try {
      video.currentTime = 0;
    } catch (_) {}
    liftVeil();

    if (heroLines.length && !reduceMotion) {
      sharpenSet(heroLines);
      sharpenTo(heroLines, { delay: 0.15 });
    }

    const proxy = { t: 0 };
    gsap.to(proxy, {
      t: Math.max(0, duration - 0.04),
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom bottom",
        scrub: isIOS ? 0.05 : 0.12,
        invalidateOnRefresh: true,
      },
      onUpdate: () => {
        heroState.target = proxy.t;
        applyHeroTime();
      },
    });
  }

  function primeHero() {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    const play = video.play();
    if (play && typeof play.then === "function") {
      play
        .then(() => {
          video.pause();
          applyHeroTime();
        })
        .catch(() => {});
    }
  }

  async function loadHeroAsBlob() {
    const src = video.currentSrc || video.querySelector("source")?.src;
    if (!src || src.startsWith("blob:")) return;
    const res = await fetch(src);
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    await new Promise((resolve, reject) => {
      const done = () => resolve();
      video.addEventListener("loadedmetadata", done, { once: true });
      video.addEventListener("error", () => reject(new Error("hero blob")), { once: true });
      while (video.firstChild) video.removeChild(video.firstChild);
      video.src = url;
      video.load();
    });
  }

  function bindHeroVideo() {
    video.addEventListener("loadedmetadata", wireHeroScrub);
    video.addEventListener("durationchange", wireHeroScrub);
    video.addEventListener("canplay", wireHeroScrub);
    if (video.readyState >= 1) wireHeroScrub();
    primeHero();
  }

  if (isIOS) ScrollTrigger.normalizeScroll(true);

  liftVeil();
  window.setTimeout(liftVeil, 800);
  wireHeroCopy();

  if (video) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.addEventListener("error", liftVeil, { once: true });
    window.addEventListener("pointerdown", primeHero, { once: true, passive: true });
    window.addEventListener("touchend", primeHero, { once: true, passive: true });
    ScrollTrigger.addEventListener("scrollStart", primeHero);

    if (isIOS) bindHeroVideo();
    else {
      Promise.race([
        loadHeroAsBlob(),
        new Promise((resolve) => window.setTimeout(resolve, 4000)),
      ])
        .catch(() => {})
        .finally(() => bindHeroVideo());
    }
  }

  /* ----------------------------------------------------------------------
     2. KINETIC TYPE — lift + rack into focus, ghost stays soft
     ---------------------------------------------------------------------- */
  const kinetic = document.getElementById("kinetic");
  const wordInners = gsap.utils.toArray(".word__inner");

  if (wordInners.length && !reduceMotion) {
    sharpenSet(wordInners);
    gsap.set(wordInners, { yPercent: 18 });
    gsap.set(".kinetic__aside, .kinetic__eyebrow", { opacity: 0, y: 16 });
    gsap.set(".kinetic__ghost", { opacity: 0, x: 40 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: kinetic,
        start: "top 72%",
        once: true,
      },
    });

    tl.to(wordInners, {
      yPercent: 0,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      opacity: 1,
      "--open": 100,
      duration: 1.05,
      stagger: 0.1,
      ease: "power3.out",
      onComplete: () => clearMask(wordInners),
    })
      .to(".kinetic__ghost", { opacity: 0.055, x: 0, duration: 1.2, ease: "power2.out" }, 0)
      .to(
        ".kinetic__aside, .kinetic__eyebrow",
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "power2.out" },
        "-=0.45"
      );
  }

  const footerTitle = document.querySelector(".footer__title");
  if (footerTitle && !reduceMotion) {
    sharpenSet(footerTitle);
    sharpenTo(footerTitle, {
      scrollTrigger: {
        trigger: ".footer",
        start: "top 78%",
        once: true,
      },
    });
  }

  const bookVideo = document.getElementById("book-video");
  if (bookVideo) {
    bookVideo.muted = true;
    bookVideo.defaultMuted = true;
    bookVideo.playsInline = true;
    bookVideo.setAttribute("muted", "");
    bookVideo.setAttribute("playsinline", "");
    bookVideo.setAttribute("webkit-playsinline", "");

    const tryPlay = () => {
      bookVideo.muted = true;
      const play = bookVideo.play();
      if (play && typeof play.catch === "function") play.catch(() => {});
    };

    bookVideo.addEventListener("playing", () => {
      bookVideo.classList.add("is-playing");
    });

    const footer = document.getElementById("book");
    if ("IntersectionObserver" in window && footer) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) tryPlay();
            else if (!isIOS) bookVideo.pause();
          });
        },
        { threshold: 0.15, rootMargin: "40% 0px" }
      );
      io.observe(footer);
    }

    tryPlay();
    window.addEventListener("pointerdown", tryPlay, { passive: true });
    window.addEventListener("touchend", tryPlay, { passive: true });
  }

  /* ----------------------------------------------------------------------
     3. HISTORY — four digit drums + one photo per year
     Year 1972–2026. Ones spin continuously; higher places click.
     Rail X is keyed to milestone years so each card fills the frame.
     ---------------------------------------------------------------------- */
  const YEAR_START = 1972;
  const YEAR_END = 2026;
  const MILESTONES = [1972, 2018, 2022, 2024, 2026];
  const SPAN = YEAR_END - YEAR_START;

  const drumsRoot = document.getElementById("drums");
  const drumsSr = document.getElementById("drums-sr");
  const rail = document.getElementById("rail");
  const railViewport = document.getElementById("rail-viewport");
  const timeline = document.getElementById("timeline");
  const cards = gsap.utils.toArray(".card");

  if (drumsRoot) {
    for (let i = 0; i < 4; i += 1) {
      const drum = document.createElement("div");
      drum.className = "drum";
      const strip = document.createElement("div");
      strip.className = "drum__strip";
      // 0–9 plus a trailing 0 so 9.x can roll forward onto a zero
      for (let n = 0; n <= 10; n += 1) {
        const cell = document.createElement("span");
        cell.className = "drum__cell";
        cell.textContent = String(n % 10);
        strip.appendChild(cell);
      }
      drum.appendChild(strip);
      drumsRoot.appendChild(drum);
    }
  }

  const strips = gsap.utils.toArray(".drum__strip");

  function digitForPlace(yearFloat, place) {
    if (place === 0) return ((yearFloat % 10) + 10) % 10;
    return Math.floor(yearFloat / 10 ** place) % 10;
  }

  function setDrums(yearFloat) {
    if (!strips.length) return;
    const cellH = strips[0].parentElement.offsetHeight;
    if (!cellH) return;
    // thousands, hundreds, tens, ones
    [3, 2, 1, 0].forEach((place, i) => {
      gsap.set(strips[i], { y: -digitForPlace(yearFloat, place) * cellH });
    });
    if (drumsSr) drumsSr.textContent = String(Math.round(yearFloat));
  }

  function cardStride() {
    if (railViewport) return railViewport.clientWidth;
    if (!cards.length) return 0;
    const styles = window.getComputedStyle(rail);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;
    return cards[0].offsetWidth + gap;
  }

  function railXForYear(yearFloat) {
    let i = 0;
    for (let k = 0; k < MILESTONES.length - 1; k += 1) {
      if (yearFloat >= MILESTONES[k]) i = k;
    }
    const a = MILESTONES[i];
    const b = MILESTONES[Math.min(i + 1, MILESTONES.length - 1)];
    const t = b === a ? 0 : gsap.utils.clamp(0, 1, (yearFloat - a) / (b - a));
    return -(i + t) * cardStride();
  }

  function setActiveCard(yearFloat) {
    let active = MILESTONES[0];
    for (let i = 0; i < MILESTONES.length; i += 1) {
      if (yearFloat >= MILESTONES[i] - 0.5) active = MILESTONES[i];
    }
    cards.forEach((el) => {
      el.classList.toggle("is-active", Number(el.dataset.year) === active);
    });
  }

  const snapPoints = MILESTONES.map((y) => (y - YEAR_START) / SPAN);

  function applyHistory(progress) {
    const yearFloat = YEAR_START + progress * SPAN;
    setDrums(yearFloat);
    if (rail) gsap.set(rail, { x: railXForYear(yearFloat) });
    setActiveCard(yearFloat);
  }

  if (timeline && strips.length && !reduceMotion) {
    applyHistory(0);

    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: timeline,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.45,
        invalidateOnRefresh: true,
        snap: {
          snapTo: snapPoints,
          duration: { min: 0.22, max: 0.5 },
          ease: "power2.inOut",
          inertia: false,
        },
        onRefresh: () => applyHistory(proxy.p),
      },
      onUpdate: () => applyHistory(proxy.p),
    });
  } else {
    applyHistory(0);
    liftVeil();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
