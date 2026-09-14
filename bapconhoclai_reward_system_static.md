# THIẾT KẾ HỆ THỐNG PHẦN THƯỞNG — BẢN THUẦN WEB TĨNH
## Website “Bắp con học lái”

> Tài liệu triển khai cho AI Agent / Developer.
>
> **Kiến trúc chốt:** thuần web tĩnh, không database cloud, không Supabase/Firebase, không API server, không email, không Google App Password.
>
> Dữ liệu người dùng được lưu hoàn toàn ở phía trình duyệt bằng `localStorage` + `IndexedDB`, có export/import JSON để backup và phục hồi thủ công.
>
> Phạm vi giữ nguyên: 25 phần thưởng ngoài đời, Hộp quà, Progress Tree, UI mở/nhận quà, responsive mobile/tablet/desktop, export/import/reset.
>
> Không thay đổi nội dung 600 câu hỏi, đáp án, logic giải thích câu hỏi hoặc dữ liệu biển báo.

---

# 1. MỤC TIÊU

Hệ thống phần thưởng cần tạo cảm giác:

- có động lực học;
- có bất ngờ;
- không bị “game hóa” quá mức;
- quà là quà thật ngoài đời;
- quà chưa đạt phải được ẩn để tạo tò mò;
- xem được mình đang tiến gần đến quà nào;
- không vô tình nhận trùng quà trên cùng dữ liệu tiến trình;
- reload / đóng browser / restart máy không mất tiến trình;
- có backup JSON rõ ràng;
- có cơ chế mirror local để giảm rủi ro mất dữ liệu;
- chạy hoàn toàn trên Vercel static hoặc GitHub Pages / Cloudflare Pages.

Tổng số phần thưởng:

```text
25 phần thưởng
```

Cấu trúc:

```text
20 phần thưởng  → 20 bộ ôn cố định
1 phần thưởng   → 60/60 câu điểm liệt
4 phần thưởng   → mốc Thi thử hạng B: 1 / 5 / 20 / 40 lần PASS
```

---

# 2. KIẾN TRÚC CHỐT — PURE STATIC

Kiến trúc:

```text
Next.js static / Vercel
        │
        ├── localStorage      ← dữ liệu chính để load nhanh
        │
        ├── IndexedDB         ← bản mirror / snapshot backup cục bộ
        │
        ├── Export JSON       ← backup ra file
        │
        └── Import JSON       ← restore khi cần
```

Không sử dụng:

```text
Supabase
Firebase
PostgreSQL
MongoDB
iCloud database
API server
serverless functions
SMTP
Gmail App Password
email notification
```

---

# 3. LƯU Ý VỀ “GHI NGƯỢC LÊN RAM SERVER”

Không triển khai ghi dữ liệu user lên RAM server.

Lý do:

- web đang là static;
- Vercel static không cung cấp vùng RAM ghi bền vững cho từng user;
- RAM server là bộ nhớ tạm, có thể mất khi instance restart;
- serverless instance có thể bị tạo/xóa bất kỳ lúc nào;
- không phù hợp để làm backup.

Vì vậy:

```text
RAM server ≠ persistent backup
```

Giải pháp thay thế đúng cho pure static:

```text
localStorage
+
IndexedDB mirror
+
Export JSON
```

Có thể bổ sung:

```ts
navigator.storage.persist()
```

để browser cố gắng giữ dữ liệu local lâu hơn nếu trình duyệt hỗ trợ.

---

# 4. NGUYÊN TẮC PHẦN THƯỞNG

## 4.1. Mỗi reward chỉ unlock một lần trong progress hiện tại

Một reward sau khi có trạng thái:

```text
claimed
```

thì không tự quay về trạng thái cũ khi:

- reload;
- đóng tab;
- mở lại browser;
- restart máy.

Nếu user chủ động reset toàn bộ dữ liệu hoặc import một backup cũ thì reward có thể quay lại theo đúng dữ liệu của backup đó.

Vì không có server/cloud:

> hệ thống không thể chống chỉnh tay localStorage/JSON ở mức bảo mật tuyệt đối.

Điều này chấp nhận được vì website chỉ dành cho 1 người dùng.

---

# 5. TRẠNG THÁI REWARD

Flow:

```text
LOCKED
  ↓
UNLOCKED
  ↓
REVEALED
  ↓
CLAIMED
```

Giải thích:

```text
locked
→ chưa đạt điều kiện

unlocked
→ đã đủ điều kiện, nhưng chưa mở hộp quà

revealed
→ đã bấm “Mở quà”, biết quà là gì

claimed
→ đã xác nhận nhận quà ngoài đời
```

Không auto claim.

---

# 6. QUÀ CHƯA ĐẠT PHẢI ĐƯỢC ẨN

Trước khi unlock:

```text
🎁 Quà bí mật
Hoàn thành Bộ ôn 08 để mở
```

Không hiển thị:

- tên quà;
- giá trị;
- mô tả;
- icon đặc trưng;
- giá tiền.

Chỉ dùng icon chung:

```text
🎁
✨
🔒
```

---

# 7. 25 PHẦN THƯỞNG

## 7.1. 20 bộ ôn cố định

| Reward ID | Điều kiện | Phần thưởng | Giá trị gợi ý |
|---|---|---|---:|
| `preset-01` | Đạt Bộ ôn 01 | 1 cái lạp xưởng nướng đá | ~25k |
| `preset-02` | Đạt Bộ ôn 02 | 1 chai nước / nước ngọt em thích | ~25–30k |
| `preset-03` | Đạt Bộ ôn 03 | 1 món ăn vặt tự chọn | ~30k |
| `preset-04` | Đạt Bộ ôn 04 | 1 cái bánh ngọt | ~35k |
| `preset-05` | Đạt Bộ ôn 05 | 1 ly trà sữa | ~40k |
| `preset-06` | Đạt Bộ ôn 06 | 1 phần kem / món tráng miệng | ~40k |
| `preset-07` | Đạt Bộ ôn 07 | 1 ly cà phê / matcha | ~45–50k |
| `preset-08` | Đạt Bộ ôn 08 | 1 bữa sáng em thích | ~50k |
| `preset-09` | Đạt Bộ ôn 09 | Voucher đặt xe | 50k |
| `preset-10` | Đạt Bộ ôn 10 | 1 ly KOI Thé | ~60k |
| `preset-11` | Đạt Bộ ôn 11 | 1 món ăn em chọn | ~60k |
| `preset-12` | Đạt Bộ ôn 12 | Snack + nước / đồ ăn vặt | ~60k |
| `preset-13` | Đạt Bộ ôn 13 | Gội đầu thư giãn / spa tóc | ~70k |
| `preset-14` | Đạt Bộ ôn 14 | Voucher đặt xe | 70k |
| `preset-15` | Đạt Bộ ôn 15 | KOI / trà sữa + topping | ~70k |
| `preset-16` | Đạt Bộ ôn 16 | Một bữa ăn nhỏ em thích | ~80–100k |
| `preset-17` | Đạt Bộ ôn 17 | 1 vé xem phim | ~100–120k |
| `preset-18` | Đạt Bộ ôn 18 | Đi ăn món em đang thèm | ~120–150k |
| `preset-19` | Đạt Bộ ôn 19 | Gội đầu + chăm sóc thư giãn | ~150k |
| `preset-20` | Đạt Bộ ôn 20 | Cuối tuần đi ăn chỗ em thích | ~200k |

---

# 8. ĐIỀU KIỆN NHẬN QUÀ BỘ ÔN

20 bộ ôn không được gọi là “20 đề thi chuẩn”.

Reward condition:

```ts
score >= 27
&& lietWrong === false
```

Nếu đạt:

```text
rewardEligible = true
```

UI:

```text
Bắp đạt điều kiện mở quà của Bộ ôn 08 rồi 🎁
```

Không cần ghi:

```text
Đậu kỳ thi
```

Mỗi bộ chỉ unlock reward lần đầu đạt điều kiện.

---

# 9. PHẦN THƯỞNG 60 CÂU ĐIỂM LIỆT

```text
Reward ID: liet-60
Điều kiện: 60/60
Quà: Cuối tuần đi ăn chỗ em thích
Giá trị gợi ý: ~250–300k
```

Chỉ unlock khi:

```ts
score === 60
```

Không áp dụng cho:

```text
59/60
```

---

# 10. 4 MỐC THI THỬ HẠNG B

Thi thử PASS khi:

```ts
score >= 27
&& lietWrong === false
```

Mỗi PASS hợp lệ:

```ts
mockPassCountLifetime += 1
```

Các mốc:

| Reward ID | Mốc | Phần thưởng |
|---|---:|---|
| `mock-pass-01` | 1 PASS | 1 ly KOI Thé / trà sữa em thích |
| `mock-pass-05` | 5 PASS | 1 lần gội đầu thư giãn / spa tóc |
| `mock-pass-20` | 20 PASS | Cuối tuần đi ăn chỗ em thích |
| `mock-pass-40` | 40 PASS | **Voucher làm nail 500k — phần thưởng lớn nhất** |

Không có reward sau 40 PASS.

---

# 11. REWARD CAO NHẤT

Chỉ có một reward cao nhất:

```text
💅 500k làm nail
```

Điều kiện:

```text
40 lần PASS Thi thử hạng B
```

Không tạo reward nào lớn hơn.

---

# 12. REWARD CATALOG

Tách definition khỏi progress.

File:

```text
data/rewards.ts
```

Ví dụ:

```ts
export type RewardDefinition = {
  id: string;
  category: "preset" | "liet" | "mock";
  order: number;

  title: string;
  hiddenTitle: string;

  description: string;
  emoji: string;

  conditionText: string;

  estimatedValue?: number;

  milestone?: number;
  presetNo?: number;
};
```

`estimatedValue` chỉ dùng nội bộ.

Không render tổng tiền quà.

---

# 13. REWARD PROGRESS STATE

```ts
type RewardStatus =
  | "locked"
  | "unlocked"
  | "revealed"
  | "claimed";
```

```ts
type RewardProgress = {
  rewardId: string;
  status: RewardStatus;

  unlockedAt?: string;
  revealedAt?: string;
  claimedAt?: string;

  trigger?: {
    type: "preset" | "liet" | "mock";
    presetNo?: number;
    score?: number;
    total?: number;
    mockPassCount?: number;
    sourceSessionId?: string;
  };
};
```

---

# 14. PROGRESS VERSION

Nâng:

```ts
PROGRESS_VERSION = 3;
```

Ví dụ:

```json
{
  "version": 3,

  "questions": {},
  "stats": {},
  "examHistory": [],

  "rewards": {
    "mockPassCountLifetime": 7,

    "items": {
      "preset-01": {
        "status": "claimed",
        "unlockedAt": "2026-09-12T10:00:00.000Z",
        "revealedAt": "2026-09-12T10:01:00.000Z",
        "claimedAt": "2026-09-13T12:20:00.000Z"
      },

      "mock-pass-05": {
        "status": "revealed",
        "unlockedAt": "2026-09-20T10:00:00.000Z",
        "revealedAt": "2026-09-20T10:00:05.000Z"
      }
    }
  },

  "settings": {}
}
```

---

# 15. LOCAL STORAGE KEY

Dùng một key chính:

```text
bap_con_progress_v3
```

Access gate giữ riêng:

```text
bap_con_access_v1
```

Có thể có snapshot metadata:

```text
bap_con_backup_meta_v1
```

---

# 16. INDEXEDDB BACKUP MIRROR

Ngoài localStorage, tạo IndexedDB:

```text
DB name:
bap_con_local_backup

Object store:
snapshots
```

Mỗi snapshot:

```ts
type ProgressSnapshot = {
  id: string;
  createdAt: string;
  reason:
    | "auto"
    | "before_import"
    | "before_reset"
    | "manual";

  progressVersion: number;
  data: ProgressV3;
};
```

---

# 17. SNAPSHOT STRATEGY

Không snapshot sau mọi click.

Tạo snapshot khi:

```text
1. hoàn thành bài
2. unlock reward
3. reveal reward
4. claim reward
5. trước import
6. trước reset
7. manual backup
```

Giữ tối đa:

```text
10–20 snapshot gần nhất
```

Ví dụ:

```text
MAX_LOCAL_SNAPSHOTS = 15
```

Khi vượt:

```text
xóa snapshot cũ nhất
```

---

# 18. LOCAL STORAGE LÀ DATA CHÍNH, INDEXEDDB LÀ MIRROR

Flow save:

```text
update progress in memory
↓
write localStorage
↓
async mirror to IndexedDB khi cần snapshot
```

Không để UI chờ IndexedDB.

---

# 19. TỰ PHỤC HỒI KHI LOCALSTORAGE HỎNG

Startup:

```text
try read localStorage
↓
parse + validate
```

Nếu fail:

```text
read latest valid IndexedDB snapshot
↓
restore localStorage
↓
show notice
```

Notice:

```text
Bắp ơi, dữ liệu chính bị lỗi nên hệ thống đã khôi phục bản gần nhất nha.
```

Không dùng wording kỹ thuật dài.

---

# 20. STORAGE PERSISTENCE

Khi app load lần đầu sau unlock PIN:

```ts
if (navigator.storage?.persist) {
  await navigator.storage.persist();
}
```

Có thể kiểm tra:

```ts
navigator.storage.persisted()
```

Mục tiêu:

- giảm khả năng browser tự dọn dữ liệu;
- không đảm bảo 100%.

Không hiển thị technical prompt nếu không cần.

---

# 21. MIGRATION V2 → V3

Không xóa progress v2.

Flow:

```text
load progress
↓
version === 2
↓
migrateToV3()
↓
preserve:
  questions
  stats
  examHistory
  currentSession
  settings
↓
add:
  rewards.mockPassCountLifetime
  rewards.items
↓
save version 3
↓
create snapshot migration
```

---

# 22. TÍNH MOCK PASS LIFETIME

Không phụ thuộc:

```ts
examHistory.slice(-100)
```

Phải có field riêng:

```ts
mockPassCountLifetime
```

Mỗi PASS mới:

```ts
mockPassCountLifetime += 1
```

---

# 23. CHỐNG TÍNH TRÙNG PASS

Mỗi exam session phải có:

```text
sessionId
```

Khi submit:

```text
sessionId chưa processed
→ increment

sessionId đã processed
→ không increment
```

Progress có thể lưu:

```ts
processedExamSessionIds: string[]
```

Không cần giữ vô hạn.

Có thể giữ:

```text
100–200 ID gần nhất
```

---

# 24. REWARD ENGINE

Pseudo:

```ts
function evaluateRewards(
  progress,
  event
) {
  const newlyUnlocked = [];

  if (event.type === "preset_completed") {
    if (
      event.score >= 27 &&
      !event.lietWrong
    ) {
      unlockOnce(
        `preset-${pad2(event.presetNo)}`
      );
    }
  }

  if (event.type === "liet_completed") {
    if (event.score === 60) {
      unlockOnce("liet-60");
    }
  }

  if (event.type === "mock_pass") {
    const count =
      progress.rewards.mockPassCountLifetime;

    for (const milestone of [1, 5, 20, 40]) {
      if (count >= milestone) {
        unlockOnce(
          `mock-pass-${pad2(milestone)}`
        );
      }
    }
  }

  return newlyUnlocked;
}
```

---

# 25. `unlockOnce`

```ts
function unlockOnce(rewardId: string) {
  const item = progress.rewards.items[rewardId];

  if (
    item?.status === "unlocked" ||
    item?.status === "revealed" ||
    item?.status === "claimed"
  ) {
    return;
  }

  progress.rewards.items[rewardId] = {
    status: "unlocked",
    unlockedAt: new Date().toISOString(),
  };
}
```

---

# 26. CLAIM REWARD — THUẦN LOCAL

Không có API.

Flow:

```text
Click “Em nhận rồi ❤️”
↓
confirm
↓
check reward status === revealed
↓
set status = claimed
↓
set claimedAt
↓
save localStorage
↓
create IndexedDB snapshot
↓
show success UI
```

---

# 27. CLAIM IDEMPOTENCY

Nếu:

```text
status === claimed
```

thì click lại không tạo claim mới.

Ví dụ:

```ts
if (reward.status === "claimed") {
  return;
}
```

---

# 28. HỘP QUÀ — HOMEPAGE CARD

```text
🎁 Hộp quà của Bắp

Đã mở: 8 / 25

Mốc gần nhất:
Bộ ôn 09

[ Xem hộp quà ]
```

Không show quà tiếp theo.

---

# 29. TRANG HỘP QUÀ

Route:

```text
/rewards
```

Header:

```text
Hộp quà của Bắp 🎁

Mỗi chặng học xong sẽ có một món nhỏ.
Quà chưa mở thì Bông giấu nha 😼
```

---

# 30. TABS

```text
Tất cả
Đã mở
Đã nhận
```

Groups:

```text
20 bộ ôn
60 câu điểm liệt
Thi thử hạng B
```

---

# 31. CARD LOCKED

```text
┌────────────────────────┐
│           🎁           │
│                        │
│       Quà bí mật       │
│                        │
│       Bộ ôn 08         │
│       🔒 Chưa mở       │
│                        │
│ Hoàn thành điều kiện   │
│ để Bông mở quà nha     │
└────────────────────────┘
```

---

# 32. CARD UNLOCKED

```text
┌────────────────────────┐
│           ✨           │
│                        │
│    Có quà mới nè!      │
│                        │
│  Bộ ôn 08 đã hoàn thành│
│                        │
│      [ Mở quà ]        │
└────────────────────────┘
```

---

# 33. REVEAL ANIMATION

Bấm:

```text
Mở quà
```

Animation:

```text
800–1200ms
```

Flow:

```text
🎁
↓
✨✨✨
↓
🥐
1 bữa sáng em thích
```

Buttons:

```text
[ Để dành ]
[ Em nhận rồi ❤️ ]
```

---

# 34. CARD REVEALED

```text
🥐
1 bữa sáng em thích

Đã mở ngày 14/09

[ Em nhận rồi ❤️ ]
```

---

# 35. CLAIM CONFIRMATION

```text
Bắp nhận quà này nha?

🥐 1 bữa sáng em thích

Sau khi xác nhận, món này sẽ được
đánh dấu “Đã nhận”.

[ Để sau ]
[ Em nhận rồi ❤️ ]
```

---

# 36. CLAIM SUCCESS

```text
❤️ Nhận quà rồi nè

🥐 1 bữa sáng em thích

Bông: “Ăn ngon nha 😼”

[ Về hộp quà ]
```

Riêng reward cuối:

```text
💅 40 lần đậu rồi đó.

500k làm nail
— phần thưởng lớn nhất —

Đi làm bộ móng đẹp thôi 😼
```

---

# 37. PROGRESS TREE

Mục tiêu:

```text
biết đang ở đâu
biết còn bao xa
không biết trước quà là gì
```

---

# 38. PROGRESS TREE — 20 BỘ ÔN

Desktop:

```text
01 ●━━02 ●━━03 ●━━04 ○━━05 ○━━06 ○━━...
     ✓      ✓      ✓      ↑
                         đang học

❤️     🎁     ❤️      🔒
```

Legend:

```text
❤️ claimed
🎁 unlocked/revealed
● completed
○ chưa đạt
🔒 locked
```

---

# 39. PROGRESS TREE — MOBILE

Dùng vertical timeline:

```text
❤️ Bộ 01
   Đã nhận quà
   │
❤️ Bộ 02
   Đã nhận quà
   │
✨ Bộ 03
   Có quà chưa mở
   │
● Bộ 04
   Đang học
   │
🔒 Bộ 05
   Chưa đạt
```

---

# 40. PROGRESS TREE — THI THỬ

Ví dụ:

```text
PASS hiện tại: 12 lần

1       5          20           40
●━━━━━━●━━━━━━━━━━○━━━━━━━━━━━━○
✓       ✓          8 lần nữa     28 lần nữa
```

Node chưa đạt:

```text
🎁 Quà bí mật
Còn 8 lần PASS
```

Không hiển thị:

```text
Cuối tuần đi ăn chỗ em thích
500k làm nail
```

trước khi unlock.

---

# 41. NEXT REWARD CARD

Homepage:

```text
Quà gần nhất 🎁

Thi thử hạng B
12 / 20 lần PASS

████████████░░░░░░░░ 60%

Còn 8 lần nữa để mở quà bí mật.
```

---

# 42. RESPONSIVE — MOBILE

Breakpoint:

```text
< 640px
```

Yêu cầu:

- 1 reward card / row;
- vertical timeline;
- claim modal dạng bottom sheet;
- button full width;
- touch target >= 44px;
- không phụ thuộc hover;
- text 15–17px;
- safe-area iPhone;
- animation không tràn viewport.

---

# 43. RESPONSIVE — TABLET

```text
640px – 1024px
```

Yêu cầu:

- 2 cards / row;
- timeline horizontal scroll nếu cần;
- modal 520–620px;
- touch friendly;
- spacing thoáng.

---

# 44. RESPONSIVE — DESKTOP

```text
> 1024px
```

Yêu cầu:

- 3–4 cards / row;
- progress tree horizontal;
- hover nhẹ;
- modal center;
- max-width 1100–1200px.

---

# 45. ACCESSIBILITY

Bắt buộc:

- state không chỉ phân biệt bằng màu;
- icon + text;
- keyboard accessible;
- Enter / Space dùng được trên button;
- modal trap focus;
- ESC đóng modal;
- ARIA label;
- reduced motion support.

---

# 46. REWARD NOTIFICATION TRONG APP

Khi unlock:

```text
Bắp vừa mở được một hộp quà mới 🎁
```

CTA:

```text
[ Xem hộp quà ]
```

Không reveal tên quà.

---

# 47. NHIỀU REWARD UNLOCK CÙNG LÚC

Không mở nhiều modal liên tiếp.

Hiện:

```text
Bắp có 3 hộp quà mới 🎁

[ Xem ]
```

---

# 48. MICROCOPY

Nên dùng:

```text
Có quà mới nè 🎁
Bông giấu món này kỹ lắm đó 😼
Mở thử không?
Để dành
Em nhận rồi ❤️
Đã nhận
Quà bí mật
Còn 3 chặng nữa
```

Không dùng:

```text
Achievement unlocked
Reward center
Claim now
Congratulations user
```

---

# 49. REWARD DETAIL

```text
1 ly KOI Thé 🧋

Mở khóa:
Bộ ôn 10

Đạt lúc:
14/09/2026 20:15

Đã nhận:
15/09/2026 18:40
```

---

# 50. TAB ĐÃ NHẬN

Có thể trình bày kiểu scrapbook:

```text
❤️ Quà #10
1 ly KOI Thé
15/09/2026
```

---

# 51. KHÔNG HIỂN THỊ TỔNG GIÁ TRỊ

Không có:

```text
Tổng quà đã nhận: 1.850.000đ
```

Mục tiêu:

```text
động lực + kỷ niệm
```

không phải ví tiền.

---

# 52. EXPORT PROGRESS

File:

```text
bap-progress-v3.json
```

Bao gồm:

```json
{
  "exportVersion": 3,
  "exportedAt": "...",

  "progress": {
    "questions": {},
    "stats": {},
    "examHistory": [],
    "currentSession": {},
    "settings": {},

    "rewards": {
      "mockPassCountLifetime": 12,
      "items": {
        "preset-01": {
          "status": "claimed",
          "unlockedAt": "...",
          "revealedAt": "...",
          "claimedAt": "..."
        }
      }
    }
  }
}
```

---

# 53. EXPORT BUTTONS

Settings:

```text
Dữ liệu học

[ Sao lưu JSON ]
[ Khôi phục từ JSON ]
[ Tạo snapshot cục bộ ]

[ Học lại từ đầu ]

Thiết bị
[ Khóa lại ]

Nguy hiểm
[ Xóa dữ liệu trên thiết bị ]
```

---

# 54. EXPORT AUTO-NAMING

Tên file:

```text
bap-progress-2026-09-11-1508.json
```

Giúp dễ phân biệt backup.

---

# 55. IMPORT PROGRESS

Import phải validate:

```text
exportVersion
progress.version
question IDs
answer indexes
stats
reward IDs
reward statuses
timestamps
mockPassCountLifetime
```

Nếu invalid:

```text
File này chưa đúng định dạng backup của Bắp.
```

---

# 56. SNAPSHOT TRƯỚC IMPORT

Trước khi overwrite:

```text
create IndexedDB snapshot
reason = before_import
```

Sau đó mới import.

Nếu import lỗi:

```text
không overwrite dữ liệu hiện tại
```

---

# 57. IMPORT REWARD STATE

Vì không có cloud:

- import được phép restore reward state;
- `claimed` trong file backup sẽ trở lại `claimed`;
- đây là hành vi mong muốn.

Nhưng phải confirm:

```text
File backup sẽ thay thế tiến trình hiện tại,
bao gồm trạng thái phần thưởng.

[ Thôi ]
[ Khôi phục ]
```

---

# 58. RESET HỌC TẬP

Nút:

```text
Học lại từ đầu
```

Khuyến nghị:

- reset question progress;
- reset exam history;
- reset current session;
- reset learning stats.

Nhưng **không reset reward đã claimed** mặc định.

Lý do:

```text
quà thật đã nhận ngoài đời
không nên quay lại chỉ vì học lại
```

---

# 59. RESET MOCK PASS

Khuyến nghị:

```text
mockPassCountLifetime
```

không reset khi “Học lại từ đầu”.

Vì nó gắn với reward lifetime.

---

# 60. RESET TOÀN BỘ TIẾN TRÌNH + REWARD

Chỉ đưa trong Danger Zone nâng cao:

```text
Xóa sạch tất cả dữ liệu
```

Confirm rất rõ:

```text
Thao tác này sẽ xóa:

• tiến trình học
• lịch sử thi
• câu hay sai
• bài đang làm
• toàn bộ Hộp quà
• trạng thái quà đã nhận

Nên sao lưu JSON trước khi tiếp tục.

[ Hủy ]
[ Tôi hiểu, xóa tất cả ]
```

Trước reset:

```text
create IndexedDB snapshot
reason = before_reset
```

---

# 61. RESET DEVICE ACCESS

`Khóa lại` chỉ xóa:

```text
bap_con_access_v1
```

Không xóa:

```text
bap_con_progress_v3
IndexedDB backups
```

---

# 62. XÓA DỮ LIỆU TRÊN THIẾT BỊ

Action này mới xóa:

```text
localStorage
IndexedDB
access gate
```

Sau đó không thể phục hồi trừ khi có JSON backup bên ngoài.

UI phải cảnh báo:

```text
Nếu chưa xuất file backup, dữ liệu có thể mất hoàn toàn.
```

---

# 63. MANUAL SNAPSHOT

Button:

```text
Tạo snapshot cục bộ
```

Khi bấm:

```text
save current progress into IndexedDB
```

Toast:

```text
Đã lưu một bản dự phòng trên thiết bị này.
```

---

# 64. QUẢN LÝ SNAPSHOT

Có thể có modal:

```text
Bản dự phòng trên thiết bị
```

Hiển thị 5–10 bản gần nhất:

```text
11/09/2026 15:08
Tự động — sau khi nhận quà

10/09/2026 21:14
Trước khi import
```

Có nút:

```text
[ Khôi phục ]
```

---

# 65. SNAPSHOT RESTORE

Trước restore snapshot:

```text
snapshot current state
```

rồi mới restore.

Như vậy có thể quay lại nếu chọn nhầm.

---

# 66. FILE SYSTEM ACCESS API — OPTIONAL

Không bắt buộc.

Trên browser Chromium hỗ trợ, có thể cho user chọn một file backup cố định.

Sau khi user cấp quyền:

```text
Save backup to selected file
```

Nhưng:

- Safari/iOS hỗ trợ hạn chế;
- không dùng làm cơ chế chính.

Core vẫn phải là:

```text
localStorage + IndexedDB + Export JSON
```

---

# 67. SERVICE WORKER

Có thể cache:

- HTML;
- JS;
- CSS;
- images.

Không dùng Service Worker Cache làm nơi lưu progress chính.

Progress vẫn phải ở:

```text
localStorage / IndexedDB
```

---

# 68. KHÔNG GỬI EMAIL

Bỏ toàn bộ:

```text
GMAIL_USER
GMAIL_APP_PASSWORD
REWARD_EMAIL_TO
Nodemailer
SMTP
email templates
email retry
email status
```

Không cần ENV cho reward system.

---

# 69. KHÔNG DÙNG DATABASE CLOUD

Bỏ toàn bộ:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
reward_ledger table
user_progress table
cloud sync
cloud reconciliation
RLS
server auth
```

---

# 70. KHÔNG CẦN API ROUTE

Không tạo:

```text
/api/rewards/claim
/api/rewards/resend-email
```

Claim xử lý client-side.

Project tiếp tục có thể:

```text
output: "export"
```

nếu source hiện tại đang dùng static export.

---

# 71. VERCEL ENV

Reward system không cần thêm ENV.

Không cần cấu hình:

```text
Gmail
Supabase
SMTP
```

Vercel chỉ deploy static frontend.

---

# 72. OFFLINE

Do toàn bộ dữ liệu ở client:

- học được offline nếu asset đã cache;
- reward hoạt động offline;
- reveal hoạt động offline;
- claim hoạt động offline;
- backup IndexedDB hoạt động offline.

---

# 73. DATA PERSISTENCE FLOW

Khi user thao tác:

```text
state in memory
↓
localStorage
↓
UI updated
```

Khi sự kiện quan trọng:

```text
complete exam
unlock reward
reveal reward
claim reward
import
reset
```

thêm:

```text
IndexedDB snapshot
```

---

# 74. VALIDATE LOCAL PROGRESS

Startup:

```ts
try {
  const raw = localStorage.getItem("bap_con_progress_v3");
  const parsed = JSON.parse(raw!);

  validateProgressV3(parsed);
} catch {
  restoreLatestSnapshot();
}
```

Không crash app vì JSON lỗi.

---

# 75. CORRUPT DATA HANDLING

Nếu cả localStorage và IndexedDB đều lỗi:

```text
Không đọc được tiến trình cũ.
```

Cho user:

```text
[ Import file backup ]
[ Bắt đầu lại ]
```

Không tự reset ngay.

---

# 76. STORAGE SIZE

600 câu progress + history + reward state vẫn nhỏ so với giới hạn local storage thông thường.

Tuy nhiên:

- không lưu ảnh base64;
- không lưu video;
- không lưu source question duplicate;
- chỉ lưu ID và state.

Exam history nên giới hạn:

```text
100 lần gần nhất
```

Nhưng:

```text
mockPassCountLifetime
```

phải là counter riêng.

---

# 77. DATA MODEL GỢI Ý

```ts
type ProgressV3 = {
  version: 3;

  questions: Record<string, QuestionProgress>;

  stats: {
    mock: ModeStats;
    reaction: ModeStats;
    liet: ModeStats;
  };

  examHistory: ExamHistoryItem[];

  currentSession?: CurrentSession;

  rewards: {
    mockPassCountLifetime: number;

    items: Record<
      string,
      RewardProgress
    >;

    processedExamSessionIds: string[];
  };

  settings: {
    sound: boolean;
  };
};
```

---

# 78. HOMEPAGE THỨ TỰ

Gợi ý:

```text
Header
↓
Học tiếp
↓
Tiến độ 600 câu
↓
Quà gần nhất
↓
Thi thử hạng B
↓
Học 600 câu
↓
Câu hay sai
↓
60 câu điểm liệt
↓
20 bộ ôn
↓
Progress Tree quà
↓
Mèo Bông
↓
Cài đặt / Dữ liệu
```

---

# 79. REWARD BOX SUMMARY

```text
Hộp quà của Bắp

8 / 25 món đã mở
5 món đã nhận

🎁 Quà gần nhất:
Còn 2 chặng nữa

[ Xem tất cả ]
```

Không show giá trị.

---

# 80. RESPONSIVE SUMMARY

## Mobile

```text
1 column
vertical tree
bottom sheet
full-width actions
```

## Tablet

```text
2 columns
scrollable tree
medium modal
```

## Desktop

```text
3–4 columns
horizontal tree
center modal
```

---

# 81. PREFERS REDUCED MOTION

```css
@media (prefers-reduced-motion: reduce) {
  .reward-confetti,
  .reward-pop,
  .reward-shake {
    animation: none !important;
    transition: none !important;
  }
}
```

---

# 82. ERROR UX

Không hiện:

```text
JSON parse error
IndexedDB transaction failed
```

Thay bằng:

```text
Bản lưu này đang có vấn đề.
Bắp thử chọn bản backup khác nha.
```

Developer có thể log kỹ thuật trong console.

---

# 83. BACKUP REMINDER

Vì không có cloud, nên thỉnh thoảng nhắc nhẹ:

```text
Lâu rồi chưa sao lưu nè.

[ Tải file backup ]
```

Không popup liên tục.

Gợi ý:

```text
14–30 ngày chưa export
```

hoặc:

```text
sau 5 reward claimed mà chưa export
```

---

# 84. LAST EXPORT METADATA

Lưu:

```ts
settings.lastExportAt
```

để biết khi nào cần nhắc.

---

# 85. REWARD CLAIM + SNAPSHOT

Sau claim:

```text
set claimed
↓
save localStorage
↓
create snapshot
↓
show success
```

Nếu snapshot fail:

- claim vẫn giữ trong localStorage;
- show warning nhẹ trong Settings;
- không rollback reward.

---

# 86. PRESET REWARD

Mỗi preset chỉ unlock một lần:

```ts
if (
  qualified &&
  reward.status === "locked"
) {
  unlock();
}
```

Không unlock lại khi retry.

---

# 87. LIỆT REWARD

```text
60/60 lần đầu
→ unlock
```

Lần sau:

```text
không tạo reward mới
```

---

# 88. MOCK MILESTONE REWARD

Ví dụ:

```text
mockPassCountLifetime = 19
↓
PASS thêm 1 bài
↓
20
↓
unlock mock-pass-20
```

Không phụ thuộc examHistory còn giữ bao nhiêu bài.

---

# 89. KHÔNG TÍNH FAIL

```text
score < 27
```

hoặc:

```text
lietWrong === true
```

→ không tăng `mockPassCountLifetime`.

---

# 90. KHÔNG TÍNH SUBMIT TRÙNG

Dùng `sessionId`.

Nếu cùng bài bị submit lại do refresh:

```text
processedExamSessionIds.includes(sessionId)
```

→ không tăng counter.

---

# 91. UI “ĐÃ NHẬN”

Không cho đổi ngược từ:

```text
claimed
```

về:

```text
revealed
```

trong UI thường.

Nếu muốn sửa nhầm:

- dùng restore backup;
- hoặc hidden developer mode.

---

# 92. DEVELOPER MODE — OPTIONAL

Không bắt buộc.

Có thể có dev-only helper:

```text
?debugRewards=1
```

chỉ trong development.

Không build vào Production UI.

Dùng để:

- unlock thử;
- reveal thử;
- reset thử.

---

# 93. TEST CASE — REWARD

Bắt buộc test:

```text
preset pass lần 1 → unlock
preset pass lần 2 → không duplicate

liet 59/60 → không unlock
liet 60/60 → unlock

mock pass #1 → unlock mốc 1
mock pass #2–4 → không unlock mới
mock pass #5 → unlock mốc 5
mock pass #20 → unlock mốc 20
mock pass #40 → unlock mốc 40
mock pass #41 → không reward mới
```

---

# 94. TEST CASE — STORAGE

```text
reload → data còn
restart browser → data còn
localStorage lỗi → restore IndexedDB
import valid JSON → restore
import invalid JSON → reject
reset học → reward claimed còn
xóa tất cả → mọi data mất
```

---

# 95. TEST CASE — RESPONSIVE

Test tối thiểu:

```text
iPhone SE width
iPhone 14/15 width
Android ~360px
iPad portrait
iPad landscape
1366px laptop
1920px desktop
```

---

# 96. ACCEPTANCE CHECKLIST — LOGIC

- [ ] Đúng 25 rewards.
- [ ] 20 preset rewards unique.
- [ ] Có `liet-60`.
- [ ] Có mốc 1/5/20/40.
- [ ] Không reward sau 40.
- [ ] Reward chỉ unlock một lần.
- [ ] Mock pass lifetime riêng.
- [ ] Session submit không đếm trùng.
- [ ] Reward claimed không tự quay về locked.

---

# 97. ACCEPTANCE CHECKLIST — STORAGE

- [ ] `localStorage` hoạt động.
- [ ] `IndexedDB` mirror hoạt động.
- [ ] Có snapshot tự động.
- [ ] Có snapshot thủ công.
- [ ] Có restore snapshot.
- [ ] Có export JSON.
- [ ] Có import JSON.
- [ ] Có validation import.
- [ ] Có backup trước import/reset.
- [ ] `navigator.storage.persist()` được gọi khi hỗ trợ.
- [ ] Không dùng server/database.

---

# 98. ACCEPTANCE CHECKLIST — UI

- [ ] Locked reward không reveal.
- [ ] Unlocked reward có nút Mở quà.
- [ ] Revealed reward hiện quà thật.
- [ ] Claimed reward hiện ngày nhận.
- [ ] Có Hộp quà.
- [ ] Có tabs.
- [ ] Có progress tree.
- [ ] Mobile vertical timeline.
- [ ] Desktop horizontal timeline.
- [ ] Tablet responsive.
- [ ] Reduced motion.

---

# 99. ACCEPTANCE CHECKLIST — RESET

- [ ] Học lại từ đầu không xóa reward claimed.
- [ ] Khóa lại không xóa progress.
- [ ] Xóa dữ liệu thiết bị có cảnh báo.
- [ ] Reset toàn bộ tạo snapshot trước.
- [ ] Có thể import backup sau reset.

---

# 100. THỨ TỰ TRIỂN KHAI

## P0 — Core

1. Tạo `rewards.ts`.
2. Progress schema v3.
3. Migration v2 → v3.
4. Reward engine.
5. Lifetime mock pass.
6. Chống submit trùng.
7. Reward state machine.

## P1 — Storage

8. localStorage v3.
9. IndexedDB snapshot store.
10. Restore fallback.
11. Persist storage request.
12. Export JSON.
13. Import JSON.
14. Reset flows.

## P2 — UI

15. Reward home card.
16. Hộp quà.
17. Locked/unlocked/revealed/claimed cards.
18. Reveal animation.
19. Claim modal.
20. Progress tree preset.
21. Progress tree mock.
22. Responsive mobile/tablet/desktop.

## P3 — Polish

23. Backup reminder.
24. Snapshot history UI.
25. Reduced motion.
26. Accessibility.
27. QA toàn bộ.

---

# 101. FILES ĐỀ XUẤT

```text
data/
  rewards.ts

lib/
  reward-engine.ts
  reward-progress.ts
  progress-migrate-v3.ts
  local-storage.ts
  indexeddb-backup.ts
  progress-export.ts
  progress-import.ts

components/rewards/
  RewardHomeCard.tsx
  RewardGrid.tsx
  RewardCard.tsx
  RewardRevealModal.tsx
  RewardClaimModal.tsx
  RewardProgressTree.tsx
  MockRewardTimeline.tsx
  BackupReminder.tsx

app/rewards/
  page.tsx
```

Không cần:

```text
app/api/
lib/server/
mailer.ts
supabase-admin.ts
```

---

# 102. KHÔNG CẦN ENV

Không tạo:

```text
.env
GMAIL_*
SUPABASE_*
REWARD_EMAIL_*
```

Reward system phải hoạt động mà không cần Environment Variables.

---

# 103. STATIC EXPORT

Nếu project hiện dùng:

```ts
output: "export"
```

thì giữ nguyên nếu phù hợp.

Reward system phải tương thích static export.

Không thêm code bắt buộc Node server runtime.

---

# 104. KẾT QUẢ MONG MUỐN

Sau khi hoàn thành:

- Bắp có Hộp quà 25 món;
- quà chưa đạt luôn bí mật;
- có progress tree rõ ràng;
- biết còn bao nhiêu chặng đến quà tiếp theo;
- mở quà có animation đẹp;
- xác nhận quà đã nhận;
- progress và reward tồn tại qua reload/restart;
- localStorage hỏng còn có IndexedDB snapshot;
- có thể export/import JSON;
- có thể reset học mà giữ reward;
- có thể reset toàn bộ khi thật sự muốn;
- không cần database;
- không cần email;
- không cần API;
- không cần `.env`;
- deploy thuần static trên Vercel.

---

# 105. NGUYÊN TẮC CUỐI CHO AGENT

1. Không thêm cloud database.
2. Không thêm Supabase/Firebase.
3. Không thêm Gmail / App Password.
4. Không thêm API server.
5. Không thêm ENV cho reward.
6. Không thay nội dung 600 câu.
7. Không sửa answer key.
8. Không reveal reward locked.
9. Không đếm mock PASS trùng.
10. Không reset reward claimed khi chỉ reset học.
11. Luôn tạo snapshot trước import/reset.
12. Luôn validate JSON trước overwrite.
13. Giữ static deployment.
14. Test mobile/tablet/desktop.
15. Giữ tone thân thương, ngắn, tự nhiên.

---

## CHỐT KIẾN TRÚC

```text
PURE STATIC WEBSITE
       │
       ├── localStorage
       │
       ├── IndexedDB snapshots
       │
       ├── Export JSON
       │
       └── Import JSON
```

Không cloud.

Không mail.

Không server database.

Không ENV.

Không persistent server RAM.

Đây là kiến trúc cuối cùng cho phase reward hiện tại.
