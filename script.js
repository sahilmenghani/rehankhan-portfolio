/* ==========================================================
   VIDEO EDITOR PORTFOLIO — all content is local, no backend.
   ========================================================== */

/* ----------------------------------------------------------
   EDIT YOUR VIDEOS HERE.
   - video:       path to your file inside assets/videos/
   - poster:      path to a thumbnail inside assets/images/
   - orientation: "vertical" (9:16) or "horizontal" (16:9)
   Add or remove objects freely; the gallery rebuilds itself.
   ---------------------------------------------------------- */
const videoProjects = [
  { title: "Project One",   category: "Commercial",  video: "/videos/1.mp4", poster: "assets/images/project-01-poster.jpg", orientation: "vertical" },
  { title: "Project Two",   category: "Commercial",  video: "/videos/2.mp4", poster: "assets/images/project-02-poster.jpg", orientation: "horizontal" },
  { title: "Project Three", category: "Cinematic",   video: "/videos/3.mp4", poster: "assets/images/project-03-poster.jpg", orientation: "vertical" },
  { title: "Project Four",  category: "Cinematic", video: "/videos/4.mp4", poster: "assets/images/project-04-poster.jpg", orientation: "vertical" },
  { title: "Project Five",  category: "Cinematic",  video: "/videos/5.mp4", poster: "assets/images/project-05-poster.jpg", orientation: "vertical" },
  { title: "Project Six",   category: "Reels",       video: "/videos/6.mp4", poster: "assets/images/project-06-poster.jpg", orientation: "vertical" },
  { title: "Project Seven", category: "Commercial",  video: "/videos/7.mp4", poster: "assets/images/project-07-poster.jpg", orientation: "vertical" },
  { title: "Project Eight", category: "Cinematic",   video: "/videos/8.mp4", poster: "assets/images/project-08-poster.jpg", orientation: "vertical" },
  { title: "Project Nine", category: "Cinematic",   video: "/videos/9.mp4", poster: "assets/images/project-08-poster.jpg", orientation: "horizontal" },
  // { title: "Project Ten", category: "Commercial",   video: "/videos/10.mp4", poster: "assets/images/project-08-poster.jpg", orientation: "vertical" }

];

/* ---------------- helpers ---------------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const root = document.documentElement;

/* ---------------- preferences ---------------- */
const prefs = {
  sound: false,
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  accent: "crimson"
};
try {
  const saved = JSON.parse(localStorage.getItem("vp-prefs") || "null");
  if (saved) Object.assign(prefs, saved);
} catch (e) { /* storage unavailable, ignore */ }

function savePrefs() {
  try { localStorage.setItem("vp-prefs", JSON.stringify(prefs)); } catch (e) { /* ignore */ }
}

const accentNames = { crimson: "Crimson", cobalt: "Cobalt", silver: "Silver" };

function applyPrefs() {
  root.dataset.motion = prefs.reduced ? "reduced" : "full";
  root.dataset.accent = prefs.accent;
  $("#opt-sound").setAttribute("aria-checked", String(prefs.sound));
  $("#opt-motion").setAttribute("aria-checked", String(prefs.reduced));
  $$("[data-accent]", $("#options")).forEach(b => b.setAttribute("aria-checked", String(b.dataset.accent === prefs.accent)));
  $("#accent-name").textContent = accentNames[prefs.accent] || "Crimson";
}

/* ---------------- sound (tiny synth, no files) ---------------- */
let audioCtx = null;
function blip(freq = 520, dur = 0.06) {
  if (!prefs.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  } catch (e) { /* audio not available */ }
}

/* ---------------- toast ---------------- */
let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3800);
}

/* ---------------- scrolling ---------------- */
function goTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: prefs.reduced ? "auto" : "smooth", block: "start" });
}

/* ==========================================================
   GALLERY
   ========================================================== */
const gallery = $("#gallery");
const visible = new Set();   // cards currently on screen
let modalOpen = false;

function buildGallery() {
  gallery.innerHTML = "";
  videoProjects.forEach((p, i) => {
    const num = String(i + 1).padStart(2, "0");
    const card = document.createElement("figure");
    card.className = "card " + (p.orientation === "vertical" ? "vertical" : "horizontal");
    card.dataset.category = p.category;
    card.dataset.index = i;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card-btn";
    btn.setAttribute("aria-label", `Open video: ${p.title}, ${p.category}`);

    const ph = document.createElement("div");
    ph.className = "ph";
    ph.innerHTML = `<span>Placeholder ${num}</span><b></b>`;
    $("b", ph).textContent = p.video;

    const v = document.createElement("video");
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.preload = "none";
    v.tabIndex = -1;
    v.setAttribute("aria-hidden", "true");
    if (p.poster) v.dataset.poster = p.poster;
    v.dataset.src = p.video;

    const tag = document.createElement("span");
    tag.className = "play-tag";
    tag.setAttribute("aria-hidden", "true");
    tag.textContent = "▶";

    btn.append(ph, v, tag);

    const cap = document.createElement("figcaption");
    cap.innerHTML = `<span class="t"></span><span class="c"></span>`;
    $(".t", cap).textContent = `${num} · ${p.title}`;
    $(".c", cap).textContent = p.category;

    card.append(btn, cap);
    gallery.append(card);

    btn.addEventListener("click", () => openModal(p, btn));
    btn.addEventListener("mouseenter", () => blip(660, 0.03));
    loadObserver.observe(card);
    playObserver.observe(card);
  });
  $("#work-count").textContent = String(videoProjects.length).padStart(2, "0");
}

/* lazy-load: attach the video source only when the card is near the viewport */
const loadObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    loadPreview(e.target);
    loadObserver.unobserve(e.target);
  });
}, { rootMargin: "300px 0px" });

function loadPreview(card) {
  const v = $("video", card);
  if (!v || v.dataset.loaded) return;
  v.dataset.loaded = "1";
  if (v.dataset.poster) {
    // only use the poster if it actually exists
    const img = new Image();
    img.onload = () => { v.poster = v.dataset.poster; card.classList.add("has-poster"); };
    img.src = v.dataset.poster;
  }
  v.addEventListener("loadeddata", () => { card.classList.add("is-ready"); syncCard(card); }, { once: true });
  v.addEventListener("error", () => { card.classList.add("is-missing"); }, { once: true });
  v.src = v.dataset.src;
  v.load();
}

/* play only while visible; pause when off-screen, in modal, or reduced motion */
const playObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target);
    syncCard(e.target);
  });
}, { threshold: 0.4 });

function syncCard(card) {
  const v = $("video", card);
  if (!v || !card.classList.contains("is-ready")) return;
  const shouldPlay = visible.has(card) && !prefs.reduced && !modalOpen && !document.hidden;
  if (shouldPlay) {
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  } else {
    v.pause();
  }
}
function syncAll() { $$(".card", gallery).forEach(syncCard); }
document.addEventListener("visibilitychange", syncAll);

/* ---------------- filters ---------------- */
function buildFilters() {
  const wrap = $("#filters");
  const cats = ["All", ...new Set(videoProjects.map(p => p.category))];
  wrap.innerHTML = "";
  cats.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = c;
    b.setAttribute("aria-pressed", String(i === 0));
    b.addEventListener("click", () => {
      $$(".chip", wrap).forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      $$(".card", gallery).forEach(card => {
        card.hidden = !(c === "All" || card.dataset.category === c);
      });
      blip(440, 0.04);
    });
    wrap.append(b);
  });
}

/* ==========================================================
   MODAL (video lightbox) + OPTIONS PANEL
   ========================================================== */
const modal = $("#modal");
const modalVideo = $("#modal-video");
const modalStage = $("#modal-stage");
const modalMissing = $("#modal-missing");
let lastFocus = null;
let activeDialog = null;

function showDialog(el, focusEl) {
  lastFocus = document.activeElement;
  activeDialog = el;
  el.hidden = false;
  document.body.classList.add("locked");
  requestAnimationFrame(() => el.classList.add("open"));
  (focusEl || $("button", el)).focus();
}
function hideDialog(el) {
  el.classList.remove("open");
  const done = () => { el.hidden = true; };
  if (prefs.reduced) done(); else setTimeout(done, 250);
  document.body.classList.remove("locked");
  activeDialog = null;
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function openModal(project, trigger) {
  modalOpen = true;
  syncAll();
  $("#modal-title").textContent = project.title;
  $("#modal-cat").textContent = project.category;
  $("#modal-path").textContent = project.video;
  modalStage.classList.remove("is-missing");
  modalMissing.hidden = true;
  modalVideo.removeAttribute("poster");
  if (project.poster) modalVideo.poster = project.poster;
  modalVideo.src = project.video;
  modalVideo.load();
  showDialog(modal, $("#modal-close"));
  blip(780, 0.07);
  const p = modalVideo.play();
  if (p && p.catch) p.catch(() => {});
}
function closeModal() {
  modalVideo.pause();
  modalVideo.removeAttribute("src");
  modalVideo.load();
  modalOpen = false;
  hideDialog(modal);
  syncAll();
}
modalVideo.addEventListener("error", () => {
  if (!modalVideo.getAttribute("src")) return;
  modalStage.classList.add("is-missing");
  modalMissing.hidden = false;
});

$("#modal-close").addEventListener("click", closeModal);
$("[data-close]", modal).addEventListener("click", closeModal);

/* options */
const options = $("#options");
function openOptions() { showDialog(options, $("#options-close")); blip(600, 0.06); }
function closeOptions() { hideDialog(options); }
$("#options-close").addEventListener("click", closeOptions);
$("[data-close]", options).addEventListener("click", closeOptions);

$("#opt-sound").addEventListener("click", () => {
  prefs.sound = !prefs.sound; applyPrefs(); savePrefs(); blip(880, 0.08);
});
$("#opt-motion").addEventListener("click", () => {
  prefs.reduced = !prefs.reduced; applyPrefs(); savePrefs(); syncAll(); blip(500, 0.05);
});
$$("[data-accent]", options).forEach(b => b.addEventListener("click", () => {
  prefs.accent = b.dataset.accent; applyPrefs(); savePrefs(); blip(700, 0.05);
}));

/* Escape closes whichever dialog is open; Tab stays inside it */
document.addEventListener("keydown", (e) => {
  if (!activeDialog) return;
  if (e.key === "Escape") {
    e.preventDefault();
    activeDialog === modal ? closeModal() : closeOptions();
    return;
  }
  if (e.key === "Tab") {
    const f = $$("button, video[controls], [href], [tabindex]:not([tabindex='-1'])", activeDialog)
      .filter(el => !el.hidden && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ==========================================================
   HERO MENU
   ========================================================== */
const menuButtons = $$("#menu button");
const exitLines = [
  "There is no exit — the edit never ends. Let’s talk instead.",
  "Nice try. The timeline is still rolling. Say hello below."
];
let exitCount = 0;

function runAction(action) {
  blip(880, 0.08);
  if (action === "start") goTo("work");
  if (action === "options") openOptions();
  if (action === "exit") {
    goTo("contact");
    toast(exitLines[exitCount++ % exitLines.length]);
  }
}
menuButtons.forEach((b, i) => {
  b.addEventListener("click", () => runAction(b.dataset.action));
  b.addEventListener("mouseenter", () => { setActive(i); blip(560, 0.03); });
  b.addEventListener("focus", () => setActive(i));
});
function setActive(i) { menuButtons.forEach((b, j) => b.classList.toggle("is-active", i === j)); }
$("#menu").addEventListener("mouseleave", () => setActive(-1));

$("#menu").addEventListener("keydown", (e) => {
  const i = menuButtons.indexOf(document.activeElement);
  if (i < 0) return;
  if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); menuButtons[(i + 1) % menuButtons.length].focus(); blip(560, 0.03); }
  if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); menuButtons[(i - 1 + menuButtons.length) % menuButtons.length].focus(); blip(560, 0.03); }
});

/* ==========================================================
   NAV: active section + reveal on scroll
   ========================================================== */
const navLinks = $$(".pill-nav a");
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle("is-active", a.dataset.section === e.target.id));
  });
}, { rootMargin: "-45% 0px -50% 0px" });
["home", "work", "about", "contact"].forEach(id => sectionObserver.observe(document.getElementById(id)));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); revealObserver.unobserve(e.target); } });
}, { threshold: 0.12 });
$$(".reveal").forEach(el => revealObserver.observe(el));

/* portrait fallback if image is missing */
(function () {
  const wrap = $("#portrait");
  const img = $("img", wrap);
  const miss = () => wrap.classList.add("is-missing");
  img.addEventListener("error", miss);
  if (img.complete && img.naturalWidth === 0) miss();
})();

/* profile photo (About) fallback if image is missing */
(function () {
  const wrap = $("#profile-photo");
  if (!wrap) return;
  const img = $("img", wrap);
  const miss = () => wrap.classList.add("is-missing");
  img.addEventListener("error", miss);
  if (img.complete && img.naturalWidth === 0) miss();
})();

/* ---------------- init ---------------- */
$("#year").textContent = new Date().getFullYear();
applyPrefs();
buildFilters();
buildGallery();