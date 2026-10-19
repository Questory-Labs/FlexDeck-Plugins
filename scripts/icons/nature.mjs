import { arc, circle, dot, ellipse, icon } from "./shapes.mjs";

const n = (value) => Math.round(value * 1000) / 1000;
const petals = (cx, cy, count, inner, round) => {
  const at = (k) => {
    const a = ((-90 + 180 / count + (360 / count) * k) * Math.PI) / 180;
    return `${n(cx + inner * Math.cos(a))} ${n(cy + inner * Math.sin(a))}`;
  };
  return `M${at(0)}${Array.from({ length: count }, (_, k) => `A${round} ${round} 0 1 1 ${at(k + 1)}`).join("")}z`;
};

export default {
  name: "Nature & animals",
  icons: [
    icon("leaf", ["plant", "eco", "green"], ["M5 19C5 10 10 4 20 4c0 10-6 15-15 15z"], ["M5 19 13 11", "M3 21l2-2"]),
    icon("tree", ["forest", "park", "nature"], ["M12 2a6 6 0 0 0-5.8 7.5A4.5 4.5 0 0 0 8 18h8a4.5 4.5 0 0 0 1.8-8.5A6 6 0 0 0 12 2z"], ["M12 22V12", "M12 15l-2.5-2"]),
    icon("pine", ["evergreen", "christmas tree", "forest"], ["M12 2 5.5 11H9l-4 6h14l-4-6h3.5z"], ["M12 17v5"]),
    icon("flower", ["blossom", "spring", "garden"], [petals(12, 9, 5, 2.5, 2.6)], [circle(12, 9, 1.6), "M12 11.5V22", "M12 18c2-2.5 4.5-3 6-3-.5 2.5-3 4-6 3z"]),
    icon("tulip", ["flower", "spring", "bloom"], ["M7 4l2.5 2.5L12 3l2.5 3.5L17 4v6a5 5 0 0 1-10 0z"], ["M12 15v7", "M12 19c-2-2-4-2.5-6-2.5"]),
    icon("sprout", ["seedling", "grow", "new"], ["M12 12C12 8 9 6 4 6c0 4 3 6 8 6z", "M12 10c0-3 2.5-5 7-5 0 3.5-2.5 5-7 5z"], ["M12 21v-9", "M7 21h10"]),
    icon("cactus", ["desert", "plant", "succulent"], ["M10 22V5a2 2 0 0 1 4 0v17z"], ["M10 14H7a2 2 0 0 1-2-2V9", "M14 11h3a2 2 0 0 0 2-2V6", "M7 22h10"]),
    icon("mountain", ["peak", "hike", "landscape"], ["M2 20 9 7l4 6 3-4 6 11z"], ["m7.2 10.3 1.8 1.2 1.6-1.4"]),
    icon("volcano", ["eruption", "lava", "hot"], ["M2 21l6-10h8l6 10z"], ["M8 11c1 1.5 2.5 1.5 4 0s3-1.5 4 0", "M12 7V3", "M9 7 7.5 4", "M15 7l1.5-3"]),
    icon("water", ["waves", "ocean", "sea"], [], ["M2 7c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2", "M2 12c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2", "M2 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"]),
    icon("fire", ["flame", "hot", "lit", "trending"], ["M12 22c4 0 7-2.7 7-7 0-4-3-6.5-4-10-1.5 2-2 3.5-2 5-1.5-1-2.5-3-2.5-5C7 7 5 11 5 15c0 4.3 3 7 7 7z"], ["M12 22c-1.7 0-3-1.3-3-3 0-2 1.5-3 3-5 1.5 2 3 3 3 5 0 1.7-1.3 3-3 3z"]),
    icon("planet", ["saturn", "space", "orbit"], [circle(12, 12, 6.5)], ["M4.5 15.5C2 18 1.5 20 3 21c2 1.5 9-1.5 14.5-7S23 4.5 21 3c-1-.8-3 .3-5.5 2.5"]),
    icon("paw", ["pet", "animal", "dog", "cat"], [circle(5.5, 11, 1.8), circle(9, 6.5, 1.8), circle(15, 6.5, 1.8), circle(18.5, 11, 1.8), "M12 12c-3 0-6 4-6 6.5a2.5 2.5 0 0 0 3 2.4c1-.2 2-.6 3-.6s2 .4 3 .6a2.5 2.5 0 0 0 3-2.4c0-2.5-3-6.5-6-6.5z"]),
    icon("bone", ["dog", "treat", "skeleton"], ["M7 9h10a2.5 2.5 0 1 1 2.5 3 2.5 2.5 0 1 1-2.5 3H7a2.5 2.5 0 1 1-2.5-3A2.5 2.5 0 1 1 7 9z"]),
    icon("fish", ["sea", "food", "aquarium"], ["M3 7l3 5-3 5c3 0 5-1.5 6-3 2 2.5 4.5 4 8 4 3 0 5-2.5 5-6s-2-6-5-6c-3.5 0-6 1.5-8 4-1-1.5-3-3-6-3z"], [dot(17.5, 10.5)]),
    icon("bird", ["tweet", "fly", "animal"], ["M16 7a3 3 0 0 0-5.8 1L9.5 11c-3 0-5.5 2-6.5 5 3 0 5 1 9 1a6 6 0 0 0 6-6V9.5l3-1-3-1.5A3 3 0 0 0 16 7z"], [dot(15.5, 8.5), "M12 17l-1 4", "M15 16l.5 5"]),
    icon("cat", ["kitty", "pet", "meow"], ["M4 3l4 4h8l4-4v9a8 8 0 0 1-16 0z"], [dot(9, 12), dot(15, 12), "M11 15.5h2l-1 1z", "M2 14h4", "M18 14h4"]),
    icon("dog", ["puppy", "pet", "woof"], ["M8 5h8l4 1.5-1 6-2-1V15a5 5 0 0 1-10 0v-3.5l-2 1-1-6z"], [dot(10, 11), dot(14, 11), "M11 15h2l-1 1.2z", "M12 16.2v1.3"]),
    icon("bear", ["teddy", "animal", "cute"], [circle(12, 13, 8)], [arc(6.2, 6.8, 2.5, 100, 350), arc(17.8, 6.8, 2.5, 190, 440), dot(9, 12), dot(15, 12), ellipse(12, 16, 3, 2.2), dot(12, 15.3)]),
    icon("fox", ["animal", "wild", "clever"], ["M3 4l5 4h8l5-4-1 8-8 9-8-9z"], [dot(9, 12), dot(15, 12), "M8 13.5l4 2 4-2"]),
    icon("rabbit", ["bunny", "easter", "hop"], [circle(12, 15.5, 6), ellipse(9, 5.5, 1.8, 4), ellipse(15, 5.5, 1.8, 4)], [dot(10, 15), dot(14, 15), "M11.2 17.5h1.6"]),
    icon("owl", ["night", "wise", "bird"], ["M5 3l3 3h8l3-3v11a7 7 0 0 1-14 0z"], [circle(9, 10, 2.2), circle(15, 10, 2.2), "M11 14l1 1.5 1-1.5", "M9 18.5h6"]),
    icon("turtle", ["slow", "tortoise", "shell"], ["M4 15a8 8 0 0 1 16 0z"], ["M8 15v-3.5l4-3 4 3V15", "M20 15h1.5a1.5 1.5 0 0 0 0-3H19.5", "M7 15v3", "M17 15v3"]),
    icon("snail", ["slow", "shell", "garden"], [circle(11, 11.5, 6.5)], ["M11 11.5a1.5 1.5 0 1 1 1.5 1.5 3.5 3.5 0 1 1-3.5-3.5", "M2 19.5h16.5a3 3 0 0 0 3-3V9.5", "M21.5 9.5l-1-3", "M21.5 9.5l1.5-2.5"]),
    icon("ladybug", ["insect", "luck", "beetle"], [circle(12, 14, 7)], ["M9 7.5a3 3 0 0 1 6 0", "M10 5 8.5 3", "M14 5l1.5-2", "M12 7v14", dot(9, 12), dot(15, 12), dot(9, 16.5), dot(15, 16.5)]),
    icon("bug", ["insect", "debug", "issue"], [ellipse(12, 14, 5, 6.5)], ["M12 7.5v13", "M7 11H3.5", "M7 15H3", "M7 18.5 4 20", "M17 11h3.5", "M17 15h4", "M17 18.5l3 1.5", "M9.5 7.5a2.5 2.5 0 0 1 5 0", "M10 5 8.5 3", "M14 5l1.5-2"]),
    icon("butterfly", ["insect", "spring", "wings"], ["M12 11C10 6 6 3 3.5 4.5 2 6 3 10 6 11.5 3.5 13 4 17 6.5 18s4.5-2.5 5.5-5.5z", "M12 11c2-5 6-8 8.5-6.5 1.5 1.5.5 5.5-2.5 7 2.5 1.5 2 5.5-.5 6.5s-4.5-2.5-5.5-5.5z"], ["M12 8v12", "M12 8l-1.5-3", "M12 8l1.5-3"]),
    icon("feather", ["light", "quill", "write"], ["M20 4C14 4 8 7 6 14l-1 6 4-2c7-2 11-8 11-14z"], ["M3 21 14 10", "M8.5 15.5h4", "M11 13h4"]),
  ],
};
