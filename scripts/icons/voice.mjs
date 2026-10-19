import { circle, dot, icon, rect, slash } from "./shapes.mjs";

const mic = [rect(9, 2, 6, 12, 3)];
const stand = ["M5 11a7 7 0 0 0 14 0", "M12 18v3", "M9 21h6"];
const cups = [rect(3, 14, 4, 7, 2), rect(17, 14, 4, 7, 2)];
const band = "M4 15v-3a8 8 0 0 1 16 0v3";
const speaker = ["M4 9h3l5-4v14l-5-4H4z"];
const phone = ["M6 3h2.5L10 7.5 8 9a10 10 0 0 0 7 7l1.5-2 4.5 1.5V18a3 3 0 0 1-3 3C10 21 3 14 3 6a3 3 0 0 1 3-3z"];
const bubble = ["M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"];
const bell = ["M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"];
const monitor = [rect(2, 3, 20, 14, 2)];

export default {
  name: "Voice & chat",
  icons: [
    icon("mic", ["microphone", "unmute", "talk", "discord"], mic, stand),
    icon("mic-off", ["microphone", "mute", "silence", "discord"], mic, [...stand, slash]),
    icon("headphones", ["audio", "listen", "monitor"], cups, [band]),
    icon("headset", ["gaming headset", "voice", "call"], [rect(3, 11, 4, 7, 2), rect(17, 11, 4, 7, 2)], ["M4 12v-1a8 8 0 0 1 16 0v1", "M19 18v.5a3.5 3.5 0 0 1-3.5 3.5H13"]),
    icon("deafen", ["headphones off", "discord", "deaf"], cups, [band, slash]),
    icon("speaker", ["volume", "sound", "audio", "loud"], speaker, ["M16 9a4 4 0 0 1 0 6", "M19 6a8 8 0 0 1 0 12"]),
    icon("speaker-off", ["mute", "volume", "silent"], speaker, ["m16 9 5 6", "m21 9-5 6"]),
    icon("volume-low", ["quiet", "sound", "speaker"], speaker, ["M16 9a4 4 0 0 1 0 6"]),
    icon("volume-plus", ["louder", "volume up", "increase"], speaker, ["M16 12h5", "M18.5 9.5v5"]),
    icon("volume-minus", ["quieter", "volume down", "decrease"], speaker, ["M16 12h5"]),
    icon("phone", ["call", "voice call", "ring"], phone),
    icon("hang-up", ["end call", "leave", "disconnect"], ["M2 14.5v-2C2 10 6.5 8 12 8s10 2 10 4.5v2a1.5 1.5 0 0 1-1.5 1.5H17a1.5 1.5 0 0 1-1.5-1.5V13a12 12 0 0 0-7 0v1.5A1.5 1.5 0 0 1 7 16H3.5A1.5 1.5 0 0 1 2 14.5z"]),
    icon("phone-incoming", ["call", "receive", "answer"], phone, ["M21 3l-5 5", "M16 4v4h4"]),
    icon("phone-outgoing", ["call", "dial", "start call"], phone, ["M16 8l5-5", "M17 3h4v4"]),
    icon("chat", ["message", "talk", "typing", "comment"], bubble, [dot(8, 10.5), dot(12, 10.5), dot(16, 10.5)]),
    icon("chat-text", ["message", "comment", "reply"], bubble, ["M7 8.5h10", "M7 12.5h6"]),
    icon("chats", ["conversation", "messages", "dm"], ["M6 3h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8l-4 3V5a2 2 0 0 1 2-2z"], ["M19 8h1a2 2 0 0 1 2 2v10l-4-3h-6a2 2 0 0 1-2-2v-.5"]),
    icon("mention", ["at", "ping", "tag", "email"], [], [circle(12, 12, 4), "M16 8v5a2.5 2.5 0 0 0 5 0v-1a9 9 0 1 0-3.5 7.1"]),
    icon("channel", ["hash", "hashtag", "text channel", "discord"], [], ["M5 9h15", "M4 15h15", "M10 3 8 21", "M16 3l-2 18"]),
    icon("bell", ["notification", "alert", "notify"], bell, ["M10 21h4"]),
    icon("bell-off", ["notifications off", "mute", "silence"], bell, ["M10 21h4", slash]),
    icon("bell-ring", ["notification", "ringing", "alert"], bell, ["M10 21h4", "M2.5 8a9 9 0 0 1 2.5-5", "M21.5 8a9 9 0 0 0-2.5-5"]),
    icon("megaphone", ["announce", "shout", "broadcast"], ["M3 10v4a1 1 0 0 0 1 1h3l9 5V4L7 9H4a1 1 0 0 0-1 1z"], ["M20 10v4", "M7.5 15.3 9 20h2.5"]),
    icon("soundboard", ["sounds", "pads", "sfx", "discord"], [rect(3, 3, 18, 18, 3)], [rect(6.5, 6.5, 4, 4, 1), rect(13.5, 6.5, 4, 4, 1), rect(6.5, 13.5, 4, 4, 1), rect(13.5, 13.5, 4, 4, 1)]),
    icon("screen-share", ["share screen", "go live", "present"], monitor, ["M8 21h8", "M12 17v4", "M12 13V7", "m9 10 3-3 3 3"]),
    icon("stop-share", ["stop sharing", "end screen share"], monitor, ["M8 21h8", "M12 17v4", "m9.5 7.5 5 5", "m14.5 7.5-5 5"]),
    icon("speaking", ["talking", "voice", "user speaking"], [circle(9, 8, 4)], ["M2 21a7 7 0 0 1 14 0", "M17 5a5 5 0 0 1 0 6", "M20 3a8 8 0 0 1 0 10"]),
    icon("push-to-talk", ["ptt", "hold to talk", "button"], [circle(12, 12, 10)], [rect(10, 6, 4, 8, 2), "M8.5 12a3.5 3.5 0 0 0 7 0", "M12 15.5V18"]),
    icon("voice-chat", ["voice message", "voice note", "audio message"], bubble, ["M8 9v3", "M11 7.5v6", "M14 8.5v4", "M17 9.5v2"]),
    icon("server", ["guild", "community", "host"], [rect(3, 3, 18, 8, 2), rect(3, 13, 18, 8, 2)], [dot(7, 7), dot(7, 17), "M11 7h6", "M11 17h6"]),
    icon("noise-off", ["noise suppression", "filter noise"], [], ["M4 11v2", "M8 8v8", "M12 5v14", "M16 8v8", "M20 11v2", slash]),
    icon("captions", ["subtitles", "cc", "closed captions"], [rect(2, 5, 20, 14, 3)], ["M10.5 10a2.5 2.5 0 1 0 0 4", "M17.5 10a2.5 2.5 0 1 0 0 4"]),
    icon("walkie-talkie", ["radio", "intercom", "team"], [rect(7, 6, 10, 16, 2)], ["M9 6V2", "M10 11h4", "M10 14h4", "M10 17h4"]),
    icon("reply", ["respond", "answer", "back"], [], ["M9 7 4 12l5 5", "M4 12h10a6 6 0 0 1 6 6v1"]),
    icon("do-not-disturb", ["dnd", "busy", "status"], [circle(12, 12, 9)], ["M8 12h8"]),
  ],
};
