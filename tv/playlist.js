// Nội dung cho từng tivi. Mở trang: tv/?tv=1 (2, 3, 4)
// Nguồn: Canva "zo- übersicht (A4 (Querformat))" — trang 1–4 = tivi 1–4,
// trang 5–6 là chế độ buổi tối của tivi 1.
//
// type:    "image" hoặc "video"
// seconds: thời gian hiển thị (ảnh mặc định 15s; video mặc định chạy hết rồi chuyển)
// when:    danh sách khung giờ được chiếu. Mỗi khung: days (0 = Chủ nhật, 1 = Thứ 2 … 6 = Thứ 7),
//          from/to "HH:MM" theo giờ của máy phát. Ngoài mọi khung giờ: màn hình đen.
// Một mục duy nhất thì hiển thị/lặp mãi.

var T2_T6 = [1, 2, 3, 4, 5];
var T7 = [6];

// Thứ 2–6: buổi trưa 11:00–16:45 (tivi 3, 4 đến 17:00), buổi tối 16:45–21:30.
// Thứ 7: chỉ chế độ buổi tối, 11:00–21:30. Chủ nhật: đóng cửa, tất cả tắt.
var TRUA = [{ days: T2_T6, from: "11:00", to: "16:45" }];
var TRUA_TV34 = [{ days: T2_T6, from: "11:00", to: "17:00" }];
var TOI = [
  { days: T2_T6, from: "16:45", to: "21:30" },
  { days: T7, from: "11:00", to: "21:30" }
];
var CA_NGAY = [{ days: T2_T6.concat(T7), from: "11:00", to: "21:30" }];

window.TV_PLAYLISTS = {
  1: [
    { type: "image", src: "media/tv1.png", when: TRUA },
    { type: "video", src: "media/tv1-toi-1.mp4", when: TOI },
    { type: "video", src: "media/tv1-toi-2.mp4", when: TOI }
  ],
  2: [{ type: "video", src: "media/tv2.mp4", when: CA_NGAY }],
  3: [{ type: "video", src: "media/tv3.mp4", when: TRUA_TV34 }],
  4: [{ type: "image", src: "media/tv4.png", when: TRUA_TV34 }]
};
