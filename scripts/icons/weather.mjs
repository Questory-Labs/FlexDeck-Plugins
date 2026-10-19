import { arc, circle, dot, icon, slash, star } from "./shapes.mjs";

const n = (value) => Math.round(value * 1000) / 1000;
const cloud = (cx, bottom, s = 1) => {
  const k = (value) => n(value * s);
  return `M${n(cx - 5 * s)} ${bottom}h${k(10)}a${k(4.5)} ${k(4.5)} 0 0 0 ${k(0.9)} ${k(-8.9)}a${k(6)} ${k(6)} 0 0 0 ${k(-11.7)} ${k(0.9)}a${k(4)} ${k(4)} 0 0 0 ${k(0.8)} ${k(8)}z`;
};
const rays = ["M12 2v2", "M12 20v2", "M2 12h2", "M20 12h2", "m4.9 4.9 1.4 1.4", "m17.7 17.7 1.4 1.4", "m4.9 19.1 1.4-1.4", "m17.7 6.3 1.4-1.4"];
const rainCloud = [cloud(12, 15, 0.8)];
const thermometer = ["M10 13.8V5a2 2 0 0 1 4 0v8.8a4 4 0 1 1-4 0z"];
const thermometerLeft = ["M7 13.8V5a2 2 0 0 1 4 0v8.8a4 4 0 1 1-4 0z"];
const drop = ["M12 2.5c-3.5 4.5-6.5 8.5-6.5 12a6.5 6.5 0 0 0 13 0c0-3.5-3-7.5-6.5-12z"];
const flake = Array.from({ length: 6 }, (_, i) => {
  const a = ((i * 60 - 90) * Math.PI) / 180;
  const [ux, uy, vx, vy] = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a)];
  const at = (r, side) => `${n(12 + r * ux + side * vx)} ${n(12 + r * uy + side * vy)}`;
  return `M${at(9.6, 2.3)}L${at(7.3, 0)}L${at(9.6, -2.3)}`;
});

export default {
  name: "Weather",
  icons: [
    icon("sun", ["sunny", "day", "brightness", "light mode"], [circle(12, 12, 4)], rays),
    icon("sun-dim", ["dim", "low brightness"], [circle(12, 12, 4)], [dot(12, 4.5), dot(12, 19.5), dot(4.5, 12), dot(19.5, 12), dot(6.7, 6.7), dot(17.3, 17.3), dot(6.7, 17.3), dot(17.3, 6.7)]),
    icon("moon", ["night", "dark mode", "sleep"], ["M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"]),
    icon("moon-stars", ["night", "clear sky", "sleep"], ["M17 15.5A7 7 0 1 1 8.5 6a5.5 5.5 0 0 0 8.5 9.5z"], [star(18, 5, 2.5, 1, 4), star(21, 10, 1.5, 0.6, 4)]),
    icon("cloud", ["cloudy", "overcast", "storage"], [cloud(12, 19)]),
    icon("clouds", ["cloudy", "overcast"], [cloud(11, 20, 0.9)], ["M10 6.5A5 5 0 0 1 19.4 8a3.5 3.5 0 0 1 2.3 5.5"]),
    icon("cloud-sun", ["partly cloudy", "mild"], [cloud(13.5, 20, 0.75)], [arc(8, 8, 3.5, 135, 345), "M8 2v1.5", "M2 8h1.5", "M3.8 3.8l1 1", "M12.2 3.8l-1 1"]),
    icon("cloud-moon", ["cloudy night"], [cloud(13.5, 20, 0.75)], ["M10 6.75A4.25 4.25 0 1 1 4.75 1.5a3.5 3.5 0 0 0 5.25 5.25z"]),
    icon("rain", ["rainy", "shower", "wet"], rainCloud, ["M8 18l-1 3", "M12 18l-1 3", "M16 18l-1 3"]),
    icon("drizzle", ["light rain", "sprinkle"], rainCloud, [dot(8, 19), dot(12, 20.5), dot(16, 19)]),
    icon("heavy-rain", ["downpour", "storm", "monsoon"], rainCloud, ["M7 17.5 5.5 21.5", "M11 17.5 9.5 21.5", "M15 17.5l-1.5 4", "M19 17.5l-1.5 4"]),
    icon("snow", ["snowy", "winter", "flurries"], rainCloud, ["M8 18v3", "M6.7 18.7l2.6 1.6", "M6.7 20.3l2.6-1.6", "M16 18v3", "M14.7 18.7l2.6 1.6", "M14.7 20.3l2.6-1.6"]),
    icon("hail", ["ice", "sleet"], rainCloud, [circle(8, 19.5, 1), circle(12, 21, 1), circle(16, 19.5, 1)]),
    icon("snowflake", ["cold", "winter", "freeze", "ice"], [], ["M12 2v20", "M3.3 7l17.4 10", "M3.3 17 20.7 7", ...flake]),
    icon("storm", ["thunder", "lightning", "thunderstorm"], [cloud(12, 14, 0.75)], ["M13 15.5l-3 3.5h4l-3 4"]),
    icon("wind", ["breeze", "windy", "air"], [], ["M3 8h10a2.5 2.5 0 1 0-2.5-2.5", "M3 12h15a3 3 0 1 1-3 3", "M3 16h5"]),
    icon("tornado", ["twister", "storm", "cyclone"], [], ["M21 4H3", "M18 8H6", "M19 12H9", "M16 16h-6", "M14 20h-3"]),
    icon("fog", ["mist", "haze", "foggy"], [cloud(12, 13, 0.65)], ["M4 16.5h16", "M6 20.5h12"]),
    icon("rainbow", ["pride", "colors", "after rain"], [], ["M2 18a10 10 0 0 1 20 0", "M5.5 18a6.5 6.5 0 0 1 13 0", "M9 18a3 3 0 0 1 6 0"]),
    icon("umbrella", ["rain", "protection", "insurance"], ["M2 12a10 10 0 0 1 20 0z"], ["M12 12v7a2 2 0 0 1-4 0"]),
    icon("thermometer", ["temperature", "degrees", "heat"], thermometer, ["M12 15.5V9"]),
    icon("thermometer-hot", ["hot", "heat", "summer"], thermometerLeft, ["M9 15.5V9", "M17 3c1 1.5-1 2.5 0 4s-1 2.5 0 4", "M21 3c1 1.5-1 2.5 0 4s-1 2.5 0 4"]),
    icon("thermometer-cold", ["cold", "freezing", "winter"], thermometerLeft, ["M9 15.5V9", "M19 3v6", "M16.4 4.5l5.2 3", "M16.4 7.5l5.2-3"]),
    icon("sunrise", ["morning", "dawn"], ["M6 18a6 6 0 0 1 12 0z"], ["M2 18h20", "M12 8V3", "m9.5 5.5 2.5-2.5 2.5 2.5", "M4.2 10.2l1.4 1.4", "M19.8 10.2l-1.4 1.4", "M7 21.5h10"]),
    icon("sunset", ["evening", "dusk"], ["M6 18a6 6 0 0 1 12 0z"], ["M2 18h20", "M12 3v5", "m9.5 5.5 2.5 2.5 2.5-2.5", "M4.2 10.2l1.4 1.4", "M19.8 10.2l-1.4 1.4", "M7 21.5h10"]),
    icon("droplet", ["water", "drop", "liquid"], drop, ["M9 15a3 3 0 0 0 3 3"]),
    icon("humidity", ["moisture", "percent", "damp"], drop, ["M9.5 17.5l5-5", dot(10, 13), dot(14, 17)]),
    icon("cloud-off", ["offline", "no cloud", "disconnected"], [cloud(12, 19)], [slash]),
    icon("comet", ["meteor", "shooting star", "space"], [circle(17, 7, 3)], ["M13 11 4 20", "M11.8 8.2 7 13", "M15.8 12.2l-4.8 4.8"]),
    icon("hurricane", ["cyclone", "typhoon", "storm"], [], ["M16 4.5A9 9 0 0 0 4 12", "M8 19.5A9 9 0 0 0 20 12", circle(12, 12, 3)]),
  ],
};
