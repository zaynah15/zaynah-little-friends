# Zaynah's Little Friends — V23

A browser-based interactive 2D hand-drawn AI companion. One tiny character sits on Zaynah's left shoulder and reacts to MediaPipe face/hand/pose signals.

## V23 conversation upgrade

This version adds a fictional one-month planner/context layer so Gemini conversations can feel personal and state-aware instead of generic.

The demo planner includes:
- sunflower painting
- office/APM work
- JEV AI learning sessions
- 7-page reading target
- 10,000-step movement target
- a gentle consistency/weight-loss routine goal
- intentional missed/procrastination days for testing

The planner is stored in browser localStorage and is sent as structured context to `/api/chat`. Explicit progress messages such as “I finished my reading”, “I finished the sunflower painting”, “I did 10k steps”, or “I finished my JEV session” update the demo planner.

## Character personalities

- **Reading:** bookish, sarcastic accountability friend; notices reading gaps and the 7-page target.
- **Angry:** brutally honest, playful accountability friend; calls out procrastination without being cruel.
- **Happy:** energetic hype friend; celebrates concrete wins.
- **Thinking:** strategist; helps prioritize the next action.
- **Idle:** sleepy chaotic bestie; casual and not constantly productivity-focused.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Vercel / Gemini

Keep the real API key server-side:

- `GEMINI_API_KEY` — required
- `GEMINI_MODEL` — optional; use a valid Gemini model name, not a Google project/client ID. If omitted, the API uses its fallback model list.

The browser calls `/api/chat`; the API key is never bundled into client JavaScript.

## Important design rules

- Keep the original hand-drawn 2D artwork.
- Do not reintroduce Three.js or 3D.
- Keep one character only.
- Character follows Zaynah's left shoulder.
- Index finger opens chat and the active state locks during chat.
- Hand-near-chin triggers thinking.
- Thinking orb grows with time and stays large while thinking continues.
- Flying kiss shows “Zaynah loves me yeyeyey 💕”.
