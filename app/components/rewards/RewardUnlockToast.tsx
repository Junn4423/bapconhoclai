import Link from "next/link";
import { Gift, X } from "lucide-react";
import { getRewardDefinition } from "@/data/rewards";

export function RewardUnlockToast({ rewardIds, onClose }: { rewardIds: string[]; onClose: () => void }) {
  if (!rewardIds.length) return null;
  const first = getRewardDefinition(rewardIds[0]);
  return (
    <aside className="reward-unlock-toast" role="status" aria-live="polite">
      <span className="reward-toast-icon"><Gift size={20} /></span>
      <div><strong>{rewardIds.length > 1 ? `Bắp có ${rewardIds.length} hộp quà mới 🎁` : "Bắp vừa mở được một hộp quà mới 🎁"}</strong><span>{rewardIds.length > 1 ? "Vào Hộp quà để xem từng mốc nha." : `${first?.conditionText ?? "Một mốc học mới"} đã hoàn thành.`}</span><Link href="/rewards">Xem hộp quà</Link></div>
      <button className="icon-button" onClick={onClose} aria-label="Đóng thông báo"><X size={16} /></button>
    </aside>
  );
}
