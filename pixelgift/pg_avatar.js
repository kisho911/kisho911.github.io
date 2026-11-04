// ─────────────────────────────────────────────────────────────
//  PixelGift avatar v2: hand-drawn sprites (made with Gemini from
//  Ruxi's character) recoloured in code from colour-coded templates.
//  Same API as the old code-drawn AVATAR, so the engine is unchanged:
//  OPTIONS, DEFAULT, POSES, render, makeTextures, size, plus k (scale)
//  and ready (a promise the game waits for before it boots).
//  Data comes from pg_assets.js: PG_SPRITES[pose][i] and PG_WINGS.
// ─────────────────────────────────────────────────────────────
window.AVATAR = (() => {
  const POSES = ["idle", "up", "down"];
  const STYLE_IDS = ["pigtails", "long", "bob", "ponytail", "buns"];
  const OPTIONS = {
    hair: STYLE_IDS.slice(),
    hairColor: ["#1e1424", "#5a3a28", "#f2c66d", "#b8402e", "#ff6fa8", "#a98bff", "#3fc1b8", "#d9d4e6"],
    skin: ["#ffe0cc", "#f5c6a0", "#d9a07a", "#a8714f", "#6e4630"],
    outfit: ["#2d2236", "#ff4f9a", "#e0344b", "#9b7bff", "#4fb3ff", "#43c99a", "#ffc23f", "#f4f0f7"],
    eyes: ["#3a9a5c", "#2b1a2e", "#6b3f22", "#a8792f", "#3f86d9", "#8a5cff", "#d94f8a"],
  };
  const DEFAULT = { hair: "pigtails", hairColor: "#1e1424", skin: "#ffe0cc", outfit: "#2d2236", eyes: "#3a9a5c", accent: "#ff4fa8", glow: "#22c8f0", wings: false };
  const TEX_H = 210;          // texture height in pixels (idle pose)
  const k = 66 / TEX_H;       // the old avatar was 66 px tall; the engine multiplies its scales by k

  // label classes written by the sprite pipeline
  const C = { skin: 1, eye: 2, glow: 3, hair: 4, outfit: 6, accent: 7, keep: 8 };

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  function ramp(h, dark, light) { const c = hex(h); return [mix(c, [8, 4, 14], dark), c, mix(c, [255, 255, 255], light)]; }
  function lerpRamp(r, g) { const a = g < 0.5 ? r[0] : r[1], b = g < 0.5 ? r[1] : r[2], t = g < 0.5 ? g * 2 : (g - 0.5) * 2; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  // ── load every sprite + label map once ─────────────────────────
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  const DATA = { idle: [], up: [], down: [] };
  let WINGS = null;
  function pixels(img) {
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, c.width, c.height);
  }
  const ready = (async () => {
    const S = window.PG_SPRITES || {};
    for (const pose of POSES) {
      for (const st of S[pose] || []) {
        const [a, b] = await Promise.all([load(st.sprite), load(st.labels)]);
        DATA[pose].push(a && b ? { st, o: pixels(a), l: pixels(b) } : null);
      }
    }
    if (window.PG_WINGS) WINGS = await load(window.PG_WINGS.src);
  })();

  // ── recolour one sprite into a canvas, with eyes looking up/down ──
  function recolor(d, look, eyeShift, closed) {
    const { o, l, st } = d, W = o.width, H = o.height;
    const ramps = {
      [C.hair]: ramp(look.hairColor || DEFAULT.hairColor, 0.78, 0.5),
      [C.skin]: ramp(look.skin || DEFAULT.skin, 0.5, 0.45),
      [C.eye]: ramp(look.eyes || DEFAULT.eyes, 0.75, 0.6),
      [C.outfit]: ramp(look.outfit || DEFAULT.outfit, 0.8, 0.45),
      [C.accent]: ramp(look.accent || DEFAULT.accent, 0.75, 0.6),
      [C.glow]: ramp(look.glow || DEFAULT.glow, 0.7, 0.7),
    };
    const out = new ImageData(W, H), dd = out.data, od = o.data, ld = l.data;
    for (let i = 0; i < od.length; i += 4) {
      const c = Math.round(ld[i] / 20), r = ramps[c];
      if (r) { const v = lerpRamp(r, ld[i + 1] / 255); dd[i] = v[0]; dd[i + 1] = v[1]; dd[i + 2] = v[2]; }
      else { dd[i] = od[i]; dd[i + 1] = od[i + 1]; dd[i + 2] = od[i + 2]; }
      dd[i + 3] = od[i + 3];
    }
    if (eyeShift) shiftEyes(out, ld, st.eyes, eyeShift);
    if (closed) closeEyes(out, ld, st.eyes, ramps[C.skin], closed);
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    cv.getContext("2d").putImageData(out, 0, 0);
    return cv;
  }

  // blink ("blink") or happy ^ ^ eyes ("happy"): skin over the eye, then a soft dark lash curve
  function closeEyes(img, ld, boxes, skinRamp, mode) {
    const W = img.width, H = img.height, d = img.data;
    (boxes || []).forEach(([x0, y0, x1, y1]) => {
      const bw = x1 - x0, bh = y1 - y0, px = Math.round(bw * 0.4), py = Math.round(bh * 0.5);
      const X0 = Math.max(0, x0 - px), X1 = Math.min(W - 1, x1 + px), Y0 = Math.max(0, y0 - py), Y1 = Math.min(H - 1, y1 + Math.round(bh * 0.45));
      for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
        const i = (y * W + x) * 4, c = Math.round(ld[i] / 20);
        if (c === C.eye || c === C.keep) {
          const v = lerpRamp(skinRamp, 0.62); d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2];
        }
      }
      const th = Math.max(2.5, bh * 0.17), cy = y0 + bh * (mode === "happy" ? 0.6 : 0.55), arc = bh * (mode === "happy" ? 0.36 : 0.2);
      for (let x = X0; x <= X1; x++) {
        const t = (x - X0) / Math.max(1, X1 - X0) * 2 - 1;            // -1..1 across the eye
        const yc = mode === "happy" ? cy - arc * (1 - t * t) : cy + arc * (1 - t * t);
        for (let y = Math.floor(yc - th / 2); y <= Math.ceil(yc + th / 2); y++) {
          if (y < 0 || y >= H) continue;
          const i = (y * W + x) * 4, a = Math.max(0, Math.min(1, th / 2 + 0.5 - Math.abs(y - yc)));
          d[i] = d[i] * (1 - a) + 42 * a; d[i + 1] = d[i + 1] * (1 - a) + 22 * a; d[i + 2] = d[i + 2] * (1 - a) + 34 * a; d[i + 3] = Math.max(d[i + 3], 255 * a);
        }
      }
    });
  }

  // slide the iris up or down inside the eye white so she looks where she's going
  function shiftEyes(img, ld, boxes, f) {
    const W = img.width, d = img.data;
    (boxes || []).forEach(([x0, y0, x1, y1]) => {
      const dy = Math.round((y1 - y0) * f);
      if (!dy) return;
      const pad = Math.abs(dy) + 2, Y0 = Math.max(0, y0 - pad), Y1 = Math.min(img.height - 1, y1 + pad);
      // eye white colour = brightest kept pixel near the eye
      let white = [250, 250, 252], best = 0;
      for (let y = Y0; y <= Y1; y++) for (let x = x0; x <= x1; x++) {
        const i = (y * W + x) * 4, c = Math.round(ld[i] / 20);
        if (c === C.keep) { const s = d[i] + d[i + 1] + d[i + 2]; if (s > best) { best = s; white = [d[i], d[i + 1], d[i + 2]]; } }
      }
      const iris = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = (y * W + x) * 4;
        if (Math.round(ld[i] / 20) === C.eye) iris.push([x, y, d[i], d[i + 1], d[i + 2]]);
      }
      iris.forEach(([x, y]) => { const i = (y * W + x) * 4; d[i] = white[0]; d[i + 1] = white[1]; d[i + 2] = white[2]; });
      iris.forEach(([x, y, r, g, b]) => {
        const ty = y + dy; if (ty < Y0 || ty > Y1) return;
        const i = (ty * W + x) * 4, c = Math.round(ld[i] / 20);
        if (c === C.eye || c === C.keep || ld[i + 1] > 0) { d[i] = r; d[i + 1] = g; d[i + 2] = b; }
      });
    });
  }

  // head tilt + eye direction per pose
  const RIG = { idle: { tilt: 0, eyes: 0 }, up: { tilt: 0.1, eyes: -0.08 }, down: { tilt: -0.07, eyes: 0 } };

  function styleIndex(look) { const i = STYLE_IDS.indexOf(look.hair); return i < 0 ? 0 : i; }

  // Render one look in one pose → canvas. Same signature as before.
  function render(look, pose, opts) {
    pose = POSES.includes(pose) ? pose : "idle";
    const si = styleIndex(look);
    const d = DATA[pose][si] || DATA.idle[si] || DATA.idle[0];
    if (!d) { const c = document.createElement("canvas"); c.width = 48; c.height = 66; return c; }
    const st = d.st, rig = Object.assign({}, RIG[pose]);
    if (opts && opts.tilt != null) rig.tilt = opts.tilt;
    if (opts && opts.look != null) rig.eyes = opts.look;
    const art = recolor(d, look, rig.eyes, opts && opts.eyes);
    const s = TEX_H * (st.scale || 1) / DATA.idle[si].st.h;          // pixels of texture per pixel of art
    const margin = Math.round(TEX_H * 0.28);                           // room for wings
    const top = Math.round(TEX_H * 0.32);                              // room for flying hair, head tilt and wing tips
    const w = Math.round(st.w * s) + margin * 2, h = Math.round(st.h * s) + top + 8;
    const out = document.createElement("canvas"); out.width = w; out.height = h;
    const c = out.getContext("2d");
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    const ox = margin, oy = top;
    out.fig = { x: ox, y: oy, w: st.w * s, h: st.h * s };
    // wings behind everything, anchored between the shoulders
    if (look.wings && WINGS) {
      const ww = TEX_H * 1.15 * (window.PG_WINGS.scale || 1), wh = ww * WINGS.height / WINGS.width;
      const cx = ox + st.px * s, cy = oy + (st.neck + (st.h - st.neck) * 0.16) * s;
      c.save(); c.globalAlpha = 0.95; c.drawImage(WINGS, cx - ww / 2, cy - wh * 0.62, ww, wh); c.restore();
    }
    // body = whole sprite; head = everything above the neck, tilted around the neck
    c.drawImage(art, ox, oy, st.w * s, st.h * s);
    if (rig.tilt) {
      const nk = st.neck;
      const head = document.createElement("canvas"); head.width = art.width; head.height = nk + 2;
      head.getContext("2d").drawImage(art, 0, 0);
      c.save();
      c.translate(ox + st.px * s, oy + nk * s);
      c.rotate(rig.tilt);
      c.drawImage(head, -st.px * s, -nk * s, st.w * s, (nk + 2) * s);
      c.restore();
    }
    if (opts && opts.helmet) {
      const eyes = st.eyes || [];
      const ex = eyes.length ? eyes.reduce((a, b) => a + (b[0] + b[2]) / 2, 0) / eyes.length : st.px;
      const ey = eyes.length ? eyes.reduce((a, b) => a + (b[1] + b[3]) / 2, 0) / eyes.length : st.neck * 0.6;
      const cx = ox + ex * s, cy = oy + ey * s, r = TEX_H * 0.27;
      c.save();
      c.fillStyle = "rgba(190,235,255,0.22)"; c.strokeStyle = "#cfefff"; c.lineWidth = Math.max(2, r * 0.07);
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = "rgba(255,255,255,0.75)"; c.beginPath(); c.ellipse(cx - r * 0.45, cy - r * 0.5, r * 0.18, r * 0.09, -0.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#9fb4c8"; c.fillRect(cx - r * 0.7, cy + r * 0.92, r * 1.4, r * 0.14);
      c.restore();
    }
    return out;
  }

  function makeTextures(scene, look, prefix, opts) {
    const key = prefix || "hero";
    POSES.forEach((pose) => {
      const kk = `${key}-${pose}`;
      if (scene.textures.exists(kk)) scene.textures.remove(kk);
      scene.textures.addCanvas(kk, render(look, pose, opts)).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });
  }

  return { OPTIONS, DEFAULT, POSES, render, makeTextures, size: { w: 48, h: 66 }, k, ready };
})();

// ─────────────────────────────────────────────────────────────
//  World kits: platform sets and skies the player can pick.
//  "auto" keeps each level's own code-drawn art.
// ─────────────────────────────────────────────────────────────
window.PGKIT = (() => {
  const A = window.PG_KIT || { plats: {}, skies: {} };
  const imgs = {};
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  const ready = (async () => {
    for (const [id, set] of Object.entries(A.plats)) imgs["plat:" + id] = await Promise.all(set.items.map(load));
    for (const [id, sky] of Object.entries(A.skies)) imgs["sky:" + id] = await load(sky.src);
  })();
  function ensure(scene) {
    Object.entries(A.plats).forEach(([id, set]) => (imgs["plat:" + id] || []).forEach((im, i) => {
      const key = `kit-plat-${id}-${i}`;
      if (im && !scene.textures.exists(key)) scene.textures.addImage(key, im);
    }));
    Object.keys(A.skies).forEach((id) => {
      const key = `kit-sky-${id}`, im = imgs["sky:" + id];
      if (im && !scene.textures.exists(key)) scene.textures.addImage(key, im);
    });
  }
  const platIds = ["auto"].concat(Object.keys(A.plats));
  const skyIds = ["auto"].concat(Object.keys(A.skies));
  const platKeys = (id) => (A.plats[id] ? A.plats[id].items.map((_, i) => `kit-plat-${id}-${i}`) : null);
  const skyKey = (id) => (A.skies[id] ? `kit-sky-${id}` : null);
  const label = (kind, id) => (id === "auto" ? "Level" : ((kind === "plat" ? A.plats[id] : A.skies[id]) || {}).name || id);
  const thumb = (kind, id) => (id === "auto" ? null : kind === "plat" ? `kit-plat-${id}-0` : `kit-sky-${id}`);
  return { ready, ensure, platIds, skyIds, platKeys, skyKey, label, thumb };
})();

// ─────────────────────────────────────────────────────────────
//  Secret codes. Typing a code on the style screen unlocks extras.
// ─────────────────────────────────────────────────────────────
window.PGCODES = { "VENUS": { wings: true } };

window.PGCodeBox = function (onDone) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(13,4,24,.78);font-family:'Pixelify Sans',monospace";
  wrap.innerHTML = '<form style="background:#1a0b2e;border:2px solid #ff6fa8;border-radius:18px;padding:22px 20px;width:min(84vw,340px);text-align:center;color:#ffd1e6">' +
    '<div style="font-size:22px;margin-bottom:12px">Enter code</div>' +
    '<input autocomplete="off" autocapitalize="characters" spellcheck="false" style="width:100%;box-sizing:border-box;font:inherit;font-size:22px;text-align:center;padding:10px;border-radius:12px;border:2px solid #6a4cb6;background:#0d0418;color:#fff;letter-spacing:.12em">' +
    '<div class="m" style="height:22px;margin-top:10px;font-size:16px"></div>' +
    '<div style="display:flex;gap:10px;margin-top:8px"><button type="button" class="x" style="flex:1;font:inherit;font-size:18px;padding:10px;border:0;border-radius:12px;background:#2c1d4a;color:#fff">Close</button>' +
    '<button style="flex:1;font:inherit;font-size:18px;padding:10px;border:0;border-radius:12px;background:#ff4f9a;color:#fff">Unlock</button></div></form>';
  document.body.appendChild(wrap);
  const f = wrap.querySelector("form"), inp = wrap.querySelector("input"), m = wrap.querySelector(".m");
  setTimeout(() => inp.focus(), 50);
  const close = () => wrap.remove();
  wrap.querySelector(".x").onclick = close;
  f.onsubmit = (e) => {
    e.preventDefault();
    const code = inp.value.trim().toUpperCase(), gift = window.PGCODES[code];
    if (!gift) { m.textContent = "Nothing happened…"; inp.select(); return; }
    m.textContent = "✨ Unlocked ✨";
    setTimeout(() => { close(); onDone(gift); }, 650);
  };
};
