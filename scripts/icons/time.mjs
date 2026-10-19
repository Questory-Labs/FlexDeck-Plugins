import { circle, dot, icon, rect, slash, star } from "./shapes.mjs";

const face = [circle(12, 12, 10)];
const hands = "M12 7v5l3 2";
const calendar = [rect(3, 4, 18, 18, 2)];
const sheet = ["M3 10h18", "M8 2v4", "M16 2v4"];

export default {
  name: "Time",
  icons: [
    icon("clock", ["time", "hour", "watch"], face, [hands]),
    icon("clock-off", ["no time", "paused", "stopped"], face, [hands, slash]),
    icon("alarm", ["wake", "alarm clock", "reminder"], [circle(12, 13, 8)], ["M12 9v4l2.5 1.5", "M3 5.5 5.5 3", "M21 5.5 18.5 3", "M6 19.5 4.5 21", "M18 19.5l1.5 1.5"]),
    icon("stopwatch", ["lap", "timer", "speedrun"], [circle(12, 13.5, 8)], ["M12 9.5v4", "M10 2h4", "M12 2v3.5", "M19 6.5l1.5-1.5"]),
    icon("timer", ["countdown", "duration"], [], ["M12 2.5a9.5 9.5 0 1 1-6.7 2.8", "M12 2.5V6", "M12 12 7.5 7.5"]),
    icon("hourglass", ["wait", "sand", "loading"], ["M6 2h12v3.5a6 6 0 0 1-3 5.2L13.5 12l1.5 1.3a6 6 0 0 1 3 5.2V22H6v-3.5a6 6 0 0 1 3-5.2L10.5 12 9 10.7a6 6 0 0 1-3-5.2z"], ["M5 2h14", "M5 22h14"]),
    icon("calendar", ["date", "day", "month"], calendar, sheet),
    icon("calendar-check", ["scheduled", "booked", "done"], calendar, [...sheet, "m9 15.5 2 2 4-4"]),
    icon("calendar-plus", ["add event", "schedule"], calendar, [...sheet, "M12 13v6", "M9 16h6"]),
    icon("calendar-x", ["cancel event", "unavailable"], calendar, [...sheet, "m10 14 4 4", "m14 14-4 4"]),
    icon("calendar-days", ["week", "month view", "agenda"], calendar, [...sheet, dot(8, 14), dot(12, 14), dot(16, 14), dot(8, 18), dot(12, 18)]),
    icon("calendar-star", ["event", "special day", "highlight"], calendar, [...sheet, star(12, 16.3, 3.2, 1.4)]),
    icon("history", ["recent", "past", "log"], [], ["M3 12a9 9 0 1 0 2.6-6.4L3 8", "M3 3v5h5", hands]),
    icon("watch", ["wristwatch", "smartwatch", "time"], [rect(6, 6, 12, 12, 3)], ["M9 6l.5-4h5l.5 4", "M9 18l.5 4h5l.5-4", "M12 9.5V12l1.5 1"]),
    icon("snooze", ["sleep", "later", "remind"], [circle(12, 13, 8)], ["M9.5 10.5h5l-5 5h5", "M3 5.5 5.5 3", "M21 5.5 18.5 3"]),
    icon("timeline", ["steps", "progress", "history"], [circle(5, 12, 2), circle(12, 12, 2), circle(19, 12, 2)], ["M7 12h3", "M14 12h3"]),
    icon("pomodoro", ["focus", "tomato", "work timer"], [circle(12, 13.5, 8.5)], ["M12 5V2.5", "M9 4.5c1 1.5 5 1.5 6 0", "M12 10v3.5l2 1.5"]),
    icon("clock-fast", ["quick", "speed", "rush"], [circle(14, 12, 8)], ["M14 8v4l2.5 1.5", "M2 8h3", "M1 12h3", "M2 16h3"]),
  ],
};
