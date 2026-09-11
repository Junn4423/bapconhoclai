# Dataset giải thích Chương V — Bộ 600 câu sát hạch

## Mục đích

Bổ sung **lớp giải thích học tập** cho Chương V (câu 301–485) của bộ 600 câu hiện tại, đặc biệt các câu có nhiều biển `Biển 1 / Biển 2 / Biển 3 / Biển 4`.

Dataset **không thay đổi**:

- nội dung câu hỏi;
- thứ tự đáp án;
- `correct`;
- `isLiet`;
- ảnh;
- chapter.

## Nguồn chính

1. **Cục Cảnh sát giao thông — Bộ Công an**, Công văn 2262/CSGT-P5 ngày 07/05/2025 về sử dụng bộ 600 câu hỏi sát hạch GPLX.
2. **QCVN 41:2024/BGTVT — Quy chuẩn kỹ thuật quốc gia về báo hiệu đường bộ**, ban hành kèm Thông tư 51/2024/TT-BGTVT, hiệu lực từ 01/01/2025.
3. PDF `600-cau-hoi-sat-hach.pdf` có trong repo được dùng làm nguồn câu hỏi/đáp án và hình minh họa.

Official URLs nằm trong `sources` của file dataset.

## File

### `chapter5_explanations_qcvn41_2024.json`

Dataset giàu metadata, merge theo `id`.

Mỗi entry trong dataset nguồn có thể gồm:

```json
{
  "id": 301,
  "chapter": 5,
  "correctIndex": 0,
  "correctAnswerText": "Biển 1.",
  "explanation": "...",
  "whyCorrect": "...",
  "signExplanations": [
    {
      "label": "Biển 1",
      "code": "P.103a",
      "name": "Cấm xe ô tô",
      "meaning": "..."
    }
  ],
  "memoryTip": "...",
  "qcvnRefs": ["P.103a"],
  "confidence": "high"
}
```

### `questions_with_chapter5_explanations.json`

Bản **600 câu đã merge sẵn**, giữ nguyên các field nguồn và chỉ thêm explanation vào câu 301–485.

Khi merge vào app, dữ liệu được chuẩn hóa thành:

```ts
type VisualExplanation = {
  label: string;
  code?: string;
  name: string;
  meaning: string;
};

type QuestionExplanation = {
  summary: string;
  whyCorrect: string;
  visualExplanations?: VisualExplanation[];
  memoryTip?: string;
};
```

Vì vậy UI có thể hiển thị đúng từng `Biển 1 / Biển 2 / Biển 3 / Biển 4` hoặc từng vạch: tên biển, mã biển nếu xác định được, ý nghĩa và lý do đáp án đúng. Không còn dùng `signExplanations` dạng phẳng trong question bank đã merge.

## Quy tắc bắt buộc khi build

`scripts/validate_question_explanations.py` chạy ở bước `prebuild` và làm build thất bại nếu:

- question bank không đủ đúng 600 câu hoặc ID không liên tục 1..600;
- câu Chương V thiếu `summary`, `whyCorrect` hoặc `visualExplanations`;
- câu có nhãn đánh số `Biển 1..4` / `Vạch 1..4` nhưng thiếu giải thích tương ứng;
- một visual explanation thiếu `label`, `name` hoặc `meaning`.

Rule này áp dụng theo nhãn xuất hiện trong câu hỏi và đáp án, không chỉ riêng các câu có nhiều biển.

Mã/tên biển được ghép vào đầu `meaning`.

### `validate_chapter5_explanations.py`

Script validate + merge.

Ví dụ:

```bash
python validate_chapter5_explanations.py \
  --questions data/questions.json \
  --dataset chapter5_explanations_qcvn41_2024.json
```

Tạo file merge:

```bash
python validate_chapter5_explanations.py \
  --questions data/questions.json \
  --dataset chapter5_explanations_qcvn41_2024.json \
  --out data/questions.with-explanations.json
```

## Kết quả validation tại thời điểm tạo

- Dataset entries: **185/185** câu Chương V (301–485).
- Câu có nhãn biển/vạch đánh số được phát hiện: **133**.
- Câu có nhãn biển/vạch đã có đủ giải thích từng label: **133/133**.
- `correctIndex` được copy từ question bank, không tự suy đoán lại answer key.
- Các protected field của 600 câu không bị thay đổi khi merge.

## Confidence / manual validation

Dataset phân biệt:

- `high`: mapping/tên/ý nghĩa biển có độ tin cậy cao từ hình + QCVN.
- `needs_manual_validation`: **đáp án vẫn giữ nguyên**, nhưng mã biến thể, cách gọi hoặc wording của phần giải thích nên được validator rà lại trước production.

Các ID cần rà thủ công được liệt kê trong:

```json
validation.manualValidationIds
```

Không nên xóa cờ này chỉ vì build pass.

## Yêu cầu validator nên kiểm tra thêm

Validator/AI Agent nhận bộ file này nên:

1. Đối chiếu từng `needs_manual_validation` với đúng hình trong PDF đề.
2. Đối chiếu mã/tên/ý nghĩa biển với QCVN 41:2024/BGTVT.
3. Không thay answer key nếu không có bằng chứng từ PDF chính thức.
4. Với câu nhiều biển, đảm bảo `Biển 1/2/3/4` khớp đúng **vị trí hình**, không chỉ khớp tên.
5. Kiểm tra wording dễ hiểu cho người học nhưng không đổi ý nghĩa pháp lý.
6. Nếu không chắc một mã biến thể, giữ diễn giải chức năng chính xác và đánh dấu cần review thay vì đoán.
7. Chạy script validator sau mỗi merge.

## Lưu ý

Đây là **dataset học tập bổ sung**, không phải văn bản pháp luật. QCVN và tài liệu CSGT là nguồn chuẩn khi có bất kỳ khác biệt nào.
