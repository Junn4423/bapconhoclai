"use client";

import { Award, Car, CheckCircle2, ShieldCheck, Sparkles, Trophy } from "lucide-react";

interface DriverLicenseProps {
  sessions: number;
  best: number;
  remembered: number;
}

export function DriverLicenseCard({
  sessions,
  best,
  remembered,
}: DriverLicenseProps) {
  // Determine cute rank based on stats
  let rankTitle = "Tập sự đáng yêu 🐣";
  let rankColor = "pink";
  if (remembered >= 400 || best >= 28) {
    rankTitle = "Tay lái lụa siêu đỉnh 🌸";
    rankColor = "mint";
  } else if (remembered >= 150 || best >= 25) {
    rankTitle = "Phản xạ thần tốc ⚡";
    rankColor = "blue";
  } else if (remembered >= 30 || sessions >= 3) {
    rankTitle = "Tự tin cầm lái 🚗";
    rankColor = "lavender";
  }

  const percent = Math.min(100, Math.round((remembered / 600) * 100));

  return (
    <div className="license-card">
      <div className="license-header">
        <div className="license-title-group">
          <span className="license-subtitle">MINH ANH OFFICIAL STUDY PERMIT</span>
          <h3 className="license-title">Bằng Lái Tập Sự Dịu Dàng</h3>
        </div>
        <div className="license-badge">
          <Car size={18} />
          <span>HẠNG B2 / B1</span>
        </div>
      </div>

      <div className="license-body">
        <div className="license-avatar-box">
          <div className="license-avatar">
            <span className="avatar-paw">🐾</span>
            <span className="avatar-cap">🧢</span>
          </div>
          <span className={`license-rank ${rankColor}`}>{rankTitle}</span>
        </div>

        <div className="license-details">
          <div className="license-field-row">
            <span className="license-field-label">Học viên:</span>
            <strong className="license-field-val">Minh Anh</strong>
          </div>
          <div className="license-field-row">
            <span className="license-field-label">Mục tiêu:</span>
            <span className="license-field-val highlight">Đạt 30/30 câu lý thuyết</span>
          </div>
          <div className="license-field-row">
            <span className="license-field-label">Điểm cao nhất:</span>
            <strong className="license-field-val">{best}/30 câu</strong>
          </div>

          <div className="license-progress-box">
            <div className="license-progress-info">
              <span>Tiến độ 600 câu:</span>
              <strong>{remembered}/600 câu ({percent}%)</strong>
            </div>
            <div className="license-progress-bar">
              <div
                className="license-progress-fill"
                style={{ width: `${Math.max(5, percent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Cute Official Seal */}
        <div className="license-seal" aria-hidden="true">
          <div className="seal-circle">
            <Sparkles size={16} />
            <span className="seal-text">READY · TO · DRIVE</span>
            <ShieldCheck size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
