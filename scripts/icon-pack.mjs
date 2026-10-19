import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

import { ROOT } from "./lib.mjs";

import streaming from "./icons/streaming.mjs";
import voice from "./icons/voice.mjs";
import audio from "./icons/audio.mjs";
import apps from "./icons/apps.mjs";
import controls from "./icons/controls.mjs";
import arrows from "./icons/arrows.mjs";
import users from "./icons/users.mjs";
import faces from "./icons/faces.mjs";
import games from "./icons/games.mjs";
import camera from "./icons/camera.mjs";
import time from "./icons/time.mjs";
import gestures from "./icons/gestures.mjs";
import weather from "./icons/weather.mjs";
import nature from "./icons/nature.mjs";
import money from "./icons/money.mjs";
import common from "./icons/common.mjs";

const CATEGORIES = [streaming, voice, audio, apps, controls, arrows, users, time, gestures, faces, games, camera, weather, nature, money, common];
const STROKE = 1.5;
const CUT = 1.5;
const BOLD = 2;
const AUTHOR = "FlexDeck";
const LICENSE = "MIT License. Copyright (c) 2026 Questory Labs";
const PACKS = [
  { dir: "flexdeck-essentials", name: "FlexDeck Essentials", filled: false },
  { dir: "flexdeck-essentials-filled", name: "FlexDeck Essentials Filled", filled: true },
];
const OUT = join(ROOT, "icon-packs");
const DIST = join(ROOT, "dist", "icon-packs");
const MANIFEST = join(OUT, PACKS[0].dir, "manifest.json");
const VERSION = process.argv[2] ?? (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")).Version : undefined);
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(VERSION ?? "")) throw new Error(`usage: icon-pack.mjs [version]; '${VERSION}' is not a version`);

const CanvasKit = await createRequire(import.meta.url)("canvaskit-wasm")();
const { Path, PathOp, StrokeCap, StrokeJoin } = CanvasKit;

const parse = (name, d) => {
  const path = Path.MakeFromSVGString(d);
  if (!path) throw new Error(`${name}: cannot read "${d}"`);
  return path;
};
const stroked = (name, d, width) => parse(name, d).makeStroked({ width, cap: StrokeCap.Round, join: StrokeJoin.Round });
const union = (paths) => paths.reduce((all, next) => (all ? Path.MakeFromOp(all, next, PathOp.Union) : next), null);

function drawsLike(winding, shape) {
  for (let y = 0.137; y < 24; y += 0.5) {
    for (let x = 0.161; x < 24; x += 0.5) {
      if (winding.contains(x, y) !== shape.contains(x, y)) return false;
    }
  }
  return true;
}

const ARGS = [2, 2, 4, 5, 6, 0];

function contours(path) {
  const cmds = Array.from(path.toCmds());
  const found = [];
  for (let i = 0; i < cmds.length; ) {
    const verb = cmds[i];
    const args = cmds.slice(i + 1, i + 1 + ARGS[verb]);
    i += 1 + ARGS[verb];
    if (verb === CanvasKit.MOVE_VERB) found.push({ start: args, segments: [] });
    else if (verb !== CanvasKit.CLOSE_VERB) found.at(-1).segments.push([verb, args]);
  }
  return found.filter((contour) => contour.segments.length);
}

const endOf = ([verb, args]) => (verb === CanvasKit.CONIC_VERB ? args.slice(2, 4) : args.slice(-2));
const pointsOf = (contour) => [contour.start, ...contour.segments.flatMap(([verb, args]) => (verb === CanvasKit.CONIC_VERB ? [args.slice(0, 2), args.slice(2, 4)] : Array.from({ length: args.length / 2 }, (_, k) => args.slice(2 * k, 2 * k + 2))))];
const cmdsOf = (contour) => [CanvasKit.MOVE_VERB, ...contour.start, ...contour.segments.flatMap(([verb, args]) => [verb, ...args]), CanvasKit.CLOSE_VERB];

function area(contour) {
  const points = pointsOf(contour);
  return points.reduce((sum, [x, y], k) => {
    const [nx, ny] = points[(k + 1) % points.length];
    return sum + x * ny - nx * y;
  }, 0);
}

function reversed(contour) {
  const starts = [contour.start, ...contour.segments.slice(0, -1).map(endOf)];
  const segments = contour.segments
    .map(([verb, args], k) => {
      const from = starts[k];
      if (verb === CanvasKit.LINE_VERB) return [verb, from];
      if (verb === CanvasKit.QUAD_VERB) return [verb, [...args.slice(0, 2), ...from]];
      if (verb === CanvasKit.CONIC_VERB) return [verb, [...args.slice(0, 2), ...from, args[4]]];
      return [verb, [...args.slice(2, 4), ...args.slice(0, 2), ...from]];
    })
    .reverse();
  return { start: endOf(contour.segments.at(-1)), segments };
}

function nonZero(shape) {
  const found = contours(shape);
  const alone = found.map((contour) => Path.MakeFromCmds(cmdsOf(contour)));
  const oriented = found.map((contour, k) => {
    const probes = pointsOf(contour);
    const depth = alone.filter((other, j) => j !== k && probes.filter(([x, y]) => other.contains(x, y)).length * 2 > probes.length).length;
    return (area(contour) > 0) === (depth % 2 === 0) ? contour : reversed(contour);
  });
  return Path.MakeFromCmds(oriented.flatMap(cmdsOf));
}

function filledPath({ name, body, detail }) {
  const solid = body.length ? union(body.map((d) => Path.MakeFromOp(parse(name, d), stroked(name, d, STROKE), PathOp.Union))) : null;
  let shape = solid;
  if (detail.length) {
    const cut = union(detail.map((d) => stroked(name, d, CUT)));
    const bold = union(detail.map((d) => stroked(name, d, BOLD)));
    shape = solid ? Path.MakeFromOp(Path.MakeFromOp(solid, bold, PathOp.Union), Path.MakeFromOp(cut, solid, PathOp.Intersect), PathOp.Difference) : bold;
  }
  if (!shape || shape.isEmpty()) throw new Error(`${name}: the filled icon is empty`);
  const winding = nonZero(shape);
  if (!winding || !drawsLike(winding, shape)) throw new Error(`${name}: the filled icon cannot be drawn with the non-zero rule`);
  return winding.toSVGString();
}

function check(icon) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(icon.name)) throw new Error(`${icon.name}: names are lower-case words joined by dashes`);
  if (!icon.body.length && !icon.detail.length) throw new Error(`${icon.name}: nothing to draw`);
  for (const d of [...icon.body, ...icon.detail]) {
    const [left, top, right, bottom] = stroked(icon.name, d, STROKE).computeTightBounds();
    if (left < -0.01 || top < -0.01 || right > 24.01 || bottom > 24.01) throw new Error(`${icon.name}: "${d}" reaches outside the 24 grid`);
  }
}

const outlineSvg = (icon) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">${[...icon.body, ...icon.detail].map((d) => `<path d="${d}"/>`).join("")}</svg>\n`;
const filledSvg = (d) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="${d}"/></svg>\n`;

function zip(files, prefix) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const [path, text] of files) {
    const name = Buffer.from(`${prefix}/${path}`);
    const raw = Buffer.from(text);
    const packed = deflateRawSync(raw);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(8, 8);
    head.writeUInt32LE(crc32(raw), 14);
    head.writeUInt32LE(packed.length, 18);
    head.writeUInt32LE(raw.length, 22);
    head.writeUInt16LE(name.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(crc32(raw), 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(raw.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    local.push(head, name, packed);
    central.push(entry, name);
    offset += head.length + name.length + packed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

const icons = CATEGORIES.flatMap((category) => category.icons.map((icon) => ({ ...icon, category: category.name })));
const seen = new Set();
for (const icon of icons) {
  if (seen.has(icon.name)) throw new Error(`${icon.name} is listed twice`);
  seen.add(icon.name);
  check(icon);
}
const filled = new Map(icons.map((icon) => [icon.name, filledPath(icon)]));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
for (const pack of PACKS) {
  const files = [
    ["manifest.json", `${JSON.stringify({ Name: pack.name, Author: AUTHOR, Version: VERSION }, null, 2)}\n`],
    ["icons.json", `${JSON.stringify(icons.map(({ name, tags, category }) => ({ path: `${name}.svg`, name, category, tags })), null, 2)}\n`],
    ["license.txt", `${LICENSE}\n`],
    ...icons.map((icon) => [`icons/${icon.name}.svg`, pack.filled ? filledSvg(filled.get(icon.name)) : outlineSvg(icon)]),
  ];
  mkdirSync(join(OUT, pack.dir, "icons"), { recursive: true });
  for (const [path, text] of files) writeFileSync(join(OUT, pack.dir, path), text);
  writeFileSync(join(DIST, `${pack.dir}.zip`), zip(files, pack.dir));
}

const sheet = CATEGORIES.map(
  (category) =>
    `<h2>${category.name} · ${category.icons.length}</h2><div class="grid">${category.icons
      .map(
        (icon) =>
          `<figure title="${icon.tags.join(", ")}">${outlineSvg(icon).replace('width="24" height="24"', 'width="32" height="32"')}${filledSvg(filled.get(icon.name)).replace('width="24" height="24"', 'width="32" height="32"')}<figcaption>${icon.name}</figcaption></figure>`,
      )
      .join("")}</div>`,
).join("");
writeFileSync(
  join(DIST, "preview.html"),
  `<!doctype html><meta charset="utf-8"><title>FlexDeck Essentials</title><style>body{margin:0;padding:16px;background:#1d1e21;color:#eee;font:11px ui-monospace,monospace}h2{font-size:12px;color:#999;margin:18px 0 8px}.grid{display:grid;grid-template-columns:repeat(auto-fill,96px);gap:6px}figure{margin:0;padding:8px 0;text-align:center;border-radius:8px;background:#26272b}svg{margin:0 3px}figcaption{margin-top:4px;color:#aaa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 4px}</style>${sheet}`,
);
console.log(`${icons.length} icons in ${CATEGORIES.length} categories, outline and filled, in ${OUT} and ${DIST}`);
