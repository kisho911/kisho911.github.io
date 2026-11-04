// ─────────────────────────────────────────────────────────────
//  PixelGift public HUD: one clean glass bar.
//  height · 3 pickup chips (+ bunny/balloon when found) · challenge x/y
//  Ruxi's original HUD is untouched (hidden only in gifts).
//  Kotlin port: one LinearLayout bar, chips = ImageView + TextView.
// ─────────────────────────────────────────────────────────────
window.PGHUD = (() => {
  let root = null, on = false, last = {};
  const $ = (id) => document.getElementById(id);
  function build() {
    const st = document.createElement("style");
    st.textContent = `
#phud{position:absolute;left:0;right:0;top:calc(34*var(--dp));z-index:8000;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:calc(6*var(--dp))}
#phud.inv{visibility:hidden}
#phud .hgt{display:flex;align-items:baseline;gap:calc(6*var(--dp));color:#fff;font-size:calc(30*var(--dp));line-height:1;text-shadow:0 0 calc(4*var(--dp)) rgba(255,105,180,.75),0 calc(2*var(--dp)) calc(3*var(--dp)) rgba(0,0,0,.6)}
#phud .hgt small{font-size:calc(12*var(--dp));letter-spacing:.18em;color:#ffb3d9;text-shadow:none;opacity:.85}
#phud .bar{display:flex;align-items:center;gap:calc(4*var(--dp));padding:calc(4*var(--dp)) calc(6*var(--dp));border-radius:calc(30*var(--dp));
  background:rgba(14,3,26,.84);border:calc(1.5*var(--dp)) solid rgba(255,105,180,.42);box-shadow:0 calc(3*var(--dp)) calc(10*var(--dp)) rgba(0,0,0,.35)}
#phud .chip{display:flex;align-items:center;gap:calc(3*var(--dp));padding:0 calc(7*var(--dp)) 0 calc(2*var(--dp));min-width:calc(56*var(--dp))}
#phud .chip img{width:calc(34*var(--dp));height:calc(34*var(--dp));object-fit:contain}
#phud .chip img.px{image-rendering:pixelated}
#phud .chip b{font-weight:400;color:#fff;font-size:calc(19*var(--dp));min-width:calc(16*var(--dp));text-shadow:0 0 calc(3*var(--dp)) rgba(255,105,180,.6);font-variant-numeric:tabular-nums}
#phud .chip.off{display:none}
#phud .sep{width:calc(1.5*var(--dp));height:calc(24*var(--dp));background:rgba(255,105,180,.3)}
#phud .goal{display:flex;align-items:center;gap:calc(8*var(--dp));padding:calc(4*var(--dp)) calc(12*var(--dp)) calc(4*var(--dp)) calc(6*var(--dp));border-radius:calc(30*var(--dp));
  background:linear-gradient(90deg,rgba(60,14,90,.75),rgba(26,4,44,.7));border:calc(1.5*var(--dp)) solid rgba(200,150,255,.5)}
#phud .goal img{width:calc(30*var(--dp));height:calc(30*var(--dp));object-fit:contain}
#phud .goal .gt{color:#fff;font-size:calc(16*var(--dp));font-variant-numeric:tabular-nums;text-shadow:0 0 calc(3*var(--dp)) rgba(180,120,255,.8)}
#phud .goal .pb{width:calc(70*var(--dp));height:calc(6*var(--dp));border-radius:calc(4*var(--dp));background:rgba(255,255,255,.12);overflow:hidden}
#phud .goal .pb i{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#ff69b4,#b48cff);box-shadow:0 0 calc(6*var(--dp)) #ff69b4;transition:width .4s}
#hud.pubhide{display:none}`;
    document.head.appendChild(st);
    root = document.createElement("div"); root.id = "phud"; root.className = "inv";
    root.innerHTML = `<div class="hgt"><small>HEIGHT</small><span data-k="h">0</span></div>
      <div class="bar"><div class="chip" data-c="b"><img><b>0</b></div><div class="chip" data-c="c"><img><b>0</b></div><div class="chip" data-c="d"><img><b>0</b></div><div class="sep" data-c="sep"></div><div class="chip off" data-c="u"><img><b>0</b></div></div>
      <div class="goal"><img><span class="gt">0 / 5</span><span class="pb"><i></i></span></div>`;
    $("hud").parentNode.insertBefore(root, $("hud").nextSibling);
  }
  const q = (s) => root.querySelector(s);
  const pop = (el) => el.animate([{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 220, easing: "cubic-bezier(.34,1.56,.64,1)" });
  function setup(pub, S) {
    if (!root) build();
    on = !!pub; $("hud").classList.toggle("pubhide", on); root.style.display = on ? "" : "none";
    if (!on) return;
    [["b", "iBook"], ["c", "iCan"], ["d", "iCandy"], ["u", "iBunny"]].forEach(([k, id]) => {
      const im = q(`[data-c="${k}"] img`), src = $(id).src; im.src = src; im.classList.toggle("px", src.startsWith("data:"));
    });
    const L = S.currentLevel, g = q(".goal img");
    g.src = window.PGCHAL ? PGICONS.url(PGCHAL, { size: 96 }) : "assets/img/" + (L === 2 ? "item_moonstone" : L === 3 ? "planet3" : "hud_tarot") + ".webp";
    g.style.imageRendering = window.PGCHAL ? "pixelated" : "";
    last = {};
  }
  function update(S, target) {
    if (!on || !root) return;
    const set = (sel, v) => { const el = q(sel); if (String(last[sel]) !== String(v)) { const first = last[sel] === undefined; last[sel] = v; el.textContent = v; if (!first) pop(el.closest(".chip,.goal,.hgt") || el); } };
    q('[data-k="h"]').textContent = S.highHeight;
    set('[data-c="b"] b', S.bookCount); set('[data-c="c"] b', S.canCount); set('[data-c="d"] b', S.candyCount);
    const bun = !!S.bunnySeen; q('[data-c="u"]').classList.toggle("off", !bun); q('[data-c="sep"]').style.display = bun ? "" : "none";
    if (bun) { q('[data-c="u"] img').src = $("iBunny").src; set('[data-c="u"] b', S.bunnyCount); }
    set(".goal .gt", Math.min(S.tarotCount, target) + " / " + target);
    q(".goal .pb i").style.width = Math.min(100, S.tarotCount / target * 100) + "%";
  }
  function visible(v) { if (root) root.classList.toggle("inv", !v); }
  return { setup, update, visible };
})();
