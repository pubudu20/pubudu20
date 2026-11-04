/**
 * Works out which local notifications to schedule for the next few days.
 *
 * Android can't run our code at the moment a notification fires, so "don't
 * remind me if I've already ticked it" is done differently: we schedule
 * one-off notifications for the next 7 days, and re-plan everything whenever
 * data changes (tick, untick, settings) or the app opens. A ticked habit
 * simply has no reminder in the new plan.
 */
import { addDays, friendlyTime, logicalDateTime, weekday, type DayKey } from './dates';
import { cycleEndDay, isScheduled, type GameState } from './engine';
import { weekSummary } from './stats';
import type { AppData } from './types';

export interface PlannedNotification {
  id: string;
  date: Date;
  title: string;
  body: string;
}

export const PLAN_DAYS = 7;

export function planNotifications(data: AppData, s: GameState, now: Date): PlannedNotification[] {
  const n = data.settings.notifications;
  if (!n.enabled) return [];
  const out: PlannedNotification[] = [];
  const habits = [...data.habits].sort((a, b) => a.sortOrder - b.sortOrder);
  const todayDone = new Set(s.days.get(s.today)?.done ?? []);
  const len = s.cycle.lengthDays;

  const add = (id: string, day: DayKey, time: string, title: string, body: string) => {
    const date = logicalDateTime(day, time);
    if (date && date.getTime() > now.getTime() + 5000) out.push({ id, date, title, body });
  };

  for (let i = 0; i < PLAN_DAYS; i++) {
    const day = addDays(s.today, i);
    const dayNo = s.dayNumber + i;
    const inWindow = day >= s.cycle.startDay && day <= cycleEndDay(s.cycle);
    const dayLabel = inWindow ? `Day ${dayNo} of ${len}` : 'Builder';
    const scheduled = habits.filter((h) => isScheduled(h, day));
    const isDone = (id: string) => i === 0 && todayDone.has(id);

    // Per-habit reminders
    if (n.habitReminders) {
      for (const h of scheduled) {
        if (!h.reminderOn || !h.reminderTime || isDone(h.id)) continue;
        const title = h.isPrivate ? `${h.name}` : `${friendlyTime(h.reminderTime)} · ${h.name} time`;
        add(`habit:${h.id}:${day}`, day, h.reminderTime, title, `+${h.xp} XP waiting · ${dayLabel}`);
      }
    }

    // Morning briefing
    if (n.morningBriefing) {
      const streaks = scheduled
        .filter((h) => !h.isPrivate)
        .map((h) => ({ h, live: s.habitStats[h.id]?.live ?? 0 }))
        .filter((x) => x.live > 0)
        .sort((a, b) => b.live - a.live)
        .slice(0, 3)
        .map((x) => `${x.h.name} ${x.live}🔥`)
        .join(' · ');
      const visions = data.settings.visions;
      const vision = visions.length ? visions[(((dayNo - 1) % visions.length) + visions.length) % visions.length] : '';
      add(
        `brief:${day}`,
        day,
        n.morningTime,
        `${dayLabel} · Good morning, ${data.settings.name}`,
        [streaks ? `Streaks: ${streaks}` : 'Lay the first brick today.', vision].filter(Boolean).join('\n'),
      );
    }

    // Evening "Don't miss twice" check — only habits not yet done
    if (n.eveningCheck) {
      const open = scheduled.filter((h) => !isDone(h.id));
      if (open.length) {
        add(
          `evening:${day}`,
          day,
          n.eveningTime,
          `Don't miss twice · ${open.length} left today`,
          open.map((h) => h.name).join(', '),
        );
      }
    }

    // Weekly review on Sundays
    if (n.weeklyReview && weekday(day) === 0) {
      const wk = weekSummary(s, day);
      const lives = s.goals
        .filter((g) => g.habit)
        .map((g) => `${g.habit!.name} ${g.spare}`)
        .join(' · ');
      add(
        `weekly:${day}`,
        day,
        n.weeklyTime,
        `Weekly review · ${wk.perfect} perfect day${wk.perfect === 1 ? '' : 's'}`,
        `This week: +${wk.xp} XP.${lives ? ` Spare days left: ${lives}` : ''}`,
      );
    }
  }
  return out;
}
