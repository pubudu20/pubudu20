/**
 * Pubu's starting data: habits, goals, quests, rewards, settings and the two
 * seeded days. Everything here is editable later in Settings.
 */
import type { AppData, Check, Cycle, Goal, Habit, Quest, Reward, Settings } from './types';

export const DEFAULT_PROFILE_ID = 'pubu';
export const FIRST_CYCLE_START = '2026-11-03';
export const CYCLE_LENGTH = 118;

export const MOTTO = 'I am a Calm and Disciplined Builder';

export const VISIONS = [
  'I design scalable systems as a strategic architect, delivering meaningful business impact.',
  'I commit to lifelong learning and steady mastery of systems, business and strategy.',
  'I am a present and dependable son and husband, leading with love and emotional steadiness.',
  'I train my body for longevity, vitality, resilience and strength.',
  'I build wealth patiently through wise, long-term decisions.',
  'I am a calm and open-minded seeker, cultivating wisdom, integrity and peace.',
];

const DAILY = [0, 1, 2, 3, 4, 5, 6];

type HabitSeed = Pick<Habit, 'key' | 'name' | 'slot' | 'reminderTime' | 'xp' | 'days'> & { isPrivate?: boolean };

const HABIT_SEEDS: HabitSeed[] = [
  { key: 'make_bed', name: 'Make bed', slot: '8:00 am', reminderTime: '08:00', xp: 5, days: DAILY },
  { key: 'meditate', name: 'Meditate', slot: '8–9 am', reminderTime: '08:05', xp: 15, days: DAILY },
  { key: 'elevate', name: 'Elevate · Deepstash · Riseguide', slot: '9–10 am', reminderTime: '09:00', xp: 10, days: DAILY },
  { key: 'journal', name: 'Journal', slot: '10–10:30 am', reminderTime: '10:00', xp: 10, days: DAILY },
  { key: 'read', name: 'Read', slot: '10:30–11:30 am', reminderTime: '10:30', xp: 15, days: DAILY },
  { key: 'apex', name: 'Apex (1 hour)', slot: '3–4 pm', reminderTime: '15:00', xp: 25, days: DAILY },
  { key: 'exercise', name: 'Exercise', slot: '4–5 pm', reminderTime: '16:00', xp: 20, days: DAILY },
  { key: 'youtube', name: 'Limit YouTube', slot: 'All day', reminderTime: null, xp: 10, days: DAILY },
  { key: 'clean', name: 'Clean day', slot: 'All day', reminderTime: null, xp: 10, days: DAILY, isPrivate: true },
  { key: 'phone_off', name: 'Phone off', slot: '11:30 pm', reminderTime: '23:30', xp: 15, days: DAILY },
  { key: 'finance', name: 'Weekly finance review', slot: 'Sunday 11 am', reminderTime: '11:00', xp: 30, days: [0] },
];

/** Journal's full description, shown under its name. */
export const HABIT_HINTS: Record<string, string> = {
  journal: 'Gratitude, affirmations, key wins, thoughts',
};

export function defaultHabits(startDay: string): Habit[] {
  return HABIT_SEEDS.map((h, i) => ({
    id: `h_${h.key}`,
    key: h.key,
    name: h.name,
    slot: h.slot,
    reminderTime: h.reminderTime,
    reminderOn: h.reminderTime !== null,
    xp: h.xp,
    days: [...h.days],
    sortOrder: i,
    isPrivate: !!h.isPrivate,
    activeFrom: startDay,
    archivedFrom: null,
  }));
}

export function defaultGoals(): Goal[] {
  const g = (key: string, title: string, i: number): Goal => ({
    id: `g_${key}`,
    habitId: `h_${key}`,
    title,
    target: 100,
    sortOrder: i,
  });
  return [
    g('exercise', 'Complete 100 days of Exercise', 0),
    g('read', 'Complete 100 days of Reading', 1),
    g('meditate', 'Complete 100 days of Meditation', 2),
    g('apex', 'Complete 100 days of Learn Apex', 3),
    g('phone_off', 'Complete 100 days of Phone off', 4),
  ];
}

export function defaultQuests(): Quest[] {
  return [
    { id: 'q_dates', key: 'dates', title: 'Plan & go on intentional dates with my wife', target: 6, xpPerStep: 100, sortOrder: 0 },
    { id: 'q_wife_gifts', key: 'wife_gifts', title: 'Thoughtful gifts or gestures for my wife', target: 6, xpPerStep: 100, sortOrder: 1 },
    { id: 'q_parents', key: 'parents', title: 'Thoughtful gifts or meaningful gestures for my parents', target: 6, xpPerStep: 100, sortOrder: 2 },
    { id: 'q_sessions', key: 'sessions', title: 'Present Salesforce Community knowledge-sharing sessions', target: 2, xpPerStep: 250, sortOrder: 3 },
  ];
}

export function defaultRewards(): Reward[] {
  return [
    { id: 'r_movie', title: 'Movie or dinner night with my wife', cost: 150, sortOrder: 0, archived: false },
    { id: 'r_book', title: 'New book', cost: 100, sortOrder: 1, archived: false },
    { id: 'r_youtube', title: 'Guilt-free YouTube / gaming hour', cost: 40, sortOrder: 2, archived: false },
    { id: 'r_gadget', title: 'A gadget or clothing item', cost: 400, sortOrder: 3, archived: false },
  ];
}

export function defaultSettings(nowIso: string): Settings {
  return {
    name: 'Pubu',
    motto: MOTTO,
    visions: [...VISIONS],
    notifications: {
      enabled: true,
      habitReminders: true,
      morningBriefing: true,
      morningTime: '08:00',
      eveningCheck: true,
      eveningTime: '23:15',
      weeklyReview: true,
      weeklyTime: '11:00',
    },
    lastExportAt: null,
    installedAt: nowIso,
    seenBadges: [],
    seenLevel: 1,
  };
}

/** Days Pubu already completed before the app existed. */
export function seedChecks(): Check[] {
  const day1 = ['meditate', 'elevate', 'journal', 'read', 'exercise'];
  const day2 = ['make_bed', 'meditate', 'elevate', 'journal', 'read', 'exercise'];
  return [
    ...day1.map((k) => ({ day: '2026-11-03', habitId: `h_${k}`, status: 'done' as const })),
    ...day2.map((k) => ({ day: '2026-11-04', habitId: `h_${k}`, status: 'done' as const })),
  ];
}

export function defaultCycle(): Cycle {
  return { id: 'c_1', startDay: FIRST_CYCLE_START, lengthDays: CYCLE_LENGTH };
}

/** Complete first-launch data set. */
export function buildSeedData(nowIso: string): AppData {
  return {
    profileId: DEFAULT_PROFILE_ID,
    habits: defaultHabits(FIRST_CYCLE_START),
    checks: seedChecks(),
    dayLogs: [],
    goals: defaultGoals(),
    quests: defaultQuests(),
    questEntries: [],
    rewards: defaultRewards(),
    purchases: [],
    cycles: [defaultCycle()],
    settings: defaultSettings(nowIso),
  };
}
