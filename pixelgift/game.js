// ─────────────────────────────────────────────────────────────────────
//  PixelGift — Ruxi Edition. A line-by-line port of the Android game
//  (GameLogic.kt, GameItems.kt, GameAudioUI.kt, MainActivity.kt).
//  World units are the original phone's pixels: 1080 wide, 1dp = 2.625px.
// ─────────────────────────────────────────────────────────────────────
window.RUXI = (() => {
  const D = window.PG_DATA;
  const W = 1080, DP = STAGE.DP;
  const dp = (v) => Math.trunc(v * DP);
  const nowMs = () => Date.now();
  const R = {
    int(a, b) { return b === undefined ? Math.floor(Math.random() * a) : a + Math.floor(Math.random() * (b - a)); },
    f() { return Math.random(); }, bool() { return Math.random() < 0.5; },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  let H = STAGE.H;

  // ── easing (Android interpolators) ──
  const EZ = {
    lin: (p) => p,
    ad: (p) => Math.cos((p + 1) * Math.PI) / 2 + 0.5,           // AccelerateDecelerate (Android default)
    over: (p) => { const t = p - 1, k = 2; return t * t * ((k + 1) * t + k) + 1; }, // Overshoot
    acc: (p) => p * p, dec: (p) => 1 - (1 - p) * (1 - p),
  };
  const kf = (vals, p) => { const n = vals.length - 1; if (p >= 1) return vals[n]; const x = p * n, i = Math.floor(x); return vals[i] + (vals[i + 1] - vals[i]) * (x - i); };

  // ── tiny ValueAnimator ──
  const ANIMS = new Set();
  function anim(dur, fn, o) {
    o = o || {}; const a = { t0: nowMs() + (o.delay || 0), dur, fn, ease: o.ease || EZ.ad, repeat: o.repeat || 0, reverse: !!o.reverse, onEnd: o.onEnd, dead: false, started: false };
    ANIMS.add(a); return a;
  }
  function cancelAnim(a) { if (a) { a.dead = true; ANIMS.delete(a); } }
  function tickAnims() {
    const t = nowMs();
    for (const a of Array.from(ANIMS)) {
      if (a.dead) { ANIMS.delete(a); continue; }
      if (t < a.t0) continue;
      let p = (t - a.t0) / a.dur, cycle = Math.floor(p);
      if (p < 1) { a.fn(a.ease(p)); continue; }                     // still running (the port used to jump straight to the end)
      if (a.repeat && (a.repeat === Infinity || cycle < a.repeat)) {
        p = p - cycle; if (a.reverse && cycle % 2 === 1) p = 1 - p;
        a.fn(a.ease(p));
      } else {
        a.fn(a.ease(1)); ANIMS.delete(a); a.dead = true; if (a.onEnd) a.onEnd();
      }
    }
  }

  // ── View: an Android ImageView (box + FIT_CENTER/CENTER_CROP) rendered by Phaser ──
  const VIEWS = new Set();
  let sc = null; // Phaser scene
  class V {
    constructor(key, w, h, depth, mode) {
      this.x = 0; this.y = 0; this.w = w; this.h = h; this.sx = 1; this.sy = 1; this.alpha = 1; this.rot = 0; this.visible = true;
      this.tx = 0; this.ty = 0; this.b = 1; this.ba = 1; this.mode = mode || "fit"; this.key = key; this.depth = depth;
      this.spr = sc.add.image(0, 0, key).setDepth(depth); this._k = key; this.filter = null; this.fspr = null; this.under = null; this.breath = null;
      VIEWS.add(this);
    }
    setColorFilter(c, a) { this.filter = { c, a }; }
    clearColorFilter() { this.filter = null; }
    sync() {
      const s = this.spr;
      if ((this === bg || this === bg2) && window.PGONE && PGONE.sky()) this.key = PGONE.sky();
      if (this._k !== this.key) { s.setTexture(this.key); this._k = this.key; }
      if (!this.visible || this.alpha <= 0) { s.setVisible(false); if (this.fspr) this.fspr.setVisible(false); if (this.under) this.under.setVisible(false); return; }
      const src = s.texture.getSourceImage(), tw = src.width, th = src.height;
      let k = this.mode === "crop" ? Math.max(this.w / tw, this.h / th) : Math.min(this.w / tw, this.h / th);
      const pad = s.texture.customData && s.texture.customData.pgPad; if (pad) k *= pad;
      const dw = tw * k * Math.abs(this.sx) * this.b, dh = th * k * Math.abs(this.sy) * this.b;
      const cx = this.x + this.w / 2 + this.tx, cy = this.y + this.h / 2 + this.ty, al = clamp(this.alpha * this.ba, 0, 1);
      s.setVisible(true).setPosition(cx, cy).setDisplaySize(dw, dh).setFlip(this.sx < 0, this.sy < 0).setAngle(this.rot).setAlpha(al);
      if (this.under) this.under.setVisible(true).setPosition(cx, cy).setDisplaySize(this.w * Math.abs(this.sx) * this.b, this.h * Math.abs(this.sy) * this.b).setAlpha(al);
      if (this.filter) {
        if (!this.fspr) this.fspr = sc.add.image(0, 0, this.key).setDepth(this.depth + 0.01);
        const f = this.fspr; if (f.texture.key !== this.key) f.setTexture(this.key);
        f.setVisible(true).setPosition(cx, cy).setDisplaySize(dw, dh).setFlip(this.sx < 0, this.sy < 0).setAngle(this.rot).setAlpha(al * this.filter.a).setTintFill(this.filter.c);
      } else if (this.fspr) this.fspr.setVisible(false);
    }
    get width() { return this.w; } get height() { return this.h; }
    destroy() { this.dead = true; cancelAnim(this.breath); this.spr.destroy(); if (this.fspr) this.fspr.destroy(); if (this.under) this.under.destroy(); VIEWS.delete(this); }
  }
  function startBreathV(v) { stopBreathV(v); v.breath = anim(1200, (p) => { v.b = 1 + 0.03 * p; v.ba = 1 - 0.04 * p; }, { repeat: Infinity, reverse: true }); }
  function stopBreathV(v) { cancelAnim(v.breath); v.breath = null; v.b = 1; v.ba = 1; }
  const argb = (a, r, g, b) => ({ c: (r << 16) | (g << 8) | b, a: a / 255 });

  // ════════════════════ STATE (MainActivity fields) ════════════════════
  const PLAYER_W_DP = 145, PLAYER_H_DP = 210, PLATFORM_TOP_INSET_DP = 10, PLATFORM_SIDE_INSET_DP = 8, PLAYER_FEET_INSET_DP = 6, LAND_SINK_DP = 55, CONTACT_BAND_DP = 70, PLAYER_SIDE_SHRINK = 0.22;
  const coyoteMs = 120, boostCooldownMs = 450, tickMs = 16;
  const BG_PARALLAX = 0.30, VY_UP_THRESHOLD = -1, VY_DOWN_THRESHOLD = 1, VX_FACE_THRESHOLD = 55;
  const BUNNY_BOOST_POSE_MS = 650, BUNNY_ROCKET_IMPULSE = 3800;
  const CITY_TIME_LIMIT_MS = 180000, MOON_TIME_LIMIT_MS = 300000, SPACE_TIME_LIMIT_MS = 420000;
  const TAROT_SPAWN_SCHEDULE_MS = [20000, 50000, 85000, 120000, 160000];
  const STONE_SPAWN_SCHEDULE_MS = [25000, 45000, 65000, 85000, 105000, 125000, 145000, 165000, 185000, 205000, 225000, 255000, 290000];
  const PLANET_HEIGHT_THRESHOLDS = [8000, 40000, 75000, 110000, 145000, 180000, 220000, 260000, 290000];
  const TAROT_RESPAWN_MS = 12000, CRUMBLE_CHANCE = 0.18, CRUMBLE_DELAY_MS = 260, CRUMBLE_FADE_MS = 520;
  const WIND_MAX = 170, WIND_CHANGE_MIN = 900, WIND_CHANGE_MAX = 1600, WIND_LERP = 0.035;
  const SPACE_INTRO_COOLDOWN_MS = 12000, candyNomCooldownMs = 4500;
  const BG_RES = ["bg0", "bg1", "bg2", "bg3"], CORAL_BG_RES = ["bg0_coral", "bg1_coral", "bg2_coral", "bg3_coral"];
  const MOON_PHASE_RES = [1, 2, 3, 4, 5, 6, 7, 8].map(i => "assets/img/test" + i + ".webp");
  const PLANET_RES = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => "planet" + i);
  const TAROT_RES = [0, 1, 2, 3, 4].map(i => "item_tarot_" + i);

  let S; // all mutable game state, rebuilt on every entry
  function freshState() {
    return {
      currentLevel: 1, gamesPlayed: 0, isCursedRun: false, moonTimerMs: 0,
      startTapCount: 0, readyTapCount: 0, runStartMs: 0, gameplayStarted: false, overlayTapCount: 0,
      running: false, platforms: [], platformWpx: 0, platformHpx: 0, itemPx: 0,
      fingerDown: false, lastTouchX: -1, canTapBoost: true, lastLandMs: 0, lastBoostAt: 0,
      vx: 0, vy: 0, gravity: 2200, baseJumpImpulse: 2300, tapBoostImpulse: 2400, maxVx: 1100,
      scrollLineY: 0, totalScroll: 0, highHeight: 0, finalHeightAtGameOver: 0,
      bg1Y: 0, bg2Y: 0, bgAIndex: 0, bgBIndex: 1,
      bookCount: 0, canCount: 0, candyCount: 0, tarotCount: 0, bunnyCount: 0, drillCount: 0,
      lastBook33: 0, lastCan33: 0, lastCandy33: 0, lastTarot33: 0, lastBunny33: 0, lastDrill33: 0,
      pendingDrink: false, isDrinking: false, pendingHandoffKiss: false, didChristianAvatarOnce: false, pendingRuxyWizard: false, pendingCandyNom: false,
      isPlayerSequence: false, platformsSinceLastDrill: 0,
      bunnySeen: false, nextBunnyAtBooks: 7, nextBunnyAtCans: 11, bunnySpawnQueued: false, powerUpUntilMs: 0,
      laneXs: new Array(9).fill(0), lastLane: -1, streakLane: 0,
      pose: "IDLE", facing: 1, bunnyBoostPoseUntilMs: 0, pendingBunnyBoost: false, pendingNeonFizz: false, bunnyBoostSoundPlayed: false,
      shuffledPlanetOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      spaceBookIntroDoneMs: 0, spaceCanIntroDoneMs: 0, spaceCandyIntroDoneMs: 0, spaceBunnyIntroDoneMs: 0,
      pendingTarotVariant: 0, activeTarot: null, tarotForceQueued: false, nextTarotRespawnMs: 0,
      windVx: 0, windTargetVx: 0, nextWindChangeMs: 0, lastCandyNomMs: 0,
      isPaused: false, waterModeActive: false, waterModeUntilMs: 0, waterOverlay: null, godMode: false,
      sophie: null, sophieTargetX: 0, sophieTargetY: 0, sophieCurrentX: 0, sophieCurrentY: 0, sophieLastPose: -1, sophieEffectUntilMs: 0,
      spaceEffectColor: null, sophieIdleNextMs: 0, sophieRogueUntil: 0,
      signal33GlitchIndex: 0, moonstoneHintShown: false, glitchActiveUntilMs: 0, signal33Active: false,
      pausedByReveal: false, pendingMoonEnding: false, moonEndingStage: 0, moonAnimId: null,
      lastMoonPhase: -1, panicking: false, bottleOverlay: null, digiQueue: [], digiVisible: false,
      spaceStars: [], hudVisible: false, revealVisible: false, moonVisible: false, gameOverVisible: false, startVisible: false, readyVisible: false, pauseVisible: false,
    };
  }

  // Phaser objects
  let bg, bg2, vignette, playerView;
  const cached = {};

  // ════════════════════ ASSET HELPERS ════════════════════
  function getBeachAsset(res) {
    const pgx = window.PGONE && PGONE.mapAsset(res, S.currentLevel); if (pgx) return pgx;
    if (S.currentLevel === 1) return res;
    if (S.currentLevel === 3) {
      const m = { player: "playerspace", player_jump_up: "playerspace0", player_jump_down: "playerspace1", bunny_boost: "playerspace0",
        player_drink: "playerspace", player_drink_1: "playerspace", candy_nom_0: "playerspace", candy_nom_1: "playerspace", drill_handoff: "playerspace", drill_kiss: "playerspace",
        item_book: "starfrag", item_can: "cloudnebula", item_candy: "spacecarrot" };
      const pm = /^platform(\d+)$/.exec(res); if (pm) return "spaceplat" + ((+pm[1] % 9) + 1);
      const tm = /^item_tarot_(\d)$/.exec(res); if (tm) return "planet" + (+tm[1] + 1);
      if (res === "item_bunny") return randomBalloonRes();
      return m[res] || res;
    }
    const pm = /^platform(\d+)$/.exec(res); if (pm) return "platform_" + pm[1] + "_coral";
    const coral = ["player", "player_jump_up", "player_jump_down", "player_drink", "player_drink_1", "bunny_boost", "candy_nom_0", "candy_nom_1",
      "drill_handoff", "drill_kiss", "ruxy_wizard_0", "ruxy_wizard_1", "ruxy_wizard_2", "item_bunny"];
    if (coral.includes(res)) return res + "_coral";
    if (res === "overlay_signal_33") return "beach_tone_33";
    return res;
  }
  function randomPlatformRes() {
    const pk = window.PGONE && PGONE.platform(); if (pk) return pk;
    if (S.currentLevel === 3) return "spaceplat" + R.int(1, 10);
    if (S.currentLevel === 2) return "platform_" + R.int(13) + "_coral";
    return "platform" + R.int(13);
  }
  function randomBalloonRes() {
    if (S.currentLevel === 3) return "silverpinkballoons";
    const r = R.int(100); return r < 40 ? "pinkballoon1" : r < 70 ? "pinkballoon2" : r < 85 ? "silverballoon1" : "silverballoon2";
  }
  function randomNormalItemType() {
    if (S.currentLevel === 3) { const r = R.int(100); return r < 40 ? "BOOK" : r < 70 ? "CAN" : "CANDY"; }
    const r = R.int(100);
    if (tarotUnlocked()) return r < 30 ? "BOOK" : r < 60 ? "CAN" : r < 80 ? "CANDY" : r < 85 ? (window.PGPUBLIC ? "CANDY" : "DRILL") : "TAROT";
    return r < 40 ? "BOOK" : r < 75 ? "CAN" : r < 95 ? "CANDY" : (window.PGPUBLIC ? "BOOK" : "DRILL");
  }
  const getLevelTarget = () => S.currentLevel === 2 ? 13 : S.currentLevel === 3 ? 9 : 5;
  // public gifts: chosen challenge reskins the goal item (count stays the world's)
  const chalKey = () => (window.PGPUBLIC && window.PGCHAL ? "pgi-" + PGCHAL : null);
  const fullSrc = (k) => k && k.startsWith("pgi-") ? PGICONS.url(k.slice(4), { size: 256 }) : /^(item_tarot_\d|item_moonstone|planet\d)$/.test(k) ? "assets/img/" + k + "-full.webp" : "assets/img/" + k + ".webp";
  const hudSrc = (k) => k && k.startsWith("pgi-") ? PGICONS.url(k.slice(4), { size: 96 }) : "assets/img/" + k + ".webp";

  // ════════════════════ STEP (GameLogic.step) ════════════════════
  function step() {
    if (S.currentLevel === 3 && S.gravity > 900) S.gravity = 900;
    if (S.currentLevel === 3) S.vx = clamp(S.vx, -650, 650);
    updateTarotScheduling();
    updateWind();
    if (S.waterModeActive && nowMs() >= S.waterModeUntilMs) endWaterMode();

    const dt = tickMs / 1000;
    const sugarRushActive = S.currentLevel !== 3 && nowMs() < S.powerUpUntilMs;
    const speedMult = sugarRushActive ? 1.55 : 1.0;
    const activeGravity = (S.waterModeActive ? S.gravity * 0.45 : S.gravity) * pubGravMul();
    const pv = playerView;

    if (S.fingerDown && S.lastTouchX >= 0) {
      const center = pv.x + pv.width * 0.5, dx = S.lastTouchX - center;
      const desiredVx = clamp(dx * 4.0, -S.maxVx, S.maxVx) * speedMult;
      S.vx = S.vx * 0.5 + desiredVx * 0.5;
    } else S.vx *= 0.90;

    if (S.vx > VX_FACE_THRESHOLD) S.facing = 1; else if (S.vx < -VX_FACE_THRESHOLD) S.facing = -1;
    pv.sy = pv.sy * 0.82 + 0.18;
    pv.sx = S.facing * (Math.abs(pv.sx) * 0.82 + 0.18);

    const prevY = pv.y;
    S.vy += activeGravity * dt;
    pv.x += (S.vx + S.windVx) * dt * activeSpeedMultiplier();
    pv.y += S.vy * dt;

    if (sugarRushActive && nowMs() % 60 < 20) spawnAfterImage(argb(160, 255, 105, 180));
    if (S.waterModeActive && nowMs() % 60 < 20) spawnAfterImage(argb(120, 0, 180, 255));
    if (S.currentLevel === 3 && S.spaceEffectColor && nowMs() % 60 < 20) { spawnAfterImage(S.spaceEffectColor); spawnSophieAfterImage(S.spaceEffectColor); }

    const pw = pv.width;
    if (pv.x < -pw * 0.5) pv.x = W - pw * 0.5;
    if (pv.x > W - pw * 0.5) pv.x = -pw * 0.5;

    if (S.vy > 0) {
      const landed = checkPlatformLanding(prevY);
      if (landed) {
        const top = platformColliderTop(landed);
        pv.y = (top - pv.height) + cached.feet + cached.sink;
        S.vy = -S.baseJumpImpulse * activeJumpMultiplier();
        S.canTapBoost = true; S.lastLandMs = nowMs();
        if (S.currentLevel !== 3) { pv.sy = 0.7; pv.sx = S.facing * 1.3; }
        setPose("IDLE");
        maybeStartCrumble(landed);
        bouncePlatform(landed.v);
        spawnLandingDust(pv.x + pv.width / 2, pv.y + pv.height);
        if (!isAnyOverlayVisible()) { if (checkSequenceTriggers()) return; }
        if (S.currentLevel !== 3) T.post(() => { pv.sy = 1.35; pv.sx = S.facing * 0.7; }, 50);
      }
    }
    updatePoseFromVelocity();

    if ((S.currentLevel === 1 || S.currentLevel === 2) && S.running && S.gameplayStarted && !isAnyOverlayVisible() && !S.pendingMoonEnding) {
      S.moonTimerMs -= tickMs * (S.isCursedRun ? 1.25 : 1.0);
      if (S.moonTimerMs <= 0) { triggerMoonFail(); return; }
    }

    if (pv.y < S.scrollLineY) {
      const dy = S.scrollLineY - pv.y; pv.y = S.scrollLineY;
      S.platforms.forEach(p => { p.y += dy; applyPlatformView(p); syncItemToPlatform(p); });
      const move = dy * BG_PARALLAX; S.bg1Y += move; S.bg2Y += move;
      if (S.bg1Y >= H) { S.bg1Y = S.bg2Y - H; S.bgAIndex = (S.bgAIndex + 2) % 4; bg.key = S.currentLevel === 1 ? BG_RES[S.bgAIndex] : CORAL_BG_RES[S.bgAIndex]; }
      if (S.bg2Y >= H) { S.bg2Y = S.bg1Y - H; S.bgBIndex = (S.bgBIndex + 2) % 4; bg2.key = S.currentLevel === 1 ? BG_RES[S.bgBIndex] : CORAL_BG_RES[S.bgBIndex]; }
      bg.y = S.bg1Y; bg2.y = S.bg2Y;
      S.totalScroll += dy; const nh = Math.trunc(S.totalScroll);
      if (nh > S.highHeight) { S.highHeight = nh; $("hHeight").textContent = S.highHeight; }
    }

    updateMoonPhaseHud();
    updateCrumblingPlatforms(); recyclePlatformsIfNeeded();
    for (const p of S.platforms) { syncItemToPlatform(p); for (const it of p.items.slice()) { checkItemPickup(it); if (!S.running) break; } }

    if (pv.y > H + cached.dp300 && !S.godMode) { triggerGameOver(); return; }
    if (S.currentLevel === 3 || window.PGCOMP) updateSophie();
  }

  const activeSpeedMultiplier = () => S.currentLevel === 3 ? 1 : nowMs() < S.powerUpUntilMs ? 1.38 : S.waterModeActive ? 0.75 : 1;
  const activeJumpMultiplier = () => S.currentLevel === 3 ? 1 : nowMs() < S.powerUpUntilMs ? 1.20 : S.waterModeActive ? 0.78 : 1;

  function updatePoseFromVelocity() {
    if (window.PGPUBLIC) updateBoostFx();
    if (nowMs() < S.bunnyBoostPoseUntilMs) { setPose("BUNNY_BOOST"); return; }
    if (S.pose === "DRINK") return;
    setPose(S.vy <= VY_UP_THRESHOLD ? "JUMP_UP" : S.vy >= VY_DOWN_THRESHOLD ? "JUMP_DOWN" : "IDLE");
    // custom avatars: a little sway and lean in the air so the jump/fall frames feel alive
    if (window.PGONE && PGONE.look.active) {
      const fk = boostFx && boostFx.k === "wings" ? null : PGONE.frame(S.pose, S.vy / (S.baseJumpImpulse || 1), nowMs(), S.currentLevel === 3, nowMs() < (S.happyUntil || 0));
      if (fk && playerView.key !== fk) playerView.key = fk;
      const t = nowMs() / 1000, f = S.facing < 0 ? -1 : 1;
      const target = S.pose === "JUMP_UP" ? f * -5 + Math.sin(t * 10) * 3 : S.pose === "JUMP_DOWN" ? f * 8 + Math.sin(t * 7) * 5 : 0;
      if (nowMs() > (S.spinUntil || 0)) playerView.rot += (target - playerView.rot) * 0.18;
    } else if (playerView.rot) playerView.rot = 0;
  }
  const POSE_RES = { IDLE: "player", JUMP_UP: "player_jump_up", JUMP_DOWN: "player_jump_down", BUNNY_BOOST: "bunny_boost", DRINK: "player_drink" };
  function setPose(p) { if (S.pose === p) return; S.pose = p; playerView.key = getBeachAsset(POSE_RES[p]); }

  // ════════════════════ PLATFORMS ════════════════════
  function buildPlatformsInitial() {
    S.platforms.forEach(p => { p.v.destroy(); p.items.forEach(it => it.v.destroy()); });
    S.platforms = [];
    for (let i = 0; i < 13; i++) {
      const v = new V(randomPlatformRes(), S.platformWpx, S.platformHpx, 10);
      S.platforms.push({ v, x: 0, y: 0, w: S.platformWpx, h: S.platformHpx, items: [], placed: false, crumbling: false, crumbleStartMs: 0 });
    }
  }
  function recyclePlatformsIfNeeded() {
    let topY = Infinity; for (const p of S.platforms) topY = Math.min(topY, p.y);
    const [minGap, maxGap] = computeVerticalGapRange();
    for (const p of S.platforms) {
      if (p.y > H + p.h + dp(80)) {
        const targetY = topY - R.int(minGap, maxGap);
        const pos = findLaneBasedPlatformPosition(targetY, p.w, p.h);
        p.x = pos[0]; p.y = pos[1]; p.placed = true; p.v.key = randomPlatformRes();
        p.v.visible = true; p.v.alpha = 1; p.crumbling = false; p.crumbleStartMs = 0;
        applyPlatformView(p);
        if (S.gameplayStarted) { attachOrRefreshItemForPlatform(p); syncItemToPlatform(p); }
        topY = Math.min(topY, p.y);
      }
    }
  }
  function findLaneBasedPlatformPosition(targetY, pW, pH) {
    const overhang = dp(30), minX = -overhang, maxX = W - pW + overhang;
    let bestX = S.laneXs[R.int(9)], bestY = targetY, bestScore = Infinity;
    for (let i = 0; i < 120; i++) {
      const lane = pickLane(), jitter = R.int(-dp(30), dp(30));
      const x = clamp(S.laneXs[lane] + jitter, minX, maxX), y = targetY + R.int(-dp(15), dp(15));
      const score = overlapScore(x, y, pW, pH);
      if (score < bestScore) { bestScore = score; bestX = x; bestY = y; if (bestScore === 0) return [bestX, bestY]; }
    }
    return [bestX, bestY];
  }
  function pickLane() {
    const n = 9; let lane = R.int(n);
    if (lane === S.lastLane) { S.streakLane++; if (S.streakLane >= 2) { lane = (lane + R.int(1, n - 1)) % n; S.streakLane = 0; } } else S.streakLane = 0;
    if (R.f() < 0.15) lane = R.bool() ? 0 : n - 1;
    S.lastLane = lane; return lane;
  }
  function overlapScore(x, y, w, h) {
    let score = 0; const yWindow = dp(180);
    for (const p of S.platforms) {
      if (!p.placed) continue;
      const dy = Math.abs(p.y - y); if (dy > yWindow) continue;
      const xo = Math.max(0, Math.min(x + w, p.x + p.w) - Math.max(x, p.x));
      const yo = Math.max(0, Math.min(y + h, p.y + p.h) - Math.max(y, p.y));
      if (xo > 0 && yo > 0) score += 999; else if (xo > w * 0.5 && dy < dp(100)) score += dp(100) - dy;
    }
    return score;
  }
  function maybeStartCrumble(p) {
    if (p === S.platforms[0] || p.crumbling) return;
    if (R.f() > CRUMBLE_CHANCE) return;
    p.crumbling = true; p.crumbleStartMs = nowMs() + CRUMBLE_DELAY_MS;
  }
  function updateCrumblingPlatforms() {
    const t = nowMs();
    for (const p of S.platforms) {
      if (!p.crumbling || !p.v.visible || t < p.crumbleStartMs) continue;
      const f = clamp((t - p.crumbleStartMs) / CRUMBLE_FADE_MS, 0, 1);
      p.v.alpha = 1 - f;
      if (f >= 1) {
        p.v.visible = false; p.v.alpha = 1;
        p.items.forEach(it => { it.picked = true; it.v.visible = false; });
        p.y = H + p.h + dp(260); p.crumbling = false; p.crumbleStartMs = 0;
      }
    }
  }
  function applyPlatformView(p) {
    p.v.x = p.x; p.v.y = p.y;
    if (p.v.w !== S.platformWpx || p.v.h !== S.platformHpx) { p.v.w = S.platformWpx; p.v.h = S.platformHpx; p.w = S.platformWpx; p.h = S.platformHpx; }
  }
  const PLAT_RATIO = 1024 / 1536;
  function setLanes() {
    const overhang = dp(30), minX = -overhang, maxX = W - S.platformWpx + overhang, span = Math.max(0, maxX - minX);
    for (let i = 0; i < 9; i++) S.laneXs[i] = minX + span * (i / 8);
  }
  function computeSizesFromScreen() {
    S.platformWpx = clamp(Math.trunc(W * 0.29), dp(180), dp(400));
    S.platformHpx = Math.max(dp(45), Math.trunc(S.platformWpx * PLAT_RATIO));
    S.itemPx = Math.min(dp(95), Math.max(dp(50), Math.trunc(S.platformHpx * 1.15)));
    setLanes();
    cached.topInset = PLATFORM_TOP_INSET_DP * DP; cached.feet = PLAYER_FEET_INSET_DP * DP; cached.sink = LAND_SINK_DP * DP;
    cached.band = CONTACT_BAND_DP * DP; cached.side = PLATFORM_SIDE_INSET_DP * DP; cached.dp300 = 300 * DP;
  }
  function widenPlatformsForLevel() {
    const baseW = clamp(Math.trunc(W * 0.29), dp(180), dp(400));
    S.platformWpx = Math.trunc(baseW * 1.30);
    S.platformHpx = Math.max(dp(45), Math.trunc(S.platformWpx * PLAT_RATIO));
    setLanes();
  }
  function computeVerticalGapRange() {
    const v = S.baseJumpImpulse * activeJumpMultiplier();
    const reach = Math.min((v * v) / (2 * S.gravity), dp(600));
    const minGap = Math.max(Math.trunc(reach * 0.40), dp(88));
    const maxGap = Math.max(Math.min(Math.trunc(reach * 0.60), Math.trunc(reach) - dp(70)), minGap + dp(30));
    return [minGap, maxGap];
  }
  function updateWind() {
    const t = nowMs();
    if (t >= S.nextWindChangeMs) { S.windTargetVx = R.f() * 2 * WIND_MAX - WIND_MAX; S.nextWindChangeMs = t + R.int(WIND_CHANGE_MIN, WIND_CHANGE_MAX); }
    S.windVx = S.windVx * (1 - WIND_LERP) + S.windTargetVx * WIND_LERP;
  }
  function checkPlatformLanding(prevY) {
    const pv = playerView;
    const feetNow = pv.y + pv.height - cached.feet, feetPrev = prevY + pv.height - cached.feet;
    const pLeft = pv.x + pv.width * PLAYER_SIDE_SHRINK, pRight = pv.x + pv.width * (1 - PLAYER_SIDE_SHRINK);
    for (const p of S.platforms) {
      if (!p.v.visible) continue;
      const top = platformColliderTop(p), left = p.x + cached.side, right = p.x + p.w - cached.side;
      if (pRight > left && pLeft < right) {
        if (feetPrev <= top && feetNow > top) return p;
        if (feetNow > top && Math.abs(feetNow - top) <= cached.band) return p;
      }
    }
    return null;
  }
  const platformColliderTop = (p) => p.y + cached.topInset;

  // ════════════════════ ITEMS (GameItems.kt) ════════════════════
  function attachOrRefreshItemForPlatform(p) {
    p.items.forEach(it => it.v.destroy()); p.items = [];
    if (!p.v.visible) return;
    S.platformsSinceLastDrill++;
    const forceTarot = S.tarotForceQueued && S.activeTarot == null && S.pendingTarotVariant < getLevelTarget();
    const forceBunny = S.bunnySpawnQueued && R.f() < 0.55;
    const forceDrill = S.currentLevel !== 3 && S.platformsSinceLastDrill > 22 && !window.PGPUBLIC;
    if (!(forceTarot || forceBunny || forceDrill || R.f() < 0.60)) return;
    let type;
    if (forceTarot) { S.tarotForceQueued = false; type = "TAROT"; }
    else if (forceBunny) { S.bunnySpawnQueued = false; type = "BUNNY"; }
    else if (forceDrill) { S.platformsSinceLastDrill = 0; type = "DRILL"; }
    else type = randomNormalItemType();
    if (type === "DRILL") S.platformsSinceLastDrill = 0;
    createItemForPlatform(p, type, [-1, 0, 1][R.int(3)]);
  }
  function createItemForPlatform(p, type, side) {
    const L = S.currentLevel;
    const iconPack = (window.PGPACK && /^pgi-/.test(PGPACK[0]) && (type === "BOOK" || type === "CAN" || type === "CANDY")) || (type === "BUNNY" && window.PGPUBLIC && /^pgi-/.test(boostTokenRes()));
    const size = iconPack ? S.itemPx * 0.62 : type === "TAROT" && chalKey() ? S.itemPx * 0.72 : L === 3 && type === "CANDY" ? dp(77) : L === 3 && type === "CAN" ? dp(130) : L === 3 && type === "TAROT" ? dp(175) : S.itemPx;
    const item = { v: null, type, picked: false, side, tarotVariant: 0 };
    let res;
    switch (type) {
      case "BOOK": res = window.PGPACK ? PGPACK[0] : L === 2 ? "item_book_coral" : getBeachAsset("item_book"); break;
      case "CAN": res = window.PGPACK ? PGPACK[1] : L === 2 ? "item_can_coral" : getBeachAsset("item_can"); break;
      case "CANDY": res = window.PGPACK ? PGPACK[2] : L === 2 ? "item_candy_coral" : getBeachAsset("item_candy"); break;
      case "BUNNY": res = window.PGPUBLIC ? boostTokenRes() : L === 3 ? randomBalloonRes() : getBeachAsset("item_bunny"); break;
      case "DRILL": res = "item_drill"; break;
      case "TAROT": {
        const v = S.pendingTarotVariant; item.tarotVariant = v; S.activeTarot = item;
        res = chalKey() || (L === 2 ? "item_moonstone" : L === 3 ? PLANET_RES[S.shuffledPlanetOrder[v % 9]] : TAROT_RES[v % 5]); break;
      }
    }
    const v = new V(res, size, size, 11);
    if (type === "BUNNY" && L !== 3) v.under = sc.add.image(0, 0, "halo").setDepth(10.9);
    if (L === 3 && type === "BUNNY") v.sx = R.bool() ? 1 : -1;
    if (type === "BUNNY") startBreathV(v);
    if ((L === 2 || chalKey()) && type === "TAROT") { v.shine = L === 2 && !chalKey(); startBreathV(v); }
    item.v = v; p.items.push(item);
  }
  function syncItemToPlatform(p) {
    if (!p.items.length) return;
    const pad = 18 * DP, nudge = 8 * DP;
    for (const it of p.items) {
      if (it.picked || !it.v.visible) continue;
      const iw = it.v.w, ih = it.v.h, left = p.x, right = p.x + p.w, cx = left + p.w * 0.5;
      it.v.x = it.side === -1 ? left + pad : it.side === 1 ? right - pad - iw : cx - iw * 0.5;
      it.v.y = platformColliderTop(p) - ih + nudge;
    }
  }
  function checkItemPickup(item) {
    if (item.picked || !item.v.visible) return;
    const pv = playerView, iv = item.v;
    const ax1 = pv.x, ay1 = pv.y, ax2 = ax1 + pv.width, ay2 = ay1 + pv.height;
    const bx1 = iv.x, by1 = iv.y, bx2 = bx1 + iv.w, by2 = by1 + iv.h;
    if (!(ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1)) return;
    item.picked = true; iv.visible = false;
    spawnPickupSparkles(iv.x, iv.y);
    const L = S.currentLevel;
    switch (item.type) {
      case "BOOK":
        S.bookCount++;
        AUDIO.play(L === 3 ? "starFrag" : "book"); popHud($("cBook"));
        if (S.bookCount >= S.nextBunnyAtBooks) { S.bunnySpawnQueued = true; S.nextBunnyAtBooks += 12; }
        if (S.bookCount > 0 && S.bookCount % 11 === 0) { if (L === 3) sophieCelebration(); else if (!window.PGPUBLIC) S.pendingRuxyWizard = true; else chakraAura(); }
        if (window.PGPUBLIC && S.bookCount === 1 && D.ptips) showDigiMessage(D.ptips[0], 4500);
        if (L === 3 && S.bookCount === 1) { S.spaceBookIntroDoneMs = nowMs() + SPACE_INTRO_COOLDOWN_MS; T.post(() => showTutorialDigiMessage(D.digi[0]), 500); }
        if (L === 3 && S.bookCount % 11 === 0 && nowMs() > S.glitchActiveUntilMs) { S.gravity = 350; sophieStarEffect(); T.post(() => { if (S.currentLevel === 3) S.gravity = 900; }, 6000); }
        break;
      case "CAN":
        S.canCount++;
        AUDIO.play("can"); popHud($("cCan"));
        if (S.canCount >= S.nextBunnyAtCans) { S.bunnySpawnQueued = true; S.nextBunnyAtCans += 15; }
        if (window.PGPUBLIC) {
          if (S.canCount === 1 && D.ptips) showDigiMessage(D.ptips[1], 4500);
          if (S.canCount % 11 === 0) triggerNeonFizz();
        } else {
          if (S.canCount % 11 === 0) { if (L === 2) triggerWaterSurge(); else if (L !== 3) S.pendingDrink = true; }
          if (L === 1 && S.canCount === 1) showDigiMessage(D.digi[1]);
          if (L === 1 && S.canCount % 11 === 0) S.pendingNeonFizz = true;
        }
        if (L === 3 && S.canCount === 1) { S.spaceCanIntroDoneMs = nowMs() + SPACE_INTRO_COOLDOWN_MS; T.post(() => showTutorialDigiMessage(D.digi[2]), 500); }
        if (L === 3 && S.canCount % 13 === 0 && nowMs() > S.glitchActiveUntilMs) { S.gravity = 280; sophieFloatyEffect(); T.post(() => { if (S.currentLevel === 3) S.gravity = 900; }, 5000); }
        if (L === 2 && S.canCount === 11) triggerSugarRush();
        break;
      case "CANDY":
        S.candyCount++;
        AUDIO.play("candy"); popHud($("cCandy"));
        if (L === 2) {
          if (S.candyCount === 5) showDigiMessage(D.digi[3]);
          if (S.candyCount % 5 === 0) showBottleMessage();
        } else if (L === 3) {
          if (S.candyCount === 1) { S.spaceCandyIntroDoneMs = nowMs() + SPACE_INTRO_COOLDOWN_MS; showTutorialDigiMessage(D.digi[4]); }
          triggerCarrotFeed();
          if (S.candyCount % 11 === 0) sophieCarrotReact();
        } else if (window.PGPUBLIC) {
          if (S.candyCount === 1 && D.ptips) showDigiMessage(D.ptips[2], 4500);
          if (S.candyCount % 9 === 0) sweetBurst();
        } else if (S.candyCount % 9 === 0) {
          const t = nowMs(); if (t - S.lastCandyNomMs >= candyNomCooldownMs) { S.lastCandyNomMs = t; S.pendingCandyNom = true; }
        }
        break;
      case "DRILL":
        S.drillCount++; popHud($("cDrill")); shakeScreen();
        if (S.drillCount === 1) { updateHud(); checkSignal33Buckets(); pauseForReveal("drill_alert"); return; }
        if (S.drillCount === 3 && !S.didChristianAvatarOnce) { S.didChristianAvatarOnce = true; updateHud(); checkSignal33Buckets(); pauseForReveal("christian_avatar"); S.pendingHandoffKiss = true; return; }
        if (S.drillCount % 3 === 0) S.pendingHandoffKiss = true;
        break;
      case "TAROT": {
        if (S.activeTarot === item) S.activeTarot = null;
        S.tarotCount++;
        const target = getLevelTarget();
        S.pendingTarotVariant = Math.min(S.tarotCount, target);
        updateHud(); checkSignal33Buckets(); popHud($("cTarot"));
        if (L === 2) { S.powerUpUntilMs = nowMs() + 2000; AUDIO.play("bunnyBoost"); }
        if (L === 3) { planetPickupMoonReact(); if (S.tarotCount === 1) { $("cTarot").classList.remove("hidden"); $("iTarot").classList.remove("hidden"); $("iTarot").src = chalKey() ? hudSrc(chalKey()) : "assets/img/ions.webp"; } }
        if (S.tarotCount >= target) S.pendingMoonEnding = true;
        const img = chalKey() || (L === 2 ? "item_moonstone" : L === 3 ? PLANET_RES[S.shuffledPlanetOrder[item.tarotVariant % 9]] : TAROT_RES[item.tarotVariant % 5]);
        pauseForReveal(img, window.PGPUBLIC && window.PGFLOW ? PGFLOW.nextMessage() : undefined);
        return;
      }
      case "BUNNY":
        S.bunnyCount++;
        if (L === 3) AUDIO.play("balloon");
        if (!S.bunnySeen) { S.bunnySeen = true; setBunnyHudVisible(true); }
        updateHud(); checkSignal33Buckets(); popHud($("cBunny"));
        if (L === 3) {
          if (S.bunnyCount === 1) { S.spaceBunnyIntroDoneMs = nowMs() + SPACE_INTRO_COOLDOWN_MS; showTutorialDigiMessage(D.digi[5]); }
          if (nowMs() > S.glitchActiveUntilMs) applyBunnyBoostNow();
          return;
        }
        triggerBunnyPowerUp();
        return;
    }
    updateHud(); checkSignal33Buckets();
  }
  const tarotUnlocked = () => S.bookCount >= 11 && S.canCount >= 11 && S.bunnyCount >= 11;
  function updateTarotScheduling() {
    const target = getLevelTarget();
    if (S.runStartMs === 0 || S.pendingTarotVariant >= target) return;
    if (S.currentLevel === 2 && S.runStartMs > 0 && nowMs() - S.runStartMs < 8000) return;
    if (S.activeTarot) {
      const a = S.activeTarot, valid = !a.picked && a.type === "TAROT" && !a.v.dead && a.v.visible;
      if (!valid) { S.activeTarot = null; S.nextTarotRespawnMs = Math.max(S.nextTarotRespawnMs, nowMs() + TAROT_RESPAWN_MS); }
    }
    if (!S.activeTarot) {
      const t = nowMs(), elapsed = t - S.runStartMs; let due;
      if (S.currentLevel === 3) due = S.highHeight >= (PLANET_HEIGHT_THRESHOLDS[S.pendingTarotVariant] ?? Infinity);
      else {
        const sched = S.currentLevel === 2 ? STONE_SPAWN_SCHEDULE_MS : TAROT_SPAWN_SCHEDULE_MS;
        due = elapsed >= (sched[S.pendingTarotVariant] ?? sched[sched.length - 1] + 15000 * (S.pendingTarotVariant - sched.length + 1)) || (S.nextTarotRespawnMs > 0 && t >= S.nextTarotRespawnMs);
      }
      if (due) { S.tarotForceQueued = true; S.nextTarotRespawnMs = 0; }
    }
  }
  function checkSignal33Buckets() {
    if (window.PGPUBLIC) return;
    const hits = []; let bigHit = false;
    const hitIf = (count, lastKey, label) => {
      if (count > 0 && count !== S[lastKey]) {
        const trig = S.currentLevel === 3 ? 22 : 33;
        if (count % trig === 0) { S[lastKey] = count; bigHit = true; return; }
        if (S.currentLevel !== 3 && (count === 7 || count === 9 || count === 11) && R.f() < 0.70) { S[lastKey] = count; hits.push(label); }
      }
    };
    hitIf(S.bookCount, "lastBook33", "Books"); hitIf(S.canCount, "lastCan33", "Cans"); hitIf(S.candyCount, "lastCandy33", "Candy");
    hitIf(S.tarotCount, "lastTarot33", "Tarot"); hitIf(S.bunnyCount, "lastBunny33", "Bunnies"); hitIf(S.drillCount, "lastDrill33", "Drills");
    if (bigHit) {
      shakeScreen();
      if (S.currentLevel === 3) { S.glitchActiveUntilMs = nowMs() + 4000; triggerSignal33Glitch(); S.powerUpUntilMs = nowMs() + 6000; }
      else spawnSignal33Overlay();
    } else if (hits.length && S.currentLevel !== 3) spawnSignal33Burst();
  }
  function sigImg() { return "assets/img/" + getBeachAsset("overlay_signal_33") + ".webp"; }
  function spawnSignal33Burst() {
    if (S.signal33Active) return; S.signal33Active = true;
    const g = h("img", "sig"); g.src = sigImg(); g.style.cssText = "width:calc(120*var(--dp));height:calc(120*var(--dp));margin:calc(-60*var(--dp)) 0 0 calc(-60*var(--dp));z-index:9000";
    $("fx").appendChild(g);
    g.animate([{ opacity: 0, transform: "scale(.8)" }, { opacity: .8, transform: "scale(1.05)" }, { opacity: 0, transform: "scale(1.3)" }], { duration: 3000, easing: EASE_IO }).onfinish = () => { g.remove(); S.signal33Active = false; };
  }
  function spawnSignal33Overlay() {
    const g = h("img", "sig"); g.src = sigImg(); g.style.cssText = "width:calc(300*var(--dp));height:calc(300*var(--dp));margin:calc(-150*var(--dp)) 0 0 calc(-150*var(--dp));z-index:9500";
    $("fx").appendChild(g);
    g.animate([{ opacity: 0, transform: "scale(1)" }, { opacity: .9, transform: "scale(1.2)" }, { opacity: 0, transform: "scale(1)" }], { duration: 3000, easing: EASE_IO }).onfinish = () => g.remove();
  }

  // ════════════════════ LEVELS ════════════════════
  function resetCounts() {
    Object.assign(S, { bookCount: 0, canCount: 0, candyCount: 0, tarotCount: 0, bunnyCount: 0, drillCount: 0, platformsSinceLastDrill: 0,
      lastBook33: 0, lastCan33: 0, lastCandy33: 0, lastTarot33: 0, lastBunny33: 0, lastDrill33: 0, bunnySeen: false, bunnySpawnQueued: false });
  }
  function bumpGamesAndCurse() {
    const forced = PREFS.get("force_cursed_next", false);
    if (forced) { S.isCursedRun = true; PREFS.set("force_cursed_next", false); }
    else { const total = PREFS.get("total_games_played", 0) + 1; PREFS.set("total_games_played", total); S.isCursedRun = total % 5 === 0; }
  }
  function startBeachLevel() {
    resetCounts(); S.nextBunnyAtBooks = 7; S.nextBunnyAtCans = 11;
    S.pendingDrink = S.pendingHandoffKiss = S.pendingRuxyWizard = S.pendingCandyNom = false;
    S.powerUpUntilMs = 0; S.pendingTarotVariant = 0; S.activeTarot = null;
    setBunnyHudVisible(false); updateHud();
    S.currentLevel = 2; updateHudIconsForLevel(); S.running = false; S.gameplayStarted = true;
    S.runStartMs = nowMs(); playerView.visible = true; setHudVisible(true);
    widenPlatformsForLevel();
    S.tarotForceQueued = false; S.nextTarotRespawnMs = 0; S.gamesPlayed++;
    S.isCursedRun = S.gamesPlayed % 5 === 0; S.moonTimerMs = MOON_TIME_LIMIT_MS;
    S.lastMoonPhase = -1; createMoonPhaseHud(); resetMoonPanic();
    S.bgAIndex = 0; S.bgBIndex = 1; bg.key = CORAL_BG_RES[0]; bg2.key = CORAL_BG_RES[1];
    S.platforms.forEach(p => { p.v.key = randomPlatformRes(); applyPlatformView(p); attachOrRefreshItemForPlatform(p); syncItemToPlatform(p); });
    S.vy = -S.baseJumpImpulse; playerView.key = getBeachAsset("player");
  }
  function startSpaceLevel() {
    resetCounts(); S.nextBunnyAtBooks = 12; S.nextBunnyAtCans = 15;
    S.shuffledPlanetOrder = R.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    S.spaceBookIntroDoneMs = S.spaceCanIntroDoneMs = S.spaceCandyIntroDoneMs = S.spaceBunnyIntroDoneMs = 0;
    S.digiQueue = [];
    S.pendingDrink = S.pendingHandoffKiss = S.pendingRuxyWizard = S.pendingCandyNom = false;
    S.powerUpUntilMs = 0; S.pendingTarotVariant = 0; S.activeTarot = null;
    setBunnyHudVisible(false); updateHud();
    S.currentLevel = 3; updateHudIconsForLevel(); S.running = false; S.gameplayStarted = true;
    S.runStartMs = nowMs(); playerView.visible = true; setHudVisible(true);
    S.gravity = 900;
    bg.visible = bg2.visible = !!(window.PGONE && PGONE.sky());
    $("revealOv").style.zIndex = 15000;
    buildSpaceBackground();
    widenPlatformsForLevel();
    S.tarotForceQueued = false; S.nextTarotRespawnMs = 0; S.gamesPlayed++;
    bumpGamesAndCurse();
    S.moonTimerMs = SPACE_TIME_LIMIT_MS; S.lastMoonPhase = -1; createMoonPhaseHud();
    S.bgAIndex = 0; S.bgBIndex = 1;
    S.platforms.forEach(p => { p.v.key = randomPlatformRes(); applyPlatformView(p); attachOrRefreshItemForPlatform(p); syncItemToPlatform(p); });
    S.vy = -S.baseJumpImpulse; S.pose = "IDLE"; playerView.key = getBeachAsset("playerspace");
    AUDIO.startBgm(3);
  }
  function buildSpaceBackground() {
    S.spaceStars.forEach(s => s.destroy()); S.spaceStars = [];
    sc.cameras.main.setBackgroundColor("#050010");
    for (const [count, bright, maxSize] of [[20, 155, 3], [13, 200, 5], [7, 255, 8]]) {
      for (let i = 0; i < count; i++) {
        const size = dp(R.int(2, maxSize));
        const col = (R.int(180, 255) << 16) | (R.int(160, 220) << 8) | 255;
        const st = sc.add.circle(R.f() * W + size / 2, R.f() * H + size / 2, size / 2, col, bright / 255).setDepth(1);
        st.baseA = (R.f() * 0.6 + 0.4); st.setAlpha(st.baseA * bright / 255); st.bright = bright;
        S.spaceStars.push(st);
      }
    }
    const brightOnes = S.spaceStars.slice(-7);
    S.starTwinkle = anim(2200, (p) => { const v = 0.5 + 0.5 * p; brightOnes.forEach(s => s.setAlpha(v)); }, { repeat: Infinity, reverse: true });
  }

  function resetGame() {
    S.running = false; S.gameplayStarted = false; S.currentLevel = 1; updateHudIconsForLevel();
    S.gravity = 2200;
    playerView.clearColorFilter();
    $("revealOv").style.zIndex = 100;
    S.spaceEffectColor = null; S.sophieIdleNextMs = 0; S.signal33GlitchIndex = 0; S.glitchActiveUntilMs = 0;
    cancelAnim(S.starTwinkle); S.spaceStars.forEach(s => s.destroy()); S.spaceStars = [];
    if (S.sophie) { S.sophie.destroy(); S.sophie = null; }
    bg.visible = true; bg2.visible = true;
    sc.cameras.main.setBackgroundColor("#000000");
    AUDIO.pauseBgm(); computeSizesFromScreen();
    S.isDrinking = S.isPlayerSequence = S.pendingDrink = S.pendingHandoffKiss = S.pendingRuxyWizard = S.pendingCandyNom = S.didChristianAvatarOnce = false;
    S.fingerDown = false; S.lastTouchX = -1; S.totalScroll = 0; S.highHeight = 0; S.finalHeightAtGameOver = 0;
    resetOverlayGate(); S.bgAIndex = 0; S.bgBIndex = 1; bg.key = BG_RES[0]; bg2.key = BG_RES[1];
    S.bg1Y = 0; S.bg2Y = -H; bg.y = 0; bg2.y = -H;
    S.vx = 0; S.vy = -S.baseJumpImpulse; S.facing = 1; playerView.sx = 1; playerView.sy = 1; S.pose = null; setPose("IDLE");
    playerView.visible = false; setHudVisible(false);
    S.bunnyBoostPoseUntilMs = 0; S.pendingBunnyBoost = false; S.pendingNeonFizz = false; S.bunnyBoostSoundPlayed = false;
    S.canTapBoost = true; S.lastLandMs = nowMs(); S.lastBoostAt = 0;
    S.windVx = 0; S.windTargetVx = 0; S.nextWindChangeMs = nowMs() + 600;
    resetCounts(); S.nextBunnyAtBooks = 7; S.nextBunnyAtCans = 11; S.powerUpUntilMs = 0;
    S.isPaused = false; $("pauseBtn").classList.add("hidden");
    S.waterModeActive = false; S.waterModeUntilMs = 0; if (S.waterOverlay) { S.waterOverlay.destroy(); S.waterOverlay = null; }
    S.startTapCount = 0; S.readyTapCount = 0;
    showOv("startOv", true); $("startOv").querySelector(".taphint").classList.remove("hidden");
    showOv("readyOv", false); S.pausedByReveal = false;
    $("moonHud").classList.remove("hidden"); $("moonGlow").classList.remove("hidden");
    S.lastMoonPhase = -1;
    S.gamesPlayed++;
    bumpGamesAndCurse();
    S.moonTimerMs = CITY_TIME_LIMIT_MS;
    resetMoonPanic(); updateMoonPhaseHud();
    stopBreath($("revealImg")); showOv("revealOv", false); stopBreath($("moonImg")); showOv("moonOv", false); S.pendingMoonEnding = false;
    S.runStartMs = 0; S.pendingTarotVariant = 0; S.activeTarot = null; S.tarotForceQueued = false; S.nextTarotRespawnMs = 0;
    hideToastNow();
    updateHud(); setBunnyHudVisible(false);
    S.platforms.forEach(p => { p.items.forEach(it => it.v.destroy()); p.items = []; p.v.visible = true; p.v.alpha = 1; p.crumbling = false; p.crumbleStartMs = 0; p.placed = false; });
    const baseY = H - dp(180);
    const [minGap, maxGap] = computeVerticalGapRange();
    const p0 = S.platforms[0];
    p0.x = S.laneXs[4]; p0.y = baseY; p0.placed = true; p0.v.key = getBeachAsset("platform0"); applyPlatformView(p0);
    let y = baseY;
    for (let i = 1; i < S.platforms.length; i++) {
      y -= R.int(minGap, maxGap);
      const p = S.platforms[i], pos = findLaneBasedPlatformPosition(y, p.w, p.h);
      p.x = pos[0]; p.y = pos[1]; p.placed = true; p.v.key = randomPlatformRes(); applyPlatformView(p);
    }
    playerView.x = p0.x + p0.w * 0.5 - playerView.w * 0.5;
    playerView.y = platformColliderTop(p0) - playerView.h + cached.feet + cached.sink;
    playerView.visible = true;
  }
  function startRunNow() {
    S.gameplayStarted = true; playerView.visible = true; setHudVisible(true);
    $("pauseBtn").classList.remove("hidden");
    S.platforms.forEach(p => { attachOrRefreshItemForPlatform(p); syncItemToPlatform(p); });
    S.runStartMs = nowMs(); S.pendingTarotVariant = 0; S.activeTarot = null; S.tarotForceQueued = false; S.nextTarotRespawnMs = 0;
    if (S.isCursedRun && S.currentLevel !== 3) $("moonGlow").style.setProperty("--glow", "rgba(140,255,100,.47)");
    if ((S.currentLevel === 3 || window.PGCOMP) && !S.sophie) spawnSophie();
    S.running = true; AUDIO.startBgm(S.currentLevel);
  }

  // ════════════════════ SOPHIE ════════════════════
  function makeSophie() { if (S.sophie) S.sophie.destroy(); const v = new V("sophiespace0", dp(110), dp(110), 1500); S.sophie = v; S.sophieLastPose = -1; return v; }
  function spawnSophie() {
    const v = makeSophie();
    S.sophieCurrentX = playerView.x - dp(120); S.sophieCurrentY = playerView.y;
    S.sophieTargetX = S.sophieCurrentX; S.sophieTargetY = S.sophieCurrentY; v.x = S.sophieCurrentX; v.y = S.sophieCurrentY;
  }
  function updateSophie() {
    const sv = S.sophie; if (!sv) return;
    const t = nowMs();
    const pcx = playerView.x + playerView.width * 0.5, toRight = pcx < W * 0.5;
    S.sophieTargetX = playerView.x + (toRight ? 100 * DP : -100 * DP);
    S.sophieTargetY = playerView.y + 20 * DP;
    if (S.sophieEffectUntilMs < t && !sv.popping) sv.sx = toRight ? -1 : 1;
    S.sophieCurrentX += (S.sophieTargetX - S.sophieCurrentX) * 0.06;
    S.sophieCurrentY += (S.sophieTargetY - S.sophieCurrentY) * 0.06;
    const bob = Math.sin(t * 0.003) * 6 * DP;
    if (t > S.sophieRogueUntil) { sv.x = S.sophieCurrentX; sv.y = S.sophieCurrentY + bob; }
    const sway = Math.sin(t * 0.002) * 6;
    if (S.sophieEffectUntilMs < t && !sv.spinning) sv.rot = sway;
    const np = S.vy < -200 ? 1 : S.vy < 380 ? 2 : 3;
    if (np !== S.sophieLastPose) { S.sophieLastPose = np; sv.key = "sophiespace" + np; }
    if (S.sophieIdleNextMs === 0) S.sophieIdleNextMs = t + 8000 + R.int(7000);
    if (t >= S.sophieIdleNextMs && S.sophieEffectUntilMs < t) {
      S.sophieIdleNextMs = t + 8000 + R.int(7000);
      const k = R.int(3);
      if (k === 0) { sv.spinning = true; anim(500, p => { sv.rot = sway + 360 * p; }, { onEnd: () => { sv.spinning = false; sv.rot = sway; } }); }
      else if (k === 1) popScale(sv, 1.25, 400);
      else { const c = R.pick([argb(120, 255, 105, 180), argb(120, 220, 60, 255), argb(120, 140, 80, 255), argb(120, 0, 220, 255)]); sv.setColorFilter(c.c, c.a); T.post(() => sv.clearColorFilter(), 300); }
    }
  }
  function popScale(v, peak, ms) {
    const dir = Math.sign(v.sx) || 1; v.popping = true;
    anim(ms, p => { const s = kf([1, peak, 1], p); v.sx = dir * s; v.sy = s; }, { onEnd: () => { v.popping = false; v.sy = 1; } });
  }
  function spin(v, deg, ms, onEnd) { v.spinning = true; anim(ms, p => { v.rot = deg * p; }, { onEnd: () => { v.spinning = false; if (onEnd) onEnd(); } }); }
  function sophieFloatyEffect() {
    const sv = S.sophie; if (!sv) return;
    S.sophieEffectUntilMs = nowMs() + 5000; S.spaceEffectColor = argb(130, 140, 80, 255);
    const f = argb(90, 140, 80, 255); sv.setColorFilter(f.c, f.a);
    popScale(sv, 1.3, 800); spin(sv, 720, 1000);
    const pf = argb(60, 140, 80, 255); playerView.setColorFilter(pf.c, pf.a);
    T.post(() => { if (S.sophie) S.sophie.clearColorFilter(); playerView.clearColorFilter(); S.spaceEffectColor = null; }, 5000);
  }
  function sophieStarEffect() {
    const sv = S.sophie; if (!sv) return;
    S.sophieEffectUntilMs = nowMs() + 6000; S.spaceEffectColor = argb(130, 80, 220, 255);
    const f = argb(90, 80, 220, 255); sv.setColorFilter(f.c, f.a); spin(sv, 720, 800);
    const pf = argb(60, 80, 220, 255); playerView.setColorFilter(pf.c, pf.a);
    T.post(() => { if (S.sophie) S.sophie.clearColorFilter(); playerView.clearColorFilter(); S.spaceEffectColor = null; }, 6000);
  }
  function sophieCelebration() {
    const sv = S.sophie; if (!sv) return;
    S.sophieEffectUntilMs = nowMs() + 600;
    popScale(sv, 1.4, 600); spin(sv, 360, 600, () => { sv.rot = 0; S.sophieEffectUntilMs = 0; });
  }
  function triggerCarrotFeed() {
    const sv = S.sophie; if (!sv) return;
    const size = dp(60);
    const c = new V("spacecarrot", size, size, 1800);
    c.x = playerView.x + playerView.width * 0.5 - size * 0.5; c.y = playerView.y;
    const x0 = c.x, y0 = c.y, tx = sv.x + sv.w * 0.5 - size * 0.5, ty = sv.y;
    anim(950, p => { c.x = x0 + (tx - x0) * p; c.y = y0 + (ty - y0) * p; c.sx = 1 - p; c.sy = 1 - p; }, { onEnd: () => { c.destroy(); sophieCelebration(); } });
  }
  function sophieDramaticSpawn() {
    const v = makeSophie(), sz = dp(110);
    v.sx = 0; v.sy = 0; v.alpha = 0;
    S.sophieCurrentX = playerView.x - sz * 0.6; S.sophieCurrentY = playerView.y;
    v.x = S.sophieCurrentX; v.y = S.sophieCurrentY; S.sophieTargetX = S.sophieCurrentX; S.sophieTargetY = S.sophieCurrentY;
    v.popping = true;
    anim(600, p => { const s = kf([0, 1.4, 1], p); v.sx = s; v.sy = s; v.alpha = Math.min(1, p * 1.0); }, { ease: EZ.over, onEnd: () => {
      v.popping = false; v.sx = 1; v.sy = 1; v.alpha = 1;
      const f = argb(180, 255, 60, 200); v.setColorFilter(f.c, f.a);
      for (let i = 0; i < 4; i++) T.post(() => spawnPickupSparkles(v.x, v.y), i * 100);
      T.post(() => { v.clearColorFilter(); S.sophieIdleNextMs = 0; }, 400);
    } });
    // keep her visible before the run starts
    S.sophiePreRun = anim(100000, () => { if (!S.running && S.sophie === v) { v.x = S.sophieCurrentX; v.y = S.sophieCurrentY + Math.sin(nowMs() * 0.003) * 6 * DP; } }, { ease: EZ.lin });
  }
  function sophieCarrotReact() {
    const sv = S.sophie; if (!sv) return;
    const c = R.pick([argb(160, 255, 105, 180), argb(160, 220, 60, 255), argb(160, 0, 220, 255)]);
    sv.setColorFilter(c.c, c.a); T.post(() => sv.clearColorFilter(), 250);
    spin(sv, 360, 500, () => { sv.rot = 0; });
  }
  function spawnSophieAfterImage(col) {
    const sv = S.sophie; if (!sv) return;
    const g = new V(sv.key, sv.w, sv.h, 1400);
    Object.assign(g, { x: sv.x, y: sv.y, sx: sv.sx, sy: sv.sy, rot: sv.rot, alpha: 0.5 }); g.setColorFilter(col.c, Math.min(1, col.a * 1.6));
    const sx0 = sv.sx, sy0 = sv.sy;
    anim(500, p => { g.alpha = 0.5 * (1 - p); g.sx = sx0 * (1 - 0.2 * p); g.sy = sy0 * (1 - 0.2 * p); }, { onEnd: () => g.destroy() });
  }

  // ── digi messages (CRT terminal) ──
  let digiHideId = null, digiPersist = null;
  function showDigiMessage(msg, dur) {
    if (S.digiVisible) { S.digiQueue.push(msg); return; }
    displayDigiMessage(msg, dur || 6500);
  }
  function displayDigiMessage(msg, dur, onDismiss) {
    const dv = $("digi");
    T.cancel(digiHideId);
    dv.textContent = msg; dv.classList.remove("hidden"); dv.style.opacity = 1; S.digiVisible = true;
    if (window.PGPUBLIC && window.POP) { const c = POP.digiColors(); dv.classList.add("pub"); dv.style.top = "calc(178*var(--dp))"; dv.style.transform = "none"; dv.style.color = c.c; dv.style.borderColor = c.c; dv.style.background = c.bg; dv.style.textShadow = "0 0 calc(5*var(--dp)) " + c.g; }
    else { dv.classList.remove("pub"); dv.style.top = dv.style.transform = ""; dv.style.color = dv.style.borderColor = dv.style.background = dv.style.textShadow = ""; }
    AUDIO.play("digi");
    dv.getAnimations().forEach(a => a.cancel());
    dv.animate([{ opacity: .3 }, { opacity: 1 }, { opacity: .6 }, { opacity: 1 }, { opacity: .4 }, { opacity: 1 }], { duration: 400 });
    digiPersist = dv.animate([{ opacity: 1 }, { opacity: .85 }, { opacity: 1 }, { opacity: .92 }, { opacity: .78 }, { opacity: 1 }, { opacity: .95 }, { opacity: 1 }], { duration: 2200, delay: 450, iterations: Infinity });
    let taps = 0;
    const finish = (fade) => {
      dv.onclick = null; T.cancel(digiHideId);
      const done = () => {
        dv.getAnimations().forEach(a => a.cancel()); dv.classList.add("hidden"); S.digiVisible = false;
        if (onDismiss) onDismiss();
        if (S.digiQueue.length) T.post(() => displayDigiMessage(S.digiQueue.shift(), 6500), 400);
      };
      if (fade) { digiPersist.cancel(); dv.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }).onfinish = done; } else done();
    };
    digiHideId = T.post(() => finish(true), dur);
    dv.onclick = (e) => { e.stopPropagation(); taps++; if (taps >= (window.PGPUBLIC ? 1 : 2)) finish(false); };
  }
  function showTutorialDigiMessage(msg) {
    if (window.PGPUBLIC) { showDigiMessage(msg, 4500); return; }
    S.running = false;
    const duration = Math.min(9000, 4000 + msg.length * 30);
    const tryResume = () => { if (S.gameplayStarted && !isAnyOverlayVisible() && !S.isPaused && !S.running) S.running = true; };
    if (S.digiVisible) { S.digiQueue.push(msg); T.post(tryResume, 200); return; }
    let resumed = false;
    const auto = T.post(() => { if (!resumed) { resumed = true; tryResume(); } }, duration + 200);
    displayDigiMessage(msg, duration, () => { if (!resumed) { resumed = true; T.cancel(auto); tryResume(); } });
  }

  // ── Signal 33 glitches (space) ──
  function triggerSignal33Glitch() {
    if (window.PGPUBLIC) return;
    const gi = S.signal33GlitchIndex;
    const msg = D.signal33[gi % 3][Math.floor(gi / 3) % 3];
    const dur = gi % 3 === 0 ? (glitch1Teleport(), 3200) : gi % 3 === 1 ? (glitch2DimensionalGhosts(), 12200) : (glitch3SophieRogue(), 2400);
    if (gi % 2 === 0) T.post(() => showDigiMessage(msg), dur);
    S.signal33GlitchIndex++;
  }
  function glitch1Teleport() {
    const ox = playerView.x, oy = playerView.y; let delay = 0;
    for (const [px, py] of [[W * 0.78, H * 0.18], [W * 0.08, H * 0.52], [W * 0.62, H * 0.72]]) {
      T.post(() => { playerView.alpha = 0.2; }, delay);
      T.post(() => { playerView.x = px; playerView.y = py; playerView.alpha = 1; }, delay + 150);
      delay += 750;
    }
    T.post(() => { playerView.alpha = 0.2; }, delay);
    T.post(() => { playerView.x = ox; playerView.y = oy; playerView.alpha = 1; }, delay + 150);
  }
  function glitch2DimensionalGhosts() {
    const sz = dp(130);
    const picked = R.shuffle(["playerspace", "playerspace0", "playerspace1", "player", "player_coral", "player_jump_up", "player_jump_down", "player_drink", "ruxy_wizard_0", "ruxy_wizard_1"]).slice(0, 3);
    const pos = [[W * 0.08, H * 0.20], [W * 0.45, H * 0.30], [W * 0.78, H * 0.55]];
    const drifts = [[-40 * DP, 30 * DP], [0, -70 * DP], [50 * DP, -40 * DP]], rots = [-15, 360, 15], mirrors = [false, true, false];
    picked.forEach((key, i) => {
      const g = new V(key, sz, sz, 1800); g.x = pos[i][0]; g.y = pos[i][1]; g.alpha = 0; g.sx = mirrors[i] ? -1 : 1;
      anim(12000, p => { g.alpha = kf([0, 0.4, 0.4, 0], p); g.tx = drifts[i][0] * p; g.ty = drifts[i][1] * p; g.rot = rots[i] * p; }, { onEnd: () => g.destroy() });
    });
  }
  function glitch3SophieRogue() {
    const sv = S.sophie; if (!sv) return;
    const ox = S.sophieCurrentX, oy = S.sophieCurrentY;
    const pts = [[W * 0.85, H * 0.15], [W * 0.05, H * 0.45], [W * 0.75, H * 0.65], [W * 0.10, H * 0.25], [W * 0.90, H * 0.55], [W * 0.15, H * 0.20], [W * 0.60, H * 0.70], [ox, oy]];
    let delay = 0; S.sophieRogueUntil = nowMs() + pts.length * 290 + 100;
    for (const [tx, ty] of pts) {
      T.post(() => { const x0 = sv.x, y0 = sv.y; anim(280, p => { sv.x = x0 + (tx - x0) * p; sv.y = y0 + (ty - y0) * p; }); }, delay);
      delay += 290;
    }
    T.post(() => { S.sophieCurrentX = ox; S.sophieCurrentY = oy; sv.x = ox; sv.y = oy; }, delay + 100);
  }
  function planetPickupMoonReact() {
    const mv = $("moonHud"); mv.classList.remove("hidden");
    const nextPhase = clamp(S.tarotCount, 0, 7);
    mv.src = MOON_PHASE_RES[nextPhase];
    let d = 0;
    for (let i = 1; i <= 4; i++) {
      T.post(() => { mv.src = MOON_PHASE_RES[(nextPhase + i) % 8]; mv.animate([{ transform: "scale(1.2)" }, { transform: "scale(1)" }], { duration: 100 }); }, d);
      d += 110;
    }
    T.post(() => { mv.src = MOON_PHASE_RES[nextPhase]; mv.animate([{ transform: "scale(1)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: 500, easing: OVERSHOOT }); }, d);
  }

  // ════════════════════ UI (GameAudioUI.kt) ════════════════════
  function showOv(id, on) { $(id).classList.toggle("hidden", !on); }
  const vis = (id) => !$(id).classList.contains("hidden");
  function isAnyOverlayVisible() {
    return (window.POP && POP.isOpen()) || vis("startOv") || vis("readyOv") || vis("gameOverOv") || vis("revealOv") || vis("moonOv") || vis("pauseOv") || S.bottleOverlay != null || S.isDrinking || S.isPlayerSequence;
  }
  function setHudVisible(on) { $("hud").classList.toggle("inv", !on); S.hudVisible = on; if (window.PGHUD) PGHUD.visible(on); }

  function triggerPause() {
    if (!S.gameplayStarted || S.isPaused) return;
    S.isPaused = true; S.wasRunning = S.running; S.running = false; AUDIO.pauseBgm();
    $("pauseBtn").classList.add("hidden"); showOv("pauseOv", true);
  }
  function resumeGame() {
    if (!S.isPaused) return;
    S.isPaused = false; showOv("pauseOv", false); $("pauseBtn").classList.remove("hidden");
    AUDIO.startBgm(S.currentLevel);
    if (!isAnyOverlayVisible() || S.wasRunning) S.running = true;
  }

  function onStartTap() {
    AUDIO.unlock();
    if (window.PGPUBLIC && window.POP) {
      if (S.startTapCount > 0) return; S.startTapCount = 1;
      const L = S.currentLevel, first = D.start[L][0][0], rs = D.ready[L];
      $("startOv").querySelector(".taphint").classList.add("hidden"); showOv("startOv", false); AUDIO.play("uiClose");
      if (L === 3) sophieDramaticSpawn();
      POP.toast(first, { ms: 1900 });
      rs.forEach((w, i) => T.post(() => POP.toast(w, { ms: 600 }), 2000 + i * 650));
      T.post(() => { showOv("readyOv", false); startRunNow(); }, 2000 + rs.length * 650);
      return;
    }
    S.startTapCount++;
    $("startOv").querySelector(".taphint").classList.add("hidden");
    const L = S.currentLevel, line = D.start[L][Math.min(S.startTapCount, 3) - 1];
    if (S.startTapCount === 1) showSpellToast(line[0], line[1]);
    else if (S.startTapCount === 2) { showSpellToast(line[0], line[1]); if (L === 3) sophieDramaticSpawn(); }
    else if (S.startTapCount === 3) {
      showSpellToast(line[0], line[1]); AUDIO.play("uiClose");
      showOv("startOv", false); S.readyTapCount = 0; showOv("readyOv", true); AUDIO.play("uiOpen");
    }
  }
  function onReadyTap() {
    S.readyTapCount++;
    const msg = D.ready[S.currentLevel][Math.min(S.readyTapCount, 3) - 1];
    if (S.readyTapCount < 3) showSpellToast(msg);
    else if (S.readyTapCount === 3) { showSpellToast(msg); AUDIO.play("uiClose"); showOv("readyOv", false); startRunNow(); }
  }

  function handleDown(x) {
    if (isAnyOverlayVisible()) return;
    S.fingerDown = true; S.lastTouchX = x;
    const t = nowMs(), inCoyote = t - S.lastLandMs <= coyoteMs, falling = S.vy > 0;
    if (S.canTapBoost && (falling || inCoyote) && t - S.lastBoostAt > boostCooldownMs) {
      S.lastBoostAt = t; const desired = -S.tapBoostImpulse * activeJumpMultiplier();
      if (S.vy > desired) { S.vy = desired; if (S.currentLevel !== 3) { playerView.sy = 1.35; playerView.sx = S.facing * 0.65; } }
      S.canTapBoost = false;
    }
  }
  function handleMove(x) { if (isAnyOverlayVisible()) return; if (S.fingerDown) S.lastTouchX = x; }
  function handleUp() { S.fingerDown = false; S.lastTouchX = -1; }

  function resetOverlayGate() { S.overlayTapCount = 0; }
  function overlayTapGateWithSpells(done) {
    if (window.PGPUBLIC) { S.overlayTapCount = 0; done(); return; }
    S.overlayTapCount++;
    if (S.overlayTapCount === 1) showSpellToast(D.gate[0], 1400);
    else if (S.overlayTapCount === 2) showSpellToast(D.gate[1], 1400);
    else { showSpellToast(D.gate[2], 900); S.overlayTapCount = 0; T.post(done, 220); }
  }

  function checkSequenceTriggers() {
    if (S.currentLevel === 3) { S.pendingHandoffKiss = S.pendingRuxyWizard = S.pendingCandyNom = S.pendingDrink = false; return false; }
    const g = getBeachAsset;
    if (S.pendingHandoffKiss) { S.pendingHandoffKiss = false; T.post(() => AUDIO.play("kiss"), 200); startPlayerSpriteSequence([g("drill_handoff"), g("drill_kiss")], [550, 620], 2); return true; }
    if (S.pendingRuxyWizard) {
      S.pendingRuxyWizard = false; AUDIO.play("ruxyMagic");
      startPlayerSpriteSequence([g("ruxy_wizard_0"), g("ruxy_wizard_1"), g("ruxy_wizard_2")], [600, 600, 600], 2);
      if (S.currentLevel === 2) T.post(triggerMoonBlessing, 1330 * 2 * 2 + 200);
      return true;
    }
    if (S.pendingCandyNom) { S.pendingCandyNom = false; AUDIO.play("candyNom"); startPlayerSpriteSequence([g("candy_nom_0"), g("candy_nom_1")], [500, 500], 2); return true; }
    if (S.pendingDrink) { S.pendingDrink = false; startDrinkPause(2660); return true; }
    return false;
  }
  function startDrinkPause(ms) {
    if (S.isDrinking) return;
    S.isDrinking = true; AUDIO.play("drink");
    startPlayerSpriteSequence([getBeachAsset("player_drink"), getBeachAsset("player_drink_1")], [ms / 2, ms / 2], 2, true);
  }
  function startPlayerSpriteSequence(frames, durs, loops, isDrink) {
    if (S.isPlayerSequence) return;
    S.isPlayerSequence = true; S.vx = 0; S.vy = 0; S.fingerDown = false; S.lastTouchX = -1; S.running = false;
    playerView.sx = S.facing; playerView.sy = 1;
    const prevPose = S.pose; S.pose = "DRINK";
    let loopsLeft = loops;
    const playFrame = (i) => {
      playerView.key = frames[i];
      T.post(() => {
        const next = i + 1;
        if (next >= frames.length) {
          loopsLeft--;
          if (loopsLeft > 0) playFrame(0);
          else {
            S.pose = null; setPose(prevPose); S.isPlayerSequence = false; S.isDrinking = false;
            S.vy = -S.baseJumpImpulse * activeJumpMultiplier();
            if (!isAnyOverlayVisible()) { AUDIO.duckBgm(false); if (S.gameplayStarted) AUDIO.startBgm(S.currentLevel); }
            if (S.pendingNeonFizz) { S.pendingNeonFizz = false; triggerNeonFizz(); }
            if (!S.isPaused) S.running = true;
          }
        } else playFrame(next);
      }, durs[i]);
    };
    playFrame(0);
  }

  function triggerGameOver() {
    S.running = false; playerView.sx = S.facing; playerView.sy = 1; S.finalHeightAtGameOver = S.highHeight;
    PREFS.set("total_height_climbed", PREFS.get("total_height_climbed", 0) + S.highHeight);
    if (S.currentLevel === 3) { S.gravity = 900; S.spaceEffectColor = null; playerView.clearColorFilter(); if (S.sophie) S.sophie.clearColorFilter(); }
    if (window.PGPUBLIC && window.POP) {
      AUDIO.play("uiOpen"); AUDIO.duckBgm(true); $("pauseBtn").classList.add("hidden"); S.isPaused = false;
      $("moonHud").classList.add("hidden"); $("moonGlow").classList.add("hidden"); playerView.visible = false; endBoostFx(); S.pubGrav = [];
      const av = PGONE && PGONE.look.active ? AVATAR.render(PGONE.look, "down", { eyes: "blink" }) : null;
      POP.card({ img: av, title: "oops, you fell!", text: "height reached: " + S.finalHeightAtGameOver, hint: "tap to try again", tint: 1 })
        .then(() => { AUDIO.play("uiClose"); resetGame(); });
      return;
    }
    resetOverlayGate(); showOv("gameOverOv", true); AUDIO.play("uiOpen"); AUDIO.duckBgm(true);
    $("pauseBtn").classList.add("hidden"); S.isPaused = false;
    $("moonHud").classList.add("hidden"); $("moonGlow").classList.add("hidden");
    const art = $("gameOverArt"); popImage(art); T.post(() => startBreath(art), 520);
    $("goHeight").innerHTML = "<span>" + S.finalHeightAtGameOver + "</span>";
  }
  function onGameOverTap() {
    overlayTapGateWithSpells(() => { AUDIO.play("uiClose"); stopBreath($("gameOverArt")); showOv("gameOverOv", false); resetOverlayGate(); resetGame(); });
  }
  function triggerBunnyPowerUp() {
    if (window.PGPUBLIC && window.POP) { startBoost(); return; }
    if (false) {
      S.pendingBunnyBoost = true; AUDIO.play("bunny");
      const av = window.AVATAR && window.PGONE && PGONE.look.active ? AVATAR.render(PGONE.look, "up", { tilt: 0.19, eyes: "happy" }) : null;
      pauseForReveal(null, "a bunny hops beside you\nhold on tight!", { img: av, title: "bunny boost ✦" }); return;
    }
    S.pendingBunnyBoost = true; AUDIO.play("bunny"); pauseForReveal(getBeachAsset("bunny_boost"), window.PGPUBLIC ? "a bunny hops beside you ✦🐇✨" : "Sophie bunny hops beside you ✦🐇✨"); }

  function triggerMoonEnding() {
    S.running = false;
    if (window.PGPUBLIC && window.POP) {
      $("moonHud").classList.add("hidden"); $("moonGlow").classList.add("hidden"); playerView.visible = false;
      AUDIO.play("uiOpen"); AUDIO.duckBgm(true);
      const g = window.PGFLOW ? PGFLOW.gift : {}, av = PGONE && PGONE.look.active ? AVATAR.render(PGONE.look, "up", { tilt: 0.19, eyes: "happy" }) : null;
      POP.card({ img: MOON_PHASE_RES[4], title: "you made it to the moon 🌙", hint: "tap" })
        .then(() => POP.card({ img: av, title: g.ending || "for you 🩷", text: g.to ? "for " + g.to : "", from: g.from ? "— " + g.from : "", hint: "tap to finish", tint: "random" }))
        .then(() => { AUDIO.play("uiClose"); if (window.PGFLOW) PGFLOW.finished(); });
      return;
    }
    $("moonHud").classList.add("hidden"); $("moonGlow").classList.add("hidden");
    playerView.sx = S.facing; playerView.sy = 1; playerView.visible = false;
    resetOverlayGate(); showOv("moonOv", true); AUDIO.play("uiOpen"); AUDIO.duckBgm(true);
    S.moonEndingStage = 0;
    $("moonText").classList.add("hidden");
    const mi = $("moonImg"); mi.src = "assets/img/moon_ending-full.webp"; popImage(mi); T.post(() => startBreath(mi), 520);
  }
  function getMoonMagicMessage() {
    let idx = S.lastMoonMagicIdx ?? -1; const n = D.moonMagicMessages.length;
    while (idx === (S.lastMoonMagicIdx ?? -1)) idx = R.int(n);
    S.lastMoonMagicIdx = idx; return R.pick(D.moonMagicMessages[idx]);
  }
  function moonText(txt) { const t = $("moonText"); t.textContent = txt; t.classList.remove("hidden"); popImage(t); }
  function onMoonTap() {
    resetOverlayGate();
    switch (S.moonEndingStage) {
      case 0: S.moonEndingStage = 1; moonText(getMoonMagicMessage()); break;
      case 1: S.moonEndingStage = 2; $("moonText").classList.add("hidden"); runMoonAnimation(); break;
      case 3: S.moonEndingStage = 4; moonText(getMoonMagicMessage()); break;
      case 4: {
        S.moonEndingStage = 0; AUDIO.play("uiClose"); stopBreath($("moonImg")); T.cancel(S.moonAnimId);
        showOv("moonOv", false); resetOverlayGate();
        if (window.PGPUBLIC && window.PGFLOW) { PGFLOW.finished(); return; }
        if (S.currentLevel === 1) {
          // the original called startBeachLevel() here; we also re-open the tap-through start so the beach can begin
          resetGame(); startBeachLevel(); S.startTapCount = 0; S.readyTapCount = 0; showOv("startOv", true);
        } else if (S.currentLevel === 3) { unlockRandomPlanets(); resetGame(); }
        else resetGame();
      }
    }
  }
  function runMoonAnimation() {
    let i = 0; const mi = $("moonImg"); stopBreath(mi);
    const run = () => {
      if (!vis("moonOv")) return;
      mi.src = MOON_PHASE_RES[i]; if (i === 0) popImage(mi);
      i++;
      if (i < 8) S.moonAnimId = T.post(run, 120);
      else { S.moonEndingStage = 3; moonText("✦ tap for moon magic ✦"); }
    };
    run();
  }
  function unlockRandomPlanets() {
    const found = new Set(PREFS.get("planet_found", []));
    const locked = [...Array(9).keys()].filter(i => !found.has(i));
    if (!locked.length) { showSpellToast("you found every planet in the sky", 3000); return; }
    const toUnlock = R.shuffle(locked).slice(0, 3);
    toUnlock.forEach(i => found.add(i)); PREFS.set("planet_found", [...found]);
    const o = h("div", "dyn"); o.style.cssText = "z-index:18000;background:rgba(5,0,20,.94);display:flex;flex-direction:column;align-items:center;justify-content:center";
    const row = h("div"); row.style.cssText = "display:flex;justify-content:center;margin-bottom:calc(24*var(--dp))";
    toUnlock.forEach((idx, k) => {
      const im = h("img"); im.src = "assets/img/planet" + (idx + 1) + ".webp";
      im.style.cssText = "width:calc(80*var(--dp));height:calc(80*var(--dp));object-fit:contain;margin:0 calc(8*var(--dp));opacity:0";
      row.appendChild(im);
      im.animate([{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1)" }], { duration: 600, delay: 300 + k * 200, easing: OVERSHOOT, fill: "forwards" });
    });
    o.appendChild(row);
    const names = toUnlock.map(i => D.planetNames[i]);
    const nameStr = names.length === 3 ? `${names[0]}, ${names[1]} and ${names[2]}` : names.length === 2 ? `${names[0]} and ${names[1]}` : names[0];
    const nm = h("div", null, esc(nameStr)); nm.style.cssText = "font-size:calc(20*var(--dp));color:rgba(180,100,255,.86);text-shadow:0 0 calc(8*var(--dp)) rgba(180,60,255,.63);margin-bottom:calc(16*var(--dp));text-align:center";
    const sub = h("div", null, "3 new stars in your sky<br>visit the solar system to see them"); sub.style.cssText = "font-size:calc(15*var(--dp));color:rgba(255,105,180,.63);text-align:center;line-height:1.4";
    const hint = h("div", "hintBottom", "tap to close"); hint.style.cssText += ";bottom:calc(60*var(--dp));font-size:calc(13*var(--dp));color:rgba(180,100,255,.47)";
    o.append(nm, sub, hint); o.onclick = () => o.remove();
    $("game").appendChild(o); fadeIn(o, 400);
  }

  function pauseForReveal(imageRes, message, opts) {
    if (window.PGPUBLIC && window.POP) {
      S.pausedByReveal = true; S.running = false; playerView.sx = S.facing; playerView.sy = 1; playerView.visible = false;
      AUDIO.play("uiOpen"); AUDIO.duckBgm(true);
      const o = Object.assign({ img: imageRes ? fullSrc(imageRes) : null, pixel: !!(imageRes && imageRes.startsWith("pgi-")), text: message }, opts || {});
      POP.card(o).then(hideRevealAndResume);
      return;
    }
    S.pausedByReveal = true; S.running = false; playerView.sx = S.facing; playerView.sy = 1; playerView.visible = false;
    AUDIO.play("uiOpen"); AUDIO.duckBgm(true); resetOverlayGate();
    const wrap = $("revealImgWrap"), img = $("revealImg"), shine = $("revealShine");
    const src = "assets/img/" + imageRes + "-full.webp";
    if (imageRes === "item_moonstone") {
      wrap.classList.add("stone");
      shine.style.webkitMaskImage = shine.style.maskImage = `url("${src}")`;
      startShine();
      if (!S.moonstoneHintShown && !window.PGPUBLIC) { S.moonstoneHintShown = true; T.post(() => showDigiMessage(D.moonstoneHint, 3000), 800); }
    } else { wrap.classList.remove("stone"); stopShine(); }
    img.src = src;
    const rt = $("revealText");
    if (!message) { rt.textContent = ""; rt.classList.add("hidden"); } else { rt.textContent = message; rt.classList.remove("hidden"); }
    showOv("revealOv", true); popImage(wrap); T.post(() => startBreath(wrap), 520);
  }
  // moonstone shimmer: gyro if available, slow sweep otherwise
  let shineAnim = null, tiltHandler = null;
  function startShine() {
    const sh = $("revealShine"); stopShine();
    shineAnim = sh.animate([{ backgroundPosition: "100% 100%" }, { backgroundPosition: "0% 0%" }], { duration: 4500, iterations: Infinity });
    tiltHandler = (e) => {
      if (e.gamma == null) return;
      if (shineAnim) { shineAnim.cancel(); shineAnim = null; }
      const gx = clamp(50 + e.gamma * 1.6, 0, 100), gy = clamp(50 + (e.beta - 45) * 1.6, 0, 100);
      sh.style.backgroundPosition = gx + "% " + gy + "%";
    };
    window.addEventListener("deviceorientation", tiltHandler);
  }
  function stopShine() { if (shineAnim) shineAnim.cancel(); shineAnim = null; if (tiltHandler) window.removeEventListener("deviceorientation", tiltHandler); tiltHandler = null; }
  function hideRevealAndResume() {
    AUDIO.play("uiClose"); stopBreath($("revealImgWrap")); stopShine(); showOv("revealOv", false);
    if (!S.pausedByReveal) return;
    S.pausedByReveal = false;
    if (S.pendingBunnyBoost) { S.pendingBunnyBoost = false; applyBunnyBoostNow(); }
    if (S.pendingMoonEnding && S.tarotCount >= getLevelTarget()) { S.pendingMoonEnding = false; triggerMoonEnding(); return; }
    playerView.visible = true; AUDIO.duckBgm(false); if (S.gameplayStarted) AUDIO.startBgm(S.currentLevel);
    if (!S.running && !S.isPaused) S.running = true;
  }
  function applyBunnyBoostNow() {
    const t = nowMs(); S.powerUpUntilMs = t + 8000;
    if (S.vy > -BUNNY_ROCKET_IMPULSE) { S.vy = -BUNNY_ROCKET_IMPULSE; if (S.currentLevel !== 3) { playerView.sy = 1.4; playerView.sx = S.facing * 0.6; } }
    S.bunnyBoostPoseUntilMs = t + BUNNY_BOOST_POSE_MS; setPose("BUNNY_BOOST");
    if (!S.bunnyBoostSoundPlayed) { S.bunnyBoostSoundPlayed = true; AUDIO.play("bunnyBoost"); }
  }

  // ════ gifts: pickup events + chosen boost (all drawn in code, no image sequences) ════
  const pubGravMul = () => { const t = nowMs(); let m = 1; S.pubGrav = (S.pubGrav || []).filter((g) => g.until > t); S.pubGrav.forEach((g) => { m *= g.mul; }); return m; };
  const pubBoostKey = () => (window.PGBOOST && PGICONS.BOOSTS[PGBOOST] ? PGBOOST : "rocket");
  const boostTokenRes = () => (pubBoostKey() === "balloons" ? "silverpinkballoons" : "pgi-" + PGICONS.BOOSTS[pubBoostKey()].icon);
  let boostFx = null;
  function startBoost() {
    const k = pubBoostKey(), B = PGICONS.BOOSTS[k];
    AUDIO.play("bunnyBoost"); S.happyUntil = nowMs() + 1400;
    POP.toast(B.say, { icon: PGICONS.url(B.icon, { size: 48 }), ms: 1800 });
    if (k === "wave") { triggerWaterSurge(); return; }
    endBoostFx();
    boostFx = { k, until: nowMs() + 2600, objs: [] };
    if (k === "bubble") {
      boostFx.until = nowMs() + 4500; S.pubGrav = (S.pubGrav || []).concat({ mul: 0.35, until: boostFx.until });
      S.vy = Math.min(S.vy, -BUNNY_ROCKET_IMPULSE * 0.45);
      boostFx.objs.push(sc.add.circle(0, 0, 10, 0x9fe8ff, 0.16).setStrokeStyle(dp(2), 0xffffff, 0.75).setDepth(21));
      return;
    }
    S.powerUpUntilMs = nowMs() + 8000;
    S.vy = -BUNNY_ROCKET_IMPULSE * (k === "balloons" ? 0.8 : 1);
    S.bunnyBoostPoseUntilMs = nowMs() + (k === "balloons" ? 2200 : 900); setPose("BUNNY_BOOST");
    if (k === "balloons") { ["pinkballoon1", "pinkballoon2", "pinkballoon1"].forEach((key) => boostFx.objs.push(sc.add.image(0, 0, key).setDepth(19))); boostFx.g = sc.add.graphics().setDepth(18.9); }
    if (k === "star") boostFx.objs.push(sc.add.image(0, 0, "pgi-star").setDepth(21));
  }
  function endBoostFx() { if (!boostFx) return; boostFx.objs.forEach((o) => o.destroy()); if (boostFx.g) boostFx.g.destroy(); boostFx = null; }
  function updateBoostFx() {
    if (!boostFx || !sc) return;
    const t = nowMs(), pv = playerView, k = boostFx.k;
    if (t > boostFx.until) { endBoostFx(); return; }
    const cx = pv.x + pv.width / 2, top = pv.y + pv.height * 0.12, feet = pv.y + pv.height * 0.95;
    if (k === "wings") {
      if (window.PGONE && PGONE.look.active) pv.key = (S.currentLevel === 3 ? "pgx-space-" : "pgx-") + "up-w";
      if (R.f() < 0.6) sparkle(cx + (R.f() - 0.5) * pv.width * 1.4, pv.y + pv.height * 0.45, R.f() < 0.5 ? 0xffffff : 0xc9b8ff);
    }
    if (k === "rocket") { flame(cx - dp(14) + (R.f() - 0.5) * dp(10), feet); flame(cx + dp(14) + (R.f() - 0.5) * dp(10), feet); }
    if (k === "star") { boostFx.objs[0].setPosition(cx, feet + dp(6)).setDisplaySize(dp(96), dp(96)).setAngle(Math.sin(t / 110) * 12); sparkle(cx + (R.f() - 0.5) * dp(70), feet + dp(24), 0xffd84a); }
    if (k === "balloons") {
      const g = boostFx.g; g.clear(); g.lineStyle(dp(1.5), 0xffffff, 0.85);
      boostFx.objs.forEach((b, i) => { const bx = cx + (i - 1) * dp(34) + Math.sin(t / 280 + i * 2) * dp(6), by = top - dp(78) - (i === 1 ? dp(16) : 0); b.setPosition(bx, by).setDisplaySize(dp(50), dp(64)); g.lineBetween(bx, by + dp(30), cx, top + dp(26)); });
    }
    if (k === "bubble") boostFx.objs[0].setPosition(cx, pv.y + pv.height * 0.55).setRadius(pv.height * 0.58);
    if (R.f() < 0.3) heartBit(cx + (R.f() - 0.5) * pv.width * 0.7, pv.y + pv.height * 0.75);
  }
  function flame(x, y) {
    const c = sc.add.circle(x, y, dp(7 + R.int(6)), R.f() > 0.5 ? 0xffd84a : R.f() > 0.3 ? 0xff8a2a : 0xff4fa8, 0.9).setDepth(19);
    anim(360 + R.int(200), (p) => { c.setY(y + dp(80) * p).setAlpha(0.9 * (1 - p)).setScale(1 - 0.6 * p); }, { onEnd: () => c.destroy() });
  }
  function sparkle(x, y, col) {
    const c = sc.add.star(x, y, 4, dp(2), dp(7), col, 0.95).setDepth(22);
    anim(520, (p) => { c.setY(y + dp(30) * p).setAlpha(1 - p).setAngle(180 * p); }, { onEnd: () => c.destroy() });
  }
  function heartBit(x, y, rise) {
    const im = sc.add.image(x, y, "pgi-heart").setDisplaySize(dp(18), dp(18)).setDepth(22).setAlpha(0.95);
    anim(700, (p) => { im.setY(y + (rise || dp(50)) * p).setAlpha(0.95 * (1 - p)); }, { onEnd: () => im.destroy() });
  }
  // book slot ×11: chakra glow, 7 coloured rings rise around them + floaty for 6 s
  function chakraAura() {
    POP.toast("chakra glow ✨", { ms: 1800 }); AUDIO.play("ruxyMagic"); S.happyUntil = nowMs() + 1200;
    const end = nowMs() + 6000; S.pubGrav = (S.pubGrav || []).concat({ mul: 0.55, until: end });
    const cols = [0xff3b3b, 0xff8a2a, 0xffd84a, 0x43c99a, 0x5ad1ff, 0x6a4fd1, 0xb48cff]; let i = 0;
    const loop = () => { if (nowMs() > end || !sc) return; ring(cols[i++ % 7]); T.post(loop, 170); }; loop();
  }
  function ring(col) {
    const pv = playerView, e = sc.add.ellipse(0, 0, pv.width * 0.95, dp(22)).setStrokeStyle(dp(3), col, 0.95).setDepth(21);
    anim(720, (p) => { e.setPosition(pv.x + pv.width / 2, pv.y + pv.height * (0.92 - 0.85 * p)).setAlpha(1 - p).setScale(1 - 0.3 * p); }, { onEnd: () => e.destroy() });
  }
  // candy slot ×9: sweet rush, heart burst + happy spin + speed
  function sweetBurst() {
    POP.toast("sweet rush 🩷", { ms: 1800 }); AUDIO.play("candyNom");
    S.happyUntil = nowMs() + 1300; S.spinUntil = nowMs() + 520; S.powerUpUntilMs = Math.max(S.powerUpUntilMs, nowMs() + 5000);
    const r0 = playerView.rot; anim(500, (p) => { playerView.rot = r0 + 360 * p; }, { onEnd: () => { playerView.rot = 0; } });
    const pv = playerView, cx = pv.x + pv.width / 2, cy = pv.y + pv.height * 0.5;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, im = sc.add.image(cx, cy, "pgi-heart").setDisplaySize(dp(22), dp(22)).setDepth(22);
      anim(650, (p) => { im.setPosition(cx + Math.cos(a) * dp(110) * p, cy + Math.sin(a) * dp(110) * p).setAlpha(1 - p); }, { onEnd: () => im.destroy() });
    }
  }

  // ── juice ──
  function bouncePlatform(v) { anim(140, p => { v.sy = kf([1, 0.85, 1], p); }, { onEnd: () => { v.sy = 1; } }); }
  function spawnLandingDust(x, y) {
    for (let i = 0; i < 2; i++) {
      const size = dp(12), sx = x + (i === 0 ? -dp(20) : dp(20)), sy = y - dp(10);
      const d = sc.add.circle(sx + size / 2, sy + size / 2, size / 2, 0xffffff, 0.6 * 0.8).setDepth(12);
      const dx = i === 0 ? -dp(30) : dp(30);
      anim(350, p => { d.setPosition(sx + size / 2 + dx * p, sy + size / 2 - dp(15) * p).setScale(1 - 0.8 * p).setAlpha(0.6 * 0.8 * (1 - p)); }, { onEnd: () => d.destroy() });
    }
  }
  function spawnPickupSparkles(x, y) {
    const space = S.currentLevel === 3;
    const cols = [0x50C8FF, 0x8C3CFF, 0x00F0C8, 0xB464FF];
    for (let i = 0; i < 7; i++) {
      const size = dp(8), x0 = x + dp(20) + size / 2, y0 = y + dp(20) + size / 2;
      const s = space ? sc.add.circle(x0, y0, size / 2, R.pick(cols), 220 / 255) : sc.add.rectangle(x0, y0, size * 0.75, size * 0.75, 0xffff00).setAngle(45);
      s.setDepth(12);
      const ang = R.f() * 6.28, dist = dp(50 + R.int(40)), r0 = space ? 0 : 45, rr = R.f() * 180;
      anim(450, p => { s.setPosition(x0 + Math.cos(ang) * dist * p, y0 + Math.sin(ang) * dist * p).setAngle(r0 + rr * p).setAlpha(1 - p); }, { onEnd: () => s.destroy() });
    }
  }
  function spawnAfterImage(col) {
    const pv = playerView;
    const g = new V(pv.key, pv.w, pv.h, 19);
    Object.assign(g, { x: pv.x, y: pv.y, sx: pv.sx, sy: pv.sy, alpha: 0.6 }); g.setColorFilter(col.c, Math.min(1, col.a * 1.4));
    const sx0 = pv.sx, sy0 = pv.sy;
    anim(500, p => { g.alpha = 0.6 * (1 - p); g.sx = sx0 * (1 - 0.2 * p); g.sy = sy0 * (1 - 0.2 * p); }, { onEnd: () => g.destroy() });
  }
  function shakeScreen() {
    const a = 4;
    $("game").animate([{ transform: "translateX(0)" }, { transform: `translateX(calc(${a}*var(--dp)))` }, { transform: `translateX(calc(${-a}*var(--dp)))` },
      { transform: `translateX(calc(${a}*var(--dp)))` }, { transform: `translateX(calc(${-a}*var(--dp)))` }, { transform: "translateX(0)" }], { duration: 350, easing: EASE_IO });
  }
  function triggerSugarRush() { if (S.currentLevel === 3) return; S.powerUpUntilMs = nowMs() + 10000; showSpellToast("sugar rush", 3000); }
  function triggerNeonFizz() {
    if (S.currentLevel !== 1) return;
    const orig = S.gravity; S.gravity = 1800;
    showSpellToast("neon fizz", 3000); AUDIO.play("ruxyMagic");
    const f = argb(40, 255, 105, 180); playerView.setColorFilter(f.c, f.a);
    const end = nowMs() + 10000;
    const loop = () => { if (nowMs() >= end || S.currentLevel !== 1) return; spawnFizzBubble(); if (R.f() > 0.3) spawnFizzBubble(); T.post(loop, 200); };
    loop();
    T.post(() => { if (S.currentLevel === 1) S.gravity = orig; playerView.clearColorFilter(); }, 10000);
  }
  function bubble(size, color, alpha, rise, dur) {
    const pv = playerView;
    const x = pv.x + R.f() * pv.width - size / 2, y = pv.y + R.f() * pv.height * 0.5;
    const b = sc.add.circle(x + size / 2, y + size / 2, size / 2, color, alpha).setStrokeStyle(2, 0xffffff, 0.6).setDepth(600);
    anim(dur, p => { b.setY(y + size / 2 - rise * p).setAlpha(alpha * (1 - p)); }, { onEnd: () => b.destroy() });
  }
  function spawnFizzBubble() { bubble(dp(4 + R.int(7)), R.f() > 0.4 ? 0xFF69B4 : 0x00DCFF, 160 / 255, dp(60 + R.int(100)), 800 + R.int(600)); }
  function triggerMoonBlessing() {
    if (!S.running || !S.gameplayStarted || S.currentLevel === 3) return;
    const orig = S.gravity; S.gravity = 1100;
    showSpellToast("moon blessed", 2500);
    const f = argb(50, 140, 80, 255); playerView.setColorFilter(f.c, f.a);
    T.post(() => { if (S.currentLevel !== 3) S.gravity = orig; playerView.clearColorFilter(); }, 6000);
  }
  function triggerWaterSurge() {
    if (S.waterModeActive) return;
    S.waterModeActive = true; S.waterModeUntilMs = nowMs() + 9000;
    const o = sc.add.rectangle(0, H, W, H, 0x00A0DC, 55 / 255).setOrigin(0, 0).setDepth(500);
    S.waterOverlay = o;
    const bubbleLoop = () => { if (!S.waterModeActive) return; spawnBubble(); if (R.f() > 0.4) spawnBubble(); T.post(bubbleLoop, 300); };
    bubbleLoop();
    anim(2200, p => { if (!o.active) return; o.setY(H * (1 - p)); }, { ease: EZ.dec });
    T.post(() => { anim(1200, p => { if (!o.active) return; o.setY(H * p); }, { ease: EZ.acc, onEnd: () => { o.destroy(); if (S.waterOverlay === o) S.waterOverlay = null; } }); }, 11800);
  }
  function endWaterMode() { S.waterModeActive = false; S.waterModeUntilMs = 0; }
  function spawnBubble() { if (!S.waterModeActive) return; bubble(dp(6 + R.int(8)), 0xB4E6FF, 140 / 255, dp(80 + R.int(120)), 1200 + R.int(800)); }

  // ── moon fail ──
  function triggerMoonFail() {
    S.running = false; playerView.sx = S.facing; playerView.sy = 1;
    $("pauseBtn").classList.add("hidden"); S.isPaused = false;
    $("moonHud").classList.add("hidden"); $("moonGlow").classList.add("hidden");
    if (window.PGPUBLIC && window.POP) {
      AUDIO.play("uiOpen"); AUDIO.duckBgm(true); playerView.visible = false;
      POP.card({ img: MOON_PHASE_RES[0], title: "so close 🌙", text: "the moon slipped away this time.\nfind them a little faster!", hint: "tap to try again", tint: 2 })
        .then(() => { AUDIO.play("uiClose"); resetGame(); });
      return;
    }
    let idx = S.lastMoonFailIdx ?? -1; while (idx === (S.lastMoonFailIdx ?? -1)) idx = R.int(3); S.lastMoonFailIdx = idx;
    const o = h("div", "dyn"); o.style.cssText = "z-index:16000;background:rgba(0,0,10,.96)";
    o.innerHTML = `<div style="position:absolute;inset:0;background:rgba(0,200,255,.035)"></div>
      <div style="position:absolute;left:0;right:0;top:calc(145*var(--dp));text-align:center;font-size:calc(72*var(--dp));line-height:1">🌑</div>
      <div class="mfh" style="position:absolute;left:0;right:0;top:calc(230*var(--dp));text-align:center;font:calc(13*var(--dp)) ui-monospace,monospace;letter-spacing:.15em;color:rgba(0,220,255,.78);text-shadow:0 0 calc(8*var(--dp)) rgba(0,180,255,.7)">// MOON_CYCLE.exe — TERMINATED //</div>
      <div style="position:absolute;left:calc(40*var(--dp));right:calc(40*var(--dp));top:50%;transform:translateY(-50%);text-align:center;font-size:calc(20*var(--dp));line-height:1.5;color:#fff;text-shadow:0 0 calc(6*var(--dp)) rgba(0,200,255,.7)">${esc(D.moonFailMessages[idx])}</div>
      <div style="position:absolute;left:0;right:0;bottom:calc(60*var(--dp));text-align:center;font:calc(14*var(--dp)) ui-monospace,monospace;letter-spacing:.1em;color:rgba(0,220,255,.63)">[ tap 3x to restart ]</div>`;
    $("game").appendChild(o);
    o.querySelector(".mfh").animate([{ opacity: 1 }, { opacity: .2 }, { opacity: 1 }, { opacity: .6 }, { opacity: 1 }], { duration: 800, iterations: Infinity, direction: "alternate" });
    let taps = 0;
    o.onclick = () => { taps++; if (taps === 1) showSpellToast("[ 1 / 3 ]", 1200); else if (taps === 2) showSpellToast("[ 2 / 3 ]", 1200); else { o.remove(); resetGame(); } };
    AUDIO.play("uiOpen"); AUDIO.duckBgm(true);
  }

  // ── message in a bottle ──
  function showBottleMessage() {
    if (window.PGPUBLIC && window.POP) {
      const note = window.PGFLOW && PGFLOW.nextMessage(); if (!note) return;
      pauseForReveal(null, note, { img: PGICONS.url("letter", { size: 256 }), pixel: true, title: "a note for you 💌", tint: "random" });
      return;
    }
    S.running = false; playerView.visible = false; AUDIO.duckBgm(true);
    const msgs = D.bottleMessages, found = new Set(PREFS.get("bottle_found", []));
    const unfound = msgs.map((_, i) => i).filter(i => !found.has(i));
    let idx;
    if (unfound.length) { const pool = unfound.length > 1 ? unfound.filter(i => i !== S.lastBottleIdx) : unfound; idx = R.pick(pool); }
    else { idx = S.lastBottleIdx ?? -1; while (idx === (S.lastBottleIdx ?? -1)) idx = R.int(msgs.length); }
    S.lastBottleIdx = idx; found.add(idx); PREFS.set("bottle_found", [...found]);
    const o = h("div", "dyn"); o.style.cssText = "z-index:17000;background:rgba(10,0,30,.86)";
    const scroll = h("div", "bottleScroll"), msg = h("div", "bottleMsg", esc(msgs[idx]));
    const hint = h("div", "hintBottom", "✦ tap to continue ✦"); hint.style.cssText += ";bottom:calc(52*var(--dp));font-size:calc(16*var(--dp));color:rgba(255,105,180,.7)";
    o.append(scroll, msg, hint); $("game").appendChild(o); S.bottleOverlay = o;
    popImage(scroll); popImage(msg);
    let taps = 0, dismissed = false;
    o.onclick = () => {
      if (dismissed) return; taps++;
      if (taps === 1) showSpellToast(D.gate[0], 1400);
      else if (taps === 2) showSpellToast(D.gate[1], 1400);
      else { dismissed = true; showSpellToast(D.gate[2], 900);
        T.post(() => { o.remove(); S.bottleOverlay = null; playerView.visible = true; AUDIO.duckBgm(false); if (S.gameplayStarted) AUDIO.startBgm(S.currentLevel); if (!S.isPaused) S.running = true; }, 220); }
    };
  }

  // ── HUD ──
  function updateHud() {
    $("cBook").textContent = S.bookCount; $("cCan").textContent = S.canCount; $("cCandy").textContent = S.candyCount;
    $("cTarot").textContent = S.tarotCount; $("cDrill").textContent = S.drillCount; $("cBunny").textContent = S.bunnyCount; $("hHeight").textContent = S.highHeight;
    if (window.PGHUD) PGHUD.update(S, getLevelTarget());
  }
  function setBunnyHudVisible(on) {
    const iv = $("iBunny"), cv = $("cBunny");
    iv.classList.toggle("inv", !on); cv.classList.toggle("inv", !on);
    if (S.currentLevel === 3) iv.classList.remove("halo");
    iv.style.animation = on && S.currentLevel === 3 ? "balloonpulse .9s ease-in-out infinite alternate" : "";
  }
  function updateHudIconsForLevel() {
    const L = S.currentLevel, isB = L === 2, isS = L === 3, img = (n) => "assets/img/" + n + ".webp";
    $("iBook").src = img(isS ? "starfrag" : isB ? "item_book_coral" : "item_book");
    $("iCan").src = img(isS ? "cloudnebula" : isB ? "item_can_coral" : "item_can");
    $("iCandy").src = img(isS ? "spacecarrot" : isB ? "item_candy_coral" : "item_candy");
    if (window.PGPACK) ["iBook", "iCan", "iCandy"].forEach((id, i) => { $(id).src = hudSrc(PGPACK[i]); });
    if (chalKey()) $("iTarot").src = hudSrc(chalKey());
    if (window.PGPUBLIC) $("iBunny").src = hudSrc(boostTokenRes());
    if (window.PGHUD) { PGHUD.setup(window.PGPUBLIC, S); PGHUD.update(S, getLevelTarget()); }
    $("iTarot").src = img(isS ? "ions" : isB ? "item_moonstone" : "hud_tarot");
    $("iDrill").src = img("item_drill");
    ["cTarot", "iTarot", "cDrill", "iDrill"].forEach(id => $(id).classList.remove("hidden"));
    if (isS) {
      $("cTarot").classList.add("hidden"); $("iTarot").classList.add("hidden");
      $("cDrill").classList.add("hidden"); $("iDrill").classList.add("hidden");
      $("iBunny").classList.remove("halo"); setBunnyHudVisible(false); $("iBunny").src = img("silverpinkballoons");
    } else {
      $("iBunny").classList.add("halo"); setBunnyHudVisible(false); $("iBunny").src = img(isB ? "item_bunny_coral" : "item_bunny");
    }
    if (window.PGPUBLIC) { $("cDrill").classList.add("hidden"); $("iDrill").classList.add("hidden"); }
  }
  function createMoonPhaseHud() {
    const mv = $("moonHud"); mv.src = MOON_PHASE_RES[0]; mv.classList.remove("hidden"); $("moonGlow").classList.remove("hidden");
  }
  function updateMoonPhaseHud() {
    if (!vis("moonOv") && !vis("gameOverOv")) { $("moonHud").classList.remove("hidden"); $("moonGlow").classList.remove("hidden"); }
    let pIdx;
    if (S.currentLevel === 3) {
      const maxItem = Math.max(1, getLevelTarget() - 1), t = Math.max(0, S.tarotCount);
      pIdx = t === 0 ? 0 : clamp(Math.trunc((t - 1) * 7 / maxItem), 0, 7);
    } else {
      const total = S.currentLevel === 1 ? CITY_TIME_LIMIT_MS : MOON_TIME_LIMIT_MS;
      pIdx = clamp(Math.trunc(clamp((total - S.moonTimerMs) / total, 0, 1) * 7), 0, 7);
    }
    if ((S.currentLevel === 1 || S.currentLevel === 2) && S.moonTimerMs >= 1 && S.moonTimerMs <= 30000 && !S.panicking) {
      S.panicking = true; $("moonHud").classList.add("panic"); $("moonGlow").style.setProperty("--glow", "rgba(255,40,40,.7)");
    }
    if (pIdx === S.lastMoonPhase) return;
    S.lastMoonPhase = pIdx;
    const mv = $("moonHud"); mv.src = MOON_PHASE_RES[pIdx];
    mv.animate([{ transform: "scale(.7)" }, { transform: "scale(1)" }], { duration: 300, easing: OVERSHOOT });
  }
  function resetMoonPanic() { S.panicking = false; $("moonHud").classList.remove("panic"); $("moonGlow").style.removeProperty("--glow"); }

  // ════════════════════ PHASER SCENE ════════════════════
  const TEX = (() => {
    const L = ["player", "player_jump_up", "player_jump_down", "player_drink", "player_drink_1", "bunny_boost", "candy_nom_0", "candy_nom_1", "drill_handoff", "drill_kiss", "ruxy_wizard_0", "ruxy_wizard_1", "ruxy_wizard_2"];
    const out = [];
    L.forEach(n => { out.push(n, n + "_coral"); });
    out.push("playerspace", "playerspace0", "playerspace1", "sophiespace0", "sophiespace1", "sophiespace2", "sophiespace3");
    for (let i = 0; i < 13; i++) out.push("platform" + i, "platform_" + i + "_coral");
    for (let i = 1; i <= 9; i++) out.push("spaceplat" + i, "planet" + i);
    out.push("item_book", "item_book_coral", "item_can", "item_can_coral", "item_candy", "item_candy_coral", "item_drill", "item_bunny", "item_bunny_coral", "item_moonstone",
      "starfrag", "cloudnebula", "spacecarrot", "pinkballoon1", "pinkballoon2", "silverballoon1", "silverballoon2", "silverpinkballoons");
    for (let i = 0; i < 5; i++) out.push("item_tarot_" + i);
    BG_RES.concat(CORAL_BG_RES).forEach(b => out.push(b));
    return out;
  })();

  let pendingMode = "city", readyCb = null, loaded = false;
  class Boot extends Phaser.Scene {
    constructor() { super("boot"); }
    preload() {
      this.load.setPath("assets/img/");
      const PRIV = /drill|ruxy_wizard|player_drink|candy_nom|bunny_boost|gameover|christian|moon_ending|moon_start|overlay_signal/;
      TEX.forEach(k => { if (!(window.PG_PUBLIC_BUILD && PRIV.test(k))) this.load.image(k, k + ".webp"); });
      if (window.PGONE) PGONE.preload(this);
      this.load.on("progress", p => { const n = $("loadNote"); if (n) n.textContent = p < 1 ? "loading the world… " + Math.round(p * 100) + "%" : ""; });
    }
    create() {
      // generated textures: halo (pet glow), vignette
      const c1 = this.textures.createCanvas("halo", 256, 256), x1 = c1.getContext();
      const g1 = x1.createRadialGradient(128, 128, 0, 128, 128, 128 * 0.7 * 1.4);
      g1.addColorStop(0, "rgba(89,0,255,.5)"); g1.addColorStop(0.5, "rgba(89,0,255,.25)"); g1.addColorStop(1, "rgba(0,0,0,0)");
      x1.fillStyle = g1; x1.beginPath(); x1.arc(128, 128, 128, 0, Math.PI * 2); x1.fill(); c1.refresh();
      const c2 = this.textures.createCanvas("vignette", 270, Math.round(H / 4)), x2 = c2.getContext(), vw = 270, vh = Math.round(H / 4);
      const g2 = x2.createRadialGradient(vw / 2, vh / 2, 0, vw / 2, vh / 2, Math.min(vw, vh) * 0.8);
      g2.addColorStop(0, "rgba(0,0,0,0)"); g2.addColorStop(1, "rgba(0,0,0,.6)");
      x2.fillStyle = g2; x2.fillRect(0, 0, vw, vh); c2.refresh();
      loaded = true; const n = $("loadNote"); if (n) n.textContent = "";
      if (readyCb) { const cb = readyCb; readyCb = null; cb(); }
    }
  }
  class Game extends Phaser.Scene {
    constructor() { super("game"); }
    create() {
      sc = this; VIEWS.clear(); ANIMS.clear(); T.clear();
      S = freshState();
      if (window.PGONE) PGONE.bake(this);
      $("fx").innerHTML = ""; document.querySelectorAll("#game > .dyn").forEach(e => e.remove());
      ["revealOv", "moonOv", "gameOverOv", "pauseOv", "readyOv", "digi"].forEach(id => $(id).classList.add("hidden"));
      hideToastNow();
      if (LOWRES) this.cameras.main.setZoom(0.25).centerOn(W / 2, H / 2);
      S.scrollLineY = H * 0.38;
      bg = new V("bg0", W, H, 0, "crop"); bg2 = new V("bg1", W, H, 0, "crop");
      vignette = this.add.image(W / 2, H / 2, "vignette").setDisplaySize(W, H).setDepth(2);
      playerView = new V("player", dp(PLAYER_W_DP), dp(PLAYER_H_DP), 20);
      computeSizesFromScreen();
      buildPlatformsInitial();
      resetGame();
      handleLaunchMode(pendingMode);
      this.input.on("pointerdown", p => { if (p.event && p.event.target !== this.game.canvas) return; AUDIO.unlock(); handleDown(p.worldX); });
      this.input.on("pointermove", p => handleMove(p.worldX));
      this.input.on("pointerup", () => handleUp());
      this.input.on("gameout", () => handleUp());
      this.acc = 0;
    }
    update(time, delta) {
      if (S.running) {
        this.acc += Math.min(delta, 100);
        let n = 0;
        while (this.acc >= tickMs && S.running && n < 6) { step(); this.acc -= tickMs; n++; }
        if (n >= 6) this.acc = 0;
      } else this.acc = 0;
      tickAnims();
      // gifts: watchdog, if the run is stopped with nothing on screen to explain it, resume after 1.2 s
      if (window.PGPUBLIC && S && S.gameplayStarted && !S.running && !S.isPaused && !isAnyOverlayVisible() && !vis("gameOverOv") && !vis("moonOv")) {
        if (!S.stuckSince) S.stuckSince = nowMs();
        else if (nowMs() - S.stuckSince > 1200) { S.stuckSince = 0; S.pausedByReveal = false; S.isPlayerSequence = false; S.isDrinking = false; playerView.visible = true; AUDIO.duckBgm(false); S.running = true; }
      } else if (S) S.stuckSince = 0;
      // moonstone shimmer in-world
      for (const v of VIEWS) {
        if (v.shine && v.visible) { const p = (nowMs() % 4500) / 4500; v.setColorFilter(0xB49CFF, 0.10 + 0.22 * Math.max(0, Math.sin(p * Math.PI * 2))); }
        v.sync();
      }
    }
  }

  function handleLaunchMode(mode) {
    const hideStart = () => { showOv("startOv", false); showOv("readyOv", false); };
    switch (mode) {
      case "beach": startBeachLevel(); S.startTapCount = 0; S.readyTapCount = 0; showOv("startOv", true); break;
      case "space": startSpaceLevel(); S.startTapCount = 0; S.readyTapCount = 0; showOv("startOv", true); break;
      case "test_end1": hideStart(); S.currentLevel = 1; S.gameplayStarted = true; updateHudIconsForLevel(); triggerMoonEnding(); break;
      case "test_end2": hideStart(); S.currentLevel = 2; S.gameplayStarted = true; updateHudIconsForLevel(); triggerMoonEnding(); break;
      case "test_gameover": hideStart(); S.gameplayStarted = true; T.post(triggerGameOver, 500); break;
      case "test_moonfail": hideStart(); S.currentLevel = 2; S.gameplayStarted = true; updateHudIconsForLevel(); T.post(triggerMoonFail, 500); break;
      case "test_bottle": hideStart(); startBeachLevel(); startRunNow(); T.post(showBottleMessage, 1500); break;
      case "test_water": hideStart(); startBeachLevel(); startRunNow(); T.post(triggerWaterSurge, 1500); break;
      case "test_glitch": startSpaceLevel(); hideStart(); startRunNow(); T.post(triggerSignal33Glitch, 1500); break;
      case "space_near_end": startSpaceLevel(); S.tarotCount = 8; S.pendingTarotVariant = 8; updateHud(); hideStart(); startRunNow(); showSpellToast("1 planet away from ending", 3000); break;
      case "god_mode": S.godMode = true; break;
      default: break;
    }
  }

  // ── wiring DOM ──
  $("startOv").addEventListener("click", onStartTap);
  $("readyOv").addEventListener("click", onReadyTap);
  $("revealOv").addEventListener("click", () => overlayTapGateWithSpells(hideRevealAndResume));
  $("moonOv").addEventListener("click", onMoonTap);
  $("gameOverOv").addEventListener("click", onGameOverTap);
  $("pauseBtn").addEventListener("click", (e) => { e.stopPropagation(); triggerPause(); });
  $("pauseOv").addEventListener("click", resumeGame);
  $("menuBtn").addEventListener("click", (e) => { e.stopPropagation(); exitToMenu(); });
  document.addEventListener("visibilitychange", () => {
    if (!S || !game || !vis("game")) return;
    if (document.hidden) { AUDIO.pauseBgm(); if (S.gameplayStarted && !S.isPaused) triggerPause(); else S.running = false; }
  });

  let game = null;
  const LOWRES = /lowres/.test(location.hash); // test-only: quarter-res canvas
  function boot() {
    if (game) return;
    game = new Phaser.Game({
      type: Phaser.AUTO, parent: "phaser", width: LOWRES ? W / 4 : W, height: LOWRES ? Math.round(H / 4) : H, backgroundColor: "#000000",
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.NO_CENTER },
      render: { antialias: true, powerPreference: "high-performance" },
      input: { activePointers: 2 }, audio: { noAudio: true }, banner: false,
      scene: [Boot],
    });
  }
  function enterGame(mode) {
    pendingMode = mode;
    const go = () => {
      $("game").classList.remove("hidden");
      if (game.scene.getScene("game")) game.scene.start("game"); else game.scene.add("game", Game, true);
      game.scale.refresh(); requestAnimationFrame(() => game.scale.refresh());
    };
    const gate = () => (window.PGONE ? PGONE.ready.then(go) : go());
    if (loaded) gate(); else readyCb = gate;
  }
  function exitToMenu() {
    if (S) { S.running = false; S.isPaused = false; }
    T.clear(); ANIMS.clear(); AUDIO.stopAll(); hideToastNow(); if (window.POP) POP.clear();
    if (game && game.scene.getScene("game")) game.scene.stop("game");
    $("game").classList.add("hidden");
    document.querySelectorAll("#game > .dyn").forEach(e => e.remove());
    showOv("pauseOv", false);
    if (window.PGPUBLIC && window.PGFLOW) PGFLOW.back(); else window.LAUNCHER && window.LAUNCHER.show();
  }

  return {
    boot, enterGame, exitToMenu,
    get S() { return S; }, get player() { return playerView; },
    debug: { pub: { tex: (k) => { const i = sc.textures.get(k).getSourceImage(); return i.toDataURL ? i.toDataURL() : "img"; }, kids: () => sc.children.list.map((o) => o.type + ":" + Math.round(o.x) + "," + Math.round(o.y) + ":" + o.depth + ":" + (o.visible ? 1 : 0) + ":" + o.alpha.toFixed(2)).slice(-12), state: () => ({ ov: isAnyOverlayVisible(), seq: S.isPlayerSequence, drink: S.isDrinking, rev: S.pausedByReveal, pop: window.POP && POP.isOpen(), lx: S.lastTouchX, fd: S.fingerDown, vx: Math.round(S.vx), fx: boostFx && boostFx.k, n: sc.children.list.length, running: S.running, key: playerView.key, until: boostFx && boostFx.until - nowMs() }), boost: () => startBoost(), chakra: () => chakraAura(), sweet: () => sweetBurst(), fizz: () => triggerNeonFizz() }, triggerGameOver: () => triggerGameOver(), triggerMoonEnding: () => triggerMoonEnding(), triggerSignal33Glitch: () => triggerSignal33Glitch(),
      showBottleMessage: () => showBottleMessage(), triggerWaterSurge: () => triggerWaterSurge(), pauseForReveal: (k, m) => pauseForReveal(k, m),
      applyBunnyBoostNow: () => applyBunnyBoostNow(), triggerMoonFail: () => triggerMoonFail(),
      down: (x) => handleDown(x), move: (x) => handleMove(x), up: () => handleUp(), step: () => step() },
  };
})();
