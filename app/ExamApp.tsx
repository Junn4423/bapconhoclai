"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  Download,
  GraduationCap,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  ListChecks,
  LockKeyhole,
  MapPin,
  PawPrint,
  Play,
  RotateCcw,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import questionData from "@/data/questions.json";
import {
  buildPresetExams,
  CATEGORY_COLORS,
  makeChapterSet,
  makeLietSet,
  makeMockExam,
  makeReactionSet,
  type PracticeMode,
  type PresetExam,
  type Question,
} from "@/lib/exam";
import { playSound } from "@/lib/sound";
import { CatEffects } from "@/app/components/CatEffects";
import { CatMascot } from "@/app/components/CatMascot";
import { DriverLicenseCard } from "@/app/components/DriverLicenseCard";
import { useAccessGate } from "@/app/components/AccessGate";
import {
  createDefaultProgress,
  getChapterSummary,
  getProgressSummary,
  getWeakVisuals,
  getWeakQuestions,
  loadProgress,
  normalizeProgress,
  PROGRESS_KEY,
  saveProgress,
  updateModeProgress,
  updateVisualProgress,
  updateQuestionProgress,
  validateProgress,
  type CurrentSession,
  type ProgressData,
  type VisualProgress,
} from "@/lib/progress";

const QUESTION_BANK = questionData.questions as Question[];
const CHAPTERS = [
  [1, "Pháp luật & quy tắc giao thông", "Khái niệm, quy tắc chung, làn đường, tốc độ và xử phạt cơ bản.", 180],
  [2, "Văn hóa giao thông, đạo đức người lái xe, kỹ năng PCCC và cứu hộ, cứu nạn", "Văn hóa giao thông, đạo đức người lái xe, kỹ năng phòng cháy chữa cháy và cứu hộ, cứu nạn.", 25],
  [3, "Kỹ thuật lái xe ô tô", "Thao tác trên xe, lùi xe, quay đầu, phanh gấp và lái xe trong thời tiết khó.", 58],
  [4, "Cấu tạo & sửa chữa ô tô", "Động cơ, phanh, lốp xe, bảng đồng hồ và chăm sóc xe.", 37],
  [5, "Hệ thống biển báo đường bộ", "Biển cấm, nguy hiểm, hiệu lệnh, chỉ dẫn và vạch kẻ đường.", 185],
  [6, "Sa hình & xử lý tình huống", "Quyền ưu tiên tại giao lộ, vượt xe và tránh chướng ngại vật.", 115],
] as const;

type View = "home" | "weak-picker" | "preset-picker" | "exam" | "result";
type AnswerMap = Record<number, number | null>;
type Session = {
  id: string;
  mode: PracticeMode;
  title: string;
  questions: Question[];
  timer: "question" | "exam" | "none";
  timeLimitSeconds: number | null;
  presetId?: number;
};
type ExamResult = {
  id: string;
  mode: PracticeMode;
  title: string;
  rows: Array<{ question: Question; selected: number | null; isCorrect: boolean }>;
  score: number;
  passed: boolean | null;
  lietWrong: boolean;
  presetId?: number;
};

function modeTitle(mode: PracticeMode) {
  if (mode === "reaction") return "Luyện nhanh — 30 giây/câu";
  if (mode === "mock") return "Thi thử hạng B";
  if (mode === "liet") return "60 câu điểm liệt";
  if (mode === "full") return "Học 600 câu";
  if (mode === "chapter") return "Học theo chương";
  return "20 bộ ôn cố định";
}

function formatTimer(seconds: number | null) {
  if (seconds === null) return "∞";
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

function AppHeader({ sound, onSound, onHome, onSettings }: { sound: boolean; onSound: () => void; onHome: () => void; onSettings: () => void }) {
  return (
    <header className="site-header">
      <button className="brand-lockup" onClick={onHome} aria-label="Về góc học của Bắp">
        <span className="brand-mark"><PawPrint size={22} /></span>
        <span className="brand-copy"><span className="brand-name">Bắp con học lái</span><span className="brand-subtitle">600 câu thôi, học cùng nhau nha</span></span>
      </button>
      <div className="header-actions">
        <span className="header-pill"><Sparkles size={14} /> Góc học của Bắp</span>
        <button className="icon-button" onClick={onSound} aria-label={sound ? "Tắt âm thanh" : "Bật âm thanh"}>{sound ? <Volume2 size={19} /> : <VolumeX size={19} />}</button>
        <button className="icon-button" onClick={onSettings} aria-label="Mở cài đặt"><Settings size={19} /></button>
      </div>
    </header>
  );
}

function Explanation({ question, selected }: { question: Question; selected: number | null }) {
  const isCorrect = selected === question.correct;
  const explanation = question.explanation;
  const summary = explanation?.summary || "Chưa có giải thích chi tiết cho câu này.";
  const whyCorrect = explanation?.whyCorrect || summary;
  const visualExplanations = explanation?.visualExplanations || [];
  return (
    <div className={`explanation-block ${isCorrect ? "is-correct" : "is-wrong"}`}>
      <strong>{isCorrect ? "Đáp án đúng" : "Bắp nhầm ở đâu?"}</strong>
      {!isCorrect && <p className="explanation-correct">Đáp án đúng: {question.options[question.correct]}</p>}
      <p>{summary}</p>
      {visualExplanations.length > 0 && <div className="visual-explanations"><strong>Ý nghĩa từng biển/vạch</strong>{visualExplanations.map((item) => <div className="visual-explanation-item" key={`${item.label}-${item.name}`}><p><strong>{item.label} — {item.name}</strong>{item.code && <span className="visual-code"> ({item.code})</span>}</p><p>Ý nghĩa: {item.meaning}</p></div>)}</div>}
      <p><strong>Vì sao đáp án này đúng?</strong> {whyCorrect}</p>
      {explanation?.memoryTip && <p className="explanation-tip"><strong>Nhớ nhanh:</strong> {explanation.memoryTip}</p>}
    </div>
  );
}

function QuestionImages({ question, current = false, onReady }: { question: Question; current?: boolean; onReady?: (ready: boolean) => void }) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setFailed({});
    setLoaded({});
    onReady?.(question.images.length === 0);
  }, [question.id, question.images.length, onReady]);
  if (!question.images.length) return null;
  const ready = question.images.every((image) => loaded[image]);
  return (
    <div className="question-images" aria-label="Hình minh họa trong đề">
      {question.images.map((src, index) => failed[src] ? (
        <div className="question-image-fallback" key={src}>
          <ImageIcon size={26} /><span>Hình chưa tải được, thử lại nha.</span>
          <button className="ghost-button small-button" onClick={() => { setFailed((old) => { const next = { ...old }; delete next[src]; return next; }); setLoaded((old) => ({ ...old, [src]: false })); onReady?.(false); }}>Tải lại hình</button>
        </div>
      ) : (
        <img
          className={`question-image ${question.images.length === 1 ? "single-image" : ""}`}
          key={src}
          src={src}
          alt={`Hình minh họa câu ${question.id} - ${index + 1}`}
          loading={current ? "eager" : "lazy"}
          decoding="async"
          onLoad={async (event) => {
            try { await event.currentTarget.decode?.(); } catch { /* onLoad can already include decode */ }
            setLoaded((old) => {
              const next = { ...old, [src]: true };
              if (question.images.every((image) => next[image])) onReady?.(true);
              return next;
            });
          }}
          onError={() => { setFailed((old) => ({ ...old, [src]: true })); onReady?.(false); }}
        />
      ))}
      {current && !ready && !Object.keys(failed).length && <span className="image-loading-copy">Đang tải hình để bắt đầu tính giờ...</span>}
    </div>
  );
}

function SettingsModal({ sound, onSound, onClose, onLock, onExport, onImport, onReset, onWipe }: {
  sound: boolean;
  onSound: () => void;
  onClose: () => void;
  onLock: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  onWipe: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header"><div><p className="eyebrow">Dữ liệu học</p><h2 id="settings-title">Cài đặt</h2></div><button className="icon-button" onClick={onClose} aria-label="Đóng"><X size={18} /></button></div>
        <div className="settings-list">
          <div className="settings-row"><div><strong>Âm thanh</strong><span>Âm thanh chạm và hoàn thành bài</span></div><button className={`toggle-button ${sound ? "on" : ""}`} onClick={onSound}>{sound ? "BẬT" : "TẮT"}</button></div>
          <div className="settings-group"><strong>Dữ liệu học</strong><button className="settings-action" onClick={onExport}><Download size={16} /> Xuất tiến trình</button><button className="settings-action" onClick={() => input.current?.click()}><Upload size={16} /> Khôi phục tiến trình</button><input ref={input} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = ""; }} /><button className="settings-action danger" onClick={onReset}><RotateCcw size={16} /> Học lại từ đầu</button></div>
          <div className="settings-group"><strong>Thiết bị</strong><button className="settings-action" onClick={onLock}><LockKeyhole size={16} /> Khóa lại</button></div>
          <div className="settings-group danger-group"><strong>Nguy hiểm</strong><button className="settings-action danger" onClick={onWipe}><Trash2 size={16} /> Xóa toàn bộ dữ liệu trên thiết bị</button></div>
        </div>
      </section>
    </div>
  );
}

function HomeView({ progress, currentSession, sound, onSound, onStart, onWrong, onResume, onDiscard, onSettings, onChapter, onVisualReview }: {
  progress: ProgressData;
  currentSession: CurrentSession | null;
  sound: boolean;
  onSound: () => void;
  onStart: (mode: PracticeMode) => void;
  onWrong: () => void;
  onResume: () => void;
  onDiscard: () => void;
  onSettings: () => void;
  onChapter: (chapter: number) => void;
  onVisualReview: (visual: VisualProgress) => void;
}) {
  const summary = getProgressSummary(QUESTION_BANK, progress);
  const weakVisuals = getWeakVisuals(progress);
  const cards: Array<[PracticeMode, string, string, string, string]> = [
    ["reaction", "Luyện nhanh — 30 giây/câu", "30 câu trộn đều luật, biển báo và tình huống để Bắp đọc kỹ rồi chọn chắc.", "30 câu · 30 giây/câu", "pink-card"],
    ["mock", "Thi thử hạng B", "Một đề tự sinh theo cấu trúc thật, có câu liệt và mốc đạt 27/30.", "30 câu · 20 phút", "blue-card"],
    ["liet", "60 câu điểm liệt", "Những câu bắt buộc phải đúng khi thi thật. Mình ôn kỹ phần này nha.", "60 câu · không giới hạn", "orange-card"],
    ["preset", "20 bộ ôn cố định — phủ đủ 600 câu", "Mỗi câu trong bộ 600 xuất hiện một lần để Bắp học hết ngân hàng.", "20 bộ · phủ đủ 600 câu", "lavender-card"],
    ["full", "Học 600 câu", "Đi từng câu thong thả, không giới hạn thời gian.", "600 câu · không giới hạn", "mint-card"],
  ];
  return (
    <>
      <AppHeader sound={sound} onSound={onSound} onHome={() => undefined} onSettings={onSettings} />
      <main className="container page-section">
        <section className="hero-section"><div className="hero-grid"><article className="hero-card"><div className="hero-kicker"><Heart size={15} fill="currentColor" /> hello, Bắp iu</div><h1 className="hero-title">Bắp học lái nè.</h1><p className="hero-description">Góc nhỏ để Bắp luyện 600 câu lý thuyết theo nhịp của mình. Muốn học phần nào thì mình bắt đầu phần đó nha.</p><div className="hero-actions"><button className="primary-button" onClick={() => onStart("reaction")}><Zap size={17} /> Luyện nhanh 30 giây</button><button className="secondary-button" onClick={() => onStart("mock")}><GraduationCap size={17} /> Thi thử ngay</button><button className="ghost-button" onClick={() => onStart("liet")}><ShieldAlert size={16} /> 60 câu liệt</button></div></article><CatMascot soundEnabled={sound} /></div><div className="driver-permit-container"><DriverLicenseCard seen={summary.seen} mastered={summary.mastered} bestMock={progress.stats.mock.bestScore} /></div></section>

        {currentSession && currentSession.currentIndex < currentSession.questionIds.length && <section className="resume-card"><div><p className="eyebrow">Học tiếp nha?</p><h2>Đang ở câu {currentSession.currentIndex + 1} / {currentSession.questionIds.length}</h2><p>{currentSession.title}</p></div><div className="resume-actions"><button className="primary-button small-button" onClick={onResume}><Play size={15} /> Tiếp tục</button><button className="ghost-button small-button" onClick={onDiscard}>Bỏ bài này</button></div></section>}

        <section className="progress-dashboard section-block"><div className="section-heading"><div><p className="eyebrow">Tiến độ của Bắp</p><h2 className="section-title">Mình đã học tới đâu rồi?</h2></div><p className="section-note">Số liệu tính từ từng câu Bắp đã trả lời trên thiết bị này.</p></div><div className="progress-dashboard-grid"><div className="progress-main-card"><div className="progress-main-heading"><strong>{summary.seen} / 600 câu đã gặp</strong><span>{Math.round(summary.seen / 6)}%</span></div><div className="progress-track large-track"><div className="progress-fill" style={{ width: `${Math.max(summary.seen ? 2 : 0, summary.seen / 6)}%` }} /></div><div className="progress-stat-grid"><button onClick={() => onStart("full")}><strong>{summary.correct}</strong><span>Đã trả lời đúng</span></button><button onClick={() => onStart("full")}><strong>{summary.mastered}</strong><span>Đã thuộc</span></button><button onClick={onWrong}><strong>{summary.needsReview}</strong><span>Cần ôn lại</span></button><button onClick={() => onStart("full")}><strong>{summary.unseen}</strong><span>Chưa học</span></button></div></div><button className="weak-questions-card" onClick={onWrong}><span className="mode-icon orange"><ShieldAlert size={22} /></span><strong>Câu Bắp hay nhầm</strong><span>Mấy câu mình từng chọn sai, gom lại đây để coi lại nha.</span><span className="weak-card-action">{summary.needsReview ? `${summary.needsReview} câu cần coi lại` : "Chưa có câu sai"} <ChevronRight size={16} /></span></button></div></section>

        <section className="section-block visual-mistakes-section"><div className="section-heading"><div><p className="eyebrow">Biển Bắp hay nhầm</p><h2 className="section-title">Nhớ cả biển, không chỉ nhớ câu</h2></div><p className="section-note">Mỗi lần gặp câu có hình, Bông ghi lại các biển/vạch để Bắp ôn riêng.</p></div>{weakVisuals.length > 0 ? <div className="visual-mistakes-grid">{weakVisuals.slice(0, 6).map((visual) => <button className="visual-mistake-card" key={visual.code ? `code:${visual.code}` : `${visual.label}:${visual.name}`} onClick={() => onVisualReview(visual)}><span className="visual-mistake-label">{visual.label}{visual.code && ` · ${visual.code}`}</span><strong>{visual.name}</strong><span>Sai: {visual.wrongCount} lần · Đúng: {visual.correctCount} lần</span><small>Ôn lại <ChevronRight size={14} /></small></button>)}</div> : <div className="empty-state">Bắp chưa có biển nào được ghi nhận là hay nhầm nha.</div>}</section>

        <section className="section-block"><div className="section-heading"><div><p className="eyebrow">Hôm nay học gì nè?</p><h2 className="section-title">Chọn một nhịp học vừa sức</h2></div><p className="section-note">Muốn học phần nào thì mình bắt đầu phần đó nha.</p></div><div className="mode-grid">{cards.map(([mode, title, description, meta, tone]) => <article className={`mode-card ${tone}`} key={mode} onClick={() => onStart(mode)} role="button" tabIndex={0}><span className="mode-icon pink"><BookOpen size={25} /></span><h3 className="mode-title">{title}</h3><p className="mode-description">{description}</p><div className="mode-bottom"><span className="mode-meta"><Clock3 size={14} /> {meta}</span><ChevronRight size={18} /></div></article>)}</div></section>

        <section className="section-block"><div className="section-heading"><div><p className="eyebrow">6 chương lý thuyết</p><h2 className="section-title">Học theo chương</h2></div><p className="section-note">Mỗi chương tính tiến độ trực tiếp từ dữ liệu câu Bắp đã học.</p></div><div className="chapters-grid">{CHAPTERS.map(([chapter, title, description, count]) => { const chapterSummary = getChapterSummary(QUESTION_BANK, progress, chapter); return <article className="chapter-card" key={chapter} onClick={() => onChapter(chapter)} role="button" tabIndex={0}><div className="chapter-top"><span className="chapter-pill pink-pill"><BookOpen size={14} /> Chương {chapter}</span><span className="chapter-count">{count} câu</span></div><h4 className="chapter-name">{title}</h4><p className="chapter-desc">{description}</p><p className="chapter-progress-copy">Đã học {chapterSummary.seen} / {count} · Đã thuộc {chapterSummary.mastered} · Ôn lại {chapterSummary.needsReview}</p><div className="chapter-action"><span>Học chương này</span><ArrowRight size={14} /></div></article>; })}</div></section>

        <section className="section-block"><div className="section-heading"><div><p className="eyebrow">Mấy mẹo Bắp dễ quên</p><h2 className="section-title">Nhắc nhanh trước khi thi</h2></div><p className="section-note">Bông nhắc Bắp nè 🐾</p></div><div className="tip-active-card"><p className="tip-active-content">Gặp câu có “bị nghiêm cấm”, đọc kỹ lại đáp án vì đây thường là nhóm quy định cấm cần nhớ.</p></div></section>
      </main>
    </>
  );
}

function PresetPicker({ presets, onBack, onStart }: { presets: PresetExam[]; onBack: () => void; onStart: (preset: PresetExam) => void }) {
  return <main className="container page-section"><div className="preset-header"><button className="icon-button" onClick={onBack} aria-label="Quay lại"><ArrowLeft size={19} /></button><div><p className="eyebrow">Học trọn bộ câu hỏi</p><h1 className="page-title">20 bộ ôn cố định — phủ đủ 600 câu</h1><p className="page-subtitle">Mỗi câu trong bộ 600 xuất hiện một lần để Bắp có thể học hết ngân hàng câu hỏi.</p></div></div><div className="preset-grid">{presets.map((preset) => <article className="preset-card" key={preset.id} onClick={() => onStart(preset)} role="button" tabIndex={0}><div className="preset-topline"><span className="preset-number">{String(preset.id).padStart(2, "0")}</span><span className="soft-pill">30 câu</span></div><h2 className="preset-title">{preset.title}</h2><p className="preset-detail">Bộ ôn cố định {preset.questions.length} câu từ ngân hàng 600 câu.</p><button className="secondary-button small-button preset-start-btn" onClick={(event) => { event.stopPropagation(); onStart(preset); }}>Vào học <ChevronRight size={15} /></button></article>)}</div></main>;
}

function WeakQuestionsPicker({ progress, onBack, onStart }: { progress: ProgressData; onBack: () => void; onStart: (questions: Question[]) => void }) {
  const [filter, setFilter] = useState<"all" | "repeat" | "never" | "chapter">("all");
  const [chapter, setChapter] = useState(1);
  const weak = getWeakQuestions(QUESTION_BANK, progress);
  const questions = weak.filter((question) => filter === "all" || (filter === "repeat" && (progress.questions[String(question.id)]?.wrongCount ?? 0) >= 2) || (filter === "never" && (progress.questions[String(question.id)]?.correctCount ?? 0) === 0) || (filter === "chapter" && question.chapter === chapter));
  return <main className="container page-section"><div className="preset-header"><button className="icon-button" onClick={onBack} aria-label="Quay lại"><ArrowLeft size={19} /></button><div><p className="eyebrow">Câu Bắp hay nhầm</p><h1 className="page-title">Mình coi lại chỗ này nha</h1><p className="page-subtitle">Mấy câu từng chọn sai được xếp theo số lần sai và lần trả lời gần nhất.</p></div></div><div className="filter-tabs weak-filter-tabs"><button className={`filter-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>Tất cả</button><button className={`filter-tab ${filter === "repeat" ? "active" : ""}`} onClick={() => setFilter("repeat")}>Sai từ 2 lần</button><button className={`filter-tab ${filter === "never" ? "active" : ""}`} onClick={() => setFilter("never")}>Chưa từng đúng</button><button className={`filter-tab ${filter === "chapter" ? "active" : ""}`} onClick={() => setFilter("chapter")}>Theo chương</button>{filter === "chapter" && <select className="chapter-filter-select" value={chapter} onChange={(event) => setChapter(Number(event.target.value))}>{CHAPTERS.map(([id]) => <option value={id} key={id}>Chương {id}</option>)}</select>}</div><div className="weak-list">{questions.map((question) => { const item = progress.questions[String(question.id)]; return <article className="weak-list-item" key={question.id}><div><strong>Câu #{question.id}</strong><span>{question.categoryLabel} · Sai {item?.wrongCount ?? 0} lần</span><p>{question.question}</p></div></article>; })}</div>{questions.length > 0 && <button className="primary-button" onClick={() => onStart(questions)}><Play size={16} /> Học {questions.length} câu này</button>}{questions.length === 0 && <div className="empty-state">Chưa có câu nào trong bộ lọc này nha.</div>}</main>;
}

function Timer({ seconds, max, label }: { seconds: number | null; max: number; label: string }) {
  const ratio = Math.max(0, Math.min(1, (seconds ?? 0) / Math.max(max, 1)));
  return <div className="side-panel timer-panel"><div className="analog-wrap" aria-hidden="true"><div className="analog-dial"><div className="analog-hand" style={{ transform: `rotate(${(1 - ratio) * 360}deg)` }} /><div className="analog-center" /><div className="analog-display">{formatTimer(seconds)}</div></div></div><p className="timer-caption">{label}</p></div>;
}

function ExamView({ session, index, answers, seconds, ready, sound, onReady, onAnswer, onNext, onPrevious, onJump, onExit, onFinish }: {
  session: Session;
  index: number;
  answers: AnswerMap;
  seconds: number | null;
  ready: boolean;
  sound: boolean;
  onReady: (ready: boolean) => void;
  onAnswer: (answer: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onJump: (index: number) => void;
  onExit: () => void;
  onFinish: () => void;
}) {
  const question = session.questions[index];
  const selected = answers[question.id] ?? null;
  const isReaction = session.mode === "reaction";
  const answered = session.questions.filter((item) => answers[item.id] !== undefined && answers[item.id] !== null).length;
  const immediateExplanation = ["full", "chapter", "liet"].includes(session.mode);
  useEffect(() => {
    const next = session.questions[index + 1];
    next?.images.forEach((src) => { const image = new Image(); image.src = src; });
  }, [index, session.questions]);
  return <main className="container exam-page"><div className="exam-toolbar"><button className="icon-button" onClick={onExit} aria-label="Thoát bài"><ArrowLeft size={19} /></button><div className="exam-toolbar-center"><div className="exam-progress-copy"><span className="exam-title-pill">{session.title}</span><span className="exam-counter">Câu <strong>{index + 1}</strong>/{session.questions.length}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${((index + 1) / session.questions.length) * 100}%` }} /></div></div><span className="header-pill"><LayoutGrid size={15} /> {answered}/{session.questions.length}</span></div><div className="exam-layout"><section className="exam-card"><div className="question-header"><div className="question-meta-row"><div className="question-label"><span>Câu số</span><strong>#{question.id}</strong></div><span className={`category-pill ${CATEGORY_COLORS[question.category] || "pink"}`}>{question.categoryLabel}</span></div><h1 className="question-title">{question.question}</h1></div><QuestionImages key={question.id} question={question} current onReady={onReady} /><div className="answer-list">{question.options.map((option, optionIndex) => <button className={`answer-option ${selected === optionIndex ? "selected" : ""}`} key={`${question.id}-${optionIndex}`} onClick={() => { onAnswer(optionIndex); playSound("tap", sound); }} aria-pressed={selected === optionIndex}><span className="answer-letter">{String.fromCharCode(65 + optionIndex)}</span><span className="answer-text">{option}</span>{selected === optionIndex ? <Check size={18} /> : <span />}</button>)}</div>{immediateExplanation && selected !== null && <Explanation question={question} selected={selected} />}<div className="exam-footer"><span className="mode-meta"><Clock3 size={15} />{question.images.length && !ready ? "Hình chưa tải xong, timer sẽ bắt đầu sau khi hình sẵn sàng" : session.timer === "none" ? "Không giới hạn thời gian" : isReaction ? "30 giây cho câu này" : "20 phút cho bài thi"}</span><div className="exam-footer-actions">{!isReaction && index > 0 && <button className="ghost-button small-button" onClick={onPrevious}><ArrowLeft size={15} /> Câu trước</button>}<button className="primary-button small-button" onClick={onNext}>{index === session.questions.length - 1 ? "Xem kết quả" : "Câu tiếp theo"}<ArrowRight size={15} /></button></div></div></section><aside className="side-stack">{session.timer === "none" ? <div className="side-panel timer-panel"><Clock3 size={29} color="#72a7c1" /><p className="timer-caption">Bắp cứ học thong thả nha</p></div> : <Timer seconds={seconds} max={session.timer === "question" ? 30 : session.timeLimitSeconds || 1} label={isReaction ? "Còn lại cho câu này" : "Thời gian bài thi"} />}<div className="side-panel question-map-panel"><h2 className="side-panel-title"><span><LayoutGrid size={16} /> Bảng câu hỏi</span><small>{answered}/{session.questions.length}</small></h2><div className="question-map-scroll" aria-label="Danh sách câu hỏi có thể cuộn"><div className="question-map">{session.questions.map((item, itemIndex) => <button className={`map-button ${itemIndex === index ? "current" : ""} ${answers[item.id] !== undefined && answers[item.id] !== null ? "answered" : ""}`} key={item.id} disabled={isReaction} onClick={() => onJump(itemIndex)}>{itemIndex + 1}</button>)}</div></div><button className="ghost-button small-button finish-exam-btn" onClick={onFinish}>Nộp bài sớm</button></div></aside></div></main>;
}

function ResultView({ result, onRetry, onNew, onHome }: { result: ExamResult; onRetry: () => void; onNew: () => void; onHome: () => void }) {
  const [filter, setFilter] = useState<"all" | "wrong" | "correct">("all");
  const wrong = result.rows.filter((row) => !row.isCorrect).length;
  const rows = result.rows.filter((row) => filter === "all" || (filter === "wrong" ? !row.isCorrect : row.isCorrect));
  return <main className="container page-section"><div className="result-hero"><div className="score-ring"><span className="score-value">{result.score}</span><span className="score-total">/{result.rows.length}</span></div><div className="result-copy"><span className="result-pill">{result.passed === null ? "Hoàn thành bài luyện" : result.passed ? "ĐẠT YÊU CẦU 🎉" : "CHƯA ĐẠT"}</span><h1 className="result-title">{result.passed ? "Đậu rồi nè 🥳" : result.lietWrong ? "Dính câu điểm liệt rồi." : "Chưa qua lần này rồi."}</h1><p className="result-desc">{result.passed ? `Sai ${wrong} câu. Coi lại một lượt nha.` : "Sai chỗ nào mình coi lại chỗ đó nha."}</p><div className="result-actions"><button className="primary-button small-button" onClick={onRetry}><RotateCcw size={15} /> Làm lại</button><button className="secondary-button small-button" onClick={onNew}><Sparkles size={15} /> {result.mode === "mock" ? "Đề mới" : "Làm đề khác"}</button><button className="ghost-button small-button" onClick={onHome}><PawPrint size={15} /> Về góc học</button></div></div></div><section className="review-section"><div className="review-header"><div><h2 className="section-title">Xem lại đáp án</h2><p className="section-note">Tổng {result.rows.length} câu · Đúng {result.score} · Sai {wrong}</p></div><div className="filter-tabs"><button className={`filter-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>Tất cả ({result.rows.length})</button><button className={`filter-tab ${filter === "wrong" ? "active" : ""}`} onClick={() => setFilter("wrong")}>Câu sai ({wrong})</button><button className={`filter-tab ${filter === "correct" ? "active" : ""}`} onClick={() => setFilter("correct")}>Câu đúng ({result.score})</button></div></div><div className="review-list">{rows.map(({ question, selected, isCorrect }) => <article className={`review-card ${isCorrect ? "correct-card" : "wrong-card"}`} key={question.id}><div className="review-card-top"><span className="question-label">Câu #{question.id}</span><span className={`review-status-badge ${isCorrect ? "badge-correct" : "badge-wrong"}`}>{isCorrect ? <><CheckCircle2 size={16} /> Đúng</> : <><X size={16} /> Sai</>}</span></div><h3 className="review-question-title">{question.question}</h3><QuestionImages question={question} /><div className="review-options">{question.options.map((option, optionIndex) => <div className={`review-option-row ${optionIndex === question.correct ? "is-right" : selected === optionIndex ? "is-wrong-choice" : ""}`} key={optionIndex}><span className="review-opt-letter">{String.fromCharCode(65 + optionIndex)}</span><span className="review-opt-text">{option}</span>{optionIndex === question.correct && <span className="review-badge-right"><Check size={14} /> Đáp án đúng</span>}{selected === optionIndex && optionIndex !== question.correct && <span className="review-badge-wrong"><X size={14} /> Em đã chọn</span>}</div>)}</div>{!isCorrect && <Explanation question={question} selected={selected} />}</article>)}</div></section></main>;
}

export function ExamApp() {
  const [view, setView] = useState<View>("home");
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [seconds, setSeconds] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [progress, setProgress] = useState<ProgressData>(() => createDefaultProgress());
  const [sound, setSound] = useState(true);
  const [settings, setSettings] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { lockAccess } = useAccessGate();
  const presets = useMemo(() => buildPresetExams(QUESTION_BANK), []);

  useEffect(() => { const saved = loadProgress(); setProgress(saved); setSound(saved.settings.sound); setHydrated(true); }, []);
  useEffect(() => { const sync = (event: StorageEvent) => { if (event.key !== PROGRESS_KEY) return; const saved = loadProgress(); setProgress(saved); setSound(saved.settings.sound); }; window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync); }, []);
  const commit = (next: ProgressData) => { setProgress(next); saveProgress(next); };
  const toggleSound = () => { const next = !sound; setSound(next); commit({ ...progress, settings: { ...progress.settings, sound: next } }); if (next) playSound("toggle", true); };

  const snapshot = (active: Session, activeIndex: number, activeAnswers: AnswerMap, remaining: number | null) => {
    const current: CurrentSession = { id: active.id, mode: active.mode, title: active.title, questionIds: active.questions.map((question) => question.id), currentIndex: activeIndex, answers: Object.fromEntries(Object.entries(activeAnswers).map(([id, answer]) => [String(id), answer])), startedAt: progress.currentSession?.id === active.id ? progress.currentSession.startedAt : new Date().toISOString(), timer: active.timer, remainingSeconds: remaining, timeLimitSeconds: active.timeLimitSeconds, presetId: active.presetId };
    return current;
  };
  const saveSnapshot = (active: Session, activeIndex = index, activeAnswers = answers, remaining = seconds) => { setProgress((old) => { const next = { ...old, currentSession: snapshot(active, activeIndex, activeAnswers, remaining) }; saveProgress(next); return next; }); };

  const finish = () => {
    if (!session) return;
    let score = 0;
    let lietWrong = false;
    const rows = session.questions.map((question) => { const selected = answers[question.id] ?? null; const isCorrect = selected === question.correct; if (isCorrect) score += 1; if (question.isLiet && !isCorrect) lietWrong = true; return { question, selected, isCorrect }; });
    const passed = session.mode === "mock" || session.mode === "preset" ? score >= 27 && !lietWrong : session.mode === "liet" ? score === session.questions.length : null;
    const nextResult: ExamResult = { id: session.id, mode: session.mode, title: session.title, rows, score, passed, lietWrong, presetId: session.presetId };
    let next: ProgressData = { ...progress, currentSession: null, examHistory: [...progress.examHistory, { id: session.id, type: session.mode, score, total: session.questions.length, passed, questionIds: session.questions.map((question) => question.id), wrongQuestionIds: rows.filter((row) => !row.isCorrect).map((row) => row.question.id), createdAt: new Date().toISOString() }].slice(-100) };
    if (session.mode === "mock" || session.mode === "reaction" || session.mode === "liet") next = updateModeProgress(next, session.mode, score, session.questions.length);
    commit(next); setResult(nextResult); setView("result"); window.scrollTo({ top: 0, behavior: "smooth" }); playSound(passed ? "finish" : "timeout", sound);
  };

  useEffect(() => {
    if (!hydrated || view !== "exam" || !session || session.timer === "none" || !ready) return;
    if (seconds === null) { setSeconds(session.timer === "question" ? 30 : session.timeLimitSeconds); return; }
    if (seconds <= 0) { if (session.timer === "question" && index < session.questions.length - 1) { setIndex((old) => old + 1); setReady(false); setSeconds(null); } else finish(); return; }
    const timer = window.setInterval(() => { setSeconds((old) => { const next = old === null ? null : old - 1; if (session) saveSnapshot(session, index, answers, next); return next; }); }, 1000);
    return () => window.clearInterval(timer);
  }, [answers, hydrated, index, ready, seconds, session, view]);

  const start = (mode: PracticeMode, customQuestions?: Question[], title?: string, presetId?: number) => {
    let questions = customQuestions || [];
    let timer: Session["timer"] = "none";
    let limit: number | null = null;
    let titleValue = title || modeTitle(mode);
    if (!customQuestions && mode === "reaction") { questions = makeReactionSet(QUESTION_BANK); timer = "question"; limit = 30; }
    if (!customQuestions && mode === "mock") { questions = makeMockExam(QUESTION_BANK); timer = "exam"; limit = 20 * 60; }
    if (!customQuestions && mode === "liet") { questions = makeLietSet(QUESTION_BANK); titleValue = "60 câu điểm liệt"; }
    if (!customQuestions && mode === "full") questions = QUESTION_BANK;
    if (!questions.length) return;
    const nextSession: Session = { id: `${mode}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, mode, title: titleValue, questions, timer, timeLimitSeconds: limit, presetId };
    setSession(nextSession); setIndex(0); setAnswers({}); setSeconds(null); setReady(false); setResult(null); setView("exam"); commit({ ...progress, currentSession: { id: nextSession.id, mode, title: titleValue, questionIds: questions.map((question) => question.id), currentIndex: 0, answers: {}, startedAt: new Date().toISOString(), timer, remainingSeconds: null, timeLimitSeconds: limit, presetId } }); playSound("tap", sound); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const resume = () => {
    const saved = progress.currentSession; if (!saved) return;
    const questions = saved.questionIds.map((id) => QUESTION_BANK.find((question) => question.id === id)).filter((question): question is Question => Boolean(question));
    if (questions.length !== saved.questionIds.length) { commit({ ...progress, currentSession: null }); return; }
    const restored: Session = { id: saved.id, mode: saved.mode === "weak" ? "chapter" : saved.mode, title: saved.title, questions, timer: saved.timer, timeLimitSeconds: saved.timeLimitSeconds, presetId: saved.presetId };
    setSession(restored); setIndex(Math.min(saved.currentIndex, questions.length - 1)); setAnswers(Object.fromEntries(Object.entries(saved.answers).map(([id, answer]) => [Number(id), answer]))); setSeconds(saved.timer === "question" ? null : saved.remainingSeconds); setReady(false); setView("exam");
  };
  const answer = (option: number) => { if (!session) return; const question = session.questions[index]; const wasAnswered = answers[question.id] !== undefined && answers[question.id] !== null; const nextAnswers = { ...answers, [question.id]: option }; setAnswers(nextAnswers); if (!wasAnswered) setProgress((old) => { let next = updateQuestionProgress(old, question.id, option, option === question.correct); next = updateVisualProgress(next, question, option === question.correct); saveProgress(next); return next; }); saveSnapshot(session, index, nextAnswers, seconds); };
  const nextQuestion = () => { if (!session) return; if (index >= session.questions.length - 1) { finish(); return; } const nextIndex = index + 1; setIndex(nextIndex); setReady(false); if (session.timer === "question") setSeconds(null); saveSnapshot(session, nextIndex, answers, session.timer === "question" ? null : seconds); };
  const previousQuestion = () => { if (!session || index <= 0) return; const nextIndex = index - 1; setIndex(nextIndex); setReady(false); if (session.timer === "question") setSeconds(null); saveSnapshot(session, nextIndex, answers, session.timer === "question" ? null : seconds); };
  const jump = (nextIndex: number) => { if (!session || session.timer === "question") return; setIndex(nextIndex); setReady(false); saveSnapshot(session, nextIndex, answers, seconds); };

  if (!hydrated) return null;
  const home = () => { if (session && view === "exam") saveSnapshot(session); setView("home"); };
  return <div className="app-shell"><CatEffects />{view === "home" && <HomeView progress={progress} currentSession={progress.currentSession} sound={sound} onSound={toggleSound} onStart={(mode) => mode === "preset" ? setView("preset-picker") : start(mode)} onWrong={() => setView("weak-picker")} onResume={resume} onDiscard={() => commit({ ...progress, currentSession: null })} onSettings={() => setSettings(true)} onChapter={(chapter) => start("chapter", makeChapterSet(QUESTION_BANK, chapter), `Chương ${chapter}: ${CHAPTERS[chapter - 1][1]}`)} onVisualReview={(visual) => { const questions = QUESTION_BANK.filter((question) => question.explanation?.visualExplanations?.some((item) => visual.code ? item.code === visual.code : item.label === visual.label && item.name === visual.name)); if (questions.length) start("chapter", questions, `${visual.label} — ${visual.name}`); }} />}{view === "weak-picker" && <><AppHeader sound={sound} onSound={toggleSound} onHome={home} onSettings={() => setSettings(true)} /><WeakQuestionsPicker progress={progress} onBack={home} onStart={(questions) => start("chapter", questions, "Câu Bắp hay nhầm")} /></>}{view === "preset-picker" && <><AppHeader sound={sound} onSound={toggleSound} onHome={home} onSettings={() => setSettings(true)} /><PresetPicker presets={presets} onBack={home} onStart={(preset) => start("preset", preset.questions, preset.title, preset.id)} /></>}{view === "exam" && session && <><AppHeader sound={sound} onSound={toggleSound} onHome={home} onSettings={() => setSettings(true)} /><ExamView session={session} index={index} answers={answers} seconds={seconds} ready={ready} sound={sound} onReady={setReady} onAnswer={answer} onNext={nextQuestion} onPrevious={previousQuestion} onJump={jump} onExit={home} onFinish={finish} /></>}{view === "result" && result && <><AppHeader sound={sound} onSound={toggleSound} onHome={home} onSettings={() => setSettings(true)} /><ResultView result={result} onRetry={() => session && start(session.mode, session.questions, session.title, session.presetId)} onNew={() => session && (session.mode === "mock" || session.mode === "reaction" ? start(session.mode) : start(session.mode, session.questions, session.title, session.presetId))} onHome={home} /></>}{settings && <SettingsModal sound={sound} onSound={toggleSound} onClose={() => setSettings(false)} onLock={() => { setSettings(false); lockAccess(); }} onExport={() => { const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "bap-progress.json"; link.click(); URL.revokeObjectURL(url); }} onImport={(file) => { const reader = new FileReader(); reader.onload = () => { try { const parsed: unknown = JSON.parse(String(reader.result)); const restored = normalizeProgress(parsed, sound); validateProgress(restored); if (!window.confirm("Khôi phục tiến trình này và ghi đè dữ liệu hiện tại nha?")) return; commit(restored); setSound(restored.settings.sound); setSession(null); setResult(null); setView("home"); setSettings(false); } catch { window.alert("File tiến trình chưa đúng định dạng nên Bắp chưa thể khôi phục nha."); } }; reader.readAsText(file); }} onReset={() => { if (!window.confirm("Bắp muốn học lại từ đầu hả? Việc này sẽ xóa câu đã học, lịch sử thi, câu hay sai và bài đang làm. Mã truy cập vẫn được giữ.")) return; commit(createDefaultProgress(sound)); setSession(null); setResult(null); setView("home"); setSettings(false); }} onWipe={() => { if (!window.confirm("Xóa luôn tiến trình, cài đặt và trạng thái đã mở khóa trên thiết bị này nha?")) return; try { window.localStorage.removeItem(PROGRESS_KEY); window.localStorage.removeItem("bap_con_sound"); window.localStorage.removeItem("bap_con_stats"); } catch { /* storage may be unavailable */ } setSettings(false); lockAccess(); }} />}</div>;
}
