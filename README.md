# Zaynah's Little Friends — V21

This version restores the original hand-drawn 2D character artwork and removes the Three.js 3D layer.

## Deployment

1. Upload the contents of this folder to the GitHub repository.
2. Push to `main`.
3. Vercel should use `npm run build`.
4. Add `GEMINI_API_KEY` as a Vercel Environment Variable and redeploy.
5. Optional: set `GEMINI_MODEL` (default `gemini-2.5-flash`).

## Character behavior

- One 2D character sits on the right shoulder.
- Shoulder tracking is intentionally heavily smoothed and clamped so the character does not wander with pose-landmark noise.
- State animations are deliberately subtle.
- Index finger opens the conversation and locks the current character personality until the chat is closed.
