import { circle, gear, heart, icon, rect, star } from "./shapes.mjs";

const user = [circle(12, 7.5, 4), "M4 21a8 8 0 0 1 16 0z"];
const small = [circle(9, 7.5, 4), "M2 21a7 7 0 0 1 14 0z"];

export default {
  name: "People",
  icons: [
    icon("user", ["person", "profile", "account"], user),
    icon("user-plus", ["add user", "invite", "follow"], small, ["M19 8v6", "M16 11h6"]),
    icon("user-minus", ["remove user", "unfollow"], small, ["M16 11h6"]),
    icon("user-check", ["verified user", "approved", "member"], small, ["m16 11 2 2 4-4"]),
    icon("user-x", ["remove", "block", "kick"], small, ["m17 8.5 4 4", "m21 8.5-4 4"]),
    icon("user-circle", ["avatar", "profile", "account"], [circle(12, 12, 10)], [circle(12, 10, 3.5), "M6.5 18.5a6.5 6.5 0 0 1 11 0"]),
    icon("user-square", ["avatar", "portrait", "contact"], [rect(3, 3, 18, 18, 3)], [circle(12, 10, 3), "M7 21v-1a5 5 0 0 1 10 0v1"]),
    icon("users", ["people", "group", "friends"], [circle(9, 7.5, 3.5), "M2.5 20a6.5 6.5 0 0 1 13 0z"], ["M16 4a3.5 3.5 0 0 1 0 7", "M18 13.5a6.5 6.5 0 0 1 3.5 5.8V20"]),
    icon("team", ["group", "squad", "crew"], [circle(12, 7, 3), "M6.5 19a5.5 5.5 0 0 1 11 0z"], [circle(5.5, 9.5, 2), circle(18.5, 9.5, 2), "M2 18a3.5 3.5 0 0 1 3.5-3.5", "M22 18a3.5 3.5 0 0 0-3.5-3.5"]),
    icon("host", ["owner", "crown", "streamer", "admin"], [circle(12, 10, 3.5), "M5 22a7 7 0 0 1 14 0z"], ["M8.5 5 8 2l2.2 1.5L12 1.5l1.8 2L16 2l-.5 3z"]),
    icon("moderator", ["mod", "shield", "admin"], small, ["M18.5 10l-3.5 1.3v2.4c0 2.2 1.5 3.6 3.5 4.3 2-.7 3.5-2.1 3.5-4.3v-2.4z"]),
    icon("follower", ["follow", "fan", "heart"], small, [heart(18.5, 11, 0.28)]),
    icon("subscriber", ["sub", "member", "star"], small, [star(18.5, 11.3, 3.5, 1.5)]),
    icon("user-search", ["find user", "lookup"], small, [circle(18, 12, 2.5), "m20 14 2 2"]),
    icon("user-lock", ["private", "account security"], small, [rect(15, 11, 6, 5, 1), "M16.5 11V9.5a1.5 1.5 0 0 1 3 0V11"]),
    icon("user-ban", ["ban", "banned", "blocked"], small, [circle(18.5, 12, 3), "m16.4 9.9 4.2 4.2"]),
    icon("user-cog", ["account settings", "manage user"], small, [gear(18.5, 12, 3.5, 2.6, 6)]),
    icon("streamer", ["creator", "gamer", "headset"], [circle(12, 9, 3), "M4 22a8 8 0 0 1 16 0z", rect(5, 8.5, 2, 4, 1), rect(17, 8.5, 2, 4, 1)], ["M6 9.5a6 6 0 0 1 12 0"]),
    icon("crowd", ["audience", "viewers", "people"], [circle(6, 8, 2.5), circle(12, 8, 2.5), circle(18, 8, 2.5)], ["M2 17a4 4 0 0 1 8 0", "M8 17a4 4 0 0 1 8 0", "M14 17a4 4 0 0 1 8 0", "M2 20h20"]),
    icon("id-card", ["identity", "badge", "profile card"], [rect(2, 5, 20, 14, 2)], [circle(8, 11, 2), "M5 16a3 3 0 0 1 6 0", "M14 10h5", "M14 14h3"]),
    icon("contact-book", ["contacts", "address book", "phonebook"], [rect(5, 2, 15, 20, 2)], ["M3 7h3", "M3 12h3", "M3 17h3", circle(12.5, 10, 2.5), "M8.5 17a4 4 0 0 1 8 0"]),
    icon("person", ["human", "stick figure", "standing"], [circle(12, 4, 2)], ["M12 7v7", "M8 22l4-8 4 8", "M6 10h12"]),
    icon("accessibility", ["a11y", "universal access"], [circle(12, 4.5, 2)], ["M5 8.5l7 1.5 7-1.5", "M12 10v4l-3 7", "M12 14l3 7"]),
  ],
};
