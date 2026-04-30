(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const PAGES = ["welcome", "puzzle", "message", "proposal", "final"];
  const app = $("#app");
  const toast = $("#toast");

  const welcomeHeart = $("#welcomeHeart");
  const shuffleBtn = $("#shuffleBtn");
  const previewBtn = $("#previewBtn");
  const puzzleGrid = $("#puzzleGrid");
  const puzzleStatus = $("#puzzleStatus");
  const previewModal = $("#previewModal");
  const previewClose = $("#previewClose");
  const previewBox = $("#previewBox");
  const toProposalBtn = $("#toProposalBtn");
  const proposalArea = $("#proposalArea");
  const yesBtn = $("#yesBtn");
  const noBtn = $("#noBtn");
  const proposalResult = $("#proposalResult");
  const restartBtn = $("#restartBtn");
  const musicToggle = $("#musicToggle");
  const musicLabel = $("#musicLabel");
  const bgMusic = $("#bgMusic");
  const finalVideo = $("#finalVideo");

  const floatingHearts = $("#floatingHearts");
  const sparkleLayer = $("#sparkleLayer");

  const state = {
    page: "welcome",
    puzzle: {
      size: 3,
      pieces: [],
      selectedPos: null,
      locked: false,
      imageUrl: null,
      drag: {
        active: false,
        startPos: null,
        startX: 0,
        startY: 0,
      },
    },
    proposal: {
      noClicks: 0,
      done: false,
    },
    musicOn: false,
    toastTimer: null,
  };

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-on");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => toast.classList.remove("is-on"), 2400);
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }

  function setActivePage(nextPage) {
    if (!PAGES.includes(nextPage)) return;
    if (state.page === nextPage) return;

    const prev = $(`.panel.is-active`);
    const next = $(`.panel[data-page="${nextPage}"]`);
    if (!next) return;

    state.page = nextPage;

    if (prev) prev.classList.remove("is-active");
    next.classList.add("is-active");

    try {
      const id = next.getAttribute("id");
      if (id) window.location.hash = `#${id}`;
    } catch {}

    // Optional flourish if GSAP is available.
    const doGsap = window.gsap && !prefersReducedMotion();
    if (doGsap) {
      window.gsap.fromTo(
        next.querySelector(".card"),
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, ease: "power2.out" },
      );
    }
  }

  function celebrate(intensity = 1) {
    const c = window.confetti;
    if (typeof c !== "function") return;

    const base = {
      origin: { y: 0.8 },
      spread: 80,
      scalar: 1,
      gravity: 1.05,
      ticks: 220,
    };

    const burst = (particleCount, scalar) =>
      c({
        ...base,
        particleCount,
        scalar,
        colors: ["#ff4f9c", "#b06bff", "#ffffff", "#37d18a", "#34b3ff"],
      });

    burst(90 * intensity, 1.05);
    window.setTimeout(() => burst(60 * intensity, 0.95), 180);
    window.setTimeout(() => burst(40 * intensity, 0.85), 360);
  }

  function makeFallbackImageDataUrl() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#ffd6e7"/>
            <stop offset="0.55" stop-color="#ffffff"/>
            <stop offset="1" stop-color="#e9ddff"/>
          </linearGradient>
          <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#ff4f9c" flood-opacity=".18"/>
          </filter>
        </defs>
        <rect width="900" height="900" fill="url(#g)"/>
        <g filter="url(#s)" opacity=".95">
          <g transform="translate(450 445) rotate(45)">
            <rect x="-110" y="-110" width="220" height="220" rx="42" fill="#ff4f9c"/>
            <circle cx="-110" cy="0" r="110" fill="#ff4f9c"/>
            <circle cx="0" cy="-110" r="110" fill="#ff4f9c"/>
          </g>
          <text x="450" y="650" text-anchor="middle" font-family="ui-sans-serif,Segoe UI,Arial" font-size="54" fill="#2a2132" opacity=".85">
            Jheel 💖
          </text>
          <text x="450" y="720" text-anchor="middle" font-family="ui-sans-serif,Segoe UI,Arial" font-size="26" fill="#2a2132" opacity=".65">
            (Replace assets/puzzle.jpg with your photo)
          </text>
        </g>
        <g opacity=".35">
          ${Array.from({ length: 18 })
            .map((_, i) => {
              const x = 60 + (i * 47) % 820;
              const y = 90 + (i * 83) % 760;
              return `<circle cx="${x}" cy="${y}" r="${8 + (i % 4) * 3}" fill="#ffffff"/>`;
            })
            .join("")}
        </g>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  async function resolvePuzzleImageUrl() {
    const candidate = "./assets/jheel.jpeg";
    const fallback = makeFallbackImageDataUrl();
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.referrerPolicy = "no-referrer";
    img.src = candidate;

    await new Promise((resolve) => {
      const done = () => resolve();
      img.onload = done;
      img.onerror = done;
    });

    return img.complete && img.naturalWidth > 0 ? candidate : fallback;
  }

  function backgroundForPiece(pieceIndex, size, imageUrl) {
    const x = pieceIndex % size;
    const y = Math.floor(pieceIndex / size);
    const step = size === 1 ? 0 : 100 / (size - 1);
    return {
      backgroundImage: `url("${imageUrl}")`,
      backgroundPosition: `${x * step}% ${y * step}%`,
    };
  }

  function randomPermutation(n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function isSolved() {
    return state.puzzle.pieces.every((pieceIndex, pos) => pieceIndex === pos);
  }

  function clearPuzzleSelection() {
    state.puzzle.selectedPos = null;
    $$(".tile", puzzleGrid).forEach((t) => t.classList.remove("is-selected"));
  }

  function setDraggingClass(pos, on) {
    const el = $(`.tile[data-pos="${pos}"]`, puzzleGrid);
    if (!el) return;
    el.classList.toggle("is-dragging", on);
  }

  function setPuzzleStatus(text) {
    if (puzzleStatus) puzzleStatus.textContent = text ?? "";
  }

  function swapPositions(posA, posB) {
    const pieces = state.puzzle.pieces;
    [pieces[posA], pieces[posB]] = [pieces[posB], pieces[posA]];
    renderPuzzle();
  }

  function onTileTap(pos) {
    if (state.puzzle.locked) return;

    const selected = state.puzzle.selectedPos;
    if (selected === null) {
      state.puzzle.selectedPos = pos;
      const tile = $(`.tile[data-pos="${pos}"]`, puzzleGrid);
      tile?.classList.add("is-selected");
      return;
    }

    if (selected === pos) {
      clearPuzzleSelection();
      return;
    }

    swapPositions(selected, pos);
    clearPuzzleSelection();
    checkPuzzleSolved();
  }

  function attachDnD(tileEl) {
    tileEl.addEventListener("dragstart", (e) => {
      if (state.puzzle.locked) return;
      e.dataTransfer?.setData("text/plain", tileEl.dataset.pos ?? "");
      e.dataTransfer?.setDragImage?.(tileEl, 20, 20);
    });

    tileEl.addEventListener("dragover", (e) => {
      if (state.puzzle.locked) return;
      e.preventDefault();
    });

    tileEl.addEventListener("drop", (e) => {
      if (state.puzzle.locked) return;
      e.preventDefault();
      const from = Number(e.dataTransfer?.getData("text/plain"));
      const to = Number(tileEl.dataset.pos);
      if (!Number.isFinite(from) || !Number.isFinite(to)) return;
      if (from === to) return;
      swapPositions(from, to);
      clearPuzzleSelection();
      checkPuzzleSolved();
    });
  }

  function renderPuzzle() {
    if (!puzzleGrid) return;
    const { size, pieces, imageUrl } = state.puzzle;

    puzzleGrid.innerHTML = "";

    for (let pos = 0; pos < size * size; pos++) {
      const pieceIndex = pieces[pos];
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.draggable = false;
      tile.dataset.pos = String(pos);
      tile.setAttribute("aria-label", `Tile ${pos + 1}`);

      const bg = backgroundForPiece(pieceIndex, size, imageUrl);
      tile.style.backgroundImage = bg.backgroundImage;
      tile.style.backgroundPosition = bg.backgroundPosition;

      // Reliable on mobile: tap-to-swap only.
      tile.addEventListener("pointerdown", (e) => {
        // Avoid ghost-click/double-fire and improve touch reliability.
        e.preventDefault?.();
        onTileTap(pos);
      });
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") onTileTap(pos);
      });

      puzzleGrid.appendChild(tile);
    }
  }

  function shufflePuzzle() {
    if (state.puzzle.locked) return;
    const n = state.puzzle.size ** 2;

    let perm = randomPermutation(n);
    while (perm.every((v, i) => v === i)) perm = randomPermutation(n);

    state.puzzle.pieces = perm;
    clearPuzzleSelection();
    setPuzzleStatus("");
    renderPuzzle();
  }

  function checkPuzzleSolved() {
    if (!isSolved()) return;
    state.puzzle.locked = true;
    setPuzzleStatus("You solved it! 💖");
    celebrate(1.15);

    window.setTimeout(() => {
      state.puzzle.locked = false;
      setActivePage("message");
    }, 2600);
  }

  function placeNoButtonRandomly() {
    if (!proposalArea || !noBtn) return;
    const pad = 10;
    const areaRect = proposalArea.getBoundingClientRect();
    const btnRect = noBtn.getBoundingClientRect();

    const maxX = Math.max(pad, areaRect.width - btnRect.width - pad);
    const maxY = Math.max(pad, areaRect.height - btnRect.height - pad);
    const x = pad + Math.random() * (maxX - pad);
    const y = pad + Math.random() * (maxY - pad);

    noBtn.style.position = "absolute";
    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;

    if (window.gsap && !prefersReducedMotion()) {
      window.gsap.fromTo(noBtn, { scale: 0.96 }, { scale: 1, duration: 0.22, ease: "power2.out" });
    }
  }

  function growYesButton() {
    if (!yesBtn) return;
    const clicks = state.proposal.noClicks;
    const scale = Math.min(1 + clicks * 0.12, 1.85);
    yesBtn.style.transform = `scale(${scale})`;

    if (window.gsap && !prefersReducedMotion()) {
      window.gsap.fromTo(yesBtn, { scale: scale * 0.98 }, { scale, duration: 0.22, ease: "power2.out" });
    }
  }

  async function toggleMusic() {
    if (!bgMusic) return;
    try {
      if (!state.musicOn) {
        await bgMusic.play();
        state.musicOn = true;
        musicToggle?.setAttribute("aria-pressed", "true");
        if (musicLabel) musicLabel.textContent = "Music: On";
        showToast("Music on ♫");
      } else {
        bgMusic.pause();
        state.musicOn = false;
        musicToggle?.setAttribute("aria-pressed", "false");
        if (musicLabel) musicLabel.textContent = "Music: Off";
        showToast("Music off");
      }
    } catch {
      state.musicOn = false;
      musicToggle?.setAttribute("aria-pressed", "false");
      if (musicLabel) musicLabel.textContent = "Music: Off";
      showToast("Add music at assets/music.mp3 (then tap again)");
    }
  }

  function initMessageText() {
    const el = $("#specialMessage");
    if (!el) return;
    el.textContent =
      "Happy Birthday, Jheel. 💖\n\n" +
      "You’re the kind of person who makes ordinary days feel softer, brighter, and a little more magical. " +
      "I hope today wraps you in love, laughter, and every sweet thing you deserve.Jheel, you make my heart smile in ways I never knew were possible. With you, even the simplest moments feel special, and there’s a sense of happiness and calm I’ve never felt before. Here’s to us, to everything we’ve shared and all the beautiful adventures still waiting ahead.\n\n" +
      "Now… keep going. There’s one more question waiting for you.";
  }

  function initVideoFallback() {
    if (!finalVideo) return;
    const frame = finalVideo.closest(".video-frame");
    if (!frame) return;

    finalVideo.addEventListener("error", () => frame.classList.add("is-missing"));
    finalVideo.addEventListener("loadeddata", () => frame.classList.remove("is-missing"));

    window.setTimeout(() => {
      if (finalVideo.readyState === 0) frame.classList.add("is-missing");
    }, 900);
  }

  function initBackgroundMagic() {
    if (!floatingHearts || !sparkleLayer) return;
    const reduced = prefersReducedMotion();
    if (reduced) return;

    const spawnHeart = () => {
      const el = document.createElement("div");
      el.className = "float-heart";
      const size = 12 + Math.random() * 18;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.left = `${Math.random() * 100}%`;
      el.style.bottom = `-24px`;
      el.style.opacity = String(0.35 + Math.random() * 0.45);
      el.style.background = `rgba(255, 79, 156, ${0.22 + Math.random() * 0.18})`;
      floatingHearts.appendChild(el);

      const drift = (Math.random() * 2 - 1) * 60;
      const rise = 520 + Math.random() * 420;
      const rot = (Math.random() * 2 - 1) * 80;
      const duration = 5200 + Math.random() * 3200;

      el.animate(
        [
          { transform: `translate(0, 0) rotate(45deg)`, opacity: el.style.opacity },
          { transform: `translate(${drift}px, -${rise}px) rotate(${45 + rot}deg)`, opacity: 0 },
        ],
        { duration, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" },
      );

      window.setTimeout(() => el.remove(), duration + 50);
    };

    const spawnSpark = () => {
      const el = document.createElement("div");
      el.className = "spark";
      el.style.left = `${8 + Math.random() * 84}%`;
      el.style.top = `${10 + Math.random() * 78}%`;
      sparkleLayer.appendChild(el);

      const duration = 900 + Math.random() * 900;
      el.animate(
        [
          { transform: "scale(.6)", opacity: 0 },
          { transform: "scale(1)", opacity: 1, offset: 0.3 },
          { transform: "scale(.8)", opacity: 0 },
        ],
        { duration, easing: "ease-out", fill: "forwards" },
      );
      window.setTimeout(() => el.remove(), duration + 30);
    };

    window.setInterval(spawnHeart, 420);
    window.setInterval(spawnSpark, 520);
  }

  async function initPuzzle() {
    state.puzzle.imageUrl = await resolvePuzzleImageUrl();
    state.puzzle.pieces = Array.from({ length: state.puzzle.size ** 2 }, (_, i) => i);
    if (previewBox) {
      previewBox.style.backgroundImage = `url("${state.puzzle.imageUrl}")`;
    }
    renderPuzzle();
    shufflePuzzle();
  }

  function openPreview() {
    if (!previewModal) return;
    previewModal.classList.add("is-on");
    previewModal.setAttribute("aria-hidden", "false");
  }

  function closePreview() {
    if (!previewModal) return;
    previewModal.classList.remove("is-on");
    previewModal.setAttribute("aria-hidden", "true");
  }

  function wireEvents() {
    const goPuzzle = () => setActivePage("puzzle");

    // Mobile-friendly: some browsers can be finicky with `click` on animated buttons.
    welcomeHeart?.addEventListener("click", goPuzzle);
    welcomeHeart?.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        goPuzzle();
      },
      { passive: false },
    );
    welcomeHeart?.addEventListener("pointerup", goPuzzle);
    welcomeHeart?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") goPuzzle();
    });

    // Fallback: allow tapping the welcome card area too.
    const welcomePanel = document.querySelector('[data-page="welcome"]');
    welcomePanel?.addEventListener("pointerup", (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".topbar")) return;
      if (target.closest("#musicToggle")) return;
      if (target.closest("#welcomeHeart")) return; // already handled
      if (state.page === "welcome") goPuzzle();
    });

    shuffleBtn?.addEventListener("click", () => {
      shufflePuzzle();
      showToast("Shuffled ✨");
    });

    previewBtn?.addEventListener("click", () => {
      openPreview();
    });
    previewClose?.addEventListener("click", () => closePreview());
    previewModal?.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("[data-close='true']")) closePreview();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePreview();
    });

    toProposalBtn?.addEventListener("click", () => {
      setActivePage("proposal");
      window.setTimeout(() => placeNoButtonRandomly(), 260);
    });

    noBtn?.addEventListener("click", () => {
      if (state.proposal.done) return;
      state.proposal.noClicks += 1;
      placeNoButtonRandomly();
      growYesButton();
      showToast("Hehe… nice try 😌");
    });

    noBtn?.addEventListener("mouseenter", () => {
      if (state.proposal.done) return;
      placeNoButtonRandomly();
    });

    yesBtn?.addEventListener("click", () => {
      if (state.proposal.done) return;
      state.proposal.done = true;
      celebrate(1.35);
      if (proposalResult) {
        proposalResult.textContent = "Yeahhh, It's a date then 💖\nKnew you'd say yes 😌";
      }
      showToast("Yayyy! 💖");
      window.setTimeout(() => setActivePage("final"), 1800);
    });

    restartBtn?.addEventListener("click", () => {
      state.proposal.noClicks = 0;
      state.proposal.done = false;
      yesBtn.style.transform = "";
      noBtn.style.position = "";
      noBtn.style.left = "";
      noBtn.style.top = "";
      proposalResult.textContent = "";
      setActivePage("welcome");
      window.setTimeout(() => {
        shufflePuzzle();
        clearPuzzleSelection();
      }, 300);
    });

    musicToggle?.addEventListener("click", () => {
      toggleMusic();
    });

    window.addEventListener("resize", () => {
      if (state.page === "proposal") placeNoButtonRandomly();
    });
  }

  function init() {
    initMessageText();
    initVideoFallback();
    initBackgroundMagic();
    wireEvents();
    initPuzzle();

    // If user added video later, keep fallback accurate.
    if (finalVideo) {
      finalVideo.addEventListener("loadedmetadata", () => {
        finalVideo.closest(".video-frame")?.classList.remove("is-missing");
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
