import { logWarning } from './log';

export type SoundKind = 'move' | 'capture' | 'check' | 'end';

const TONES: Readonly<Record<SoundKind, { readonly frequency: number; readonly duration: number }>> = {
  move: { frequency: 440, duration: 0.06 },
  capture: { frequency: 300, duration: 0.1 },
  check: { frequency: 660, duration: 0.12 },
  end: { frequency: 520, duration: 0.3 },
};

let context: AudioContext | null = null;

/** Petit bip synthétisé : aucun fichier audio à télécharger. */
export function playSound(kind: SoundKind, enabled: boolean): void {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    const { frequency, duration } = TONES[kind];
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.15, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  } catch (error) {
    logWarning('[son] lecture impossible', error);
  }
}
