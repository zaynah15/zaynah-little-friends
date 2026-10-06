import { useEffect, useRef, useState } from 'react';
import Character from './components/Character';
import { createVision, analyzeFrame, type VisionBundle } from './vision/mediapipe';
import type { CharacterState } from './state/types';
import { COUNCIL, COUNCIL_BY_STATE, type CouncilCharacter } from './council';
import { addJournalEntry, journalMemory, loadJournal, loadProfile } from './memory/memory';
import type { JournalEntry, UserProfile } from './memory/types';

type HandPoint = { x: number; y: number };
type HandShape = { wrist: HandPoint; indexTip: HandPoint; thumbTip: HandPoint; palm: HandPoint; openness: number };
type CouncilComment = { state: CharacterState; name: string; text: string; time: number };

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

const POSITIONS: Record<CharacterState, { x: number; y: number; size: number }> = {
  angry: { x: 16, y: 67, size: 145 },
  happy: { x: 84, y: 67, size: 145 },
  child: { x: 35, y: 86, size: 142 },
  lazy: { x: 65, y: 87, size: 142 },
  sad: { x: 26, y: 31, size: 132 },
  jealousy: { x: 74, y: 31, size: 132 },
  logical: { x: 50, y: 13, size: 190 },
};

const WELCOME_LINES: Record<CharacterState, string> = Object.fromEntries(COUNCIL.map(c => [c.state, c.welcome])) as Record<CharacterState, string>;

class WaveDetector {
  private previousX: number | null = null;
  private score = 0;
  private cooldownUntil = 0;
  update(hand: HandShape | undefined, now: number) {
    if (!hand) { this.previousX = null; this.score = Math.max(0, this.score - .08); return false; }
    const dx = this.previousX == null ? 0 : Math.abs(hand.palm.x - this.previousX);
    this.previousX = hand.palm.x;
    if (hand.openness > .42 && dx > .014) this.score = Math.min(1, this.score + .22);
    else this.score = Math.max(0, this.score - .05);
    if (this.score > .62 && now > this.cooldownUntil) {
      this.score = 0;
      this.cooldownUntil = now + 1800;
      return true;
    }
    return false;
  }
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const visionRef = useRef<VisionBundle | null>(null);
  const waveRef = useRef(new WaveDetector());
  const previousFistRef = useRef(false);
  const lastGestureRef = useRef(0);
  const lastFistOpenRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const councilAbortRef = useRef<AbortController | null>(null);
  const questionWaiterRef = useRef<((answer: string) => void) | null>(null);

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [waving, setWaving] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInText, setCheckInText] = useState('');
  const [checkInListening, setCheckInListening] = useState(false);
  const [checkInSaving, setCheckInSaving] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[]>(() => loadJournal());
  const [profile] = useState<UserProfile>(() => loadProfile());

  const [councilOpen, setCouncilOpen] = useState(false);
  const [issue, setIssue] = useState('');
  const [issueDraft, setIssueDraft] = useState('');
  const [voiceListening, setVoiceListening] = useState(false);
  const [comments, setComments] = useState<CouncilComment[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<CharacterState | null>(null);
  const [deliberating, setDeliberating] = useState(false);
  const [conclusion, setConclusion] = useState('');
  const [conclusionAction, setConclusionAction] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [roomContext, setRoomContext] = useState('');
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [showCameraHint, setShowCameraHint] = useState(false);


  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    recognitionRef.current?.stop();
    councilAbortRef.current?.abort();
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(track => track.stop());
  }, []);

  function triggerWave() {
    setWaving(true);
    window.setTimeout(() => setWaving(false), 1500);
  }

  function openCouncil() {
    setCouncilOpen(true);
    setComments([]);
    setConclusion('');
    setConclusionAction('');
    setRoomInput('');
    setRoomContext('');
    setPendingQuestion('');
    setIssueDraft('');
  }

  function closeCouncil() {
    councilAbortRef.current?.abort();
    questionWaiterRef.current?.('');
    questionWaiterRef.current = null;
    setPendingQuestion('');
    setDeliberating(false);
    setActiveSpeaker(null);
    setCouncilOpen(false);
  }

  async function askVoice(speaker: CouncilCharacter, currentIssue: string, previous: CouncilComment[], extraContext: string) {
    const response = await fetch('/api/council', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'voice',
        speaker: speaker.state,
        issue: currentIssue,
        comments: previous.map(c => ({ name: c.name, state: c.state, text: c.text })),
        extraContext,
        profile,
        journal: journalMemory(journal),
      }),
      signal: councilAbortRef.current?.signal,
    });
    const raw = await response.text();
    let data: { text?: string; question?: string; error?: string } = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { /* handled below */ }
    if (!response.ok) throw new Error(data.error || 'The council could not respond.');
    return { text: String(data.text || '').trim(), question: String(data.question || '').trim() };
  }

  async function askConclusion(currentIssue: string, allComments: CouncilComment[], extraContext: string) {
    const response = await fetch('/api/council', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'final',
        issue: currentIssue,
        comments: allComments.map(c => ({ name: c.name, state: c.state, text: c.text })),
        extraContext,
        profile,
        journal: journalMemory(journal),
      }),
      signal: councilAbortRef.current?.signal,
    });
    const raw = await response.text();
    let data: { conclusion?: string; action?: string; error?: string } = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { /* handled below */ }
    if (!response.ok) throw new Error(data.error || 'The council could not reach a conclusion.');
    return { conclusion: String(data.conclusion || '').trim(), action: String(data.action || '').trim() };
  }

  function waitForAnswer(question: string) {
    setPendingQuestion(question);
    return new Promise<string>((resolve) => {
      let settled = false;
      const finish = (answer: string) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        questionWaiterRef.current = null;
        setPendingQuestion('');
        resolve(answer);
      };
      const timeoutId = window.setTimeout(() => finish(''), 45000);
      questionWaiterRef.current = finish;
    });
  }

  async function runCouncil() {
    const cleanIssue = (issueDraft.trim() || issue.trim());
    if (!cleanIssue || deliberating) return;
    councilAbortRef.current?.abort();
    questionWaiterRef.current?.('');
    councilAbortRef.current = new AbortController();
    setIssue(cleanIssue);
    setIssueDraft('');
    setComments([]);
    setConclusion('');
    setConclusionAction('');
    setPendingQuestion('');
    setDeliberating(true);
    setError('');

    let built: CouncilComment[] = [];
    try {
      for (let index = 0; index < COUNCIL.length; index += 1) {
        const speaker = COUNCIL[index];
        setActiveSpeaker(speaker.state);
        const result = await askVoice(speaker, cleanIssue, built, roomContext.trim());
        const next: CouncilComment = { state: speaker.state, name: speaker.name, text: result.text, time: Date.now() };
        built = [...built, next];
        setComments([...built]);

        // Give the room time to feel like a real discussion rather than a chatbot dumping seven replies.
        // Seven voices + these pauses intentionally land around the 1–2 minute deliberation experience.
        if (result.question && index < COUNCIL.length - 1) {
          setActiveSpeaker(speaker.state);
          const answer = await waitForAnswer(result.question);
          if (answer.trim()) {
            built = [...built, { state: 'logical', name: 'Zaynah', text: answer.trim(), time: Date.now() }];
            setRoomContext(prev => prev ? `${prev}\n${answer.trim()}` : answer.trim());
            setComments([...built]);
          }
        } else if (index < COUNCIL.length - 1) {
          await new Promise(resolve => window.setTimeout(resolve, 9000));
        }
      }
      setActiveSpeaker(null);
      const final = await askConclusion(cleanIssue, built, roomContext.trim());
      setConclusion(final.conclusion);
      setConclusionAction(final.action);
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setError(e instanceof Error ? e.message : 'The council got interrupted.');
    } finally {
      setActiveSpeaker(null);
      setDeliberating(false);
      setPendingQuestion('');
      questionWaiterRef.current = null;
    }
  }

  async function addRoomContext() {
    const text = roomInput.trim();
    if (!text) return;
    setRoomInput('');
    if (pendingQuestion && questionWaiterRef.current) {
      questionWaiterRef.current(text);
      return;
    }
    setRoomContext(prev => prev ? `${prev}\n${text}` : text);
    setComments(prev => [...prev, { state: 'logical', name: 'Zaynah', text, time: Date.now() }]);
  }

  function startVoice(target: 'checkin' | 'issue') {
    const active = target === 'checkin' ? checkInListening : voiceListening;
    if (active) { recognitionRef.current?.stop(); return; }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setError('Voice capture is not available in this browser. You can type instead.'); return; }
    const recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.onresult = (event: any) => {
      const chunks: string[] = [];
      for (let i = 0; i < event.results.length; i += 1) {
        const transcript = event.results[i]?.[0]?.transcript;
        if (transcript) chunks.push(transcript);
      }
      if (target === 'checkin') setCheckInText(chunks.join(' '));
      else setIssueDraft(chunks.join(' '));
    };
    recognition.onerror = () => { setCheckInListening(false); setVoiceListening(false); };
    recognition.onend = () => { setCheckInListening(false); setVoiceListening(false); };
    recognitionRef.current = recognition;
    if (target === 'checkin') setCheckInListening(true); else setVoiceListening(true);
    try { recognition.start(); } catch { setCheckInListening(false); setVoiceListening(false); }
  }

  function saveCheckIn() {
    const text = checkInText.trim();
    if (!text || checkInSaving) return;
    setCheckInSaving(true);
    recognitionRef.current?.stop();
    try {
      setJournal(addJournalEntry(text));
      setCheckInText('');
      setCheckInOpen(false);
    } finally { setCheckInSaving(false); }
  }

  function skipCheckIn() {
    recognitionRef.current?.stop();
    setCheckInListening(false);
    setCheckInOpen(false);
  }

  async function startCamera() {
    if (loading || started) return;
    setLoading(true); setError(''); setStatus('Waking the little room up…');
    let stream: MediaStream | null = null;
    try {
      if (!window.isSecureContext) throw new Error('Camera access requires HTTPS.');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      const video = videoRef.current;
      if (!video) throw new Error('Camera preview could not be initialized.');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      setStatus('Loading your little selves…');
      visionRef.current = await createVision();
      setStarted(true); setLoading(false); setStatus(''); setShowCameraHint(true);
      const loop = (now: number) => {
        if (!visionRef.current || !videoRef.current) return;
        const videoEl = videoRef.current;
        if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && now - lastGestureRef.current > 45) {
          lastGestureRef.current = now;
          try {
            const result = analyzeFrame(visionRef.current, videoEl, now);
            const hand = result.handShapes[0] as HandShape | undefined;
            if (waveRef.current.update(hand, now)) triggerWave();
            const fist = Boolean(hand && hand.openness < .12);
            if (fist && !previousFistRef.current && now - lastFistOpenRef.current > 900) { openCouncil(); lastFistOpenRef.current = now; }
            previousFistRef.current = fist;
          } catch (frameError) { console.warn('Vision frame skipped', frameError); }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      stream?.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setLoading(false); setStarted(false); setStatus('');
      setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Camera permission was blocked. Allow camera access for this site and try again.' : e instanceof Error ? e.message : 'Could not start the camera.');
    }
  }

  return (
    <main className="app">
      <video ref={videoRef} className={`camera ${started ? 'camera-live' : ''}`} muted playsInline />
      <header className="topbar">
        <div>
          <div className="brand">ZAYNAH'S LITTLE FRIENDS</div>
          <div className="subtitle">seven parts of you. one little room.</div>
        </div>
        <div className="top-actions">
          <button className="tiny-button" onClick={() => setCheckInOpen(true)}>✦ tell them about today</button>
          {!started && <button className="tiny-button dark" onClick={startCamera} disabled={loading}>{loading ? (status || 'Waking them…') : 'Turn on camera'}</button>}
        </div>
      </header>

      <section className="room" aria-label="Zaynah's emotions">
        <div className="room-glow glow-a" /><div className="room-glow glow-b" />
        {COUNCIL.map(character => {
          const p = POSITIONS[character.state];
          return <div key={character.state} className={`room-character room-${character.state}`}>
            <Character state={character.state} x={p.x} y={p.y} size={p.size} wave={waving} speaking={activeSpeaker === character.state} highlighted={activeSpeaker === character.state} />
            <div className="character-name" style={{ left: `${p.x}%`, top: `calc(${p.y}% + ${p.size * .12}px)` }}>{character.shortName}</div>
            <div className={`welcome-line ${waving ? 'welcome-waving' : ''}`} style={{ left: `${p.x}%`, top: `calc(${p.y}% + ${p.size * .35}px)` }}>{WELCOME_LINES[character.state]}</div>
          </div>;
        })}
        <div className="room-title">
          <span>GOOD AFTERNOON, ZAYNAH.</span>
          <h1>How are we feeling today?</h1>
          <p>Wave at them. Then close your fist when you have something you want all of you to think through.</p>
        </div>
        <div className="gesture-hint">
          <span>{started ? '👋 wave = they wave back' : 'camera optional'}</span>
          <span>{started ? '✊ fist = open the council' : 'turn on camera for gestures'}</span>
        </div>
        {showCameraHint && <button className="camera-off" onClick={() => { const stream = videoRef.current?.srcObject as MediaStream | null; stream?.getTracks().forEach(t => t.stop()); if (videoRef.current) videoRef.current.srcObject = null; setStarted(false); setShowCameraHint(false); }}>hide camera</button>}
      </section>

      {checkInOpen && <div className="modal-backdrop">
        <section className="memory-modal">
          <div className="kicker">YOUR DAILY MEMORY</div>
          <h2>Tell all of you what happened today.</h2>
          <p>This is not a productivity check-in. Tell them what made you angry, happy, sad, jealous, proud, lonely, excited, confused — whatever actually happened.</p>
          <textarea value={checkInText} onChange={e => setCheckInText(e.target.value)} placeholder="Today…\nSomething that made me angry…\nSomething I loved…\nSomething I am still thinking about…" autoFocus />
          <div className="memory-controls">
            <button className={checkInListening ? 'listen-button active' : 'listen-button'} onClick={() => startVoice('checkin')}>{checkInListening ? '● listening…' : '🎙️ narrate instead'}</button>
            <button className="ghost-button" onClick={skipCheckIn}>skip</button>
            <button onClick={saveCheckIn} disabled={!checkInText.trim() || checkInSaving}>{checkInSaving ? 'remembering…' : 'remember this →'}</button>
          </div>
          <small>Saved on this device. Your emotions use these memories as context later.</small>
        </section>
      </div>}

      {councilOpen && <div className="council-backdrop">
        <section className="council-panel">
          <header className="council-header">
            <div><div className="kicker">THE ROOM</div><h2>Okay, so what's up, Zaynah?</h2><p>Not ChatGPT. Seven different parts of you are about to argue constructively.</p></div>
            <button className="close-room" onClick={closeCouncil}>×</button>
          </header>

          {!issue && <div className="issue-start">
            <textarea value={issueDraft} onChange={e => setIssueDraft(e.target.value)} placeholder="Tell them the whole thing. A conflict, a decision, something that hurt, something you don't know what to do about…" autoFocus />
            <div className="issue-actions">
              <button className={voiceListening ? 'listen-button active' : 'listen-button'} onClick={() => startVoice('issue')}>{voiceListening ? '● listening…' : '🎙️ say it out loud'}</button>
              <button onClick={runCouncil} disabled={!issueDraft.trim()}>Let them think →</button>
            </div>
            <small>They will read each other's thoughts before giving you one collective conclusion.</small>
          </div>}

          {issue && <>
            <div className="issue-card"><span>You:</span><p>{issue}</p></div>
            <div className="council-scroll">
              {comments.map((comment, index) => {
                const c = COUNCIL_BY_STATE[comment.state];
                const isUser = comment.name === 'Zaynah';
                return <article key={`${comment.time}-${index}`} className={`council-comment ${isUser ? 'user-context' : ''}`}>
                  {!isUser && <div className="comment-avatar"><img src={`/characters/${comment.state === 'lazy' ? 'idle' : comment.state === 'logical' ? 'thinking' : comment.state === 'child' ? 'reading' : comment.state}.png`} alt="" /></div>}
                  <div><div className="comment-name" style={{ color: isUser ? '#444' : c?.color }}>{comment.name}</div><div className="comment-text">{comment.text}</div></div>
                </article>;
              })}
              {activeSpeaker && <div className="thinking-room"><span>{COUNCIL_BY_STATE[activeSpeaker].shortName}</span> is thinking…</div>}
              {conclusion && <section className="conclusion-card"><div className="kicker">THEY TALKED. THEY DISAGREED. THEY AGREED.</div><h3>We have concluded.</h3><p>{conclusion}</p>{conclusionAction && <div className="conclusion-action"><strong>What you can do:</strong> {conclusionAction}</div>}</section>}
            </div>
            {pendingQuestion && <div className="council-question"><strong>{activeSpeaker ? COUNCIL_BY_STATE[activeSpeaker].shortName : 'They'} asks:</strong><span>{pendingQuestion}</span></div>}
            <div className="room-reply">
              <input value={roomInput} onChange={e => setRoomInput(e.target.value)} placeholder={pendingQuestion ? 'Answer them…' : 'Add something they should know…'} onKeyDown={e => { if (e.key === 'Enter') void addRoomContext(); }} />
              <button onClick={addRoomContext} disabled={!roomInput.trim()}>{pendingQuestion ? 'answer →' : 'add context'}</button>
              {!deliberating && conclusion && <button className="rethink-button" onClick={runCouncil}>rethink</button>}
            </div>
            {error && <div className="council-error">{error}</div>}
          </>}
        </section>
      </div>}
    </main>
  );
}
