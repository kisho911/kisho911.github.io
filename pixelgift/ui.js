// Shared DOM helpers: stage sizing, timers (Handler), Android-style view animations.
const $ = (id) => document.getElementById(id);
const OVERSHOOT = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const EASE_IO = "ease-in-out";

// ── stage: phone-shaped box. World is 1080px wide (a 1080p phone), 1dp = 2.625 world px.
const STAGE = { W: 1080, H: 2160, DP: 2.625, cssW: 411, cssH: 822 };
function layoutStage(firstTime) {
  const iw = window.innerWidth, ih = window.innerHeight;
  const portraitPhone = ih > iw && iw < 820;
  let worldH;
  if (portraitPhone) worldH = Math.round(1080 * ih / iw); else worldH = 2160;
  worldH = Math.max(1620, Math.min(2400, worldH));
  if (firstTime) STAGE.H = worldH;
  const aspect = STAGE.H / 1080;
  let w = iw, h = iw * aspect;
  if (h > ih) { h = ih; w = ih / aspect; }
  STAGE.cssW = w; STAGE.cssH = h;
  const st = $("stage");
  st.style.width = w + "px"; st.style.height = h + "px";
  st.style.setProperty("--dp", (w / (1080 / STAGE.DP)) + "px");
}
layoutStage(true);
// typing: the on-screen keyboard shrinks the window; don't re-fit the game to it (that looked like a zoom-out)
const typing = () => { const a = document.activeElement; return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA"); };
window.addEventListener("resize", () => { if (!typing()) layoutStage(false); });
document.addEventListener("focusout", () => setTimeout(() => { if (!typing()) { window.scrollTo(0, 0); layoutStage(false); } }, 250));
// no pinch / double-tap zoom anywhere (iOS ignores user-scalable=no)
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());


// ── Handler.postDelayed equivalent. clear() wipes everything when leaving a screen.
const T = {
  ids: new Set(),
  post(fn, ms) { const id = setTimeout(() => { T.ids.delete(id); fn(); }, ms || 0); T.ids.add(id); return id; },
  cancel(id) { if (id != null) { clearTimeout(id); T.ids.delete(id); } },
  clear() { T.ids.forEach(clearTimeout); T.ids.clear(); },
};

const anims = new WeakMap();
function popImage(el) {
  return el.animate([{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "scale(1)" }], { duration: 420, easing: OVERSHOOT, fill: "forwards" });
}
function startBreath(el) {
  stopBreath(el);
  const a = el.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.03)", opacity: .96 }], { duration: 1200, easing: EASE_IO, direction: "alternate", iterations: Infinity });
  anims.set(el, a);
}
function stopBreath(el) {
  const a = anims.get(el); if (a) { a.cancel(); anims.delete(el); }
  el.getAnimations().forEach(x => x.cancel());
}
function popHud(el) { if (el) el.animate([{ transform: "scale(1)" }, { transform: "scale(1.4)" }, { transform: "scale(1)" }], { duration: 180, easing: OVERSHOOT }); }
function fadeIn(el, ms) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms || 300, fill: "backwards" }); }
function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

// ── spell toast
let hideToastId = null;
function showSpellToast(msg, ms) {
  if (window.PGPUBLIC && window.POP) { POP.toast(msg, { ms: ms == null ? 3000 : Math.min(ms, 3500) }); return; }
  ms = ms == null ? (window.PGPUBLIC ? 3000 : 8800) : ms;
  const t = $("toast");
  t.innerHTML = "<span>" + esc(msg) + "</span>";
  t.classList.remove("hidden");
  t.firstChild.animate([{ opacity: 0, transform: "scale(.8)" }, { opacity: 1, transform: "scale(1)" }], { duration: 400, easing: OVERSHOOT });
  if (hideToastId) T.cancel(hideToastId);
  hideToastId = T.post(() => {
    const sp = t.firstChild; if (!sp) return;
    sp.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 550, fill: "forwards" }).onfinish = () => { if (t.firstChild === sp) t.classList.add("hidden"); };
  }, ms);
}
function hideToastNow() { if (hideToastId) T.cancel(hideToastId); hideToastId = null; $("toast").classList.add("hidden"); }
