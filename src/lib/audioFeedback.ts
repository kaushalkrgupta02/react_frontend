// Simple audio feedback using Web Audio API
const AUDIO_MUTED_KEY = 'venue-mode-audio-muted';

let audioContext: AudioContext | null = null;

export const isAudioMuted = (): boolean => {
  return localStorage.getItem(AUDIO_MUTED_KEY) === 'true';
};

export const setAudioMuted = (muted: boolean): void => {
  localStorage.setItem(AUDIO_MUTED_KEY, muted ? 'true' : 'false');
};

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', gain: number = 0.3) => {
  // Check if muted
  if (isAudioMuted()) return;

  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (required by browsers)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    console.warn('Audio feedback unavailable:', error);
  }
};

// Positive check-in sound - rising two-tone chime
export const playCheckInSound = () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  // First note
  playTone(523.25, 0.15, 'sine', 0.25); // C5
  
  // Second note (higher, delayed)
  setTimeout(() => {
    playTone(659.25, 0.2, 'sine', 0.25); // E5
  }, 100);
};

// Warning no-show sound - lower descending tone
export const playNoShowSound = () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  // Single low tone
  playTone(349.23, 0.25, 'triangle', 0.2); // F4
};

// Undo sound - quick blip
export const playUndoSound = () => {
  playTone(440, 0.1, 'sine', 0.15); // A4
};

// Success sound - cheerful rising tone
export const playSuccessSound = () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  playTone(587.33, 0.12, 'sine', 0.25); // D5
  setTimeout(() => {
    playTone(783.99, 0.18, 'sine', 0.25); // G5
  }, 80);
};

// Error sound - low warning tone
export const playErrorSound = () => {
  playTone(220, 0.2, 'triangle', 0.2); // A3
};

// New order notification - distinctive three-tone alert for kitchen/bar
export const playNewOrderSound = () => {
  if (isAudioMuted()) return;
  
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  // First note - attention
  playTone(880, 0.12, 'sine', 0.2); // A5
  
  // Second note - higher
  setTimeout(() => {
    playTone(1100, 0.12, 'sine', 0.2);
  }, 120);
  
  // Third note - completion chime
  setTimeout(() => {
    playTone(1320, 0.15, 'sine', 0.15); // E6
  }, 240);
};
