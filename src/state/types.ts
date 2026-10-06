export type CharacterState =
  | 'angry'
  | 'happy'
  | 'child'
  | 'logical'
  | 'sad'
  | 'jealousy'
  | 'lazy';

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
