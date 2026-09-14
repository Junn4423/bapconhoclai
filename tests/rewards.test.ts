import test from "node:test";
import assert from "node:assert/strict";
import { REWARD_CATALOG, REWARD_COUNT, getRewardDefinition } from "../data/rewards";

test("Reward catalog: Contains exactly 25 rewards", () => {
  assert.equal(REWARD_COUNT, 25);
  assert.equal(REWARD_CATALOG.length, 25);
  const ids = REWARD_CATALOG.map((r) => r.id);
  assert.equal(new Set(ids).size, 25);
});

test("Reward catalog: Exactly 20 presets, 1 liet, 4 mock milestones", () => {
  const presets = REWARD_CATALOG.filter((r) => r.category === "preset");
  const liet = REWARD_CATALOG.filter((r) => r.category === "liet");
  const mock = REWARD_CATALOG.filter((r) => r.category === "mock");

  assert.equal(presets.length, 20);
  assert.equal(liet.length, 1);
  assert.equal(mock.length, 4);
});

test("Reward catalog: User customized rewards exist and are correctly named", () => {
  const p3 = getRewardDefinition("preset-03");
  assert.equal(p3?.title, "1 nụ hôn lốc xoáy");
  assert.equal(p3?.emoji, "🌪️");

  const p6 = getRewardDefinition("preset-06");
  assert.equal(p6?.title, "Một bộ đồ ngủ dễ thương");
  assert.equal(p6?.emoji, "🧸");

  const p12 = getRewardDefinition("preset-12");
  assert.equal(p12?.title, "Mặt nạ dưỡng da em muốn");
  assert.equal(p12?.emoji, "🧖‍♀️");

  const p13 = getRewardDefinition("preset-13");
  assert.equal(p13?.title, "Một ốp điện thoại do em chọn");
  assert.equal(p13?.emoji, "📱");

  const p14 = getRewardDefinition("preset-14");
  assert.equal(p14?.title, "Một phụ kiện cho xe VF3 (200k)");
  assert.equal(p14?.emoji, "🚗");

  const m20 = getRewardDefinition("mock-pass-20");
  assert.equal(m20?.title, "Một gấu bông cho em ôm");
  assert.equal(m20?.emoji, "🧸");
});

test("Reward catalog: Food/beverage count is bounded (~24%, 6 items)", () => {
  const foodEmojis = ["🍢", "🍰", "🧋", "🍨", "🍽️", "☕"];
  const foodRewards = REWARD_CATALOG.filter((r) => foodEmojis.includes(r.emoji));
  assert.equal(foodRewards.length, 6);
});
