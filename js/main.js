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
     1. HERO — GIF frame sequence scrubbed to scroll
     ---------------------------------------------------------------------- */
  const hero = document.getElementById("hero");
  const canvas = document.getElementById("hero-seq");
  const heroLines = gsap.utils.toArray(".hero__line");
  const FRAME_COUNT = 192;
  const frames = new Array(FRAME_COUNT);
  const ctx = canvas ? canvas.getContext("2d", { alpha: false }) : null;
  let heroIndex = 0;
  let canvasW = 0;
  let canvasH = 0;

  if (heroLines.length && !reduceMotion) sharpenSet(heroLines);

  function frameSrc(i) {
    return `images/hero-frames/ffout${String(i + 1).padStart(3, "0")}.gif`;
  }

  function ensureFrame(i) {
    if (i < 0 || i >= FRAME_COUNT) return null;
    if (frames[i]) return frames[i];
    const img = new Image();
    img.decoding = "async";
    img.src = frameSrc(i);
    frames[i] = img;
    return img;
  }

  function sizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvasW = Math.max(1, Math.round(w * dpr));
    canvasH = Math.max(1, Math.round(h * dpr));
    canvas.width = canvasW;
    canvas.height = canvasH;
    drawHeroFrame(heroIndex, true);
  }

  function drawCover(img) {
    if (!ctx || !img || !img.naturalWidth) return;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = canvasW / canvasH;
    let dw;
    let dh;
    let dx;
    let dy;
    if (ir > cr) {
      dh = canvasH;
      dw = canvasH * ir;
      dx = (canvasW - dw) / 2;
      dy = 0;
    } else {
      dw = canvasW;
      dh = canvasW / ir;
      dx = 0;
      dy = (canvasH - dh) * 0.45;
    }
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function drawHeroFrame(i, force) {
    const img = ensureFrame(i);
    if (!force && i === heroIndex && img && img.complete && img.naturalWidth) return;
    heroIndex = i;
    if (img && img.complete && img.naturalWidth) {
      drawCover(img);
      return;
    }
    if (img) {
      img.addEventListener(
        "load",
        () => {
          if (heroIndex === i) drawCover(img);
        },
        { once: true }
      );
    }
    for (let k = i - 1; k >= 0; k -= 1) {
      const prev = frames[k];
      if (prev && prev.complete && prev.naturalWidth) {
        drawCover(prev);
        break;
      }
    }
  }

  function prefetchAround(i) {
    for (let k = i - 8; k <= i + 20; k += 1) ensureFrame(k);
  }

  function startHeroSequence() {
    if (!canvas || !ctx || !hero) {
      liftVeil();
      return;
    }

    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    const first = ensureFrame(0);
    const go = () => {
      drawHeroFrame(0, true);
      liftVeil();
      for (let i = 1; i < 40; i += 1) ensureFrame(i);
    };
    if (first.complete && first.naturalWidth) go();
    else first.addEventListener("load", go, { once: true });

    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom bottom",
        scrub: isIOS ? 0.05 : 0.25,
        invalidateOnRefresh: true,
        onUpdate: () => {
          const i = Math.round(proxy.p * (FRAME_COUNT - 1));
          prefetchAround(i);
          drawHeroFrame(i);
        },
      },
    });

    if (heroLines.length && !reduceMotion) {
      sharpenSet(heroLines);
      sharpenTo(heroLines, { delay: 0.15 });
    }

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

  if (isIOS) ScrollTrigger.normalizeScroll(true);

  liftVeil();
  window.setTimeout(liftVeil, 800);
  startHeroSequence();

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
