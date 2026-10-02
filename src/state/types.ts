export type CharacterState =
  | "idle"
  | "happy"
  | "angry"
  | "thinking"
  | "reading";

export type VisionSignals = {
  smile: number;
  anger: number;
  mouthOpen: number;
  mouthPucker: number;
  handNearChin: boolean;
  handNearMouth: boolean;
  indexPointing: boolean;
  bookVisible: boolean;
  readingGesture?: boolean;
  shoulders?: {
    left: { x: number; y: number; visibility: number };
    right: { x: number; y: number; visibility: number };
  };
};
