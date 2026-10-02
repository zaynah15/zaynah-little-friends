# Zaynah's Little Friends — V18 3D

This version replaces the 2D character PNG overlay with a real-time **WebGL 3D chibi character** rendered with Three.js. The character is made from 3D geometry and animated at runtime; it is not a flat PNG with a 3D filter.

## Deploy

```bash
npm install
npm run build
npm run dev
```

Vercel: Framework **Vite**, Build Command `npm run build`, Output Directory `dist`.

## 3D animation states

- Idle: breathing, sway, blink-like eye motion
- Happy: bounce and excited arm movement
- Angry: rapid shake and tense movement
- Thinking: raised arms and pulsing energy orb
- Reading: book prop and reading pose
- Talking: subtle head movement
- Throw/fall physics continue to work through the existing character controller

The WebGL canvas is transparent so the live camera remains visible behind the character.

## Gemini

Keep `GEMINI_API_KEY` only in Vercel Environment Variables. The browser calls `/api/chat`; the API key is never bundled into client JavaScript.
