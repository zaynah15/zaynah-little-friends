export type EmotionTag = "angry" | "sad" | "happy" | "idle" | "overwhelmed" | "proud" | "lonely" | "frustrated" | "grateful" | "work" | "reading" | "painting" | "fitness" | "learning";

export type JournalEntry = {
  id: string;
  date: string;
  text: string;
  tags: EmotionTag[];
};

export type UserProfile = {
  name: string;
  age: number;
  role: string;
  company: string;
  movedFrom: string;
  movedTo: string;
  moveDate: string;
  background: string[];
  interests: string[];
  currentLifeContext: string[];
  growthThemes: string[];
  privateContext?: {
    monthlyIncome: number;
    recentPurchases: string[];
    recentTrips: string[];
    lastHomeVisit: string;
    homeVisitCadence: string;
    birthdayValues: string[];
  };
};
