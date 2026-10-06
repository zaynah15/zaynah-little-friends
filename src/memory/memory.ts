import type { EmotionTag, JournalEntry, UserProfile } from "./types";

const JOURNAL_KEY = "zaynah-little-friends-emotion-journal-v1";
const PROFILE_KEY = "zaynah-little-friends-profile-v1";

export const USER_PROFILE: UserProfile = {
  name: "Zaynah",
  age: 23,
  role: "Associate Product Manager (APM)",
  company: "Tata CLiQ",
  movedFrom: "Delhi",
  movedTo: "Bombay (Mumbai)",
  moveDate: "2026-04-28",
  background: [
    "Was outspoken and regularly took leadership roles through school, including class monitor, cultural president and head girl.",
    "Won awards in painting and debates and was consistently high-achieving.",
    "Was a best student during her college years.",
    "Explored software engineering roles and spent significant effort on LeetCode and placements.",
    "Enjoys building things, solving problems and making useful or creative things for friends.",
  ],
  interests: ["painting", "coding", "building products", "problem solving", "piano on a Casio CT-S300 keyboard", "tennis", "badminton", "walking", "shopping and fashion"],
  currentLifeContext: [
    "This is her first job as an APM.",
    "She moved from Delhi to Bombay for work and is adapting to a new city and corporate life.",
    "She misses home and her mother's cooking.",
    "She sometimes feels that she is not doing everything she is capable of.",
    "She finds Bombay expensive and sometimes gets frustrated with food and day-to-day costs.",
  ],
  growthThemes: [
    "becoming more confident and outspoken again",
    "building consistently instead of procrastinating",
    "making room for creativity while doing well at work",
    "reading more consistently",
    "using emotions as signals rather than treating emotions as failures",
  ],
  // Private decision context. This is sent only as internal context to the council;
  // characters are explicitly instructed not to quote salary figures or expose private finances.
  privateContext: {
    monthlyIncome: 95000,
    recentPurchases: ["two or three Zara clothes/dresses this month", "recent footwear purchase"],
    recentTrips: ["Igatpuri trip"],
    lastHomeVisit: "about one month ago",
    homeVisitCadence: "plans to go home every 3–4 months",
    birthdayValues: ["likes making friends' birthdays special", "has a history of taking care of friends", "likes celebrating birthdays thoughtfully"]
  },
};

function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function safeEntries(value: unknown): JournalEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is JournalEntry => {
    if (!entry || typeof entry !== "object") return false;
    const item = entry as Partial<JournalEntry>;
    return typeof item.id === "string" && typeof item.date === "string" && typeof item.text === "string" && Array.isArray(item.tags);
  }).slice(-365);
}

export function inferEmotionTags(text: string): EmotionTag[] {
  const lower = text.toLowerCase();
  const tags = new Set<EmotionTag>();
  const groups: Array<[EmotionTag, string[]]> = [
    ["angry", ["angry", "mad", "pissed", "furious", "annoyed", "irritated", "rage", "frustrated"]],
    ["sad", ["sad", "cry", "crying", "hurt", "upset", "low", "lonely", "miss"]],
    ["happy", ["happy", "excited", "joy", "fun", "amazing", "great", "good day", "proud"]],
    ["idle", ["procrastinat", "lazy", "doing nothing", "wasting time", "scrolling", "idle"]],
    ["overwhelmed", ["overwhelmed", "too much", "stressed", "stress", "can't handle", "cannot handle"]],
    ["grateful", ["grateful", "thankful", "appreciate", "lucky"]],
    ["work", ["office", "work", "apm", "meeting", "manager", "project", "task", "corporate"]],
    ["reading", ["book", "read", "reading", "pages"]],
    ["painting", ["paint", "painting", "sunflower", "art", "draw"]],
    ["fitness", ["10k", "steps", "walk", "badminton", "tennis", "exercise", "workout"]],
    ["learning", ["jev", "learn", "learning", "study", "coding", "leetcode", "ai"]],
  ];
  for (const [tag, words] of groups) if (words.some(word => lower.includes(word))) tags.add(tag);
  return [...tags];
}

export function loadJournal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (raw) return safeEntries(JSON.parse(raw));
  } catch { /* use empty journal */ }
  return [];
}

export function saveJournal(entries: JournalEntry[]) { localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries.slice(-365))); }

export function addJournalEntry(text: string, date = todayISO()): JournalEntry[] {
  const entries = loadJournal();
  const entry: JournalEntry = { id: `${date}-${Date.now()}`, date, text: text.trim().slice(0, 6000), tags: inferEmotionTags(text) };
  const next = [...entries, entry].slice(-365);
  saveJournal(next);
  return next;
}

export function hasJournalEntryToday(entries = loadJournal(), date = todayISO()) { return entries.some(entry => entry.date === date); }

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...USER_PROFILE, ...(JSON.parse(raw) as Partial<UserProfile>) };
  } catch { /* use seed profile */ }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(USER_PROFILE));
  return USER_PROFILE;
}

export function journalMemory(entries: JournalEntry[]) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const counts = new Map<EmotionTag, number>();
  sorted.forEach(entry => entry.tags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
  const recurringThemes = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, count]) => `${tag} (${count} entries)`);
  const copingEntries = sorted.filter(entry => /helped|worked for me|made me feel better|calmed me|calmed down|felt better|what worked|i handled/i.test(entry.text));
  const recent = sorted.slice(-12).map(entry => ({ date: entry.date, tags: entry.tags, text: entry.text.slice(0, 900) }));
  return {
    totalEntries: sorted.length,
    firstEntryDate: sorted[0]?.date || null,
    recurringThemes,
    copingPatterns: copingEntries.slice(-8).map(entry => ({ date: entry.date, text: entry.text.slice(0, 1000) })),
    recentEntries: recent,
  };
}
