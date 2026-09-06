export type SoundName =
  | "tap"
  | "correct"
  | "wrong"
  | "timeout"
  | "finish"
  | "meow"
  | "purr"
  | "toggle";

let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

// Global user interaction listener to unlock AudioContext immediately on first touch/click
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
  };
  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });
}

function playSynthesizedSound(context: AudioContext, name: SoundName) {
  const now = context.currentTime;

  if (name === "tap") {
    // Crisp, pleasant pastel bubble pop
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + 0.1);
    return;
  }

  if (name === "toggle") {
    // Quick two-note cheerful toggle chime
    [659.25, 880].forEach((freq, i) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const start = now + i * 0.06;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start);
      osc.stop(start + 0.14);
    });
    return;
  }

  if (name === "correct") {
    // Bright C-E-G arpeggio with sweet harmonics
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.05;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start);
      osc.stop(start + 0.28);
    });
    return;
  }

  if (name === "wrong") {
    // Soft low warning tone, gentle and not harsh
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + 0.24);
    return;
  }

  if (name === "timeout") {
    // Gentle 3-note descending chime
    [392, 330, 261.63].forEach((freq, idx) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const start = now + idx * 0.08;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
    return;
  }

  if (name === "finish") {
    // Celebratory victory fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const start = now + idx * 0.07;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
    return;
  }

  if (name === "meow") {
    // Adorable kitten mew with pitch glide and vocal formant
    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.26);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(2.5, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + 0.3);
    return;
  }

  if (name === "purr") {
    // Warm gentle kitten purr rumble
    for (let i = 0; i < 4; i++) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const start = now + i * 0.065;

      osc.type = "sine";
      osc.frequency.setValueAtTime(140 + (i % 2) * 20, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.24, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start);
      osc.stop(start + 0.07);
    }
  }
}

/**
 * Play a synthesized sound effect using Web Audio API.
 * Automatically resumes AudioContext if suspended.
 */
export function playSound(name: SoundName, enabled = true) {
  if (!enabled) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    context
      .resume()
      .then(() => {
        playSynthesizedSound(context, name);
      })
      .catch(() => {
        // Silently catch autoplay restrictions
      });
  } else {
    playSynthesizedSound(context, name);
  }
}

