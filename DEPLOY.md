# GitHub → Vercel deployment

1. Put the contents of this folder at the root of a GitHub repository.
2. Import the repository into Vercel.
3. Framework: Vite (auto-detected).
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. No environment variables are required.
7. Open the deployed HTTPS URL and allow camera access.

The app uses remote MediaPipe model/WASM assets. The first camera start therefore needs internet access. Book detection is optional; if that model cannot load, the hand-based reading gesture still works.
