import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultProgress,
  updateQuestionProgress,
  changeQuestionProgress,
  changeVisualProgress,
  validateProgress,
} from "../lib/progress";
import type { Question } from "../lib/exam";

const sampleQuestion: Question = {
  id: 101,
  question: "Khi lái xe trên đường cao tốc, người lái xe phải làm gì?",
  options: ["Chạy tùy ý", "Tuân thủ tốc độ quy định", "Dừng xe giữa đường"],
  correct: 1, // Option B is correct
  chapter: 1,
  category: "law",
  categoryLabel: "Pháp luật giao thông",
  isLiet: false,
  images: [],
  sourcePage: 12,
  explanation: {
    summary: "Phải tuân thủ tốc độ.",
    whyCorrect: "Đảm bảo an toàn giao thông.",
    visualExplanations: [
      {
        label: "Biển P.127",
        code: "P.127",
        name: "Tốc độ tối đa cho phép",
        meaning: "Cấm các loại xe cơ giới chạy quá tốc độ quy định.",
      },
    ],
  },
};

test("Change progress (Lỗi 5): First answer increments attempts and sets counts", () => {
  const initial = createDefaultProgress();
  // Answering wrong (option 0, correct is 1)
  const updated = updateQuestionProgress(initial, sampleQuestion.id, 0, false);

  const qProgress = updated.questions[String(sampleQuestion.id)];
  assert.equal(qProgress.attempts, 1);
  assert.equal(qProgress.wrongCount, 1);
  assert.equal(qProgress.correctCount, 0);
  assert.equal(qProgress.lastAnswer, 0);
  assert.equal(qProgress.lastCorrect, false);
  assert.equal(qProgress.seen, true);

  // Validate that schema passes
  validateProgress(updated);
});

test("Change progress (Lỗi 5): Changing answer from wrong to correct DOES NOT increment attempts", () => {
  const initial = createDefaultProgress();
  // Step 1: User initially picks option 0 (wrong)
  const step1 = updateQuestionProgress(initial, sampleQuestion.id, 0, false);
  assert.equal(step1.questions[String(sampleQuestion.id)].attempts, 1);
  assert.equal(step1.questions[String(sampleQuestion.id)].wrongCount, 1);
  assert.equal(step1.questions[String(sampleQuestion.id)].correctCount, 0);

  // Step 2: User changes answer to option 1 (correct)
  const step2 = changeQuestionProgress(
    step1,
    sampleQuestion.id,
    0, // previous answer
    1, // new answer
    sampleQuestion.correct,
  );

  const qProgress = step2.questions[String(sampleQuestion.id)];
  // ATTEMPTS MUST STILL BE 1!
  assert.equal(qProgress.attempts, 1);
  // wrongCount is decremented, correctCount is incremented
  assert.equal(qProgress.wrongCount, 0);
  assert.equal(qProgress.correctCount, 1);
  assert.equal(qProgress.lastAnswer, 1);
  assert.equal(qProgress.lastCorrect, true);

  validateProgress(step2);
});

test("Change progress (Lỗi 5): Changing answer multiple times in one session never inflates attempts", () => {
  const initial = createDefaultProgress();
  // Initial answer: option 2 (wrong)
  let current = updateQuestionProgress(initial, sampleQuestion.id, 2, false);

  // Toggle to option 0 (still wrong)
  current = changeQuestionProgress(current, sampleQuestion.id, 2, 0, sampleQuestion.correct);
  assert.equal(current.questions[String(sampleQuestion.id)].attempts, 1);
  assert.equal(current.questions[String(sampleQuestion.id)].wrongCount, 1);
  assert.equal(current.questions[String(sampleQuestion.id)].correctCount, 0);

  // Toggle to option 1 (correct)
  current = changeQuestionProgress(current, sampleQuestion.id, 0, 1, sampleQuestion.correct);
  assert.equal(current.questions[String(sampleQuestion.id)].attempts, 1);
  assert.equal(current.questions[String(sampleQuestion.id)].wrongCount, 0);
  assert.equal(current.questions[String(sampleQuestion.id)].correctCount, 1);

  // Toggle back to option 2 (wrong)
  current = changeQuestionProgress(current, sampleQuestion.id, 1, 2, sampleQuestion.correct);
  assert.equal(current.questions[String(sampleQuestion.id)].attempts, 1);
  assert.equal(current.questions[String(sampleQuestion.id)].wrongCount, 1);
  assert.equal(current.questions[String(sampleQuestion.id)].correctCount, 0);

  validateProgress(current);
});

test("Change progress: Selecting identical option does not modify state", () => {
  const initial = createDefaultProgress();
  const step1 = updateQuestionProgress(initial, sampleQuestion.id, 1, true);
  const step2 = changeQuestionProgress(step1, sampleQuestion.id, 1, 1, sampleQuestion.correct);

  assert.equal(step1, step2);
});

test("Visual progress (Lỗi 5): Adjusts sign stats when answer changes", () => {
  const initial = createDefaultProgress();
  // Manually add sign entry with 1 wrong count
  const signKey = "code:P.127";
  initial.signs[signKey] = {
    label: "Biển P.127",
    code: "P.127",
    name: "Tốc độ tối đa cho phép",
    meaning: "Cấm chạy quá tốc độ.",
    wrongCount: 1,
    correctCount: 0,
    lastSeenAt: "2026-09-14T09:00:00.000Z",
  };

  // Change from wasCorrect=false to isCorrect=true
  const next = changeVisualProgress(initial, sampleQuestion, false, true);
  assert.equal(next.signs[signKey].wrongCount, 0);
  assert.equal(next.signs[signKey].correctCount, 1);

  // Change from wasCorrect=true to isCorrect=false
  const revert = changeVisualProgress(next, sampleQuestion, true, false);
  assert.equal(revert.signs[signKey].wrongCount, 1);
  assert.equal(revert.signs[signKey].correctCount, 0);
});
