// PixelGift public build: neutral texts only (gift mode rewrites most of these with the creator's picks).
window.PG_DATA = {
  bottleMessages: ["someone made this little world just for you 🩷", "every step up is a little gift ✨", "keep climbing, the best part is near 🌙"],
  moonFailMessages: ["so close! the moon slipped away this time 🌑", "almost there. try again 🌑", "the moon will wait for you 🌑"],
  moonMagicMessages: [["this was made with love 🩷"], ["you made it ✨"]],
  signal33: [["a little glitch… back on track ✨", "signal lost and found 🩷", "phew ✨"], ["parallel worlds detected ✨", "so many of you 💫", "sparkle ✨"], ["oops, a button got pressed", "on purpose, of course", "look at you go ✨"]],
  digi: ["collect these for a boost ✨", "every 11 gives a fizzy boost ⚡", "collect these and float 🌙", "a note for you 💌", "treats for your little friend 🐰", "balloons lift you higher 🎈"],
  moonstoneHint: "",
  start: { 1: [["a little world made for you 🩷", 5000], ["climb as high as you can ✨"], ["tap to begin 💗"]], 2: [["welcome to the beach 🌊", 5000], ["the tide is waiting 🌊"], ["tap to begin 🌊"]], 3: [["the whole sky is yours 🌙", 5000], ["the stars are waiting ✨"], ["tap to launch 🚀"]] },
  ready: { 1: ["ready", "set", "go ✨"], 2: ["ready", "set", "go 🌊"], 3: ["ready", "set", "launch 🌙"] },
  gate: ["tap ✦", "tap ✦", "tap ✦"],
  planetNames: ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"],
  planetFacts: ["Mercury — closest to the sun, fastest orbit", "Venus — hottest planet, spins backwards", "Earth — home sweet home", "Mars — the red planet", "Jupiter — the giant", "Saturn — the ringed one, light enough to float", "Uranus — tilted on its side", "Neptune — the windiest", "Pluto — small but never forgotten"],
  moonPhaseNames: ["new moon", "waxing crescent", "first quarter", "waxing gibbous", "full moon", "waning gibbous", "third quarter", "waning crescent"],
};
window.PREFS = {
  _k: "pixelgift_public",
  _load() { try { return JSON.parse(localStorage.getItem(this._k) || "{}"); } catch (e) { return this._mem || {}; } },
  _save(o) { this._mem = o; try { localStorage.setItem(this._k, JSON.stringify(o)); } catch (e) { /* private mode */ } },
  get(key, def) { const o = this._load(); return key in o ? o[key] : def; },
  set(key, val) { const o = this._load(); o[key] = val; this._save(o); },
};
