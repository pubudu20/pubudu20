/**
 * Badges. Each badge is a rule over the computed game state, so badges unlock
 * (and re-lock) automatically as history changes.
 */
import { addDays, mondayOf } from './dates';
import type { GameState } from './engine';
import type { AppData } from './types';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // a single emoji/glyph
  unlocked: boolean;
  /** Optional progress text, e.g. "12/50". */
  progress?: string;
}

/** Done days (all time) of the built-in habit with this key. */
function doneByKey(data: AppData, s: GameState, key: string): number {
  const h = data.habits.find((x) => x.key === key);
  return h ? (s.habitStats[h.id]?.doneTotal ?? 0) : 0;
}

/** All-time entries of the built-in quest with this key. */
function questByKey(data: AppData, key: string): number {
  const q = data.quests.find((x) => x.key === key);
  return q ? data.questEntries.filter((e) => e.questId === q.id).length : 0;
}

function hasPerfectWeek(s: GameState): boolean {
  for (const [day] of s.days) {
    if (day !== mondayOf(day)) continue;
    let all = true;
    for (let i = 0; i < 7; i++) if (!s.days.get(addDays(day, i))?.perfect) all = false;
    if (all) return true;
  }
  return false;
}

export function computeBadges(data: AppData, s: GameState): Badge[] {
  const bestStreak = Math.max(0, ...Object.values(s.habitStats).map((h) => h.best));
  const totalDone = Object.values(s.habitStats).reduce((a, h) => a + h.doneTotal, 0);
  const count = (n: number, of: number) => `${Math.min(n, of)}/${of}`;

  const apex = doneByKey(data, s, 'apex');
  const read = doneByKey(data, s, 'read');
  const exercise = doneByKey(data, s, 'exercise');
  const meditate = doneByKey(data, s, 'meditate');
  const phoneOff = doneByKey(data, s, 'phone_off');
  const dates = questByKey(data, 'dates');
  const wifeGifts = questByKey(data, 'wife_gifts');
  const parents = questByKey(data, 'parents');
  const sessions = questByKey(data, 'sessions');
  const day = s.dayNumber;

  const b = (id: string, icon: string, name: string, description: string, ok: boolean, progress?: string): Badge => ({
    id,
    icon,
    name,
    description,
    unlocked: ok,
    progress: ok ? undefined : progress,
  });

  return [
    b('first_brick', '🧱', 'First brick', 'Tick your first habit', totalDone >= 1),
    b('perfect_day', '⭐', 'Perfect day', 'Finish every habit in a day', s.perfectDaysTotal >= 1),
    b('week_streak', '🔥', 'Week streak', 'A 7-day streak on any habit', bestStreak >= 7, count(bestStreak, 7)),
    b('habit_formed', '🔩', 'Habit formed', 'A 21-day streak on any habit', bestStreak >= 21, count(bestStreak, 21)),
    b('unbroken', '⛓️', 'Unbroken', 'A 50-day streak on any habit', bestStreak >= 50, count(bestStreak, 50)),
    b('five_perfect', '🏅', 'Five perfect days', 'Five perfect days in total', s.perfectDaysTotal >= 5, count(s.perfectDaysTotal, 5)),
    b('perfect_week', '🏆', 'Perfect week', 'Seven perfect days, Monday to Sunday', hasPerfectWeek(s)),
    b('apex_25', '☁️', 'Apex 25 hours', '25 hours of Apex', apex >= 25, count(apex, 25)),
    b('bookworm', '📚', 'Bookworm', '50 reading days', read >= 50, count(read, 50)),
    b('iron', '🏋️', 'Iron', '50 exercise days', exercise >= 50, count(exercise, 50)),
    b('still_mind', '🧘', 'Still mind', '50 meditation days', meditate >= 50, count(meditate, 50)),
    b('lights_out', '🌙', 'Lights out', '50 phone-off nights', phoneOff >= 50, count(phoneOff, 50)),
    b('devoted_husband', '💑', 'Devoted husband', '6 intentional dates', dates >= 6, count(dates, 6)),
    b('gift_giver', '🎁', 'Thoughtful partner', '6 gifts or gestures for your wife', wifeGifts >= 6, count(wifeGifts, 6)),
    b('good_son', '🙏', 'Good son', '6 gestures for your parents', parents >= 6, count(parents, 6)),
    b('speaker', '🎤', 'Speaker', 'Present a community session', sessions >= 1),
    b('first_freeze', '🧊', 'Cool head', 'Earn a streak freeze token', s.freezeTokens + s.freezesUsed >= 1),
    b('centurion', '💯', 'Centurion', 'Hit a 100-day goal', s.goals.some((g) => g.complete)),
    b('halfway', '🚧', 'Halfway', `Reach day ${Math.ceil(s.cycle.lengthDays / 2)}`, day >= Math.ceil(s.cycle.lengthDays / 2), count(Math.max(0, day), Math.ceil(s.cycle.lengthDays / 2))),
    b('builder_rank', '👷', 'Builder rank', 'Reach level 6 · Builder', s.level.level >= 6, `Lv ${s.level.level}/6`),
    b('first_reward', '🪙', 'Treat yourself', 'Redeem a reward in the shop', data.purchases.length >= 1),
    b('wall_complete', '🏛️', 'Wall complete', `Reach day ${s.cycle.lengthDays}`, day >= s.cycle.lengthDays, count(Math.max(0, day), s.cycle.lengthDays)),
  ];
}
