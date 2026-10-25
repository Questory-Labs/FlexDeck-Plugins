// The README artwork: the repository's banner, and a strip of keys for each
// plugin showing what it looks like on a deck. Plain SVG in .github/assets/,
// each in a dark and a light version for GitHub's <picture> switch.
//
// The style is the app's own (scripts/gen-art.mjs in the FlexDeck repository):
// the [f] mark, monospace text, dark keys on a dot grid. Keys are always dark,
// whatever the page: a deck never follows the page's theme.
//
// Text uses the platform's monospace font: GitHub serves these through <img>,
// which cannot load web fonts.
//
// Run: pnpm art
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ROOT } from "./lib.mjs";

const OUT = join(ROOT, ".github", "assets");
const MONO = `ui-monospace,'SF Mono','JetBrains Mono','Cascadia Mono',Menlo,Consolas,monospace`;
const ORANGE = "#ff5a1f";
const KEY = { face: "#1c1c1f", edge: "#2c2c30", ink: "#ecebe6", muted: "#8d8c86" };
const THEMES = {
  dark: { bg: "#0b0b0c", card: "#131315", line: "#26262a", ink: "#ecebe6", muted: "#8d8c86", dot: "#ffffff14", glow: 0.16, outline: "#2c2c30" },
  light: { bg: "#f6f5f1", card: "#ffffff", line: "#e3e1da", ink: "#111113", muted: "#6b6a65", dot: "#1111131c", glow: 0.12, outline: "none" },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const text = (x, y, str, { size = 14, weight = 400, fill, anchor = "start", spacing = 0 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" text-anchor="${anchor}" fill="${fill}">${esc(str)}</text>`;

/** The [f] mark (the app's logo.svg), `size` px with its top-left at (x, y). */
const mark = (x, y, size, outline = "none") => `<g transform="translate(${x} ${y}) scale(${size / 64})">
    <rect width="64" height="64" rx="14.08" fill="#111113" stroke="${outline}" stroke-width="${64 / size}"/>
    <path fill="#5f5e5a" d="M15,12h4.5v40h-4.5zM15,12h8v4.5h-8zM15,47.5h8v4.5h-8zM44.5,12h4.5v40h-4.5zM41,12h8v4.5h-8zM41,47.5h8v4.5h-8z"/>
    <path fill="${ORANGE}" d="M28.5,22h4.5v30h-4.5zM28.5,22A8,8 0 0 1 36.5,14L36.5,18.5A3.5,3.5 0 0 0 33,22zM36.5,14h2.5v4.5h-2.5zM25,26h14v4.5h-14z"/>
  </g>`;

const defs = (t) => `<defs>
    <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="${t.dot}"/></pattern>
    <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${ORANGE}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="keyshine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.06"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="litglow" cx="0.5" cy="0.5" r="0.7">
      <stop offset="0" stop-color="${ORANGE}" stop-opacity="0.24"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="art" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ORANGE}"/><stop offset="0.55" stop-color="#7c2d12"/><stop offset="1" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="faderfill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d4501c"/><stop offset="1" stop-color="#6e2611"/>
    </linearGradient>
    <linearGradient id="faderfillh" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#d4501c"/><stop offset="1" stop-color="#6e2611"/>
    </linearGradient>
    <linearGradient id="knob" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f1ec"/><stop offset="1" stop-color="#c9c7c0"/>
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${t.bg}" stop-opacity="0.9"/><stop offset="0.5" stop-color="${t.bg}" stop-opacity="0.2"/><stop offset="1" stop-color="${t.bg}" stop-opacity="0"/>
    </linearGradient>
  </defs>`;

// --- keys --------------------------------------------------------------------

/** A sparkline across the bottom of a key, filled faintly beneath. */
function spark(x, y, w, h, values, color) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const pts = values.map((v, i) => [x + (i * w) / (values.length - 1), y + h - ((v - lo) / (hi - lo || 1)) * h]);
  const line = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  return `<polygon points="${x},${y + h} ${line} ${x + w},${y + h}" fill="${color}" opacity="0.1"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" opacity="0.6"/>`;
}

const speaker = (x, y) =>
  `<path d="M${x},${y + 3}h3l4,-3.5v11l-4,-3.5h-3z" fill="${KEY.muted}"/><path d="M${x + 9.5},${y + 1.5}a4.5,4.5 0 0 1 0,6" fill="none" stroke="${KEY.muted}" stroke-width="1.3" stroke-linecap="round"/>`;

/**
 * One key at (x, y). A key is one of:
 *   { top, bottom }              a label and a muted line beneath
 *   { top, value, caption }      the value layout: small, large, small
 *   { fader, label }             a fader, 0..1; upright when the key is taller than wide
 *   { art, bottom }              album art and a line beneath
 * with `lit` (glowing orange), `face` (a rule's colour), `led` ("on" | "off"),
 * `spark` ([values], with `sparkColor`) and `captionColor`.
 */
function key(x, y, w, h, k) {
  const out = [];
  const rx = 12;
  const face = k.face ?? (k.lit ? "#2a160d" : KEY.face);
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${face}" stroke="${k.lit ? ORANGE : KEY.edge}" stroke-width="${k.lit ? 1.5 : 1}"/>`);
  if (k.spark) out.push(spark(x + 1, y + h * 0.45, w - 2, h * 0.5 - 6, k.spark, k.sparkColor ?? ORANGE));
  out.push(`<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h / 2}" rx="${rx - 1}" fill="url(#keyshine)"/>`);
  if (k.lit) out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#litglow)"/>`);
  const cx = x + w / 2;
  const ink = k.lit ? ORANGE : KEY.ink;
  const muted = k.lit ? "#ffb08f" : KEY.muted;

  if (k.fader !== undefined) {
    const vertical = h > w;
    const wx = x + 8, wy = y + 34, ww = w - 16, wh = h - 42;
    out.push(speaker(x + 12, y + 17));
    out.push(text(x + 30, y + 22, k.label, { size: 12, weight: 600, fill: KEY.ink }));
    out.push(text(x + w - 12, y + 22, String(Math.round(k.fader * 100)), { size: 11, weight: 700, fill: ORANGE, anchor: "end" }));
    out.push(`<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="8" fill="#070708" stroke="#26262a"/>`);
    if (vertical) {
      const knob = wy + 8 + (wh - 16) * (1 - k.fader);
      out.push(`<path d="M${wx},${knob}h${ww}v${wy + wh - knob - 8}a8,8 0 0 1 -8,8h${-(ww - 16)}a8,8 0 0 1 -8,-8z" fill="url(#faderfill)"/>`);
      out.push(`<rect x="${wx + 6}" y="${knob - 5}" width="${ww - 12}" height="12" rx="4" fill="#000000" opacity="0.35"/>`);
      out.push(`<rect x="${wx + 6}" y="${knob - 7}" width="${ww - 12}" height="12" rx="4" fill="url(#knob)"/>`);
    } else {
      const knob = wx + 8 + (ww - 16) * k.fader;
      out.push(`<path d="M${wx + 8},${wy}H${knob}v${wh}H${wx + 8}a8,8 0 0 1 -8,-8v${-(wh - 16)}a8,8 0 0 1 8,-8z" fill="url(#faderfillh)"/>`);
      out.push(`<rect x="${knob - 4}" y="${wy + 6}" width="12" height="${wh - 12}" rx="4" fill="#000000" opacity="0.35"/>`);
      out.push(`<rect x="${knob - 6}" y="${wy + 6}" width="12" height="${wh - 12}" rx="4" fill="url(#knob)"/>`);
    }
  } else if (k.art) {
    const s = h - 40;
    out.push(`<rect x="${cx - s / 2}" y="${y + 12}" width="${s}" height="${s}" rx="6" fill="url(#art)"/>`);
    out.push(`<circle cx="${cx + s * 0.12}" cy="${y + 12 + s * 0.42}" r="${s * 0.22}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.5"/>`);
    out.push(text(cx, y + h - 12, k.bottom, { size: 11, fill: KEY.muted, anchor: "middle", spacing: 1 }));
  } else if (k.value !== undefined) {
    out.push(text(cx, y + 24, k.top, { size: 11, weight: 600, fill: muted, anchor: "middle", spacing: 1 }));
    out.push(text(cx, y + h / 2 + 8, k.value, { size: k.valueSize ?? 20, weight: 700, fill: ink, anchor: "middle", spacing: -0.3 }));
    if (k.caption) out.push(text(cx, y + h - 13, k.caption, { size: 11, weight: 600, fill: k.captionColor ?? muted, anchor: "middle", spacing: 0.5 }));
  } else {
    out.push(text(cx, y + h / 2 - 2, k.top, { size: 14, weight: 700, fill: ink, anchor: "middle", spacing: 0.5 }));
    if (k.bottom) out.push(text(cx, y + h / 2 + 17, k.bottom, { size: 11, fill: muted, anchor: "middle", spacing: 1 }));
  }
  if (k.led) out.push(`<circle cx="${x + w - 13}" cy="${y + 13}" r="3.5" fill="${k.led === "on" ? "#3ddc84" : "#3a3a3f"}"/>`);
  return out.join("\n    ");
}

/**
 * A tablet's worth of keys: `cols` units across, each key `w` (default 1)
 * units wide and `h` rows tall, placed left to right, top to bottom.
 */
function deck(x, y, width, { cols, rows, keyH = 92, gap = 12, pad = 18 }, keys, frame = true) {
  const unit = (width - 2 * pad - (cols - 1) * gap) / cols;
  const height = 2 * pad + rows * keyH + (rows - 1) * gap;
  const taken = new Set();
  const free = (c, r, w, h) => {
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) if (c + i >= cols || taken.has(`${c + i},${r + j}`)) return false;
    return true;
  };
  const drawn = keys.map((k) => {
    const w = k.w ?? 1, h = k.h ?? 1;
    let at = null;
    for (let r = 0; r < rows && !at; r++) for (let c = 0; c < cols && !at; c++) if (free(c, r, w, h)) at = [c, r];
    if (!at) throw new Error(`no room for ${JSON.stringify(k)}`);
    const [c, r] = at;
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) taken.add(`${c + i},${r + j}`);
    return key(x + pad + c * (unit + gap), y + pad + r * (keyH + gap), w * unit + (w - 1) * gap, h * keyH + (h - 1) * gap, k);
  });
  const body = frame
    ? `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="20" fill="#0e0e10" stroke="#2a2a2e"/>
    <rect x="${x + 1}" y="${y + 1}" width="${width - 2}" height="${height - 2}" rx="19" fill="none" stroke="#ffffff" stroke-opacity="0.04"/>`
    : "";
  return { svg: `${body}\n    ${drawn.join("\n    ")}`, height };
}

// --- the repository's banner -------------------------------------------------

const BANNER_KEYS = [
  { top: "SCENE", bottom: "CAMERA", led: "on" },
  { top: "● REC", bottom: "00:42:17", lit: true },
  { top: "MIC", bottom: "MUTED", led: "off" },
  { fader: 0.62, label: "OUTPUT", h: 2 },
  { top: "♥ LIKED", bottom: "SPOTIFY" },
  { top: "AIRHORN", bottom: "SOUNDBOARD" },
  { top: "WEATHER", value: "24°", caption: "CLEAR", spark: [14, 13, 13, 15, 18, 21, 23, 24, 22, 19], sparkColor: "#38bdf8", valueSize: 22 },
  { top: "SHOUTOUT", bottom: "STREAMER.BOT" },
  { top: "DESK LAMP", bottom: "ON", led: "on" },
  { top: "BTC", value: "64,210", caption: "+2.14%", captionColor: "#4ade80", spark: [3, 4, 3, 5, 6, 5, 7, 8, 7, 9], sparkColor: "#facc15", valueSize: 18 },
  { top: "14:00", bottom: "STANDUP" },
];

function banner(t, count) {
  const W = 1280, H = 440;
  const grid = deck(744, 52, 480, { cols: 4, rows: 3, keyH: 98, gap: 10, pad: 20 }, BANNER_KEYS);
  const chips = ["OFFICIAL", "OPEN SOURCE", "SHA-256 PINNED", "PERMISSIONS FIRST"];
  let cx = 90;
  const chipSvg = chips
    .map((label) => {
      const s = `<circle cx="${cx}" cy="351" r="3.5" fill="${ORANGE}"/><text x="${cx + 12}" y="355">${esc(label)}</text>`;
      cx += 12 + label.length * 9.2 + 26;
      return s;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="flexdeck plugins — ${count} official plugins and recipes for your deck">
  ${defs(t)}
  <rect width="${W}" height="${H}" rx="24" fill="${t.bg}"/>
  <rect width="${W}" height="${H}" rx="24" fill="url(#dots)"/>
  <rect width="${W}" height="${H}" rx="24" fill="url(#fade)"/>
  <ellipse cx="984" cy="220" rx="380" ry="230" fill="url(#halo)"/>

  ${mark(84, 116, 80, t.outline)}
  <text x="184" y="174" font-family="${MONO}" font-size="50" font-weight="600" letter-spacing="-1.5" fill="${t.ink}">flexdeck<tspan fill="${ORANGE}">/plugins</tspan></text>

  ${text(86, 262, "Plays well with your setup.", { size: 30, weight: 500, fill: t.ink, spacing: -0.5 })}
  ${text(86, 300, `${count} official plugins and recipes, one click from the app.`, { size: 16, fill: t.muted })}

  <g font-family="${MONO}" font-size="12" font-weight="600" letter-spacing="2" fill="${t.muted}">${chipSvg}</g>

  ${grid.svg}
</svg>
`;
}

// --- a plugin's strip --------------------------------------------------------

/** A panel: the `// label` heading, the plugin's name, a line, and its keys. */
function hero(t, { label, title, line, keys, cols = 6 }) {
  const W = 960, px = 40, py = 152;
  const grid = deck(px, py, W - 2 * px, { cols, rows: 1 }, keys);
  const H = py + grid.height + 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${title}: ${line}`)}">
  ${defs(t)}
  <rect width="${W}" height="${H}" rx="24" fill="${t.bg}"/>
  <rect width="${W}" height="${H}" rx="24" fill="url(#dots)"/>
  <ellipse cx="${W - 120}" cy="60" rx="300" ry="140" fill="url(#halo)"/>
  ${text(40, 58, `// ${label}`, { size: 13, weight: 600, fill: ORANGE, spacing: 2.5 })}
  ${text(40, 98, title, { size: 32, weight: 600, fill: t.ink, spacing: -0.5 })}
  ${text(40, 128, line, { size: 15, fill: t.muted })}
  ${grid.svg}
</svg>
`;
}

const PLUGINS = {
  obs: {
    label: "PLUGIN · NODE",
    title: "OBS Studio",
    line: "Scenes, recording, streaming and every input, with OBS's state on the keys.",
    keys: [
      { top: "SCENE", bottom: "CAMERA", led: "on" },
      { top: "SCENE", bottom: "BRB", led: "off" },
      { top: "● REC", value: "00:42:17", caption: "RECORDING", lit: true, valueSize: 17 },
      { top: "GO LIVE", value: "—", caption: "OFFLINE", valueSize: 17 },
      { top: "REPLAY", bottom: "SAVE" },
      { fader: 0.8, label: "DESKTOP" },
    ],
  },
  discord: {
    label: "PLUGIN · NODE",
    title: "Discord",
    line: "Mute, deafen, push-to-talk, channels and volumes, and who is talking.",
    keys: [
      { top: "MIC", bottom: "MUTED", lit: true },
      { top: "DEAFEN", bottom: "OFF" },
      { top: "HOLD", bottom: "TO TALK" },
      { top: "#GENERAL", bottom: "4 IN CALL", led: "on" },
      { top: "ADA", bottom: "SPEAKING", led: "on" },
      { fader: 0.5, label: "OUTPUT" },
    ],
  },
  spotify: {
    label: "PLUGIN · NODE",
    title: "Spotify",
    line: "Like it, playlist it, move it to another speaker, with the album art on a key.",
    keys: [
      { art: true, bottom: "NOW PLAYING" },
      { top: "♥ LIKED", bottom: "TAP TO UNLIKE", lit: true },
      { top: "+ PLAYLIST", bottom: "LATE NIGHT" },
      { top: "FOCUS", bottom: "PLAYLIST" },
      { top: "DEVICE", bottom: "LIVING ROOM" },
      { fader: 0.6, label: "VOLUME" },
    ],
  },
  streamerbot: {
    label: "PLUGIN · NODE",
    title: "Streamer.bot",
    line: "Run actions, flip switches, and put global variables on the deck.",
    keys: [
      { top: "SHOUTOUT", bottom: "RUN" },
      { top: "LIGHTS", bottom: "SIDE A", lit: true },
      { top: "ALERTS", bottom: "ENABLED", led: "on" },
      { top: "FOLLOWERS", value: "1,204", caption: "GLOBAL", valueSize: 20 },
      { top: "BOT", bottom: "CONNECTED", led: "on" },
      { fader: 0.45, label: "VALUE" },
    ],
  },
  soundboard: {
    label: "PLUGIN · NATIVE · WINDOWS",
    title: "Soundboard",
    line: "Clips in your headphones and, through a virtual cable, in your mic.",
    keys: [
      { top: "AIRHORN", bottom: "PLAYING", lit: true },
      { top: "RIMSHOT", bottom: "CLIP" },
      { top: "APPLAUSE", bottom: "CLIP" },
      { top: "MIC MIX", bottom: "ON", led: "on" },
      { top: "STOP", bottom: "ALL CLIPS" },
      { fader: 0.75, label: "MASTER" },
    ],
  },
  sonar: {
    label: "PLUGIN · NODE · WINDOWS",
    title: "SteelSeries Sonar",
    line: "Every Sonar channel on a fader, mic mute, the chat mix and streamer mode.",
    keys: [
      { top: "MIC", bottom: "MUTED", lit: true },
      { top: "CHAT MIX", value: "+20", caption: "GAME", valueSize: 20 },
      { top: "STREAMER", bottom: "MODE ON", led: "on" },
      { fader: 0.7, label: "GAME" },
      { fader: 0.45, label: "CHAT" },
      { fader: 0.3, label: "MEDIA" },
    ],
  },
  gpu: {
    label: "PLUGIN · NODE · NVIDIA",
    title: "NVIDIA GPU",
    line: "Video memory, load, temperature and power, the last few minutes drawn behind.",
    keys: [
      { w: 2, top: "VRAM", value: "11.4 GB", caption: "OF 16 GB", spark: [6, 7, 7, 9, 11, 11, 10, 11, 12, 11], sparkColor: "#4ade80", valueSize: 22 },
      { w: 2, top: "GPU · 71°C", value: "96%", caption: "LOAD", spark: [20, 35, 60, 88, 95, 97, 96, 94, 96, 96], sparkColor: "#4ade80", valueSize: 22 },
      { w: 2, top: "POWER", value: "312 W", caption: "OF 360 W", spark: [90, 140, 220, 290, 305, 315, 310, 312, 309, 312], sparkColor: "#4ade80", valueSize: 22 },
    ],
  },
  batteries: {
    label: "PLUGIN · NODE · WINDOWS",
    title: "Device batteries",
    line: "Your headset, mouse and phone's charge, and a warning before one runs flat.",
    keys: [
      { top: "HEADSET", value: "70%", caption: "WH-1000XM5", valueSize: 20 },
      { top: "MOUSE", value: "15%", caption: "LOW", face: "#7f1d1d", valueSize: 20 },
      { top: "CONTROLLER", value: "55%", caption: "XBOX", valueSize: 20 },
      { top: "PHONE", value: "42%", caption: "CHARGING", valueSize: 20 },
      { top: "LOWEST", value: "15%", caption: "MOUSE", valueSize: 20 },
      { top: "BATTERIES", bottom: "REFRESH" },
    ],
  },
  counttogether: {
    label: "PLUGIN · NODE",
    title: "CountTogether",
    line: "Count up and down, and see your shared counters change as they change.",
    keys: [
      { top: "COFFEE", value: "4", caption: "+1 ON PRESS", valueSize: 24 },
      { top: "PUSH-UPS", value: "120", caption: "TODAY", valueSize: 24 },
      { top: "COFFEE", bottom: "−1" },
      { top: "HOLIDAY", value: "12", caption: "DAYS LEFT", valueSize: 24 },
      { top: "DEADLINE", value: "2", caption: "DAYS OVERDUE", face: "#7f1d1d", valueSize: 24 },
      { top: "SOBER", value: "214", caption: "DAYS AGO", valueSize: 24 },
    ],
  },
  weather: {
    label: "RECIPE · NO ACCOUNT",
    title: "Weather",
    line: "The weather where each key says, today's temperatures drawn behind.",
    keys: [
      { w: 2, top: "CLEAR · 12 KM/H", value: "24°", caption: "BERLIN", spark: [14, 13, 13, 15, 18, 21, 23, 24, 22, 19], sparkColor: "#38bdf8", valueSize: 26 },
      { w: 2, top: "CLOUDY · 8 KM/H", value: "17°", caption: "LONDON", spark: [12, 12, 13, 15, 16, 17, 17, 16, 15, 14], sparkColor: "#38bdf8", valueSize: 26 },
      { w: 2, top: "RAIN · 21 KM/H", value: "9°", caption: "OSLO", spark: [7, 7, 8, 8, 9, 10, 9, 9, 8, 8], sparkColor: "#38bdf8", valueSize: 26 },
    ],
  },
  calendar: {
    label: "RECIPE · ICAL",
    title: "Calendar",
    line: "Your next event and how soon it starts, red in the last five minutes.",
    keys: [
      { w: 2, top: "MON 14:00", value: "Design review", caption: "IN 42M", valueSize: 18 },
      { w: 2, top: "MON 15:30", value: "1:1 with Sam", caption: "IN 4M", face: "#7f1d1d", valueSize: 18 },
      { w: 2, top: "", value: "Nothing coming", caption: "NOW", valueSize: 18 },
    ],
  },
  crypto: {
    label: "RECIPE · COINGECKO",
    title: "Crypto prices",
    line: "A coin's price and its change today, the last day drawn behind.",
    keys: [
      { w: 2, top: "BITCOIN", value: "$64,210.55", caption: "+2.14% TODAY", captionColor: "#4ade80", spark: [3, 4, 3, 5, 6, 5, 7, 8, 7, 9], sparkColor: "#facc15", valueSize: 20 },
      { w: 2, top: "ETHEREUM", value: "$3,102.80", caption: "-0.87% TODAY", captionColor: "#ef4444", spark: [9, 8, 8, 7, 8, 6, 6, 5, 6, 5], sparkColor: "#facc15", valueSize: 20 },
      { w: 2, top: "SOLANA", value: "$148.31", caption: "+5.02% TODAY", captionColor: "#4ade80", spark: [2, 3, 3, 4, 6, 6, 7, 8, 9, 10], sparkColor: "#facc15", valueSize: 20 },
    ],
  },
  "home-assistant": {
    label: "RECIPE · YOUR NETWORK",
    title: "Home Assistant",
    line: "Any entity's state on a key: a sensor's reading, a light on or off.",
    keys: [
      { top: "LIVING ROOM", value: "21.5°C", caption: "HOME", valueSize: 18 },
      { top: "DESK LAMP", value: "on", caption: "HOME", face: "#854d0e", valueSize: 18 },
      { top: "HUMIDITY", value: "48%", caption: "HOME", valueSize: 18 },
      { top: "FRONT DOOR", value: "off", caption: "HOME", valueSize: 18 },
      { top: "SOLAR", value: "412W", caption: "HOME", valueSize: 18 },
      { top: "GARAGE", value: "closed", caption: "HOME", valueSize: 18 },
    ],
  },
};

mkdirSync(OUT, { recursive: true });
const written = [];
const write = (name, svg) => {
  writeFileSync(join(OUT, name), svg);
  written.push(name);
};
for (const [name, theme] of Object.entries(THEMES)) {
  write(`banner-${name}.svg`, banner(theme, Object.keys(PLUGINS).length));
  for (const [id, spec] of Object.entries(PLUGINS)) write(`${id}-${name}.svg`, hero(theme, spec));
}
console.log(`wrote .github/assets/:\n  ${written.join("\n  ")}`);
