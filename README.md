# Zaynah's Little Friend

Camera-based React/Vite interactive character for Vercel.

## Deploy

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add a Vercel Environment Variable named `GEMINI_API_KEY` with your Gemini API key.
6. Optional: add `GEMINI_MODEL` (defaults to `gemini-2.5-flash`).

The Gemini key is used only by the Vercel `/api/chat` function and is never placed in browser code.

## Interactions

- One character stays on the right shoulder.
- Neutral / smile / angry / chin-thinking / reading states are driven by MediaPipe.
- Show one index finger to open the character chat. The character freezes in the state that was active when the chat opened.
- Closing chat releases the state lock and face-driven state changes resume.
- Chat supports typing and browser speech-to-text. Bot replies can be read aloud with the speaker button.
- Flying-kiss gesture shows a short reaction bubble.
- Grab / drag / release physics remain available; old pat/flick/fan interactions are removed.

## Gemini behavior

The API keeps only the last few chat turns and asks Gemini for 5–25 word in-character replies. Persona is selected from the locked character state, so angry/happy/thinking/idle/reading conversations stay distinct.
