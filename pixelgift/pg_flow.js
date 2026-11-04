// ─────────────────────────────────────────────────────────────
//  PixelGift — public gift-maker flow (prototype).
//  Welcome → who it's for → their avatar → their world → companion
//  → messages → review & play. Ruxi (the original) is the guide.
//  Her original game still lives behind #ruxi.
// ─────────────────────────────────────────────────────────────
window.PGFLOW = (() => {
  const ONE = window.PGONE, look = ONE.look, KEY = "pg_gift_v1";
  const UKEY = "pg_unlocks_v1";
  const unlocked = () => { try { return JSON.parse(localStorage.getItem(UKEY) || "{}"); } catch (e) { return {}; } };
  const RUXI_DATA = JSON.parse(JSON.stringify(window.PG_DATA));   // her texts, restored for #ruxi

  const WORLDS = {
    city: { name: "Neon City", level: 1, music: 1, items: ["item_book", "item_can", "item_candy"], names: ["books", "sodas", "candy"], itemNames: "books · sodas · candy", goal: "item_tarot_0", goalName: "5 tarot cards", packName: "Treats", bg: "bg0" },
    beach: { name: "Coral Beach", level: 2, music: 2, items: ["item_book_coral", "item_can_coral", "item_candy_coral"], names: ["shells", "coconuts", "bottles"], itemNames: "shells · coconuts · bottles", goal: "item_moonstone", goalName: "13 moonstones", packName: "Beach finds", bg: "bg3_coral" },
    space: { name: "Dream Space", level: 3, music: 3, items: ["starfrag", "cloudnebula", "spacecarrot"], names: ["star fragments", "nebulas", "carrots"], itemNames: "star fragments · nebulas · carrots", goal: "planet3", goalName: "9 planets", packName: "Star stuff", bg: "bg_space_2" },
  };
  const IPACKS = {};
  Object.entries(PGICONS.PACKS).forEach(([k, p]) => { IPACKS["i_" + k] = { packName: p.name, items: p.items.map((n) => "pgi-" + n), names: p.items.map((n) => ({ fish: "fish", daisy: "daisies", yarn: "yarn balls", paw: "paw prints", note: "music notes", letter: "love letters" })[n] || n + "s"), icons: p.items }; });
  const PACK = (id) => WORLDS[id] || IPACKS[id] || null;
  const CHAL = PGICONS.CHALLENGES;
  const GOAL_IMG = { city: "hud_tarot", beach: "item_moonstone", space: "planet3" };
  const chalLabel = (id, n) => id && id !== "auto" ? CHAL[id].text.replace(/\d+/, n) : "find " + n + " " + WORLDS[gift.world].goalName.replace(/^\d+ /, "");
  // every gift is one custom level (built on the city engine); no preset worlds
  function norm() {
    gift.world = "city";
    if (!ONE.PLAT_SETS[look.plat]) look.plat = "neon";
    if (!ONE.SKIES[look.sky]) look.sky = "nightcity";
    if (!gift.music) gift.music = 1;
    if (!PACK(gift.pack)) gift.pack = "city";
    if (!gift.chal || (gift.chal !== "auto" && !CHAL[gift.chal])) gift.chal = "auto";
    if (!PGICONS.BOOSTS[gift.boost]) gift.boost = "rocket";
  }
  const MUSIC = [
    { id: 1, name: "Neon nights", file: "bgm_loop" },
    { id: 2, name: "Ocean drift", file: "bgm_loop2" },
    { id: 3, name: "Space dream", file: "spacedreammusic" },
  ];
  const MESSAGES = [
    "You make ordinary days feel like magic ✨",
    "I still smile thinking about the day we met 🩷",
    "Every star up here reminds me of you 🌙",
    "You're my favorite person to do nothing with 💌",
    "Thank you for being exactly who you are 🌸",
    "I'd climb all the way to the moon for you 🌙",
    "Your laugh is my favorite sound 🎶",
    "Home isn't a place. It's you 🏡",
    "I'm so proud of you. Always 💫",
    "Some people make the world softer. You're one of them 🩷",
    "Our story is my favorite one ✨",
    "Look how far you've come. Keep going 🚀",
  ];
  const ENDINGS = [
    "Happy birthday! This whole world was made for you 🎂",
    "Happy anniversary. Here's to every level after this one 💞",
    "Just because. You deserve a world of your own ✨",
    "I love you. That was never hidden 🩷",
  ];

  let gift = (() => {
    const d = { to: "", from: "", world: "city", pack: "auto", music: 0, companion: false, messages: MESSAGES.slice(0, 5), ending: ENDINGS[0] };
    try { return Object.assign(d, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return d; }
  })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(gift)); } catch (e) { /* ignore */ } ONE.save(); };

  // ── DOM helpers ──
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const IMG = (n) => "assets/img/" + n + ".webp";
  let root, step = 0, dancers = [], raf = 0, audioPrev = null;

  const STEPS = [
    { id: "welcome" },
    { id: "who", say: "Hi! I'm Ruxi. I'll show you how to make a little game for someone you love. First — who's it for?" },
    { id: "avatar", say: "Now make their avatar. Pick a hairstyle and colors so it looks just like them." },
    { id: "world", say: "Now build their level. Pick the sky, the platforms, what they collect, their challenge, their boost and the music." },
    { id: "companion", say: "Want someone to keep them company up there? More friends are coming soon — cats, dogs, birds…" },
    { id: "messages", say: "These are the little notes that pop up while they play. Pick the ones that sound like you." },
    { id: "review", say: "That's it! Play it yourself first. When it's ready, you'll be able to send it as a link." },
  ];

  function build() {
    const css = el("style");
    css.textContent = `
#pgf{background:radial-gradient(circle at 50% 10%,#2b0b45 0,#0d0219 55%,#050008 100%);color:#fff;font-family:inherit;overflow-x:hidden}
#pgf .pad{padding:calc(26*var(--dp)) calc(18*var(--dp)) calc(30*var(--dp));position:relative;z-index:2}
#pgf h1{margin:calc(30*var(--dp)) 0 0;font-weight:400;text-align:center;font-size:calc(44*var(--dp));color:#FF69B4;letter-spacing:.14em;text-shadow:0 0 calc(12*var(--dp)) #FF69B4,0 0 calc(24*var(--dp)) #FF69B4}
#pgf .sub{text-align:center;color:#ffd1e6cc;font-size:calc(16*var(--dp));margin-top:calc(6*var(--dp))}
#pgf .dance{position:relative;height:calc(330*var(--dp));margin-top:calc(8*var(--dp))}
#pgf .dance canvas{position:absolute;width:calc(110*var(--dp));height:calc(110*var(--dp))}
#pgf .big{display:block;width:100%;border:0;font:inherit;font-size:calc(19*var(--dp));color:#fff;background:#FF69B4;border-radius:calc(30*var(--dp));padding:calc(15*var(--dp));box-shadow:0 0 calc(18*var(--dp)) #FF69B4;margin-top:calc(14*var(--dp))}
#pgf .ghost{background:#ffffff14;box-shadow:none;font-size:calc(15*var(--dp))}
#pgf .steps{display:flex;justify-content:center;gap:calc(6*var(--dp));margin-bottom:calc(12*var(--dp))}
#pgf .steps i{width:calc(26*var(--dp));height:calc(4*var(--dp));border-radius:4px;background:#ffffff22}
#pgf .steps i.on{background:#FF69B4;box-shadow:0 0 calc(6*var(--dp)) #FF69B4}
#pgf .guide{display:flex;align-items:flex-end;gap:calc(8*var(--dp));margin-bottom:calc(14*var(--dp))}
#pgf .guide img{width:calc(76*var(--dp));height:calc(76*var(--dp));object-fit:contain;flex:none;animation:pgbob 2.2s ease-in-out infinite}
#pgf .bubble{background:#ffffff12;border:1px solid #FF69B455;border-radius:calc(16*var(--dp)) calc(16*var(--dp)) calc(16*var(--dp)) calc(4*var(--dp));padding:calc(10*var(--dp)) calc(12*var(--dp));font-size:calc(14*var(--dp));line-height:1.45;color:#ffe9f4;min-height:calc(40*var(--dp))}
@keyframes pgbob{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(-6*var(--dp)))}}
#pgf h3{margin:calc(14*var(--dp)) 0 calc(8*var(--dp));font-weight:400;font-size:calc(13*var(--dp));letter-spacing:.1em;color:#FF69B4cc}
#pgf input[type=text]{width:100%;box-sizing:border-box;font:inherit;font-size:calc(18*var(--dp));padding:calc(12*var(--dp));border-radius:calc(14*var(--dp));border:calc(2*var(--dp)) solid #6a3fa8;background:#0a0214;color:#fff}
#pgf .row{display:flex;flex-wrap:wrap;gap:calc(9*var(--dp))}
#pgf .pk{display:flex;justify-content:center;align-items:center;gap:calc(2*var(--dp));height:calc(40*var(--dp));margin-bottom:calc(4*var(--dp));font-size:calc(20*var(--dp))}
#pgf .tile .pk img{width:30%;margin:0;height:calc(26*var(--dp));object-fit:contain}
#pgf .ccard{display:flex;align-items:center;gap:calc(14*var(--dp));width:100%;margin-bottom:calc(9*var(--dp));padding:calc(10*var(--dp)) calc(14*var(--dp));border-radius:calc(16*var(--dp));border:calc(2*var(--dp)) solid #ffffff18;background:linear-gradient(90deg,#2a0d40,#160626);color:#fff;font:inherit;text-align:left}
#pgf .ccard.on{border-color:#fff;box-shadow:0 0 calc(12*var(--dp)) #FF69B4}
#pgf .ccard img{width:calc(48*var(--dp));height:calc(48*var(--dp));object-fit:contain;flex:none}
#pgf .ccard .n{font-size:calc(18*var(--dp))}
#pgf .ccard .d{font-size:calc(12*var(--dp));color:#ffd1e6aa;margin-top:calc(2*var(--dp))}
#pgf .tile.soon{opacity:.45;border:calc(2*var(--dp)) dashed #ffffff33}
#pgf .chip{border:0;font:inherit;color:#fff;background:#ffffff14;border-radius:calc(20*var(--dp));padding:calc(8*var(--dp)) calc(14*var(--dp));font-size:calc(14*var(--dp))}
#pgf .chip.on{background:#FF69B4;box-shadow:0 0 calc(10*var(--dp)) #FF69B4}
#pgf .sw{width:calc(32*var(--dp));height:calc(32*var(--dp));border-radius:50%;border:calc(2*var(--dp)) solid #00000080}
#pgf .sw.on{outline:calc(3*var(--dp)) solid #fff;outline-offset:calc(2*var(--dp))}
#pgf .prev{display:block;margin:0 auto;width:calc(180*var(--dp));height:calc(180*var(--dp))}
#pgf .tile{position:relative;width:calc(96*var(--dp));text-align:center;font-size:calc(11*var(--dp));color:#ffd1e6;background:#ffffff0d;border-radius:calc(12*var(--dp));padding:calc(6*var(--dp));border:calc(2*var(--dp)) solid transparent;font-family:inherit}
#pgf .tile.on{border-color:#fff}
#pgf .tile img{width:100%;height:calc(52*var(--dp));object-fit:contain;display:block;margin-bottom:calc(4*var(--dp))}
#pgf .tile.sky img{height:calc(86*var(--dp));object-fit:cover;border-radius:calc(8*var(--dp))}
#pgf .wcard{position:relative;display:block;width:100%;height:calc(104*var(--dp));border-radius:calc(16*var(--dp));overflow:hidden;border:calc(2*var(--dp)) solid transparent;margin-bottom:calc(10*var(--dp));padding:0;background:#000;font-family:inherit}
#pgf .wcard.on{border-color:#fff;box-shadow:0 0 calc(12*var(--dp)) #FF69B4}
#pgf .wcard .bgi{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
#pgf .wcard .t{position:absolute;left:calc(14*var(--dp));top:calc(12*var(--dp));font-size:calc(20*var(--dp));color:#fff;text-shadow:0 0 calc(8*var(--dp)) #FF69B4;text-align:left}
#pgf .wcard .d{position:absolute;left:calc(14*var(--dp));bottom:calc(10*var(--dp));font-size:calc(12*var(--dp));color:#ffe9f4;text-align:left}
#pgf .wcard .ic{position:absolute;right:calc(10*var(--dp));top:50%;transform:translateY(-50%);display:flex;gap:calc(4*var(--dp))}
#pgf .wcard .ic img{width:calc(34*var(--dp));height:calc(34*var(--dp));object-fit:contain}
#pgf .lock{display:flex;gap:calc(8*var(--dp));margin-top:calc(4*var(--dp))}
#pgf .lock div{flex:1;border:1px dashed #ffffff33;border-radius:calc(12*var(--dp));padding:calc(10*var(--dp));font-size:calc(12*var(--dp));color:#ffffff99;text-align:center}
#pgf .msg{display:flex;gap:calc(10*var(--dp));align-items:center;width:100%;text-align:left;border:0;font:inherit;color:#ffe9f4;background:#ffffff0d;border-radius:calc(12*var(--dp));padding:calc(10*var(--dp)) calc(12*var(--dp));margin-bottom:calc(7*var(--dp));font-size:calc(14*var(--dp))}
#pgf .msg b{flex:none;width:calc(20*var(--dp));height:calc(20*var(--dp));border-radius:50%;border:calc(2*var(--dp)) solid #FF69B4}
#pgf .msg.on{background:#FF69B42a}
#pgf .msg.on b{background:#FF69B4}
#pgf .nav{display:flex;gap:calc(10*var(--dp));margin-top:calc(18*var(--dp))}
#pgf .nav .big{margin-top:0}
#pgf .sum{background:#ffffff0d;border-radius:calc(16*var(--dp));padding:calc(14*var(--dp));font-size:calc(14*var(--dp));line-height:1.7;color:#ffe9f4}
#pgf .note{font-size:calc(12*var(--dp));color:#ffffff77;text-align:center;margin-top:calc(10*var(--dp))}`;
    document.head.appendChild(css);
    root = el("section", "screen scroll hidden"); root.id = "pgf";
    $("stage").appendChild(root);
  }

  // ── welcome dancers: a few remixed Ruxis bouncing around ──
  function startDancers(box) {
    cancelAnimationFrame(raf); dancers = [];
    const hairs = AVATAR.OPTIONS.hair, O = AVATAR.OPTIONS;
    for (let i = 0; i < 6; i++) {
      const lk = Object.assign({}, AVATAR.DEFAULT, { hair: hairs[i % hairs.length], hairColor: O.hairColor[(i * 3) % O.hairColor.length], outfit: O.outfit[(i * 2 + 1) % O.outfit.length], eyes: O.eyes[(i * 2) % O.eyes.length], skin: O.skin[i % O.skin.length], wings: i === 5 });
      const frames = AVATAR.POSES.map((p) => AVATAR.render(lk, p));
      const c = el("canvas"); c.width = 220; c.height = 220; box.appendChild(c);
      dancers.push({ c, frames, x: (i + 0.5) / 6, vy: 0, y: 0, ph: Math.random() * 6, speed: 0.6 + Math.random() * 0.6, dir: Math.random() < 0.5 ? -1 : 1 });
    }
    const t0 = performance.now();
    const tick = (t) => {
      const w = box.clientWidth, h = box.clientHeight, s = (t - t0) / 1000;
      dancers.forEach((d, i) => {
        const cyc = (s * d.speed + d.ph) % 2.2;                 // jump cycle
        const air = cyc < 1.4, k = air ? cyc / 1.4 : 0;
        const lift = air ? Math.sin(k * Math.PI) * h * 0.45 : 0;
        const pose = !air ? 0 : k < 0.5 ? 1 : 2;
        d.x += d.dir * 0.0006 * d.speed; if (d.x > 1) { d.x = 1; d.dir = -1; } if (d.x < 0) { d.x = 0; d.dir = 1; }
        const cw = d.c.clientWidth, x = d.x * (w - cw), y = h - cw - lift - (i % 2) * 18;
        d.c.style.transform = `translate(${x}px,${y}px) scaleX(${d.dir})`;
        if (d.pose !== pose) {
          d.pose = pose; const ctx = d.c.getContext("2d"), f = d.frames[pose]; ctx.clearRect(0, 0, 220, 220);
          const sc = Math.min(210 / f.width, 210 / f.height); ctx.drawImage(f, (220 - f.width * sc) / 2, 215 - f.height * sc, f.width * sc, f.height * sc);
        }
      });
      if (root && !root.classList.contains("hidden") && step === 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function header(pad) {
    const st = el("div", "steps");
    for (let i = 1; i < STEPS.length; i++) st.appendChild(el("i", i <= step ? "on" : ""));
    pad.appendChild(st);
    const g = el("div", "guide"), im = el("img"); im.src = IMG("player");
    const b = el("div", "bubble"); g.append(im, b); pad.appendChild(g);
    typeInto(b, STEPS[step].say);
  }
  let typer = 0;
  function typeInto(node, text) {
    clearInterval(typer); let i = 0; node.textContent = "";
    typer = setInterval(() => { i += 2; node.textContent = text.slice(0, i); if (i >= text.length) clearInterval(typer); }, 22);
  }
  function nav(pad, nextLabel, onNext) {
    const n = el("div", "nav");
    const back = el("button", "big ghost", "back"); back.onclick = () => go(step - 1);
    const next = el("button", "big", nextLabel || "next ›"); next.onclick = onNext || (() => go(step + 1));
    n.append(back, next); pad.appendChild(n);
  }

  function go(i) { step = Math.max(0, Math.min(STEPS.length - 1, i)); stopPreviewMusic(); save(); render(); root.scrollTop = 0; }

  function render() {
    root.innerHTML = "";
    const pad = el("div", "pad"); root.appendChild(pad);
    const id = STEPS[step].id;
    if (id === "welcome") {
      pad.appendChild(el("h1", null, "PIXELGIFT"));
      pad.appendChild(el("div", "sub", "make a tiny game for someone you love"));
      const box = el("div", "dance"); pad.appendChild(box); startDancers(box);
      const b = el("button", "big", "✦ create a gift ✦"); b.onclick = () => { AUDIO.unlock(); look.wings = false; ONE.save(); go(1); }; pad.appendChild(b);
      if (gift.to) { const p = el("button", "big ghost", `play ${gift.to}'s gift`); p.onclick = () => { AUDIO.unlock(); play(); }; pad.appendChild(p); }
      return;
    }
    header(pad);
    if (id === "who") {
      pad.appendChild(el("h3", null, "WHO IS IT FOR?"));
      const to = el("input"); to.type = "text"; to.placeholder = "their name"; to.value = gift.to; to.maxLength = 18; to.oninput = () => { gift.to = to.value.trim(); };
      pad.appendChild(to);
      pad.appendChild(el("h3", null, "FROM"));
      const fr = el("input"); fr.type = "text"; fr.placeholder = "your name"; fr.value = gift.from; fr.maxLength = 18; fr.oninput = () => { gift.from = fr.value.trim(); };
      pad.appendChild(fr);
      nav(pad, "next ›", () => { if (!gift.to) { to.focus(); to.style.borderColor = "#FF69B4"; return; } go(step + 1); });
    }
    if (id === "avatar") {
      look.active = true;
      const cv = el("canvas", "prev"); cv.width = 360; cv.height = 360; pad.appendChild(cv);
      let pi = 0; const draw = () => { const a = AVATAR.render(look, AVATAR.POSES[pi]); const x = cv.getContext("2d"); x.clearRect(0, 0, 360, 360); const s = Math.min(340 / a.width, 340 / a.height); x.drawImage(a, (360 - a.width * s) / 2, (360 - a.height * s) / 2, a.width * s, a.height * s); };
      draw(); clearInterval(cv._t); const t = setInterval(() => { if (!cv.isConnected) return clearInterval(t); pi = (pi + 1) % 3; draw(); }, 900);
      pad.appendChild(el("h3", null, "HAIRSTYLE"));
      const hr = el("div", "row");
      AVATAR.OPTIONS.hair.forEach((h) => { const b = el("button", "chip" + (look.hair === h ? " on" : ""), ONE.NAMES[h] || h); b.onclick = () => { look.hair = h; render(); }; hr.appendChild(b); });
      pad.appendChild(hr);
      [["HAIR COLOR", "hairColor"], ["EYES", "eyes"], ["SKIN", "skin"], ["OUTFIT", "outfit"]].forEach(([l, f]) => {
        pad.appendChild(el("h3", null, l));
        const r = el("div", "row");
        AVATAR.OPTIONS[f].forEach((hx) => { const b = el("button", "sw" + (look[f] === hx ? " on" : "")); b.style.background = hx; b.onclick = () => { look[f] = hx; render(); }; r.appendChild(b); });
        pad.appendChild(r);
      });
      // extras: secret-code unlocks (wings), off unless the code was entered
      pad.appendChild(el("h3", null, "EXTRAS"));
      const xr = el("div", "row");
      if (unlocked().wings) {
        const wb = el("button", "chip" + (look.wings ? " on" : ""), look.wings ? "✦ wings on" : "wings off");
        wb.onclick = () => { look.wings = !look.wings; render(); }; xr.appendChild(wb);
      }
      const cb = el("button", "chip", "enter code"); xr.appendChild(cb); pad.appendChild(xr);
      cb.onclick = () => {
        cb.remove();
        const f = el("form", "row"); const inp = el("input"); inp.placeholder = "secret code"; inp.autocomplete = "off"; inp.style.flex = "1"; inp.style.textTransform = "uppercase";
        const ok = el("button", "chip on", "unlock"); f.appendChild(inp); f.appendChild(ok); xr.appendChild(f); inp.focus();
        f.onsubmit = (e) => {
          e.preventDefault();
          const g = ONE.CODES[inp.value.trim().toUpperCase()];
          if (!g) { inp.value = ""; inp.placeholder = "nothing happened…"; return; }
          const u = Object.assign(unlocked(), g); try { localStorage.setItem(UKEY, JSON.stringify(u)); } catch (er) { /* private mode */ }
          Object.assign(look, g); render();
        };
      };
      nav(pad);
    }
    if (id === "world") {
      norm();
      pad.appendChild(el("h3", null, "THEIR LEVEL · 1 FREE"));
      const lk = el("div", "lock"); lk.append(el("div", null, "🔒 more levels\n$1 each"), el("div", null, "🔒 3 levels\n$1.99")); lk.querySelectorAll("div").forEach((d) => (d.style.whiteSpace = "pre-line")); pad.appendChild(lk);
      pad.appendChild(el("h3", null, "BACKGROUND"));
      const sr = el("div", "row");
      Object.entries(ONE.SKIES).forEach(([sid, sk]) => {
        const t = el("button", "tile sky" + (look.sky === sid ? " on" : ""));
        const im = el("img"); im.src = IMG(sk.file || sk.key); t.appendChild(im);
        t.appendChild(el("div", null, sk.name)); t.onclick = () => { look.sky = sid; render(); }; sr.appendChild(t);
      });
      pad.appendChild(sr);
      pad.appendChild(el("h3", null, "PLATFORMS"));
      const pr = el("div", "row");
      Object.entries(ONE.PLAT_SETS).forEach(([pid, ps]) => {
        const t = el("button", "tile" + (look.plat === pid ? " on" : ""));
        const im = el("img"); im.src = ps.kit ? ONE.KIT.plats[ps.kit].items[0] : IMG(ps.keys[0]); t.appendChild(im);
        t.appendChild(el("div", null, ps.name)); t.onclick = () => { look.plat = pid; render(); }; pr.appendChild(t);
      });
      pad.appendChild(pr);
      pad.appendChild(el("h3", null, "PICKUP ITEMS"));
      const kr = el("div", "row");
      Object.entries(WORLDS).map(([i, w]) => [i, w.packName]).concat(Object.entries(IPACKS).map(([i, pk]) => [i, pk.packName])).forEach(([kid, name]) => {
        const t = el("button", "tile" + (gift.pack === kid ? " on" : ""));
        const ic = el("div", "pk");
        PACK(kid).items.forEach((n) => { const im = el("img"); if (n.startsWith("pgi-")) { im.src = PGICONS.url(n.slice(4), { size: 64 }); im.style.imageRendering = "pixelated"; } else im.src = IMG(n); ic.appendChild(im); });
        t.appendChild(ic); t.appendChild(el("div", null, name)); t.onclick = () => { gift.pack = kid; render(); }; kr.appendChild(t);
      });
      pad.appendChild(kr);
      pad.appendChild(el("h3", null, "CHALLENGE"));
      [["auto", "Tarot cards", null]].concat(Object.entries(CHAL).map(([k, c]) => [k, c.name, c.icon])).forEach(([cid, name, icon]) => {
        const c = el("button", "ccard" + (gift.chal === cid ? " on" : ""));
        const im = el("img"); if (icon) { im.src = PGICONS.url(icon, { size: 96 }); im.style.imageRendering = "pixelated"; } else im.src = IMG("hud_tarot");
        const tx = el("div", "ct"); tx.append(el("div", "n", name), el("div", "d", "challenge · " + chalLabel(cid, 5)));
        c.append(im, tx); c.onclick = () => { gift.chal = cid; render(); }; pad.appendChild(c);
      });
      pad.appendChild(el("h3", null, "BOOST · grab it to fly"));
      const br = el("div", "row");
      Object.entries(PGICONS.BOOSTS).forEach(([bid, bo]) => {
        const t = el("button", "tile" + (gift.boost === bid ? " on" : ""));
        const im = el("img"); if (bid === "balloons") im.src = IMG("silverpinkballoons"); else { im.src = PGICONS.url(bo.icon, { size: 64 }); im.style.imageRendering = "pixelated"; }
        im.style.objectFit = "contain"; t.appendChild(im); t.appendChild(el("div", null, bo.name)); t.onclick = () => { gift.boost = bid; render(); }; br.appendChild(t);
      });
      pad.appendChild(br);
      pad.appendChild(el("h3", null, "MUSIC"));
      const mr = el("div", "row");
      MUSIC.forEach((m) => {
        const b = el("button", "chip" + (gift.music === m.id ? " on" : ""), "▶ " + m.name);
        b.onclick = () => { gift.music = m.id; previewMusic(m.id); render(); };
        mr.appendChild(b);
      });
      pad.appendChild(mr);
      nav(pad);
    }
    if (id === "companion") {
      pad.appendChild(el("h3", null, "COMPANION"));
      const r = el("div", "row");
      [[false, "No one", null], [true, "Space bunny", "sophiespace0"]].forEach(([v, name, img]) => {
        const t = el("button", "tile" + (gift.companion === v ? " on" : ""));
        if (img) { const im = el("img"); im.src = IMG(img); t.appendChild(im); } else t.appendChild(el("div", null, "—")).style.cssText = "height:calc(52*var(--dp));display:flex;align-items:center;justify-content:center;font-size:calc(24*var(--dp))";
        t.appendChild(el("div", null, name)); t.onclick = () => { gift.companion = v; render(); }; r.appendChild(t);
      });
      ["🐱 cat", "🐶 dog", "🐦 bird"].forEach((n) => { const t = el("div", "tile"); t.style.opacity = ".45"; t.appendChild(el("div", null, n.split(" ")[0])).style.cssText = "height:calc(52*var(--dp));display:flex;align-items:center;justify-content:center;font-size:calc(30*var(--dp))"; t.appendChild(el("div", null, n.split(" ")[1] + " · soon")); r.appendChild(t); });
      pad.appendChild(r);
      nav(pad);
    }
    if (id === "messages") {
      pad.appendChild(el("h3", null, `POP-UP NOTES · ${gift.messages.length} PICKED`));
      MESSAGES.forEach((m) => {
        const on = gift.messages.includes(m), b = el("button", "msg" + (on ? " on" : ""));
        b.append(el("b"), el("span", null, m));
        b.onclick = () => { gift.messages = on ? gift.messages.filter((x) => x !== m) : gift.messages.concat(m); render(); };
        pad.appendChild(b);
      });
      pad.appendChild(el("h3", null, "THE ENDING"));
      ENDINGS.forEach((m) => { const on = gift.ending === m, b = el("button", "msg" + (on ? " on" : "")); b.append(el("b"), el("span", null, m)); b.onclick = () => { gift.ending = m; render(); }; pad.appendChild(b); });
      nav(pad, "next ›", () => { if (!gift.messages.length) return; go(step + 1); });
    }
    if (id === "review") {
      norm();
      const cv = el("canvas", "prev"); cv.width = 360; cv.height = 360; pad.appendChild(cv);
      const a = AVATAR.render(look, "idle"), x = cv.getContext("2d"), s = Math.min(340 / a.width, 340 / a.height); x.drawImage(a, (360 - a.width * s) / 2, (360 - a.height * s) / 2, a.width * s, a.height * s);
      const w = WORLDS[gift.world], sum = el("div", "sum");
      const mus = MUSIC.find((m) => m.id === gift.music);
      sum.innerHTML = "";
      [["For", gift.to || "—"], ["From", gift.from || "—"], ["Background", ONE.SKIES[look.sky].name], ["Platforms", ONE.PLAT_SETS[look.plat].name], ["Pickup items", PACK(gift.pack).packName], ["Challenge", chalLabel(gift.chal, 5)], ["Boost", PGICONS.BOOSTS[gift.boost].name], ["Music", mus ? mus.name : "Neon nights"], ["Companion", gift.companion ? "Space bunny" : "no one"], ["Notes", gift.messages.length + " picked"]]
        .forEach(([k, v]) => { const r = el("div"); r.append(el("span", null, k + ": ")); r.lastChild.style.color = "#FF69B4"; r.append(el("span", null, v)); sum.appendChild(r); });
      pad.appendChild(sum);
      const p = el("button", "big", "▶ play the gift"); p.onclick = () => { AUDIO.unlock(); play(); }; pad.appendChild(p);
      const n = el("div", "nav"), b = el("button", "big ghost", "edit"); b.onclick = () => go(1);
      const s2 = el("button", "big ghost", "send link · soon"); s2.style.opacity = ".5"; n.append(b, s2); pad.appendChild(n);
      pad.appendChild(el("div", "note", "prototype · 1 level free · more levels $1 each or 3 for $1.99"));
    }
  }

  // previews go through the game's own music player, so only one song can ever play
  function previewMusic(id) { AUDIO.unlock(); AUDIO.previewBgm(id); }
  function stopPreviewMusic() { AUDIO.pauseBgm && AUDIO.pauseBgm(); }

  // ── texts the game shows, rewritten for a public gift ──
  function neutralTexts() {
    const D = window.PG_DATA, to = gift.to || "you", from = gift.from || "someone who loves you";
    const notes = gift.messages.length ? gift.messages : MESSAGES.slice(0, 3);
    D.bottleMessages = notes.slice();
    D.moonMagicMessages = [[gift.ending], [gift.ending]];
    const P = (gift.pack && gift.pack !== "auto" && PACK(gift.pack)) || WORLDS[gift.world], nm = P.names || ["these", "these", "these"];
    D.digi = [
      `${nm[0]}! find 11 and gravity gets lighter ✨`,
      `${nm[1]}! every 11 gives you a fizzy speed boost ⚡`,
      `${nm[1]}… collect 13 and everything goes soft and slow ☁️`,
      `${nm[2]}… every few has a note inside 💌`,
      `${nm[2]} for your little friend 🐰`,
      "balloons! catch them to float even higher 🎈",
    ];
    D.ptips = [
      `${nm[0]}! every 11 = chakra glow ✨`,
      `${nm[1]}! every 11 = fizzy speed boost ⚡`,
      `${nm[2]}! every 9 = sweet rush 🩷`,
    ];
    D.planetFacts = D.planetFacts.map((f) => f.replace("the only one with you on it", "home sweet home").replace("never stopped being a planet to us", "small but never forgotten"));
    D.signal33 = [
      ["oops… a little glitch in the sky. hold on!", "signal lost… and found again ✨", "phew, back on track 🩷"],
      ["so many of you… every version is cute", "parallel worlds detected ✨", "multidimensional sparkle 💫"],
      ["someone pressed a button they shouldn't have…", "jetpack override… totally on purpose", "look at you go! ✨"],
    ];
    D.start = {
      1: [[`hi ${to}! ${from} made this world for you 🩷`, 5000], ["climb as high as you can ✨"], ["tap to begin 💗"]],
      2: [[`welcome to the beach, ${to} 🌊`, 5000], [`a little ocean from ${from} 🌊`], ["tap to begin 🌊"]],
      3: [[`${to}, this whole sky is yours 🌙`, 5000], ["the stars are waiting ✨"], ["tap to launch 🚀"]],
    };
    D.ready = { 1: ["ready", "set", "go ✨"], 2: ["ready", "set", "go 🌊"], 3: ["ready", "set", "launch 🌙"] };
    D.gate = ["tap 1/3 ✦", "tap 2/3 ✦", "tap 3/3 ✦"];
  }
  let noteI = 0;
  function nextMessage() { const m = gift.messages; if (!m.length) return undefined; return m[noteI++ % m.length]; }

  function play() {
    norm(); save(); stopPreviewMusic(); cancelAnimationFrame(raf);
    look.active = true; if (!unlocked().wings) look.wings = false;
    neutralTexts(); noteI = 0;
    const w = WORLDS[gift.world];
    window.PGPUBLIC = true;
    window.PGMUSIC = gift.music || 0;
    window.PGCOMP = !!gift.companion;
    window.PGPACK = gift.pack && gift.pack !== "auto" && PACK(gift.pack) ? PACK(gift.pack).items.slice() : null;
    window.PGBOOST = gift.boost;
    window.PGCHAL = gift.chal && gift.chal !== "auto" && CHAL[gift.chal] ? CHAL[gift.chal].icon : null;
    root.classList.add("hidden");
    RUXI.enterGame(gift.world);
  }
  function back() { root.classList.remove("hidden"); go(STEPS.length - 1); }
  function finished() { RUXI.exitToMenu(); }

  function restoreRuxi() {
    window.PGPUBLIC = false; window.PGMUSIC = 0; window.PGCOMP = false; window.PGPACK = null; window.PGCHAL = null; window.PGBOOST = null; window.POP && POP.clear();
    const D = window.PG_DATA; Object.keys(RUXI_DATA).forEach((k) => { D[k] = JSON.parse(JSON.stringify(RUXI_DATA[k])); });
  }

  function show() { if (!root) build(); $("launcher").classList.add("hidden"); root.classList.remove("hidden"); step = 0; render(); }

  // start here unless the URL asks for Ruxi's original (#ruxi)
  function boot() {
    if (!window.PG_PUBLIC_BUILD && /ruxi/.test(location.hash)) { $("launcher").classList.remove("hidden"); return; }
    show();
  }

  return { boot, show, back, finished, nextMessage, restoreRuxi, get gift() { return gift; } };
})();
