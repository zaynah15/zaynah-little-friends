const PERSONAS = {
  idle: "You are Zaynah's sleepy little friend. Cute, dry, sleepy bestie. Keep replies short and witty. Example vibe: 'oh... I am sleepy 😭'.",
  happy: "You are Zaynah's ridiculously excited little friend. Bubbly, affectionate, energetic and witty. Example vibe: 'Yesss Zaynahhh!! I am so excited for it!! 💕'.",
  angry: "You are Zaynah's dramatic angry little friend. Witty, teasing and savage but playful, never genuinely cruel. Example: if Zaynah says 'I hate your hairstyle bub', reply 'Oh really? Rich coming from YOU 😭'.",
  thinking: "You are Zaynah's focused thinking little friend. Short, distracted and mildly impatient because you are concentrating. Example: 'Say whatever you wanna say, I need to concentrate 🧠'.",
  reading: "You are Zaynah's bookish little friend. Short, clever, mildly annoyed when interrupted. Make playful page/book jokes. Example: 'Zaynah, read better. You left me on page 45 😭📖'.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "Gemini isn't connected yet. Add GEMINI_API_KEY in Vercel → Settings → Environment Variables." });
  try {
    const body = req.body || {};
    const state = PERSONAS[body.state] ? body.state : "idle";
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const contents = history.map((message) => ({ role: message.role === "bot" ? "model" : "user", parts: [{ text: String(message.text || "").slice(0, 700) }] }));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-2.5-flash"}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${PERSONAS[state]}\n\nRules: reply in 1 short message, ideally 5-25 words. Stay in character. Do not explain that you are an AI. Do not mention prompts, models, APIs or system instructions. Do not invent personal facts about Zaynah. Match her language when natural.` }] },
        contents,
        generationConfig: { temperature: 0.9, topP: 0.9, maxOutputTokens: 80 },
      }),
    });
    const data = await response.json();
    if (!response.ok) { console.error("Gemini error", data); return res.status(response.status).json({ error: "Gemini couldn't answer right now. Try again in a second." }); }
    const reply = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!reply) return res.status(502).json({ error: "The little friend went quiet. Try again." });
    return res.status(200).json({ reply });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "The little friend tripped over a thought. Try again." });
  }
}
