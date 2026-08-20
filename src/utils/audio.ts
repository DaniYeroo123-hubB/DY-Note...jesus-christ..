// Web Audio API Sound Generator for Apple-style tactile and liquid glass audio effects

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

let isMuted = false;
let soundVolume = 71; // 0 to 100

// Initialize from storage if available
if (typeof window !== 'undefined') {
  try {
    const savedVol = localStorage.getItem('dy_notes_sound_volume');
    if (savedVol !== null) {
      const parsed = parseInt(savedVol, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        soundVolume = parsed;
      }
    }
    const savedMuted = localStorage.getItem('dy_notes_sound_muted');
    if (savedMuted !== null) {
      isMuted = savedMuted === 'true';
    }
  } catch {
    // LocalStorage fallback
  }
}

export function setSoundMuted(muted: boolean) {
  isMuted = muted;
  try {
    localStorage.setItem('dy_notes_sound_muted', String(muted));
  } catch {
    // Ignore storage errors
  }
}

export function getSoundMuted(): boolean {
  return isMuted;
}

export function setSoundVolume(volume: number) {
  soundVolume = Math.max(0, Math.min(100, Math.round(volume)));
  try {
    localStorage.setItem('dy_notes_sound_volume', String(soundVolume));
  } catch {
    // Ignore storage errors
  }
}

export function getSoundVolume(): number {
  return soundVolume;
}

function getEffectiveVolumeFactor(): number {
  if (isMuted || soundVolume <= 0) return 0;
  return soundVolume / 100;
}

/** Crisp tactile glass click sound */
export function playClickSound() {
  const volFactor = getEffectiveVolumeFactor();
  if (volFactor <= 0) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frequency drop for tactile click snap
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.18 * volFactor, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // Audio context play error handled gracefully
  }
}

/** Soft liquid glass pop sound for opening editor / new note */
export function playPopSound() {
  const volFactor = getEffectiveVolumeFactor();
  if (volFactor <= 0) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frequency sweep upwards for open/pop
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.22 * volFactor, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // Audio context error fallback
  }
}

/** High-pitched glass chime for pinning notes */
export function playPinSound() {
  const volFactor = getEffectiveVolumeFactor();
  if (volFactor <= 0) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // First high glass chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1400, now);
    gain1.gain.setValueAtTime(0.15 * volFactor, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.13);

    // Second harmonic chime slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2100, now + 0.04);
    gain2.gain.setValueAtTime(0.12 * volFactor, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.19);
  } catch {
    // Audio context error fallback
  }
}

/** Soft Apple notification chime for toast popup */
export function playNotificationSound() {
  const volFactor = getEffectiveVolumeFactor();
  if (volFactor <= 0) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(1160, now + 0.09);

    gain.gain.setValueAtTime(0.14 * volFactor, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch {
    // Audio context error fallback
  }
}

/** Soft water drop/swoosh sound when deleting notes */
export function playDeleteSound() {
  const volFactor = getEffectiveVolumeFactor();
  if (volFactor <= 0) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

    gain.gain.setValueAtTime(0.2 * volFactor, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    // Audio context error fallback
  }
}

/** Upward glass tone when copying text to clipboard */
export function playCopySound() {
  const volFactor = getEffectiveVolumeFactor();
  if (volFactor <= 0) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = idx * 0.035;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.12 * volFactor, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.11);
    });
  } catch {
    // Audio context error fallback
  }
}

/** Soft subtle dismiss sound when toast expires */
export function playDismissSound() {
  const volFactor = getEffectiveVolumeFactor();
  if (volFactor <= 0) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);

    gain.gain.setValueAtTime(0.08 * volFactor, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch {
    // Audio context error fallback
  }
}
