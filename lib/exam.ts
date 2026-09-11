export type CategoryId =
  | "law"
  | "culture"
  | "technique"
  | "vehicle"
  | "signs"
  | "situation";

export type PracticeMode = "reaction" | "mock" | "full" | "preset" | "liet" | "chapter";

export type Question = {
  id: number;
  question: string;
  options: string[];
  correct: number;
  chapter: number;
  category: CategoryId;
  categoryLabel: string;
  isLiet: boolean;
  images: string[];
  sourcePage: number;
  explanation?: string;
  whyCorrect?: string;
  optionExplanations?: Record<string, string>;
  signExplanations?: Array<{ label: string; meaning: string }>;
  memoryTip?: string;
};

export type PresetExam = {
  id: number;
  title: string;
  questionIds: number[];
  questions: Question[];
};

const CATEGORY_ORDER: CategoryId[] = [
  "law",
  "culture",
  "technique",
  "vehicle",
  "signs",
  "situation",
];

const REACTION_QUOTAS: Record<CategoryId, number> = {
  law: 8,
  culture: 2,
  technique: 3,
  vehicle: 2,
  signs: 8,
  situation: 7,
};

const MOCK_NON_LIET_QUOTAS: Record<CategoryId, number> = {
  law: 8,
  culture: 1,
  technique: 1,
  vehicle: 1,
  signs: 9,
  situation: 9,
};

function mulberry32(seed: number) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  const random = mulberry32(seed);

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function questionsByCategory(questionBank: Question[]) {
  return CATEGORY_ORDER.reduce<Record<CategoryId, Question[]>>(
    (groups, category) => {
      groups[category] = questionBank.filter(
        (question) => question.category === category,
      );
      return groups;
    },
    {
      law: [],
      culture: [],
      technique: [],
      vehicle: [],
      signs: [],
      situation: [],
    },
  );
}

function pickByQuotas(
  questionBank: Question[],
  quotas: Record<CategoryId, number>,
  seed: number,
) {
  const groups = questionsByCategory(questionBank);

  return CATEGORY_ORDER.flatMap((category, categoryIndex) => {
    const pool = seededShuffle(groups[category], seed + categoryIndex * 7919);
    return pool.slice(0, quotas[category]);
  });
}

export function assertUniqueQuestionIds(questions: Question[], context = "exam") {
  const ids = questions.map((question) => question.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Duplicate question IDs in generated ${context}`);
  }
  return questions;
}

export function makeReactionSet(questionBank: Question[], seed = Date.now()) {
  return assertUniqueQuestionIds(seededShuffle(
    pickByQuotas(questionBank, REACTION_QUOTAS, seed),
    seed + 99,
  ).slice(0, 30), "reaction exam");
}

export function makeMockExam(questionBank: Question[], seed = Date.now()) {
  const lietPool = seededShuffle(
    questionBank.filter((question) => question.isLiet),
    seed + 1741,
  );
  const lietQuestion = lietPool[0];
  if (!lietQuestion) throw new Error("Cannot generate a mock exam without a liet question");

  const remainingBank = questionBank.filter((question) => !question.isLiet);
  const selected = pickByQuotas(remainingBank, MOCK_NON_LIET_QUOTAS, seed);
  const questions = seededShuffle([lietQuestion, ...selected], seed + 31).slice(0, 30);
  if (questions.length !== 30) throw new Error("Mock exam does not contain exactly 30 questions");
  return assertUniqueQuestionIds(questions, "mock exam");
}

function distributeCategoryCounts(
  groups: Record<CategoryId, Question[]>,
  examCount: number,
) {
  const remainingExtraSlots = Array.from({ length: examCount }, () => 3);
  const allocations = {} as Record<CategoryId, number[]>;

  CATEGORY_ORDER.forEach((category, categoryIndex) => {
    const total = groups[category].length;
    const base = Math.floor(total / examCount);
    const remainder = total % examCount;
    const shuffledPositions = seededShuffle(
      Array.from({ length: examCount }, (_, index) => index),
      12000 + categoryIndex * 1301,
    );
    const tieRank = new Map(shuffledPositions.map((position, index) => [position, index]));
    const selectedExtras = new Set(
      shuffledPositions
        .slice()
        .sort(
          (left, right) =>
            remainingExtraSlots[right] - remainingExtraSlots[left] ||
            (tieRank.get(left) ?? 0) - (tieRank.get(right) ?? 0),
        )
        .slice(0, remainder),
    );

    allocations[category] = Array.from(
      { length: examCount },
      (_, examIndex) => {
        if (selectedExtras.has(examIndex)) {
          remainingExtraSlots[examIndex] -= 1;
          return base + 1;
        }
        return base;
      },
    );
  });

  return allocations;
}

/**
 * Builds twenty deterministic papers. Each question from the 600-question
 * bank appears exactly once across the papers, while every paper keeps all
 * six content groups represented as evenly as the source bank allows.
 */
export function buildPresetExams(
  questionBank: Question[],
  examCount = 20,
  questionsPerExam = 30,
): PresetExam[] {
  const groups = questionsByCategory(questionBank);
  const allocations = distributeCategoryCounts(groups, examCount);
  const shuffledPools = CATEGORY_ORDER.reduce<Record<CategoryId, Question[]>>(
    (pools, category, index) => {
      pools[category] = seededShuffle(groups[category], 9000 + index * 977);
      return pools;
    },
    {
      law: [],
      culture: [],
      technique: [],
      vehicle: [],
      signs: [],
      situation: [],
    },
  );
  const cursors: Record<CategoryId, number> = {
    law: 0,
    culture: 0,
    technique: 0,
    vehicle: 0,
    signs: 0,
    situation: 0,
  };

  return Array.from({ length: examCount }, (_, examIndex) => {
    const questions = CATEGORY_ORDER.flatMap((category) => {
      const amount = allocations[category][examIndex];
      const start = cursors[category];
      cursors[category] += amount;
      return shuffledPools[category].slice(start, start + amount);
    });

    return {
      id: examIndex + 1,
      title: `Bộ ôn cố định ${String(examIndex + 1).padStart(2, "0")}`,
      questionIds: seededShuffle(
        questions,
        12345 + examIndex * 4099,
      ).map((question) => question.id),
      questions: seededShuffle(questions, 12345 + examIndex * 4099),
    };
  }).map((exam) => ({
    ...exam,
    questions: exam.questions.slice(0, questionsPerExam),
    questionIds: exam.questionIds.slice(0, questionsPerExam),
  })).map((exam) => {
    assertUniqueQuestionIds(exam.questions, `preset ${exam.id}`);
    if (exam.questions.length !== questionsPerExam) {
      throw new Error(`Preset ${exam.id} does not contain ${questionsPerExam} questions`);
    }
    return exam;
  });
}

export const CATEGORY_COLORS: Record<CategoryId, string> = {
  law: "pink",
  culture: "peach",
  technique: "blue",
  vehicle: "lavender",
  signs: "mint",
  situation: "yellow",
};

export function makeLietSet(questionBank: Question[]): Question[] {
  return questionBank.filter((q) => q.isLiet);
}

export function makeChapterSet(questionBank: Question[], chapter: number): Question[] {
  return questionBank.filter((q) => q.chapter === chapter);
}
