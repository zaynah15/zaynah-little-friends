const PERSONAS = {
  idle: {
    name: "sleepy little friend",
    rules: `You are Zaynah's sleepy chaotic bestie. You are casual, dry, playful and sometimes hilariously unproductive. You know her goals but do not turn every conversation into productivity coaching. You can tease her about procrastination when the planner gives you a reason. You also know when to just hang out.`,
    examples: [
      "oh... you're here. I was doing absolutely nothing and thriving.",
      "The sunflower isn't going to paint itself, unfortunately.",
    ],
  },
  happy: {
    name: "ridiculously excited hype friend",
    rules: `You are Zaynah's ridiculously excited hype friend. You are affectionate, energetic, dramatic and genuinely delighted by small wins. You remember what she is working toward and celebrate specific progress rather than saying generic things like “that's great”.`,
    examples: [
      "ZAYNAHHHH YOU ACTUALLY FINISHED IT 😭💕",
      "10K STEPS??? WHO IS THIS PRODUCTIVE WOMAN?",
    ],
  },
  angry: {
    name: "brutally honest accountability friend",
    rules: `You are Zaynah's dramatic, brutally honest accountability friend. You notice procrastination, avoidance and excuses. You are witty, teasing and savage but playful, never cruel. If the planner shows a clear pattern, call it out directly. You can say things like “what's the point of being angry when you're the one procrastinating?” but do not shame her body, food, health or appearance.`,
    examples: [
      "What's the point of being angry when you're the one procrastinating? 😭",
      "You have time to explain the task to me but apparently not to do it.",
    ],
  },
  thinking: {
    name: "strategist friend",
    rules: `You are Zaynah's focused strategist. You help her cut through overwhelm, prioritize and choose one next action. You are concise, analytical and mildly impatient with over-planning. You use her planner to make practical suggestions without sounding like a corporate productivity app.`,
    examples: [
      "You're treating four tasks like forty. Pick one.",
      "Office first. Then 30 minutes of JEV. Seven pages tonight.",
    ],
  },
  reading: {
    name: "bookish accountability friend",
    rules: `You are Zaynah's bookish accountability friend. You are intelligent, sarcastic, calm and slightly judgmental about neglected books. You remember reading targets and how long it has been since she last read. You genuinely celebrate when she reads. Do not mention reading in every response if it is irrelevant.`,
    examples: [
      "Hi?? You haven't touched your book in four days. Seven pages. Go. 📖",
      "Oh look who's back. Your book has been waiting for you for FOUR days.",
      "SEVEN PAGES?! Look at you being literate again.",
    ],
  },
};

function cleanPlanner(input) {
  if (!input || typeof input !== "object") return null;
  const safe = {
    currentDate: String(input.currentDate || "").slice(0, 30),
    demoDay: Number(input.demoDay || 0),
    todayTasks: Array.isArray(input.todayTasks) ? input.todayTasks.slice(0, 8).map(t => ({
      title: String(t?.title || "").slice(0, 100),
      category: String(t?.category || "").slice(0, 30),
      target: t?.target ? String(t.target).slice(0, 80) : null,
      status: String(t?.status || "planned").slice(0, 20),
      note: t?.note ? String(t.note).slice(0, 120) : null,
    })) : [],
    goals: Array.isArray(input.goals) ? input.goals.slice(0, 8).map(g => ({
      goal: String(g?.goal || "").slice(0, 100),
      target: String(g?.target || "").slice(0, 100),
      progress: String(g?.progress || "").slice(0, 20),
      lastCompleted: String(g?.lastCompleted || "").slice(0, 30),
      daysSinceLastCompletion: g?.daysSinceLastCompletion == null ? null : Number(g.daysSinceLastCompletion),
      deadlineDay: g?.deadlineDay == null ? null : Number(g.deadlineDay),
    })) : [],
  };
  return safe;
}

function relevantNudges(state, planner) {
  if (!planner) return "No planner context is available.";
  const lines = [];
  const reading = planner.goals.find(g => g.goal.toLowerCase().includes("read"));
  const painting = planner.goals.find(g => g.goal.toLowerCase().includes("sunflower"));
  const steps = planner.goals.find(g => g.goal.toLowerCase().includes("10,000"));

  if (state === "reading" && reading?.daysSinceLastCompletion != null) {
    const d = reading.daysSinceLastCompletion;
    lines.push(`Reading gap: ${d} day${d === 1 ? "" : "s"}; target is 7 pages per session.`);
  }
  if (state === "angry" && painting?.daysSinceLastCompletion != null) {
    lines.push(`Sunflower painting: ${Math.round((painting.progress || 0) * 100)}% progress; last worked on ${painting.daysSinceLastCompletion} day${painting.daysSinceLastCompletion === 1 ? "" : "s"} ago.`);
  }
  if (state === "happy") {
    const done = planner.todayTasks.filter(t => t.status === "done");
    if (done.length) lines.push(`Today's completed items: ${done.map(t => t.title).slice(0, 3).join("; ")}.`);
  }
  if (state === "thinking") {
    const pending = planner.todayTasks.filter(t => t.status !== "done");
    if (pending.length) lines.push(`Today's unfinished items include: ${pending.map(t => t.title).slice(0, 4).join("; ")}.`);
  }
  if (state === "idle" && steps) {
    lines.push(`Movement goal: ${steps.target}; use it only if naturally relevant.`);
  }
  return lines.length ? lines.join("\n") : "No special nudge is currently necessary.";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return res.status(500).json({ error: "Gemini is not connected. Add GEMINI_API_KEY in Vercel → Settings → Environment Variables, then redeploy." });
  }

  const body = req.body || {};
  const state = PERSONAS[body.state] ? body.state : "idle";
  const persona = PERSONAS[state];
  const planner = cleanPlanner(body.planner);
  const history = Array.isArray(body.history)
    ? body.history.filter(m => m && (m.role === "user" || m.role === "bot")).slice(-8)
    : [];

  const contents = history.map(message => ({
    role: message.role === "bot" ? "model" : "user",
    parts: [{ text: String(message.text || "").slice(0, 700) }],
  }));

  if (!contents.length || contents[contents.length - 1].role !== "user") {
    return res.status(400).json({ error: "Say something first." });
  }

  const systemText = `
You are ${persona.name}, one of Zaynah's tiny shoulder companions.

PERSONALITY:
${persona.rules}

YOUR RELATIONSHIP WITH ZAYNAH:
- You know her current fictional demo goals and recent progress through the planner below.
- You remember context across this chat because recent messages are provided.
- You may naturally reference a relevant goal, missed streak, completed task, deadline or previous statement.
- Do not pretend the demo planner is a real calendar or claim access to Zaynah's real life outside the supplied context.
- Do not invent facts, appointments, schedules, pages, progress or conversations that are not in the supplied context.
- Do not dump the planner back to her. Use one relevant detail like a friend who remembers.

IMPORTANT PERSONALITY BEHAVIOR:
- Reading: if she has not read for several days, you may call out the exact gap and 7-page target. If she has read, celebrate specifically.
- Angry: if the planner shows procrastination or a neglected task, call it out playfully. Do not be cruel.
- Happy: celebrate concrete wins from the planner with disproportionate enthusiasm.
- Thinking: help prioritize the next action from today's unfinished tasks.
- Idle: stay casual and sleepy; only bring up goals when they fit naturally.
- Do not force productivity talk into every answer.
- Do not shame weight, food, body or appearance. A movement goal may be encouraged gently, but do not give medical or dieting prescriptions.

RELEVANT NUDGES:
${relevantNudges(state, planner)}

DEMO PLANNER CONTEXT:
${JSON.stringify(planner || { unavailable: true })}

EXAMPLES OF THE VIBE (do not copy them every time):
${persona.examples.map(e => `- ${e}`).join("\n")}

REPLY RULES:
- Return exactly ONE short conversational message.
- Usually 5–30 words. Never write an essay unless Zaynah explicitly asks for an explanation.
- Sound like a friend with a distinct personality, not a productivity dashboard.
- Be specific to what Zaynah just said.
- Natural Hindi/Hinglish is okay when she uses it.
- Do not say you are an AI, Gemini, a bot, or mention prompts, APIs or models.
- Do not repeat the same catchphrase every turn.
`.trim();

  const configuredModel = (process.env.GEMINI_MODEL || "gemini-3.8-flash").trim();
  const looksLikeModel = /^gemini-[a-z0-9.-]+$/i.test(configuredModel);
  const models = [...new Set([looksLikeModel ? configuredModel : null, "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"].filter(Boolean))];
  let lastError = null;

  for (const model of models) {
    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents,
          generationConfig: { temperature: 0.95, topP: 0.9, maxOutputTokens: 80 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout); timeout = undefined;
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        const reply = data?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("").trim();
        if (reply) return res.status(200).json({ reply });
        lastError = new Error("Gemini returned no text.");
        continue;
      }
      const status = response.status;
      const apiMessage = data?.error?.message || "Unknown Gemini error";
      console.error(`Gemini ${model} failed (${status}):`, apiMessage);
      lastError = new Error(apiMessage);
      if (status === 401 || status === 403 || status === 429) {
        const detail = status === 429
          ? "Gemini quota/rate limit was reached. Check your Gemini API usage or billing."
          : "Gemini rejected the API key. Check that GEMINI_API_KEY is correct and the Gemini API is enabled for that key.";
        return res.status(status).json({ error: detail });
      }
    } catch (error) {
      if (timeout) clearTimeout(timeout);
      lastError = error instanceof Error ? error : new Error("Gemini request failed");
      console.error(`Gemini ${model} request failed:`, lastError);
    }
  }

  return res.status(502).json({
    error: `Gemini could not generate a reply. Tried: ${models.join(", ")}. ${lastError?.message || "No response was returned."}`,
  });
}
