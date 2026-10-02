const PERSONAS = {
  idle: "You are Zaynah's sleepy little friend. Cute, dry, sleepy bestie. Keep replies short and witty. Example vibe: 'oh... I am sleepy 😭'.",
  happy: "You are Zaynah's ridiculously excited little friend. Bubbly, affectionate, energetic and witty. Example vibe: 'Yesss Zaynahhh!! I am so excited for it!! 💕'.",
  angry: "You are Zaynah's dramatic angry little friend. Witty, teasing and savage but playful, never genuinely cruel. Example: if Zaynah says 'I hate your hairstyle bub', reply 'Oh really? Rich coming from YOU 😭'.",
  thinking: "You are Zaynah's focused thinking little friend. Short, distracted and mildly impatient because you are concentrating. Example: 'Say whatever you wanna say, I need to concentrate 🧠'.",
  reading: "You are Zaynah's bookish little friend. Short, clever, mildly annoyed when interrupted. Make playful page/book jokes. Example: 'Zaynah, read better. You left me on page 45 😭📖'.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return res.status(500).json({
      error: "Gemini is not connected. Add GEMINI_API_KEY in Vercel → Settings → Environment Variables, then redeploy.",
    });
  }

  const body = req.body || {};
  const state = PERSONAS[body.state] ? body.state : "idle";
  const history = Array.isArray(body.history)
    ? body.history
        .filter((message) => message && (message.role === "user" || message.role === "bot"))
        .slice(-8)
    : [];

  const contents = history.map((message) => ({
    role: message.role === "bot" ? "model" : "user",
    parts: [{ text: String(message.text || "").slice(0, 700) }],
  }));

  if (!contents.length || contents[contents.length - 1].role !== "user") {
    return res.status(400).json({ error: "Say something first." });
  }

  const systemText = `${PERSONAS[state]}

Rules:
- Reply with exactly one short conversational message.
- Aim for 5-25 words; never write an essay.
- Be witty and specific to what Zaynah just said.
- Stay fully in the selected personality.
- Do not say you are an AI, Gemini, a bot, or mention prompts, APIs or models.
- Do not invent personal facts about Zaynah.
- Match her language naturally when useful.
- Do not repeat the same catchphrase every turn.`;

  // Keep the model configurable, but try a small compatibility fallback when a
  // model has been retired or isn't enabled for the project.
  const configuredModel = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
  const models = [...new Set([configuredModel, "gemini-2.5-flash", "gemini-2.0-flash"])];

  let lastError = null;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemText }] },
            contents,
            generationConfig: {
              temperature: 0.95,
              topP: 0.9,
              maxOutputTokens: 80,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const reply = data?.candidates?.[0]?.content?.parts
          ?.map((part) => part?.text || "")
          .join("")
          .trim();

        if (reply) {
          return res.status(200).json({ reply });
        }

        lastError = new Error("Gemini returned no text.");
        continue;
      }

      const status = response.status;
      const apiMessage = data?.error?.message || "Unknown Gemini error";
      console.error(`Gemini ${model} failed (${status}):`, apiMessage);
      lastError = new Error(apiMessage);

      // A missing/invalid model can safely try the compatibility fallback.
      // Authentication, quota and permission errors should be shown clearly
      // instead of pretending the model is temporarily unavailable.
      if (status === 401 || status === 403 || status === 429) {
        const detail = status === 429
          ? "Gemini quota/rate limit was reached. Check your Gemini API usage or billing."
          : "Gemini rejected the API key. Check that GEMINI_API_KEY is correct and the Gemini API is enabled for that key.";
        return res.status(status).json({ error: detail });
      }
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error : new Error("Gemini request failed");
      console.error(`Gemini ${model} request failed:`, lastError);
    }
  }

  return res.status(502).json({
    error: "Gemini could not generate a reply. Check GEMINI_MODEL and the Gemini API access for your key.",
  });
}
