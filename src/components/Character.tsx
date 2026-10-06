import type { CharacterState } from '../state/types';

const ASSETS: Record<CharacterState, string> = {
  lazy: '/characters/idle.png',
  happy: '/characters/happy.png',
  angry: '/characters/angry.png',
  logical: '/characters/thinking.png',
  child: '/characters/reading.png',
  sad: '/characters/sad.png',
  jealousy: '/characters/jealousy.png',
};

type Props = {
  state: CharacterState;
  x: number;
  y: number;
  size?: number;
  wave?: boolean;
  speaking?: boolean;
  highlighted?: boolean;
};

function HappyBubbles() {
  return <div className="effect-layer happy-bubbles" aria-hidden>{Array.from({ length: 7 }).map((_, i) => <span className={`bubble bubble-${i}`} key={i} />)}</div>;
}

function AngryFire() {
  return <div className="effect-layer angry-fire" aria-hidden>{Array.from({ length: 7 }).map((_, i) => <span className={`flame flame-${i}`} key={i} />)}</div>;
}

function LogicalEnergy() {
  return <div className="logical-energy" aria-hidden>
    <div className="logical-ring" /><div className="logical-orb" />
  </div>;
}

export default function Character({ state, x, y, size = 150, wave = false, speaking = false, highlighted = false }: Props) {
  return (
    <div
      className={`character character-${state} ${wave ? 'character-wave' : ''} ${speaking ? 'character-speaking' : ''} ${highlighted ? 'character-highlighted' : ''}`}
      style={{ left: `${x}%`, top: `${y}%`, width: `${size}px` }}
    >
      {state === 'happy' && <HappyBubbles />}
      {state === 'angry' && <AngryFire />}
      {state === 'logical' && <LogicalEnergy />}
      <img className="character-art" src={ASSETS[state]} draggable={false} alt={state} />
    </div>
  );
}
