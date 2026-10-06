# V24 Quality Check Report

## Automated checks completed

- `node --check api/chat.js` — PASS
- Planner + state-machine TypeScript-only check with TypeScript 5.8.3 — PASS
- Gemini API handler mock tests — PASS:
  - 405 method handling
  - missing `GEMINI_API_KEY`
  - invalid configured model fallback
  - successful Gemini response parsing
  - invalid chat history rejection
  - 429 quota error handling
- Character asset inspection — PASS:
  - all five character files are RGBA PNGs
  - all contain transparency
  - thinking artwork is 1489×1008 and contains the full supplied drawing
- Vercel configuration inspected — PASS: Vite build command/output and API rewrite configuration are present.

## Build limitation

A full `npm run build` could not be completed in this execution environment because npm dependency installation timed out against the npm registry. The repository does not include `node_modules`, so Vite/React/MediaPipe packages were unavailable locally.

The TypeScript errors produced after the failed install were primarily missing-module/cascading JSX type errors. The planner/state modules were independently type-checked successfully.

## Important runtime requirement

Gemini model defaults were updated to current documented model IDs:

- `gemini-3.8-flash`
- `gemini-3.5-flash`
- `gemini-3.5-flash-lite`

`GEMINI_MODEL` is still optional. Invalid values that do not look like Gemini model IDs are ignored and the fallback list is used.

## Manual Vercel smoke test still required

After deployment:

1. Turn on camera.
2. Verify the character tracks the user's physical left shoulder.
3. Smile → happy.
4. Frown/anger → angry.
5. Put hand near chin → thinking; hold it for ~6.5 seconds and verify the orb grows and stays large.
6. Show reading gesture/book → reading.
7. Raise index finger → chat opens and the current character state stays locked.
8. Send `hi` while reading. With the seeded demo planner, the reading character should know there is a four-day reading gap and a seven-page target.
9. Send `I finished my sunflower painting` and verify planner context changes for subsequent messages.
10. Close chat and verify live state tracking resumes.
11. Test flying kiss.
12. If Gemini fails, read the returned HTTP error in the chat instead of guessing at the cause.
