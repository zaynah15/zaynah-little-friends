import { useEffect, useRef, useState } from "react";
import Character from "./components/Character";
import SpeechBubble from "./components/SpeechBubble";
import { createVision, analyzeFrame, type VisionBundle } from "./vision/mediapipe";
import { CharacterStateMachine } from "./state/stateMachine";
import type { VisionSignals } from "./state/types";

type HandPoint = { x: number; y: number };
type Side = "right";

type HandShape = {
  wrist: HandPoint;
  indexTip: HandPoint;
  thumbTip: HandPoint;
  palm: HandPoint;
  openness: number;
};

function distance(a: HandPoint, b: HandPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

class ReadingGestureDetector {
  private previousAverageY: number | null = null;
  private pickupScore = 0;
  private holdUntil = 0;

  update(hands: HandPoint[], handShapes: HandShape[], torso: any, bookVisible: boolean, now: number) {
    if (bookVisible) {
      this.holdUntil = now + 1400;
      return true;
    }
    if (!hands.length || !torso) return now < this.holdUntil;
    const shoulderMid = {
      x: (torso.leftShoulder.x + torso.rightShoulder.x) / 2,
      y: (torso.leftShoulder.y + torso.rightShoulder.y) / 2,
    };
    const hipMid = torso.leftHip && torso.rightHip
      ? { x: (torso.leftHip.x + torso.rightHip.x) / 2, y: (torso.leftHip.y + torso.rightHip.y) / 2 }
      : { x: shoulderMid.x, y: shoulderMid.y + 0.35 };
    const avgY = hands.reduce((sum, h) => sum + h.y, 0) / hands.length;
    const previousY = this.previousAverageY;
    const downwardMove = previousY !== null ? avgY - previousY : 0;
    const nearLowerTorso = avgY > shoulderMid.y + 0.14 && avgY < hipMid.y + 0.10;
    if (nearLowerTorso && downwardMove > 0.012) this.pickupScore = Math.min(1, this.pickupScore + 0.32);
    else this.pickupScore = Math.max(0, this.pickupScore - 0.035);
    const chestY = shoulderMid.y + 0.15;
    const nearChest = Math.abs(avgY - chestY) < 0.16;
    const handsTogether = hands.length >= 2
      ? Math.abs(hands[0].x - hands[1].x) < 0.42 && Math.abs(hands[0].y - hands[1].y) < 0.28
      : handShapes.some((h) => h.openness < 0.075);
    const upwardMove = previousY !== null ? previousY - avgY : 0;
    if (this.pickupScore > 0.45 && nearChest && handsTogether && (upwardMove > 0.006 || this.pickupScore > 0.75)) {
      this.holdUntil = now + 3500;
      this.pickupScore = 0;
    }
    this.previousAverageY = avgY;
    return now < this.holdUntil;
  }
}

class KissGestureDetector {
  private armedAt = 0;
  private previousHand: HandPoint | null = null;
  private cooldownUntil = 0;

  update(hand: HandShape | undefined, mouthPucker: number, handNearMouth: boolean, now: number) {
    if (!hand) {
      this.previousHand = null;
      return false;
    }
    const current = hand.palm;
    const previous = this.previousHand;
    const moveAway = previous ? Math.hypot(current.x - previous.x, current.y - previous.y) : 0;
    const puckered = mouthPucker > 0.42;
    if (puckered && handNearMouth) this.armedAt = now + 900;
    const fired = now < this.armedAt && moveAway > 0.018 && !handNearMouth && now > this.cooldownUntil;
    if (fired) {
      this.cooldownUntil = now + 1800;
      this.armedAt = 0;
    }
    this.previousHand = current;
    return fired;
  }
}

class CharacterPhysics {
  private state = { x: 0, y: 0, vx: 0, vy: 0, rotation: 0, vr: 0 };
  private grabbed = false;
  private thrownUntil = 0;
  private fallen = false;

  grab() {
    if (this.fallen) return;
    this.grabbed = true;
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.vr = 0;
  }
  isGrabbed() { return this.grabbed; }
  isFallen() { return this.fallen; }
  reset() {
    this.state = { x: 0, y: 0, vx: 0, vy: 0, rotation: 0, vr: 0 };
    this.grabbed = false;
    this.thrownUntil = 0;
    this.fallen = false;
  }
  moveGrabbed(dx: number, dy: number) {
    if (!this.grabbed) return;
    this.state.x = dx;
    this.state.y = dy;
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.rotation = Math.max(-28, Math.min(28, dx * 0.22));
  }
  release(vx: number, vy: number, now: number) {
    if (!this.grabbed) return;
    this.grabbed = false;
    this.state.vx = vx;
    this.state.vy = vy;
    this.state.vr = vx * 0.055;
    this.thrownUntil = now + 650;
  }
  knockDown() {
    this.grabbed = false;
    this.fallen = true;
    this.thrownUntil = 0;
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.vr = 0;
    this.state.x = 0;
    this.state.y = 170;
    this.state.rotation = 78;
  }
  update(dt: number, now: number) {
    const s = this.state;
    if (!this.grabbed && !this.fallen) {
      if (now < this.thrownUntil) {
        s.vx *= Math.pow(0.10, dt);
        s.vy = s.vy * Math.pow(0.28, dt) + 260 * dt;
        s.vr *= Math.pow(0.18, dt);
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rotation += s.vr * dt;
      } else {
        const stiffness = 30, damping = 8;
        s.vx += (-stiffness * s.x - damping * s.vx) * dt;
        s.vy += (-stiffness * s.y - damping * s.vy) * dt;
        s.vr += (-42 * s.rotation - 8 * s.vr) * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rotation += s.vr * dt;
      }
    }
    return { x: s.x, y: s.y, rotation: s.rotation };
  }
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const visionRef = useRef<VisionBundle | null>(null);
  const machineRef = useRef(new CharacterStateMachine());
  const readingRef = useRef(new ReadingGestureDetector());
  const kissRef = useRef(new KissGestureDetector());
  const physicsRef = useRef(new CharacterPhysics());
  const physicsTimeRef = useRef(performance.now());
  const grabbedHandRef = useRef<HandPoint | null>(null);
  const previousHandsRef = useRef<HandPoint[]>([]);
  const lastInteractionRef = useRef(0);
  const timeoutRefs = useRef<number[]>([]);

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState(machineRef.current.state);
  const [signals, setSignals] = useState<VisionSignals>({ smile: 0, anger: 0, mouthOpen: 0, mouthPucker: 0, handNearChin: false, handNearMouth: false, peaceSign: false, pinch: false, bookVisible: false });
  const [reactions, setReactions] = useState<{ right: "none" | "pet" | "flick" }>({ right: "none" });
  const [bubble, setBubble] = useState<{ text: string; kind: "pet" | "flick" | "kiss"; x: number; y: number } | null>(null);
  const [physics, setPhysics] = useState({ x: 0, y: 0, rotation: 0 });
  const [fan, setFan] = useState<HandPoint | null>(null);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    timeoutRefs.current.forEach((id) => window.clearTimeout(id));
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    videoRef.current?.pause();
  }, []);

  function showBubble(text: string, kind: "pet" | "flick" | "kiss") {
    setBubble({ text, kind, x: 70, y: 24 });
    timeoutRefs.current.push(window.setTimeout(() => setBubble(null), kind === "kiss" ? 2400 : 1500));
  }

  function stagePixels() {
    const rect = stageRef.current?.getBoundingClientRect();
    return { width: rect?.width || 1280, height: rect?.height || 720 };
  }

  function anchor() {
    const shoulders = latestShouldersRef.current;
    return shoulders
      ? { x: (1 - shoulders.right.x), y: shoulders.right.y - 0.13 }
      : { x: 0.72, y: 0.45 };
  }

  const latestShouldersRef = useRef<VisionSignals["shoulders"]>();

  function react(kind: "pet" | "flick") {
    setReactions({ right: kind });
    showBubble(kind === "pet" ? "Keep patting me!" : "Stop it, Zaynah 😭", kind);
    timeoutRefs.current.push(window.setTimeout(() => setReactions({ right: "none" }), kind === "flick" ? 800 : 1100));
  }

  function handleInteractions(result: ReturnType<typeof analyzeFrame>, now: number) {
    const { width, height } = stagePixels();
    const a = anchor();
    const hands = result.handShapes;
    const hand = hands[0];
    const previous = previousHandsRef.current[0] || hand?.palm;

    // Peace sign summons the fan. While it is visible, keep it attached to the hand.
    if (result.peaceSign && hand) {
      setFan(hand.palm);
      if (previous) {
        const speed = Math.hypot(hand.palm.x - previous.x, hand.palm.y - previous.y) / 0.06;
        const nearCharacter = distance(hand.palm, { x: a.x, y: a.y + 0.03 }) < 0.25;
        if (nearCharacter && speed > 0.65 && now - lastInteractionRef.current > 900) {
          physicsRef.current.knockDown();
          lastInteractionRef.current = now;
        }
      }
    } else {
      setFan(null);
    }

    // Flying kiss: pucker at the mouth, bring hand to mouth, then move it away.
    if (kissRef.current.update(hand, result.mouthPucker, result.handNearMouth, now)) {
      showBubble("Zaynah loves me yeyeyey 💕", "kiss");
      lastInteractionRef.current = now;
    }

    if (physicsRef.current.isFallen()) return;

    // Grab / drag / throw uses a closed hand.
    if (physicsRef.current.isGrabbed()) {
      if (!hand) {
        const p = grabbedHandRef.current || { x: a.x, y: a.y };
        const prev = previous || p;
        physicsRef.current.release(
          (p.x - prev.x) * width / 0.06,
          (p.y - prev.y) * height / 0.06,
          now
        );
        grabbedHandRef.current = null;
        return;
      }
      const targetX = (hand.palm.x - a.x) * width;
      const targetY = (hand.palm.y - (a.y + 0.05)) * height;
      physicsRef.current.moveGrabbed(targetX, targetY);
      if (hand.openness > 0.115) {
        const vx = (hand.palm.x - (grabbedHandRef.current?.x ?? hand.palm.x)) * width / 0.06;
        const vy = (hand.palm.y - (grabbedHandRef.current?.y ?? hand.palm.y)) * height / 0.06;
        physicsRef.current.release(Math.max(-1000, Math.min(1000, vx)), Math.max(-1000, Math.min(1000, vy)), now);
        grabbedHandRef.current = null;
      }
      return;
    }

    // Thumb + index pinch flick.
    if (hand && result.pinch && previous && now - lastInteractionRef.current > 450) {
      const speed = Math.hypot(hand.palm.x - previous.x, hand.palm.y - previous.y) / 0.06;
      const nearCharacter = distance(hand.palm, { x: a.x, y: a.y + 0.04 }) < 0.23;
      if (nearCharacter && speed > 0.55) {
        react("flick");
        lastInteractionRef.current = now;
        return;
      }
    }

    // Whole open hand moving down/near the character = pat.
    if (hand && hand.openness > 0.115 && previous && now - lastInteractionRef.current > 450) {
      const dy = hand.palm.y - previous.y;
      const nearHead = distance(hand.palm, { x: a.x, y: a.y - 0.02 }) < 0.23;
      if (nearHead && dy > 0.006) {
        react("pet");
        lastInteractionRef.current = now;
        return;
      }
    }

    // Closed hand close to the character = grab.
    if (hand && hand.openness < 0.10 && distance(hand.palm, { x: a.x, y: a.y + 0.04 }) < 0.20 && now - lastInteractionRef.current > 350) {
      physicsRef.current.grab();
      grabbedHandRef.current = hand.palm;
      lastInteractionRef.current = now;
    }
  }

  async function start() {
    if (loading || started) return;
    setLoading(true);
    setError("");
    setStatus("Asking for camera access…");
    let stream: MediaStream | null = null;
    try {
      if (!window.isSecureContext) throw new Error("Camera access requires HTTPS. Open the Vercel URL.");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not support camera access.");
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview could not be initialized.");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      setStatus("Loading face, hand and body tracking…");
      await video.play();
      visionRef.current = await createVision();
      physicsTimeRef.current = performance.now();
      lastFrameRef.current = 0;
      setStarted(true);
      setLoading(false);
      setStatus("");

      const loop = (now: number) => {
        if (!visionRef.current || !videoRef.current) return;
        const dt = Math.min(0.033, Math.max(0.001, (now - physicsTimeRef.current) / 1000));
        physicsTimeRef.current = now;
        setPhysics(physicsRef.current.update(dt, now));
        if (now - lastFrameRef.current > 60 && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          lastFrameRef.current = now;
          try {
            const result = analyzeFrame(visionRef.current, videoRef.current, now);
            const readingGesture = readingRef.current.update(result.hands, result.handShapes, result.torso, result.bookVisible, now);
            const next = machineRef.current.update({ ...result, readingGesture }, now);
            setState(next);
            setSignals({ ...result, readingGesture });
            latestShouldersRef.current = result.shoulders;
            handleInteractions(result, now);
            previousHandsRef.current = result.handShapes.map((h) => h.palm);
          } catch (frameError) {
            console.warn("Vision frame skipped", frameError);
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      visionRef.current = null;
      setLoading(false);
      setStatus("");
      setError(e instanceof DOMException && e.name === "NotAllowedError" ? "Camera permission was blocked. Allow camera access for this site and try again." : e instanceof Error ? e.message : "Could not start the camera. Please try again.");
      setStarted(false);
    }
  }

  const renderAnchor = anchor();
  const attention = signals.mouthOpen > 0.42
    ? { mode: "talk" as const, lean: -5 }
    : { mode: "none" as const, lean: 0 };

  return (
    <main className="app">
      <div className="camera-stage" ref={stageRef}>
        <video ref={videoRef} className="camera" muted playsInline />
        {!started && (
          <div className="welcome">
            <div className="welcome-card">
              <div className="mini-sparkle">✦</div>
              <h1>Zaynah's Little Friend</h1>
              <p>One tiny friend, right on your shoulder.</p>
              <button onClick={start} disabled={loading}>{loading ? (status || "Waking them up…") : "Turn on camera"}</button>
              {error && <div className="error">{error}</div>}
            </div>
          </div>
        )}

        {started && (
          <>
            <Character
              state={state}
              side="right"
              x={renderAnchor.x * 100}
              y={renderAnchor.y * 100}
              reaction={reactions.right}
              attention={attention}
              physicsX={physics.x}
              physicsY={physics.y}
              physicsRotation={physics.rotation}
              fallen={physicsRef.current.isFallen()}
            />

            {fan && (
              <div className="summoned-fan" style={{ left: `${fan.x * 100}%`, top: `${fan.y * 100}%` }} aria-hidden>
                <div className="fan-ribs"><i/><i/><i/><i/><i/><i/></div>
                <div className="fan-handle" />
              </div>
            )}

            {bubble && <SpeechBubble kind={bubble.kind} side="right" x={bubble.x} y={bubble.y} text={bubble.text} />}
            <div className="debug">
              <span>{state}</span>
              {signals.peaceSign && <span>🪭 fan</span>}
              {signals.pinch && <span>🤏 pinch</span>}
              {signals.handNearChin && <span>🤔 thinking</span>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
