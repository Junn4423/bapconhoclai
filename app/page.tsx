"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  GraduationCap,
  Heart,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  ListChecks,
  MapPin,
  PawPrint,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trophy,
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

const QUESTION_BANK = questionData.questions as Question[];

type View = "home" | "preset-picker" | "exam" | "result";
type ReviewFilter = "wrong" | "correct" | "all";
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

type ResultRow = {
  question: Question;
  selected: number | null;
  isCorrect: boolean;
};

type ExamResult = {
  id: string;
  mode: PracticeMode;
  title: string;
  rows: ResultRow[];
  score: number;
  passed: boolean | null;
  lietWrong: boolean;
  presetId?: number;
};

type Stats = {
  sessions: number;
  best: number;
  remembered: number;
};

const INITIAL_STATS: Stats = { sessions: 0, best: 0, remembered: 0 };

const CHAPTERS_LIST = [
  {
    chapter: 1,
    title: "Chương 1: Pháp luật & quy tắc giao thông",
    desc: "Khái niệm, quy tắc chung, làn đường, tốc độ và các quy định xử phạt cơ bản.",
    count: 180,
    tone: "pink-pill",
    icon: BookOpen,
  },
  {
    chapter: 2,
    title: "Chương 2: Nghiệp vụ vận tải & đạo đức lái xe",
    desc: "Văn hóa ứng xử, trách nhiệm của người lái xe và kỹ năng sơ cứu ban đầu.",
    count: 25,
    tone: "peach-pill",
    icon: Heart,
  },
  {
    chapter: 3,
    title: "Chương 3: Kỹ thuật lái xe ô tô",
    desc: "Thao tác trên xe, lùi xe, quay đầu, phanh gấp, lái xe trời mưa và sương mù.",
    count: 58,
    tone: "blue-pill",
    icon: Compass,
  },
  {
    chapter: 4,
    title: "Chương 4: Cấu tạo & sửa chữa ô tô",
    desc: "Động cơ, hệ thống phanh, lốp xe, bảng đồng hồ và cách chăm sóc xe thường ngày.",
    count: 37,
    tone: "lavender-pill",
    icon: Car,
  },
  {
    chapter: 5,
    title: "Chương 5: Hệ thống biển báo đường bộ",
    desc: "Biển cấm, biển nguy hiểm, biển hiệu lệnh, biển chỉ dẫn và vạch kẻ đường.",
    count: 185,
    tone: "mint-pill",
    icon: MapPin,
  },
  {
    chapter: 6,
    title: "Chương 6: Sa hình & xử lý tình huống",
    desc: "Nguyên tắc quyền ưu tiên tại giao lộ, sa hình vượt xe và tránh chướng ngại vật.",
    count: 115,
    tone: "yellow-pill",
    icon: Zap,
  },
];

const modeCards: Array<{
  mode: PracticeMode;
  title: string;
  description: string;
  meta: string;
  tone: string;
  iconTone: "pink" | "blue" | "mint" | "lavender" | "orange";
  icon: LucideIcon;
  badge?: string;
}> = [
  {
    mode: "reaction",
    title: "Luyện phản xạ 5 giây",
    description:
      "30 câu trộn đều luật, biển báo và tình huống để em tập nhìn nhanh, chọn chắc.",
    meta: "30 câu · 5 giây/câu",
    tone: "pink-card",
    iconTone: "pink",
    icon: Zap,
  },
  {
    mode: "mock",
    title: "Thi thử hạng B chuẩn",
    description:
      "Một đề tự sinh theo cấu trúc thật, có câu liệt và mốc đạt 27/30 để em làm quen.",
    meta: "30 câu · 20 phút",
    tone: "blue-card",
    iconTone: "blue",
    icon: GraduationCap,
    badge: "Chuẩn đề thi",
  },
  {
    mode: "liet",
    title: "60 Câu điểm liệt cấp tốc",
    description:
      "Những câu hỏi bắt buộc đúng 100% khi thi thật. Ôn kỹ phần này là an tâm 90%!",
    meta: "60 câu · không giới hạn",
    tone: "orange-card",
    iconTone: "orange",
    icon: ShieldAlert,
    badge: "Bắt buộc thuộc",
  },
  {
    mode: "preset",
    title: "20 Đề thi có sẵn",
    description:
      "Mỗi đề gồm 30 câu được cố định từ đủ bộ 600 câu, thi lại vẫn giữ nguyên đề.",
    meta: "20 đề · đề không đổi",
    tone: "lavender-card",
    iconTone: "lavender",
    icon: ListChecks,
  },
  {
    mode: "full",
    title: "Luyện trọn bộ 600 câu",
    description:
      "Đi từng câu thật thong thả, không giới hạn thời gian và xem lại mọi lựa chọn sau cùng.",
    meta: "600 câu · không giới hạn",
    tone: "mint-card",
    iconTone: "mint",
    icon: BookOpen,
  },
];

const QUICK_TIPS = [
  {
    title: "Mẹo nhận biết câu điểm liệt",
    content:
      "Các câu có đáp án chứa cụm từ: 'Bị nghiêm cấm', 'Không được phép', 'Không được lùi/quay đầu', 'Không được mang vác' -> 99% đó là đáp án ĐÚNG!",
    icon: ShieldAlert,
    tone: "orange",
  },
  {
    title: "Thứ tự xe ưu tiên giao lộ",
    content:
      "Nhớ câu thần chú: 'HỎA - SỰ - AN - THƯƠNG' (Xe cứu hỏa > Xe quân sự > Xe công an > Xe cứu thương). Tiếp theo là xe trên đường ưu tiên.",
    icon: Car,
    tone: "blue",
  },
  {
    title: "Nguyên tắc nhường đường vòng xuyến",
    content:
      "CÓ đảo an toàn (bùng binh): Nhường xe bên TRÁI. KHÔNG CÓ đảo an toàn: Nhường xe bên PHẢI đi tới.",
    icon: Compass,
    tone: "mint",
  },
  {
    title: "Mẹo nhớ các loại biển báo",
    content:
      "Tròn đỏ = CẤM. Tam giác vàng viền đỏ = NGUY HIỂM. Tròn xanh = HIỆU LỆNH (phải làm). Vuông / Chữ nhật xanh = CHỈ DẪN.",
    icon: MapPin,
    tone: "pink",
  },
];

function formatTimer(seconds: number | null) {
  if (seconds === null) {
    return "∞";
  }
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remaining = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function getModeTitle(mode: PracticeMode) {
  if (mode === "reaction") return "Luyện phản xạ 5 giây";
  if (mode === "mock") return "Thi thử hạng B";
  if (mode === "liet") return "60 Câu điểm liệt";
  if (mode === "full") return "Luyện trọn bộ 600 câu";
  if (mode === "chapter") return "Luyện theo chương";
  return "Thi theo đề có sẵn";
}

function AppHeader({
  soundEnabled,
  onToggleSound,
  onHome,
}: {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onHome: () => void;
}) {
  return (
    <header className="site-header">
      <button className="brand-lockup" onClick={onHome} aria-label="Về góc học của Minh Anh">
        <span className="brand-mark">
          <PawPrint size={22} strokeWidth={2.2} />
        </span>
        <span className="brand-copy">
          <span className="brand-name">Minh Anh học lái</span>
          <span className="brand-subtitle">little road, big confidence</span>
        </span>
      </button>
      <div className="header-actions">
        <span className="header-pill">
          <Sparkles size={14} />
          Góc học dịu dàng
        </span>
        <button
          className="icon-button"
          onClick={onToggleSound}
          aria-label={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
          title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
        >
          {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>
      </div>
    </header>
  );
}

function HomeView({
  stats,
  soundEnabled,
  onStart,
  onStartPresetPicker,
  onStartChapter,
}: {
  stats: Stats;
  soundEnabled: boolean;
  onStart: (mode: PracticeMode) => void;
  onStartPresetPicker: () => void;
  onStartChapter: (chapter: number) => void;
}) {
  const [activeTipTab, setActiveTipTab] = useState(0);

  return (
    <main className="container page-section">
      {/* Hero Section with Interactive Cat Mascot */}
      <section className="hero-section">
        <div className="hero-grid">
          <article className="hero-card">
            <div className="hero-kicker">
              <Heart size={15} fill="currentColor" />
              hello, Minh Anh
            </div>
            <h1 className="hero-title">
              Học lái thật <span>nhẹ nhàng.</span>
            </h1>
            <p className="hero-description">
              Chào Minh Anh, đây là góc nhỏ để em luyện 600 câu lý thuyết theo
              nhịp của mình. Mỗi lần học một chút, phản xạ sẽ chắc hơn và ngày
              thi cũng bớt hồi hộp hơn.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button hero-cta-btn"
                onClick={() => onStart("reaction")}
              >
                <Zap size={17} fill="currentColor" />
                Luyện phản xạ 5s
              </button>
              <button
                className="secondary-button"
                onClick={() => onStart("mock")}
              >
                <GraduationCap size={17} />
                Thi thử ngay
              </button>
              <button
                className="ghost-button"
                onClick={() => onStart("liet")}
              >
                <ShieldAlert size={16} />
                60 câu liệt
              </button>
            </div>
          </article>

          {/* Interactive Mascot Component */}
          <CatMascot soundEnabled={soundEnabled} />
        </div>

        {/* Driver License Progress Permit */}
        <div className="driver-permit-container">
          <DriverLicenseCard
            sessions={stats.sessions}
            best={stats.best}
            remembered={stats.remembered}
          />
        </div>
      </section>

      {/* Practice Modes Section */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">choose your quest</p>
            <h2 className="section-title">Hôm nay em muốn học kiểu nào?</h2>
          </div>
          <p className="section-note">
            Chọn một nhịp học vừa sức. Khi cần nghỉ, em cứ dừng lại rồi quay lại
            bất cứ lúc nào.
          </p>
        </div>

        <div className="mode-grid">
          {modeCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                className={`mode-card ${card.tone}`}
                key={card.mode}
                onClick={() => {
                  if (card.mode === "preset") {
                    onStartPresetPicker();
                  } else {
                    onStart(card.mode);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {card.badge && (
                  <span className="mode-badge-tag">{card.badge}</span>
                )}
                <span className={`mode-icon ${card.iconTone}`}>
                  <Icon size={25} strokeWidth={2.2} />
                </span>
                <h3 className="mode-title">{card.title}</h3>
                <p className="mode-description">{card.description}</p>
                <div className="mode-bottom">
                  <span className="mode-meta">
                    <Clock3 size={14} />
                    {card.meta}
                  </span>
                  <span className="mini-arrow" aria-hidden="true">
                    <ChevronRight size={18} />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 6 Chapters Explorer */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">master the 6 chapters</p>
            <h2 className="section-title">Khám phá 6 chương lý thuyết</h2>
          </div>
          <p className="section-note">
            Em có thể ôn luyện riêng từng chương để nắm chắc kiến thức trước khi thi tổng hợp.
          </p>
        </div>

        <div className="chapters-grid">
          {CHAPTERS_LIST.map((chap) => {
            const Icon = chap.icon;
            return (
              <div
                className="chapter-card"
                key={chap.chapter}
                onClick={() => onStartChapter(chap.chapter)}
                role="button"
                tabIndex={0}
              >
                <div className="chapter-top">
                  <span className={`chapter-pill ${chap.tone}`}>
                    <Icon size={14} />
                    Chương {chap.chapter}
                  </span>
                  <span className="chapter-count">{chap.count} câu</span>
                </div>
                <h4 className="chapter-name">{chap.title}</h4>
                <p className="chapter-desc">{chap.desc}</p>
                <div className="chapter-action">
                  <span>Học chương này</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Driving Tips & Flashcards */}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">quick revision cards</p>
            <h2 className="section-title">Mẹo nhớ nhanh trong phòng thi</h2>
          </div>
          <p className="section-note">
            Những bí kíp đơn giản nhưng cực kỳ hữu ích giúp Minh Anh không bao giờ bị bẫy!
          </p>
        </div>

        <div className="tips-showcase">
          <div className="tips-tabs">
            {QUICK_TIPS.map((tip, idx) => {
              const Icon = tip.icon;
              return (
                <button
                  className={`tip-tab-btn ${activeTipTab === idx ? "active" : ""}`}
                  key={tip.title}
                  onClick={() => setActiveTipTab(idx)}
                >
                  <Icon size={16} />
                  <span>{tip.title}</span>
                </button>
              );
            })}
          </div>

          <div className="tip-active-card">
            <div className="tip-active-header">
              <Sparkles size={20} className="sparkle-spin" />
              <h3>{QUICK_TIPS[activeTipTab].title}</h3>
            </div>
            <p className="tip-active-content">
              {QUICK_TIPS[activeTipTab].content}
            </p>
            <div className="tip-card-footer">
              <span>Được biên soạn riêng cho Minh Anh</span>
              <PawPrint size={15} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PresetPickerView({
  presets,
  onBack,
  onStart,
}: {
  presets: PresetExam[];
  onBack: () => void;
  onStart: (preset: PresetExam) => void;
}) {
  return (
    <main className="container page-section">
      <div className="preset-header">
        <button className="icon-button" onClick={onBack} aria-label="Quay về trang chính">
          <ArrowLeft size={19} />
        </button>
        <div>
          <p className="eyebrow">fixed paper selection</p>
          <h1 className="page-title">20 Đề thi cố định chuẩn</h1>
          <p className="page-subtitle">
            Mỗi đề gồm 30 câu đại diện đủ các nhóm nội dung. Dù em thi lại bao
            nhiêu lần thì câu hỏi của đề đó vẫn không thay đổi.
          </p>
        </div>
      </div>

      <div className="preset-grid">
        {presets.map((exam) => (
          <article
            className="preset-card"
            key={exam.id}
            onClick={() => onStart(exam)}
            role="button"
            tabIndex={0}
          >
            <div className="preset-topline">
              <span className="preset-number">
                {String(exam.id).padStart(2, "0")}
              </span>
              <span className="soft-pill">30 câu</span>
            </div>
            <h2 className="preset-title">{exam.title}</h2>
            <p className="preset-detail">
              Cố định {exam.questions.length} câu từ ngân hàng 600 câu.
            </p>
            <button
              className="secondary-button small-button preset-start-btn"
              onClick={(e) => {
                e.stopPropagation();
                onStart(exam);
              }}
            >
              Vào thi
              <ChevronRight size={15} />
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}

function AnalogTimer({
  seconds,
  maxSeconds,
  label,
}: {
  seconds: number | null;
  maxSeconds: number;
  label: string;
}) {
  const safeSeconds = Math.max(0, seconds ?? 0);
  const ratio = Math.max(0, Math.min(1, safeSeconds / Math.max(1, maxSeconds)));
  const angle = (1 - ratio) * 360;

  return (
    <div className="side-panel timer-panel">
      <div className="analog-wrap" aria-hidden="true">
        <div className="analog-dial">
          <div className="analog-hand" style={{ transform: `rotate(${angle}deg)` }} />
          <div className="analog-center" />
          <div className="analog-display">{formatTimer(seconds)}</div>
        </div>
      </div>
      <p className="timer-caption">{label}</p>
    </div>
  );
}

function QuestionImages({ question }: { question: Question }) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  if (!question.images.length) {
    return null;
  }

  return (
    <div className="question-images" aria-label="Hình minh họa trong đề">
      {question.images.map((image, index) => {
        const isFailed = failedImages[image];

        if (isFailed) {
          return (
            <div className="question-image-fallback" key={image}>
              <ImageIcon size={26} />
              <span>Hình minh họa câu {question.id} ({index + 1})</span>
            </div>
          );
        }

        return (
          <img
            className={`question-image ${question.images.length === 1 ? "single-image" : ""}`}
            src={image}
            alt={`Hình minh họa câu ${question.id} - ${index + 1}`}
            key={image}
            loading="lazy"
            onError={() => {
              setFailedImages((prev) => ({ ...prev, [image]: true }));
            }}
          />
        );
      })}
    </div>
  );
}

function ExamView({
  session,
  currentIndex,
  answers,
  remainingSeconds,
  soundEnabled,
  onAnswer,
  onExit,
  onPrevious,
  onNext,
  onJump,
  onFinish,
}: {
  session: Session;
  currentIndex: number;
  answers: AnswerMap;
  remainingSeconds: number | null;
  soundEnabled: boolean;
  onAnswer: (index: number) => void;
  onExit: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onJump: (index: number) => void;
  onFinish: () => void;
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const question = session.questions[currentIndex];
  const selected = answers[question.id] ?? null;
  const isReaction = session.mode === "reaction";
  const maxTimer = session.timer === "question" ? 5 : session.timeLimitSeconds ?? 1;
  const progress = ((currentIndex + 1) / session.questions.length) * 100;
  const answeredCount = session.questions.reduce(
    (count, item) => count + (answers[item.id] !== undefined && answers[item.id] !== null ? 1 : 0),
    0,
  );
  const colorTone = CATEGORY_COLORS[question.category] || "pink";

  return (
    <main className="container exam-page">
      {/* Top Toolbar */}
      <div className="exam-toolbar">
        <button className="icon-button" onClick={onExit} aria-label="Thoát bài thi">
          <ArrowLeft size={19} />
        </button>

        <div className="exam-toolbar-center">
          <div className="exam-progress-copy">
            <span className="exam-title-pill">{session.title}</span>
            <span className="exam-counter">
              Câu <strong>{currentIndex + 1}</strong>/{session.questions.length}
            </span>
          </div>
          <div
            className="progress-track"
            aria-label={`Đã đi được ${Math.round(progress)} phần trăm`}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="exam-toolbar-actions">
          {/* Mobile timer pill */}
          {session.timer !== "none" && (
            <span className="mobile-timer-pill">
              <Clock3 size={14} className="timer-pulse" />
              {formatTimer(remainingSeconds)}
            </span>
          )}

          {/* Button to open question grid drawer on mobile */}
          <button
            className="header-pill mobile-drawer-btn"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Xem bảng câu hỏi"
          >
            <LayoutGrid size={15} />
            <span>{answeredCount}/{session.questions.length}</span>
          </button>
        </div>
      </div>

      <div className="exam-layout">
        {/* Main Question Card */}
        <section className="exam-card">
          <div className="question-header">
            {/* Metadata row: No squishing, clean and full-width title */}
            <div className="question-meta-row">
              <div className="question-label">
                <span>Câu số</span>
                <strong>#{question.id}</strong>
              </div>
              <div className="question-tags">
                <span className={`category-pill ${colorTone}`}>
                  <BookOpen size={14} />
                  {question.categoryLabel}
                </span>
                {question.isLiet && (
                  <span className="category-pill liet-pill">
                    <ShieldAlert size={14} />
                    Câu điểm liệt
                  </span>
                )}
              </div>
            </div>

            <h1 className="question-title">{question.question}</h1>
          </div>

          <QuestionImages question={question} />

          <div className="answer-list">
            {question.options.map((option, optionIndex) => {
              const isSelected = selected === optionIndex;
              return (
                <button
                  className={`answer-option ${isSelected ? "selected" : ""}`}
                  key={`${question.id}-${optionIndex}`}
                  onClick={() => {
                    onAnswer(optionIndex);
                    playSound("tap", soundEnabled);
                  }}
                  aria-pressed={isSelected}
                >
                  <span className="answer-letter">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="answer-text">{option}</span>
                  {isSelected ? (
                    <span className="answer-check-icon">
                      <Check size={18} />
                    </span>
                  ) : (
                    <span className="answer-check-placeholder" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="exam-footer">
            <span className="mode-meta">
              <ImageIcon size={15} />
              {question.images.length
                ? "Có hình minh họa sa hình / biển báo"
                : "Đọc kỹ từng ý đáp án em nhé"}
            </span>
            <div className="exam-footer-actions">
              {!isReaction && currentIndex > 0 && (
                <button
                  className="ghost-button small-button"
                  onClick={onPrevious}
                >
                  <ArrowLeft size={15} />
                  Câu trước
                </button>
              )}
              <button
                className="primary-button small-button"
                onClick={onNext}
              >
                {currentIndex === session.questions.length - 1
                  ? "Xem kết quả"
                  : "Câu tiếp theo"}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>

        {/* Desktop Sidebar: Timer & Question Map */}
        <aside className="side-stack">
          {session.timer === "none" ? (
            <div className="side-panel timer-panel">
              <Clock3 size={29} color="#72a7c1" />
              <p className="timer-caption">
                Em cứ học thong thả, không giới hạn thời gian
              </p>
            </div>
          ) : (
            <AnalogTimer
              seconds={remainingSeconds}
              maxSeconds={maxTimer}
              label={isReaction ? "Còn lại cho câu này" : "Thời gian bài thi"}
            />
          )}

          <div className="side-panel">
            <h2 className="side-panel-title">
              <span>
                <LayoutGrid size={16} /> Bảng câu hỏi
              </span>
              <small>
                {answeredCount}/{session.questions.length}
              </small>
            </h2>
            <div className="question-map">
              {session.questions.map((item, index) => {
                const isAnswered =
                  answers[item.id] !== undefined && answers[item.id] !== null;
                return (
                  <button
                    className={`map-button ${
                      index === currentIndex ? "current" : ""
                    } ${isAnswered ? "answered" : ""}`}
                    key={item.id}
                    onClick={() => onJump(index)}
                    disabled={isReaction}
                    aria-label={`Đi tới câu ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <button
              className="ghost-button small-button finish-exam-btn"
              onClick={onFinish}
            >
              Nộp bài sớm
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile Drawer for Question Grid */}
      {mobileDrawerOpen && (
        <div className="drawer-overlay" onClick={() => setMobileDrawerOpen(false)}>
          <div
            className="drawer-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="drawer-handle" />
            <div className="drawer-header">
              <h3>
                <LayoutGrid size={18} /> Bảng danh sách câu hỏi
              </h3>
              <button
                className="icon-button small-btn"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Đóng bảng câu hỏi"
              >
                <X size={18} />
              </button>
            </div>
            <div className="drawer-stats">
              <span>Đã chọn: <strong>{answeredCount}</strong>/{session.questions.length}</span>
            </div>
            <div className="question-map drawer-map">
              {session.questions.map((item, index) => {
                const isAnswered =
                  answers[item.id] !== undefined && answers[item.id] !== null;
                return (
                  <button
                    className={`map-button ${
                      index === currentIndex ? "current" : ""
                    } ${isAnswered ? "answered" : ""}`}
                    key={item.id}
                    onClick={() => {
                      onJump(index);
                      setMobileDrawerOpen(false);
                    }}
                    disabled={isReaction}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="drawer-footer">
              <button
                className="primary-button small-button"
                onClick={() => setMobileDrawerOpen(false)}
                style={{ width: "100%" }}
              >
                Tiếp tục làm bài
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ResultView({
  result,
  soundEnabled,
  onRetry,
  onHome,
}: {
  result: ExamResult;
  soundEnabled: boolean;
  onRetry: () => void;
  onHome: () => void;
}) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const total = result.rows.length;
  const percentage = Math.round((result.score / Math.max(1, total)) * 100);

  const filteredRows = useMemo(() => {
    if (filter === "wrong") return result.rows.filter((r) => !r.isCorrect);
    if (filter === "correct") return result.rows.filter((r) => r.isCorrect);
    return result.rows;
  }, [filter, result.rows]);

  const wrongCount = result.rows.filter((r) => !r.isCorrect).length;

  return (
    <main className="container page-section">
      <div className="result-hero">
        <div className="score-ring">
          <span className="score-value">{result.score}</span>
          <span className="score-total">/{total}</span>
        </div>

        <div className="result-copy">
          <div className="result-badge-row">
            <span className="result-pill">
              {result.passed === null
                ? "Hoàn thành bài luyện"
                : result.passed
                ? "ĐẠT YÊU CẦU 🎉"
                : "CHƯA ĐẠT"}
            </span>
            {result.lietWrong && (
              <span className="result-pill warning-pill">
                <ShieldAlert size={14} />
                Sai câu điểm liệt
              </span>
            )}
          </div>
          <h1 className="result-title">
            {result.passed === true
              ? "Tuyệt vời lắm Minh Anh ơi!"
              : result.lietWrong
              ? "Rất tiếc, dính câu điểm liệt rồi!"
              : percentage >= 80
              ? "Làm tốt lắm, gần đạt điểm tuyệt đối rồi!"
              : "Không sao cả, mỗi lần luyện là một lần nhớ!"}
          </h1>
          <p className="result-desc">
            {result.passed === true
              ? "Em đã hoàn thành xuất sắc vòng thi này. Hãy tiếp tục giữ vững phong độ nhé!"
              : result.lietWrong
              ? "Chỉ cần sai 1 câu điểm liệt là trượt cả bài thi. Em bấm vào bộ lọc 'Câu làm sai' bên dưới để xem lại kỹ câu này nhé."
              : `Em đúng được ${result.score}/${total} câu (${percentage}%). Thử lại một vòng nữa để chắc tay hơn nhé!`}
          </p>

          <div className="result-actions">
            <button className="primary-button small-button" onClick={onRetry}>
              <RotateCcw size={15} />
              Luyện lại đề này
            </button>
            <button className="ghost-button small-button" onClick={onHome}>
              <PawPrint size={15} />
              Về góc học tập
            </button>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <section className="review-section">
        <div className="review-header">
          <div>
            <h2 className="section-title">Xem lại đáp án chi tiết</h2>
            <p className="section-note">
              Tổng số {total} câu · Đúng {result.score} câu · Sai {wrongCount} câu
            </p>
          </div>

          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              Tất cả ({total})
            </button>
            <button
              className={`filter-tab ${filter === "wrong" ? "active" : ""}`}
              onClick={() => setFilter("wrong")}
            >
              Câu sai ({wrongCount})
            </button>
            <button
              className={`filter-tab ${filter === "correct" ? "active" : ""}`}
              onClick={() => setFilter("correct")}
            >
              Câu đúng ({result.score})
            </button>
          </div>
        </div>

        <div className="review-list">
          {filteredRows.map(({ question, selected, isCorrect }, idx) => (
            <article
              className={`review-card ${isCorrect ? "correct-card" : "wrong-card"}`}
              key={question.id}
            >
              <div className="review-card-top">
                <div className="review-meta">
                  <span className="question-label">Câu #{question.id}</span>
                  <span
                    className={`category-pill ${
                      CATEGORY_COLORS[question.category] || "pink"
                    }`}
                  >
                    {question.categoryLabel}
                  </span>
                  {question.isLiet && (
                    <span className="category-pill liet-pill">
                      <ShieldAlert size={14} /> Điểm liệt
                    </span>
                  )}
                </div>

                <span
                  className={`review-status-badge ${
                    isCorrect ? "badge-correct" : "badge-wrong"
                  }`}
                >
                  {isCorrect ? (
                    <>
                      <CheckCircle2 size={16} /> Đúng
                    </>
                  ) : (
                    <>
                      <X size={16} /> Sai
                    </>
                  )}
                </span>
              </div>

              <h3 className="review-question-title">{question.question}</h3>

              {question.images.length > 0 && (
                <QuestionImages question={question} />
              )}

              <div className="review-options">
                {question.options.map((opt, optIdx) => {
                  const isUserChoice = selected === optIdx;
                  const isRightAnswer = question.correct === optIdx;

                  let statusClass = "";
                  if (isRightAnswer) statusClass = "is-right";
                  if (isUserChoice && !isCorrect) statusClass = "is-wrong-choice";

                  return (
                    <div
                      className={`review-option-row ${statusClass}`}
                      key={optIdx}
                    >
                      <span className="review-opt-letter">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="review-opt-text">{opt}</span>
                      {isRightAnswer && (
                        <span className="review-badge-right">
                          <Check size={14} /> Đáp án đúng
                        </span>
                      )}
                      {isUserChoice && !isRightAnswer && (
                        <span className="review-badge-wrong">
                          <X size={14} /> Em đã chọn
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function Page() {
  const [view, setView] = useState<View>("home");
  const [session, setSession] = useState<Session | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);

  const presets = useMemo(() => buildPresetExams(QUESTION_BANK), []);

  // Load stats & sound setting from localStorage
  useEffect(() => {
    try {
      const savedStats = localStorage.getItem("minh_anh_stats");
      if (savedStats) setStats(JSON.parse(savedStats));

      const savedSound = localStorage.getItem("minh_anh_sound");
      if (savedSound !== null) setSoundEnabled(savedSound === "true");
    } catch {
      // Ignore localStorage errors in private mode
    }
  }, []);

  const saveStats = (newStats: Stats) => {
    setStats(newStats);
    try {
      localStorage.setItem("minh_anh_stats", JSON.stringify(newStats));
    } catch {}
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem("minh_anh_sound", String(next));
    } catch {}
    if (next) {
      playSound("toggle", true);
    }
  };

  // Exam timer logic
  useEffect(() => {
    if (view !== "exam" || remainingSeconds === null) return;

    if (remainingSeconds <= 0) {
      if (session?.timer === "question") {
        // Auto advance in reaction mode
        if (session && currentIndex < session.questions.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setRemainingSeconds(5);
        } else {
          finishExam();
        }
      } else {
        // Auto finish when exam timer expires
        finishExam();
      }
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [view, remainingSeconds, currentIndex, session]);

  const startSession = (
    mode: PracticeMode,
    customQuestions?: Question[],
    title?: string,
    presetId?: number,
  ) => {
    let questions: Question[] = [];
    let timer: "question" | "exam" | "none" = "none";
    let timeLimitSeconds: number | null = null;
    let examTitle = title || getModeTitle(mode);

    if (customQuestions) {
      questions = customQuestions;
    } else if (mode === "reaction") {
      questions = makeReactionSet(QUESTION_BANK, 30);
      timer = "question";
      timeLimitSeconds = 5;
    } else if (mode === "mock") {
      questions = makeMockExam(QUESTION_BANK, 30);
      timer = "exam";
      timeLimitSeconds = 20 * 60; // 20 minutes
    } else if (mode === "liet") {
      questions = makeLietSet(QUESTION_BANK);
      timer = "none";
      examTitle = "60 Câu điểm liệt sống còn";
    } else if (mode === "full") {
      questions = QUESTION_BANK;
      timer = "none";
    }

    const newSession: Session = {
      id: `${mode}-${Date.now()}`,
      mode,
      title: examTitle,
      questions,
      timer,
      timeLimitSeconds,
      presetId,
    };

    setSession(newSession);
    setCurrentIndex(0);
    setAnswers({});
    setRemainingSeconds(
      timer === "question" ? 5 : timeLimitSeconds,
    );
    setView("exam");
    playSound("tap", soundEnabled);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartChapter = (chapterNumber: number) => {
    const questions = makeChapterSet(QUESTION_BANK, chapterNumber);
    const chapterMeta = CHAPTERS_LIST.find((c) => c.chapter === chapterNumber);
    startSession(
      "chapter",
      questions,
      chapterMeta ? chapterMeta.title : `Chương ${chapterNumber}`,
    );
  };

  const handleAnswer = (optionIndex: number) => {
    if (!session) return;
    const currentQ = session.questions[currentIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex,
    }));
  };

  const finishExam = () => {
    if (!session) return;

    let score = 0;
    let lietWrong = false;

    const rows: ResultRow[] = session.questions.map((q) => {
      const userChoice = answers[q.id] ?? null;
      const isCorrect = userChoice === q.correct;
      if (isCorrect) score += 1;
      if (q.isLiet && !isCorrect) lietWrong = true;
      return {
        question: q,
        selected: userChoice,
        isCorrect,
      };
    });

    let passed: boolean | null = null;
    if (session.mode === "mock" || session.mode === "preset") {
      passed = score >= 27 && !lietWrong;
    } else if (session.mode === "liet") {
      passed = score === session.questions.length;
    }

    const newResult: ExamResult = {
      id: session.id,
      mode: session.mode,
      title: session.title,
      rows,
      score,
      passed,
      lietWrong,
      presetId: session.presetId,
    };

    setResult(newResult);
    setView("result");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Update stats
    const updatedStats: Stats = {
      sessions: stats.sessions + 1,
      best: Math.max(stats.best, score),
      remembered: Math.min(600, stats.remembered + Math.round(score * 0.4)),
    };
    saveStats(updatedStats);

    // Play celebration or finish chime
    playSound(passed ? "finish" : "timeout", soundEnabled);
  };

  return (
    <div className="app-shell">
      {/* Interactive Cat Cursor & Trail Effects */}
      <CatEffects />

      {/* Persistent App Header */}
      <AppHeader
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onHome={() => {
          playSound("tap", soundEnabled);
          setView("home");
        }}
      />

      {/* Main Views */}
      {view === "home" && (
        <HomeView
          stats={stats}
          soundEnabled={soundEnabled}
          onStart={(mode) => startSession(mode)}
          onStartPresetPicker={() => {
            playSound("tap", soundEnabled);
            setView("preset-picker");
          }}
          onStartChapter={handleStartChapter}
        />
      )}

      {view === "preset-picker" && (
        <PresetPickerView
          presets={presets}
          onBack={() => {
            playSound("tap", soundEnabled);
            setView("home");
          }}
          onStart={(preset) =>
            startSession("preset", preset.questions, preset.title, preset.id)
          }
        />
      )}

      {view === "exam" && session && (
        <ExamView
          session={session}
          currentIndex={currentIndex}
          answers={answers}
          remainingSeconds={remainingSeconds}
          soundEnabled={soundEnabled}
          onAnswer={handleAnswer}
          onExit={() => {
            playSound("tap", soundEnabled);
            setView("home");
          }}
          onPrevious={() => {
            if (currentIndex > 0) {
              playSound("tap", soundEnabled);
              setCurrentIndex((prev) => prev - 1);
              if (session.timer === "question") setRemainingSeconds(5);
            }
          }}
          onNext={() => {
            playSound("tap", soundEnabled);
            if (currentIndex < session.questions.length - 1) {
              setCurrentIndex((prev) => prev + 1);
              if (session.timer === "question") setRemainingSeconds(5);
            } else {
              finishExam();
            }
          }}
          onJump={(index) => {
            playSound("tap", soundEnabled);
            setCurrentIndex(index);
            if (session.timer === "question") setRemainingSeconds(5);
          }}
          onFinish={finishExam}
        />
      )}

      {view === "result" && result && (
        <ResultView
          result={result}
          soundEnabled={soundEnabled}
          onRetry={() => {
            if (session) {
              startSession(
                session.mode,
                session.questions,
                session.title,
                session.presetId,
              );
            }
          }}
          onHome={() => {
            playSound("tap", soundEnabled);
            setView("home");
          }}
        />
      )}
    </div>
  );
}
