import type { CharacterState } from "../state/types";

const ASSETS: Record<CharacterState, string> = {
  idle: "/characters/idle.png",
  happy: "/characters/happy.png",
  angry: "/characters/angry.png",
  thinking: "/characters/thinking.png",
  reading: "/characters/reading.png",
};

type Reaction = "none" | "pet" | "flick";
type Attention = { mode: "none" | "hand" | "talk"; lean: number };

type Props = {
  state: CharacterState;
  side: "left" | "right";
  x: number;
  y: number;
  reaction: Reaction;
  attention?: Attention;
  physicsX?: number;
  physicsY?: number;
  physicsRotation?: number;
};

function HappyBubbles() {
  return (
    <div className="effect-layer happy-bubbles" aria-hidden>
      {Array.from({ length: 7 }).map((_, i) => (
        <span className={`bubble bubble-${i}`} key={i} />
      ))}
    </div>
  );
}

function AngryFire() {
  return (
    <div className="effect-layer angry-fire" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <span className={`flame flame-${i}`} key={i} />
      ))}
    </div>
  );
}

function ThinkingEnergy() {
  return (
    <div className="thinking-energy" aria-hidden>
      <div className="energy-ring ring-a" />
      <div className="energy-ring ring-b" />
      <div className="energy-orb" />
      <span className="energy-spark s1">✦</span>
      <span className="energy-spark s2">✧</span>
      <span className="energy-spark s3">·</span>
      <span className="energy-spark s4">✦</span>
    </div>
  );
}

export default function Character({
  state,
  side,
  x,
  y,
  reaction,
  physicsX = 0,
  physicsY = 0,
  physicsRotation = 0,
  attention = { mode: "none", lean: 0 },
}: Props) {
  return (
    <div
      className={`character character-${side} character-${state} reaction-${reaction} attention-${attention.mode}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        ["--physics-x" as string]: `${physicsX}px`,
        ["--physics-y" as string]: `${physicsY}px`,
        ["--physics-rotation" as string]: `${physicsRotation}deg`,
        ["--attention-lean" as string]: `${attention.lean}deg`,
      }}
    >
      {state === "happy" && <HappyBubbles />}
      {state === "angry" && <AngryFire />}
      {state === "thinking" && <ThinkingEnergy />}

      <img
        className="character-art"
        src={ASSETS[state]}
        draggable={false}
        alt=""
      />

      {reaction === "pet" && (
        <div className="reaction-hearts" aria-hidden>
          <span>♡</span><span>♡</span><span>✦</span>
        </div>
      )}

      {reaction === "flick" && (
        <div className="reaction-lines" aria-hidden>
          <i /><i /><i />
        </div>
      )}
    </div>
  );
}
