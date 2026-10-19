import { circle, icon, line, rect, slash } from "./shapes.mjs";

const broadcast = ["M8.5 8.5a5 5 0 0 0 0 7", "M15.5 8.5a5 5 0 0 1 0 7", "M5.5 5.5a9 9 0 0 0 0 13", "M18.5 5.5a9 9 0 0 1 0 13"];
const video = [rect(2, 7, 13, 10, 2), "M15 10.5 21 7v10l-6-3.5z"];
const eye = "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z";
const monitor = rect(2, 3, 20, 14, 2);

export default {
  name: "Streaming",
  icons: [
    icon("scene", ["obs", "layers", "stack"], ["M12 3 3 7.5 12 12l9-4.5z"], ["m3 12 9 4.5 9-4.5", "m3 16.5 9 4.5 9-4.5"]),
    icon("layer-add", ["obs", "add source", "new scene"], ["M11 3 2 7.5 11 12l9-4.5z"], ["m2 12 9 4.5 3-1.5", "m2 16.5 9 4.5 2-1", "M19 14v6", "M16 17h6"]),
    icon("broadcast", ["obs", "stream", "go live", "on air"], [circle(12, 12, 2)], broadcast),
    icon("broadcast-off", ["obs", "stream", "end stream", "off air"], [circle(12, 12, 2)], [...broadcast, slash]),
    icon("live", ["obs", "stream", "on air", "badge"], [rect(2, 6, 20, 12, 3)], [circle(7, 12, 1.5), "M11 10h7", "M11 14h5"]),
    icon("record", ["obs", "rec", "start recording"], [circle(12, 12, 9)], [circle(12, 12, 5)]),
    icon("record-pause", ["obs", "rec", "pause recording"], [circle(12, 12, 9)], ["M10 9v6", "M14 9v6"]),
    icon("record-stop", ["obs", "rec", "stop recording"], [circle(12, 12, 9)], [rect(9, 9, 6, 6, 1)]),
    icon("studio-mode", ["obs", "preview", "program"], [rect(2, 5, 9, 9, 1.5), rect(13, 5, 9, 9, 1.5)], ["M8 19h8"]),
    icon("transition", ["obs", "cut", "fade", "swap"], [rect(2, 4, 8, 8, 1), rect(14, 12, 8, 8, 1)], ["M10 8h6a2 2 0 0 1 2 2v2", "m15 9 3 3 3-3"]),
    icon("replay", ["obs", "replay buffer", "instant replay"], ["m10 9 5 3-5 3z"], ["M4 12a8 8 0 1 0 8-8c-2.5 0-4.6 1.1-6 2.8", "M5.5 3v4.5H10"]),
    icon("video", ["obs", "camera", "webcam", "source"], video),
    icon("video-off", ["obs", "camera", "webcam", "hide"], video, [slash]),
    icon("vertical-video", ["shorts", "reels", "portrait", "tiktok"], [rect(7, 2, 10, 20, 2)], ["m11 9.5 3 2.5-3 2.5z"]),
    icon("media", ["obs", "media source", "play", "video file"], [rect(2, 4, 20, 16, 2)], ["m10 9 5 3-5 3z"]),
    icon("webcam", ["obs", "virtual camera", "camera"], [circle(12, 10, 7)], [circle(12, 10, 3), "M8 21h8", "M12 17v4"]),
    icon("display-capture", ["obs", "screen", "monitor capture"], [monitor], ["M8 21h8", "M12 17v4", "M6 8.5V7h1.5", "M18 8.5V7h-1.5", "M6 11.5V13h1.5", "M18 11.5V13h-1.5"]),
    icon("green-screen", ["obs", "chroma key", "background"], [rect(3, 3, 18, 18, 2)], [circle(12, 10, 3), "M7 21a5 5 0 0 1 10 0"]),
    icon("eye", ["obs", "show", "visible", "source"], [eye], [circle(12, 12, 3)]),
    icon("eye-off", ["obs", "hide", "hidden", "source"], [eye], [circle(12, 12, 3), slash]),
    icon("text", ["obs", "text source", "title", "type"], [], ["M5 7V5h14v2", "M12 5v14", "M9 19h6"]),
    icon("lower-third", ["obs", "name tag", "caption", "overlay"], [rect(2, 4, 20, 16, 2)], ["M5 14h9", "M5 17h5"]),
    icon("filter", ["obs", "filters", "funnel"], ["M3 4h18l-7 8.5V19l-4 2v-8.5z"]),
    icon("mixer", ["obs", "audio", "sliders", "faders"], [rect(4, 13, 4, 3, 1), rect(10, 7, 4, 3, 1), rect(16, 11, 4, 3, 1)], ["M6 4v9", "M6 16v4", "M12 4v3", "M12 10v10", "M18 4v7", "M18 14v6"]),
    icon("gauge", ["obs", "stats", "cpu", "performance"], [circle(12, 13, 1.25)], ["M4.2 17a9 9 0 1 1 15.6 0", "M12.9 12.1 16 9"]),
    icon("pulse", ["stream health", "heartbeat", "activity"], [], ["M3 12h4l2-5 4 10 2-5h6"]),
    icon("chart", ["obs", "stats", "bitrate", "graph"], [], ["M3 3v18h18", "m7 15 4-4 3 3 5-6"]),
    icon("level", ["obs", "audio", "meter", "db", "signal"], [], ["M6 20v-4", "M10 20v-8", "M14 20V8", "M18 20V4"]),
    icon("waveform", ["audio", "sound", "voice", "speaking"], [], ["M3 11v2", "M7 8v8", "M11 4v16", "M15 7v10", "M19 10v4"]),
    icon("screenshot", ["obs", "capture", "snapshot"], [circle(12, 12, 3)], ["M3 8V5a2 2 0 0 1 2-2h3", "M16 3h3a2 2 0 0 1 2 2v3", "M21 16v3a2 2 0 0 1-2 2h-3", "M8 21H5a2 2 0 0 1-2-2v-3"]),
    icon("bookmark", ["obs", "marker", "chapter"], ["M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"]),
    icon("clip", ["clip", "scissors", "cut", "twitch"], [circle(6, 6, 3), circle(6, 18, 3)], ["M8.1 8.1 20 20", "M8.1 15.9 20 4"]),
    icon("image", ["obs", "image source", "picture", "photo"], [rect(3, 4, 18, 16, 2)], [circle(9, 9.5, 1.5), "m21 15-4.5-4.5L6 20"]),
    icon("window", ["obs", "browser source", "app", "capture"], [rect(3, 4, 18, 16, 2)], [line(3, 9, 21, 9)]),
    icon("poll", ["twitch", "vote", "survey"], [rect(3, 4, 18, 16, 2)], ["M7 9h10", "M7 12h6", "M7 15h8"]),
  ],
};
