/**
 * The game engine.
 *
 * `computeGame(data, today)` replays the whole history every time and returns
 * the current game state: XP, level, coins, streaks, freeze tokens, goals,
 * quests and per-day info for the Wall. Because nothing is stored "pre-added",
 * unticking a habit (or deleting a quest entry) automatically removes its XP
 * and coins. History is small (a few thousand rows a year), so replaying is
 * instant.
 */
import { addDays, dayRange, diffDays, minDay, weekday, type DayKey } from './dates';
import { levelForXp, type LevelInfo } from './levels';
import type { AppData, CheckStatus, Cycle, Goal, Habit, Quest, QuestEntry } from './types';

// ---- Game rules (tweak here) ------------------------------------------------
export const RULES = {
  perfectDayXp: 50,
  streakBonusXp: 5, // extra XP per tick…
  streakBonusFrom: 7, // …once the habit's streak reaches this many days
  coinsPerTick: 1,
  coinsPerPerfectDay: 10,
  coinsPerQuestStep: 20,
  freezePerfectDaysNeeded: 5, // perfect days in a Mon–Sun week to earn a token
  freezeMaxTokens: 3,
  freezeLookbackDays: 7, // how far back "Don't miss twice" looks for the last scheduled day
};

export interface DayInfo {
  day: DayKey;
  scheduled: string[]; // habit ids scheduled that day
  done: string[]; // habit ids done that day (scheduled or not)
  frozen: string[];
  perfect: boolean;
  xp: number; // XP earned that day (habits + bonuses + quests)
}

export interface HabitStat {
  habitId: string;
  live: number; // current streak
  best: number; // best streak ever
  doneTotal: number; // all-time done days
}

export interface GoalProgress {
  goal: Goal;
  habit: Habit | undefined;
  done: number;
  target: number;
  /** Days still needed. */
  need: number;
  /** Scheduled days still available (today counts if not yet done). */
  remaining: number;
  /** Misses still allowed — the "lives". Negative means the goal can no longer be hit. */
  spare: number;
  /** Lives at the start of the cycle (118 − 100 = 18). */
  spareStart: number;
  complete: boolean;
}

export interface QuestProgress {
  quest: Quest;
  entries: QuestEntry[]; // entries inside the current cycle, newest first
  count: number;
  complete: boolean;
}

export interface MissWarning {
  habitId: string;
  missedDay: DayKey;
}

export interface GameState {
  today: DayKey;
  cycle: Cycle;
  cycleEnd: DayKey;
  /** 1-based day number in the cycle (can be < 1 before start, > length after end). */
  dayNumber: number;
  /** dayNumber clamped to 1…length for display. */
  displayDay: number;
  cycleOver: boolean;
  days: Map<DayKey, DayInfo>;
  xpTotal: number;
  level: LevelInfo;
  coinsEarned: number;
  coinsSpent: number;
  coins: number;
  freezeTokens: number;
  freezesUsed: number;
  perfectDaysCycle: number;
  perfectDaysTotal: number;
  habitStats: Record<string, HabitStat>;
  /** Habits scheduled today, in display order. */
  todayHabits: Habit[];
  todayDoneCount: number;
  todayPerfect: boolean;
  warnings: MissWarning[];
  goals: GoalProgress[];
  quests: QuestProgress[];
  bestLive: { habitId: string | null; value: number };
  visionIndex: number;
}

/** Is this habit on the schedule for `day`? */
export function isScheduled(h: Habit, day: DayKey): boolean {
  if (day < h.activeFrom) return false;
  if (h.archivedFrom && day >= h.archivedFrom) return false;
  return h.days.includes(weekday(day));
}

/** Habits not removed as of `day`, in display order. */
export function activeHabits(habits: Habit[], day: DayKey): Habit[] {
  return habits
    .filter((h) => !h.archivedFrom || h.archivedFrom > day)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** The cycle `today` falls in (or the most recent one that has started). */
export function currentCycle(cycles: Cycle[], today: DayKey): Cycle {
  const sorted = [...cycles].sort((a, b) => (a.startDay < b.startDay ? -1 : 1));
  let cur = sorted[0];
  for (const c of sorted) if (c.startDay <= today) cur = c;
  return cur;
}

export function cycleEndDay(c: Cycle): DayKey {
  return addDays(c.startDay, c.lengthDays - 1);
}

/** Builds a lookup: day → habitId → status. */
export function buildCheckMap(data: AppData): Map<DayKey, Map<string, CheckStatus>> {
  const map = new Map<DayKey, Map<string, CheckStatus>>();
  for (const c of data.checks) {
    let m = map.get(c.day);
    if (!m) map.set(c.day, (m = new Map()));
    m.set(c.habitId, c.status);
  }
  return map;
}

export function computeGame(data: AppData, today: DayKey): GameState {
  const habits = [...data.habits].sort((a, b) => a.sortOrder - b.sortOrder);
  const habitById = new Map(habits.map((h) => [h.id, h]));
  const checkMap = buildCheckMap(data);
  const cycle = currentCycle(data.cycles, today);
  const cycleEnd = cycleEndDay(cycle);

  // History starts at the earliest cycle or check, and runs up to today.
  let firstDay = cycle.startDay;
  for (const c of data.cycles) firstDay = minDay(firstDay, c.startDay);
  for (const c of data.checks) firstDay = minDay(firstDay, c.day);
  const history = firstDay <= today ? dayRange(firstDay, today) : [];

  const stats: Record<string, HabitStat & { run: number }> = {};
  for (const h of habits) stats[h.id] = { habitId: h.id, live: 0, best: 0, doneTotal: 0, run: 0 };

  const days = new Map<DayKey, DayInfo>();
  let xpTotal = 0;
  let coinsEarned = 0;
  let freezeTokens = 0;
  let freezesUsed = 0;
  let perfectDaysTotal = 0;
  let perfectDaysCycle = 0;

  for (const day of history) {
    const statuses = checkMap.get(day) ?? new Map<string, CheckStatus>();
    const info: DayInfo = { day, scheduled: [], done: [], frozen: [], perfect: false, xp: 0 };

    for (const h of habits) {
      const st = stats[h.id];
      const scheduled = isScheduled(h, day);
      const status = statuses.get(h.id);
      if (scheduled) info.scheduled.push(h.id);

      if (status === 'done') {
        info.done.push(h.id);
        st.doneTotal++;
        info.xp += h.xp;
        coinsEarned += RULES.coinsPerTick;
        if (scheduled) {
          st.run++;
          if (st.run >= RULES.streakBonusFrom) info.xp += RULES.streakBonusXp;
        }
      } else if (status === 'freeze' && scheduled) {
        // A freeze keeps the streak alive but doesn't add to it.
        info.frozen.push(h.id);
      } else if (scheduled && day < today) {
        st.run = 0; // missed a scheduled day → streak broken
      }
      // (Not done *today* yet doesn't break anything — the day isn't over.)
      st.best = Math.max(st.best, st.run);
    }

    info.perfect = info.scheduled.length > 0 && info.scheduled.every((id) => info.done.includes(id));
    if (info.perfect) {
      info.xp += RULES.perfectDayXp;
      coinsEarned += RULES.coinsPerPerfectDay;
      perfectDaysTotal++;
      if (day >= cycle.startDay && day <= cycleEnd) perfectDaysCycle++;
    }
    days.set(day, info);
    xpTotal += info.xp;

    // Freeze tokens: when a Mon–Sun week is fully over, award a token if it had
    // enough perfect days. Then spend any freezes used on this day.
    if (weekday(day) === 0 && day < today) {
      let perfectInWeek = 0;
      for (let i = 0; i < 7; i++) if (days.get(addDays(day, -i))?.perfect) perfectInWeek++;
      if (perfectInWeek >= RULES.freezePerfectDaysNeeded) {
        freezeTokens = Math.min(RULES.freezeMaxTokens, freezeTokens + 1);
      }
    }
    if (info.frozen.length) {
      freezesUsed += info.frozen.length;
      freezeTokens = Math.max(0, freezeTokens - info.frozen.length);
    }
  }

  // Quests: XP and coins for every entry (all time).
  const questById = new Map(data.quests.map((q) => [q.id, q]));
  for (const e of data.questEntries) {
    const q = questById.get(e.questId);
    if (!q) continue;
    xpTotal += q.xpPerStep;
    coinsEarned += RULES.coinsPerQuestStep;
    const info = days.get(e.day);
    if (info) info.xp += q.xpPerStep;
  }

  const coinsSpent = data.purchases.reduce((s, p) => s + p.cost, 0);

  // Streak summary
  const habitStats: Record<string, HabitStat> = {};
  let bestLive: { habitId: string | null; value: number } = { habitId: null, value: 0 };
  for (const h of habits) {
    const { run, ...rest } = stats[h.id];
    habitStats[h.id] = { ...rest, live: run };
    const isActive = !h.archivedFrom || h.archivedFrom > today;
    if (isActive && run > bestLive.value) bestLive = { habitId: h.id, value: run };
  }

  // Today
  const todayInfo = days.get(today);
  const todayHabits = habits.filter((h) => isScheduled(h, today));
  const todayStatuses = checkMap.get(today) ?? new Map<string, CheckStatus>();
  const todayDoneCount = todayHabits.filter((h) => todayStatuses.get(h.id) === 'done').length;

  // "Don't miss twice": last scheduled day was missed and today isn't done yet.
  const warnings: MissWarning[] = [];
  for (const h of todayHabits) {
    if (todayStatuses.get(h.id) === 'done') continue;
    const prev = previousScheduledDay(h, today, firstDay);
    if (prev && !checkMap.get(prev)?.has(h.id)) warnings.push({ habitId: h.id, missedDay: prev });
  }

  // Goals
  const goals = [...data.goals]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => goalProgress(g, habitById.get(g.habitId), cycle, today, checkMap));

  // Quests (progress counts entries inside the current cycle)
  const quests: QuestProgress[] = [...data.quests]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((q) => {
      const entries = data.questEntries
        .filter((e) => e.questId === q.id && e.day >= cycle.startDay && e.day <= cycleEnd)
        .sort((a, b) => (a.day === b.day ? (a.createdAt < b.createdAt ? 1 : -1) : a.day < b.day ? 1 : -1));
      return { quest: q, entries, count: entries.length, complete: entries.length >= q.target };
    });

  const dayNumber = diffDays(cycle.startDay, today) + 1;
  const visions = data.settings.visions.length ? data.settings.visions : [''];

  return {
    today,
    cycle,
    cycleEnd,
    dayNumber,
    displayDay: Math.max(1, Math.min(cycle.lengthDays, dayNumber)),
    cycleOver: today > cycleEnd,
    days,
    xpTotal,
    level: levelForXp(xpTotal),
    coinsEarned,
    coinsSpent,
    coins: coinsEarned - coinsSpent,
    freezeTokens,
    freezesUsed,
    perfectDaysCycle,
    perfectDaysTotal,
    habitStats,
    todayHabits,
    todayDoneCount,
    todayPerfect: todayInfo?.perfect ?? false,
    warnings,
    goals,
    quests,
    bestLive,
    visionIndex: (((dayNumber - 1) % visions.length) + visions.length) % visions.length,
  };
}

/** The closest earlier day this habit was scheduled (within the look-back window). */
export function previousScheduledDay(h: Habit, today: DayKey, firstDay: DayKey): DayKey | null {
  for (let i = 1; i <= RULES.freezeLookbackDays; i++) {
    const d = addDays(today, -i);
    if (d < firstDay || d < h.activeFrom) return null;
    if (isScheduled(h, d)) return d;
  }
  return null;
}

export function goalProgress(
  goal: Goal,
  habit: Habit | undefined,
  cycle: Cycle,
  today: DayKey,
  checkMap: Map<DayKey, Map<string, CheckStatus>>,
): GoalProgress {
  const end = cycleEndDay(cycle);
  let done = 0;
  let scheduledTotal = 0;
  let missedPast = 0;
  let remaining = 0;
  if (habit) {
    for (const d of dayRange(cycle.startDay, end)) {
      const isDone = checkMap.get(d)?.get(habit.id) === 'done'; // freezes don't count
      if (isDone) done++;
      if (!isScheduled(habit, d)) continue;
      scheduledTotal++;
      if (isDone) continue;
      if (d < today) missedPast++;
      else remaining++;
    }
  }
  const need = Math.max(0, goal.target - done);
  return {
    goal,
    habit,
    done,
    target: goal.target,
    need,
    remaining,
    spare: remaining - need,
    spareStart: scheduledTotal - goal.target,
    complete: done >= goal.target,
  };
}

/** Days of the current cycle up to and including `today` (for stats). */
export function elapsedCycleDays(state: GameState): DayKey[] {
  const end = minDay(state.today, state.cycleEnd);
  const start = state.cycle.startDay;
  return end >= start ? dayRange(start, end) : [];
}

