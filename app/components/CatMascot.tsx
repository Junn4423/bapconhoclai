"use client";

import { useState, useEffect } from "react";
import { Sparkles, Heart, RefreshCw } from "lucide-react";
import { playSound } from "@/lib/sound";

const CAT_QUOTES = [
  "Chào Minh Anh! Hôm nay mình cùng chinh phục vài đề nha ✨",
  "Mẹo nhỏ nè: Thấy từ 'Bị nghiêm cấm' là 99% chọn ngay nha em!",
  "Biển tròn đỏ = CẤM, Tam giác vàng = NGUY HIỂM, Biển xanh = HIỆU LỆNH!",
  "Thứ tự xe ưu tiên: Hỏa - Sự - An - Thương (Cứu hỏa > Quân sự > Công an > Cứu thương)!",
  "Nhường đường vòng xuyến: Có đảo thì nhường TRÁI, Không đảo thì nhường PHẢI nha!",
  "60 câu điểm liệt rất quan trọng, Minh Anh nhớ ôn thật kỹ nhen!",
  "Mỗi lần học một chút, phản xạ sẽ chắc và thi sẽ bớt hồi hộp hơn nhiều!",
  "Bông tin chắc Minh Anh thi một phát là 30/30 luôn nè 🚗💨",
  "Nghỉ tay xíu nào, vuốt ve Bông lấy hên nha ~ Purrr purrr 🐾",
  "Nhớ nguyên tắc vàng: Giảm tốc độ, chú ý quan sát!",
];

const PURR_REACTIONS = [
  "Meo meo~ Minh Anh vuốt thích quá đi à! Cố lên nhen ❤️",
  "Purrrrr~ Năng lượng may mắn đã được truyền sang Minh Anh rồi đó!",
  "Ngoan ngoan~ Học mệt nhớ uống nước rồi học tiếp nha cô gái!",
  "Meowww~ Tặng Minh Anh 100 điểm tự tin đi thi nè! 🐾",
  "Bông đang gừ gừ vì Minh Anh chăm chỉ quá chừng luôn đó! 🥰",
];

export function CatMascot({ soundEnabled }: { soundEnabled: boolean }) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isHappy, setIsHappy] = useState(false);
  const [petCount, setPetCount] = useState(0);
  const [purrText, setPurrText] = useState<string | null>(null);

  // Auto rotate quote occasionally
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % CAT_QUOTES.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const handlePet = () => {
    setPetCount((prev) => prev + 1);
    setIsHappy(true);
    const reaction =
      PURR_REACTIONS[Math.floor(Math.random() * PURR_REACTIONS.length)];
    setPurrText(reaction);

    // Play sound
    if (soundEnabled) {
      playSound(Math.random() > 0.5 ? "meow" : "purr", true);
    }

    // Reset happy bounce after 1.2s
    setTimeout(() => {
      setIsHappy(false);
    }, 1400);
  };

  const handleNextTip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuoteIndex((prev) => (prev + 1) % CAT_QUOTES.length);
    setPurrText(null);
    if (soundEnabled) {
      playSound("tap", true);
    }
  };

  return (
    <div
      className={`cat-mascot-card ${isHappy ? "is-petted" : ""}`}
      onClick={handlePet}
      role="button"
      tabIndex={0}
      title="Bấm để vuốt ve Mèo Bông!"
    >
      {/* Speech Bubble */}
      <div className="cat-speech-bubble">
        <div className="cat-bubble-header">
          <span className="cat-bubble-tag">
            <Sparkles size={13} />
            Study Buddy của Minh Anh
          </span>
          <button
            className="cat-next-tip-btn"
            onClick={handleNextTip}
            aria-label="Đổi mẹo khác"
            title="Đổi mẹo khác"
          >
            <RefreshCw size={13} />
            <span>Mẹo khác</span>
          </button>
        </div>
        <p className="cat-bubble-text">
          {purrText || CAT_QUOTES[quoteIndex]}
        </p>
        <div className="bubble-tail" aria-hidden="true" />
      </div>

      {/* SVG Mascot Character */}
      <div className="cat-character-stage">
        <div className={`cat-svg-wrapper ${isHappy ? "cat-bounce" : ""}`}>
          <svg
            viewBox="0 0 200 180"
            className="cat-mascot-svg"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Shadow */}
            <ellipse
              cx="100"
              cy="165"
              rx="68"
              ry="12"
              fill="rgba(196, 172, 192, 0.28)"
            />

            {/* Swishing Tail */}
            <path
              className="cat-tail"
              d="M140 145 C175 145 185 110 170 95 C158 83 150 96 155 106 C162 118 152 135 136 137 Z"
              fill="#A8B4C0"
              stroke="#8B9AA8"
              strokeWidth="2.5"
            />

            {/* Body */}
            <ellipse
              cx="100"
              cy="125"
              rx="46"
              ry="38"
              fill="#B4C0CC"
              stroke="#8B9AA8"
              strokeWidth="2.5"
            />

            {/* White chest bib */}
            <path
              d="M82 108 C82 135 118 135 118 108 C118 98 82 98 82 108 Z"
              fill="#FFF8FA"
            />

            {/* Cute Yellow Driving Bowtie / Bell */}
            <ellipse cx="100" cy="98" rx="8" ry="8" fill="#FFD166" stroke="#E5B23B" strokeWidth="1.5" />
            <circle cx="100" cy="99" r="2.5" fill="#C49118" />

            {/* Left Ear */}
            <path
              className="cat-ear-left"
              d="M62 65 L48 24 C58 20 80 40 82 52 Z"
              fill="#A8B4C0"
              stroke="#8B9AA8"
              strokeWidth="2.5"
            />
            <path d="M63 56 L54 32 C62 30 75 44 76 50 Z" fill="#FFAEC7" />

            {/* Right Ear */}
            <path
              className="cat-ear-right"
              d="M138 65 L152 24 C142 20 120 40 118 52 Z"
              fill="#A8B4C0"
              stroke="#8B9AA8"
              strokeWidth="2.5"
            />
            <path d="M137 56 L146 32 C138 30 125 44 124 50 Z" fill="#FFAEC7" />

            {/* Head */}
            <ellipse
              cx="100"
              cy="65"
              rx="45"
              ry="38"
              fill="#B4C0CC"
              stroke="#8B9AA8"
              strokeWidth="2.5"
            />

            {/* Head Stripes */}
            <path d="M100 32 L100 45" stroke="#8B9AA8" strokeWidth="3" strokeLinecap="round" />
            <path d="M90 35 L93 46" stroke="#8B9AA8" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M110 35 L107 46" stroke="#8B9AA8" strokeWidth="2.5" strokeLinecap="round" />

            {/* Eyes */}
            {isHappy ? (
              // Heart eyes or happy squint
              <>
                <path
                  d="M75 62 Q85 53 91 62"
                  stroke="#5C4D58"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M109 62 Q115 53 125 62"
                  stroke="#5C4D58"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </>
            ) : (
              // Big curious amber eyes with blink
              <>
                <ellipse className="cat-eye" cx="82" cy="62" rx="7" ry="8" fill="#F4A261" />
                <ellipse className="cat-pupil" cx="83" cy="62" rx="3.5" ry="6" fill="#3D343A" />
                <circle cx="80.5" cy="59.5" r="2.5" fill="#FFFFFF" />

                <ellipse className="cat-eye" cx="118" cy="62" rx="7" ry="8" fill="#F4A261" />
                <ellipse className="cat-pupil" cx="117" cy="62" rx="3.5" ry="6" fill="#3D343A" />
                <circle cx="115.5" cy="59.5" r="2.5" fill="#FFFFFF" />
              </>
            )}

            {/* Blushing Cheeks */}
            <ellipse cx="68" cy="72" rx="6.5" ry="4" fill="rgba(255, 140, 175, 0.55)" />
            <ellipse cx="132" cy="72" rx="6.5" ry="4" fill="rgba(255, 140, 175, 0.55)" />

            {/* Nose & Mouth */}
            <polygon points="100,71 96,68 104,68" fill="#FFAEC7" />
            <path
              d="M96 73 Q100 78 100 73 Q100 78 104 73"
              stroke="#5C4D58"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />

            {/* Whiskers */}
            <line x1="62" y1="67" x2="42" y2="64" stroke="#8B9AA8" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="62" y1="72" x2="40" y2="74" stroke="#8B9AA8" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="138" y1="67" x2="158" y2="64" stroke="#8B9AA8" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="138" y1="72" x2="160" y2="74" stroke="#8B9AA8" strokeWidth="1.8" strokeLinecap="round" />

            {/* Front Paws */}
            <ellipse cx="86" cy="150" rx="10" ry="8" fill="#FFF8FA" stroke="#8B9AA8" strokeWidth="2" />
            <ellipse cx="114" cy="150" rx="10" ry="8" fill="#FFF8FA" stroke="#8B9AA8" strokeWidth="2" />
          </svg>

          {/* Floating Heart particles when petted */}
          {isHappy && (
            <div className="cat-float-hearts" aria-hidden="true">
              <span className="float-heart h1">💖</span>
              <span className="float-heart h2">🐾</span>
              <span className="float-heart h3">✨</span>
            </div>
          )}
        </div>

        {/* Pet me action bar */}
        <div className="cat-action-hint">
          <span className="pet-pill">
            <Heart size={14} className={isHappy ? "heart-pulse" : ""} fill={isHappy ? "#ff6b95" : "none"} />
            <span>{isHappy ? "Đã vuốt ve Bông!" : "Bấm vào Bông để vuốt ve 🐾"}</span>
          </span>
          {petCount > 0 && (
            <span className="pet-counter">
              Đã vuốt: <strong>{petCount}</strong> lần
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
