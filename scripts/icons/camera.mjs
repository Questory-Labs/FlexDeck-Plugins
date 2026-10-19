import { circle, dot, ellipse, icon, line, rect, slash } from "./shapes.mjs";

const body = ["M3 8a2 2 0 0 1 2-2h2.5L9 3.5h6L16.5 6H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"];
const bolt = ["M13 2 4 14h7l-1 8 9-12h-7z"];
const blades = Array.from({ length: 6 }, (_, i) => {
  const a = (i * 60 * Math.PI) / 180;
  const b = ((i * 60 + 70) * Math.PI) / 180;
  return line(12 + 4 * Math.cos(a), 12 + 4 * Math.sin(a), 12 + 9.6 * Math.cos(b), 12 + 9.6 * Math.sin(b));
});

export default {
  name: "Camera & video",
  icons: [
    icon("camera", ["photo", "snapshot", "picture"], body, [circle(12, 13, 3.5)]),
    icon("camera-off", ["no camera", "privacy"], body, [circle(12, 13, 3.5), slash]),
    icon("switch-camera", ["flip camera", "front camera", "selfie"], body, ["M8.5 13a3.5 3.5 0 0 1 6-2.4", "M15.5 13a3.5 3.5 0 0 1-6 2.4", "M15 8.5v2.3h-2.3", "M9 17.5v-2.3h2.3"]),
    icon("aperture", ["lens", "iris", "shutter"], [circle(12, 12, 10)], blades),
    icon("focus", ["autofocus", "frame", "target"], [], ["M3 8V5a2 2 0 0 1 2-2h3", "M16 3h3a2 2 0 0 1 2 2v3", "M21 16v3a2 2 0 0 1-2 2h-3", "M8 21H5a2 2 0 0 1-2-2v-3", "M12 9v6", "M9 12h6"]),
    icon("flash", ["lightning", "bolt", "power", "energy"], bolt),
    icon("flash-off", ["no flash", "bolt off"], bolt, [slash]),
    icon("film", ["movie", "strip", "video"], [rect(3, 2, 18, 20, 2)], ["M7 2v20", "M17 2v20", "M3 7h4", "M3 12h4", "M3 17h4", "M17 7h4", "M17 12h4", "M17 17h4"]),
    icon("film-reel", ["reel", "cinema", "movie"], [circle(11, 12, 8)], [circle(11, 7.5, 1.5), circle(11, 16.5, 1.5), circle(6.5, 12, 1.5), circle(15.5, 12, 1.5), "M11 20h11"]),
    icon("clapperboard", ["action", "scene", "take", "film"], ["M3 10h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M3.2 9.5 2.6 7a2 2 0 0 1 1.5-2.4l13.6-3.2a2 2 0 0 1 2.4 1.5L20.7 5.4z"], ["M8.5 3.5l3 4", "M14 2.3l3 4"]),
    icon("camcorder", ["video camera", "handycam", "record"], [rect(2, 10, 13, 10, 2), "M15 13.5l6-3v9l-6-3z"], [circle(6, 6, 2.5), circle(12, 6, 2.5)]),
    icon("tripod", ["stand", "mount", "photography"], [rect(7, 3, 10, 6, 1.5)], ["M12 9v4", "M12 13 6 21", "M12 13l6 8", "M12 13v8"]),
    icon("ring-light", ["lighting", "selfie light", "creator"], [], [circle(12, 9, 6.5), circle(12, 9, 4.5), "M12 15.5V22", "M8 22h8"]),
    icon("studio-light", ["softbox", "lighting", "lamp"], ["M4 3h16l-3 9H7z"], ["M12 12v9", "M8 21h8"]),
    icon("crop", ["trim", "cut", "resize"], [], ["M6 2v14a2 2 0 0 0 2 2h14", "M2 6h14a2 2 0 0 1 2 2v14"]),
    icon("exposure", ["brightness", "ev", "plus minus"], [rect(3, 3, 18, 18, 3)], ["M3 21 21 3", "M6.5 8.5h4", "M8.5 6.5v4", "M13.5 16.5h4"]),
    icon("rule-of-thirds", ["grid", "composition", "frame"], [rect(3, 3, 18, 18, 2)], ["M9 3v18", "M15 3v18", "M3 9h18", "M3 15h18"]),
    icon("gallery", ["photos", "album", "images"], [rect(7, 3, 14, 14, 2)], ["M17 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2", "m9 15 3-3 3 3 2-2 4 4", circle(16, 7.5, 1.25)]),
    icon("polaroid", ["instant photo", "print", "snapshot"], [rect(4, 2, 16, 20, 2)], ["M7 5h10v10H7z"]),
    icon("projector", ["presentation", "beamer", "cinema"], [rect(2, 8, 20, 9, 2)], [circle(16, 12.5, 2.5), "M5 11h4", "M5 14h3", "M6 17v2", "M18 17v2"]),
    icon("drone", ["aerial", "quadcopter", "fpv"], [rect(9, 10, 6, 4, 1.5)], ["M9 10.5 6 7.5", "M15 10.5l3-3", "M9 13.5 6 16.5", "M15 13.5l3 3", ellipse(5, 6.5, 3, 1), ellipse(19, 6.5, 3, 1), ellipse(5, 17.5, 3, 1), ellipse(19, 17.5, 3, 1)]),
    icon("action-cam", ["sports camera", "pov", "helmet cam"], [rect(3, 6, 18, 13, 2.5)], [circle(14.5, 12.5, 3.5), rect(5.5, 8.5, 4, 2.5, 0.5), "M8 6V4.5h3V6"]),
    icon("timelapse", ["time lapse", "interval", "hyperlapse"], [], ["M12 3a9 9 0 1 1-9 9", dot(3.7, 8.6), dot(5.6, 5.6), dot(8.6, 3.7), "M12 7v5h4"]),
    icon("panorama", ["wide", "landscape", "360"], ["M2 6c6 1.5 14 1.5 20 0v12c-6-1.5-14-1.5-20 0z"], ["m6 15 3.5-3.5 3 3 2-2 3.5 3.5"]),
    icon("lens", ["glass", "optics", "zoom lens"], [], [circle(12, 12, 9.5), circle(12, 12, 6), "M10 9a3 3 0 0 1 3-1"]),
    icon("spotlight", ["stage light", "highlight", "beam"], ["M8 3h8v4l-2 2h-4L8 7z"], ["M10 9 5 21", "M14 9l5 12", "M5 21h14"]),
    icon("selfie", ["front camera", "portrait", "phone photo"], [rect(6, 2, 12, 20, 2.5)], [circle(12, 10, 2.5), "M8.5 16.5a3.5 3.5 0 0 1 7 0", "M11 4.5h2"]),
    icon("screen-record", ["capture screen", "recording", "rec"], [rect(2, 3, 20, 14, 2)], [circle(12, 10, 3), "M8 21h8", "M12 17v4"]),
    icon("tv", ["television", "screen", "channel"], [rect(2, 6, 20, 14, 2)], ["m7 2 5 4 5-4"]),
  ],
};
