/** Numbers for the Stats screen, derived from the game state. */
import { addDays, dayRange, mondayOf, weekday, type DayKey } from './dates';
import { activeHabits, elapsedCycleDays, type GameState } from './engine';
import type { AppData } from './types';

export interface HabitCompletion {
  habitId: string;
  name: string;
  window: number | null; // 0…1 over the cycle so far (null if never scheduled)
  last7: number | null; // 0…1 over the last 7 days
}

export interface WeekdayRate {
  weekday: number; // 0 = Sun
  rate: number | null;
}

export interface WeekXp {
  weekStart: DayKey;
  xp: number;
}

function rate(days: DayKey[], s: GameState, habitId: string): number | null {
  let sched = 0;
  let done = 0;
  for (const d of days) {
    const info = s.days.get(d);
    if (!info || !info.scheduled.includes(habitId)) continue;
    // Today only counts once it's ticked (the day isn't over yet).
    if (d === s.today && !info.done.includes(habitId)) continue;
    sched++;
    if (info.done.includes(habitId)) done++;
  }
  return sched ? done / sched : null;
}

export function habitCompletion(data: AppData, s: GameState): HabitCompletion[] {
  const windowDays = elapsedCycleDays(s);
  const last7 = dayRange(addDays(s.today, -6), s.today);
  return activeHabits(data.habits, s.today).map((h) => ({
    habitId: h.id,
    name: h.name,
    window: rate(windowDays, s, h.id),
    last7: rate(last7, s, h.id),
  }));
}

/** Completion rate of all scheduled habits, grouped by weekday (cycle so far, today excluded). */
export function weekdayRates(s: GameState): WeekdayRate[] {
  const sched = new Array(7).fill(0);
  const done = new Array(7).fill(0);
  for (const d of elapsedCycleDays(s)) {
    if (d === s.today) continue;
    const info = s.days.get(d);
    if (!info) continue;
    const wd = weekday(d);
    sched[wd] += info.scheduled.length;
    done[wd] += info.scheduled.filter((id) => info.done.includes(id)).length;
  }
  return sched.map((n, wd) => ({ weekday: wd, rate: n ? done[wd] / n : null }));
}

export function bestAndWorstWeekday(rates: WeekdayRate[]): { best: WeekdayRate | null; worst: WeekdayRate | null } {
  const valid = rates.filter((r) => r.rate !== null) as { weekday: number; rate: number }[];
  if (!valid.length) return { best: null, worst: null };
  const sorted = [...valid].sort((a, b) => b.rate - a.rate);
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}

/** XP per Mon–Sun week across the current cycle so far. */
export function weeklyXp(s: GameState): WeekXp[] {
  const map = new Map<DayKey, number>();
  for (const d of elapsedCycleDays(s)) {
    const wk = mondayOf(d);
    map.set(wk, (map.get(wk) ?? 0) + (s.days.get(d)?.xp ?? 0));
  }
  return [...map.entries()].map(([weekStart, xp]) => ({ weekStart, xp }));
}

export function weightSeries(data: AppData, s: GameState): { day: DayKey; kg: number }[] {
  return data.dayLogs
    .filter((l) => l.weightKg !== null && l.day >= s.cycle.startDay && l.day <= s.cycleEnd)
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .map((l) => ({ day: l.day, kg: l.weightKg as number }));
}

/** Summary for the current Mon–Sun week (used by the weekly review notification). */
export function weekSummary(s: GameState, anyDayInWeek: DayKey): { perfect: number; xp: number } {
  const start = mondayOf(anyDayInWeek);
  let perfect = 0;
  let xp = 0;
  for (let i = 0; i < 7; i++) {
    const info = s.days.get(addDays(start, i));
    if (!info) continue;
    if (info.perfect) perfect++;
    xp += info.xp;
  }
  return { perfect, xp };
}
