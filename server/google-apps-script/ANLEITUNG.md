# Số đơn hàng chạy theo ngày + bảng đơn hàng (Google Sheet)

Sau khi cài xong:
- Mỗi đơn đặt trên web nhận **số chạy tăng dần trong ngày**: 500, 501, 502…
- **Sang ngày mới tự bắt đầu lại từ 500** (theo giờ Đức), không cần reset.
- Mỗi đơn tự ghi thành **một dòng trong Google Sheet**, đơn mới nhất ở trên cùng.

Thời gian cài: khoảng 5–10 phút. Dùng **tài khoản Google của quán**.

---

## Bước 1 – Mở bảng (đã tạo sẵn)

Bảng **Maiwok Bestellungen** đã được tạo sẵn trong Google Drive của dothanhdatdo@gmail.com:
https://docs.google.com/spreadsheets/d/1xo-fpdMCVju7R04-eSPvpmxjCVEyjXjgf1vmH9K4o9A/edit

(Nếu muốn tự tạo bảng mới: mở https://sheets.new, đặt tên tuỳ ý. Code tự tạo tab "Bestellungen".)

## Bước 2 – Dán code

1. Trong bảng, chọn menu **Erweiterungen → Apps Script** (tiếng Anh: Extensions → Apps Script).
2. Xoá hết nội dung có sẵn trong file `Code.gs`.
3. Mở link sau, bấm **Strg+A** (chọn hết) rồi **Strg+C** (copy):
   https://raw.githubusercontent.com/dothanhdatdo/maiwokzo/master/server/google-apps-script/Code.gs
4. Quay lại Apps Script, dán bằng **Strg+V**, bấm biểu tượng **Speichern** (đĩa mềm).

## Bước 3 – Đưa lên mạng (Bereitstellen)

1. Bấm nút xanh **Bereitstellen → Neue Bereitstellung** (Deploy → New deployment).
2. Bấm biểu tượng bánh răng cạnh "Typ auswählen" → chọn **Web-App**.
3. Điền:
   - **Ausführen als:** *Ich* (tài khoản của quán)
   - **Zugriff:** *Jeder* (Anyone) – để web của quán gửi đơn tới được
4. Bấm **Bereitstellen**.
5. Google hỏi quyền truy cập → **Zugriff autorisieren** → chọn tài khoản quán.
   - Nếu hiện "Google hat diese App nicht überprüft": bấm **Erweitert** → **Zu … wechseln (unsicher)** → **Zulassen**.
     (Đây là code của chính quán nên Google chưa "kiểm duyệt", hoàn toàn bình thường.)
6. Copy đường link **Web-App-URL** (dạng `https://script.google.com/macros/s/…/exec`).

## Bước 4 – Kiểm tra

Dán link vừa copy vào trình duyệt. Nếu thấy dòng giống như:

```
{"ok":true,"date":"2026-10-06","next":500}
```

là máy chủ đã chạy.

## Bước 5 – Gửi link cho Claude

Gửi link `…/exec` đó trong chat. Claude sẽ điền vào dòng `ORDER_ENDPOINT` ở đầu file `script.js`, test và đưa lên web.

---

## Hỏi đáp

**Đơn hàng nằm ở đâu?** Trong tab **Bestellungen** của bảng: ngày, giờ nhận, số đơn, tên, điện thoại, e-mail, giờ lấy, món, tổng tiền, thanh toán, ghi chú. Mở bằng app Google Sheets trên điện thoại là xem được.

**Muốn bắt đầu từ số khác (ví dụ 1)?** Trong Apps Script sửa dòng `const START_NUMBER = 500;`, lưu, rồi làm mục "Sửa code về sau" bên dưới.

**Sửa code về sau** (link vẫn giữ nguyên): **Bereitstellen → Bereitstellungen verwalten** → bút chì **Bearbeiten** → **Version: Neue Version** → **Bereitstellen**.

**Nếu Google không trả lời** (mất mạng, lỗi): khách vẫn đặt được, web tạm cấp số **900–999** để nhân viên biết đơn đó không có trong bảng.

**Bảo mật / Datenschutz:** bảng chứa tên, số điện thoại, e-mail của khách. Chỉ chia sẻ bảng cho nhân viên cần thiết. Trang Datenschutzerklärung của web cần ghi rằng dữ liệu đặt món được lưu trong Google (Google Ireland Ltd.).
