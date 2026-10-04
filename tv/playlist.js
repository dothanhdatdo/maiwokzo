// Nội dung cho từng tivi. Mở trang: tv/?tv=1 (2, 3, 4, 5)
// Nguồn: Canva "zo- übersicht (A4 (Querformat))" — trang 1–3 = tivi 1–3, trang 4 = tivi 5,
// trang 5–6 là chế độ buổi tối của tivi 1.
// Tivi 4: Canva "box to go tv" (PDF, xuất ra PNG; tivi treo dọc nên nội dung đã xoay sẵn).
//
// type:    "image" hoặc "video"
// seconds: thời gian hiển thị (ảnh mặc định 15s; video mặc định chạy hết rồi chuyển)
// when:    danh sách khung giờ được chiếu. Mỗi khung: days (0 = Chủ nhật, 1 = Thứ 2 … 6 = Thứ 7)
//          hoặc date "YYYY-MM-DD" (một ngày cụ thể),
//          from/to "HH:MM" theo giờ của máy phát. Ngoài mọi khung giờ: màn hình đen.
// Một mục duy nhất thì hiển thị/lặp mãi.

var T2_T6 = [1, 2, 3, 4, 5];
var T7 = [6];

// Thứ 2–6: buổi trưa 11:00–16:45 (tivi 3, 5 đến 17:00), buổi tối 16:45–21:30.
// Thứ 7: chỉ chế độ buổi tối, 11:00–21:30. Chủ nhật: đóng cửa, tất cả tắt.
// Riêng ngày 05.10.2026: bật màn hình món từ 08:00 để thử (xóa dòng TEST sau ngày đó).
var TEST = { date: "2026-10-05", from: "08:00", to: "11:00" };
// Riêng ngày 04.10.2026 (Chủ nhật): bật cả 4 tivi cả ngày để thử.
var TEST_HOM_NAY = { date: "2026-10-04", from: "00:00", to: "24:00" };

var TRUA = [{ days: T2_T6, from: "11:00", to: "16:45" }, TEST, TEST_HOM_NAY];
var TRUA_TV35 = [{ days: T2_T6, from: "11:00", to: "17:00" }, TEST, TEST_HOM_NAY];
var TOI = [
  { days: T2_T6, from: "16:45", to: "21:30" },
  { days: T7, from: "11:00", to: "21:30" },
  TEST_HOM_NAY
];
// Tivi 4 (box to go): thứ 2–6, 10:50–16:45. Thứ 7, Chủ nhật tắt.
var BOX_TV4 = [{ days: T2_T6, from: "10:50", to: "16:45" }, TEST, TEST_HOM_NAY];
var CA_NGAY = [{ days: T2_T6.concat(T7), from: "11:00", to: "21:30" }, TEST, TEST_HOM_NAY];

window.TV_PLAYLISTS = {
  1: [
    { type: "video", src: "media/tv1.mp4", when: TRUA },
    { type: "video", src: "media/tv1-toi-1.mp4", when: TOI },
    { type: "video", src: "media/tv1-toi-2.mp4", when: TOI }
  ],
  2: [{ type: "video", src: "media/tv2.mp4", when: CA_NGAY }],
  3: [{ type: "video", src: "media/tv3.mp4", when: TRUA_TV35 }],
  4: [{ type: "image", src: "media/tv4.png", when: BOX_TV4 }],
  5: [{ type: "image", src: "media/tv5.png", when: TRUA_TV35 }]
};
