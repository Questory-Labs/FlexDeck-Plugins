import { circle, dot, ellipse, heart, icon, rect, slash, star } from "./shapes.mjs";

const pad = ["M7 6h10a5 5 0 0 1 4.9 4l.9 5.3a2.8 2.8 0 0 1-5 2.2L16 15H8l-1.8 2.5a2.8 2.8 0 0 1-5-2.2L2.1 10A5 5 0 0 1 7 6z"];
const buttons = ["M7 9v4", "M5 11h4", dot(15.5, 10), dot(18, 12.5)];
const blade = "M14.5 17.5 3 6V3h3l11.5 11.5";
const bladeBack = "M9.5 17.5 21 6V3h-3L6.5 14.5";

export default {
  name: "Games",
  icons: [
    icon("gamepad", ["controller", "console", "play"], pad, buttons),
    icon("gamepad-off", ["controller", "disconnected"], pad, [...buttons, slash]),
    icon("joystick", ["arcade stick", "fight stick"], [circle(12, 6, 3), rect(3, 15, 18, 6, 2)], ["M12 9v6", dot(7, 18)]),
    icon("arcade", ["cabinet", "retro", "coin op"], ["M6 2h12v6l-1 2v12H7V10L6 8z"], [rect(8.5, 4, 7, 4, 0.5), "M7 13h10", dot(10, 16), dot(14, 16)]),
    icon("handheld", ["portable console", "retro"], [rect(5, 2, 14, 20, 2.5)], [rect(8, 5, 8, 6, 1), "M9 15v3", "M7.5 16.5h3", dot(15, 15.5), dot(16.5, 17.5)]),
    icon("d-pad", ["directional pad", "cross", "controls"], ["M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"], [circle(12, 12, 1.5)]),
    icon("dice", ["random", "roll", "chance", "board game"], [rect(3, 3, 18, 18, 4)], [dot(8, 8), dot(16, 8), dot(12, 12), dot(8, 16), dot(16, 16)]),
    icon("dice-pair", ["dice", "roll", "gamble"], [rect(2, 10, 11, 11, 2.5), rect(13.5, 3, 8.5, 8.5, 2)], [dot(5.5, 13.5), dot(7.5, 15.5), dot(9.5, 17.5), dot(15.8, 5.3), dot(19.7, 9.2)]),
    icon("cards", ["playing cards", "poker", "deck"], [rect(8, 3, 12, 17, 2)], ["M7.6 6.3 4.8 7a2 2 0 0 0-1.4 2.4l2.8 10.5a2 2 0 0 0 2.4 1.4l5-1.3", heart(14, 11.5, 0.3)]),
    icon("chess-pawn", ["chess", "strategy", "piece"], [circle(12, 6, 3), "M9.5 10h5l1.5 8h-8z", rect(6, 18, 12, 3, 1)]),
    icon("chess-rook", ["chess", "castle", "tower"], ["M6 3h3v2h2V3h2v2h2V3h3v5l-2 2v8h2v3H6v-3h2v-8L6 8z"], ["M8 10h8"]),
    icon("trophy", ["winner", "cup", "champion"], ["M7 3h10v6a5 5 0 0 1-10 0z"], ["M7 5H4.5a.5.5 0 0 0-.5.5V6a4 4 0 0 0 3.5 4", "M17 5h2.5a.5.5 0 0 1 .5.5V6a4 4 0 0 1-3.5 4", "M12 14v3.5", "M8.5 21h7l-1-3.5h-5z"]),
    icon("medal", ["award", "achievement", "prize"], [circle(12, 15, 6)], ["M8.5 10.2 6 2h4l2 5", "M15.5 10.2 18 2h-4l-2 5", star(12, 15.2, 2.8, 1.2)]),
    icon("crown", ["king", "queen", "winner", "royal"], ["M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z"], ["M5.5 16h13"]),
    icon("sword", ["weapon", "attack", "rpg"], ["M3 3h3.5l10 10-3.5 3.5L3 6.5z"], ["M12 18.5 18.5 12", "M16.5 16.5l3.5 3.5", "M19 21.5l2.5-2.5"]),
    icon("swords", ["battle", "fight", "pvp", "versus"], [], [blade, "M13 19l6-6", "M16 16l4 4", "M19 21l2-2", bladeBack, "M11 19l-6-6", "M8 16l-4 4", "M5 21l-2-2"]),
    icon("axe", ["weapon", "chop", "viking"], ["M12 7l3-3c3 0 6 3 6 6l-3 3c-1-3-3-5-6-6z"], ["M3 21 14.5 9.5"]),
    icon("treasure-map", ["map", "quest", "adventure"], ["M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"], ["M9 3v15", "M15 6v15", "m16.5 9.5 2 2", "m18.5 9.5-2 2", dot(6, 14), dot(11.5, 12), dot(13, 15.5)]),
    icon("potion", ["flask", "elixir", "magic", "health"], ["M10 3h4v5l4.6 7.7A3.5 3.5 0 0 1 15.6 21H8.4a3.5 3.5 0 0 1-3-5.3L10 8z"], ["M8.5 3h7", "M7 14h10"]),
    icon("treasure", ["chest", "loot", "reward"], ["M3 10V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2z", rect(3, 10, 18, 10, 1.5)], ["M3 10h18", rect(10, 9, 4, 4, 1)]),
    icon("gem", ["diamond", "jewel", "premium"], ["M7 3h10l4 6-9 12L3 9z"], ["M3 9h18", "M10 3 8 9l4 12 4-12-2-6"]),
    icon("magic-wand", ["magic", "spell", "effects"], [star(17.5, 6.5, 4, 1.5, 4)], ["M3 21 13.5 10.5", "M6 3.5v3", "M4.5 5h3", "M19.5 14.5v3", "M18 16h3"]),
    icon("puzzle", ["piece", "plugin", "extension", "jigsaw"], ["M5 6h4a2.5 2.5 0 1 1 5 0h4v4a2.5 2.5 0 1 1 0 5v4h-4a2.5 2.5 0 1 0-5 0H5v-4a2.5 2.5 0 1 0 0-5z"]),
    icon("target", ["goal", "aim", "bullseye"], [circle(12, 12, 10)], [circle(12, 12, 6), circle(12, 12, 2)]),
    icon("crosshair", ["aim", "scope", "fps"], [], [circle(12, 12, 8), "M12 2v5", "M12 17v5", "M2 12h5", "M17 12h5"]),
    icon("bomb", ["explosive", "boom", "danger"], [circle(10, 14, 7)], ["M15 9l2.5-2.5", "M19 2.5V4", "M21.5 5H20", "M20.8 3.2l-.8.8", "M7 12a3.5 3.5 0 0 1 2.5-2.5"]),
    icon("race-flag", ["checkered flag", "finish", "racing"], [rect(5, 3, 15, 11, 1)], ["M5 3v18", "M10 3v11", "M15 3v11", "M5 8.5h15"]),
    icon("steering-wheel", ["racing", "drive", "car game"], [], [circle(12, 12, 9.5), circle(12, 12, 2.5), "M2.5 12h7", "M14.5 12h7", "M12 14.5v7"]),
    icon("vr-headset", ["virtual reality", "goggles", "metaverse"], ["M4 7h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4l-2-3h-4l-2 3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"], ["M8 7V5h8v2"]),
    icon("castle", ["fortress", "kingdom", "base"], ["M3 21V6h3v2h2V6h2v2h4V6h2v2h2V6h3v15h-7v-4a2 2 0 0 0-4 0v4z"]),
    icon("health", ["pixel heart", "lives", "hp", "retro"], ["M5 4h4v2h2v2h2V6h2V4h4v2h2v6h-2v2h-2v2h-2v2h-2v2h-2v-2H9v-2H7v-2H5v-2H3V6h2z"]),
    icon("level-up", ["upgrade", "rank up", "xp"], [rect(3, 3, 18, 18, 4)], ["M12 17V7", "m8 11 4-4 4 4"]),
    icon("ufo", ["alien", "spaceship", "flying saucer"], [ellipse(12, 13, 10, 3.5)], ["M7 11a5 5 0 0 1 10 0", "M8 19l-1.5 2.5", "M12 19.5V22", "M16 19l1.5 2.5"]),
    icon("mushroom", ["power up", "fungus", "retro"], ["M3 12a9 9 0 0 1 18 0z", rect(8.5, 12, 7, 8, 2)], [dot(8, 8.5), dot(15, 7.5), dot(12, 10)]),
    icon("podium", ["leaderboard", "ranking", "winners"], ["M2 21v-8h6V7h8v9h6v5z"], ["M8 13v8", "M16 16v5"]),
  ],
};
