import { circle, dot, gear, heart, icon, polygon, rect } from "./shapes.mjs";

const tile = [rect(3, 3, 18, 18, 5)];
const app = (name, tags, glyph) => icon(name, tags, tile, glyph);
const page = ["M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"];
const folder = ["M3 6a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"];

export default {
  name: "Apps",
  icons: [
    app("video-app", ["video platform", "watch", "channel"], ["M10 8.5v7l6-3.5z"]),
    app("live-app", ["live platform", "stream", "go live"], [dot(12, 13), "M9.2 10.2a4 4 0 0 0 0 5.6", "M14.8 10.2a4 4 0 0 1 0 5.6", "M12 7v2.5"]),
    app("music-app", ["music player", "songs", "listen"], [circle(8.5, 16, 1.5), circle(14.5, 14.5, 1.5), "M10 16V8.5l6-1.5v7.5"]),
    app("voice-app", ["voice chat", "party", "server"], ["M7.5 14v-2a4.5 4.5 0 0 1 9 0v2", rect(6.5, 13, 2.5, 4, 1), rect(15, 13, 2.5, 4, 1)]),
    app("social-app", ["feed", "likes", "followers"], [heart(12, 12.3, 0.4)]),
    app("photo-app", ["photos", "gallery", "pictures"], ["m7 16 3.5-4 2.5 3 1.5-1.5L17 16", circle(15, 9, 1.25)]),
    app("shorts-app", ["short video", "vertical", "clips"], [rect(8.5, 6, 7, 12, 1.5), "M11 10.5v3l2.5-1.5z"]),
    app("forum-app", ["community", "threads", "posts"], ["M7 8h10v6h-5l-3 2.5V14H7z"]),
    app("community-app", ["group", "friends", "members"], [circle(10, 10, 2), "M6.5 17a3.5 3.5 0 0 1 7 0", circle(15, 10.5, 1.5), "M15 14a3 3 0 0 1 3 3"]),
    app("chat-app", ["messenger", "messages", "dm"], ["M12 6.5c3.3 0 6 2.2 6 5s-2.7 5-6 5c-.8 0-1.6-.1-2.3-.4L6.5 17l.8-2.6A4.6 4.6 0 0 1 6 11.5c0-2.8 2.7-5 6-5z"]),
    app("meeting-app", ["video call", "conference", "meet"], [rect(6, 9, 8, 6, 1.5), "M14 11.2l4-2v5.6l-4-2"]),
    app("movie-app", ["films", "series", "cinema"], [rect(7, 6, 10, 12, 1), "M10 6v12", "M14 6v12"]),
    app("workspace-app", ["team chat", "channels", "work"], ["M8 10h8.5", "M7.5 14H16", "M11 7l-1 10", "M14.5 7l-1 10"]),
    app("design-app", ["design", "shapes", "prototype"], [circle(9, 9, 2.2), rect(12.8, 12.8, 4.4, 4.4, 0.5), polygon([15, 6.5], [17.3, 10.5], [12.7, 10.5]), "M6.8 17.2 9 13l2.2 4.2z"]),
    app("video-editor", ["edit video", "timeline", "cut"], ["M7 9h6", "M10 12h7", "M7 15h5", "M15 7v10"]),
    app("audio-editor", ["edit audio", "recording", "daw"], ["M7.5 11v2", "M10 9v6", "M12.5 7v10", "M15 9.5v5", "M17 11v2"]),
    app("game-launcher", ["game library", "launcher", "pc games"], ["M8 10h8a2.5 2.5 0 0 1 2.4 3.1l-.6 2.3a1.5 1.5 0 0 1-2.6.6L14 14.5h-4l-1.2 1.5a1.5 1.5 0 0 1-2.6-.6l-.6-2.3A2.5 2.5 0 0 1 8 10z"]),
    app("store-app", ["shop", "app store", "buy"], ["M7.5 9.5h9l-.8 8h-7.4z", "M10 9.5V8a2 2 0 0 1 4 0v1.5"]),
    app("notes-app", ["notes", "notebook", "docs"], ["M8 8h6", "M8 11h8", "M8 14h4", "M14 17l3.5-3.5"]),
    app("maps-app", ["maps", "navigation", "places"], ["M12 17s-4-3.3-4-6.5a4 4 0 0 1 8 0c0 3.2-4 6.5-4 6.5z", circle(12, 10.5, 1.3)]),
    app("weather-app", ["forecast", "weather", "sun"], [circle(12, 12, 2.5), "M12 6.5v1", "M12 16.5v1", "M6.5 12h1", "M16.5 12h1", "M8.1 8.1l.7.7", "M15.2 15.2l.7.7", "M8.1 15.9l.7-.7", "M15.2 8.8l.7-.7"]),
    app("calendar-app", ["calendar", "events", "schedule"], ["M3 8.5h18", dot(8.5, 12.5), dot(12, 12.5), dot(15.5, 12.5), dot(8.5, 16), dot(12, 16)]),
    app("settings-app", ["settings", "system", "preferences"], [gear(12, 12, 5.5, 4.2), circle(12, 12, 1.5)]),
    app("payments-app", ["pay", "wallet", "checkout"], [rect(6, 8, 12, 8, 1.5), "M6 11h12", "M8.5 14h2.5"]),
    app("mail-app", ["email", "inbox", "messages"], [rect(6, 8, 12, 8, 1.5), "m6.5 8.5 5.5 4 5.5-4"]),
    icon("browser", ["web", "internet", "window"], [rect(2, 4, 20, 16, 2)], ["M2 9h20", dot(5, 6.5), dot(7.5, 6.5), dot(10, 6.5)]),
    icon("terminal", ["console", "shell", "command line"], [rect(2, 4, 20, 16, 2)], ["m6 9 3 3-3 3", "M12 15h6"]),
    icon("code", ["developer", "brackets", "html"], [], ["m8 7-5 5 5 5", "m16 7 5 5-5 5", "M14 4l-4 16"]),
    icon("folder", ["directory", "files"], folder),
    icon("folder-plus", ["new folder", "add folder"], folder, ["M12 10.5v6", "M9 13.5h6"]),
    icon("file", ["page", "blank"], page, ["M14 2v6h6"]),
    icon("document", ["text file", "doc", "report"], page, ["M14 2v6h6", "M8 13h8", "M8 17h5"]),
    icon("spreadsheet", ["table", "sheet", "cells"], [rect(3, 3, 18, 18, 2)], ["M3 9h18", "M3 15h18", "M9 9v12"]),
    icon("presentation", ["slides", "board", "talk"], [rect(2, 3, 20, 13, 1.5)], ["M12 16v3", "M8 21l4-2 4 2", "M6 12l3.5-3.5 3 2.5 5-4"]),
    icon("database", ["data", "storage", "sql"], ["M4 5.5a8 3 0 1 0 16 0a8 3 0 1 0-16 0z"], ["M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13", "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"]),
    icon("git-branch", ["git", "branch", "version control"], [circle(6, 5, 2), circle(6, 19, 2), circle(18, 7, 2)], ["M6 7v10", "M18 9v1a4 4 0 0 1-4 4H9a3 3 0 0 0-3 3"]),
    icon("calculator", ["math", "numbers", "sum"], [rect(4, 2, 16, 20, 2)], [rect(7, 5, 10, 4, 1), dot(8, 13), dot(12, 13), dot(16, 13), dot(8, 17), dot(12, 17), dot(16, 17)]),
    icon("mail", ["email", "envelope", "letter"], [rect(2, 4, 20, 16, 2)], ["m3 6 9 7 9-7"]),
  ],
};
