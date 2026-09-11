"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ArrowLeft, Check, ChevronRight, Gift, PawPrint, RotateCcw, Sparkles, X } from "lucide-react";
import { REWARD_CATALOG, type RewardDefinition, type RewardCategory } from "@/data/rewards";
import { claimReward, getRewardCategoryLabel, getRewardItem, getRewardStatus, getRewardSummary, revealReward, type RewardProgress, type RewardStatus } from "@/lib/reward-engine";
import {
  buildProgressExport,
  createDefaultProgress,
  loadProgressState,
  saveProgress,
  type ProgressData,
} from "@/lib/progress";
import {
  createProgressSnapshot,
  listProgressSnapshots,
  restoreLatestSnapshot,
  restoreProgressSnapshot,
  type ProgressSnapshot,
} from "@/lib/indexeddb-backup";
import { SnapshotPanel } from "@/app/components/rewards/SnapshotPanel";

type RewardTab = "all" | "opened" | "claimed";
type RewardGroup = "all" | "preset" | "liet" | "mock";
type RewardModalPhase = "revealing" | "reveal" | "claim" | "success";

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function statusText(status: RewardStatus) {
  if (status === "claimed") return "Đã nhận";
  if (status === "revealed") return "Đã mở";
  if (status === "unlocked") return "Có quà mới";
  return "Chưa mở";
}

function nodeIcon(status: RewardStatus) {
  if (status === "claimed") return "❤️";
  if (status === "unlocked" || status === "revealed") return "🎁";
  return "○";
}

function isOpened(status: RewardStatus) {
  return status === "revealed" || status === "claimed";
}

function RewardCard({ reward, status, item, onOpen }: { reward: RewardDefinition; status: RewardStatus; item?: RewardProgress; onOpen: (reward: RewardDefinition) => void }) {
  return (
    <article className={`reward-card reward-card-${status}`}>
      <div className="reward-card-art" aria-hidden="true">{status === "locked" ? <Gift size={34} /> : status === "unlocked" ? <Sparkles size={34} /> : <span>{reward.emoji}</span>}</div>
      <span className="reward-status-label">{statusText(status)}</span>
      <h3>{status === "locked" || status === "unlocked" ? reward.hiddenTitle : reward.title}</h3>
      <p className="reward-card-condition">{status === "locked" ? reward.conditionText : status === "unlocked" ? `${reward.conditionText} rồi đó.` : reward.description}</p>
      {status === "unlocked" && <button className="primary-button small-button reward-card-action" onClick={() => onOpen(reward)}>Mở quà <ChevronRight size={15} /></button>}
      {status === "revealed" && <button className="secondary-button small-button reward-card-action" onClick={() => onOpen(reward)}>Xem quà <ChevronRight size={15} /></button>}
      {status === "revealed" && <span className="reward-card-date">Đã mở ngày {formatDate(item?.revealedAt)}</span>}
      {status === "claimed" && <span className="reward-claimed-copy"><Check size={14} /> Đã nhận ngày {formatDate(item?.claimedAt)}</span>}
    </article>
  );
}

function RewardProgressTree({ progress }: { progress: ProgressData }) {
  const presetRewards = REWARD_CATALOG.filter((reward) => reward.category === "preset");
  const mockRewards = REWARD_CATALOG.filter((reward) => reward.category === "mock");
  const mockCount = progress.rewards.mockPassCountLifetime;
  return (
    <section className="reward-tree-section section-block">
      <div className="section-heading"><div><p className="eyebrow">Progress Tree</p><h2 className="section-title">Bắp đang đi tới đâu rồi?</h2></div><p className="section-note">Quà vẫn được giấu cho tới khi mình chạm đúng mốc nha.</p></div>
      <div className="reward-tree-group"><div className="reward-tree-heading"><strong>20 bộ ôn</strong><span>Mỗi bộ đạt từ 27/30 và không sai câu liệt</span></div><div className="reward-tree-scroll"><div className="reward-tree reward-tree-presets">{presetRewards.map((reward) => { const status = getRewardStatus(progress.rewards, reward.id); return <div className={`reward-tree-node node-${status}`} key={reward.id}><span className="reward-tree-icon">{nodeIcon(status)}</span><strong>{String(reward.presetNo).padStart(2, "0")}</strong><small>{status === "locked" ? "Chưa đạt" : statusText(status)}</small></div>; })}</div></div></div>
      <div className="reward-tree-group mock-tree-group"><div className="reward-tree-heading"><strong>Thi thử hạng B</strong><span>PASS hiện tại: {mockCount} lần</span></div><div className="mock-tree-track"><div className="mock-tree-fill" style={{ width: `${Math.min(100, (mockCount / 40) * 100)}%` }} /></div><div className="reward-tree reward-tree-mock">{mockRewards.map((reward) => { const status = getRewardStatus(progress.rewards, reward.id); const remaining = Math.max(0, (reward.milestone ?? 0) - mockCount); return <div className={`reward-tree-node node-${status}`} key={reward.id}><span className="reward-tree-icon">{nodeIcon(status)}</span><strong>{reward.milestone}</strong><small>{status === "locked" ? `Còn ${remaining} PASS` : statusText(status)}</small></div>; })}</div></div>
    </section>
  );
}

function RewardModal({ reward, phase, modalRef, onClose, onClaimPrompt, onClaim }: { reward: RewardDefinition; phase: RewardModalPhase; modalRef: RefObject<HTMLElement>; onClose: () => void; onClaimPrompt: () => void; onClaim: () => void }) {
  const isGrand = reward.id === "mock-pass-40";
  return (
    <div className="modal-overlay reward-modal-overlay" onClick={onClose}>
      <section className={`reward-modal reward-modal-${phase}`} role="dialog" aria-modal="true" aria-labelledby="reward-modal-title" ref={modalRef} onClick={(event) => event.stopPropagation()}>
        <button className="icon-button reward-modal-close" onClick={onClose} aria-label="Đóng"><X size={18} /></button>
        {phase === "revealing" && <div className="reward-reveal-stage" aria-live="polite"><div className="reward-gift-bounce">🎁</div><strong>Đang mở quà cho Bắp...</strong><span>Bông giấu món này kỹ lắm đó 😼</span></div>}
        {phase === "reveal" && <div className="reward-reveal-stage"><div className="reward-confetti" aria-hidden="true">✨ ✨ ✨</div><div className="reward-revealed-emoji">{reward.emoji}</div><p className="eyebrow">Có quà mới nè 🎁</p><h2 id="reward-modal-title">{reward.title}</h2><p>{reward.description}</p><div className="reward-modal-actions"><button className="ghost-button" onClick={onClose}>Để dành</button><button className="primary-button" onClick={onClaimPrompt}>Em nhận rồi ❤️</button></div></div>}
        {phase === "claim" && <div className="reward-confirm-stage"><div className="reward-revealed-emoji">{reward.emoji}</div><p className="eyebrow">Xác nhận nhận quà</p><h2 id="reward-modal-title">Bắp nhận quà này nha?</h2><p>{reward.title}</p><small>Sau khi xác nhận, món này sẽ được đánh dấu “Đã nhận”.</small><div className="reward-modal-actions"><button className="ghost-button" onClick={onClose}>Để sau</button><button className="primary-button" onClick={onClaim}>Em nhận rồi ❤️</button></div></div>}
        {phase === "success" && <div className="reward-confirm-stage"><div className="reward-revealed-emoji">{isGrand ? "💅" : "❤️"}</div><p className="eyebrow">Nhận quà thành công</p><h2 id="reward-modal-title">{isGrand ? "40 lần đậu rồi đó." : "Nhận quà rồi nè"}</h2><p className="reward-success-title">{reward.title}</p><span>Bông: “Ăn ngon nha 😼”</span><button className="primary-button reward-success-button" onClick={onClose}>Về hộp quà</button></div>}
      </section>
    </div>
  );
}

export function RewardsApp() {
  const [progress, setProgress] = useState<ProgressData>(() => createDefaultProgress());
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<RewardTab>("all");
  const [group, setGroup] = useState<RewardGroup>("all");
  const [modalRewardId, setModalRewardId] = useState<string | null>(null);
  const [modalPhase, setModalPhase] = useState<RewardModalPhase>("reveal");
  const [snapshots, setSnapshots] = useState<ProgressSnapshot[]>([]);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const modalRef = useRef<HTMLElement>(null);
  const snapshotModalRef = useRef<HTMLElement>(null);
  const revealTimer = useRef<number | null>(null);

  useEffect(() => {
    const loaded = loadProgressState();
    setProgress(loaded.progress);
    setHydrated(true);
    if (loaded.migrated) void createProgressSnapshot(loaded.progress, "auto");
    if (loaded.needsRecovery) {
      void restoreLatestSnapshot().then((restored) => {
        if (restored) {
          saveProgress(restored);
          setProgress(restored);
          setNotice("Bắp ơi, dữ liệu chính bị lỗi nên hệ thống đã khôi phục bản gần nhất nha.");
        } else {
          setNotice("Không đọc được tiến trình cũ. Bắp thử khôi phục file backup hoặc bắt đầu lại nha.");
        }
      });
    }
  }, []);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== "bap_con_progress_v3") return;
      const loaded = loadProgressState();
      setProgress(loaded.progress);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => () => { if (revealTimer.current !== null) window.clearTimeout(revealTimer.current); }, []);

  useEffect(() => {
    if (!modalRewardId) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(modalRef.current?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? []).filter((element) => !element.hasAttribute("disabled"));
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setModalRewardId(null); return; }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) return;
      const current = document.activeElement;
      const index = elements.indexOf(current as HTMLElement);
      const next = event.shiftKey ? (index <= 0 ? elements.length - 1 : index - 1) : (index === elements.length - 1 ? 0 : index + 1);
      event.preventDefault();
      elements[next]?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [modalRewardId, modalPhase]);

  useEffect(() => {
    if (!showSnapshots) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(snapshotModalRef.current?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? []).filter((element) => !element.hasAttribute("disabled"));
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setShowSnapshots(false); return; }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) return;
      const current = document.activeElement;
      const index = elements.indexOf(current as HTMLElement);
      const next = event.shiftKey ? (index <= 0 ? elements.length - 1 : index - 1) : (index === elements.length - 1 ? 0 : index + 1);
      event.preventDefault();
      elements[next]?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [showSnapshots]);

  const summary = getRewardSummary(progress.rewards);
  const visibleRewards = useMemo(() => REWARD_CATALOG.filter((reward) => {
    if (group !== "all" && reward.category !== group) return false;
    const status = getRewardStatus(progress.rewards, reward.id);
    if (tab === "opened") return isOpened(status);
    if (tab === "claimed") return status === "claimed";
    return true;
  }), [group, progress.rewards, tab]);
  const groupedRewards = useMemo(() => (["preset", "liet", "mock"] as RewardCategory[]).map((category) => ({ category, rewards: visibleRewards.filter((reward) => reward.category === category) })).filter((item) => item.rewards.length), [visibleRewards]);
  const modalReward = modalRewardId ? REWARD_CATALOG.find((reward) => reward.id === modalRewardId) : undefined;

  const closeModal = () => { if (revealTimer.current !== null) window.clearTimeout(revealTimer.current); setModalRewardId(null); setModalPhase("reveal"); };
  const openReward = (reward: RewardDefinition) => {
    const status = getRewardStatus(progress.rewards, reward.id);
    if (status === "unlocked") {
      setModalRewardId(reward.id);
      setModalPhase("revealing");
      revealTimer.current = window.setTimeout(() => {
        setProgress((old) => {
          const next = { ...old, rewards: revealReward(old.rewards, reward.id) };
          saveProgress(next);
          void createProgressSnapshot(next, "auto");
          return next;
        });
        setModalPhase("reveal");
      }, 950);
    } else if (status === "revealed") {
      setModalRewardId(reward.id);
      setModalPhase("reveal");
    }
  };
  const claim = () => {
    if (!modalRewardId) return;
    setProgress((old) => {
      const next = { ...old, rewards: claimReward(old.rewards, modalRewardId) };
      saveProgress(next);
      void createProgressSnapshot(next, "manual");
      return next;
    });
    setModalPhase("success");
  };
  const exportBackup = () => {
    const exportedAt = new Date().toISOString();
    const next = { ...progress, settings: { ...progress.settings, lastExportAt: exportedAt } };
    saveProgress(next);
    setProgress(next);
    const blob = new Blob([JSON.stringify(buildProgressExport(next, exportedAt), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = exportedAt.slice(0, 16).replace("T", "-").replace(":", "");
    link.href = url;
    link.download = `bap-progress-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    void createProgressSnapshot(next, "manual");
    setNotice("Đã tải file backup của Bắp xuống máy rồi nha.");
  };
  const refreshSnapshots = () => { void listProgressSnapshots().then(setSnapshots); };
  const createSnapshot = () => { void createProgressSnapshot(progress, "manual").then((ok) => { setNotice(ok ? "Đã lưu một bản dự phòng trên thiết bị này." : "Thiết bị chưa cho phép lưu bản dự phòng nha."); refreshSnapshots(); }); };
  const restoreSnapshot = (snapshot: ProgressSnapshot) => {
    if (!window.confirm("Khôi phục bản này nha? Hệ thống sẽ lưu trạng thái hiện tại trước khi thay thế.")) return;
    void (async () => {
      await createProgressSnapshot(progress, "manual");
      const restored = await restoreProgressSnapshot(snapshot.id);
      if (!restored) { setNotice("Bản lưu này đang có vấn đề. Bắp thử chọn bản backup khác nha."); return; }
      saveProgress(restored);
      setProgress(restored);
      setShowSnapshots(false);
      setNotice("Đã khôi phục bản dự phòng cho Bắp rồi nha.");
    })();
  };

  if (!hydrated) return null;
  return <div className="app-shell reward-app"><header className="site-header"><Link className="brand-lockup" href="/" aria-label="Về góc học của Bắp"><span className="brand-mark"><PawPrint size={22} /></span><span className="brand-copy"><span className="brand-name">Bắp con học lái</span><span className="brand-subtitle">600 câu thôi, học cùng nhau nha</span></span></Link><div className="header-actions"><Link className="ghost-button small-button" href="/"><ArrowLeft size={15} /> Về góc học</Link><button className="icon-button" onClick={() => { setShowSnapshots(true); refreshSnapshots(); }} aria-label="Mở bản dự phòng"><RotateCcw size={18} /></button></div></header><main className="container page-section"><section className="rewards-hero"><div><p className="eyebrow">Góc quà của Bắp</p><h1 className="page-title">Hộp quà của Bắp 🎁</h1><p className="page-subtitle">Mỗi chặng học xong sẽ có một món nhỏ. Quà chưa mở thì Bông giấu nha 😼</p></div><div className="reward-summary-pill"><strong>{summary.opened} / {summary.total}</strong><span>món đã mở</span><small>{summary.claimed} món đã nhận</small></div></section><section className="reward-next-card"><div className="reward-next-icon"><Gift size={25} /></div><div><p className="eyebrow">Quà gần nhất</p>{progress.rewards.mockPassCountLifetime < 40 ? <><strong>Thi thử hạng B</strong><span>{progress.rewards.mockPassCountLifetime} / {[1, 5, 20, 40].find((milestone) => progress.rewards.mockPassCountLifetime < milestone) ?? 40} lần PASS</span><small>Còn {Math.max(0, ([1, 5, 20, 40].find((milestone) => progress.rewards.mockPassCountLifetime < milestone) ?? 40) - progress.rewards.mockPassCountLifetime)} lần nữa để mở quà bí mật.</small></> : <><strong>Đã chạm mốc lớn nhất</strong><span>40 lần PASS Thi thử hạng B</span><small>Bắp giỏi quá rồi đó 💅</small></>}</div><div className="reward-next-progress"><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, (progress.rewards.mockPassCountLifetime / 40) * 100)}%` }} /></div><Link className="ghost-button small-button" href="#reward-list">Xem quà <ChevronRight size={15} /></Link></div></section>{notice && <div className="storage-notice" role="status"><span>{notice}</span><button className="icon-button" onClick={() => setNotice(null)} aria-label="Đóng thông báo"><X size={15} /></button></div>}<div className="reward-toolbar"><div className="filter-tabs"><button className={`filter-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>Tất cả</button><button className={`filter-tab ${tab === "opened" ? "active" : ""}`} onClick={() => setTab("opened")}>Đã mở ({summary.opened})</button><button className={`filter-tab ${tab === "claimed" ? "active" : ""}`} onClick={() => setTab("claimed")}>Đã nhận ({summary.claimed})</button></div><div className="reward-group-tabs"><button className={group === "all" ? "active" : ""} onClick={() => setGroup("all")}>Tất cả mốc</button><button className={group === "preset" ? "active" : ""} onClick={() => setGroup("preset")}>20 bộ ôn</button><button className={group === "liet" ? "active" : ""} onClick={() => setGroup("liet")}>60 câu điểm liệt</button><button className={group === "mock" ? "active" : ""} onClick={() => setGroup("mock")}>Thi thử hạng B</button></div></div><section id="reward-list" className="reward-list">{groupedRewards.map(({ category, rewards }) => <section className="reward-group" key={category}><div className="reward-group-title"><div><p className="eyebrow">{getRewardCategoryLabel(category)}</p><h2>{category === "preset" ? "Mỗi bộ là một bước nhỏ" : category === "liet" ? "Chinh phục 60 câu điểm liệt" : "Giữ phong độ thi thử"}</h2></div><span>{rewards.length} mốc</span></div><div className="reward-grid">{rewards.map((reward) => <RewardCard key={reward.id} reward={reward} status={getRewardStatus(progress.rewards, reward.id)} item={getRewardItem(progress.rewards, reward.id)} onOpen={openReward} />)}</div></section>)}{groupedRewards.length === 0 && <div className="empty-state">Chưa có phần quà nào trong bộ lọc này nha.</div>}</section><RewardProgressTree progress={progress}/><section className="reward-backup-card"><div><p className="eyebrow">Không có cloud đâu, nhưng có backup nha</p><h2>Sao lưu tiến trình của Bắp</h2><p>File JSON giúp Bắp mang theo cả tiến độ học và Hộp quà sang lúc cần khôi phục.</p></div><div className="reward-backup-actions"><button className="secondary-button small-button" onClick={exportBackup}><Gift size={15} /> Sao lưu JSON</button><button className="ghost-button small-button" onClick={() => { setShowSnapshots(true); refreshSnapshots(); }}>Bản dự phòng cục bộ</button></div></section></main>{modalReward && <RewardModal reward={modalReward} phase={modalPhase} modalRef={modalRef} onClose={closeModal} onClaimPrompt={() => setModalPhase("claim")} onClaim={claim} />}{showSnapshots && <div className="modal-overlay" onClick={() => setShowSnapshots(false)}><section ref={snapshotModalRef} className="settings-modal snapshot-modal" role="dialog" aria-modal="true" aria-labelledby="snapshot-title" onClick={(event) => event.stopPropagation()}><div className="settings-header"><div><p className="eyebrow">Dữ liệu học</p><h2 id="snapshot-title">Bản dự phòng trên thiết bị</h2></div><button className="icon-button" onClick={() => setShowSnapshots(false)} aria-label="Đóng"><X size={18} /></button></div><SnapshotPanel snapshots={snapshots} onRefresh={refreshSnapshots} onCreate={createSnapshot} onRestore={restoreSnapshot}/></section></div>}</div>;
}
