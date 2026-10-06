export type PlannerTask = {
  id: string;
  title: string;
  category: "reading" | "painting" | "jev" | "steps" | "office" | "personal";
  target?: string;
  status: "done" | "missed" | "planned";
  note?: string;
};

export type PlannerGoal = {
  id: string;
  title: string;
  category: PlannerTask["category"];
  target: string;
  progress: number;
  lastCompleted?: string;
  deadlineDay?: number;
};

export type PlannerDay = {
  date: string;
  dayNumber: number;
  tasks: PlannerTask[];
};

export type PlannerSnapshot = {
  monthStart: string;
  currentDay: number;
  goals: PlannerGoal[];
  days: PlannerDay[];
};
