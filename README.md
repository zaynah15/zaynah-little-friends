# Zaynah's Little Friend

A browser camera experience built with React, TypeScript, Vite and MediaPipe.

## Current interactions

- One little friend appears on the right shoulder.
- Neutral / happy / angry / thinking / reading are independent states.
- Thinking is triggered by bringing a hand to the chin.
- Happy / angry / reading use the existing face, hand and book signals.
- Flying kiss: pucker at the mouth, bring a hand to the mouth, then move it away → “Zaynah loves me yeyeyey 💕”.
- Index + middle finger raised with the other fingers folded → summons a cute paper Chinese fan.
- Wave the summoned fan close to the friend → the friend falls off the shoulder onto the bottom of the screen.
- Thumb + index pinch flick near the friend → “Stop it, Zaynah 😭”.
- Open whole-hand downward pat near the friend → “Keep patting me!”.
- Closed hand → grab and drag; release → throw and spring physics.

## Deploy

GitHub → Vercel. Build command: `npm run build`. Output: `dist`.

Camera access requires HTTPS. MediaPipe model files are loaded from the public Google Storage/CDN URLs in `src/vision/mediapipe.ts`.

## Important

The optional book detector is allowed to fail without preventing the main camera experience from starting.
