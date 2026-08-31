/* ============================================================================
   Bayside Kombi — scroll choreography
   Porsche mechanics on GSAP: long hero pin, sharpen type, digit drums,
   vertical-scroll → horizontal rail.
   ============================================================================ */

(() => {
  "use strict";

  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progressBar = document.getElementById("progress");
  const veil = document.getElementById("veil");

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      if (progressBar) progressBar.style.width = `${self.progress * 100}%`;
    },
  });

  function liftVeil() {
    if (veil) veil.classList.add("is-gone");
  }

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
     1. HERO — blob-seekable video, ~6vh pin, copy recedes
     ---------------------------------------------------------------------- */
  const hero = document.getElementById("hero");
  const video = document.getElementById("hero-video");
  const heroLines = gsap.utils.toArray(".hero__line");

  if (heroLines.length && !reduceMotion) sharpenSet(heroLines);

  const heroState = {
    duration: 0,
    target: 0,
    seeking: false,
    primed: false,
    ready: false,
  };

  function applyHeroTime() {
    if (!heroState.ready || heroState.seeking) return;
    const next = heroState.target;
    if (Math.abs(video.currentTime - next) < 0.012) return;
    heroState.seeking = true;
    try {
      video.currentTime = next;
    } catch (_) {
      heroState.seeking = false;
    }
  }

  video.addEventListener("seeked", () => {
    heroState.seeking = false;
    applyHeroTime();
  });

  gsap.ticker.add(applyHeroTime);

  async function loadVideoAsBlob(el) {
    const src = el.currentSrc || el.querySelector("source")?.src;
    if (!src) return;
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error("fetch failed");
      el.src = URL.createObjectURL(await res.blob());
    } catch (_) {
      /* file:// fallback — keep the original src */
    }
  }

  function onHeroMetadata() {
    heroState.duration = video.duration || 0;
    if (!heroState.duration || heroState.ready) return;
    heroState.ready = true;
    video.pause();
    video.currentTime = 0;
    liftVeil();

    if (reduceMotion) return;

    if (heroLines.length) {
      sharpenSet(heroLines);
      sharpenTo(heroLines, { delay: 0.15 });
    }

    const proxy = { t: 0 };
    gsap.to(proxy, {
      t: heroState.duration - 0.001,
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.4,
      },
      onUpdate: () => {
        heroState.target = proxy.t;
      },
    });

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

  function primeVideo() {
    if (heroState.primed) return;
    heroState.primed = true;
    video.muted = true;
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

  window.addEventListener("pointerdown", primeVideo, { once: true, passive: true });
  window.addEventListener("touchstart", primeVideo, { once: true, passive: true });

  if (reduceMotion) {
    liftVeil();
  } else {
    loadVideoAsBlob(video).then(() => {
      if (video.readyState >= 1) onHeroMetadata();
      else video.addEventListener("loadedmetadata", onHeroMetadata, { once: true });
    });
    window.setTimeout(liftVeil, 2600);
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

    if (reduceMotion) {
      bookVideo.pause();
      bookVideo.removeAttribute("autoplay");
    } else {
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
              else bookVideo.pause();
            });
          },
          { threshold: 0.2, rootMargin: "30% 0px" }
        );
        io.observe(footer);
      } else {
        tryPlay();
      }

      window.addEventListener("pointerdown", tryPlay, { once: true, passive: true });
      window.addEventListener("touchstart", tryPlay, { once: true, passive: true });
    }
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
