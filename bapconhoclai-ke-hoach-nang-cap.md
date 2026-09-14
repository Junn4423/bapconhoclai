# ĐẶC TẢ NÂNG CẤP WEBSITE “BẮP CON HỌC LÁI”

> Tài liệu giao cho AI Agent / Developer triển khai.
>
> **Phạm vi phiên bản này:** sửa toàn bộ logic học – thi – lưu tiến trình – nội dung giao diện – trải nghiệm người dùng và thêm khóa truy cập 6 số.
>
> **Chưa làm trong phiên bản này:** tính năng 120 câu mô phỏng/video mô phỏng.

---

## 1. Mục tiêu chung

Website hiện là web tĩnh, chỉ phục vụ **1 người dùng chính**. Giữ kiến trúc đơn giản, không dựng backend/database online ở giai đoạn này.

Mục tiêu nâng cấp:

- Lưu tiến trình học **thật theo từng câu 1–600**, không dùng số liệu ước lượng.
- Khi reload/trở lại website có thể tiếp tục bài đang học.
- Có danh sách câu hay sai, câu đã học, câu chưa học và tiến độ từng chương.
- Sửa các bug ở chế độ thi thử và luyện nhanh.
- Tách thống kê theo từng chế độ để không còn lỗi kiểu `55/30`.
- Có giải thích sau khi trả lời sai.
- Làm lại toàn bộ câu chữ đang quá “AI”, sáo rỗng hoặc thiếu cảm giác thân thương.
- Thêm màn hình nhập **PIN 6 số bắt buộc** trước khi vào website.
- Thiết bị đã nhập đúng PIN sẽ được ghi nhớ và không phải nhập lại.
- Vẫn deploy dạng static trên Vercel.

---

# 2. KHÓA TRUY CẬP 6 SỐ

## 2.1. Yêu cầu

Website phải có lớp khóa truy cập trước khi render nội dung chính.

PIN mặc định:

```text
221226
```

Yêu cầu:

- Bắt buộc nhập đủ **6 số**.
- Chỉ cho nhập ký tự `0–9`.
- Không hiển thị nội dung website phía sau trước khi xác thực.
- Nhập đúng → cho vào website.
- Thiết bị đã xác thực đúng → ghi nhớ trên thiết bị.
- Refresh/reopen browser vẫn vào được mà không cần nhập lại.
- Có nút `Khóa lại` hoặc `Đăng xuất thiết bị` trong phần cài đặt.
- Khi khóa lại, lần truy cập sau phải nhập PIN.
- Không reset progress khi chỉ khóa thiết bị.

## 2.2. Giao diện PIN

Thiết kế theo tone hiện tại của website nhưng **sạch, dễ thương, không game hóa quá mức**.

Gợi ý:

```text
┌─────────────────────────────────────┐
│              🐾                     │
│        Bắp con học lái              │
│                                     │
│   Nhập mã để vào góc học của Bắp    │
│                                     │
│    [ • ] [ • ] [ • ] [ • ] [ • ] [ • ]
│                                     │
│          [ Mở góc học ]             │
│                                     │
│      Bông đang đợi Bắp nè 🐾        │
└─────────────────────────────────────┘
```

Yêu cầu UX:

- 6 ô PIN riêng hoặc một input ẩn điều khiển 6 cell.
- Mobile bật numeric keyboard:

```html
inputmode="numeric"
```

- Tự chuyển focus sang ô kế tiếp.
- Backspace quay lại ô trước.
- Cho phép paste đủ 6 số.
- Bấm Enter khi đủ 6 số để submit.
- PIN sai:
  - rung/shake nhẹ modal;
  - viền báo lỗi;
  - text ngắn: `Chưa đúng rồi, thử lại nha.`
- Không dùng thông báo kiểu kỹ thuật như `Invalid password`.
- Sau khi đúng có animation nhẹ rồi mới mở trang.

## 2.3. Cách lưu thiết bị đã xác thực

Dùng `localStorage`.

Key đề xuất:

```text
bap_con_access_v1
```

Value:

```json
{
  "verified": true,
  "verifiedAt": "2026-09-11T04:30:00.000Z",
  "version": 1
}
```

Nếu tồn tại record hợp lệ:

```ts
verified === true
```

→ bỏ qua modal PIN.

Nút `Khóa lại`:

```ts
localStorage.removeItem("bap_con_access_v1");
```

sau đó đưa người dùng về màn hình PIN.

## 2.4. Không lưu PIN plaintext

Dù đây chỉ là web cá nhân, không nên viết logic:

```ts
if (pin === "221226")
```

ở nhiều nơi.

Có thể giữ **SHA-256 hash** của PIN trong frontend và hash giá trị người dùng nhập bằng Web Crypto API trước khi so sánh.

SHA-256 của PIN mặc định `221226`:

```text
de10d3e8e21f219aad010fccdc78d97249f0f3151dff1302ab36d162c8ebbf30
```

Lưu ý quan trọng:

> Đây chỉ là **client-side access gate**, không phải bảo mật thật. Vì website static và PIN chỉ có 6 số, người có kiến thức kỹ thuật vẫn có thể tìm ra mã từ source/browser. Mục tiêu của tính năng này là ngăn người khác vô tình vào trang, không thay thế authentication server-side.

---

# 3. LƯU TIẾN TRÌNH THẬT BẰNG LOCALSTORAGE

## 3.1. Không cần database online ở giai đoạn này

Website chỉ có 1 người dùng nên:

- không cần Supabase;
- không cần Firebase;
- không cần API riêng;
- không cần server database.

Dùng một object JSON duy nhất trong `localStorage`.

Key đề xuất:

```text
bap_con_progress_v2
```

---

## 3.2. Bỏ logic `remembered` cũ

Không tiếp tục dùng kiểu:

```ts
remembered: Math.min(
  600,
  stats.remembered + Math.round(score * 0.4)
)
```

Lý do:

- đây không phải số câu đã học thật;
- làm lại cùng một đề vẫn tiếp tục tăng;
- không biết câu nào đã học;
- không biết câu nào đang sai nhiều;
- không thể tạo chế độ ôn câu yếu.

### Yêu cầu

Xóa `remembered` khỏi logic progress mới.

---

# 4. CẤU TRÚC DỮ LIỆU PROGRESS MỚI

Dùng schema tương tự:

```json
{
  "version": 2,

  "profile": {
    "name": "Bắp"
  },

  "questions": {
    "1": {
      "attempts": 3,
      "correctCount": 2,
      "wrongCount": 1,
      "lastAnswer": 1,
      "lastCorrect": true,
      "seen": true,
      "mastered": true,
      "lastAnsweredAt": "2026-09-11T04:20:00.000Z"
    },

    "2": {
      "attempts": 1,
      "correctCount": 0,
      "wrongCount": 1,
      "lastAnswer": 0,
      "lastCorrect": false,
      "seen": true,
      "mastered": false,
      "lastAnsweredAt": "2026-09-11T04:21:00.000Z"
    }
  },

  "stats": {
    "mock": {
      "attempts": 8,
      "bestScore": 29,
      "lastScore": 27,
      "total": 30
    },

    "reaction": {
      "attempts": 5,
      "bestScore": 25,
      "lastScore": 21,
      "total": 30
    },

    "liet": {
      "attempts": 2,
      "bestScore": 55,
      "lastScore": 55,
      "total": 60
    }
  },

  "examHistory": [
    {
      "id": "mock-...",
      "type": "mock",
      "score": 28,
      "total": 30,
      "passed": true,
      "questionIds": [1, 22, 58],
      "wrongQuestionIds": [22, 58],
      "createdAt": "2026-09-11T04:00:00.000Z"
    }
  ],

  "currentSession": {
    "mode": "full",
    "questionIds": [1, 2, 3, 4],
    "currentIndex": 2,
    "answers": {
      "1": 1,
      "2": 0
    },
    "startedAt": "2026-09-11T03:50:00.000Z"
  },

  "settings": {
    "sound": true
  }
}
```

---

# 5. QUY TẮC CẬP NHẬT TIẾN TRÌNH

Mỗi lần trả lời một câu:

```text
attempts += 1
```

Nếu đúng:

```text
correctCount += 1
lastCorrect = true
```

Nếu sai:

```text
wrongCount += 1
lastCorrect = false
```

Luôn cập nhật:

```text
lastAnswer
lastAnsweredAt
seen = true
```

## 5.1. `mastered`

Không đánh dấu “đã thuộc” chỉ vì đúng một lần.

Rule đơn giản đề xuất:

```text
mastered = attempts >= 2
           AND correctCount >= 2
           AND lastCorrect === true
```

Hoặc có thể dùng rule chặt hơn sau này.

Không làm thay đổi đáp án/câu hỏi gốc.

---

# 6. DASHBOARD PROGRESS MỚI

Thay số giả lập bằng số liệu thật:

```text
Đã gặp:           318 / 600
Đã trả lời đúng:  276 / 600
Đã thuộc:         231 / 600
Cần ôn lại:        42 câu
Chưa học:         282 câu
```

## 6.1. Định nghĩa

### Đã gặp

Question có:

```ts
seen === true
```

### Đã trả lời đúng

Question có ít nhất một lần đúng:

```ts
correctCount > 0
```

### Đã thuộc

```ts
mastered === true
```

### Cần ôn lại

Ưu tiên các question:

```text
wrongCount > 0
AND mastered !== true
```

Có thể sort:

1. sai nhiều nhất;
2. sai gần đây nhất;
3. chưa trả lời đúng lần nào.

### Chưa học

Question ID không tồn tại trong progress hoặc:

```ts
seen !== true
```

---

# 7. TIẾN ĐỘ THEO TỪNG CHƯƠNG

Mỗi chương hiển thị:

```text
Chương 1
Đã học 103 / 180
Đã thuộc 76
Cần ôn lại 18
```

Progress phải tính trực tiếp từ `questions` trong localStorage.

Không tạo counter độc lập vì dễ lệch dữ liệu.

---

# 8. TIẾP TỤC BÀI ĐANG HỌC

Nếu `currentSession` tồn tại và chưa hoàn thành:

Homepage hiện card:

```text
Học tiếp nha?
Đang ở câu 72 / 600

[ Tiếp tục ]
[ Bỏ bài này ]
```

### `Tiếp tục`

Restore:

- mode;
- question list;
- current index;
- những câu đã chọn;
- timer nếu phù hợp.

### `Bỏ bài này`

Xóa riêng:

```text
currentSession
```

Không xóa lịch sử hoặc question progress.

---

# 9. CÂU HAY SAI

Thêm mode/card:

```text
Câu Bắp hay nhầm
```

Mô tả:

```text
Mấy câu mình từng chọn sai, gom lại đây để coi lại nha.
```

Nguồn dữ liệu tự động:

```ts
wrongCount > 0
```

Sort đề xuất:

```text
wrongCount DESC
lastAnsweredAt DESC
```

Có filter:

- Tất cả;
- Sai từ 2 lần;
- Chưa từng làm đúng;
- Theo chương.

Khi câu đã thuộc vẫn không cần xóa lịch sử sai, nhưng có thể giảm ưu tiên hiển thị.

---

# 10. SỬA BUG THỐNG KÊ `55/30`

Không dùng một biến `best` chung cho mọi mode.

Sai hiện tại về bản chất:

```text
điểm 55/60 của câu liệt
→ ghi vào best chung
→ card mock render best/30
→ thành 55/30
```

### Bắt buộc tách stats

```ts
stats.mock
stats.reaction
stats.liet
```

Ví dụ:

```json
{
  "mock": {
    "bestScore": 29,
    "total": 30
  },
  "liet": {
    "bestScore": 55,
    "total": 60
  }
}
```

Card nào dùng stats của mode đó.

### Acceptance

Không bao giờ được hiển thị:

```text
55/30
60/30
```

hoặc score lớn hơn `total`.

---

# 11. THI THỬ HẠNG B — KHÔNG ĐƯỢC LẶP MỘT ĐỀ

Hiện tượng cần sửa:

```ts
makeMockExam(QUESTION_BANK, 30)
```

nếu `30` đang được dùng làm fixed seed → mỗi lần sinh cùng một đề.

### Sửa

Dùng:

```ts
makeMockExam(QUESTION_BANK)
```

hoặc:

```ts
makeMockExam(QUESTION_BANK, Date.now())
```

### Thêm nút

```text
Đề mới
```

Sau khi bấm:

- sinh bộ câu khác;
- reset answer/timer của đề đang làm;
- không làm mất progress lịch sử.

---

# 12. KHÔNG CHO TRÙNG QUESTION ID TRONG MỘT ĐỀ

Sau khi generate đề:

```ts
const ids = questions.map(q => q.id);

if (new Set(ids).size !== ids.length) {
  throw new Error("Duplicate question IDs in generated exam");
}
```

### Acceptance

Mỗi đề 30 câu:

```text
30 question IDs
30 unique IDs
```

Không được có câu ID trùng trong cùng đề.

Nếu trong ngân hàng có hai câu nội dung tương tự nhưng ID khác nhau thì đó là dữ liệu gốc; không tự ý xóa trừ khi đã xác minh là duplicate dữ liệu.

---

# 13. CẤU TRÚC THI THỬ HẠNG B

Ở phiên bản hiện tại, giữ giao diện:

```text
30 câu
20 phút
Đạt: 27/30
```

Generator phải theo đúng cấu trúc đang áp dụng cho bộ đề hiện tại:

```text
8 câu  – quy định/quy tắc
1 câu  – điểm liệt
1 câu  – văn hóa, đạo đức, PCCC/cứu hộ
1 câu  – kỹ thuật lái
1 câu  – cấu tạo/sửa chữa
9 câu  – biển báo
9 câu  – sa hình/tình huống
-----------------------------------
30 câu
```

Không dùng quota cũ:

```ts
law: 10
culture: 2
technique: 3
vehicle: 2
signs: 7
situation: 6
```

Nếu generator chưa đúng cấu trúc thì **không được gắn badge “Chuẩn đề thi”**.

---

# 14. 20 BỘ ÔN CỐ ĐỊNH — KHÔNG GỌI LÀ “20 ĐỀ THI CHUẨN”

Hiện ý tưởng chia:

```text
20 × 30 = 600 câu
```

để phủ đủ toàn bộ question bank là tốt cho học tập.

Nhưng nó không đồng nghĩa mỗi bộ là một đề thi chuẩn.

### Đổi tên thành

```text
20 bộ ôn cố định — phủ đủ 600 câu
```

Mô tả:

```text
Mỗi câu trong bộ 600 xuất hiện một lần để Bắp có thể học hết ngân hàng câu hỏi.
```

### Phân biệt rõ

#### Thi thử hạng B

- Random.
- Theo đúng cấu trúc đề.
- 30 câu / 20 phút.
- Dùng để mô phỏng thi thật.

#### 20 bộ ôn cố định

- Phủ đủ 600 câu.
- Dùng để học hết ngân hàng.
- Không gọi là đề thi chuẩn.

---

# 15. LUYỆN PHẢN XẠ: ĐỔI 5 GIÂY → 30 GIÂY

Feedback thực tế:

```text
5 giây chưa nhìn ra hình
```

### Yêu cầu mới

```text
Luyện nhanh — 30 giây/câu
```

Không còn 5 giây.

---

# 16. TIMER CHỈ CHẠY SAU KHI ẢNH ĐÃ LOAD

Flow bắt buộc:

```text
Load question
    ↓
Preload image
    ↓
Image onLoad / decode xong
    ↓
Start 30-second timer
```

### Không dùng

```html
loading="lazy"
```

cho ảnh câu hỏi đang hiển thị.

Có thể preload ảnh câu kế tiếp để chuyển câu mượt hơn.

### Khi ảnh lỗi

- không chạy timer;
- hiện trạng thái:
  `Hình chưa tải được, thử lại nha.`
- có nút `Tải lại hình`.

---

# 17. REACTION MODE CŨNG KHÔNG ĐƯỢC FIXED SEED

Nếu đang có:

```ts
makeReactionSet(QUESTION_BANK, 30)
```

và `30` là seed thì phải sửa.

Dùng random seed mỗi session.

Thêm validation unique IDs giống mock exam.

---

# 18. GIẢI THÍCH SAU KHI TRẢ LỜI SAI

Đây là tính năng ưu tiên cao.

Hiện chỉ biết:

```text
Em đã chọn: A
Đáp án đúng: C
```

→ chưa đủ để học.

## 18.1. Data model đề xuất

Mở rộng question:

```json
{
  "id": 301,
  "question": "...",
  "options": ["...", "...", "..."],
  "correct": 0,

  "explanation": "Giải thích tổng quan...",

  "whyCorrect": "Vì sao đáp án đúng...",

  "optionExplanations": {
    "0": "Đáp án này đúng vì...",
    "1": "Đáp án này sai vì..."
  },

  "signExplanations": [
    {
      "label": "Biển 1",
      "meaning": "..."
    },
    {
      "label": "Biển 2",
      "meaning": "..."
    }
  ],

  "memoryTip": "Mẹo nhớ ngắn gọn..."
}
```

Không bắt buộc mọi question phải có đủ tất cả field ngay lập tức.

UI phải graceful fallback nếu chỉ có `explanation`.

---

# 19. CÁCH HIỂN THỊ GIẢI THÍCH

## Trong chế độ học

Sau khi chọn đáp án:

```text
✅ Đáp án đúng: C

Vì sao?
...

Bắp nhầm ở đâu?
...

Nhớ nhanh
...
```

Có thể hiện ngay.

## Trong thi thử

Không được bật mí khi đang thi.

Chỉ hiện sau:

```text
Nộp bài
→ Xem kết quả
→ Xem giải thích từng câu sai
```

## Với câu biển báo

Ưu tiên hiển thị:

```text
Biển 1: ý nghĩa...
Biển 2: ý nghĩa...
Biển 3: ý nghĩa...
```

đúng nhu cầu feedback thực tế.

---

# 20. NGUYÊN TẮC TẠO EXPLANATION

Không tự sinh 600 lời giải bằng AI rồi coi là dữ liệu chính thức.

Mỗi explanation phải:

- dựa vào đáp án gốc;
- đối chiếu quy tắc/ý nghĩa biển báo;
- không thay đổi answer key;
- không tạo “mẹo” làm sai bản chất;
- review riêng những câu dễ gây hiểu nhầm.

Nếu chưa có lời giải đáng tin:

```text
Chưa có giải thích chi tiết cho câu này.
```

tốt hơn là bịa.

---

# 21. RESET / EXPORT / IMPORT PROGRESS

Thêm trang hoặc modal:

```text
Dữ liệu học
```

Có các action:

### `Xuất tiến trình`

Download:

```text
bap-progress.json
```

Nội dung chính là object `bap_con_progress_v2`.

### `Khôi phục tiến trình`

- chọn JSON;
- validate `version`;
- validate schema;
- confirm trước khi overwrite;
- reload UI sau khi import.

### `Học lại từ đầu`

Xóa:

```text
bap_con_progress_v2
```

Không xóa PIN trusted-device.

### `Xóa toàn bộ dữ liệu trên thiết bị`

Xóa:

```text
bap_con_progress_v2
bap_con_sound
bap_con_access_v1
```

Sau đó trở về màn hình PIN.

---

# 22. MIGRATE DỮ LIỆU CŨ

Hiện có:

```text
bap_con_stats
bap_con_sound
```

### `bap_con_sound`

Có thể migrate bình thường vào:

```ts
settings.sound
```

### `bap_con_stats`

Không được biến `remembered` cũ thành question progress vì không biết câu nào thật sự đã học.

Không dùng `best` cũ làm best của mock vì có thể đã dính bug score từ mode khác.

Có thể:

- giữ `sessions` thành legacy metadata nếu cần;
- hoặc reset stats sạch khi chuyển schema v2.

Ưu tiên **dữ liệu đúng** hơn giữ số liệu cũ không đáng tin.

---

# 23. TOÀN BỘ TEXT CẦN GIẢM “MÙI AI”

Tone mong muốn:

> Đây là website một người làm riêng cho Bắp, không phải landing page sản phẩm giáo dục và cũng không phải game.

Nguyên tắc:

- ít slogan;
- ít tiếng Anh vô nghĩa;
- ít phóng đại;
- không “motivational quote” liên tục;
- text chức năng phải rõ;
- câu thân thương chỉ xuất hiện ở đúng chỗ;
- Bông có cá tính riêng nhưng không nói như chatbot.

---

# 24. BẢNG TEXT THAY THẾ

| Text hiện tại | Thay bằng |
|---|---|
| `little road, big confidence` | `600 câu thôi, học cùng nhau nha` hoặc bỏ |
| `Góc học dịu dàng` | `Góc học của Bắp` |
| `choose your quest` | `Hôm nay học gì nè?` hoặc bỏ |
| `master the 6 chapters` | Bỏ |
| `quick revision cards` | Bỏ |
| `Học lái thật nhẹ nhàng.` | `Bắp iu học lái nè.` hoặc `Hôm nay mình học một chút nha.` |
| `Chọn một nhịp học vừa sức...` | `Muốn học phần nào thì mình bắt đầu phần đó nha.` |
| `Những bí kíp đơn giản nhưng cực kỳ hữu ích giúp Bắp con không bao giờ bị bẫy!` | `Mấy mẹo Bắp dễ quên, để đây coi lại trước khi thi.` |
| `Được biên soạn riêng cho Bắp iu` | `Bông nhắc Bắp nè 🐾` |
| `60 Câu điểm liệt cấp tốc` | `60 câu điểm liệt` |
| `Ôn kỹ phần này là an tâm 90%!` | `Phần này rất quan trọng, sai câu điểm liệt là không đạt.` |
| `60 Câu điểm liệt sống còn` | `60 câu điểm liệt` |
| `BẮP CON OFFICIAL STUDY PERMIT` | `THẺ HỌC LÁI CỦA BẮP` |
| `Bằng Lái Tập Sự Dịu Dàng` | `Tiến độ học của Bắp` |
| `Tập sự đáng yêu 🐣` | `Mới bắt đầu 🐣` |
| `Tay lái lụa siêu đỉnh 🌸` | `Sắp về đích rồi 🌸` |
| `Phản xạ thần tốc ⚡` | `Đang vào guồng ⚡` |
| `READY · TO · DRIVE` | `CỐ LÊN BẮP ƠI` |
| `Tuyệt vời lắm Bắp iu ơi!` | Giữ |
| `Em đã hoàn thành xuất sắc vòng thi này. Hãy tiếp tục giữ vững phong độ nhé!` | `Đậu rồi nè 🥳 Nhưng coi lại mấy câu sai một lượt nha.` |
| `Làm tốt lắm, gần đạt điểm tuyệt đối rồi!` | `Còn vài câu nữa thôi, coi lại câu sai nha.` |
| `Không sao cả, mỗi lần luyện là một lần nhớ!` | `Sai chỗ nào mình coi lại chỗ đó nha.` |

---

# 25. VIẾT LẠI MÈO BÔNG

## Câu nên bỏ / thay

### Hiện tại

```text
Bông tin chắc Bắp iu thi một phát là 30/30 luôn nè 🚗💨
```

### Thay

```text
Làm sai cũng được nha, miễn là mình nhớ câu đó cho lần sau.
```

---

### Hiện tại

```text
Purrrrr~ Năng lượng may mắn đã được truyền sang Bắp con rồi đó!
```

### Thay

```text
Vuốt Bông xong rồi thì học tiếp nha 🐾
```

---

### Hiện tại

```text
Meowww~ Tặng Bắp iu 100 điểm tự tin đi thi nè! 🐾
```

### Thay

```text
Bắp làm được mà. Từ từ đọc kỹ từng câu nha 🐾
```

---

### Hiện tại

```text
Ngoan ngoan~ Học mệt nhớ uống nước rồi học tiếp nha cô gái!
```

### Thay

```text
Mệt thì nghỉ xíu nha. Uống nước rồi mình học tiếp.
```

---

## Câu có thể giữ

```text
Bông đang gừ gừ vì Bắp con chăm chỉ quá chừng luôn đó! 🥰
```

Câu này có giọng nhân vật, không cần sửa.

---

# 26. KHÔNG DÙNG THỐNG KÊ/MẸO KHÔNG CÓ CƠ SỞ

Bỏ:

```text
Thấy từ “Bị nghiêm cấm” là 99% chọn ngay nha em!
```

Bỏ:

```text
99% đó là đáp án ĐÚNG
```

Không đưa tỷ lệ giả vào giao diện.

### Thay bằng

```text
Gặp câu có “bị nghiêm cấm”, đọc kỹ lại đáp án vì đây thường là nhóm quy định cấm cần nhớ.
```

Nguyên tắc:

- mẹo chỉ hỗ trợ nhớ;
- không biến thành “hack đáp án”;
- không cam kết tỷ lệ nếu không có dữ liệu chứng minh.

---

# 27. TONE TOÀN WEBSITE

## Text chức năng

Dùng thẳng:

```text
Thi thử
Học 600 câu
20 bộ ôn
Câu điểm liệt
Câu hay sai
Tiến độ
Học tiếp
Làm lại
Xem câu sai
Dữ liệu học
Khóa lại
```

Không cần trang trí mọi label bằng slogan.

## Text tình cảm

Chỉ ưu tiên ở:

- lời chào;
- Mèo Bông;
- hoàn thành bài;
- khi làm sai;
- card học tiếp.

Mục tiêu:

> Ít câu tình cảm hơn, nhưng câu nào cũng giống một người thật đang nói với Bắp.

---

# 28. RESULT SCREEN MỚI

Sau khi thi xong:

```text
Đậu rồi nè 🥳
28 / 30

Sai 2 câu
Câu điểm liệt: Không sai

[ Xem 2 câu sai ]
[ Làm đề mới ]
[ Về trang chủ ]
```

Nếu chưa đạt:

```text
Chưa qua lần này rồi.
Sai chỗ nào mình coi lại chỗ đó nha.

24 / 30

[ Xem câu sai ]
[ Làm đề khác ]
```

Không dùng đoạn văn dài động viên kiểu chatbot.

---

# 29. HOMEPAGE ĐỀ XUẤT SAU KHI SỬA

Thứ tự ưu tiên:

```text
Header / lời chào
↓
Card học tiếp (nếu có)
↓
Tiến độ thật
↓
Thi thử hạng B
↓
Học 600 câu
↓
Câu hay sai
↓
60 câu điểm liệt
↓
20 bộ ôn cố định
↓
Học theo 6 chương
↓
Mèo Bông
↓
Dữ liệu / cài đặt
```

Không cần nhồi quá nhiều slogan giữa các section.

---

# 30. UI CHO PROGRESS

Card chính ví dụ:

```text
Tiến độ của Bắp

318 / 600 câu đã gặp

██████████░░░░░░░░ 53%

Đã thuộc        231
Cần ôn lại       42
Chưa học        282
```

Cho click vào:

- `Đã thuộc`
- `Cần ôn lại`
- `Chưa học`

để mở đúng danh sách.

---

# 31. CÀI ĐẶT / DỮ LIỆU

Tạo modal hoặc page nhỏ:

```text
Cài đặt
```

Có:

```text
Âm thanh              [ ON/OFF ]

Dữ liệu học
[ Xuất tiến trình ]
[ Khôi phục tiến trình ]
[ Học lại từ đầu ]

Thiết bị
[ Khóa lại ]

Nguy hiểm
[ Xóa toàn bộ dữ liệu trên thiết bị ]
```

Action destructive cần confirm.

---

# 32. QUY TẮC CONFIRM RESET

`Học lại từ đầu`:

```text
Bắp muốn xóa toàn bộ tiến trình học trên thiết bị này hả?

Việc này sẽ xóa:
• câu đã học
• lịch sử thi
• câu hay sai
• bài đang làm

Mã truy cập và cài đặt thiết bị vẫn được giữ.

[ Thôi ] [ Xóa tiến trình ]
```

`Xóa toàn bộ dữ liệu`:

```text
Xóa luôn tiến trình, cài đặt và trạng thái đã mở khóa trên thiết bị này.

[ Thôi ] [ Xóa tất cả ]
```

---

# 33. LOCALSTORAGE KEYS ĐỀ XUẤT

Sau khi refactor:

```text
bap_con_access_v1
bap_con_progress_v2
```

Có thể bỏ dần:

```text
bap_con_stats
bap_con_sound
```

Sau migration, `sound` nằm trong `bap_con_progress_v2.settings`.

Nếu muốn giảm rủi ro dữ liệu lớn, exam history chỉ giữ tối đa:

```text
50–100 lần thi gần nhất
```

Question progress 600 câu vẫn rất nhỏ đối với localStorage.

---

# 34. DATA PERSISTENCE

Sau mỗi action quan trọng phải save ngay:

- chọn đáp án;
- chuyển câu;
- submit bài;
- thay đổi sound;
- hoàn thành bài;
- bỏ bài;
- import JSON.

Không chỉ save khi kết thúc session.

Có debounce nhẹ nếu cần nhưng tránh mất dữ liệu khi user đóng tab.

---

# 35. VALIDATION KHI LOAD LOCALSTORAGE

Không được assume JSON luôn đúng.

Flow:

```ts
try {
  const raw = localStorage.getItem(KEY);
  const parsed = JSON.parse(raw);
  validateProgress(parsed);
} catch {
  // fallback default
}
```

Nếu hỏng:

- backup raw value nếu có thể;
- fallback object mới;
- không crash website.

---

# 36. IMPORT JSON AN TOÀN

Trước khi import:

- phải là JSON object;
- có `version`;
- `questions` phải object;
- score không âm;
- question IDs chỉ từ 1–600;
- answer index phải hợp lệ;
- không execute bất kỳ code nào từ file;
- bỏ field không biết nếu cần.

Sau validate mới overwrite.

---

# 37. ĐỒNG BỘ NHIỀU TAB

Nếu người dùng mở 2 tab:

```ts
window.addEventListener("storage", ...)
```

để refresh progress khi tab khác update.

Không bắt buộc phức tạp, nhưng nên hỗ trợ để tránh một tab ghi đè dữ liệu cũ.

---

# 38. KHÔNG CẦN SUPABASE Ở PHASE NÀY

Chỉ chuyển database online khi có nhu cầu thật:

- học trên iPhone và laptop cùng một progress;
- nhiều người dùng;
- muốn backup cloud tự động;
- muốn admin xem thống kê.

Trong phase hiện tại:

```text
Static Next.js/Vercel
+
localStorage
+
Export/Import JSON
```

là đủ.

---

# 39. THỨ TỰ TRIỂN KHAI

## P0 — bắt buộc trước

1. Thêm PIN gate 6 số.
2. Tạo progress schema v2.
3. Bỏ `remembered` giả.
4. Sửa bug stats `55/30`.
5. Sửa mock fixed seed.
6. Validate không trùng ID.
7. Sửa đúng cấu trúc đề mock.
8. Sửa reaction fixed seed.
9. Đổi 5 giây → 30 giây.
10. Timer chỉ chạy sau khi ảnh load.

## P1 — trải nghiệm học

11. Câu hay sai.
12. Resume current session.
13. Progress từng chương.
14. Giải thích câu sai.
15. Result screen mới.
16. 20 bộ ôn cố định đổi tên/mô tả.

## P2 — dữ liệu / hoàn thiện

17. Export JSON.
18. Import JSON.
19. Reset progress.
20. Xóa toàn bộ dữ liệu.
21. Multi-tab sync.
22. Migration dữ liệu cũ.

## P3 — copywriting/UI polish

23. Thay toàn bộ text “AI”.
24. Viết lại Mèo Bông.
25. Bỏ các claim `90%`, `99%`.
26. Làm gọn homepage.
27. Làm modal PIN đẹp và responsive.

---

# 40. ACCEPTANCE CHECKLIST

## Access

- [ ] Chưa xác thực → không xem được app.
- [ ] PIN bắt buộc đúng 6 chữ số.
- [ ] PIN mặc định `221226`.
- [ ] Sai PIN có feedback thân thiện.
- [ ] Đúng PIN vào app.
- [ ] Refresh vẫn được ghi nhớ.
- [ ] Đóng browser rồi mở lại vẫn được ghi nhớ.
- [ ] `Khóa lại` → bắt nhập PIN lần sau.
- [ ] Reset progress không tự logout thiết bị.

## Progress

- [ ] Không còn `remembered` giả.
- [ ] Theo dõi được từng question 1–600.
- [ ] Đã gặp là số liệu thật.
- [ ] Đã đúng là số liệu thật.
- [ ] Cần ôn lại là số liệu thật.
- [ ] Chưa học là số liệu thật.
- [ ] Có progress từng chương.
- [ ] Reload giữa bài vẫn resume được.

## Stats

- [ ] Mock chỉ dùng score mock.
- [ ] Câu liệt chỉ dùng score câu liệt.
- [ ] Reaction chỉ dùng score reaction.
- [ ] Không thể có `55/30`.
- [ ] Score không thể lớn hơn total.

## Mock exam

- [ ] Mỗi lần tạo đề dùng seed mới.
- [ ] Có nút `Đề mới`.
- [ ] 30 câu unique IDs.
- [ ] Đúng quota cấu trúc.
- [ ] Không hiện explanation trong khi thi.
- [ ] Sau nộp bài xem được câu sai + explanation.

## Reaction

- [ ] 30 giây/câu.
- [ ] Không còn 5 giây.
- [ ] Timer chưa chạy khi ảnh chưa load.
- [ ] Preload câu tiếp theo.
- [ ] Không cố định cùng một bộ câu.

## 20 bộ ôn

- [ ] Tên mới: `20 bộ ôn cố định — phủ đủ 600 câu`.
- [ ] Không gọi là `20 đề thi chuẩn`.
- [ ] Phân biệt rõ với mock exam.

## Explanation

- [ ] Câu sai có lý do.
- [ ] Câu biển có giải thích từng biển khi data hỗ trợ.
- [ ] Không bịa explanation khi chưa có nguồn chắc chắn.

## Data

- [ ] Export JSON hoạt động.
- [ ] Import JSON validate trước.
- [ ] Reset progress hoạt động.
- [ ] Xóa toàn bộ data hoạt động.
- [ ] Corrupt localStorage không làm app crash.

## Copywriting

- [ ] Bỏ slogan tiếng Anh không cần thiết.
- [ ] Bỏ câu động viên generic.
- [ ] Bỏ claim 90%/99%.
- [ ] Tone thân thương nhưng ít và tự nhiên.
- [ ] Mèo Bông không nói như chatbot.
- [ ] Text chức năng ngắn, rõ.

---

# 41. OUT OF SCOPE — KHÔNG LÀM Ở PHIÊN BẢN NÀY

Không triển khai:

```text
120 câu/tình huống mô phỏng
video mô phỏng
nút DỪNG cho video
phím Space cho mô phỏng
mốc chấm 5-4-3-2-1
Cloudflare R2 cho video
```

Có thể làm thành **phase riêng sau khi toàn bộ phần học lý thuyết hiện tại đã ổn định**.

---

# 42. KẾT QUẢ MONG MUỐN SAU KHI HOÀN THÀNH

Website vẫn là một app nhỏ, nhanh, deploy tĩnh trên Vercel nhưng:

- chỉ Bắp hoặc thiết bị đã nhập đúng PIN mới vào được;
- không cần backend;
- tiến trình không còn giả;
- biết chính xác Bắp đã học câu nào;
- biết câu nào hay sai;
- có thể học tiếp đúng chỗ đang dở;
- thi thử không lặp mãi một đề;
- không còn lỗi điểm `55/30`;
- luyện phản xạ đủ thời gian nhìn hình;
- sai câu nào có thể hiểu vì sao;
- có backup/restore tiến trình;
- toàn bộ câu chữ nghe tự nhiên hơn;
- website giữ được cảm giác **“một trang làm riêng cho Bắp”**, thay vì một giao diện được AI viết hàng loạt.

---

# 43. NGUYÊN TẮC QUAN TRỌNG CHO AI AGENT

Khi triển khai:

1. **Không sửa nội dung câu hỏi/đáp án gốc ngoài phạm vi được yêu cầu.**
2. Không tự thay answer key.
3. Không thêm mô phỏng trong phase này.
4. Không thêm backend nếu không thực sự cần.
5. Không làm mất data localStorage cũ mà không có migration/fallback.
6. Không tạo số tiến độ giả.
7. Không dùng fixed seed cho mode cần random.
8. Không gọi bộ ôn phủ 600 câu là đề thi chuẩn.
9. Không hiển thị lời giải trong lúc đang thi thử.
10. Không tự bịa explanation.
11. Không đưa secret/API key vào frontend.
12. Giữ giao diện mobile-first vì người học có thể dùng điện thoại.
13. Mọi thay đổi phải kiểm tra cả desktop và mobile.
14. Trước khi bàn giao, chạy toàn bộ Acceptance Checklist ở mục 40.

---

## Chốt scope

**Làm ngay:** PIN 6 số + trusted device, localStorage progress v2, sửa stats, sửa mock/reaction, giải thích câu sai, resume, câu hay sai, export/import/reset, đổi copywriting và làm sạch UX.

**Chưa làm:** 120 tình huống mô phỏng.
