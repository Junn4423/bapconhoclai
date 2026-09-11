# Bắp con học lái

Webapp Next.js thuần frontend dành cho Bắp iu luyện bộ 600 câu hỏi sát hạch lái xe hạng B.

## Chạy local

```bash
npm i
npm run dev
```

Mở `http://localhost:3000`.

## Có sẵn trong app

- 600 câu hỏi được trích từ PDF nguồn; đáp án đúng được đọc từ nét gạch chân trong PDF.
- Parser xử lý cả đáp án xếp ngang/hai cột, kiểm tra số lựa chọn liên tục với 2–4 lựa chọn và loại heading chương bị dính vào đáp án.
- 321 ảnh nhúng đã được tách vào `public/source-images`, trong đó 318 câu có ảnh liên kết.
- Luyện nhanh 30 câu theo sáu nhóm nội dung, 30 giây/câu, đồng hồ analog và tự chuyển khi hết giờ.
- Thi thử tự sinh 30 câu, có câu liệt và điều kiện đạt 27/30.
- Luyện trọn bộ 600 câu không giới hạn thời gian, có bản đồ câu và flashback.
- 20 bộ ôn cố định; tổng 20 bộ phủ đủ 600 câu, học lại không đổi câu.
- Tiến độ, điểm cao nhất và trạng thái âm thanh lưu trong `localStorage`.
- Chime Web Audio nguyên bản, ngắn và âm lượng nhỏ cho thao tác, đúng/sai, hết giờ và hoàn thành.
- Giao diện bo tròn, pastel, responsive cho điện thoại; icon giao diện dùng `lucide-react`.

## Nguồn hình decor và sound design

Ảnh mèo và góc học decor được lấy từ các trang ảnh Unsplash sau, sau đó lưu cục bộ trong `public/decor` để ZIP tự chạy ổn định:

- [A grey british shorthair cat with yellow eyes - Unsplash](https://unsplash.com/photos/a-grey-british-shorthair-cat-with-yellow-eyes-4CobUydhnZ8)
- [White cat against pink wall - Unsplash](https://unsplash.com/photos/white-cat-against-pink-wall-vfa_dXe3S3Y)
- [Mint and blue stationery and office supplies flat lay - Unsplash](https://unsplash.com/photos/mint-and-blue-stationery-and-office-supplies-flat-lay-jnzbRcYUdd0)

Phần sound design được tham khảo các bộ notification/correct-answer miễn phí để chọn hướng âm thanh ngắn, sáng và không gây giật mình:

- [Mixkit free notification sound effects](https://mixkit.co/free-sound-effects/notification/)
- [Pixabay correct-answer sound effects](https://pixabay.com/sound-effects/search/answer/)

App dùng các âm chime tự tạo bằng Web Audio API thay cho việc nhúng sample bên thứ ba, nên ZIP không phụ thuộc audio CDN và không phát âm thanh khi chưa có thao tác của em.

## Trích xuất lại dữ liệu từ PDF

Script build-time nằm ở `scripts/extract_pdf.py`. Ví dụ:

```bash
pdfimages -j source.pdf public/source-images/source
python3 scripts/extract_pdf.py \
  --pdf source.pdf \
  --image-dir public/source-images \
  --image-prefix source \
  --out data/questions.json
```

App không cần Python hay PDF parser khi chạy production; dữ liệu đã được đóng gói tĩnh trong source.

## Lưu ý triển khai

Đây là app frontend tĩnh, không có API và không có database. Có thể deploy trực tiếp lên Vercel bằng preset Next.js mặc định.
