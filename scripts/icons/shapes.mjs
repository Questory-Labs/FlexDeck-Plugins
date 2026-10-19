const n = (value) => Math.round(value * 1000) / 1000;

export const circle = (cx, cy, radius) =>
  `M${n(cx - radius)} ${n(cy)}a${n(radius)} ${n(radius)} 0 1 0 ${n(2 * radius)} 0a${n(radius)} ${n(radius)} 0 1 0 ${n(-2 * radius)} 0z`;

export const ellipse = (cx, cy, rx, ry) =>
  `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0z`;

export const rect = (x, y, width, height, radius = 0) => {
  const k = Math.min(radius, width / 2, height / 2);
  if (!k) return `M${n(x)} ${n(y)}h${n(width)}v${n(height)}h${n(-width)}z`;
  const w = n(width - 2 * k);
  const h = n(height - 2 * k);
  return `M${n(x + k)} ${n(y)}h${w}a${k} ${k} 0 0 1 ${k} ${k}v${h}a${k} ${k} 0 0 1 ${-k} ${k}h${-w}a${k} ${k} 0 0 1 ${-k} ${-k}v${-h}a${k} ${k} 0 0 1 ${k} ${-k}z`;
};

export const dot = (x, y) => circle(x, y, 0.5);

export const line = (x1, y1, x2, y2) => `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`;

export const polygon = (...points) => `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}z`;

export const star = (cx, cy, outer, inner, points = 5, turn = -90) =>
  polygon(
    ...Array.from({ length: points * 2 }, (_, i) => {
      const radius = i % 2 ? inner : outer;
      const angle = ((turn + (i * 180) / points) * Math.PI) / 180;
      return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    }),
  );

export const arc = (cx, cy, radius, from, to) => {
  const at = (deg) => [cx + radius * Math.cos((deg * Math.PI) / 180), cy + radius * Math.sin((deg * Math.PI) / 180)];
  const [x1, y1] = at(from);
  const [x2, y2] = at(to);
  const sweep = to > from ? 1 : 0;
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M${n(x1)} ${n(y1)}A${n(radius)} ${n(radius)} 0 ${large} ${sweep} ${n(x2)} ${n(y2)}`;
};

export const gear = (cx, cy, outer, inner, teeth = 8) => {
  const step = 360 / teeth;
  const at = (radius, deg) => [cx + radius * Math.cos((deg * Math.PI) / 180), cy + radius * Math.sin((deg * Math.PI) / 180)];
  return polygon(...Array.from({ length: teeth }, (_, i) => i * step - 90).flatMap((c) => [at(inner, c - 0.3 * step), at(outer, c - 0.17 * step), at(outer, c + 0.17 * step), at(inner, c + 0.3 * step)]));
};

export const heart = (cx, cy, size = 1) => {
  const k = (value) => n(value * size);
  return `M${n(cx)} ${n(cy + 7.7 * size)}s${k(-8)} ${k(-5)} ${k(-8)} ${k(-11)}a${k(4.5)} ${k(4.5)} 0 0 1 ${k(8)} ${k(-2.5)}a${k(4.5)} ${k(4.5)} 0 0 1 ${k(8)} ${k(2.5)}c0 ${k(6)} ${k(-8)} ${k(11)} ${k(-8)} ${k(11)}z`;
};

export const icon = (name, tags, body, detail = []) => ({ name, tags, body, detail });

export const slash = line(3, 3, 21, 21);
