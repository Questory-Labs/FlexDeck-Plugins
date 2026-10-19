import { arc, circle, icon, rect } from "./shapes.mjs";

const n = (value) => Math.round(value * 1000) / 1000;

const point = (x, y, s = 1) => {
  const k = (value) => n(value * s);
  const knuckle = `a${k(1.5)} ${k(1.5)} 0 0 1 ${k(3)} 0`;
  return {
    body: [`M${x} ${y}v${k(-11)}${knuckle}v${k(5)}${knuckle}v${k(1)}${knuckle}v${k(1)}${knuckle}v${k(4.5)}a${k(6)} ${k(6)} 0 0 1 ${k(-6)} ${k(6)}h${k(-2)}a${k(6)} ${k(6)} 0 0 1 ${k(-4.6)} ${k(-2.2)}l${k(-3)} ${k(-3.8)}a${k(1.7)} ${k(1.7)} 0 0 1 ${k(2.5)} ${k(-2)}z`],
    detail: [`M${n(x + 3 * s)} ${n(y - 6 * s)}v${k(2.5)}`, `M${n(x + 6 * s)} ${n(y - 5 * s)}v${k(2)}`, `M${n(x + 9 * s)} ${n(y - 4 * s)}v${k(1.5)}`],
  };
};

const gesture = (name, tags, hand, extra = []) => icon(name, tags, hand.body, [...hand.detail, ...extra]);
const tapHand = point(8, 16.8, 0.8);
const sideHand = point(10, 16.8, 0.8);
const lowHand = point(11, 16.8, 0.8);
const palm = "M7 14V6a1.5 1.5 0 0 1 3 0V4.5a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0v2a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7l-2.6-3.7a1.6 1.6 0 0 1 2.6-1.9z";
const fingers = ["M10 6v5", "M13 5.5v5.5", "M16 7.5v4"];

export default {
  name: "Touch & gestures",
  icons: [
    gesture("point", ["finger", "touch", "select"], point(8, 15.5)),
    gesture("tap", ["touch", "press", "click"], tapHand, [arc(9.2, 8.2, 3.5, 200, 340)]),
    gesture("double-tap", ["touch twice", "double click"], tapHand, [arc(9.2, 8.2, 3.5, 200, 340), arc(9.2, 8.2, 6, 205, 335)]),
    gesture("long-press", ["hold", "press and hold"], tapHand, [circle(9.2, 7.6, 4)]),
    gesture("swipe-left", ["slide", "previous page"], sideHand, ["M18 4H5", "m8 1-3 3 3 3"]),
    gesture("swipe-right", ["slide", "next page"], sideHand, ["M5 4h13", "m15 1 3 3-3 3"]),
    gesture("swipe-up", ["scroll up", "slide up"], lowHand, ["M4 15V4", "m1 7 3-3 3 3"]),
    gesture("swipe-down", ["scroll down", "pull"], lowHand, ["M4 4v11", "m1 12 3 3 3-3"]),
    gesture("drag", ["move", "hold and move"], sideHand, ["M3 3h4", "M3 3v4", "M3 3l4.5 4.5"]),
    gesture("rotate-gesture", ["twist", "turn"], tapHand, ["M15 4.5a6 6 0 0 1 5 5", "m20.5 6.5-.5 3-3-.5"]),
    icon("pinch", ["zoom out", "squeeze"], [], ["m4 4 5 5", "M9 5v4H5", "m20 20-5-5", "M15 19v-4h4"]),
    icon("spread", ["zoom in", "expand"], [], ["m9 9-5-5", "M4 8V4h4", "m15 15 5 5", "M20 16v4h-4"]),
    icon("hand", ["palm", "stop", "high five", "raise hand"], [palm], fingers),
    icon("wave", ["hello", "hi", "greeting"], [palm], [...fingers, "M2.5 9.5a6 6 0 0 1 1.5-4.5", "M20.5 2.5a4 4 0 0 1 1.5 3"]),
    icon("grab", ["fist", "hold", "grip"], ["M6 10a2 2 0 0 1 2-2h9a3 3 0 0 1 3 3v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6z"], ["M9.5 8v4", "M13 8v4", "M16.5 8v4", "M6 14h4.5a1.5 1.5 0 0 0 0-3H6"]),
    icon("thumbs-up", ["like", "approve", "good"], ["M7.5 10l3.5-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.3 7.5a2.5 2.5 0 0 1-2.5 2.2H7.5z", rect(2, 10, 3.5, 12, 1)]),
    icon("thumbs-down", ["dislike", "reject", "bad"], ["M7.5 14l3.5 7a2 2 0 0 0 3-2l-1-5h6a2 2 0 0 0 2-2.3l-1.3-7.5A2.5 2.5 0 0 0 17.2 2H7.5z", rect(2, 2, 3.5, 12, 1)]),
    icon("click", ["mouse click", "press", "select"], ["M8 8l12 5-5 1.5L13.5 20z"], ["M7 2.5V5", "M2.5 7H5", "M3.5 3.5l1.8 1.8", "M10.5 3.5 9.2 5.3"]),
    icon("scroll", ["mouse wheel", "scroll down"], [rect(7, 3, 10, 18, 5)], ["M12 7v3", "m10 14 2 2 2-2"]),
  ],
};
