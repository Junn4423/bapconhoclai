import { RotateCcw } from "lucide-react";
import type { ProgressSnapshot } from "@/lib/indexeddb-backup";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function reasonLabel(reason: ProgressSnapshot["reason"]) {
  if (reason === "before_import") return "Trước khi import";
  if (reason === "before_reset") return "Trước khi reset";
  if (reason === "manual") return "Thủ công";
  return "Tự động";
}

export function SnapshotPanel({ snapshots, onRefresh, onCreate, onRestore }: { snapshots: ProgressSnapshot[]; onRefresh: () => void; onCreate: () => void; onRestore: (snapshot: ProgressSnapshot) => void }) {
  return <section className="snapshot-panel"><div className="snapshot-panel-header"><div><p className="eyebrow">Bản dự phòng trên thiết bị</p><h2>Snapshot cục bộ</h2></div><button className="icon-button" onClick={onRefresh} aria-label="Làm mới snapshot"><RotateCcw size={16} /></button></div><button className="secondary-button small-button" onClick={onCreate}>Tạo snapshot cục bộ</button>{snapshots.length === 0 ? <p className="snapshot-empty">Chưa có bản dự phòng nào trên thiết bị này.</p> : <div className="snapshot-list">{snapshots.slice(0, 10).map((snapshot) => <div className="snapshot-row" key={snapshot.id}><div><strong>{formatDate(snapshot.createdAt)}</strong><span>{reasonLabel(snapshot.reason)}</span></div><button className="ghost-button small-button" onClick={() => onRestore(snapshot)}>Khôi phục</button></div>)}</div>}</section>;
}
