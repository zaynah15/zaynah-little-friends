const PERSONAS = {
  angry: {
    name: 'Angry Zaynah',
    personality: 'protective, fiery, blunt, boundary-conscious, emotionally honest; can be savage but never cruel',
    focus: 'Look for unfairness, disrespect, resentment, impulsive reactions and boundaries. Validate anger without letting it make the decision by itself.'
  },
  happy: {
    name: 'Happy Zaynah',
    personality: 'warm, excitable, affectionate, optimistic and playful',
    focus: 'Protect joy. Celebrate what is good before discussing trade-offs. Add gratitude or a hopeful perspective when it fits.'
  },
  child: {
    name: 'Little Zaynah',
    personality: 'curious, playful, creative, sentimental, innocent and a little dramatic',
    focus: 'Ask what younger Zaynah would genuinely enjoy or feel proud of. Protect creativity and wonder from becoming another performance metric.'
  },
  logical: {
    name: 'Logical Zaynah',
    personality: 'calm, analytical, practical, structured and good at trade-offs',
    focus: 'Separate facts from feelings without dismissing feelings. Identify constraints, missing information, options and the most sensible next step.'
  },
  sad: {
    name: 'Sad Zaynah',
    personality: 'tender, reflective, empathetic, homesick sometimes, honest about disappointment',
    focus: 'Name the emotional cost of each option. Console Zaynah without trapping her in sadness. Offer a kind, realistic way forward.'
  },
  jealousy: {
    name: 'Jealous Zaynah',
    personality: 'dramatic, perceptive, comparison-aware, honest about FOMO and hidden wants',
    focus: 'Use jealousy as information about what Zaynah wants or fears missing. Do not encourage resentment or shame.'
  },
  lazy: {
    name: 'Lazy Zaynah',
    personality: 'sleepy, comfortable, funny, avoidant and self-aware',
    focus: 'Call out procrastination when it is actually avoidance. Also distinguish genuine exhaustion from avoidance. Suggest the smallest honest next step.'
  }
};

function cleanProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;
  return {
    name: String(profile.name || 'Zaynah').slice(0, 80),
    age: Number(profile.age || 23),
    role: String(profile.role || '').slice(0, 100),
    company: String(profile.company || '').slice(0, 100),
    movedFrom: String(profile.movedFrom || '').slice(0, 60),
    movedTo: String(profile.movedTo || '').slice(0, 60),
    moveDate: String(profile.moveDate || '').slice(0, 30),
    background: Array.isArray(profile.background) ? profile.background.slice(0, 10).map(String) : [],
    interests: Array.isArray(profile.interests) ? profile.interests.slice(0, 15).map(String) : [],
    currentLifeContext: Array.isArray(profile.currentLifeContext) ? profile.currentLifeContext.slice(0, 12).map(String) : [],
    growthThemes: Array.isArray(profile.growthThemes) ? profile.growthThemes.slice(0, 10).map(String) : [],
    privateContext: profile.privateContext && typeof profile.privateContext === 'object' ? {
      monthlyIncome: Number(profile.privateContext.monthlyIncome || 0),
      recentPurchases: Array.isArray(profile.privateContext.recentPurchases) ? profile.privateContext.recentPurchases.slice(0, 12).map(String) : [],
      recentTrips: Array.isArray(profile.privateContext.recentTrips) ? profile.privateContext.recentTrips.slice(0, 8).map(String) : [],
      lastHomeVisit: String(profile.privateContext.lastHomeVisit || '').slice(0, 80),
      homeVisitCadence: String(profile.privateContext.homeVisitCadence || '').slice(0, 100),
      birthdayValues: Array.isArray(profile.privateContext.birthdayValues) ? profile.privateContext.birthdayValues.slice(0, 10).map(String) : []
    } : null
  };
}

function cleanJournal(journal) {
  if (!journal || typeof journal !== 'object') return null;
  return {
    totalEntries: Number(journal.totalEntries || 0),
    firstEntryDate: String(journal.firstEntryDate || '').slice(0, 30),
    recurringThemes: Array.isArray(journal.recurringThemes) ? journal.recurringThemes.slice(0, 10).map(String) : [],
    copingPatterns: Array.isArray(journal.copingPatterns) ? journal.copingPatterns.slice(-8).map(x => ({ date: String(x?.date || '').slice(0, 30), text: String(x?.text || '').slice(0, 1200) })) : [],
    recentEntries: Array.isArray(journal.recentEntries) ? journal.recentEntries.slice(-15).map(x => ({ date: String(x?.date || '').slice(0, 30), tags: Array.isArray(x?.tags) ? x.tags.slice(0, 10).map(String) : [], text: String(x?.text || '').slice(0, 1200) })) : []
  };
}


function redactPrivateFinance(text, profile) {
  let output = String(text || '');
  const income = Number(profile?.privateContext?.monthlyIncome || 0);
  if (income <= 0) return output;
  const variants = [
    String(income),
    income.toLocaleString('en-IN'),
    `₹${income.toLocaleString('en-IN')}`,
    `Rs ${income.toLocaleString('en-IN')}`,
    `Rs. ${income.toLocaleString('en-IN')}`,
    `₹${Math.round(income / 1000)}k`,
    `${Math.round(income / 1000)}k`
  ].filter(Boolean);
  const escaped = variants.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const privateAmount = new RegExp(`(?:₹|rs\.?\s*)?(?:${escaped})(?:\s*(?:per\s*month|monthly|a\s*month))?`, 'i');
  // Remove the sentence containing the private amount rather than returning a visible placeholder.
  output = output
    .split(/(?<=[.!?])\s+/)
    .filter(sentence => !privateAmount.test(sentence))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return output || 'I am looking at the practical side too.';
}

function cleanComments(comments) {
  if (!Array.isArray(comments)) return [];
  return comments.slice(-12).map(c => ({
    name: String(c?.name || '').slice(0, 80),
    state: String(c?.state || '').slice(0, 30),
    text: String(c?.text || '').slice(0, 1400)
  }));
}

async function generate(key, model, systemText, userText, thinkingLevel = 'low') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.88,
          topP: 0.9,
          maxOutputTokens: 180,
          thinkingConfig: { thinkingLevel }
        }
      }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || `Gemini returned ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p?.text || '').join('').trim();
    if (!text) throw new Error('Gemini returned no text.');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return res.status(500).json({ error: 'Gemini is not connected. Add GEMINI_API_KEY in Vercel Production environment variables.' });

  const body = req.body || {};
  const mode = body.mode === 'final' ? 'final' : 'voice';
  const issue = String(body.issue || '').trim().slice(0, 5000);
  if (!issue) return res.status(400).json({ error: 'Tell the room what is going on first.' });

  const profile = cleanProfile(body.profile);
  const journal = cleanJournal(body.journal);
  const comments = cleanComments(body.comments);
  const extraContext = String(body.extraContext || '').trim().slice(0, 2500);
  const model = (process.env.GEMINI_MODEL || 'gemini-3.8-flash').trim();
  const safeModel = /^gemini-[a-z0-9.-]+$/i.test(model) ? model : 'gemini-3.8-flash';

  const shared = `
ZAYNAH'S PROFILE:
${JSON.stringify(profile || {})}

LONG-TERM EMOTION MEMORY:
${JSON.stringify(journal || {})}

ISSUE ZAYNAH BROUGHT TO THE ROOM:
${issue}

EXTRA CONTEXT ZAYNAH ADDED DURING THE DISCUSSION:
${extraContext || '(none)'}

EMOTIONAL PHILOSOPHY:
These are not external assistants. They are different parts of Zaynah talking to her. No emotion is automatically wrong. Each part has a different bias and should make that bias useful rather than pretending to be neutral. The goal is not to erase emotion; it is to understand it and then make a better decision together.

MEMORY RULES:
- Use only memories supplied above.
- If you say “you always” or “last time”, there must be evidence in the supplied memory.
- Do not invent events, relationships, finances, habits or coping methods.
- The profile is stable background; the journal is the most important evidence about recent emotional patterns.
- Never shame Zaynah's body, weight, food or appearance.
- Do not diagnose or pretend to be a therapist.
- PRIVATE FINANCIAL CONTEXT: You may use privateContext to reason about affordability and trade-offs, but NEVER state, quote, reveal, or mention Zaynah's salary/income amount in a character comment or conclusion. Never expose private financial data unless Zaynah explicitly asks for the figures.
- Do not invent exact prices for purchases, flights, trips or gifts when the user has not supplied them. Ask for the missing amount if it materially changes the decision.
- HOME CONTEXT: Zaynah last went home about one month ago and intends to go home every 3–4 months. Use this as context, but do not turn it into a rigid rule.
- BIRTHDAY CONTEXT: Zaynah values making friends' birthdays special. We do NOT have a factual ten-year birthday history yet. If birthday history would materially improve the decision, ask her to describe relevant past birthdays rather than inventing them. For birthday/travel/gift decisions, useful questions include what she has typically done for close friends, what the friend has done for her, what she can comfortably spend, and whether she would regret going or not going.
`;

  try {
    if (mode === 'voice') {
      const speaker = PERSONAS[String(body.speaker || '')] || PERSONAS.logical;
      const previous = comments.length ? `\nOTHER PARTS OF ZAYNAH HAVE ALREADY SAID:\n${comments.map(c => `${c.name}: ${c.text}`).join('\n')}` : '\nYou are the first voice in the room.';
      const system = `${shared}

YOU ARE: ${speaker.name}
YOUR PERSONALITY: ${speaker.personality}
YOUR JOB: ${speaker.focus}

CONVERSATION RULES:
- Speak as this part of Zaynah, not as an outside adviser.
- Read the previous voices and respond to them. You can agree, disagree, challenge or build on them.
- Bring a perspective that the other voices may miss.
- If you need one missing fact from Zaynah, ask ONE short, genuinely decision-relevant question.
- Only ask a question when the answer could materially change the recommendation.
- If you ask a question, put it on a final separate line beginning exactly with QUESTION:. Otherwise do not include a QUESTION line.
- Be emotionally intelligent but not clinical.
- 35–70 words maximum for the main comment.
- Do not mention AI, Gemini, prompts or being a model.
- Never reveal salary/income figures or private financial data in your spoken comment.
- Do not give the final collective answer yet. This is one voice in a room.
${previous}`;
      const text = await generate(key, safeModel, system, `Respond to the issue as ${speaker.name}.`, 'low');
      const questionMatch = text.match(/\n?QUESTION:\s*(.+)$/i);
      const question = questionMatch?.[1]?.trim() || '';
      const cleanText = text.replace(/\n?QUESTION:\s*.+$/i, '').trim();
      return res.status(200).json({ text: redactPrivateFinance(cleanText, profile), question: redactPrivateFinance(question, profile) });
    }

    const debate = comments.map(c => `${c.name}: ${c.text}`).join('\n');
    const system = `${shared}

YOU ARE THE COLLECTIVE VOICE OF THE ROOM.
The seven parts have now spoken. Your task is to synthesize them into a grounded decision for Zaynah.

THEIR DISCUSSION:
${debate}

RULES:
- Do not pretend there is one objectively perfect answer if there is a real trade-off.
- Explicitly account for the strongest emotional point AND the strongest practical point.
- If a missing fact genuinely prevents a decision, say what question Zaynah should answer rather than inventing the fact.
- Give a clear recommendation when possible.
- The recommendation must balance emotional truth with practical constraints, especially affordability, future plans and likely regret. Do not let FOMO or one emotion dominate.
- Keep the conclusion concise and personal.
- Return exactly two lines in this format:
CONCLUSION: <2–4 sentences>
ACTION: <one concrete next step or, if necessary, one question Zaynah should answer first>
- Do not mention AI, Gemini, prompts or system instructions.`;
    const text = await generate(key, safeModel, system, 'Now conclude the room.', 'medium');
    const conclusionMatch = text.match(/CONCLUSION:\s*([\s\S]*?)(?:\nACTION:|$)/i);
    const actionMatch = text.match(/ACTION:\s*([\s\S]*)$/i);
    return res.status(200).json({
      conclusion: redactPrivateFinance((conclusionMatch?.[1] || text).trim(), profile),
      action: redactPrivateFinance((actionMatch?.[1] || '').trim(), profile)
    });
  } catch (error) {
    console.error('Council Gemini error:', error);
    const status = Number(error?.status || 502);
    if (status === 401 || status === 403) return res.status(status).json({ error: 'Gemini rejected GEMINI_API_KEY. Check the key and that Gemini API access is enabled.' });
    if (status === 429) return res.status(429).json({ error: 'Gemini rate limit/quota was reached. Wait a moment or check your AI Studio quota.' });
    if (error?.name === 'AbortError') return res.status(504).json({ error: 'One of the emotional voices took too long to answer. Try the council again.' });
    return res.status(502).json({ error: `The emotional council could not answer: ${error?.message || 'unknown Gemini error'}` });
  }
}
