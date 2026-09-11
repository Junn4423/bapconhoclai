"use client";

import { Award, Car, CheckCircle2, ShieldCheck, Sparkles, Trophy } from "lucide-react";

interface DriverLicenseProps {
  seen: number;
  mastered: number;
  bestMock: number;
}

export function DriverLicenseCard({
  seen,
  mastered,
  bestMock,
}: DriverLicenseProps) {
  let rankTitle = "Mới bắt đầu 🐣";
  let rankColor = "pink";
  if (mastered >= 400 || bestMock >= 28) {
    rankTitle = "Sắp về đích rồi 🌸";
    rankColor = "mint";
  } else if (mastered >= 150 || bestMock >= 25) {
    rankTitle = "Đang vào guồng ⚡";
    rankColor = "blue";
  } else if (seen >= 30) {
    rankTitle = "Đang làm quen 🚗";
    rankColor = "lavender";
  }

  const percent = Math.min(100, Math.round((seen / 600) * 100));

  return (
    <div className="license-card">
      <div className="license-header">
        <div className="license-title-group">
          <span className="license-subtitle">THẺ HỌC LÁI CỦA BẮP</span>
          <h3 className="license-title">Tiến độ học của Bắp</h3>
        </div>
        <div className="license-badge">
          <Car size={18} />
          <span>HẠNG B</span>
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
            <strong className="license-field-val">Bắp iu</strong>
          </div>
          <div className="license-field-row">
            <span className="license-field-label">Mục tiêu:</span>
            <span className="license-field-val highlight">Đạt 30/30 câu lý thuyết</span>
          </div>
          <div className="license-field-row">
            <span className="license-field-label">Điểm cao nhất:</span>
            <strong className="license-field-val">{bestMock}/30 câu</strong>
          </div>

          <div className="license-progress-box">
            <div className="license-progress-info">
              <span>Tiến độ 600 câu:</span>
              <strong>{seen}/600 câu ({percent}%)</strong>
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
            <span className="seal-text">CỐ LÊN BẮP ƠI</span>
            <ShieldCheck size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
