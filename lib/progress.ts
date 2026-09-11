import type { PracticeMode, Question } from "./exam";

export const PROGRESS_KEY = "bap_con_progress_v2";
export const ACCESS_KEY = "bap_con_access_v1";
export const PROGRESS_VERSION = 2;

export type QuestionProgress = {
  attempts: number;
  correctCount: number;
  wrongCount: number;
  lastAnswer: number | null;
  lastCorrect: boolean | null;
  seen: boolean;
  mastered: boolean;
  lastAnsweredAt: string | null;
};

export type ModeProgress = {
  attempts: number;
  bestScore: number;
  lastScore: number;
  total: number;
};

export type ProgressSessionMode = PracticeMode | "weak";

export type CurrentSession = {
  id: string;
  mode: ProgressSessionMode;
  title: string;
  questionIds: number[];
  currentIndex: number;
  answers: Record<string, number | null>;
  startedAt: string;
  timer: "question" | "exam" | "none";
  remainingSeconds: number | null;
  timeLimitSeconds: number | null;
  presetId?: number;
};

export type ExamHistoryEntry = {
  id: string;
  type: ProgressSessionMode;
  score: number;
  total: number;
  passed: boolean | null;
  questionIds: number[];
  wrongQuestionIds: number[];
  createdAt: string;
};

export type ProgressData = {
  version: 2;
  profile: { name: string };
  questions: Record<string, QuestionProgress>;
  stats: {
    mock: ModeProgress;
    reaction: ModeProgress;
    liet: ModeProgress;
  };
  examHistory: ExamHistoryEntry[];
  currentSession: CurrentSession | null;
  settings: { sound: boolean };
};

const EMPTY_MODE_STATS = {
  mock: { attempts: 0, bestScore: 0, lastScore: 0, total: 30 },
  reaction: { attempts: 0, bestScore: 0, lastScore: 0, total: 30 },
  liet: { attempts: 0, bestScore: 0, lastScore: 0, total: 60 },
};

export function createDefaultProgress(sound = true): ProgressData {
  return {
    version: PROGRESS_VERSION,
    profile: { name: "Bắp" },
    questions: {},
    stats: {
      mock: { ...EMPTY_MODE_STATS.mock },
      reaction: { ...EMPTY_MODE_STATS.reaction },
      liet: { ...EMPTY_MODE_STATS.liet },
    },
    examHistory: [],
    currentSession: null,
    settings: { sound },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function validateQuestionProgress(value: unknown, id: string) {
  if (!isRecord(value)) throw new Error(`Invalid progress for question ${id}`);
  const numericFields = ["attempts", "correctCount", "wrongCount"];
  numericFields.forEach((field) => {
    if (!isInteger(value[field]) || (value[field] as number) < 0) {
      throw new Error(`Invalid ${field} for question ${id}`);
    }
  });
  if ((value.correctCount as number) > (value.attempts as number)) {
    throw new Error(`Correct answers exceed attempts for question ${id}`);
  }
  if ((value.wrongCount as number) > (value.attempts as number)) {
    throw new Error(`Wrong answers exceed attempts for question ${id}`);
  }
  if (
    value.lastAnswer !== null &&
    (!isInteger(value.lastAnswer) || (value.lastAnswer as number) < 0 || (value.lastAnswer as number) > 3)
  ) {
    throw new Error(`Invalid answer for question ${id}`);
  }
  if (value.lastCorrect !== null && typeof value.lastCorrect !== "boolean") {
    throw new Error(`Invalid lastCorrect for question ${id}`);
  }
  if (typeof value.seen !== "boolean" || typeof value.mastered !== "boolean") {
    throw new Error(`Invalid flags for question ${id}`);
  }
  if (value.lastAnsweredAt !== null && typeof value.lastAnsweredAt !== "string") {
    throw new Error(`Invalid timestamp for question ${id}`);
  }
}

function validateModeStats(value: unknown, mode: string) {
  if (!isRecord(value)) throw new Error(`Invalid ${mode} stats`);
  ["attempts", "bestScore", "lastScore", "total"].forEach((field) => {
    if (!isInteger(value[field]) || (value[field] as number) < 0) {
      throw new Error(`Invalid ${field} in ${mode} stats`);
    }
  });
  if ((value.bestScore as number) > (value.total as number) || (value.lastScore as number) > (value.total as number)) {
    throw new Error(`Score exceeds total in ${mode} stats`);
  }
  const expectedTotal = mode === "liet" ? 60 : 30;
  if (value.total !== expectedTotal) throw new Error(`Unexpected total in ${mode} stats`);
}

function validateCurrentSession(value: unknown) {
  if (!isRecord(value)) throw new Error("Invalid current session");
  if (typeof value.id !== "string" || typeof value.title !== "string") throw new Error("Invalid current session identity");
  if (!["reaction", "mock", "full", "preset", "liet", "chapter", "weak"].includes(String(value.mode))) throw new Error("Invalid current session mode");
  if (!Array.isArray(value.questionIds) || value.questionIds.length === 0 || value.questionIds.length > 600) throw new Error("Invalid current session questions");
  const ids = value.questionIds as unknown[];
  if (ids.some((id) => !isInteger(id) || id < 1 || id > 600) || new Set(ids).size !== ids.length) throw new Error("Invalid current session question IDs");
  if (!isInteger(value.currentIndex) || value.currentIndex < 0 || value.currentIndex >= ids.length) throw new Error("Invalid current session index");
  if (!isRecord(value.answers)) throw new Error("Invalid current session answers");
  Object.entries(value.answers).forEach(([id, answer]) => {
    if (!/^\d+$/.test(id) || !ids.includes(Number(id))) throw new Error("Answer is not in current session");
    if (answer !== null && (!isInteger(answer) || answer < 0 || answer > 3)) throw new Error("Invalid current session answer");
  });
  if (value.timer !== "question" && value.timer !== "exam" && value.timer !== "none") throw new Error("Invalid current session timer");
  if (value.remainingSeconds !== null && (!isInteger(value.remainingSeconds) || value.remainingSeconds < 0)) throw new Error("Invalid remaining time");
  if (value.timeLimitSeconds !== null && (!isInteger(value.timeLimitSeconds) || value.timeLimitSeconds < 0)) throw new Error("Invalid time limit");
  if (typeof value.startedAt !== "string") throw new Error("Invalid session timestamp");
}

function validateHistoryEntry(value: unknown) {
  if (!isRecord(value)) throw new Error("Invalid history entry");
  if (typeof value.id !== "string" || typeof value.type !== "string") throw new Error("Invalid history identity");
  if (!isInteger(value.score) || !isInteger(value.total) || value.score < 0 || value.total <= 0 || value.score > value.total) throw new Error("Invalid history score");
  if (!Array.isArray(value.questionIds) || !Array.isArray(value.wrongQuestionIds) || typeof value.createdAt !== "string") throw new Error("Invalid history details");
}

export function validateProgress(value: unknown): asserts value is ProgressData {
  if (!isRecord(value) || value.version !== PROGRESS_VERSION) {
    throw new Error("Unsupported progress version");
  }
  if (!isRecord(value.profile) || typeof value.profile.name !== "string") {
    throw new Error("Invalid profile");
  }
  if (!isRecord(value.questions)) throw new Error("Invalid questions object");
  Object.entries(value.questions).forEach(([id, question]) => {
    const numericId = Number(id);
    if (!/^\d+$/.test(id) || !Number.isInteger(numericId) || numericId < 1 || numericId > 600) {
      throw new Error(`Invalid question ID ${id}`);
    }
    validateQuestionProgress(question, id);
  });
  if (!isRecord(value.stats)) throw new Error("Invalid stats object");
  validateModeStats(value.stats.mock, "mock");
  validateModeStats(value.stats.reaction, "reaction");
  validateModeStats(value.stats.liet, "liet");
  if (!Array.isArray(value.examHistory) || value.examHistory.length > 100) {
    throw new Error("Invalid exam history");
  }
  value.examHistory.forEach(validateHistoryEntry);
  if (value.currentSession !== null) validateCurrentSession(value.currentSession);
  if (!isRecord(value.settings) || typeof value.settings.sound !== "boolean") {
    throw new Error("Invalid settings");
  }
}

function normalizeQuestionProgress(value: unknown): QuestionProgress {
  const item = isRecord(value) ? value : {};
  const attemptsValue = item.attempts;
  const correctValue = item.correctCount;
  const wrongValue = item.wrongCount;
  const attempts = isInteger(attemptsValue) && attemptsValue >= 0 ? attemptsValue : 0;
  const correctCount = isInteger(correctValue) && correctValue >= 0 ? Math.min(correctValue, attempts) : 0;
  const wrongCount = isInteger(wrongValue) && wrongValue >= 0 ? Math.min(wrongValue, attempts) : Math.max(0, attempts - correctCount);
  const lastAnswer = item.lastAnswer === null || item.lastAnswer === undefined
    ? null
    : isInteger(item.lastAnswer) && item.lastAnswer >= 0 && item.lastAnswer <= 3 ? item.lastAnswer : null;
  const lastCorrect = typeof item.lastCorrect === "boolean" ? item.lastCorrect : null;
  return {
    attempts,
    correctCount,
    wrongCount,
    lastAnswer,
    lastCorrect,
    seen: item.seen === true || attempts > 0,
    mastered: item.mastered === true && attempts >= 2 && correctCount >= 2 && lastCorrect === true,
    lastAnsweredAt: typeof item.lastAnsweredAt === "string" ? item.lastAnsweredAt : null,
  };
}

export function normalizeProgress(value: unknown, soundFallback = true): ProgressData {
  const fallback = createDefaultProgress(soundFallback);
  if (!isRecord(value) || value.version !== PROGRESS_VERSION) return fallback;

  const questions: Record<string, QuestionProgress> = {};
  if (isRecord(value.questions)) {
    Object.entries(value.questions).forEach(([id, item]) => {
      const numericId = Number(id);
      if (/^\d+$/.test(id) && numericId >= 1 && numericId <= 600) {
        questions[id] = normalizeQuestionProgress(item);
      }
    });
  }

  const stats = { ...fallback.stats };
  (Object.keys(stats) as Array<keyof typeof stats>).forEach((mode) => {
    const raw = isRecord(value.stats) && isRecord(value.stats[mode]) ? value.stats[mode] : {};
    const total = stats[mode].total;
    const bestScore = isInteger(raw.bestScore) ? Math.max(0, Math.min(raw.bestScore, total)) : 0;
    const lastScore = isInteger(raw.lastScore) ? Math.max(0, Math.min(raw.lastScore, total)) : 0;
    stats[mode] = {
      attempts: isInteger(raw.attempts) ? Math.max(0, raw.attempts) : 0,
      bestScore,
      lastScore,
      total,
    };
  });

  return {
    ...fallback,
    profile: { name: isRecord(value.profile) && typeof value.profile.name === "string" ? value.profile.name : "Bắp" },
    questions,
    stats,
    examHistory: Array.isArray(value.examHistory) ? value.examHistory.slice(-100) as ExamHistoryEntry[] : [],
    currentSession: isRecord(value.currentSession) ? value.currentSession as unknown as CurrentSession : null,
    settings: {
      sound: isRecord(value.settings) && typeof value.settings.sound === "boolean" ? value.settings.sound : soundFallback,
    },
  };
}

export function loadProgress(): ProgressData {
  if (typeof window === "undefined") return createDefaultProgress();
  let soundFallback = true;
  try {
    const oldSound = window.localStorage.getItem("bap_con_sound");
    if (oldSound !== null) soundFallback = oldSound === "true";
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return createDefaultProgress(soundFallback);
    const parsed: unknown = JSON.parse(raw);
    const progress = normalizeProgress(parsed, soundFallback);
    validateProgress(progress);
    return progress;
  } catch {
    try {
      const corrupt = window.localStorage.getItem(PROGRESS_KEY);
      if (corrupt) window.localStorage.setItem(`${PROGRESS_KEY}_corrupt_${Date.now()}`, corrupt);
    } catch {
      // Private browsing may reject all storage operations.
    }
    return createDefaultProgress(soundFallback);
  }
}

export function saveProgress(progress: ProgressData) {
  if (typeof window === "undefined") return;
  try {
    validateProgress(progress);
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Keep the in-memory state usable when storage is unavailable.
  }
}

export function updateQuestionProgress(
  progress: ProgressData,
  questionId: number,
  answer: number,
  isCorrect: boolean,
  answeredAt = new Date().toISOString(),
): ProgressData {
  const key = String(questionId);
  const previous = progress.questions[key] ?? {
    attempts: 0,
    correctCount: 0,
    wrongCount: 0,
    lastAnswer: null,
    lastCorrect: null,
    seen: false,
    mastered: false,
    lastAnsweredAt: null,
  };
  const attempts = previous.attempts + 1;
  const correctCount = previous.correctCount + (isCorrect ? 1 : 0);
  const wrongCount = previous.wrongCount + (isCorrect ? 0 : 1);
  const nextQuestion: QuestionProgress = {
    attempts,
    correctCount,
    wrongCount,
    lastAnswer: answer,
    lastCorrect: isCorrect,
    seen: true,
    mastered: attempts >= 2 && correctCount >= 2 && isCorrect,
    lastAnsweredAt: answeredAt,
  };
  return {
    ...progress,
    questions: { ...progress.questions, [key]: nextQuestion },
  };
}

export function updateModeProgress(
  progress: ProgressData,
  mode: "mock" | "reaction" | "liet",
  score: number,
  total: number,
): ProgressData {
  const current = progress.stats[mode];
  const safeScore = Math.max(0, Math.min(score, total));
  return {
    ...progress,
    stats: {
      ...progress.stats,
      [mode]: {
        attempts: current.attempts + 1,
        bestScore: Math.max(current.bestScore, safeScore),
        lastScore: safeScore,
        total,
      },
    },
  };
}

export function getProgressSummary(questionBank: Question[], progress: ProgressData) {
  const records = questionBank.map((question) => progress.questions[String(question.id)]);
  const seen = records.filter((record) => record?.seen === true).length;
  const correct = records.filter((record) => (record?.correctCount ?? 0) > 0).length;
  const mastered = records.filter((record) => record?.mastered === true).length;
  const needsReview = records.filter((record) => (record?.wrongCount ?? 0) > 0 && record?.mastered !== true).length;
  return { seen, correct, mastered, needsReview, unseen: questionBank.length - seen };
}

export function getChapterSummary(questionBank: Question[], progress: ProgressData, chapter: number) {
  return getProgressSummary(questionBank.filter((question) => question.chapter === chapter), progress);
}

export function getWeakQuestions(questionBank: Question[], progress: ProgressData) {
  return questionBank
    .filter((question) => (progress.questions[String(question.id)]?.wrongCount ?? 0) > 0)
    .sort((left, right) => {
      const a = progress.questions[String(left.id)];
      const b = progress.questions[String(right.id)];
      return (b?.wrongCount ?? 0) - (a?.wrongCount ?? 0)
        || String(b?.lastAnsweredAt ?? "").localeCompare(String(a?.lastAnsweredAt ?? ""));
    });
}
