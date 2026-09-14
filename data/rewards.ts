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
  ["1 chiếc kẹp càng cua / phụ kiện tóc xinh", "🎀", 30000],
  ["1 nụ hôn lốc xoáy", "🌪️", 0],
  ["1 cái bánh ngọt em thích", "🍰", 35000],
  ["1 thỏi son dưỡng môi xinh xắn", "💄", 50000],
  ["Một bộ đồ ngủ dễ thương", "🧸", 120000],
  ["1 ly KOI Thé / trà sữa trân châu", "🧋", 60000],
  ["1 tuýp kem dưỡng da tay thơm dịu", "🧴", 60000],
  ["Găng tay chống nắng xịn đi học lái xe", "🧤", 70000],
  ["1 bó hoa nhỏ bất ngờ không nhân dịp gì", "🌸", 80000],
  ["1 phần kem mát lạnh / món tráng miệng", "🍨", 50000],
  ["Mặt nạ dưỡng da em muốn", "🧖‍♀️", 70000],
  ["Một ốp điện thoại do em chọn", "📱", 80000],
  ["Một phụ kiện cho xe VF3 (200k)", "🚗", 200000],
  ["Bình giữ nhiệt mini mang ra bãi tập sa hình", "🫖", 100000],
  ["Voucher người yêu nấu 1 bữa cơm theo yêu cầu", "🍳", 120000],
  ["Tinh dầu thơm / sáp thơm phòng ngủ", "🕯️", 120000],
  ["1 cặp vé xem phim rạp + bắp nước", "🎬", 150000],
  ["1 buổi gội đầu dưỡng sinh thư giãn tại spa", "💆‍♀️", 150000],
  ["Cuối tuần đi ăn chỗ Bắp thích nhất", "🍽️", 250000],
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
    title: "Gối tựa lưng / tựa cổ công thái học trên xe",
    hiddenTitle: "Quà bí mật",
    description: "Vượt qua 60 câu điểm liệt — Bông tặng Bắp gối tựa êm ái trên xe VF3 lái xe thật an toàn.",
    emoji: "🛋️",
    conditionText: "Đúng 60/60 câu điểm liệt",
    estimatedValue: 300000,
  },
  {
    id: "mock-pass-01",
    category: "mock",
    order: 22,
    title: "1 ly nước / cà phê / matcha em thích",
    hiddenTitle: "Quà bí mật",
    description: "Thức uống mừng lần đầu Bắp PASS Thi thử hạng B.",
    emoji: "☕",
    conditionText: "PASS Thi thử hạng B lần đầu",
    estimatedValue: 60000,
    milestone: 1,
  },
  {
    id: "mock-pass-05",
    category: "mock",
    order: 23,
    title: "Voucher 30p massage vai gáy / bóp chân",
    hiddenTitle: "Quà bí mật",
    description: "Người yêu phục vụ massage tận tình sau chuỗi ngày ôn luyện chăm chỉ.",
    emoji: "💆‍♂️",
    conditionText: "5 lần PASS Thi thử hạng B",
    estimatedValue: 100000,
    milestone: 5,
  },
  {
    id: "mock-pass-20",
    category: "mock",
    order: 24,
    title: "Một gấu bông cho em ôm",
    hiddenTitle: "Quà bí mật",
    description: "Một chú gấu bông thật êm ái để Bắp ôm mỗi tối mừng 20 lần PASS xuất sắc.",
    emoji: "🧸",
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
