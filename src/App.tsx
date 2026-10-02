import { useEffect, useRef, useState } from "react";
import Character from "./components/Character";
import SpeechBubble from "./components/SpeechBubble";
import { createVision, analyzeFrame, type VisionBundle } from "./vision/mediapipe";
import { CharacterStateMachine } from "./state/stateMachine";
import type { VisionSignals } from "./state/types";

type HandPoint = { x: number; y: number };
type Side = "left" | "right";

function distance(a: HandPoint, b: HandPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

class ReadingGestureDetector {
  private previousAverageY: number | null = null;
  private pickupScore = 0;
  private holdUntil = 0;

  update(
    hands: HandPoint[],
    handShapes: Array<{
      wrist: HandPoint;
      indexTip: HandPoint;
      thumbTip: HandPoint;
      palm: HandPoint;
      openness: number;
    }>,
    torso: {
      leftShoulder: HandPoint;
      rightShoulder: HandPoint;
      leftHip?: HandPoint;
      rightHip?: HandPoint;
    } | undefined,
    bookVisible: boolean,
    now: number
  ) {
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

class CharacterPhysics {
  private state = {
    left: { x: 0, y: 0, vx: 0, vy: 0, rotation: 0, vr: 0 },
    right: { x: 0, y: 0, vx: 0, vy: 0, rotation: 0, vr: 0 },
  };

  private grabbed: Side | null = null;
  private thrownUntil: Record<Side, number> = { left: 0, right: 0 };

  grab(side: Side) {
    this.grabbed = side;
    const s = this.state[side];
    s.vx = 0;
    s.vy = 0;
    s.vr = 0;
  }

  isGrabbed(side: Side) {
    return this.grabbed === side;
  }

  reset(side: Side) {
    const s = this.state[side];
    s.x = 0; s.y = 0; s.vx = 0; s.vy = 0; s.rotation = 0; s.vr = 0;
    this.thrownUntil[side] = 0;
  }

  moveGrabbed(side: Side, dx: number, dy: number) {
    if (this.grabbed !== side) return;
    const s = this.state[side];
    s.x = dx;
    s.y = dy;
    s.vx = 0;
    s.vy = 0;
    s.rotation = Math.max(-24, Math.min(24, dx * 0.22));
    s.vr = 0;
  }

  release(side: Side, vx: number, vy: number, now: number) {
    if (this.grabbed !== side) return;
    this.grabbed = null;
    const s = this.state[side];
    s.vx = vx;
    s.vy = vy;
    s.vr = vx * 0.055 + (Math.random() - 0.5) * 3;
    this.thrownUntil[side] = now + 650;
  }

  update(dt: number, now: number) {
    const out = {
      left: { x: 0, y: 0, rotation: 0 },
      right: { x: 0, y: 0, rotation: 0 },
    };

    (['left', 'right'] as const).forEach((side) => {
      const s = this.state[side];
      const thrown = now < this.thrownUntil[side];

      if (this.grabbed !== side) {
        if (thrown) {
          // Air drag + a little gravity gives the release a tossed, physical feel.
          s.vx *= Math.pow(0.10, dt);
          s.vy = s.vy * Math.pow(0.28, dt) + 260 * dt;
          s.vr *= Math.pow(0.18, dt);
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.rotation += s.vr * dt;
        } else {
          const stiffness = 30;
          const damping = 8;
          s.vx += (-stiffness * s.x - damping * s.vx) * dt;
          s.vy += (-stiffness * s.y - damping * s.vy) * dt;
          s.vr += (-42 * s.rotation - 8 * s.vr) * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.rotation += s.vr * dt;
        }
      }

      out[side] = { x: s.x, y: s.y, rotation: s.rotation };
    });

    return out;
  }
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const visionRef = useRef<VisionBundle | null>(null);
  const machineRef = useRef(new CharacterStateMachine());
  const lastFrameRef = useRef(0);
  const readingDetectorRef = useRef(new ReadingGestureDetector());
  const physicsRef = useRef(new CharacterPhysics());
  const physicsTimeRef = useRef(performance.now());
  const grabbedSideRef = useRef<Side | null>(null);
  const grabbedHandRef = useRef<HandPoint | null>(null);
  const previousHandsRef = useRef<HandPoint[]>([]);
  const lastInteractionRef = useRef(0);
  // Which physical shoulder slot each little friend currently occupies.
  const slotMapRef = useRef<Record<Side, Side>>({ left: "left", right: "right" });
  const swapFlashRef = useRef(false);
  const [swapFlash, setSwapFlash] = useState(false);
  const timeoutRefs = useRef<number[]>([]);

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState(machineRef.current.state);
  const [signals, setSignals] = useState<VisionSignals>({ smile: 0, anger: 0, mouthOpen: 0, handNearHead: false, bookVisible: false });
  const [shoulders, setShoulders] = useState<VisionSignals["shoulders"]>();
  const [reactions, setReactions] = useState<{ left: "none" | "pet" | "flick"; right: "none" | "pet" | "flick" }>({ left: "none", right: "none" });
  const [activeBubble, setActiveBubble] = useState<{ kind: "pet" | "flick"; side: Side; x: number; y: number } | null>(null);
  const [physics, setPhysics] = useState({ left: { x: 0, y: 0, rotation: 0 }, right: { x: 0, y: 0, rotation: 0 } });

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    timeoutRefs.current.forEach((id) => window.clearTimeout(id));
    timeoutRefs.current = [];
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    videoRef.current?.pause();
  }, []);

  function reactToCharacter(side: Side, kind: "pet" | "flick", x: number, y: number) {
    setReactions((current) => ({ ...current, [side]: kind }));
    setActiveBubble({ kind, side, x, y: Math.max(8, y - 12) });
    timeoutRefs.current.push(window.setTimeout(() => setReactions((current) => ({ ...current, [side]: "none" })), kind === "flick" ? 850 : 1250));
    timeoutRefs.current.push(window.setTimeout(() => setActiveBubble((current) => current?.side === side && current?.kind === kind ? null : current), 2200));
  }

  function stagePixels() {
    const rect = stageRef.current?.getBoundingClientRect();
    return { width: rect?.width || 1280, height: rect?.height || 720 };
  }

  function characterAnchors(result: ReturnType<typeof analyzeFrame>) {
    const slots = {
      left: result.shoulders ? { x: 1 - result.shoulders.left.x, y: result.shoulders.left.y - 0.13 } : { x: 0.28, y: 0.45 },
      right: result.shoulders ? { x: 1 - result.shoulders.right.x, y: result.shoulders.right.y - 0.13 } : { x: 0.72, y: 0.45 },
    };
    return {
      left: slots[slotMapRef.current.left],
      right: slots[slotMapRef.current.right],
      slots,
    };
  }

  function swapCharacterSlots() {
    const current = slotMapRef.current;
    slotMapRef.current = { left: current.right, right: current.left };
    physicsRef.current.reset("left");
    physicsRef.current.reset("right");
    swapFlashRef.current = true;
    setSwapFlash(true);
    timeoutRefs.current.push(window.setTimeout(() => { swapFlashRef.current = false; setSwapFlash(false); }, 700));
  }

  function handleCharacterInteractions(
    result: ReturnType<typeof analyzeFrame>,
    now: number
  ) {
    const hands = result.handShapes;
    const anchors = characterAnchors(result);
    const { width, height } = stagePixels();
    const physics = physicsRef.current;

    if (grabbedSideRef.current) {
      const side = grabbedSideRef.current;
      const activeHand = hands[0] ? hands.reduce((closest, hand) => distance(hand.palm, grabbedHandRef.current || hand.palm) < distance(closest.palm, grabbedHandRef.current || closest.palm) ? hand : closest, hands[0]) : null;

      if (!activeHand) {
        const p = grabbedHandRef.current || { x: 0, y: 0 };
        const prev = previousHandsRef.current[0] || p;
        const vx = (p.x - prev.x) * width / 0.06;
        const vy = (p.y - prev.y) * height / 0.06;
        physics.release(side, Math.max(-900, Math.min(900, vx)), Math.max(-900, Math.min(900, vy)), now);
        grabbedSideRef.current = null;
        grabbedHandRef.current = null;
        return;
      }

      const hand = activeHand.palm;
      const anchor = anchors[side];
      const previousGrabPoint = grabbedHandRef.current || hand;
      const targetX = (hand.x - anchor.x) * width;
      const targetY = (hand.y - (anchor.y + 0.05)) * height;
      physics.moveGrabbed(side, targetX, targetY);

      // Measure release velocity BEFORE updating the stored grab point.
      const vx = (hand.x - previousGrabPoint.x) * width / 0.06;
      const vy = (hand.y - previousGrabPoint.y) * height / 0.06;
      grabbedHandRef.current = hand;

      // Open your hand to release. A fast-moving release becomes a throw.
      if (activeHand.openness > 0.115) {

        // Drop over the opposite shoulder to physically rearrange the friends.
        // Otherwise keep the normal throw behavior.
        const otherSlot: Side = side === "left" ? "right" : "left";
        const target = anchors.slots[otherSlot];
        const nearOtherShoulder = distance(hand, { x: target.x, y: target.y + 0.05 }) < 0.22;
        if (nearOtherShoulder) {
          physics.release(side, 0, 0, now);
          swapCharacterSlots();
        } else {
          physics.release(side, Math.max(-1000, Math.min(1000, vx)), Math.max(-1000, Math.min(1000, vy)), now);
        }
        grabbedSideRef.current = null;
        grabbedHandRef.current = null;
      }
      return;
    }

    // Pet/flick reactions. These are evaluated before grabbing so an open-hand
    // touch can pet, while a fast directional movement can flick.
    if (now - lastInteractionRef.current >= 360 && hands.length) {
      for (const hand of hands) {
        const previous = previousHandsRef.current.length ? previousHandsRef.current[0] : hand.palm;
        const speedX = (hand.palm.x - previous.x) / 0.06;
        const speedY = (hand.palm.y - previous.y) / 0.06;
        const speed = Math.hypot(speedX, speedY);
        for (const side of ["left", "right"] as const) {
          const a = anchors[side];
          const headPoint = { x: a.x, y: a.y - 0.02 };
          const touchDistance = distance(hand.indexTip, headPoint);
          const palmDistance = distance(hand.palm, { x: a.x, y: a.y + 0.04 });
          if (speed > 0.85 && palmDistance < 0.22) {
            reactToCharacter(side, "flick", a.x * 100, a.y * 100);
            lastInteractionRef.current = now;
            return;
          }
          if (touchDistance < 0.13 && palmDistance < 0.24 && hand.openness > 0.09 && speed < 0.75) {
            reactToCharacter(side, "pet", a.x * 100, a.y * 100);
            lastInteractionRef.current = now;
            return;
          }
        }
      }
    }

    // Closed hand near a character = grab. Require a small cooldown so one
    // physical gesture cannot repeatedly grab/release the same friend.
    if (now - lastInteractionRef.current < 280 || !hands.length) return;

    let best: { side: Side; d: number; hand: typeof hands[number] } | null = null;
    for (const hand of hands) {
      for (const side of ["left", "right"] as const) {
        const a = anchors[side];
        const characterPoint = { x: a.x, y: a.y + 0.05 };
        const d = distance(hand.palm, characterPoint);
        if (d < 0.18 && (!best || d < best.d)) best = { side, d, hand };
      }
    }

    if (best && best.hand.openness < 0.10) {
      physics.grab(best.side);
      grabbedSideRef.current = best.side;
      grabbedHandRef.current = best.hand.palm;
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
      if (!window.isSecureContext) {
        throw new Error("Camera access requires HTTPS. Open the Vercel URL (not an insecure HTTP URL).");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not support camera access. Try the latest Chrome or Safari.");
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
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
        const physicsDt = Math.min(0.033, Math.max(0.001, (now - physicsTimeRef.current) / 1000));
        physicsTimeRef.current = now;
        setPhysics(physicsRef.current.update(physicsDt, now));

        if (now - lastFrameRef.current > 60 && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          lastFrameRef.current = now;
          try {
            const result = analyzeFrame(visionRef.current, videoRef.current, now);
            const readingGesture = readingDetectorRef.current.update(result.hands, result.handShapes, result.torso, result.bookVisible, now);
            const next = machineRef.current.update({ ...result, readingGesture }, now);
            setState(next);
            setSignals({ ...result, readingGesture });
            setShoulders(result.shoulders);
            handleCharacterInteractions(result, now);
            previousHandsRef.current = result.handShapes.map((h) => h.palm);
          } catch (frameError) {
            // A single bad frame should not kill the camera loop.
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
      const message = e instanceof DOMException && e.name === "NotAllowedError"
        ? "Camera permission was blocked. Allow camera access for this site and try again."
        : e instanceof DOMException && e.name === "NotFoundError"
          ? "No camera was found. Connect a camera and try again."
          : e instanceof Error
            ? e.message
            : "Could not start the camera. Please try again.";
      setError(message);
      setStarted(false);
    }
  }

  function getCharacterAttention(side: Side) {
    if (!shoulders) return { mode: "none" as const, lean: 0 };

    const anchor = renderAnchors[slotMapRef.current[side]];
    const target = { x: anchor.x / 100, y: anchor.y / 100 + 0.05 };
    let nearest = 1;
    let handX = target.x;

    for (const hand of previousHandsRef.current) {
      const d = distance(hand, target);
      if (d < nearest) {
        nearest = d;
        handX = hand.x;
      }
    }

    // A nearby hand makes the little friend notice you. The closer the hand,
    // the stronger the little head/body lean toward it.
    if (!grabbedSideRef.current && nearest < 0.25) {
      const towardHand = Math.max(-1, Math.min(1, (handX - target.x) / 0.18));
      return { mode: "hand" as const, lean: towardHand * 7 };
    }

    // When Zaynah is speaking, both friends subtly turn inward toward her.
    if (signals.mouthOpen > 0.42) {
      return { mode: "talk" as const, lean: side === "left" ? 5 : -5 };
    }

    return { mode: "none" as const, lean: 0 };
  }

  const renderAnchors = shoulders ? {
    left: { x: (1 - shoulders.left.x) * 100, y: shoulders.left.y * 100 - 13 },
    right: { x: (1 - shoulders.right.x) * 100, y: shoulders.right.y * 100 - 13 },
  } : {
    left: { x: 28, y: 45 },
    right: { x: 72, y: 45 },
  };
  const leftSlot = slotMapRef.current.left;
  const rightSlot = slotMapRef.current.right;
  const leftX = renderAnchors[leftSlot].x;
  const leftY = renderAnchors[leftSlot].y;
  const rightX = renderAnchors[rightSlot].x;
  const rightY = renderAnchors[rightSlot].y;

  return (
    <main className="app">
      <div className="camera-stage" ref={stageRef}>
        <video ref={videoRef} className="camera" muted playsInline />
        {!started && (
          <div className="welcome">
            <div className="welcome-card">
              <div className="mini-sparkle">✦</div>
              <h1>Zaynah's Little Friends</h1>
              <p>Your tiny hand-drawn friends are waiting on your shoulders.</p>
              <button onClick={start} disabled={loading}>{loading ? (status || "Waking them up…") : "Turn on camera"}</button>
              {error && <div className="error">{error}</div>}
            </div>
          </div>
        )}

        {started && <>
          <Character state={state} side="left" x={leftX} y={leftY} reaction={reactions.left} attention={getCharacterAttention("left")} physicsX={physics.left.x} physicsY={physics.left.y} physicsRotation={physics.left.rotation} />
          <Character state={state} side="right" x={rightX} y={rightY} reaction={reactions.right} attention={getCharacterAttention("right")} physicsX={physics.right.x} physicsY={physics.right.y} physicsRotation={physics.right.rotation} />
          {swapFlash && <div className="swap-toast">✨ switched shoulders ✨</div>}
          {activeBubble && <SpeechBubble kind={activeBubble.kind} side={activeBubble.side} x={activeBubble.x} y={activeBubble.y} text={activeBubble.kind === "pet" ? "Keep doing that, Zaynah 🥹" : "Stop it, Zaynah 😭"} />}
          <div className="debug"><span>{state}</span>{signals.readingGesture && <span>📖 reading gesture</span>}{signals.mouthOpen > 0.42 && <span>🗣️ talking</span>}{signals.handNearHead && <span>🤔 hand/head</span>}{grabbedSideRef.current && <span>🤏 grabbing {grabbedSideRef.current}</span>}</div>
        </>}
      </div>
    </main>
  );
}
