import Link from "next/link";
import { ChevronRight, Gift, Sparkles } from "lucide-react";
import { getNextReward, getRewardStatus, getRewardSummary } from "@/lib/reward-engine";
import type { RewardsState } from "@/lib/reward-engine";

export function RewardHomeCard({ rewards }: { rewards: RewardsState }) {
  const summary = getRewardSummary(rewards);
  const nextReward = getNextReward(rewards);
  const mockCount = rewards.mockPassCountLifetime;
  const nextMockMilestone = [1, 5, 20, 40].find((milestone) => mockCount < milestone);
  const nextMockProgress = nextMockMilestone ? `${mockCount} / ${nextMockMilestone} lần PASS` : "Đã chạm mốc lớn nhất";
  const nextLabel = nextReward?.category === "mock"
    ? `Thi thử hạng B · ${nextMockProgress}`
    : nextReward?.category === "liet"
      ? "60 câu điểm liệt"
      : nextReward
        ? `Bộ ôn ${String(nextReward.presetNo).padStart(2, "0")}`
        : "Bắp đã mở hết các mốc";
  const nextStatus = nextReward ? getRewardStatus(rewards, nextReward.id) : "claimed";

  return (
    <section className="reward-home-card section-block">
      <div className="reward-home-art" aria-hidden="true"><Gift size={30} /><Sparkles size={17} /></div>
      <div className="reward-home-copy">
        <p className="eyebrow">Hộp quà của Bắp</p>
        <h2 className="section-title">{summary.opened} / {summary.total} món đã mở</h2>
        <p className="section-note">{summary.claimed} món đã nhận · Quà chưa đạt vẫn được giấu kỹ nha.</p>
        <div className="reward-next-line"><strong>Quà gần nhất</strong><span>{nextLabel}</span><small>{nextStatus === "unlocked" ? "Có quà mới nè 🎁" : nextReward ? "Còn một chút nữa thôi" : "Mình giỏi quá rồi đó"}</small></div>
      </div>
      <Link className="secondary-button small-button reward-home-link" href="/rewards">Xem hộp quà <ChevronRight size={16} /></Link>
    </section>
  );
}
