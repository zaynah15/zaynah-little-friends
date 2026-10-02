type Props = {
  text: string;
  kind: "pet" | "flick" | "kiss";
  side: "left" | "right";
  x: number;
  y: number;
};

export default function SpeechBubble({ text, kind, side, x, y }: Props) {
  return (
    <div
      className={`speech-bubble speech-${kind} speech-${side}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span>{text}</span>
    </div>
  );
}
