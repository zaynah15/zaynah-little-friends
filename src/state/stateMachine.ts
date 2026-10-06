import type { VisionSignals } from './types';

// Kept as a small compatibility helper for future camera-driven highlighting.
// The dashboard itself uses the seven fixed emotional selves rather than swapping one character.
export type LiveEmotion = 'happy' | 'angry' | 'logical' | 'lazy';

export class CharacterStateMachine {
  private current: LiveEmotion = 'lazy';
  get state() { return this.current; }
  update(signals: VisionSignals): LiveEmotion {
    if (signals.anger > 0.55) this.current = 'angry';
    else if (signals.smile > 0.55) this.current = 'happy';
    else if (signals.handNearChin) this.current = 'logical';
    else this.current = 'lazy';
    return this.current;
  }
}
