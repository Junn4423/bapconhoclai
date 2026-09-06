export type SoundName = "tap" | "correct" | "wrong" | "timeout" | "finish" | "meow" | "purr";

let audioContext: AudioContext | null = null;

function getAudioContext() {
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

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

const SOUND_NOTES: Record<SoundName, { frequencies: number[]; duration: number }> = {
  tap: { frequencies: [520], duration: 0.08 },
  correct: { frequencies: [523.25, 659.25, 783.99], duration: 0.22 },
  wrong: { frequencies: [260, 190], duration: 0.18 },
  timeout: { frequencies: [300, 230, 170], duration: 0.3 },
  finish: { frequencies: [523.25, 659.25, 783.99, 1046.5], duration: 0.42 },
  meow: { frequencies: [587.33, 783.99, 739.99], duration: 0.26 },
  purr: { frequencies: [180, 160, 140], duration: 0.3 },
};

/**
 * Small, original UI chimes. They intentionally use Web Audio instead of a
 * downloaded sample so the app stays static, light and free from audio CDN
 * licensing or autoplay surprises.
 */
export function playSound(name: SoundName, enabled = true) {
  if (!enabled) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const { frequencies, duration } = SOUND_NOTES[name];
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(name === "tap" ? 0.045 : 0.07, now + 0.012);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  master.connect(context.destination);

  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = name === "wrong" || name === "timeout" ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    const start = now + index * (name === "finish" ? 0.055 : 0.018);
    oscillator.detune.value = index % 2 === 0 ? -3 : 3;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.7 / frequencies.length, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(now + duration + 0.03);
  });
}
