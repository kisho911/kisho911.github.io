// ─────────────────────────────────────────────────────────────
//  "Create your character" for the PixelGift 1:1 port.
//  Ruxi stays the default. When a custom look is switched on, the
//  game swaps her idle / jump / fall sprites for the custom ones
//  (story moments like the drill kiss and the wizard keep her art).
//  Also: pick a platform set + sky, and secret codes (wings).
//  Needs pg_sprites.js, pg_kit.js, pg_avatar.js loaded first.
// ─────────────────────────────────────────────────────────────
window.PGONE = (() => {
  const KEY = "pg_custom_look_v1";
  const DEF = Object.assign({}, AVATAR.DEFAULT, { active: false, plat: "auto", sky: "auto" });
  let look = (() => { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return Object.assign({}, DEF); } })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(look)); } catch (e) { /* private mode */ } };

  // which game sprites the custom character replaces
  const MAP = { player: "idle", player_jump_up: "up", player_jump_down: "down", bunny_boost: "up",
    player_drink: "idle", player_drink_1: "idle", candy_nom_0: "idle", candy_nom_1: "idle" };
  const SPACE_MAP = { playerspace: "idle", playerspace0: "up", playerspace1: "down" };

  // the platform sets the 1:1 already has, plus the new cloud set from the kit
  const PLAT_SETS = {
    neon: { name: "Neon zodiac", keys: Array.from({ length: 13 }, (_, i) => "platform" + i) },
    coral: { name: "Coral zodiac", keys: Array.from({ length: 13 }, (_, i) => "platform_" + i + "_coral") },
    glyph: { name: "Planet glyphs", keys: Array.from({ length: 9 }, (_, i) => "spaceplat" + (i + 1)) },
  };
  // new Gemini platform sets (files in assets/img/plat_<set>_<n>.webp, framed like platform0)
  [["sakura", "Sakura grove"], ["candy", "Sweet treats"], ["reef", "Crystal reef"], ["snow", "Snowy ice"]].forEach(([id, name]) => {
    PLAT_SETS[id] = { name, keys: Array.from({ length: 6 }, (_, i) => "plat-" + id + "-" + i), files: Array.from({ length: 6 }, (_, i) => "plat_" + id + "_" + i) };
  });
  const KIT = window.PG_KIT || { plats: {}, skies: {} };
  if (KIT.plats.clouds) PLAT_SETS.clouds = { name: "Cloud zodiac", keys: KIT.plats.clouds.items.map((_, i) => "kit-clouds-" + i), kit: "clouds" };
  const SKIES = {
    nightcity: { name: "Night city", key: "bg0" },
    coral: { name: "Coral sunset", key: "bg0_coral" },
    galaxy: { name: "Lilac galaxy", key: "kit-sky-galaxy", file: "bg_space_0" },
    sakura: { name: "Sakura night", key: "sky-sakura", file: "bg_sakura", load: true },
    candy: { name: "Candy clouds", key: "sky-candy", file: "bg_candy", load: true },
    reef: { name: "Crystal reef", key: "sky-reef", file: "bg_reef", load: true },
    aurora: { name: "Aurora snow", key: "sky-aurora", file: "bg_aurora", load: true },
  };

  // queue extra images (new cloud platforms padded like the originals, galaxy sky) in the boot loader
  function preload(scene) {
    if (KIT.plats.clouds) KIT.plats.clouds.items.forEach((src, i) => scene.load.image("kit-clouds-" + i, src));
    scene.load.image("kit-sky-galaxy", "bg_space_0.webp");
    Object.values(PLAT_SETS).forEach((ps) => { if (ps.files) ps.files.forEach((f, i) => scene.load.image(ps.keys[i], f + ".webp")); });
    Object.values(SKIES).forEach((sk) => { if (sk.load) scene.load.image(sk.key, sk.file + ".webp"); });
  }

  // build the custom character's textures (square, framed like her original sprites)
  function bake(scene) {
    // code-drawn pixel icons for pickup packs + challenges ("pgi-<name>")
    if (window.PGICONS) PGICONS.names.forEach((n) => {
      const k = "pgi-" + n; if (scene.textures.exists(k)) return;
      scene.textures.addCanvas(k, PGICONS.draw(n, { size: 128 })).setFilter(Phaser.Textures.FilterMode.NEAREST);
    });
    if (!look.active) return;
    const PAD = 1.7;                                   // extra canvas around the original square so hair / wings never clip
    const make = (pose, helmet, o) => {
      const lk = o && o.wings ? Object.assign({}, look, { wings: true }) : look;
      const art = AVATAR.render(lk, pose, Object.assign({ helmet: !!helmet }, o || {}));
      const f = art.fig || { x: 0, y: 0, w: art.width, h: art.height };
      const fh = 210;                                   // idle figure height in render px (TEX_H)
      const S = Math.round(fh * 1.115), B = Math.round(S * PAD), off = (B - S) / 2;
      const c = document.createElement("canvas"); c.width = B; c.height = B;
      const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
      const fx = (S - f.w) / 2;
      const fy = pose === "idle" ? S * 0.955 - 4 - f.h : (S - f.h) / 2;
      x.drawImage(art, off + fx - f.x, off + fy - f.y);
      return c;
    };
    // base frames + expression / head-tilt variants the game flips between while she flies
    const FR = {
      idle: { "": {}, "-b": { eyes: "blink" }, "-h": { eyes: "happy" } },
      up: { "": {}, "-0": { tilt: 0.03 }, "-1": { tilt: 0.12 }, "-2": { tilt: 0.19, eyes: "happy" }, "-b": { tilt: 0.1, eyes: "blink" }, "-w": { tilt: 0.12, eyes: "happy", wings: true } },
      down: { "": {}, "-0": { tilt: -0.02 }, "-1": { tilt: -0.13 }, "-b": { tilt: -0.07, eyes: "blink" }, "-h": { tilt: -0.05, eyes: "happy" } },
    };
    Object.entries(FR).forEach(([p, vs]) => Object.entries(vs).forEach(([suf, o]) => {
      ["pgx-" + p + suf, "pgx-space-" + p + suf].forEach((k, j) => {
        if (scene.textures.exists(k)) scene.textures.remove(k);
        const t = scene.textures.addCanvas(k, make(p, j === 1, o));
        t.customData = Object.assign(t.customData || {}, { pgPad: PAD });
      });
    }));
  }

  // called by the game's getBeachAsset before its own mapping
  function mapAsset(res, level) {
    if (look.active) {
      if (level === 3 && SPACE_MAP[res]) return "pgx-space-" + SPACE_MAP[res];
      if (MAP[res]) return (level === 3 ? "pgx-space-" : "pgx-") + MAP[res];
    }
    if (/^platform\d+$/.test(res) && PLAT_SETS[look.plat]) { const k = PLAT_SETS[look.plat].keys; return k[Math.floor(Math.random() * k.length)]; }
    return null;
  }
  // which baked frame to show right now: r = vertical speed / jump speed (negative = rising)
  function frame(pose, r, t, space, happy) {
    if (!look.active) return null;
    const p = pose === "JUMP_UP" ? "up" : pose === "JUMP_DOWN" ? "down" : pose === "IDLE" ? "idle" : null;
    if (!p) return null;
    const base = (space ? "pgx-space-" : "pgx-") + p;
    if (happy) return base + (p === "up" ? "-2" : "-h");           // ^ ^ after a pickup event
    if (t % 3100 < 150) return base + "-b";                       // blink every ~3 s
    if (p === "up") return base + (r < -0.72 ? "-2" : r < -0.4 ? "-1" : "-0");
    if (p === "down") return base + (r > 0.45 ? "-1" : "-0");
    return base;
  }
  function platform() { const s = PLAT_SETS[look.plat]; return s ? s.keys[Math.floor(Math.random() * s.keys.length)] : null; }
  function sky() { const s = SKIES[look.sky]; return s ? s.key : null; }

  // ═════════ the create screen (DOM, matches the launcher's neon style) ═════════
  const C = window.PG_CODES || { VENUS: { wings: true } };
  const NAMES = { pigtails: "Pigtails", long: "Long", bob: "Bob", ponytail: "Ponytail", buns: "Buns" };
  let root = null, previewTimer = 0, page = 0, posei = 0;

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function open() {
    if (!root) build();
    $("launcher").classList.add("hidden");
    root.classList.remove("hidden");
    render();
    clearInterval(previewTimer);
    previewTimer = setInterval(() => { posei = (posei + 1) % 3; drawPreview(); }, 900);
  }
  function close() {
    clearInterval(previewTimer);
    root.classList.add("hidden");
    window.LAUNCHER && window.LAUNCHER.show();
  }

  function build() {
    const css = el("style");
    css.textContent = `
#pgc{background:radial-gradient(circle at 50% 12%,#2a0d40 0,#0b0216 55%,#050008 100%);color:#fff;font-family:inherit}
#pgc .pad{padding:calc(36*var(--dp)) calc(18*var(--dp)) calc(28*var(--dp))}
#pgc h2{margin:0;font-weight:400;text-align:center;font-size:calc(30*var(--dp));color:#FF69B4;letter-spacing:.12em;text-shadow:0 0 calc(10*var(--dp)) #FF69B4}
#pgc .prev{display:block;margin:calc(6*var(--dp)) auto 0;width:calc(220*var(--dp));height:calc(220*var(--dp))}
#pgc .tabs{display:flex;justify-content:center;gap:calc(10*var(--dp));margin:calc(4*var(--dp)) 0 calc(14*var(--dp))}
#pgc .tab,#pgc .chip,#pgc .btn{border:0;font:inherit;color:#fff;background:#ffffff14;border-radius:calc(20*var(--dp));padding:calc(8*var(--dp)) calc(16*var(--dp));font-size:calc(15*var(--dp))}
#pgc .tab.on,#pgc .chip.on{background:#FF69B4;box-shadow:0 0 calc(10*var(--dp)) #FF69B4}
#pgc .lab{font-size:calc(13*var(--dp));color:#FF69B4bb;margin:calc(12*var(--dp)) 0 calc(8*var(--dp));letter-spacing:.08em}
#pgc .row{display:flex;flex-wrap:wrap;gap:calc(9*var(--dp))}
#pgc .sw{width:calc(34*var(--dp));height:calc(34*var(--dp));border-radius:50%;border:calc(2*var(--dp)) solid #00000080}
#pgc .sw.on{outline:calc(3*var(--dp)) solid #fff;outline-offset:calc(2*var(--dp))}
#pgc .tile{width:calc(96*var(--dp));text-align:center;font-size:calc(11*var(--dp));color:#ffd1e6;background:#ffffff0d;border-radius:calc(12*var(--dp));padding:calc(6*var(--dp));border:calc(2*var(--dp)) solid transparent}
#pgc .tile.on{border-color:#fff}
#pgc .tile img{width:100%;height:calc(54*var(--dp));object-fit:contain;display:block;margin-bottom:calc(4*var(--dp))}
#pgc .tile.sky img{height:calc(90*var(--dp));object-fit:cover;border-radius:calc(8*var(--dp))}
#pgc .bar{display:flex;gap:calc(10*var(--dp));margin-top:calc(22*var(--dp))}
#pgc .bar .btn{flex:1;padding:calc(12*var(--dp))}
#pgc .btn.go{background:#FF69B4;box-shadow:0 0 calc(12*var(--dp)) #FF69B4}
#pgc .note{font-size:calc(12*var(--dp));color:#ffffff88;text-align:center;margin-top:calc(10*var(--dp))}
#pgcode{position:absolute;inset:0;z-index:30000;display:flex;align-items:center;justify-content:center;background:#050008cc}
#pgcode form{background:#16062a;border:calc(2*var(--dp)) solid #FF69B4;border-radius:calc(18*var(--dp));padding:calc(20*var(--dp));width:calc(300*var(--dp));text-align:center}
#pgcode input{width:100%;box-sizing:border-box;font:inherit;font-size:max(16px,calc(22*var(--dp)));text-align:center;letter-spacing:.15em;padding:calc(10*var(--dp));border-radius:calc(12*var(--dp));border:calc(2*var(--dp)) solid #7a4cc6;background:#050008;color:#fff;text-transform:uppercase}
#pgcode .m{height:calc(22*var(--dp));margin-top:calc(8*var(--dp));color:#ffd1e6;font-size:calc(14*var(--dp))}`;
    document.head.appendChild(css);
    root = el("section", "screen scroll hidden"); root.id = "pgc";
    $("stage").appendChild(root);
  }

  const hexes = (arr, field) => {
    const r = el("div", "row");
    arr.forEach((h) => {
      const b = el("button", "sw" + (look[field] === h ? " on" : "")); b.style.background = h;
      b.onclick = () => { look[field] = h; look.active = true; AUDIO.unlock && AUDIO.unlock(); render(); };
      r.appendChild(b);
    });
    return r;
  };

  function render() {
    root.innerHTML = "";
    const pad = el("div", "pad"); root.appendChild(pad);
    pad.appendChild(el("h2", null, "CREATE"));
    const cv = el("canvas", "prev"); cv.width = 440; cv.height = 440; pad.appendChild(cv);
    root._cv = cv; drawPreview();
    const tabs = el("div", "tabs");
    ["her look", "her world"].forEach((t, i) => { const b = el("button", "tab" + (page === i ? " on" : ""), t); b.onclick = () => { page = i; render(); }; tabs.appendChild(b); });
    pad.appendChild(tabs);
    if (page === 0) {
      pad.appendChild(el("div", "lab", "HAIRSTYLE"));
      const hr = el("div", "row");
      AVATAR.OPTIONS.hair.forEach((h) => { const b = el("button", "chip" + (look.hair === h ? " on" : ""), NAMES[h] || h); b.onclick = () => { look.hair = h; look.active = true; render(); }; hr.appendChild(b); });
      pad.appendChild(hr);
      [["HAIR COLOR", "hairColor"], ["EYES", "eyes"], ["SKIN", "skin"], ["OUTFIT", "outfit"]].forEach(([l, f]) => { pad.appendChild(el("div", "lab", l)); pad.appendChild(hexes(AVATAR.OPTIONS[f], f)); });
    } else {
      pad.appendChild(el("div", "lab", "PLATFORMS"));
      const pr = el("div", "row");
      [["auto", "Each level"]].concat(Object.entries(PLAT_SETS).map(([id, s]) => [id, s.name])).forEach(([id, name]) => {
        const t = el("button", "tile" + (look.plat === id ? " on" : ""));
        if (id !== "auto") { const im = el("img"); im.src = PLAT_SETS[id].kit ? KIT.plats[PLAT_SETS[id].kit].items[0] : "assets/img/" + PLAT_SETS[id].keys[0] + ".webp"; t.appendChild(im); }
        t.appendChild(el("div", null, name)); t.onclick = () => { look.plat = id; render(); }; pr.appendChild(t);
      });
      pad.appendChild(pr);
      pad.appendChild(el("div", "lab", "SKY"));
      const sr = el("div", "row");
      [["auto", "Each level"]].concat(Object.entries(SKIES).map(([id, s]) => [id, s.name])).forEach(([id, name]) => {
        const t = el("button", "tile sky" + (look.sky === id ? " on" : ""));
        if (id !== "auto") { const im = el("img"); im.src = "assets/img/" + (SKIES[id].file || SKIES[id].key) + ".webp"; t.appendChild(im); }
        t.appendChild(el("div", null, name)); t.onclick = () => { look.sky = id; render(); }; sr.appendChild(t);
      });
      pad.appendChild(sr);
      const code = el("button", "btn", "✦ enter code ✦"); code.style.cssText = "display:block;margin:calc(18*var(--dp)) auto 0";
      code.onclick = askCode; pad.appendChild(code);
    }
    const bar = el("div", "bar");
    const ruxi = el("button", "btn", look.active ? "back to Ruxi" : "Ruxi ✓");
    ruxi.onclick = () => { look.active = false; render(); };
    const done = el("button", "btn go", "save");
    done.onclick = () => { save(); close(); };
    bar.append(ruxi, done); pad.appendChild(bar);
    pad.appendChild(el("div", "note", look.active ? "your character plays every level" : "Ruxi plays — pick anything above to make your own"));
  }

  function drawPreview() {
    const cv = root && root._cv; if (!cv) return;
    const x = cv.getContext("2d"); x.clearRect(0, 0, cv.width, cv.height);
    if (!look.active) {
      const im = new Image(); im.onload = () => { x.clearRect(0, 0, cv.width, cv.height); x.drawImage(im, 20, 20, 400, 400); };
      im.src = "assets/img/" + ["player", "player_jump_up", "player_jump_down"][posei] + ".webp"; return;
    }
    const art = AVATAR.render(look, AVATAR.POSES[posei]);
    const s = Math.min(400 / art.width, 400 / art.height);
    x.drawImage(art, (cv.width - art.width * s) / 2, (cv.height - art.height * s) / 2, art.width * s, art.height * s);
  }

  function askCode() {
    const o = el("div"); o.id = "pgcode";
    o.innerHTML = '<form><div style="font-size:calc(20*var(--dp));color:#FF69B4;margin-bottom:calc(12*var(--dp))">enter code</div><input autocomplete="off" spellcheck="false"><div class="m"></div><div style="display:flex;gap:calc(10*var(--dp));margin-top:calc(6*var(--dp))"><button type="button" class="btn x" style="flex:1">close</button><button class="btn go" style="flex:1">unlock</button></div></form>';
    root.appendChild(o);
    const f = o.querySelector("form"), inp = o.querySelector("input"), m = o.querySelector(".m");
    o.querySelector(".x").onclick = () => o.remove();
    setTimeout(() => inp.focus(), 60);
    f.onsubmit = (e) => {
      e.preventDefault();
      const gift = C[inp.value.trim().toUpperCase()];
      if (!gift) { m.textContent = "nothing happened…"; inp.select(); return; }
      Object.assign(look, gift); look.active = true; save();
      m.textContent = "✨ unlocked ✨";
      setTimeout(() => { o.remove(); render(); }, 700);
    };
  }

  return { preload, bake, mapAsset, frame, platform, sky, open, save, PLAT_SETS, SKIES, KIT, CODES: C, NAMES, get look() { return look; }, ready: Promise.all([AVATAR.ready]) };
})();
