# Zaynah's Little Friends — V27 Council Room

A browser-based interactive **Inside-Out-inspired emotional council** for Zaynah.

The project is not meant to be a generic chatbot. The characters are different parts of Zaynah's own personality/emotional life. When she brings a problem to the room, each part gets a voice, reads what the other parts said, and the room eventually gives one collective recommendation.

## Emotional selves

- **Angry Zaynah** — protective, fiery, boundary-conscious and blunt.
- **Happy Zaynah** — warm, excited and optimistic; protects genuine joy.
- **Little Zaynah** — childhood self; playful, creative, sentimental and curious.
- **Logical Zaynah** — the renamed thinking character; analytical, practical and trade-off driven.
- **Sad Zaynah** — tender, reflective and honest about disappointment or homesickness.
- **Jealous Zaynah** — purple comparison/FOMO self; turns envy into information without encouraging resentment.
- **Lazy Zaynah** — the green character formerly called Idle; comfortable, funny and procrastination-aware.

## Dashboard experience

The first screen is a room rather than a camera avatar scene. All seven characters are visible at fixed floating/sitting positions:

- Angry: left shoulder area
- Happy: right shoulder area
- Sad: near the left ear
- Jealousy: near the right ear
- Logical: above the head
- Little Zaynah: lower left
- Lazy Zaynah: lower right

They are **not attached to the user's body** on the dashboard.

On entry, every character has its own welcome line. A detected wave makes the room wave back.

## Opening the council

Turn on the camera and close your fist. The app detects the fist gesture and opens one shared room chat titled:

> **Okay, so what's up, Zaynah?**

There is also a normal button/input fallback so the experience does not depend entirely on gesture recognition.

Zaynah can type or use browser speech recognition.

## Council deliberation

When Zaynah describes an issue:

1. Angry gives the angry perspective.
2. Happy gives the happy perspective.
3. Little Zaynah gives the childhood/creative perspective.
4. Logical gives the practical perspective.
5. Sad gives the emotional/reflective perspective.
6. Jealousy gives the comparison/desire perspective.
7. Lazy gives the avoidance/rest perspective.
8. Each later character receives the previous characters' comments, so they can agree, disagree or challenge each other.
9. Zaynah can add context during the discussion.
10. A final Gemini call synthesizes the room into **We have concluded** + one concrete next step.

The staggered timing is intentional: the room should feel like the characters are thinking and talking to each other, not like seven answers appeared simultaneously.

## Memory

The existing local emotion journal remains the long-term memory layer.

A daily story can contain:
- what made Zaynah angry
- what made her happy
- what hurt
- what she is proud of
- what she is jealous about
- what she is avoiding
- what helped
- what she is still thinking about

The seeded profile includes the background Zaynah supplied: age 23, first APM role at Tata CLiQ, Delhi-to-Bombay move, school/college leadership, painting/debates, coding/building, LeetCode/placement experience, piano, tennis/badminton, walking, missing home and her mother's cooking, Bombay cost frustrations, and the desire to become a stronger version of herself again.

The journal is stored in browser localStorage. The Gemini API receives only the structured profile/journal context sent by the browser; the Gemini key itself stays server-side.

## New character artwork

The project currently includes:

- `happy.png`
- `angry.png`
- `thinking.png` → used for **Logical Zaynah**
- `reading.png` → used for **Little Zaynah**
- `idle.png` → used for **Lazy Zaynah**
- `sad.png` → grey temporary character variant
- `jealousy.png` → purple temporary character variant

The sad/jealousy assets are stylistic variants of the supplied hand-drawn art. They are intentionally isolated in `public/characters/` so they can be replaced later with final custom drawings without changing the app architecture.

## Technical stack

- React 19
- TypeScript
- Vite
- MediaPipe Tasks Vision
- Gemini API through a Vercel serverless endpoint
- Browser SpeechRecognition for voice input
- Browser SpeechSynthesis can be added/used for spoken replies
- localStorage for profile and emotion memory
- No Three.js / no 3D

## API

`/api/council.js` supports:

- `mode: "voice"` — generates one emotional perspective using the selected character and all prior comments.
- `mode: "final"` — synthesizes the complete room into a conclusion and action.

Default model:

`gemini-3.8-flash`

Override with `GEMINI_MODEL` if needed. Do not put a Google project/client identifier such as `gen-lang-client-...` in `GEMINI_MODEL`.

Required Vercel environment variable:

`GEMINI_API_KEY`

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Important product principle

The app should feel like:

> **"I am talking to myself — but the parts of me that I normally cannot hear are finally talking back."**

It should not feel like seven versions of ChatGPT.


## Council deliberation behavior

The council is intentionally slow and sequential: each of the seven emotional selves gets a turn, with a pause between voices so the room feels like a real internal discussion rather than a stream of chatbot replies. The experience is designed to land around 1–2 minutes depending on Gemini latency and whether Zaynah is asked a question.

A voice may pause the room with one decision-relevant question. Zaynah can answer in the council input; the answer is then passed to the remaining voices and final synthesis. Unanswered questions time out after 45 seconds so the room cannot hang forever.

Private financial context can be used for affordability reasoning, but salary figures are never returned in character comments or conclusions.
