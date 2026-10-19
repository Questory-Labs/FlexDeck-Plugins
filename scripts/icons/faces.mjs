import { circle, dot, ellipse, heart, icon, star } from "./shapes.mjs";

const head = [circle(12, 12, 10)];
const eyes = [dot(9, 9.5), dot(15, 9.5)];
const smile = "M8 14a5 5 0 0 0 8 0";
const grin = "M7.5 13h9a4.5 4.5 0 0 1-9 0z";
const face = (name, tags, ...detail) => icon(name, tags, head, detail);

export default {
  name: "Faces & reactions",
  icons: [
    face("smile", ["happy", "emoji", "good"], ...eyes, smile),
    face("grin", ["happy", "big smile", "joy"], ...eyes, grin),
    face("laugh", ["lol", "haha", "funny"], "M7.5 10a1.5 1.5 0 0 1 3 0", "M13.5 10a1.5 1.5 0 0 1 3 0", grin),
    face("wink", ["flirt", "joke", "playful"], dot(9, 9.5), "M13.5 9.5h3", smile),
    face("sad", ["unhappy", "down", "bad"], ...eyes, "M8 16.5a5 5 0 0 1 8 0"),
    face("neutral", ["meh", "okay", "blank"], ...eyes, "M8.5 15h7"),
    face("surprised", ["wow", "shock", "omg"], ...eyes, circle(12, 15.5, 1.75)),
    face("angry", ["mad", "rage", "upset"], "M7.5 7.5l3 1.5", "M16.5 7.5l-3 1.5", dot(9, 11), dot(15, 11), "M8.5 16.5a4 4 0 0 1 7 0"),
    face("cool", ["sunglasses", "chill", "awesome"], "M5 9.5h14", "M6 9.5v1.5a2.5 2.5 0 0 0 5 0V9.5", "M13 9.5v1.5a2.5 2.5 0 0 0 5 0V9.5", "M9 15.5a4 4 0 0 0 6 0"),
    face("love", ["heart eyes", "adore", "crush"], heart(8.8, 9.6, 0.2), heart(15.2, 9.6, 0.2), smile),
    face("tongue", ["silly", "playful", "joke"], ...eyes, "M8 14h8", "M10.5 14v1.5a1.5 1.5 0 0 0 3 0V14"),
    face("sleepy", ["tired", "bored", "zzz"], "M7.5 10h3", "M13.5 10h3", circle(12, 15.5, 1)),
    face("dizzy", ["confused", "knocked out", "dead"], "m7.5 8.5 3 3", "m10.5 8.5-3 3", "m13.5 8.5 3 3", "m16.5 8.5-3 3", circle(12, 16, 1.5)),
    face("nerd", ["glasses", "smart", "geek"], circle(8.5, 10.5, 2.5), circle(15.5, 10.5, 2.5), "M11 10.5h2", "M9.5 16a3.5 3.5 0 0 0 5 0"),
    face("mask", ["sick", "ill", "covid"], ...eyes, "M6 13h12v3a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"),
    face("crying", ["tears", "sob", "sad"], ...eyes, "M8.5 17a4.5 4.5 0 0 1 7 0", "M7.5 12.5c-.8 1.2-1.2 2-1.2 2.6a1.2 1.2 0 0 0 2.4 0c0-.6-.4-1.4-1.2-2.6z"),
    face("smirk", ["sly", "smug", "sarcastic"], ...eyes, "M9 15c2 .8 4.5.6 6.5-1"),
    face("silent", ["zip", "secret", "quiet"], ...eyes, "M7.5 15h9", "M9.5 14v2", "M12 14v2", "M14.5 14v2"),
    face("star-struck", ["amazed", "starry", "wow"], star(9, 9.8, 2.2, 0.9), star(15, 9.8, 2.2, 0.9), grin),
    icon("angel", ["innocent", "halo", "good"], [circle(12, 13.5, 8)], [ellipse(12, 2.8, 5, 1), dot(9, 12), dot(15, 12), "M8.5 15.5a4.5 4.5 0 0 0 7 0"]),
    icon("skull", ["dead", "rip", "danger"], ["M12 2a8 8 0 0 0-8 8c0 3 1.5 5 3.5 6v3a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-3c2-1 3.5-3 3.5-6a8 8 0 0 0-8-8z"], [circle(9, 11, 1.5), circle(15, 11, 1.5), "M10.5 21v-2.5", "M13.5 21v-2.5"]),
    icon("ghost", ["spooky", "boo", "halloween"], ["M5 21V11a7 7 0 0 1 14 0v10l-3.5-2-3.5 2-3.5-2z"], [dot(9.5, 11), dot(14.5, 11)]),
    icon("alien", ["ufo", "space", "extraterrestrial"], ["M12 3c5 0 8 3 8 7.5S15.5 21 12 21 4 15 4 10.5 7 3 12 3z"], [ellipse(8.8, 12, 1.6, 1), ellipse(15.2, 12, 1.6, 1)]),
    icon("robot", ["bot", "ai", "automation"], ["M7 7h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z"], ["M12 7V3.5", circle(12, 2.8, 0.8), circle(9, 12, 1.5), circle(15, 12, 1.5), "M9.5 16.5h5", "M2 12v3", "M22 12v3"]),
    icon("eyes", ["look", "watching", "see"], [ellipse(8, 12, 3.5, 5), ellipse(16, 12, 3.5, 5)], [circle(9, 13, 1.25), circle(17, 13, 1.25)]),
    icon("heart", ["love", "like", "favourite"], [heart(12, 13.3)]),
    icon("heart-broken", ["heartbreak", "sad", "breakup"], [heart(12, 13.3)], ["M12 7.5l-1.5 3.5 3 2-1.5 3"]),
    icon("hearts", ["love", "romance", "likes"], [heart(9.5, 14.5, 0.55), heart(16.5, 8, 0.42)]),
  ],
};
