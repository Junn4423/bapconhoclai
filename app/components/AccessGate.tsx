"use client";

import { FormEvent, ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { PawPrint, LockKeyhole, ArrowRight } from "lucide-react";
import { ACCESS_KEY } from "@/lib/progress";

const ACCESS_HASH = "de10d3e8e21f219aad010fccdc78d97249f0f3151dff1302ab36d162c8ebbf30";

type AccessContextValue = { lockAccess: () => void };
const AccessContext = createContext<AccessContextValue>({ lockAccess: () => undefined });

export function useAccessGate() {
  return useContext(AccessContext);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hasValidAccessRecord() {
  try {
    const raw = window.localStorage.getItem(ACCESS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { verified?: boolean; version?: number };
    return parsed.verified === true && parsed.version === 1;
  } catch {
    return false;
  }
}

export function AccessGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "open">("checking");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checkingPin, setCheckingPin] = useState(false);

  useEffect(() => {
    setStatus(hasValidAccessRecord() ? "open" : "locked");
  }, []);

  const lockAccess = useMemo(
    () => () => {
      try {
        window.localStorage.removeItem(ACCESS_KEY);
      } catch {
        // Continue to the lock screen if storage is unavailable.
      }
      setPin("");
      setError(false);
      setStatus("locked");
    },
    [],
  );

  const showPinError = () => {
    setError(false);
    window.setTimeout(() => setError(true), 10);
  };

  const submitPin = async (event?: FormEvent) => {
    event?.preventDefault();
    if (pin.length !== 6 || checkingPin) {
      showPinError();
      return;
    }
    setCheckingPin(true);
    const isCorrect = (await sha256(pin)) === ACCESS_HASH;
    if (isCorrect) {
      try {
        window.localStorage.setItem(
          ACCESS_KEY,
          JSON.stringify({ verified: true, verifiedAt: new Date().toISOString(), version: 1 }),
        );
      } catch {
        // The app still opens for this session if storage is unavailable.
      }
      setError(false);
      setStatus("open");
    } else {
      showPinError();
    }
    setCheckingPin(false);
  };

  if (status === "checking") {
    return (
      <main className="access-gate access-gate-loading" aria-live="polite">
        <div className="access-card">
          <span className="access-paw"><PawPrint size={28} /></span>
          <p>Đang mở góc học của Bắp...</p>
        </div>
      </main>
    );
  }

  if (status === "open") {
    return <AccessContext.Provider value={{ lockAccess }}>{children}</AccessContext.Provider>;
  }

  return (
    <main className="access-gate">
      <form className={`access-card ${error ? "has-error" : ""}`} onSubmit={submitPin}>
        <span className="access-paw"><PawPrint size={30} /></span>
        <p className="access-kicker">Bắp con học lái</p>
        <h1>Nhập mã để vào góc học của Bắp</h1>
        <p className="access-description">Bông đang đợi Bắp nè 🐾</p>

        <label className="sr-only" htmlFor="access-pin">Mã mở góc học</label>
        <div className="pin-entry">
          <div className="pin-cells" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span className={`pin-cell ${pin[index] ? "filled" : ""}`} key={index}>
                {pin[index] ? "•" : ""}
              </span>
            ))}
          </div>
          <input
            id="access-pin"
            className="access-pin-input"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError(false);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            autoFocus
            aria-describedby="access-pin-error"
          />
        </div>
        <button className="primary-button access-submit" type="submit" disabled={checkingPin}>
          <LockKeyhole size={16} />
          {checkingPin ? "Đang kiểm tra..." : "Mở góc học"}
          {!checkingPin && <ArrowRight size={16} />}
        </button>
        <p id="access-pin-error" className={`access-error ${error ? "visible" : ""}`} role="alert">
          {pin.length !== 6 && error ? "Nhập đủ 6 số nha." : "Chưa đúng rồi, thử lại nha."}
        </p>
      </form>
    </main>
  );
}
