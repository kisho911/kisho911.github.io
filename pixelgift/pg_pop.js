// ─────────────────────────────────────────────────────────────
//  PixelGift pop-ups (public gifts). Two kinds only:
//   • POP.toast(text, {icon, ms})  small, never pauses, newest wins
//   • POP.card({img, title, text, from, hint, tint}) → Promise
//       pauses-style modal, ONE tap closes (0.45 s guard), queued
//  Plus POP.digiColors() for the CRT terminal's random palette.
//  Kotlin port: PopupManager { toast(); card(onClose) ; queue }.
// ─────────────────────────────────────────────────────────────
window.POP = (() => {
  const PAL = [
    { c: "#ff69b4", g: "rgba(255,105,180,.9)", bg: "rgba(26,2,18,.93)" },
    { c: "#b48cff", g: "rgba(160,110,255,.9)", bg: "rgba(14,4,30,.93)" },
    { c: "#5ad1ff", g: "rgba(70,190,255,.9)", bg: "rgba(2,14,28,.93)" },
    { c: "#ffd36a", g: "rgba(255,200,80,.85)", bg: "rgba(26,16,2,.93)" },
  ];
  let css = false, open = false, tEl = null, tTimer = 0;
  const queue = [];
  const $g = () => document.getElementById("game") || document.body;

  function style() {
    if (css) return; css = true;
    const s = document.createElement("style");
    s.textContent = `
.pgcardOv{position:absolute;inset:0;z-index:25000;display:flex;align-items:center;justify-content:center;background:rgba(8,0,18,.72);backdrop-filter:blur(calc(2*var(--dp)));-webkit-backdrop-filter:blur(calc(2*var(--dp)))}
.pgcard{position:relative;width:calc(300*var(--dp));max-width:86%;padding:calc(22*var(--dp)) calc(20*var(--dp)) calc(18*var(--dp));border-radius:calc(22*var(--dp));text-align:center;color:#fff;
  background:linear-gradient(180deg,rgba(46,12,70,.96),rgba(18,4,32,.97));border:calc(2*var(--dp)) solid var(--t,#ff69b4);box-shadow:0 0 calc(18*var(--dp)) var(--tg,rgba(255,105,180,.55)),inset 0 0 calc(24*var(--dp)) rgba(255,255,255,.04)}
.pgcard img,.pgcard canvas{display:block;margin:0 auto calc(10*var(--dp));max-width:72%;max-height:calc(190*var(--dp));object-fit:contain;filter:drop-shadow(0 0 calc(10*var(--dp)) var(--tg,rgba(255,105,180,.5)))}
.pgcard img.px{image-rendering:pixelated;width:calc(110*var(--dp));height:calc(110*var(--dp))}
.pgcard .ti{font-size:calc(22*var(--dp));color:var(--t,#ff69b4);text-shadow:0 0 calc(6*var(--dp)) var(--tg,rgba(255,105,180,.6));margin-bottom:calc(6*var(--dp));line-height:1.2}
.pgcard .tx{font-size:calc(17*var(--dp));line-height:1.45;color:#fff;white-space:pre-line}
.pgcard .fr{font-size:calc(13*var(--dp));color:#ffd1e6aa;margin-top:calc(10*var(--dp))}
.pgcard .hn{font-size:calc(12*var(--dp));letter-spacing:.14em;color:#ffffff77;margin-top:calc(14*var(--dp));opacity:0;transition:opacity .3s}
.pgcard .hn.on{opacity:1}
.pgtoast{position:absolute;left:50%;top:calc(232*var(--dp));transform:translateX(-50%);z-index:24000;pointer-events:none;display:flex;align-items:center;gap:calc(8*var(--dp));
  max-width:calc(100% - 40*var(--dp));padding:calc(8*var(--dp)) calc(16*var(--dp));border-radius:calc(30*var(--dp));background:rgba(20,4,34,.82);border:calc(1.5*var(--dp)) solid rgba(255,105,180,.7);
  box-shadow:0 0 calc(12*var(--dp)) rgba(255,105,180,.35);color:#fff;font-size:calc(16*var(--dp));line-height:1.25;text-align:center;white-space:pre-line}
.pgtoast img{width:calc(26*var(--dp));height:calc(26*var(--dp));object-fit:contain;image-rendering:pixelated;flex:none}`;
    document.head.appendChild(s);
  }

  // ── toast ──
  function toast(text, o) {
    style(); o = o || {};
    if (tEl) { tEl.remove(); tEl = null; } clearTimeout(tTimer);
    const t = document.createElement("div"); t.className = "pgtoast";
    if (o.icon) { const i = new Image(); i.src = o.icon; t.appendChild(i); }
    const sp = document.createElement("span"); sp.textContent = text; t.appendChild(sp);
    $g().appendChild(t); tEl = t;
    t.animate([{ opacity: 0, transform: "translateX(-50%) scale(.85)" }, { opacity: 1, transform: "translateX(-50%) scale(1)" }], { duration: 300, easing: "cubic-bezier(.34,1.56,.64,1)" });
    tTimer = setTimeout(() => { const a = t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }); a.onfinish = () => { t.remove(); if (tEl === t) tEl = null; }; }, o.ms || 2600);
  }

  // ── card ──
  function card(o) { return new Promise((res) => { queue.push([o || {}, res]); if (!open) next(); }); }
  function next() {
    const it = queue.shift(); if (!it) { open = false; return; }
    open = true; style();
    const [o, res] = it;
    const ov = document.createElement("div"); ov.className = "pgcardOv";
    const c = document.createElement("div"); c.className = "pgcard";
    const p = o.tint ? PAL[o.tint === "random" ? Math.floor(Math.random() * PAL.length) : o.tint] : PAL[0];
    c.style.setProperty("--t", p.c); c.style.setProperty("--tg", p.g);
    if (o.img) {
      let im;
      if (o.img instanceof HTMLCanvasElement) im = o.img;
      else { im = new Image(); im.src = o.img; if (o.pixel) im.className = "px"; }
      c.appendChild(im);
    }
    if (o.title) { const d = document.createElement("div"); d.className = "ti"; d.textContent = o.title; c.appendChild(d); }
    if (o.text) { const d = document.createElement("div"); d.className = "tx"; d.textContent = o.text; c.appendChild(d); }
    if (o.from) { const d = document.createElement("div"); d.className = "fr"; d.textContent = o.from; c.appendChild(d); }
    const hn = document.createElement("div"); hn.className = "hn"; hn.textContent = o.hint || "tap to continue"; c.appendChild(hn);
    ov.appendChild(c); $g().appendChild(ov);
    c.animate([{ opacity: 0, transform: "scale(.82)" }, { opacity: 1, transform: "scale(1)" }], { duration: 380, easing: "cubic-bezier(.34,1.56,.64,1)" });
    let ready = false; setTimeout(() => { ready = true; hn.classList.add("on"); }, 450);
    const close = (e) => {
      if (e) e.stopPropagation();
      if (!ready) return; ready = false;
      const a = ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" });
      a.onfinish = () => { ov.remove(); open = false; res(); setTimeout(next, 120); };
    };
    ov.style.cursor = "pointer";                     // iOS only sends taps to "clickable" things
    ov.addEventListener("click", close); ov.addEventListener("pointerup", close); ov.addEventListener("touchend", (e) => { e.preventDefault(); close(e); });
    ov.addEventListener("pointerdown", (e) => e.stopPropagation());
  }
  function clear() { queue.length = 0; document.querySelectorAll(".pgcardOv,.pgtoast").forEach((e) => e.remove()); open = false; tEl = null; }
  const isOpen = () => open;
  const digiColors = () => PAL[Math.floor(Math.random() * PAL.length)];
  return { toast, card, clear, isOpen, digiColors, PAL };
})();
