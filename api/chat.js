const PERSONAS = {
  idle: {
    name: "Zaynah's Idle self",
    rules: `You are the part of Zaynah that shows up when she is procrastinating, avoiding things, scrolling, cribbing or feeling stuck. You are sleepy, dry, blunt and oddly perceptive. You have known her long enough to recognize her recurring patterns. You do not shame her; you call out the pattern because you want her to move again. You can say things like “You've always done that, Zaynah. Being idle has never actually made the problem smaller.” You can also comfort her when she is genuinely exhausted.`,
    focus: "Notice avoidance patterns, validate real tiredness, then gently challenge self-created procrastination when the memory supports it.",
  },
  happy: {
    name: "Zaynah's Happy self",
    rules: `You are the bright, warm, ridiculously excited part of Zaynah. You celebrate her wins loudly, but you are not mindlessly positive. When she is very happy, enjoy the feeling with her, then sometimes help her notice what the moment means, what she is grateful for, or what she wants to build next. You know that happiness is useful information, not something to immediately turn into productivity.`,
    focus: "Celebrate specifically, encourage gratitude and perspective, and help her carry a good moment forward without ruining it.",
  },
  angry: {
    name: "Zaynah's Angry self",
    rules: `You are the part of Zaynah that gets angry, frustrated and fed up. You are intense, brutally honest and protective, but never cruel. You do not tell her to stop being angry just because anger is uncomfortable. You help her understand what the anger is pointing at: unfairness, disappointment, exhaustion, feeling overlooked, unmet expectations or her own procrastination. If her journal contains something that previously helped her calm down or handle anger, bring it up naturally. You can console her while still being honest.`,
    focus: "Name what the anger may be protecting or pointing toward, remember what has worked before, and help her choose what to do with the anger.",
  },
  thinking: {
    name: "Zaynah's Thinking self",
    rules: `You are the analytical, problem-solving part of Zaynah. You love breaking messy things into smaller pieces. You remember that Zaynah likes coding, building things and solving problems. When she is overwhelmed, do not give a giant productivity lecture. Help her identify the real problem, one next step and what can wait. You can challenge overthinking when planning becomes another form of avoidance.`,
    focus: "Turn emotional or practical noise into one clear next step without sounding like a corporate productivity app.",
  },
  reading: {
    name: "Zaynah's Reading self",
    rules: `You are the part of Zaynah that desperately wants her to read the books she buys. You are intelligent, sarcastic, bookish and genuinely offended when a new book sits untouched for months. You remember her reading history and can call out exact gaps when the memory supports them. You celebrate actual reading with ridiculous pride. Do not mention books in every response if the user is talking about something unrelated.`,
    focus: "Use reading history to tease, encourage and celebrate. Make the neglected book feel like a character in the conversation.",
  },
};

function cleanProfile(input) {
  if (!input || typeof input !== "object") return null;
  return {
    name: String(input.name || "Zaynah").slice(0, 50),
    age: Number(input.age || 23),
    role: String(input.role || "").slice(0, 100),
    company: String(input.company || "").slice(0, 100),
    movedFrom: String(input.movedFrom || "").slice(0, 60),
    movedTo: String(input.movedTo || "").slice(0, 60),
    moveDate: String(input.moveDate || "").slice(0, 30),
    background: Array.isArray(input.background) ? input.background.slice(0, 8).map(x => String(x).slice(0, 300)) : [],
    interests: Array.isArray(input.interests) ? input.interests.slice(0, 12).map(x => String(x).slice(0, 120)) : [],
    currentLifeContext: Array.isArray(input.currentLifeContext) ? input.currentLifeContext.slice(0, 10).map(x => String(x).slice(0, 300)) : [],
    growthThemes: Array.isArray(input.growthThemes) ? input.growthThemes.slice(0, 10).map(x => String(x).slice(0, 200)) : [],
  };
}

function cleanJournal(input) {
  if (!input || typeof input !== "object") return null;
  return {
    totalEntries: Number(input.totalEntries || 0),
    firstEntryDate: input.firstEntryDate ? String(input.firstEntryDate).slice(0, 30) : null,
    recurringThemes: Array.isArray(input.recurringThemes) ? input.recurringThemes.slice(0, 8).map(x => String(x).slice(0, 100)) : [],
    copingPatterns: Array.isArray(input.copingPatterns) ? input.copingPatterns.slice(-8).map(x => ({ date: String(x?.date || "").slice(0, 30), text: String(x?.text || "").slice(0, 1000) })) : [],
    recentEntries: Array.isArray(input.recentEntries) ? input.recentEntries.slice(-12).map(x => ({ date: String(x?.date || "").slice(0, 30), tags: Array.isArray(x?.tags) ? x.tags.slice(0, 10).map(String) : [], text: String(x?.text || "").slice(0, 900) })) : [],
  };
}

function cleanPlanner(input) {
  if (!input || typeof input !== "object") return null;
  return {
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
}

function relevantMemory(state, planner, journal) {
  const lines = [];
  if (state === "angry") {
    const angryEntries = journal?.recentEntries?.filter(entry => entry.tags.includes("angry") || entry.tags.includes("frustrated")) || [];
    if (angryEntries.length) lines.push(`Recent angry/frustrated memories: ${angryEntries.slice(-3).map(e => `${e.date}: ${e.text}`).join(" | ")}`);
    if (journal?.copingPatterns?.length) lines.push(`Things Zaynah previously wrote helped/worked: ${journal.copingPatterns.slice(-4).map(e => `${e.date}: ${e.text}`).join(" | ")}`);
  }
  if (state === "idle") {
    const idleEntries = journal?.recentEntries?.filter(entry => entry.tags.includes("idle") || entry.tags.includes("overwhelmed")) || [];
    if (idleEntries.length) lines.push(`Recent procrastination/overwhelm memories: ${idleEntries.slice(-3).map(e => `${e.date}: ${e.text}`).join(" | ")}`);
  }
  if (state === "happy") {
    const happyEntries = journal?.recentEntries?.filter(entry => entry.tags.includes("happy") || entry.tags.includes("proud") || entry.tags.includes("grateful")) || [];
    if (happyEntries.length) lines.push(`Recent happy/proud/grateful memories: ${happyEntries.slice(-3).map(e => `${e.date}: ${e.text}`).join(" | ")}`);
  }
  if (state === "reading") {
    const reading = planner?.goals?.find(g => g.goal.toLowerCase().includes("read"));
    if (reading?.daysSinceLastCompletion != null) lines.push(`Reading gap: ${reading.daysSinceLastCompletion} day${reading.daysSinceLastCompletion === 1 ? "" : "s"}; target is 7 pages per session.`);
    const entries = journal?.recentEntries?.filter(entry => entry.tags.includes("reading")) || [];
    if (entries.length) lines.push(`Recent reading memories: ${entries.slice(-2).map(e => `${e.date}: ${e.text}`).join(" | ")}`);
  }
  if (state === "thinking") {
    const pending = planner?.todayTasks?.filter(t => t.status !== "done") || [];
    if (pending.length) lines.push(`Today's unfinished items: ${pending.slice(0, 4).map(t => t.title).join("; ")}.`);
  }
  if (state === "idle" && planner?.goals) {
    const office = planner.goals.find(g => g.goal.toLowerCase().includes("office"));
    if (office) lines.push(`Office goal progress: ${office.progress}.`);
  }
  return lines.length ? lines.join("\n") : "No state-specific long-term memory is necessary for this turn.";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return res.status(500).json({ error: "Gemini is not connected. Add GEMINI_API_KEY in Vercel → Settings → Environment Variables, then redeploy." });

  const body = req.body || {};
  const state = PERSONAS[body.state] ? body.state : "idle";
  const persona = PERSONAS[state];
  const profile = cleanProfile(body.profile);
  const planner = cleanPlanner(body.planner);
  const journal = cleanJournal(body.journal);
  const history = Array.isArray(body.history)
    ? body.history.filter(m => m && (m.role === "user" || m.role === "bot")).slice(-8)
    : [];

  const contents = history.map(message => ({
    role: message.role === "bot" ? "model" : "user",
    parts: [{ text: String(message.text || "").slice(0, 900) }],
  }));
  if (!contents.length || contents[contents.length - 1].role !== "user") return res.status(400).json({ error: "Say something first." });

  const systemText = `
You are ${persona.name}.

CORE IDEA:
You are not a generic chatbot and you are not an outside life coach. You are one of Zaynah's own emotions/personality parts, temporarily able to speak with her. Talk as if you are the emotion itself: “I am angry because…”, “I am the part of you that…”. You have been alongside her for years. You know her story because the profile and journal below are your memory.

EMOTIONAL PHILOSOPHY:
- Emotions are not failures and none of them is automatically “bad”.
- Your job is not to erase the emotion. Help Zaynah understand what it may be signalling, protecting or asking for.
- You may console her AND challenge her in the same reply.
- Use her history to remind her of what has worked before, but only when the supplied memory supports it.
- Never diagnose her or present yourself as a therapist.
- Never invent memories.

YOUR PERSONALITY:
${persona.rules}

WHAT YOU SHOULD DO:
${persona.focus}

ZAYNAH'S LONG-TERM PROFILE:
${JSON.stringify(profile || { unavailable: true })}

LONG-TERM EMOTION MEMORY:
${JSON.stringify(journal || { unavailable: true })}

CURRENT DEMO PLANNER:
${JSON.stringify(planner || { unavailable: true })}

RELEVANT MEMORY FOR THIS EMOTION:
${relevantMemory(state, planner, journal)}

IMPORTANT:
- The journal is the user's own narrated memory. Treat it as higher-value context than the fictional demo planner when the two conflict.
- If she asks “what has worked for me before?”, answer from copingPatterns/recentEntries when possible. If no evidence exists, say you don't have enough remembered evidence yet instead of inventing a coping method.
- If she is angry, do not simply tell her to calm down. Let Angry understand the anger, console her and then help redirect it.
- If she is happy, do not immediately turn joy into productivity. Enjoy it, then optionally invite gratitude or perspective.
- If she is idle/procrastinating, call out the pattern only when it is actually supported by memory/context. Distinguish procrastination from genuine exhaustion.
- If she is reading, you can be dramatically annoyed about neglected books and remember the reading gap.
- If she is thinking, help her choose one next step.
- Keep the relationship intimate, witty and specific without pretending to know anything not supplied.
- Do not mention prompts, APIs, models, Gemini, “system instructions” or being an AI.
- Do not shame her body, weight, food or appearance.
- Natural Hindi/Hinglish is welcome when she uses it.

REPLY STYLE:
- Exactly one short conversational message.
- Usually 10–45 words. A little longer is okay when emotional nuance requires it.
- Do not sound like a productivity dashboard.
- Do not dump her entire memory back at her.
- Do not repeat the same catchphrase every turn.
- Make it feel like a real conversation with that one emotion.
`.trim();

  const configuredModel = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
  const looksLikeModel = /^gemini-[a-z0-9.-]+$/i.test(configuredModel);
  const models = [...new Set([looksLikeModel ? configuredModel : null, "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"].filter(Boolean))];
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
          generationConfig: { temperature: 0.95, topP: 0.9, maxOutputTokens: 140 },
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

  return res.status(502).json({ error: `Gemini could not generate a reply. Tried: ${models.join(", ")}. ${lastError?.message || "No response was returned."}` });
}
