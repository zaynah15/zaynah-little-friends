type Props = {
  text: string;
  kind: "kiss";
  side: "right";
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
