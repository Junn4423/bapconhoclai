import {
  getRewardDefinition,
  MOCK_REWARD_MILESTONES,
  REWARD_CATALOG,
  type RewardCategory,
} from "../data/rewards";

export type RewardStatus = "locked" | "unlocked" | "revealed" | "claimed";

export type RewardTrigger = {
  type: "preset" | "liet" | "mock";
  presetNo?: number;
  score?: number;
  total?: number;
  mockPassCount?: number;
  sourceSessionId?: string;
};

export type RewardProgress = {
  rewardId: string;
  status: RewardStatus;
  unlockedAt?: string;
  revealedAt?: string;
  claimedAt?: string;
  trigger?: RewardTrigger;
};

export type RewardsState = {
  mockPassCountLifetime: number;
  items: Record<string, RewardProgress>;
  processedExamSessionIds: string[];
};

export type RewardEvent =
  | {
      type: "preset_completed";
      presetNo: number;
      score: number;
      total: number;
      lietWrong: boolean;
      sourceSessionId: string;
    }
  | {
      type: "liet_completed";
      score: number;
      total: number;
      sourceSessionId: string;
    }
  | {
      type: "mock_pass";
      score: number;
      total: number;
      lietWrong: boolean;
      sourceSessionId: string;
    };

export type RewardMutation = {
  rewards: RewardsState;
  newlyUnlocked: string[];
};

export function createDefaultRewards(): RewardsState {
  return {
    mockPassCountLifetime: 0,
    items: {},
    processedExamSessionIds: [],
  };
}

function padMilestone(milestone: number) {
  return String(milestone).padStart(2, "0");
}

function isOpen(status: RewardStatus | undefined) {
  return status === "unlocked" || status === "revealed" || status === "claimed";
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function unlockOnce(
  rewards: RewardsState,
  rewardId: string,
  trigger: RewardTrigger,
  unlockedAt: string,
): RewardMutation {
  const current = rewards.items[rewardId];
  if (isOpen(current?.status)) return { rewards, newlyUnlocked: [] };
  if (!getRewardDefinition(rewardId)) return { rewards, newlyUnlocked: [] };

  return {
    rewards: {
      ...rewards,
      items: {
        ...rewards.items,
        [rewardId]: {
          rewardId,
          status: "unlocked",
          unlockedAt,
          trigger,
        },
      },
    },
    newlyUnlocked: [rewardId],
  };
}

function unlockMockMilestones(
  rewards: RewardsState,
  sourceSessionId: string,
  score: number,
  total: number,
  unlockedAt: string,
): RewardMutation {
  let next = rewards;
  const newlyUnlocked: string[] = [];
  MOCK_REWARD_MILESTONES.forEach((milestone) => {
    if (next.mockPassCountLifetime < milestone) return;
    const mutation = unlockOnce(
      next,
      `mock-pass-${padMilestone(milestone)}`,
      {
        type: "mock",
        score,
        total,
        mockPassCount: next.mockPassCountLifetime,
        sourceSessionId,
      },
      unlockedAt,
    );
    next = mutation.rewards;
    newlyUnlocked.push(...mutation.newlyUnlocked);
  });
  return { rewards: next, newlyUnlocked };
}

export function unlockRewardsForMockCount(
  rewards: RewardsState,
  mockPassCount: number,
  unlockedAt = new Date().toISOString(),
) {
  return unlockMockMilestones(
    { ...rewards, mockPassCountLifetime: Math.max(rewards.mockPassCountLifetime, mockPassCount) },
    "migration",
    0,
    30,
    unlockedAt,
  ).rewards;
}

export function applyRewardEvent(
  rewards: RewardsState,
  event: RewardEvent,
  occurredAt = new Date().toISOString(),
): RewardMutation {
  if (event.type === "preset_completed") {
    if (event.score < 27 || event.lietWrong || event.presetNo < 1 || event.presetNo > 20) {
      return { rewards, newlyUnlocked: [] };
    }
    return unlockOnce(
      rewards,
      `preset-${String(event.presetNo).padStart(2, "0")}`,
      {
        type: "preset",
        presetNo: event.presetNo,
        score: event.score,
        total: event.total,
        sourceSessionId: event.sourceSessionId,
      },
      occurredAt,
    );
  }

  if (event.type === "liet_completed") {
    if (event.score !== 60 || event.total !== 60) return { rewards, newlyUnlocked: [] };
    return unlockOnce(
      rewards,
      "liet-60",
      {
        type: "liet",
        score: event.score,
        total: event.total,
        sourceSessionId: event.sourceSessionId,
      },
      occurredAt,
    );
  }

  if (event.score < 27 || event.lietWrong || rewards.processedExamSessionIds.includes(event.sourceSessionId)) {
    return { rewards, newlyUnlocked: [] };
  }

  const countedRewards: RewardsState = {
    ...rewards,
    mockPassCountLifetime: rewards.mockPassCountLifetime + 1,
    processedExamSessionIds: [...rewards.processedExamSessionIds, event.sourceSessionId],
  };
  return unlockMockMilestones(
    countedRewards,
    event.sourceSessionId,
    event.score,
    event.total,
    occurredAt,
  );
}

export function revealReward(
  rewards: RewardsState,
  rewardId: string,
  revealedAt = new Date().toISOString(),
): RewardsState {
  const current = rewards.items[rewardId];
  if (!current || current.status !== "unlocked") return rewards;
  return {
    ...rewards,
    items: {
      ...rewards.items,
      [rewardId]: { ...current, status: "revealed", revealedAt },
    },
  };
}

export function claimReward(
  rewards: RewardsState,
  rewardId: string,
  claimedAt = new Date().toISOString(),
): RewardsState {
  const current = rewards.items[rewardId];
  if (!current || current.status === "claimed" || current.status === "locked" || current.status === "unlocked") {
    return rewards;
  }
  return {
    ...rewards,
    items: {
      ...rewards.items,
      [rewardId]: { ...current, status: "claimed", claimedAt },
    },
  };
}

export function getRewardItem(rewards: RewardsState, rewardId: string) {
  return rewards.items[rewardId];
}

export function getRewardStatus(rewards: RewardsState, rewardId: string): RewardStatus {
  return rewards.items[rewardId]?.status ?? "locked";
}

export function getRewardSummary(rewards: RewardsState) {
  const statuses = REWARD_CATALOG.map((reward) => getRewardStatus(rewards, reward.id));
  return {
    opened: statuses.filter((status) => status === "revealed" || status === "claimed").length,
    claimed: statuses.filter((status) => status === "claimed").length,
    unlocked: statuses.filter((status) => status === "unlocked").length,
    total: REWARD_CATALOG.length,
  };
}

export function getNextReward(rewards: RewardsState) {
  return REWARD_CATALOG.find((reward) => getRewardStatus(rewards, reward.id) === "unlocked")
    ?? REWARD_CATALOG.find((reward) => getRewardStatus(rewards, reward.id) === "locked");
}

export function getRewardCategoryLabel(category: RewardCategory) {
  if (category === "preset") return "20 bộ ôn";
  if (category === "liet") return "60 câu điểm liệt";
  return "Thi thử hạng B";
}

export function validateRewards(value: unknown): asserts value is RewardsState {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid rewards");
  const record = value as Record<string, unknown>;
  if (typeof record.mockPassCountLifetime !== "number" || !Number.isInteger(record.mockPassCountLifetime) || record.mockPassCountLifetime < 0) {
    throw new Error("Invalid lifetime mock pass count");
  }
  if (!record.items || typeof record.items !== "object" || Array.isArray(record.items)) throw new Error("Invalid reward items");
  const items = record.items as Record<string, unknown>;
  Object.entries(items).forEach(([rewardId, raw]) => {
    if (!getRewardDefinition(rewardId) || !raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Invalid reward ${rewardId}`);
    const item = raw as Record<string, unknown>;
    const status = String(item.status);
    if (item.rewardId !== rewardId || !["unlocked", "revealed", "claimed"].includes(status)) throw new Error(`Invalid reward status ${rewardId}`);
    ["unlockedAt", "revealedAt", "claimedAt"].forEach((key) => {
      if (item[key] !== undefined && !isTimestamp(item[key])) throw new Error(`Invalid reward timestamp ${rewardId}`);
    });
    if (typeof item.unlockedAt !== "string") throw new Error(`Missing unlock timestamp ${rewardId}`);
    if ((status === "revealed" || status === "claimed") && typeof item.revealedAt !== "string") throw new Error(`Missing reveal timestamp ${rewardId}`);
    if (status === "claimed" && typeof item.claimedAt !== "string") throw new Error(`Missing claim timestamp ${rewardId}`);
    if (item.trigger !== undefined) {
      if (typeof item.trigger !== "object" || item.trigger === null || Array.isArray(item.trigger)) throw new Error(`Invalid reward trigger ${rewardId}`);
      const trigger = item.trigger as Record<string, unknown>;
      if (!["preset", "liet", "mock"].includes(String(trigger.type))) throw new Error(`Invalid reward trigger type ${rewardId}`);
    }
  });
  if (!Array.isArray(record.processedExamSessionIds) || record.processedExamSessionIds.some((id) => typeof id !== "string" || !id) || new Set(record.processedExamSessionIds).size !== record.processedExamSessionIds.length) {
    throw new Error("Invalid processed exam sessions");
  }
}
