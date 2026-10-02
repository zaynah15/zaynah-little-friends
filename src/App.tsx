import { useEffect, useRef, useState } from "react";
import Character from "./components/Character";
import SpeechBubble from "./components/SpeechBubble";
import { createVision, analyzeFrame, type VisionBundle } from "./vision/mediapipe";
import { CharacterStateMachine } from "./state/stateMachine";
import type { CharacterState, VisionSignals } from "./state/types";

type HandPoint = { x: number; y: number };
type HandShape = { wrist: HandPoint; indexTip: HandPoint; thumbTip: HandPoint; palm: HandPoint; openness: number };
type ChatMessage = { role: "user" | "bot"; text: string };

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    start(): void;
    stop(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
  }
  interface SpeechRecognitionEvent extends Event {
    results: any;
  }
}

function distance(a: HandPoint, b: HandPoint) { return Math.hypot(a.x - b.x, a.y - b.y); }

class ReadingGestureDetector {
  private previousAverageY: number | null = null;
  private pickupScore = 0;
  private holdUntil = 0;
  update(hands: HandPoint[], handShapes: HandShape[], torso: any, bookVisible: boolean, now: number) {
    if (bookVisible) { this.holdUntil = now + 1400; return true; }
    if (!hands.length || !torso) return now < this.holdUntil;
    const shoulderMid = { x: (torso.leftShoulder.x + torso.rightShoulder.x) / 2, y: (torso.leftShoulder.y + torso.rightShoulder.y) / 2 };
    const hipMid = torso.leftHip && torso.rightHip ? { x: (torso.leftHip.x + torso.rightHip.x) / 2, y: (torso.leftHip.y + torso.rightHip.y) / 2 } : { x: shoulderMid.x, y: shoulderMid.y + .35 };
    const avgY = hands.reduce((sum, h) => sum + h.y, 0) / hands.length;
    const previousY = this.previousAverageY;
    const downwardMove = previousY !== null ? avgY - previousY : 0;
    const nearLowerTorso = avgY > shoulderMid.y + .14 && avgY < hipMid.y + .10;
    if (nearLowerTorso && downwardMove > .012) this.pickupScore = Math.min(1, this.pickupScore + .32); else this.pickupScore = Math.max(0, this.pickupScore - .035);
    const nearChest = Math.abs(avgY - (shoulderMid.y + .15)) < .16;
    const handsTogether = hands.length >= 2 ? Math.abs(hands[0].x - hands[1].x) < .42 && Math.abs(hands[0].y - hands[1].y) < .28 : handShapes.some(h => h.openness < .075);
    const upwardMove = previousY !== null ? previousY - avgY : 0;
    if (this.pickupScore > .45 && nearChest && handsTogether && (upwardMove > .006 || this.pickupScore > .75)) { this.holdUntil = now + 3500; this.pickupScore = 0; }
    this.previousAverageY = avgY;
    return now < this.holdUntil;
  }
}

class KissGestureDetector {
  private armedAt = 0;
  private previousHand: HandPoint | null = null;
  private cooldownUntil = 0;
  update(hand: HandShape | undefined, mouthPucker: number, handNearMouth: boolean, now: number) {
    if (!hand) { this.previousHand = null; return false; }
    const current = hand.palm;
    const previous = this.previousHand;
    const moveAway = previous ? Math.hypot(current.x - previous.x, current.y - previous.y) : 0;
    if (mouthPucker > .42 && handNearMouth) this.armedAt = now + 900;
    const fired = now < this.armedAt && moveAway > .018 && !handNearMouth && now > this.cooldownUntil;
    if (fired) { this.cooldownUntil = now + 1800; this.armedAt = 0; }
    this.previousHand = current;
    return fired;
  }
}

class CharacterPhysics {
  private state = { x: 0, y: 0, vx: 0, vy: 0, rotation: 0, vr: 0 };
  private grabbed = false;
  private thrownUntil = 0;
  private fallen = false;
  grab() { if (this.fallen) return; this.grabbed = true; this.state.vx = 0; this.state.vy = 0; this.state.vr = 0; }
  isGrabbed() { return this.grabbed; }
  isFallen() { return this.fallen; }
  moveGrabbed(dx: number, dy: number) { if (!this.grabbed) return; this.state.x = dx; this.state.y = dy; this.state.vx = 0; this.state.vy = 0; this.state.rotation = Math.max(-28, Math.min(28, dx * .22)); }
  release(vx: number, vy: number, now: number) { if (!this.grabbed) return; this.grabbed = false; this.state.vx = vx; this.state.vy = vy; this.state.vr = vx * .055; this.thrownUntil = now + 650; }
  update(dt: number, now: number) {
    const s = this.state;
    if (!this.grabbed && !this.fallen) {
      if (now < this.thrownUntil) { s.vx *= Math.pow(.10, dt); s.vy = s.vy * Math.pow(.28, dt) + 260 * dt; s.vr *= Math.pow(.18, dt); s.x += s.vx * dt; s.y += s.vy * dt; s.rotation += s.vr * dt; }
      else { const stiffness = 30, damping = 8; s.vx += (-stiffness*s.x-damping*s.vx)*dt; s.vy += (-stiffness*s.y-damping*s.vy)*dt; s.vr += (-42*s.rotation-8*s.vr)*dt; s.x += s.vx*dt; s.y += s.vy*dt; s.rotation += s.vr*dt; }
    }
    return { x: s.x, y: s.y, rotation: s.rotation };
  }
}

const PERSONAS: Record<CharacterState, string> = {
  idle: "You are Zaynah's sleepy little friend. Reply like a cute, dry, sleepy bestie. Example vibe: 'oh... I am sleepy 😭'.",
  happy: "You are Zaynah's ridiculously excited little friend. Be bubbly, affectionate and energetic. Example vibe: 'Yesss Zaynahhh!! I am so excited for it!! 💕'.",
  angry: "You are Zaynah's dramatic angry little friend. Be witty, teasing and savage but playful, never genuinely cruel. Example vibe: 'Oh really? Rich coming from YOU 😭'.",
  thinking: "You are Zaynah's focused thinking little friend. Keep replies short and distracted because you are concentrating. Example vibe: 'Say whatever you wanna say, I need to concentrate 🧠'.",
  reading: "You are Zaynah's bookish little friend. Be mildly annoyed when interrupted and make playful page/book jokes. Example vibe: 'Zaynah, read better. You left me on page 45 😭📖'.",
};

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
  const previousIndexRef = useRef(false);
  const lastInteractionRef = useRef(0);
  const latestShouldersRef = useRef<VisionSignals["shoulders"]>(undefined);
  const lastFrameRef = useRef(0);
  const timeoutRefs = useRef<number[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<CharacterState>(machineRef.current.state);
  const [chatState, setChatState] = useState<CharacterState>("idle");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [signals, setSignals] = useState<VisionSignals>({ smile: 0, anger: 0, mouthOpen: 0, mouthPucker: 0, handNearChin: false, handNearMouth: false, indexPointing: false, bookVisible: false });
  const [bubble, setBubble] = useState<{ text: string; kind: "kiss"; x: number; y: number } | null>(null);
  const [physics, setPhysics] = useState({ x: 0, y: 0, rotation: 0 });

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    timeoutRefs.current.forEach(id => window.clearTimeout(id));
    recognitionRef.current?.stop();
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(track => track.stop());
  }, []);

  function stagePixels() { const rect = stageRef.current?.getBoundingClientRect(); return { width: rect?.width || 1280, height: rect?.height || 720 }; }
  function anchor() { const shoulders = latestShouldersRef.current; return shoulders ? { x: 1 - shoulders.right.x, y: shoulders.right.y - .13 } : { x: .72, y: .45 }; }

  function showBubble(text: string) {
    setBubble({ text, kind: "kiss", x: 70, y: 24 });
    timeoutRefs.current.push(window.setTimeout(() => setBubble(null), 2400));
  }

  function openChat() {
    if (chatOpen) return;
    const locked = machineRef.current.state;
    setChatState(locked);
    setChatOpen(true);
    setChatMessages([]);
    setChatInput("");
  }

  function closeChat() {
    recognitionRef.current?.stop();
    setListening(false);
    setChatOpen(false);
    setChatInput("");
  }

  async function sendMessage(text = chatInput) {
    const trimmed = text.trim();
    if (!trimmed || chatLoading) return;
    const nextHistory = [...chatMessages, { role: "user" as const, text: trimmed }].slice(-8);
    setChatMessages(nextHistory);
    setChatInput("");
    setChatLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: chatState, history: nextHistory }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "The little friend couldn't reply.");
      setChatMessages(prev => [...prev, { role: "bot", text: data.reply }].slice(-10));
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "bot", text: e instanceof Error ? e.message : "...my brain just fell off the shoulder." }].slice(-10));
    } finally {
      setChatLoading(false);
    }
  }

  function startVoiceInput() {
    if (listening) { recognitionRef.current?.stop(); return; }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setChatMessages(prev => [...prev, { role: "bot", text: "Your browser doesn't have voice input. Type to me instead 😭" }]); return; }
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setChatInput(transcript);
      void sendMessage(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function start() {
    if (loading || started) return;
    setLoading(true); setError(""); setStatus("Asking for camera access…");
    let stream: MediaStream | null = null;
    try {
      if (!window.isSecureContext) throw new Error("Camera access requires HTTPS. Open the Vercel URL.");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not support camera access.");
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview could not be initialized.");
      video.srcObject = stream; video.muted = true; video.playsInline = true;
      setStatus("Loading face, hand and body tracking…");
      await video.play();
      visionRef.current = await createVision();
      physicsTimeRef.current = performance.now(); lastFrameRef.current = 0;
      setStarted(true); setLoading(false); setStatus("");
      const loop = (now: number) => {
        if (!visionRef.current || !videoRef.current) return;
        const dt = Math.min(.033, Math.max(.001, (now - physicsTimeRef.current) / 1000));
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

            if (result.indexPointing && !previousIndexRef.current && now - lastInteractionRef.current > 900) {
              openChat();
              lastInteractionRef.current = now;
            }
            previousIndexRef.current = result.indexPointing;

            if (kissRef.current.update(result.handShapes[0], result.mouthPucker, result.handNearMouth, now)) {
              showBubble("Zaynah loves me yeyeyey 💕");
            }

            const a = anchor();
            const hand = result.handShapes[0];
            const previous = previousHandsRef.current[0] || hand?.palm;
            const { width, height } = stagePixels();
            if (physicsRef.current.isGrabbed()) {
              if (!hand) { physicsRef.current.release(0, 0, now); grabbedHandRef.current = null; }
              else {
                physicsRef.current.moveGrabbed((hand.palm.x-a.x)*width, (hand.palm.y-(a.y+.05))*height);
                if (hand.openness > .115) {
                  const vx = (hand.palm.x-(grabbedHandRef.current?.x ?? hand.palm.x))*width/.06;
                  const vy = (hand.palm.y-(grabbedHandRef.current?.y ?? hand.palm.y))*height/.06;
                  physicsRef.current.release(Math.max(-1000,Math.min(1000,vx)),Math.max(-1000,Math.min(1000,vy)),now); grabbedHandRef.current=null;
                }
              }
            } else if (!chatOpen && hand && hand.openness < .10 && distance(hand.palm,{x:a.x,y:a.y+.04})<.20 && now-lastInteractionRef.current>350) {
              physicsRef.current.grab(); grabbedHandRef.current=hand.palm; lastInteractionRef.current=now;
            }
            previousHandsRef.current = result.handShapes.map(h => h.palm);
          } catch (frameError) { console.warn("Vision frame skipped", frameError); }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      stream?.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      visionRef.current = null; setLoading(false); setStatus(""); setStarted(false);
      setError(e instanceof DOMException && e.name === "NotAllowedError" ? "Camera permission was blocked. Allow camera access for this site and try again." : e instanceof Error ? e.message : "Could not start the camera. Please try again.");
    }
  }

  const renderAnchor = anchor();
  const displayState = chatOpen ? chatState : state;
  const attention = signals.mouthOpen > .42 ? { mode: "talk" as const, lean: -5 } : { mode: "none" as const, lean: 0 };

  return (
    <main className="app">
      <div className="camera-stage" ref={stageRef}>
        <video ref={videoRef} className="camera" muted playsInline />
        {!started && <div className="welcome"><div className="welcome-card"><div className="mini-sparkle">✦</div><h1>Zaynah's Little Friend</h1><p>One tiny friend, right on your shoulder.</p><button onClick={start} disabled={loading}>{loading ? (status || "Waking them up…") : "Turn on camera"}</button>{error && <div className="error">{error}</div>}</div></div>}
        {started && <>
          <Character state={displayState} side="right" x={renderAnchor.x*100} y={renderAnchor.y*100} attention={attention} physicsX={physics.x} physicsY={physics.y} physicsRotation={physics.rotation} fallen={physicsRef.current.isFallen()} />
          {bubble && <SpeechBubble kind={bubble.kind} side="right" x={bubble.x} y={bubble.y} text={bubble.text} />}
          {chatOpen && <div className="chat-panel" role="dialog" aria-label="Talk to your little friend">
            <div className="chat-header"><div><strong>{displayState === "angry" ? "Angry Zaynah" : displayState === "happy" ? "Happy Zaynah" : displayState === "thinking" ? "Thinking Zaynah" : displayState === "reading" ? "Reading Zaynah" : "Sleepy Zaynah"}</strong><small>still in character ✨</small></div><button className="chat-close" onClick={closeChat} aria-label="Close">×</button></div>
            <div className="chat-messages">
              {chatMessages.length === 0 && <div className="chat-empty">Say something. I promise she has opinions.</div>}
              {chatMessages.map((message,i) => <div className={`chat-message ${message.role}`} key={`${i}-${message.text}`}><span>{message.text}</span>{message.role === "bot" && <button className="speak-reply" onClick={() => { if ("speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(message.text)); }} aria-label="Speak reply">🔊</button>}</div>)}
              {chatLoading && <div className="chat-message bot typing">thinking…</div>}
            </div>
            <form className="chat-composer" onSubmit={e => { e.preventDefault(); void sendMessage(); }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Talk to me…" autoFocus />
              <button type="button" className={listening ? "mic listening" : "mic"} onClick={startVoiceInput} aria-label="Speak">{listening ? "●" : "🎙️"}</button>
              <button type="submit" disabled={!chatInput.trim() || chatLoading}>➤</button>
            </form>
          </div>}
        </>}
      </div>
    </main>
  );
}
