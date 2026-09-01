/* ============================================================================
   Bayside Kombi — scroll choreography
   Porsche mechanics on GSAP: long hero pin, sharpen type,
   pinned occasion slides, cream gallery, FAQ.
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
     1. HERO — intro lockup → O zoom → ReverseVid4 → hero.mp4 scroll scrub
     ---------------------------------------------------------------------- */
  const hero = document.getElementById("hero");
  const introVideo = document.getElementById("hero-intro-video");
  const video = document.getElementById("hero-video");
  const intro = document.getElementById("intro");
  const introLockup = document.getElementById("intro-lockup");
  const introO = document.getElementById("intro-o");
  const introPortal = document.getElementById("intro-portal");
  const heroLines = gsap.utils.toArray(".hero__line");

  if (heroLines.length && !reduceMotion) sharpenSet(heroLines);

  const heroState = {
    duration: 0,
    target: 0,
    seeking: false,
    ready: false,
    playingIntro: false,
    seekTimer: 0,
  };

  function muteEl(el) {
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;
    el.preload = "auto";
    el.setAttribute("muted", "");
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
  }

  function applyHeroTime() {
    if (!video || !heroState.ready || heroState.playingIntro) return;
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

  function revealHeroCopy() {
    gsap.set(".hero__copy, .hero__scroll, .hero__vignette", { visibility: "visible" });
    gsap.to(".hero__copy, .hero__scroll, .hero__vignette", {
      opacity: 1,
      duration: 0.7,
      ease: "power2.out",
    });
    if (heroLines.length && !reduceMotion) sharpenTo(heroLines, { delay: 0.05 });
    else gsap.set(heroLines, { clearProps: "filter,transform,opacity" });
  }

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
    liftVeil();

    const proxy = { t: 0 };
    gsap.fromTo(
      proxy,
      { t: 0 },
      {
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
      }
    );
  }

  function primeHero() {
    if (!video || heroState.playingIntro || !heroState.ready) return;
    muteEl(video);
    const play = video.play();
    if (play && typeof play.then === "function") {
      play
        .then(() => {
          if (heroState.playingIntro) return;
          video.pause();
          applyHeroTime();
        })
        .catch(() => {});
    }
  }

  async function loadVideoBlob(el) {
    if (!el) return;
    const src = el.currentSrc || el.querySelector("source")?.src;
    if (!src || src.startsWith("blob:")) return;
    const res = await fetch(src);
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    await new Promise((resolve, reject) => {
      const done = () => resolve();
      el.addEventListener("loadedmetadata", done, { once: true });
      el.addEventListener("error", () => reject(new Error("video blob")), { once: true });
      while (el.firstChild) el.removeChild(el.firstChild);
      el.src = url;
      el.load();
    });
  }

  function portalClip(expand) {
    if (!introO || !introPortal || !hero) return { x: "50%", y: "50%", r: 0 };
    const sticky = hero.querySelector(".hero__sticky") || hero;
    const o = introO.getBoundingClientRect();
    const stage = sticky.getBoundingClientRect();
    const x = o.left - stage.left + o.width / 2;
    const y = o.top - stage.top + o.height / 2;
    const r = expand
      ? Math.hypot(stage.width, stage.height)
      : Math.max(o.width, o.height) * 0.46;
    introPortal.style.setProperty("--x", `${x}px`);
    introPortal.style.setProperty("--y", `${y}px`);
    introPortal.style.setProperty("--r", `${r}px`);
    return { x, y, r };
  }

  function waitForReady(el) {
    return new Promise((resolve) => {
      if (!el) {
        resolve();
        return;
      }
      const ready = () => {
        if (el.duration && Number.isFinite(el.duration)) resolve();
        else window.setTimeout(ready, 80);
      };
      ready();
      window.setTimeout(resolve, 5000);
    });
  }

  function playIntroClip() {
    if (!introVideo) return Promise.resolve();
    heroState.playingIntro = true;
    muteEl(introVideo);
    introVideo.loop = false;
    try {
      introVideo.currentTime = 0;
    } catch (_) {}
    const play = introVideo.play();
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        heroState.playingIntro = false;
        introVideo.pause();
        resolve();
      };
      introVideo.addEventListener("ended", done, { once: true });
      if (play && typeof play.catch === "function") {
        play.catch(() => window.setTimeout(done, 800));
      }
      window.setTimeout(done, ((introVideo.duration || 8) + 1.5) * 1000);
    });
  }

  function retireIntroVideo() {
    if (!introVideo) return;
    introVideo.pause();
    introVideo.removeAttribute("src");
    while (introVideo.firstChild) introVideo.removeChild(introVideo.firstChild);
    try {
      introVideo.load();
    } catch (_) {}
  }

  async function handoffToDrive() {
    await waitForReady(video);
    if (hero) {
      hero.classList.add("is-live");
      hero.classList.add("is-drive");
    }
    if (video) {
      try {
        video.currentTime = 0;
      } catch (_) {}
      video.pause();
    }
    retireIntroVideo();
  }

  function unlockHero() {
    document.documentElement.classList.remove("is-intro");
    window.removeEventListener("touchmove", lockIntroTouch, { passive: false });
    if (hero) {
      hero.classList.add("is-live");
      hero.classList.add("is-drive");
    }
    if (intro) intro.classList.add("is-done");
    liftVeil();
    revealHeroCopy();
    wireHeroCopy();
    wireHeroScrub();
    ScrollTrigger.refresh();
  }

  function lockIntroTouch(event) {
    event.preventDefault();
  }

  let introStarted = false;

  function runHeroIntro() {
    if (introStarted) return;
    introStarted = true;

    if (!intro || !introLockup || reduceMotion) {
      if (hero) {
        hero.classList.add("is-live");
        hero.classList.add("is-drive");
      }
      if (intro) intro.classList.add("is-done");
      gsap.set(".hero__copy, .hero__scroll, .hero__vignette", { opacity: 1, visibility: "visible" });
      document.documentElement.classList.remove("is-intro");
      if (heroLines.length && !reduceMotion) sharpenTo(heroLines);
      wireHeroCopy();
      wireHeroScrub();
      return;
    }

    window.addEventListener("touchmove", lockIntroTouch, { passive: false });

    const sticky = hero ? hero.querySelector(".hero__sticky") : null;
    const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

    portalClip(false);

    (async () => {
      intro.classList.add("is-in");
      await wait(1400);
      portalClip(false);
      intro.classList.add("is-fill");
      await wait(700);
      await waitForReady(introVideo);
      const endR = Math.hypot(
        (sticky && sticky.clientWidth) || window.innerWidth,
        (sticky && sticky.clientHeight) || window.innerHeight
      );
      intro.classList.add("is-zoom");
      await wait(40);
      introPortal.style.setProperty("--r", `${endR}px`);
      await wait(1550);
      intro.classList.add("is-fade");
      if (hero) hero.classList.add("is-live");
      await wait(400);
      introPortal.style.opacity = "0";
      intro.classList.add("is-done");
      await playIntroClip();
      await handoffToDrive();
      unlockHero();
    })();
  }

  function prepareHeroVideo() {
    muteEl(introVideo);
    muteEl(video);
    if (introVideo) introVideo.addEventListener("error", liftVeil, { once: true });
    if (video) video.addEventListener("error", liftVeil, { once: true });
    window.addEventListener("pointerdown", primeHero, { once: true, passive: true });
    window.addEventListener("touchend", primeHero, { once: true, passive: true });
    ScrollTrigger.addEventListener("scrollStart", primeHero);

    if (video && !isIOS) {
      loadVideoBlob(video).catch(() => {});
    }
    runHeroIntro();
  }

  if (isIOS) ScrollTrigger.normalizeScroll(true);

  liftVeil();
  window.setTimeout(liftVeil, 800);
  prepareHeroVideo();

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

    bookVideo.addEventListener("canplay", tryPlay);
    bookVideo.addEventListener("loadeddata", tryPlay);

    async function prepareBook() {
      const src = bookVideo.currentSrc || bookVideo.querySelector("source")?.src;
      if (src && !src.startsWith("blob:")) {
        try {
          const res = await fetch(src);
          if (res.ok) {
            const url = URL.createObjectURL(await res.blob());
            while (bookVideo.firstChild) bookVideo.removeChild(bookVideo.firstChild);
            bookVideo.src = url;
            bookVideo.load();
          }
        } catch (_) {
          /* keep the file src */
        }
      }
      tryPlay();
    }

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

    prepareBook();
    window.addEventListener("pointerdown", tryPlay, { passive: true });
    window.addEventListener("touchend", tryPlay, { passive: true });
  }

  /* ----------------------------------------------------------------------
     3. OCCASIONS — pinned photo + caption, three beats on scroll
     ---------------------------------------------------------------------- */
  const moments = document.getElementById("moments");
  const momentPhotos = gsap.utils.toArray("#moments-photos img");
  const momentCopy = gsap.utils.toArray("#moments-copy article");
  const momentBar = document.getElementById("moments-bar");
  const momentCount = Math.max(momentPhotos.length, momentCopy.length, 1);

  function setMoment(index) {
    const next = gsap.utils.clamp(0, momentCount - 1, index);
    momentPhotos.forEach((el, i) => el.classList.toggle("is-on", i === next));
    momentCopy.forEach((el, i) => el.classList.toggle("is-on", i === next));
  }

  function applyMoments(progress) {
    const p = gsap.utils.clamp(0, 1, progress);
    if (momentBar) momentBar.style.transform = `scaleX(${p})`;
    const index = Math.min(momentCount - 1, Math.floor(p * momentCount - 0.001));
    setMoment(p >= 1 ? momentCount - 1 : index);
  }

  if (moments && momentPhotos.length && !reduceMotion) {
    applyMoments(0);
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: moments,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.35,
        invalidateOnRefresh: true,
        onRefresh: () => applyMoments(proxy.p),
      },
      onUpdate: () => applyMoments(proxy.p),
    });
  } else {
    applyMoments(0);
    momentPhotos.forEach((el) => el.classList.add("is-on"));
    momentCopy.forEach((el) => el.classList.add("is-on"));
  }

  const galleryTitle = document.querySelector(".gallery__title");
  if (galleryTitle && !reduceMotion) {
    sharpenSet(galleryTitle);
    sharpenTo(galleryTitle, {
      scrollTrigger: {
        trigger: ".gallery",
        start: "top 78%",
        once: true,
      },
    });
  }

  const faqTitle = document.querySelector(".faq__title");
  if (faqTitle && !reduceMotion) {
    sharpenSet(faqTitle);
    sharpenTo(faqTitle, {
      scrollTrigger: {
        trigger: ".faq",
        start: "top 78%",
        once: true,
      },
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
