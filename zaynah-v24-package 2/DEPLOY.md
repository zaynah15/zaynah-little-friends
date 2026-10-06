# GitHub → Vercel deployment

1. Put the contents of this folder at the root of a GitHub repository.
2. Import the repository into Vercel.
3. Framework: Vite (auto-detected).
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add `GEMINI_API_KEY` in Vercel → Settings → Environment Variables for **Production**. Set `GEMINI_MODEL` to `gemini-3.8-flash` (or delete it and let the API use its default). After changing variables, **redeploy** so the new values reach the serverless function.
7. Open the deployed HTTPS URL and allow camera access.

The app uses remote MediaPipe model/WASM assets. The first camera start therefore needs internet access. Book detection is optional; if that model cannot load, the hand-based reading gesture still works.


### Gemini troubleshooting

The chat endpoint uses the Gemini REST `generateContent` API. If chat shows a model error, check that `GEMINI_API_KEY` is the actual AI Studio API key (not the project ID), `GEMINI_MODEL` is a model ID such as `gemini-3.8-flash`, and the latest Vercel deployment contains the environment-variable change.
