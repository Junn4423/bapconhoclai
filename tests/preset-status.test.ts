import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultProgress, type ExamHistoryEntry, type ProgressData } from "../lib/progress";
import { buildPresetExams, type PresetExam } from "../lib/exam";
import questionData from "../data/questions.json";

const QUESTION_BANK = questionData.questions as any[];
const presets = buildPresetExams(QUESTION_BANK);

// Reusable logic identical to getPresetStatus in PresetPicker
function getPresetStatus(
  presetsList: PresetExam[],
  progress: ProgressData,
  presetId: number,
): { status: "passed" | "failed" | "none"; score?: number; total?: number; reason?: string } {
  const preset = presetsList.find((p) => p.id === presetId);
  const entries = progress.examHistory.filter((entry) => {
    if (entry.type !== "preset") return false;
    if (entry.presetId === presetId) return true;
    if (preset && entry.questionIds.length === preset.questions.length) {
      return preset.questionIds.every((qid) => entry.questionIds.includes(qid));
    }
    return false;
  });

  if (!entries.length) return { status: "none" };

  const passedEntries = entries.filter((entry) => entry.passed === true);
  if (passedEntries.length > 0) {
    const best = passedEntries.reduce((max, curr) => (curr.score > max.score ? curr : max), passedEntries[0]);
    return { status: "passed", score: best.score, total: best.total };
  }

  const latest = entries[entries.length - 1];
  const wrongCount = latest.wrongQuestionIds.length;
  const lietWrong = latest.wrongQuestionIds.some((qid) => {
    const q = QUESTION_BANK.find((item) => item.id === qid);
    return q?.isLiet;
  });
  return {
    status: "failed",
    score: latest.score,
    total: latest.total,
    reason: lietWrong ? "Dính câu điểm liệt" : `Sai ${wrongCount} câu`,
  };
}

test("Preset status: returns 'none' when preset has never been taken", () => {
  const progress = createDefaultProgress();
  const status = getPresetStatus(presets, progress, 1);
  assert.equal(status.status, "none");
});

test("Preset status (Lỗi 2): retains 'passed' status even if user re-takes and fails later", () => {
  const progress = createDefaultProgress();
  const preset1 = presets[0];

  // First attempt: PASSED (28/30)
  progress.examHistory.push({
    id: "preset-attempt-1",
    type: "preset",
    presetId: 1,
    score: 28,
    total: 30,
    passed: true,
    questionIds: preset1.questionIds,
    wrongQuestionIds: preset1.questionIds.slice(0, 2),
    createdAt: "2026-09-10T10:00:00.000Z",
  });

  let status = getPresetStatus(presets, progress, 1);
  assert.equal(status.status, "passed");
  assert.equal(status.score, 28);

  // Second attempt (a few days later): FAILED (24/30)
  progress.examHistory.push({
    id: "preset-attempt-2",
    type: "preset",
    presetId: 1,
    score: 24,
    total: 30,
    passed: false,
    questionIds: preset1.questionIds,
    wrongQuestionIds: preset1.questionIds.slice(0, 6),
    createdAt: "2026-09-14T08:00:00.000Z",
  });

  // MUST STILL BE PASSED! Regress bug prevented!
  status = getPresetStatus(presets, progress, 1);
  assert.equal(status.status, "passed");
  assert.equal(status.score, 28);
});

test("Preset status: records highest score among multiple passed attempts", () => {
  const progress = createDefaultProgress();
  const preset2 = presets[1];

  progress.examHistory.push({
    id: "preset-2-att-1",
    type: "preset",
    presetId: 2,
    score: 27,
    total: 30,
    passed: true,
    questionIds: preset2.questionIds,
    wrongQuestionIds: preset2.questionIds.slice(0, 3),
    createdAt: "2026-09-11T10:00:00.000Z",
  });

  progress.examHistory.push({
    id: "preset-2-att-2",
    type: "preset",
    presetId: 2,
    score: 30,
    total: 30,
    passed: true,
    questionIds: preset2.questionIds,
    wrongQuestionIds: [],
    createdAt: "2026-09-12T10:00:00.000Z",
  });

  const status = getPresetStatus(presets, progress, 2);
  assert.equal(status.status, "passed");
  assert.equal(status.score, 30);
});

test("Preset status (Lỗi 7): correctly recognizes older history records where presetId was undefined", () => {
  const progress = createDefaultProgress();
  const preset3 = presets[2];

  // Old record without presetId field
  progress.examHistory.push({
    id: "preset-old-session-123",
    type: "preset",
    // presetId: undefined,
    score: 29,
    total: 30,
    passed: true,
    questionIds: [...preset3.questionIds],
    wrongQuestionIds: [preset3.questionIds[0]],
    createdAt: "2026-09-01T10:00:00.000Z",
  });

  const status = getPresetStatus(presets, progress, 3);
  assert.equal(status.status, "passed");
  assert.equal(status.score, 29);
});

test("Preset status: shows failure reason when failed due to liet question", () => {
  const progress = createDefaultProgress();
  const preset4 = presets[3];
  const lietQuestion = preset4.questions.find((q) => q.isLiet);

  if (lietQuestion) {
    progress.examHistory.push({
      id: "preset-4-att-liet",
      type: "preset",
      presetId: 4,
      score: 28,
      total: 30,
      passed: false,
      questionIds: preset4.questionIds,
      wrongQuestionIds: [lietQuestion.id],
      createdAt: "2026-09-13T10:00:00.000Z",
    });

    const status = getPresetStatus(presets, progress, 4);
    assert.equal(status.status, "failed");
    assert.equal(status.reason, "Dính câu điểm liệt");
  }
});

test("Preset status: shows failure reason when failed due to wrong count (no liet)", () => {
  const progress = createDefaultProgress();
  const preset4 = presets[3];
  const nonLietWrongIds = preset4.questions.filter((q) => !q.isLiet).slice(0, 5).map((q) => q.id);

  progress.examHistory.push({
    id: "preset-4-att-wrong",
    type: "preset",
    presetId: 4,
    score: 25,
    total: 30,
    passed: false,
    questionIds: preset4.questionIds,
    wrongQuestionIds: nonLietWrongIds,
    createdAt: "2026-09-13T10:00:00.000Z",
  });

  const status = getPresetStatus(presets, progress, 4);
  assert.equal(status.status, "failed");
  assert.equal(status.score, 25);
  assert.equal(status.reason, `Sai ${nonLietWrongIds.length} câu`);
});
