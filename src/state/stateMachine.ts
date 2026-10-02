import type { CharacterState, VisionSignals } from "./types";

type Candidate = { state: CharacterState; score: number };

export class CharacterStateMachine {
  private current: CharacterState = "idle";
  private candidate: CharacterState = "idle";
  private candidateSince = performance.now();

  get state() {
    return this.current;
  }

  update(signals: VisionSignals, now = performance.now()): CharacterState {
    const candidates: Candidate[] = [
      { state: "reading", score: signals.readingGesture ? 1.0 : 0 },
      { state: "thinking", score: signals.handNearHead ? 0.95 : 0 },
      { state: "angry", score: signals.anger },
      { state: "happy", score: signals.smile },
      { state: "idle", score: 0.20 },
    ];

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    const desired =
      best.state === "idle" && best.score < 0.25 ? "idle" : best.state;

    if (desired !== this.candidate) {
      this.candidate = desired;
      this.candidateSince = now;
      return this.current;
    }

    const dwell = desired === "idle" ? 650 : desired === "reading" ? 250 : 350;

    if (desired !== this.current && now - this.candidateSince >= dwell) {
      this.current = desired;
    }

    return this.current;
  }
}
