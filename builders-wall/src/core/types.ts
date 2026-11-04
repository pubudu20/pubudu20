/**
 * The data model. Everything a profile owns lives in one `AppData` object,
 * which is what we load from SQLite, compute the game from, and write to a
 * JSON backup. Every database row also carries a profileId (see db.ts) so a
 * second profile (e.g. Pubu's wife) can be added later.
 */
import type { DayKey } from './dates';

export type CheckStatus = 'done' | 'freeze';

export interface Habit {
  id: string;
  /** Stable key for built-in habits (e.g. "apex") so badges survive renames. */
  key: string | null;
  name: string;
  /** Free-text time slot shown in the UI, e.g. "8–9 am" or "All day". */
  slot: string;
  /** Reminder time "HH:MM" (24h), or null for no specific time. */
  reminderTime: string | null;
  reminderOn: boolean;
  xp: number;
  /** Days of week it is scheduled: 0 = Sunday … 6 = Saturday. */
  days: number[];
  sortOrder: number;
  /** Private habits keep their discreet label everywhere (app, widget, notifications). */
  isPrivate: boolean;
  /** First day this habit counts (so adding a habit later doesn't spoil past perfect days). */
  activeFrom: DayKey;
  /** If removed: the first day it no longer counts. History before it is kept. */
  archivedFrom: DayKey | null;
}

export interface Check {
  day: DayKey;
  habitId: string;
  status: CheckStatus;
}

export interface DayLog {
  day: DayKey;
  weightKg: number | null;
}

/** "Complete 100 days of Exercise" — counts done days of one habit within the cycle. */
export interface Goal {
  id: string;
  habitId: string;
  title: string;
  target: number;
  sortOrder: number;
}

export interface Quest {
  id: string;
  key: string | null;
  title: string;
  target: number;
  xpPerStep: number;
  sortOrder: number;
}

export interface QuestEntry {
  id: string;
  questId: string;
  day: DayKey;
  note: string;
  createdAt: string; // ISO timestamp
}

export interface Reward {
  id: string;
  title: string;
  cost: number;
  sortOrder: number;
  archived: boolean;
}

export interface Purchase {
  id: string;
  rewardId: string | null;
  title: string;
  cost: number;
  day: DayKey;
  createdAt: string;
}

/** A challenge window. Day 1 = startDay. Pubu's first one is 3 Nov 2026 → 28 Feb 2027 (118 days). */
export interface Cycle {
  id: string;
  startDay: DayKey;
  lengthDays: number;
}

export interface NotificationSettings {
  enabled: boolean;
  habitReminders: boolean;
  morningBriefing: boolean;
  morningTime: string;
  eveningCheck: boolean;
  eveningTime: string;
  weeklyReview: boolean;
  weeklyTime: string; // on Sundays
}

export interface Settings {
  name: string;
  motto: string;
  visions: string[];
  notifications: NotificationSettings;
  lastExportAt: string | null;
  installedAt: string;
  /** Badges / level already celebrated, so toasts show once (even for widget ticks). */
  seenBadges: string[];
  seenLevel: number;
}

export interface AppData {
  profileId: string;
  habits: Habit[];
  checks: Check[];
  dayLogs: DayLog[];
  goals: Goal[];
  quests: Quest[];
  questEntries: QuestEntry[];
  rewards: Reward[];
  purchases: Purchase[];
  cycles: Cycle[];
  settings: Settings;
}
