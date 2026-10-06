import type { PlannerDay, PlannerGoal, PlannerSnapshot, PlannerTask } from "./types";

const STORAGE_KEY = "zaynah-little-friends-planner-v1";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return isoDate(copy);
}

function buildGoals(today: Date): PlannerGoal[] {
  return [
    { id: "sunflower", title: "Finish sunflower painting", category: "painting", target: "Complete the painting", progress: 0.4, lastCompleted: daysAgo(today, 5), deadlineDay: 22 },
    { id: "reading", title: "Read every day", category: "reading", target: "7 pages per session", progress: 0.28, lastCompleted: daysAgo(today, 4) },
    { id: "jev", title: "Learn JEV AI", category: "jev", target: "3 learning sessions per week", progress: 0.5 },
    { id: "steps", title: "Reach 10,000 steps", category: "steps", target: "10,000 steps/day", progress: 0.78 },
    { id: "weight", title: "Support a consistent weight-loss routine", category: "personal", target: "Consistent movement and routines", progress: 0.46 },
    { id: "office", title: "Stay on top of office work", category: "office", target: "Finish priority work before switching tasks", progress: 0.6 },
  ];
}

function task(id: string, title: string, category: PlannerTask["category"], status: PlannerTask["status"], target?: string, note?: string): PlannerTask {
  return { id, title, category, status, target, note };
}

function buildDays(today: Date): PlannerDay[] {
  // A deliberately imperfect demo month. It gives the characters realistic context:
  // missed reading, a neglected painting, office wins, JEV sessions and variable steps.
  const start = new Date(today);
  start.setDate(start.getDate() - 13);

  const dayPlans: Array<PlannerTask[]> = [
    [task("read", "Read 7 pages", "reading", "done", "7 pages"), task("steps", "10k steps", "steps", "done", "10,000 steps"), task("office", "Finish priority office task", "office", "done")],
    [task("read", "Read 7 pages", "reading", "done", "7 pages"), task("paint", "Work on sunflower painting", "painting", "done", "30 min"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "done", "7 pages"), task("jev", "JEV AI learning session", "jev", "done", "45 min"), task("steps", "10k steps", "steps", "done", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "missed", "7 pages", "Demo missed-reading streak begins."), task("office", "Review office backlog", "office", "done")],
    [task("read", "Read 7 pages", "reading", "missed", "7 pages"), task("paint", "Work on sunflower painting", "painting", "missed", "30 min"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "missed", "7 pages"), task("jev", "JEV AI learning session", "jev", "planned", "45 min"), task("steps", "10k steps", "steps", "missed", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "missed", "7 pages"), task("office", "Deep work block", "office", "done")],
    [task("read", "Read 7 pages", "reading", "done", "7 pages"), task("paint", "Work on sunflower painting", "painting", "done", "45 min"), task("steps", "10k steps", "steps", "done", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "done", "7 pages"), task("jev", "JEV AI learning session", "jev", "done", "45 min"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "done", "7 pages"), task("office", "Finish recommendation-system work", "office", "done")],
    [task("read", "Read 7 pages", "reading", "missed", "7 pages"), task("paint", "Work on sunflower painting", "painting", "done", "30 min"), task("steps", "10k steps", "steps", "done", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "missed", "7 pages"), task("jev", "JEV AI learning session", "jev", "planned", "45 min"), task("office", "Follow up on dev task", "office", "done")],
    [task("read", "Read 7 pages", "reading", "missed", "7 pages"), task("steps", "10k steps", "steps", "missed", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "missed", "7 pages", "Today is intentionally a four-day reading gap in the demo."), task("paint", "Work on sunflower painting", "painting", "missed", "30 min"), task("jev", "JEV AI learning session", "jev", "done", "45 min"), task("steps", "10k steps", "steps", "planned", "10,000 steps"), task("office", "Finish priority office work", "office", "planned")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("paint", "Work on sunflower painting", "painting", "planned", "30 min"), task("steps", "10k steps", "steps", "planned", "10,000 steps"), task("office", "Office priority block", "office", "planned")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("jev", "JEV AI learning session", "jev", "planned", "45 min"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("paint", "Work on sunflower painting", "painting", "planned", "45 min"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("office", "Office deep work", "office", "planned")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("jev", "JEV AI learning session", "jev", "planned", "45 min"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("paint", "Finish sunflower painting", "painting", "planned", "60 min"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("office", "Clear priority work", "office", "planned")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("jev", "JEV AI learning session", "jev", "planned", "45 min"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("paint", "Paint / polish sunflower", "painting", "planned", "45 min")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("office", "Office catch-up", "office", "planned"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("jev", "JEV AI learning session", "jev", "planned", "45 min"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("paint", "Final sunflower painting session", "painting", "planned", "60 min"), task("office", "Finish office priorities", "office", "planned")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("jev", "Review JEV AI notes", "jev", "planned", "45 min"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("paint", "Celebrate / photograph sunflower painting", "painting", "planned")],
    [task("read", "Read 7 pages", "reading", "planned", "7 pages"), task("office", "Month-end office review", "office", "planned"), task("steps", "10k steps", "steps", "planned", "10,000 steps")],
  ];

  return dayPlans.map((tasks, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date: isoDate(date), dayNumber: index + 1, tasks };
  });
}

export function createDemoPlanner(today = new Date()): PlannerSnapshot {
  const days = buildDays(today);
  return {
    monthStart: days[0].date,
    currentDay: 14,
    goals: buildGoals(today),
    days,
  };
}

export function loadPlanner(): PlannerSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlannerSnapshot;
      if (parsed?.goals && parsed?.days?.length === 30) return parsed;
    }
  } catch {
    // Re-seed below.
  }
  const planner = createDemoPlanner();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(planner));
  return planner;
}

export function savePlanner(planner: PlannerSnapshot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(planner));
}

export function resetDemoPlanner() {
  const planner = createDemoPlanner();
  savePlanner(planner);
  return planner;
}

export function daysSince(date?: string) {
  if (!date) return null;
  const then = new Date(`${date}T12:00:00`).getTime();
  const now = new Date();
  const today = new Date(`${isoDate(now)}T12:00:00`).getTime();
  return Math.max(0, Math.floor((today - then) / 86400000));
}

export function todayPlan(planner: PlannerSnapshot) {
  const today = isoDate(new Date());
  return planner.days.find(day => day.date === today) || planner.days[planner.currentDay - 1] || planner.days[0];
}

export function updateFromMessage(planner: PlannerSnapshot, message: string): PlannerSnapshot {
  const text = message.toLowerCase();
  const today = todayPlan(planner);
  let changed = false;
  const complete = (category: PlannerTask["category"], match: RegExp) => {
    const target = today.tasks.find(t => t.category === category && match.test(t.title + " " + (t.target || "")));
    if (target) {
      if (target.status !== "done") { target.status = "done"; changed = true; }
      return true;
    }
    return false;
  };

  if (/(finished|finish|completed|complete|done|painted).*sunflower|sunflower.*(finished|done|complete|painted)/.test(text)) {
    complete("painting", /sunflower|paint/i);
    const goal = planner.goals.find(g => g.id === "sunflower");
    if (goal) { goal.progress = 1; goal.lastCompleted = today.date; changed = true; }
  }
  if (/(read|finished|completed).*?(7|seven).*?(page|pages)|\b(read|finished|completed)\b.*\b(book|reading)\b|\bi read today\b/.test(text)) {
    complete("reading", /read/i);
    const goal = planner.goals.find(g => g.id === "reading");
    if (goal) { goal.progress = Math.min(1, goal.progress + 0.03); goal.lastCompleted = today.date; changed = true; }
  }
  if (/(10k|10,000|10000).*step|step.*(10k|10,000|10000)/.test(text)) {
    complete("steps", /step/i);
    const goal = planner.goals.find(g => g.id === "steps");
    if (goal) { goal.progress = 1; goal.lastCompleted = today.date; changed = true; }
  }
  if (/(jev|jév).*(session|learn|studied|study|finished|done)/.test(text)) {
    complete("jev", /jev/i);
    const goal = planner.goals.find(g => g.id === "jev");
    if (goal) { goal.progress = Math.min(1, goal.progress + 0.08); goal.lastCompleted = today.date; changed = true; }
  }
  if (/(office|work).*(finished|done|completed)|finished.*(office|work)/.test(text)) {
    complete("office", /office|work/i);
    const goal = planner.goals.find(g => g.id === "office");
    if (goal) { goal.progress = Math.min(1, goal.progress + 0.05); goal.lastCompleted = today.date; changed = true; }
  }

  if (changed) savePlanner(planner);
  return planner;
}

export function plannerContext(planner: PlannerSnapshot) {
  const today = todayPlan(planner);
  const goals = planner.goals.map(goal => {
    const days = daysSince(goal.lastCompleted);
    return {
      goal: goal.title,
      target: goal.target,
      progress: Math.round(goal.progress * 100) + "%",
      lastCompleted: goal.lastCompleted || "not yet recorded",
      daysSinceLastCompletion: days,
      deadlineDay: goal.deadlineDay || null,
    };
  });

  const tasks = today.tasks.map(t => ({ title: t.title, category: t.category, target: t.target || null, status: t.status, note: t.note || null }));
  return {
    plannerType: "fictional demo month for Zaynah; use only as app context, never claim it is a real calendar",
    currentDate: today.date,
    demoDay: today.dayNumber,
    todayTasks: tasks,
    goals,
  };
}
