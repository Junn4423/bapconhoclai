import type { PracticeMode, Question } from "./exam";
import { createDefaultRewards, unlockRewardsForMockCount, validateRewards, type RewardsState } from "./reward-engine";

export const PROGRESS_KEY = "bap_con_progress_v3";
export const LEGACY_PROGRESS_KEY = "bap_con_progress_v2";
export const ACCESS_KEY = "bap_con_access_v1";
export const PROGRESS_VERSION = 3;

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

export type VisualProgress = {
  label: string;
  code?: string;
  name: string;
  meaning: string;
  wrongCount: number;
  correctCount: number;
  lastSeenAt: string;
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
  presetId?: number;
};

export type ProgressData = {
  version: 3;
  profile: { name: string };
  questions: Record<string, QuestionProgress>;
  signs: Record<string, VisualProgress>;
  stats: {
    mock: ModeProgress;
    reaction: ModeProgress;
    liet: ModeProgress;
  };
  examHistory: ExamHistoryEntry[];
  currentSession: CurrentSession | null;
  rewards: RewardsState;
  settings: { sound: boolean; lastExportAt: string | null };
};

export type ProgressLoadResult = {
  progress: ProgressData;
  needsRecovery: boolean;
  migrated: boolean;
};

export type ProgressExport = {
  exportVersion: 3;
  exportedAt: string;
  progress: ProgressData;
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
    signs: {},
    stats: {
      mock: { ...EMPTY_MODE_STATS.mock },
      reaction: { ...EMPTY_MODE_STATS.reaction },
      liet: { ...EMPTY_MODE_STATS.liet },
    },
    examHistory: [],
    currentSession: null,
    rewards: createDefaultRewards(),
    settings: { sound, lastExportAt: null },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function validateQuestionIdList(value: unknown, label: string, allowEmpty = false) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.length > 600) {
    throw new Error(`Invalid ${label}`);
  }
  const ids = value as unknown[];
  if (ids.some((id) => !isInteger(id) || id < 1 || id > 600) || new Set(ids).size !== ids.length) {
    throw new Error(`Invalid ${label}`);
  }
  return ids as number[];
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
  if (value.lastAnsweredAt !== null && !isTimestamp(value.lastAnsweredAt)) {
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
  const ids = validateQuestionIdList(value.questionIds, "current session question IDs") as unknown[];
  if (!isInteger(value.currentIndex) || value.currentIndex < 0 || value.currentIndex >= ids.length) throw new Error("Invalid current session index");
  if (!isRecord(value.answers)) throw new Error("Invalid current session answers");
  Object.entries(value.answers).forEach(([id, answer]) => {
    if (!/^\d+$/.test(id) || !ids.includes(Number(id))) throw new Error("Answer is not in current session");
    if (answer !== null && (!isInteger(answer) || answer < 0 || answer > 3)) throw new Error("Invalid current session answer");
  });
  if (value.timer !== "question" && value.timer !== "exam" && value.timer !== "none") throw new Error("Invalid current session timer");
  if (value.remainingSeconds !== null && (!isInteger(value.remainingSeconds) || value.remainingSeconds < 0)) throw new Error("Invalid remaining time");
  if (value.timeLimitSeconds !== null && (!isInteger(value.timeLimitSeconds) || value.timeLimitSeconds < 0)) throw new Error("Invalid time limit");
  if (!isTimestamp(value.startedAt)) throw new Error("Invalid session timestamp");
}

function validateHistoryEntry(value: unknown) {
  if (!isRecord(value)) throw new Error("Invalid history entry");
  if (typeof value.id !== "string" || !value.id || !["reaction", "mock", "full", "preset", "liet", "chapter", "weak"].includes(String(value.type))) throw new Error("Invalid history identity");
  if (!isInteger(value.score) || !isInteger(value.total) || value.score < 0 || value.total <= 0 || value.score > value.total) throw new Error("Invalid history score");
  const questionIds = validateQuestionIdList(value.questionIds, "history question IDs");
  const wrongQuestionIds = validateQuestionIdList(value.wrongQuestionIds, "history wrong question IDs", true);
  if (wrongQuestionIds.some((id) => !questionIds.includes(id))) throw new Error("History wrong question is not in session");
  if (value.passed !== null && typeof value.passed !== "boolean") throw new Error("Invalid history result");
  if (!isTimestamp(value.createdAt)) throw new Error("Invalid history timestamp");
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
  if (!isRecord(value.signs)) throw new Error("Invalid visual progress object");
  Object.entries(value.signs).forEach(([key, sign]) => {
    if (!key || !isRecord(sign) || typeof sign.label !== "string" || typeof sign.name !== "string" || typeof sign.meaning !== "string" || !isInteger(sign.wrongCount) || !isInteger(sign.correctCount) || sign.wrongCount < 0 || sign.correctCount < 0 || !isTimestamp(sign.lastSeenAt)) {
      throw new Error(`Invalid visual progress for ${key}`);
    }
  });
  if (!isRecord(value.rewards)) throw new Error("Invalid rewards object");
  validateRewards(value.rewards);
  if (!isRecord(value.settings) || typeof value.settings.sound !== "boolean" || (value.settings.lastExportAt !== null && !isTimestamp(value.settings.lastExportAt))) {
    throw new Error("Invalid settings");
  }
  if (!isRecord(value.stats)) throw new Error("Invalid stats object");
  validateModeStats(value.stats.mock, "mock");
  validateModeStats(value.stats.reaction, "reaction");
  validateModeStats(value.stats.liet, "liet");
  if (!Array.isArray(value.examHistory) || value.examHistory.length > 100) {
    throw new Error("Invalid exam history");
  }
  value.examHistory.forEach(validateHistoryEntry);
  if (value.currentSession !== null) validateCurrentSession(value.currentSession);
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

function normalizeSigns(value: unknown): ProgressData["signs"] {
  if (!isRecord(value)) return {};
  const signs: ProgressData["signs"] = {};
  Object.entries(value).forEach(([key, raw]) => {
    if (!isRecord(raw) || typeof raw.label !== "string" || typeof raw.name !== "string" || typeof raw.meaning !== "string") return;
    signs[key] = {
      label: raw.label,
      ...(typeof raw.code === "string" && raw.code ? { code: raw.code } : {}),
      name: raw.name,
      meaning: raw.meaning,
      wrongCount: isInteger(raw.wrongCount) && raw.wrongCount >= 0 ? raw.wrongCount : 0,
      correctCount: isInteger(raw.correctCount) && raw.correctCount >= 0 ? raw.correctCount : 0,
      lastSeenAt: typeof raw.lastSeenAt === "string" ? raw.lastSeenAt : new Date(0).toISOString(),
    };
  });
  return signs;
}

function normalizeRewards(value: unknown): RewardsState {
  const fallback = createDefaultRewards();
  if (!isRecord(value)) return fallback;
  const items: RewardsState["items"] = {};
  if (isRecord(value.items)) {
    Object.entries(value.items).forEach(([rewardId, raw]) => {
      if (!isRecord(raw) || raw.rewardId !== rewardId || !["unlocked", "revealed", "claimed"].includes(String(raw.status))) return;
      items[rewardId] = {
        rewardId,
        status: raw.status as RewardsState["items"][string]["status"],
        ...(typeof raw.unlockedAt === "string" ? { unlockedAt: raw.unlockedAt } : {}),
        ...(typeof raw.revealedAt === "string" ? { revealedAt: raw.revealedAt } : {}),
        ...(typeof raw.claimedAt === "string" ? { claimedAt: raw.claimedAt } : {}),
        ...(isRecord(raw.trigger) ? { trigger: raw.trigger as RewardsState["items"][string]["trigger"] } : {}),
      };
    });
  }
  const processed = Array.isArray(value.processedExamSessionIds)
    ? value.processedExamSessionIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  return {
    mockPassCountLifetime: isInteger(value.mockPassCountLifetime) && value.mockPassCountLifetime >= 0 ? value.mockPassCountLifetime : 0,
    items,
    processedExamSessionIds: processed,
  };
}

function normalizeCore(value: Record<string, unknown>, soundFallback: boolean, rewards: RewardsState): ProgressData {
  const fallback = createDefaultProgress(soundFallback);
  const questions: Record<string, QuestionProgress> = {};
  if (isRecord(value.questions)) {
    Object.entries(value.questions).forEach(([id, item]) => {
      const numericId = Number(id);
      if (/^\d+$/.test(id) && numericId >= 1 && numericId <= 600) questions[id] = normalizeQuestionProgress(item);
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
    signs: normalizeSigns(value.signs),
    stats,
    examHistory: Array.isArray(value.examHistory) ? value.examHistory.slice(-100) as ExamHistoryEntry[] : [],
    currentSession: isRecord(value.currentSession) ? value.currentSession as unknown as CurrentSession : null,
    rewards,
    settings: {
      sound: isRecord(value.settings) && typeof value.settings.sound === "boolean" ? value.settings.sound : soundFallback,
      lastExportAt: isRecord(value.settings) && (value.settings.lastExportAt === null || typeof value.settings.lastExportAt === "string") ? value.settings.lastExportAt as string | null : null,
    },
  };
}

export function migrateProgressToV3(value: unknown, soundFallback = true): ProgressData {
  if (!isRecord(value) || value.version !== 2) return createDefaultProgress(soundFallback);
  const normalized = normalizeCore(value, soundFallback, createDefaultRewards());
  const seenMockSessionIds = new Set<string>();
  const successfulMockHistory = normalized.examHistory.filter((entry) => {
    if (entry.type !== "mock" || entry.passed !== true || seenMockSessionIds.has(entry.id)) return false;
    seenMockSessionIds.add(entry.id);
    return true;
  });
  const historicalMockPasses = successfulMockHistory.length;
  const lastHistoricalPass = successfulMockHistory[successfulMockHistory.length - 1];
  return {
    ...normalized,
    version: PROGRESS_VERSION,
    rewards: unlockRewardsForMockCount(normalized.rewards, historicalMockPasses, lastHistoricalPass?.createdAt),
  };
}

export function normalizeProgress(value: unknown, soundFallback = true): ProgressData {
  if (!isRecord(value)) return createDefaultProgress(soundFallback);
  if (value.version === 2) return migrateProgressToV3(value, soundFallback);
  if (value.version !== PROGRESS_VERSION) return createDefaultProgress(soundFallback);
  return normalizeCore(value, soundFallback, normalizeRewards(value.rewards));
}

function parseStoredProgress(raw: string, soundFallback: boolean) {
  const parsed: unknown = JSON.parse(raw);
  if (isRecord(parsed) && parsed.version === 2) {
    const migrated = migrateProgressToV3(parsed, soundFallback);
    validateProgress(migrated);
    return { progress: migrated, migrated: true };
  }
  if (isRecord(parsed) && parsed.version === PROGRESS_VERSION) {
    validateProgress(parsed);
    return { progress: parsed, migrated: false };
  }
  throw new Error("Unsupported stored progress version");
}

export function loadProgressState(): ProgressLoadResult {
  if (typeof window === "undefined") return { progress: createDefaultProgress(), needsRecovery: false, migrated: false };
  let soundFallback = true;
  let v3Raw: string | null = null;
  let legacyRaw: string | null = null;
  try {
    const oldSound = window.localStorage.getItem("bap_con_sound");
    if (oldSound !== null) soundFallback = oldSound === "true";
    v3Raw = window.localStorage.getItem(PROGRESS_KEY);
    legacyRaw = window.localStorage.getItem(LEGACY_PROGRESS_KEY);

    if (v3Raw) {
      try {
        const loaded = parseStoredProgress(v3Raw, soundFallback);
        if (loaded.migrated) saveProgress(loaded.progress);
        return { progress: loaded.progress, needsRecovery: false, migrated: loaded.migrated };
      } catch {
        // A still-present v2 record is a safe local fallback before IndexedDB recovery.
        if (!legacyRaw) throw new Error("Invalid v3 progress");
      }
    }
    if (legacyRaw) {
      const loaded = parseStoredProgress(legacyRaw, soundFallback);
      saveProgress(loaded.progress);
      return { progress: loaded.progress, needsRecovery: false, migrated: true };
    }
    return { progress: createDefaultProgress(soundFallback), needsRecovery: false, migrated: false };
  } catch {
    try {
      if (v3Raw) window.localStorage.setItem(`${PROGRESS_KEY}_corrupt_${Date.now()}`, v3Raw);
      if (legacyRaw) window.localStorage.setItem(`${LEGACY_PROGRESS_KEY}_corrupt_${Date.now()}`, legacyRaw);
    } catch {
      // Private browsing may reject all storage operations.
    }
    return { progress: createDefaultProgress(soundFallback), needsRecovery: true, migrated: false };
  }
}

export function loadProgress(): ProgressData {
  return loadProgressState().progress;
}

export function saveProgress(progress: ProgressData) {
  if (typeof window === "undefined") return false;
  try {
    validateProgress(progress);
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    // Keep the in-memory state usable when storage is unavailable.
    return false;
  }
}

export function buildProgressExport(progress: ProgressData, exportedAt = new Date().toISOString()): ProgressExport {
  return { exportVersion: 3, exportedAt, progress };
}

export function parseProgressExport(value: unknown): ProgressData {
  if (!isRecord(value) || value.exportVersion !== 3 || !isTimestamp(value.exportedAt) || !isRecord(value.progress) || value.progress.version !== PROGRESS_VERSION) {
    throw new Error("Invalid progress export");
  }
  validateProgress(value.progress);
  return value.progress;
}

export function resetLearningProgress(progress: ProgressData): ProgressData {
  const fresh = createDefaultProgress(progress.settings.sound);
  return {
    ...fresh,
    profile: progress.profile,
    rewards: progress.rewards,
    settings: progress.settings,
  };
}

export function markExported(progress: ProgressData, exportedAt = new Date().toISOString()): ProgressData {
  return {
    ...progress,
    settings: { ...progress.settings, lastExportAt: exportedAt },
  };
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

export function updateVisualProgress(
  progress: ProgressData,
  question: Question,
  isCorrect: boolean,
  seenAt = new Date().toISOString(),
): ProgressData {
  const visualExplanations = question.explanation?.visualExplanations ?? [];
  if (!visualExplanations.length) return progress;
  const signs = { ...progress.signs };
  visualExplanations.forEach((visual) => {
    const key = visual.code ? `code:${visual.code}` : `name:${visual.label}:${visual.name}`;
    const previous = signs[key] ?? {
      label: visual.label,
      ...(visual.code ? { code: visual.code } : {}),
      name: visual.name,
      meaning: visual.meaning,
      wrongCount: 0,
      correctCount: 0,
      lastSeenAt: seenAt,
    };
    signs[key] = {
      ...previous,
      label: visual.label,
      ...(visual.code ? { code: visual.code } : {}),
      name: visual.name,
      meaning: visual.meaning,
      wrongCount: previous.wrongCount + (isCorrect ? 0 : 1),
      correctCount: previous.correctCount + (isCorrect ? 1 : 0),
      lastSeenAt: seenAt,
    };
  });
  return { ...progress, signs };
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

export function getWeakVisuals(progress: ProgressData) {
  return Object.values(progress.signs)
    .filter((visual) => visual.wrongCount > 0)
    .sort((left, right) => right.wrongCount - left.wrongCount || right.lastSeenAt.localeCompare(left.lastSeenAt));
}
