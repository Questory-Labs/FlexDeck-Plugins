import { circle, dot, ellipse, heart, icon, rect, star } from "./shapes.mjs";

const dollar = ["M14.5 9.5a2.5 2 0 0 0-2.5-1.5c-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2a2.5 2 0 0 1-2.5-1.5", "M12 6.5V8", "M12 16v1.5"];
const sheet = ["M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"];

export default {
  name: "Money & work",
  icons: [
    icon("coin", ["money", "currency", "dollar", "bits"], [circle(12, 12, 9)], dollar),
    icon("coins", ["money", "savings", "change"], [ellipse(9, 6, 6, 2.5), circle(16, 15.5, 5.5)], ["M3 6v8c0 1.4 2.7 2.5 6 2.5", "M3 10c0 1.4 2.7 2.5 6 2.5"]),
    icon("banknote", ["cash", "money", "bill"], [rect(2, 6, 20, 12, 2)], [circle(12, 12, 2.5), dot(6, 12), dot(18, 12)]),
    icon("wallet", ["money", "purse", "balance"], [rect(2, 6, 19, 14, 2.5)], ["M21 10.5h-4a2 2 0 0 0 0 4h4", dot(17, 12.5), "M5 6l9.5-3 1.5 3"]),
    icon("credit-card", ["card", "payment", "debit"], [rect(2, 5, 20, 14, 2)], ["M2 10h20", "M6 15h4"]),
    icon("bank", ["finance", "institution", "building"], ["M3 9h18L12 3z", rect(3, 19, 18, 2, 0.5)], ["M6 12v5", "M10 12v5", "M14 12v5", "M18 12v5"]),
    icon("piggy-bank", ["savings", "save money", "budget"], [ellipse(12, 12.5, 8, 6)], ["M10 9h4", dot(16, 11), "M20 11h1.5v3H20", "M8 18v3", "M16 18v3", "M8 7.5 7.5 4l3 2.5", "M4 12H2.5"]),
    icon("receipt", ["invoice", "bill", "purchase"], ["M5 2h14v20l-2.5-1.5L14 22l-2-1.5-2 1.5-2.5-1.5L5 22z"], ["M8 7h8", "M8 11h8", "M8 15h5"]),
    icon("pie-chart", ["share", "analytics", "breakdown"], ["M13.5 2.5v8h8a8 8 0 0 0-8-8z"], ["M11 5a8.5 8.5 0 1 0 8.5 8.5H11z"]),
    icon("bar-chart", ["analytics", "stats", "growth"], [rect(3, 12, 4, 9, 1), rect(10, 7, 4, 14, 1), rect(17, 3, 4, 18, 1)]),
    icon("candles", ["stocks", "trading", "market"], [rect(4, 7, 4, 8, 1), rect(10, 9, 4, 6, 1), rect(16, 5, 4, 10, 1)], ["M6 3v4", "M6 15v6", "M12 5v4", "M12 15v4", "M18 2v3", "M18 15v7"]),
    icon("briefcase", ["work", "job", "business"], [rect(2, 7, 20, 14, 2)], ["M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M2 13h20"]),
    icon("building", ["office", "company", "city"], [rect(4, 2, 16, 20, 1.5)], ["M9 6h1", "M14 6h1", "M9 10h1", "M14 10h1", "M9 14h1", "M14 14h1", "M10 22v-4h4v4"]),
    icon("store", ["shop", "market", "retail"], ["M3 9 4.5 3h15L21 9z", rect(4, 9, 16, 12, 1)], ["M3 9h18", "M10 21v-6h4v6"]),
    icon("shopping-cart", ["cart", "buy", "checkout"], [circle(9, 19.5, 1.5), circle(17, 19.5, 1.5)], ["M2 3h3l2.5 12h11L21 6H6.2"]),
    icon("shopping-bag", ["bag", "purchase", "shop"], ["M5 7h14l-1 14H6z"], ["M9 10V6a3 3 0 0 1 6 0v4"]),
    icon("tag", ["price", "label", "sale"], ["M3 3h8l10 10-8 8L3 11z"], [dot(7.5, 7.5)]),
    icon("percent", ["discount", "sale", "rate"], [], ["M19 5 5 19", circle(7, 7, 2.5), circle(17, 17, 2.5)]),
    icon("safe", ["vault", "secure", "lockbox"], [rect(3, 3, 18, 17, 2)], [circle(12, 11.5, 3.5), "M12 8v1", "M12 14v1", "M6 20v2", "M18 20v2"]),
    icon("donate", ["donation", "charity", "support", "tip"], [heart(14, 7, 0.42)], ["M2 14h3.5l5 1.5h3.5a1.5 1.5 0 0 1 0 3H10", "M14 18.5l5.5-1.8a1.5 1.5 0 0 1 1.2 2.7L14 22H5.5L2 20.5"]),
    icon("tip-jar", ["tips", "donations", "jar"], ["M7 6h10v2a3 3 0 0 1 2 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-8a3 3 0 0 1 2-3z"], ["M8 3h8v3H8z", "M9 14h6"]),
    icon("token", ["crypto", "coin", "web3"], [star(12, 12, 10, 10, 3, -90)], ["M8 12h8", "M12 8v8"]),
    icon("currency-exchange", ["exchange", "convert", "forex"], [], [circle(7, 7, 4), circle(17, 17, 4), "M14 4h3a3 3 0 0 1 3 3v2", "m22 7-2 2-2-2", "M10 20H7a3 3 0 0 1-3-3v-2", "m2 17 2-2 2 2"]),
    icon("ticket", ["event", "admission", "pass"], ["M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z"], ["M15 5v2", "M15 11v2", "M15 17v2"]),
    icon("contract", ["agreement", "signature", "sign"], sheet, ["M8 7h8", "M8 11h5", "M7 17c1.5-2 3-2.5 3.5-1s1.5 1.5 3 0 2.5-.5 3.5.5"]),
    icon("balance", ["scale", "law", "justice", "compare"], [], ["M12 3v18", "M7 21h10", "M4 7h16", "M4 7 1 13a3 3 0 0 0 6 0z", "M20 7l-3 6a3 3 0 0 0 6 0z"]),
    icon("barcode", ["scan", "product", "sku"], [], ["M3 5v14", "M6 5v14", "M9 5v14", "M11 5v14", "M14 5v14", "M17 5v14", "M19 5v14", "M21 5v14"]),
    icon("qr-code", ["scan", "code", "link"], [rect(3, 3, 7, 7, 1), rect(14, 3, 7, 7, 1), rect(3, 14, 7, 7, 1), rect(14, 14, 3, 3, 0.5), rect(18, 18, 3, 3, 0.5)], [dot(6.5, 6.5), dot(17.5, 6.5), dot(6.5, 17.5)]),
    icon("gold", ["bars", "bullion", "wealth"], ["M2 20l1.5-5H10l1.5 5z", "M12.5 20l1.5-5h6.5l1.5 5z", "M7 13.5l1.5-5h7l1.5 5z"]),
    icon("money-bag", ["riches", "funds", "loot"], ["M9 3h6l-1.5 3.5c4 1.5 7 5 7 9.5 0 3.5-2.5 5-6 5H9.5c-3.5 0-6-1.5-6-5 0-4.5 3-8 7-9.5z"], ["M10.5 6.5h3", "M14 11.5a2 1.6 0 0 0-2-1c-1.2 0-2 .6-2 1.5s.8 1.3 2 1.5 2 .6 2 1.5-.8 1.5-2 1.5a2 1.6 0 0 1-2-1", "M12 9v1", "M12 16.5v1"]),
    icon("certificate", ["award", "diploma", "license"], [rect(2, 3, 20, 13, 2), circle(17, 16.5, 3)], ["M6 7h8", "M6 10h5", "M15.5 19.2 15 23l2-1 2 1-.5-3.8"]),
  ],
};
