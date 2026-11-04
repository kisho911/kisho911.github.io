// LauncherActivity + CollectiblesActivity
window.LAUNCHER = (() => {
  const D = window.PG_DATA, IMG = (n) => "assets/img/" + n + ".webp";
  const dpx = () => parseFloat(getComputedStyle($("stage")).getPropertyValue("--dp")) || 1;
  let solarRAF = 0, solarPaused = false, pageTimers = [];

  function show() { $("collect").classList.add("hidden"); $("launcher").classList.remove("hidden"); }

  document.querySelectorAll("#launcher .card").forEach(card => {
    card.addEventListener("click", () => {
      AUDIO.unlock(); window.PGFLOW && PGFLOW.restoreRuxi();
      const mode = card.dataset.mode;
      if (mode === "collect") { openCollectibles(); return; }
      if (mode === "create") { PGONE.open(); return; }
      $("launcher").classList.add("hidden");
      RUXI.enterGame(mode);
    });
  });

  // ── collectibles ("sacred space") ──
  function overlay(bg, content, hintPurple, onClose) {
    const o = h("div", "cov"); o.style.background = bg;
    if (content) o.appendChild(content);
    const hint = h("div", "ovhint" + (hintPurple ? " purple" : ""), "tap to close"); o.appendChild(hint);
    solarPaused = true;
    o.onclick = () => { o.remove(); solarPaused = false; if (onClose) onClose(); };
    $("collect").appendChild(o); o.style.top = $("collect").scrollTop + "px"; o.style.height = $("collect").clientHeight + "px"; o.style.bottom = "auto";
    fadeIn(o, 300); return o;
  }
  const breathe = (el, dur) => {
    el.animate([{ transform: "translateY(-8px)" }, { transform: "translateY(8px)" }], { duration: dur, iterations: Infinity, direction: "alternate", easing: EASE_IO, composite: "add" });
    el.animate([{ opacity: .88 }, { opacity: 1 }], { duration: dur - 400, iterations: Infinity, direction: "alternate", easing: EASE_IO });
  };
  function imgEl(src, css) { const i = h("img"); i.src = src; if (css) i.style.cssText = css; return i; }
  function txt(t, css) { const d = h("div", null, esc(t)); d.style.cssText = css; return d; }

  function openCollectibles() {
    const c = $("collect"); c.innerHTML = ""; c.scrollTop = 0;
    $("launcher").classList.add("hidden"); c.classList.remove("hidden");
    const found = new Set(PREFS.get("bottle_found", [])), planets = new Set(PREFS.get("planet_found", []));
    const back = h("div", "cback", "← back"); back.onclick = () => { cancelAnimationFrame(solarRAF); c.classList.add("hidden"); show(); };
    c.appendChild(back);
    const pad = h("div", "cpad"); c.appendChild(pad);

    // 1. heart
    const heart = imgEl(IMG("moon_start-full"), ""); heart.className = "cheart";
    heart.onclick = () => { const im = imgEl(IMG("moon_start-full"), "max-width:calc(100% - 48*var(--dp));max-height:calc(100% - 48*var(--dp));object-fit:contain"); breathe(im, 2200); overlay("rgba(5,0,15,.96)", im); };
    pad.appendChild(heart);

    // 2. collage
    const col = h("div", "collage"); pad.appendChild(col);
    const cw = () => col.clientWidth / dpx();
    const place = (el, l, t, s) => { el.style.left = `calc(${l}*var(--dp))`; el.style.top = `calc(${t}*var(--dp))`; el.style.width = el.style.height = `calc(${s}*var(--dp))`; };
    const kisho = imgEl(IMG("christianplayer0")); col.appendChild(kisho);
    kisho.style.left = "50%"; kisho.style.top = "calc(50*var(--dp))"; kisho.style.width = kisho.style.height = "calc(110*var(--dp))"; kisho.style.marginLeft = "calc(-55*var(--dp))";
    kisho.animate([{ transform: "translateY(-6px) scale(.98)" }, { transform: "translateY(6px) scale(1.02)" }], { duration: 2800, iterations: Infinity, direction: "alternate", easing: EASE_IO });
    kisho.onclick = showKiss;
    const ms = imgEl(IMG("item_moonstone")); col.appendChild(ms); ms.style.width = ms.style.height = "calc(44*var(--dp))"; ms.style.zIndex = 3;
    ms.onclick = showMoonstone;
    const addPair = (ruxy, soph, label, l, t, bs) => {
      const mirror = label === "city" || label === "space";
      const r = imgEl(IMG(ruxy)); place(r, l, t, 85); if (mirror) r.style.transform = "scaleX(-1)";
      const s = imgEl(IMG(soph)); place(s, l + 76, t + 8, bs || 80); s.style.transform = "scaleX(-1)";
      r.onclick = s.onclick = () => showPair(ruxy, soph, mirror);
      col.append(r, s);
    };
    requestAnimationFrame(() => {
      const dW = Math.trunc(cw());
      addPair("player", "item_bunny", "city", 2, 30);
      addPair("player_coral", "item_bunny_coral_2", "beach", dW - 155, 30, 110);
      addPair("playerspace", "sophiespace0", "space", Math.trunc(dW / 2) - 72, 190);
    });

    // 3. messages from the shore
    pad.appendChild(h("div", "divider"));
    const bh = h("div", "bh"); bh.append(imgEl(IMG("item_candy_coral")), txt("messages from the shore", ""), txt(`${found.size} / 23`, ""));
    bh.children[1].className = "t"; bh.children[2].className = "n"; pad.appendChild(bh);
    const grid = h("div", "bgrid");
    for (let i = 0; i < 23; i++) {
      const cell = h("div", "bcell" + (found.has(i) ? " found" : "")); cell.appendChild(imgEl(IMG("item_candy_coral")));
      if (found.has(i)) cell.onclick = () => showMessage(i);
      grid.appendChild(cell);
    }
    pad.appendChild(grid);
    if (found.size >= 23) pad.appendChild(lateText("you found them all. i wrote these for you and only you. i hope you felt every one.", 17, "rgba(255,105,180,.86)", 400, 2000));

    // 4. solar system
    pad.appendChild(h("div", "divider"));
    pad.appendChild(h("div", "sect", "the solar system"));
    pad.appendChild(txt(`  ${planets.size} / 9`, "font-size:calc(13*var(--dp));color:rgba(160,60,255,.55);text-align:center;margin-bottom:calc(4*var(--dp))"));
    pad.appendChild(buildSolar(planets));
    if (planets.size >= 9) pad.appendChild(lateText("you mapped the whole sky. every planet knows your name now.", 15, "rgba(160,80,255,.78)", 600, 2000));

    // 5. moon phases
    pad.appendChild(h("div", "divider"));
    pad.appendChild(h("div", "sect", "the moon cycle"));
    const ph = h("div", "phases"); const arc = [-8, -4, 0, 2, 2, 0, -4, -8];
    for (let i = 0; i < 8; i++) {
      const im = imgEl(IMG("test" + (i + 1))); im.style.marginTop = `calc(${arc[i] + 10}*var(--dp))`;
      im.onclick = () => {
        const box = h("div"); box.style.cssText = "display:flex;flex-direction:column;align-items:center";
        const big = imgEl(IMG("test" + (i + 1)), "width:calc(220*var(--dp));height:calc(220*var(--dp));object-fit:contain;margin-top:calc(-40*var(--dp))"); breathe(big, 2500);
        box.append(big, txt(D.moonPhaseNames[i], "font-size:calc(18*var(--dp));color:rgba(180,100,255,.78);text-shadow:0 0 calc(6*var(--dp)) rgba(180,60,255,.6);margin-top:calc(20*var(--dp))"));
        overlay("rgba(5,0,15,.94)", box, true);
      };
      ph.appendChild(im);
    }
    pad.appendChild(ph);

    // 6. tarot
    pad.appendChild(h("div", "divider"));
    pad.appendChild(h("div", "sect", "the tarot"));
    const tr = h("div", "tarots"); tr.style.marginBottom = "calc(24*var(--dp))";
    const rots = [-12, -6, 0, 6, 12], yOff = [6, 2, 0, 2, 6];
    for (let i = 0; i < 5; i++) {
      const im = imgEl(IMG("item_tarot_" + i)); im.style.transform = `rotate(${rots[i]}deg)`; im.style.marginTop = `calc(${yOff[i] + 4}*var(--dp))`;
      im.onclick = () => {
        const box = h("div"); box.style.cssText = "display:flex;flex-direction:column;align-items:center";
        const big = imgEl(IMG("item_tarot_" + i + "-full"), "width:calc(240*var(--dp));height:calc(340*var(--dp));object-fit:contain;margin-top:calc(-30*var(--dp))"); breathe(big, 2800);
        box.append(big, txt(`card ${i + 1} of 5`, "font-size:calc(18*var(--dp));color:rgba(255,105,180,.78);text-shadow:0 0 calc(6*var(--dp)) rgba(255,60,180,.6);margin-top:calc(10*var(--dp))"));
        overlay("rgba(5,0,15,.94)", box);
      };
      tr.appendChild(im);
    }
    pad.appendChild(tr);

    // 7. ultimate secret
    if (found.size >= 23 && planets.size >= 9) {
      pad.appendChild(h("div", "divider"));
      pad.appendChild(lateText("you found everything in this world ✨", 16, "rgba(255,180,220,.94)", 800, 3000));
    }
    // stats
    const totalH = PREFS.get("total_height_climbed", 0), totalG = PREFS.get("total_games_played", 0);
    if (totalG > 0) { pad.appendChild(h("div", "divider")); pad.appendChild(txt(`you've climbed ${totalH.toLocaleString("en-US")} total across ${totalG} runs`, "font-size:calc(12*var(--dp));color:rgba(255,105,180,.4);text-align:center;margin-top:calc(8*var(--dp))")); }
    // hidden bottom
    const sp = h("div"); sp.style.height = "calc(60*var(--dp))"; pad.appendChild(sp);
    const hr = h("div"); hr.style.cssText = "display:flex;justify-content:center;margin-bottom:calc(16*var(--dp));cursor:pointer";
    hr.append(imgEl(IMG("player"), "width:calc(60*var(--dp));height:calc(60*var(--dp));object-fit:contain;margin-right:calc(20*var(--dp))"), imgEl(IMG("christianplayer0"), "width:calc(60*var(--dp));height:calc(60*var(--dp));object-fit:contain"));
    hr.onclick = showConstellation; pad.appendChild(hr);

    // moonstone orbit
    const t0 = performance.now();
    const loop = (t) => {
      if (c.classList.contains("hidden")) return;
      const u = dpx(), cx = col.clientWidth / 2, cy = 105 * u, oR = 65 * u, s = 44 * u, ang = ((t - t0) / 8000) * Math.PI * 2;
      ms.style.left = (cx + oR * Math.cos(ang) - s / 2) + "px"; ms.style.top = (cy + oR * Math.sin(ang) - s / 2) + "px";
      solarTick(t);
      solarRAF = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(solarRAF); solarRAF = requestAnimationFrame(loop);
  }
  function lateText(t, size, color, delay, dur) {
    const d = txt(t, `font-size:calc(${size}*var(--dp));color:${color};text-shadow:0 0 calc(7*var(--dp)) rgba(255,105,180,.55);text-align:center;padding:calc(16*var(--dp)) calc(24*var(--dp));line-height:1.5;opacity:0`);
    d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, delay, fill: "forwards" }); return d;
  }

  // solar system
  let solar = null;
  function buildSolar(found) {
    const box = h("div", "solar"); box.style.width = box.style.height = "calc(100%)"; box.style.aspectRatio = "1";
    const cv = h("canvas"); box.appendChild(cv);
    const sun = h("div", "sun"); box.appendChild(sun);
    const radii = [0.10, 0.16, 0.22, 0.28, 0.35, 0.41, 0.46, 0.48, 0.49], speeds = [4700, 7500, 10000, 18800, 32000, 55000, 84000, 165000, 248000], sizes = [18, 22, 24, 22, 36, 32, 28, 26, 16];
    const ps = radii.map((r, i) => {
      const im = imgEl(IMG("planet" + (i + 1))); im.style.opacity = found.has(i) ? 1 : 0.25; im.style.zIndex = 20 + i;
      if (found.has(i)) im.onclick = () => {
        const b = h("div"); b.style.cssText = "display:flex;flex-direction:column;align-items:center";
        const big = imgEl(IMG("planet" + (i + 1) + "-full"), "width:calc(180*var(--dp));height:calc(180*var(--dp));object-fit:contain;margin-top:calc(-40*var(--dp))"); breathe(big, 2000);
        b.append(big, txt(D.planetNames[i], "font-size:calc(28*var(--dp));color:rgb(180,100,255);text-shadow:0 0 calc(8*var(--dp)) rgba(180,60,255,.7);margin-top:calc(20*var(--dp))"),
          txt(D.planetFacts[i], "font-size:calc(16*var(--dp));color:rgba(255,200,255,.7);text-align:center;line-height:1.4;margin:calc(14*var(--dp)) calc(40*var(--dp)) 0"));
        overlay("rgba(5,0,20,.9)", b, true);
      };
      box.appendChild(im); return { im, r, sp: speeds[i], sz: sizes[i], sa: (i * 40) * Math.PI / 180 };
    });
    solar = { box, cv, sun, ps, t0: performance.now(), drawn: 0 };
    sun.animate([{ transform: "scale(.9)" }, { transform: "scale(1.1)" }], { duration: 1800, iterations: Infinity, direction: "alternate", easing: EASE_IO });
    return box;
  }
  function solarTick(t) {
    if (!solar || solarPaused) return;
    const size = solar.box.clientWidth; if (!size) return;
    const u = dpx(), center = size / 2;
    if (solar.drawn !== size) {
      solar.drawn = size; const cv = solar.cv, r = window.devicePixelRatio || 1; cv.width = size * r; cv.height = size * r;
      const x = cv.getContext("2d"); x.scale(r, r); x.strokeStyle = "rgba(180,120,255,.16)"; x.lineWidth = 1;
      solar.ps.forEach(p => { x.beginPath(); x.arc(center, center, center * p.r * 2, 0, Math.PI * 2); x.stroke(); });
      const ss = 52 * u; Object.assign(solar.sun.style, { width: ss + "px", height: ss + "px", left: (center - ss / 2) + "px", top: (center - ss / 2) + "px" });
    }
    solar.ps.forEach(p => {
      const px = p.sz * u, oRad = center * p.r * 2, ang = ((t - solar.t0) / p.sp) * Math.PI * 2 + p.sa;
      Object.assign(p.im.style, { width: px + "px", height: px + "px", left: (center + oRad * Math.cos(ang) - px / 2) + "px", top: (center + oRad * Math.sin(ang) - px / 2) + "px" });
    });
  }

  function showPair(ruxy, soph, mirror) {
    const row = h("div"); row.style.cssText = "display:flex;align-items:center;justify-content:center";
    const r = imgEl(IMG(ruxy), "width:calc(200*var(--dp));height:calc(200*var(--dp));object-fit:contain;margin-right:calc(4*var(--dp))");
    const s = imgEl(IMG(soph), "width:calc(180*var(--dp));height:calc(180*var(--dp));object-fit:contain");
    const wr = h("div"), ws = h("div"); wr.appendChild(r); ws.appendChild(s); row.append(wr, ws);
    r.style.transform = mirror ? "scaleX(-1)" : ""; s.style.transform = "scaleX(-1)";
    wr.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1)" }], { duration: 500, easing: OVERSHOOT, fill: "backwards" }).onfinish = () => breathe(wr, 2800);
    ws.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1)" }], { duration: 500, delay: 150, easing: OVERSHOOT, fill: "backwards" }).onfinish = () => breathe(ws, 3200);
    const shake = txt("✦ shake to tumble ✦", "position:absolute;left:0;right:0;bottom:calc(90*var(--dp));text-align:center;font-size:calc(15*var(--dp));color:rgba(255,105,180,.7);text-shadow:0 0 calc(5*var(--dp)) rgba(255,105,180,.47)");
    const box = h("div"); box.append(row);
    let last = 0;
    const onMotion = (e) => {
      const a = e.accelerationIncludingGravity; if (!a) return;
      const f = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
      if (f > 18 && Date.now() - last > 2000) {
        last = Date.now();
        r.animate([{ rotate: "0deg", translate: "0 0" }, { rotate: (180 + Math.random() * 180) + "deg", translate: `${-50 + Math.random() * 100}px ${-40 + Math.random() * 80}px` }, { rotate: (360 + Math.random() * 180) + "deg", translate: "0 0" }], { duration: 800 });
        s.animate([{ rotate: "0deg", translate: "0 0" }, { rotate: (-180 - Math.random() * 180) + "deg", translate: `${-50 + Math.random() * 100}px ${-40 + Math.random() * 80}px` }, { rotate: (-360 - Math.random() * 180) + "deg", translate: "0 0" }], { duration: 900 });
      }
    };
    window.addEventListener("devicemotion", onMotion);
    const o = overlay("rgba(5,0,15,.94)", box, false, () => window.removeEventListener("devicemotion", onMotion));
    o.appendChild(shake);
  }
  function showMoonstone() {
    const wrap = h("div"); wrap.style.cssText = "position:relative;width:calc(250*var(--dp));height:calc(250*var(--dp))";
    const im = imgEl(IMG("item_moonstone-full"), "width:100%;height:100%;object-fit:contain");
    const sh = h("div"); sh.id = ""; sh.style.cssText = `position:absolute;inset:0;background:linear-gradient(135deg,transparent 0%,transparent 33%,rgba(115,169,194,.56) 40%,rgba(89,0,255,.82) 50%,rgba(250,194,163,.69) 60%,transparent 67%,transparent 100%);background-size:300% 300%;-webkit-mask:url("${IMG("item_moonstone-full")}") center/contain no-repeat;mask:url("${IMG("item_moonstone-full")}") center/contain no-repeat`;
    sh.animate([{ backgroundPosition: "100% 100%" }, { backgroundPosition: "0% 0%" }], { duration: 4500, iterations: Infinity });
    wrap.append(im, sh);
    const o = overlay("rgba(5,0,15,.96)", wrap);
    o.querySelector(".ovhint").textContent = "tilt your phone to see the light";
  }
  function showKiss() {
    const box = h("div"); box.style.cssText = "display:flex;flex-direction:column;align-items:center";
    const t = txt("✨", "font-size:calc(22*var(--dp));color:#FF69B4;text-shadow:0 0 calc(9*var(--dp)) rgba(255,105,180,.78);margin-bottom:calc(20*var(--dp))");
    const im = imgEl("", "width:calc(200*var(--dp));height:calc(200*var(--dp));object-fit:contain");
    box.append(t, im);
    const frames = ["drill_handoff", "drill_kiss", "drill_handoff_coral", "drill_kiss_coral"]; let i = 0, id = 0;
    const cyc = () => { im.src = IMG(frames[i % 4]); im.animate([{ transform: "scale(.9)" }, { transform: "scale(1)" }], { duration: 300, easing: OVERSHOOT }); i++; id = setTimeout(cyc, 1200); };
    cyc();
    overlay("rgba(5,0,15,.94)", box, false, () => clearTimeout(id));
  }
  function showMessage(i) {
    const card = h("div"); card.style.cssText = "margin:0 calc(32*var(--dp));min-height:calc(320*var(--dp));background:rgba(255,248,220,.78);display:flex;align-items:center;justify-content:center;align-self:stretch";
    card.appendChild(txt(D.bottleMessages[i], "font:italic calc(20*var(--dp))/1.5 Georgia,serif;color:rgb(60,20,80);text-align:center;padding:calc(40*var(--dp)) calc(32*var(--dp))"));
    overlay("rgba(10,0,25,.94)", card);
  }
  function showConstellation() {
    const box = h("div"); box.style.cssText = "position:absolute;inset:0";
    const cv = h("canvas"); cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%"; box.appendChild(cv);
    requestAnimationFrame(() => {
      const w = cv.clientWidth, hh = cv.clientHeight, r = window.devicePixelRatio || 1; cv.width = w * r; cv.height = hh * r;
      const x = cv.getContext("2d"); x.scale(r, r);
      const cx = w / 2, cy = hh / 2, s = w * 0.3;
      const pts = [[0, -.3], [-.25, -.6], [-.5, -.5], [-.55, -.2], [-.4, .1], [-.2, .35], [0, .55], [.2, .35], [.4, .1], [.55, -.2], [.5, -.5], [.25, -.6]].map(([a, b]) => [cx + a * s, cy + b * s]);
      x.strokeStyle = "rgba(180,100,255,.24)"; x.lineWidth = 1;
      pts.forEach((p, i) => { const n = pts[(i + 1) % pts.length]; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(n[0], n[1]); x.stroke(); });
      pts.forEach(([a, b]) => { x.fillStyle = "rgba(255,105,180,.16)"; x.beginPath(); x.arc(a, b, 3, 0, 7); x.fill(); x.fillStyle = "rgba(255,200,255,.86)"; x.beginPath(); x.arc(a, b, 1.2, 0, 7); x.fill(); });
      let seed = 42; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(200,180,255,${(rnd() * 80 + 40) / 255})`; x.beginPath(); x.arc(rnd() * w, rnd() * hh, 0.7, 0, 7); x.fill(); }
    });
    const her = imgEl(IMG("player"), "position:absolute;left:50%;top:50%;width:calc(120*var(--dp));height:calc(120*var(--dp));object-fit:contain;margin:calc(-50*var(--dp)) 0 0 calc(-130*var(--dp));transform:scaleX(-1)");
    const him = imgEl(IMG("christianplayer0"), "position:absolute;left:50%;top:50%;width:calc(120*var(--dp));height:calc(120*var(--dp));object-fit:contain;margin:calc(-50*var(--dp)) 0 0 calc(10*var(--dp))");
    breathe(her, 2800); breathe(him, 3000);
    box.append(her, him, txt("every constellation leads back to you", "position:absolute;left:calc(32*var(--dp));right:calc(32*var(--dp));top:50%;margin-top:calc(85*var(--dp));text-align:center;font-size:calc(17*var(--dp));color:rgba(255,180,220,.7);text-shadow:0 0 calc(8*var(--dp)) rgba(255,105,180,.55)"));
    const o = overlay("rgba(3,0,12,.98)", box); fadeIn(o, 600);
  }

  RUXI.boot();
  // dev deep-links for testing: #mode=beach etc.
  const m = /mode=([\w_]+)/.exec(location.hash);
  if (m) { $("launcher").classList.add("hidden"); RUXI.enterGame(m[1]); }
  return { show };
})();
