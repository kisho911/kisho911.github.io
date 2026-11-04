// Port of GameAudio.kt — same files, volumes and cooldowns.
window.AUDIO = (() => {
  const BGM_VOL = 0.10, BGM_DUCK_VOL = 0.05;
  const SFX = {
    uiOpen: ["lasersmall_002", 0.31, 150], uiClose: ["lasersmall_003", 0.31, 150],
    book: ["bookflip2", 0.53, 80], can: ["drop_003", 0.48, 80], candy: ["glass_001", 0.35, 80],
    bunny: ["drop_004", 0.51, 120], kiss: ["switch_002", 0.43, 500], drink: ["switch9", 0.47, 1000],
    candyNom: ["card_slide_8", 0.54, 300], bunnyBoost: ["phasejump3", 0.48, 1000], ruxyMagic: ["powerup9", 0.42, 2000],
    balloon: ["lasersmall_004", 0.45, 120], digi: ["confirmation_003", 0.39, 500], starFrag: ["twintone2", 0.42, 80],
  };
  const BGM_FILES = { 1: "bgm_loop", 2: "bgm_loop2", 3: "spacedreammusic" };
  let ctx = null, master = null; const buffers = {}; const last = {};
  const bgm = {}; let currentBgm = 0;

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
      Object.values(SFX).forEach(([f]) => {
        if (buffers[f] !== undefined) return; buffers[f] = null;
        fetch("assets/audio/" + f + ".mp3").then(r => r.arrayBuffer())
          .then(a => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)))
          .then(b => { buffers[f] = b; }).catch(() => {});
      });
      for (const lvl of [1, 2, 3]) {
        const el = new Audio("assets/audio/" + BGM_FILES[lvl] + ".mp3"); el.loop = true; el.preload = "auto"; el.crossOrigin = "anonymous";
        let gain = null;
        try { const src = ctx.createMediaElementSource(el); gain = ctx.createGain(); gain.gain.value = BGM_VOL; src.connect(gain); gain.connect(master); }
        catch (e) { el.volume = BGM_VOL; }
        bgm[lvl] = { el, gain };
        // prime inside the user gesture so iOS lets us start it later
        try { if (gain) gain.gain.value = 0; else el.volume = 0; const pr = el.play(); const done = () => { if (currentBgm !== lvl) el.pause(); if (gain) gain.gain.value = BGM_VOL; else el.volume = BGM_VOL; }; if (pr && pr.then) pr.then(done, done); else done(); } catch (e) { /* ignore */ }
      }
    }
    if (ctx.state === "suspended") ctx.resume();
  }

  function play(name) {
    const s = SFX[name]; if (!s || !ctx) return; const [f, vol, cd] = s;
    const now = Date.now(); if (now - (last[f] || 0) < cd) return; last[f] = now;
    const b = buffers[f]; if (!b) return;
    const src = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = vol; src.buffer = b; src.connect(g); g.connect(master); src.start();
  }
  function setVol(v) { for (const k in bgm) { const b = bgm[k]; if (b.gain) b.gain.gain.value = v; else b.el.volume = v; } }

  return {
    unlock, play,
    startBgm(level) {
      if (window.PGMUSIC) level = window.PGMUSIC;
      if (!ctx) return; setVol(BGM_VOL);
      for (const k in bgm) if (+k !== level && !bgm[k].el.paused) bgm[k].el.pause();
      const b = bgm[level]; if (b && b.el.paused) { const p = b.el.play(); if (p && p.catch) p.catch(() => {}); }
      currentBgm = level;
    },
    previewBgm(level) {                       // gift-maker music preview: ignores the gift's music choice
      if (!ctx) return; setVol(BGM_VOL);
      for (const k in bgm) if (+k !== level && !bgm[k].el.paused) bgm[k].el.pause();
      const b = bgm[level]; if (b) { try { b.el.currentTime = 0; } catch (e) {} const p = b.el.play(); if (p && p.catch) p.catch(() => {}); }
      currentBgm = level;
    },
    pauseBgm() { currentBgm = 0; for (const k in bgm) if (!bgm[k].el.paused) bgm[k].el.pause(); },
    duckBgm(d) { setVol(d ? BGM_DUCK_VOL : BGM_VOL); },
    stopAll() { for (const k in bgm) { bgm[k].el.pause(); try { bgm[k].el.currentTime = 0; } catch (e) {} } },
  };
})();
