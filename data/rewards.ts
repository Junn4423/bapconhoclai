export type RewardCategory = "preset" | "liet" | "mock";

export type RewardDefinition = {
  id: string;
  category: RewardCategory;
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

const presetRewardRows: Array<[string, string, number]> = [
  ["1 cái lạp xưởng nướng đá", "🍢", 25000],
  ["1 chai nước / nước ngọt em thích", "🥤", 30000],
  ["1 món ăn vặt tự chọn", "🍿", 30000],
  ["1 cái bánh ngọt", "🍰", 35000],
  ["1 ly trà sữa", "🧋", 40000],
  ["1 phần kem / món tráng miệng", "🍨", 40000],
  ["1 ly cà phê / matcha", "☕", 50000],
  ["1 bữa sáng em thích", "🥐", 50000],
  ["Voucher đặt xe", "🚗", 50000],
  ["1 ly KOI Thé", "🧋", 60000],
  ["1 món ăn em chọn", "🍜", 60000],
  ["Snack + nước / đồ ăn vặt", "🍪", 60000],
  ["Gội đầu thư giãn / spa tóc", "💆", 70000],
  ["Voucher đặt xe", "🚗", 70000],
  ["KOI / trà sữa + topping", "🧋", 70000],
  ["Một bữa ăn nhỏ em thích", "🍱", 90000],
  ["1 vé xem phim", "🎬", 120000],
  ["Đi ăn món em đang thèm", "🍲", 150000],
  ["Gội đầu + chăm sóc thư giãn", "💆", 150000],
  ["Cuối tuần đi ăn chỗ em thích", "🍽️", 200000],
];

const presetRewards: RewardDefinition[] = presetRewardRows.map(([title, emoji, estimatedValue], index) => {
  const presetNo = index + 1;
  return {
    id: `preset-${String(presetNo).padStart(2, "0")}`,
    category: "preset",
    order: presetNo,
    title,
    hiddenTitle: "Quà bí mật",
    description: `Một món nhỏ để mừng Bắp hoàn thành Bộ ôn ${String(presetNo).padStart(2, "0")}.`,
    emoji,
    conditionText: `Đạt Bộ ôn ${String(presetNo).padStart(2, "0")} từ 27/30 và không sai câu điểm liệt`,
    estimatedValue,
    presetNo,
  };
});

export const REWARD_CATALOG: RewardDefinition[] = [
  ...presetRewards,
  {
    id: "liet-60",
    category: "liet",
    order: 21,
    title: "Cuối tuần đi ăn chỗ em thích",
    hiddenTitle: "Quà bí mật",
    description: "Một bữa ăn thật vui để mừng Bắp vượt trọn 60 câu điểm liệt.",
    emoji: "🍽️",
    conditionText: "Đúng 60/60 câu điểm liệt",
    estimatedValue: 300000,
  },
  {
    id: "mock-pass-01",
    category: "mock",
    order: 22,
    title: "1 ly KOI Thé / trà sữa em thích",
    hiddenTitle: "Quà bí mật",
    description: "Ly nước mừng lần đầu Bắp PASS Thi thử hạng B.",
    emoji: "🧋",
    conditionText: "PASS Thi thử hạng B lần đầu",
    estimatedValue: 60000,
    milestone: 1,
  },
  {
    id: "mock-pass-05",
    category: "mock",
    order: 23,
    title: "1 lần gội đầu thư giãn / spa tóc",
    hiddenTitle: "Quà bí mật",
    description: "Một buổi thư giãn vì Bắp đã giữ phong độ qua nhiều bài thi.",
    emoji: "💆",
    conditionText: "5 lần PASS Thi thử hạng B",
    estimatedValue: 150000,
    milestone: 5,
  },
  {
    id: "mock-pass-20",
    category: "mock",
    order: 24,
    title: "Cuối tuần đi ăn chỗ em thích",
    hiddenTitle: "Quà bí mật",
    description: "Một buổi đi ăn thật ngon để mừng 20 lần PASS.",
    emoji: "🍽️",
    conditionText: "20 lần PASS Thi thử hạng B",
    estimatedValue: 300000,
    milestone: 20,
  },
  {
    id: "mock-pass-40",
    category: "mock",
    order: 25,
    title: "Voucher làm nail 500k",
    hiddenTitle: "Quà bí mật",
    description: "Phần thưởng lớn nhất: Bắp đi làm bộ móng đẹp thôi 😼",
    emoji: "💅",
    conditionText: "40 lần PASS Thi thử hạng B",
    estimatedValue: 500000,
    milestone: 40,
  },
];

export const MOCK_REWARD_MILESTONES = [1, 5, 20, 40] as const;
export const REWARD_COUNT = REWARD_CATALOG.length;

if (
  REWARD_COUNT !== 25
  || new Set(REWARD_CATALOG.map((reward) => reward.id)).size !== REWARD_COUNT
  || REWARD_CATALOG.filter((reward) => reward.category === "preset").length !== 20
  || REWARD_CATALOG.filter((reward) => reward.category === "liet").length !== 1
  || REWARD_CATALOG.filter((reward) => reward.category === "mock").length !== 4
) {
  throw new Error("Reward catalog must contain exactly 20 preset, 1 liet and 4 mock rewards");
}

export function getRewardDefinition(rewardId: string) {
  return REWARD_CATALOG.find((reward) => reward.id === rewardId);
}
