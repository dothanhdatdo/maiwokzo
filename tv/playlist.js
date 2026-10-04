// Nội dung cho từng tivi. Mở trang: tv/?tv=1 (2, 3, 4)
// Nguồn: Canva "zo- übersicht (A4 (Querformat))" — trang 1–4 = tivi 1–4,
// trang 5–6 chiếu trên tivi 1 từ 16:45 đến hết ngày.
// Tivi 3 và 4 chỉ chiếu 11:00–17:00, ngoài giờ đó màn hình đen.
//
// type:    "image" hoặc "video"
// seconds: thời gian hiển thị (ảnh mặc định 15s; video mặc định chạy hết rồi chuyển)
// from/to: khung giờ "HH:MM" theo giờ của máy phát (bỏ trống = cả ngày)
// Một mục duy nhất thì hiển thị/lặp mãi.
window.TV_PLAYLISTS = {
  1: [
    { type: "image", src: "media/tv1.png", to: "16:45" },
    { type: "video", src: "media/tv1-toi-1.mp4", from: "16:45" },
    { type: "video", src: "media/tv1-toi-2.mp4", from: "16:45" }
  ],
  2: [{ type: "video", src: "media/tv2.mp4" }],
  3: [{ type: "video", src: "media/tv3.mp4", from: "11:00", to: "17:00" }],
  4: [{ type: "image", src: "media/tv4.png", from: "11:00", to: "17:00" }]
};
