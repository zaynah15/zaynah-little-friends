import type { CharacterState } from "../state/types";

const ASSETS: Record<CharacterState, string> = {
  idle: "/characters/idle.png",
  happy: "/characters/happy.png",
  angry: "/characters/angry.png",
  thinking: "/characters/thinking.png",
  reading: "/characters/reading.png",
};

type Props = {
  state: CharacterState;
  side: "left" | "right";
  x: number;
  y: number;
  attention?: { mode: "none" | "talk"; lean: number };
  physicsX?: number;
  physicsY?: number;
  physicsRotation?: number;
  fallen?: boolean;
};

function HappyBubbles() {
  return <div className="effect-layer happy-bubbles" aria-hidden>{Array.from({ length: 7 }).map((_, i) => <span className={`bubble bubble-${i}`} key={i} />)}</div>;
}

function AngryFire() {
  return <div className="effect-layer angry-fire" aria-hidden>{Array.from({ length: 9 }).map((_, i) => <span className={`flame flame-${i}`} key={i} />)}</div>;
}

function ThinkingEnergy() {
  return <div className="thinking-energy" aria-hidden>
    <div className="energy-ring ring-a" />
    <div className="energy-ring ring-b" />
    <div className="energy-orb" />
    <span className="energy-spark s1">✦</span><span className="energy-spark s2">✧</span>
    <span className="energy-spark s3">·</span><span className="energy-spark s4">✦</span>
  </div>;
}

export default function Character({ state, side, x, y, attention = { mode: "none", lean: 0 }, physicsX = 0, physicsY = 0, physicsRotation = 0, fallen = false }: Props) {
  return (
    <div
      className={`character character-${side} character-${state} attention-${attention.mode} ${fallen ? "character-fallen" : ""}`}
      style={{
        left: `${x}%`, top: `${y}%`,
        ["--physics-x" as string]: `${physicsX}px`,
        ["--physics-y" as string]: `${physicsY}px`,
        ["--physics-rotation" as string]: `${physicsRotation}deg`,
        ["--attention-lean" as string]: `${attention.lean}deg`,
      }}
    >
      {state === "happy" && <HappyBubbles />}
      {state === "angry" && <AngryFire />}
      {state === "thinking" && <ThinkingEnergy />}
      <div className="character-depth" aria-hidden><img src={ASSETS[state]} alt="" /></div>
      <img className="character-art" src={ASSETS[state]} draggable={false} alt="" />
    </div>
  );
}
