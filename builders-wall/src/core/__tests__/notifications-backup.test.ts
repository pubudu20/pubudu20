import { daysSinceExport, makeBackup, validateBackup } from '../backup';
import { buildSeedData } from '../defaults';
import { computeGame } from '../engine';
import { planNotifications } from '../notificationPlan';

describe('notification plan', () => {
  const data = buildSeedData('2026-11-04T00:00:00Z');

  it('skips reminders for habits already ticked today', () => {
    // 4 Nov 07:00 Colombo — Make bed is already ticked (seed), Apex is not.
    const now = new Date(2026, 10, 4, 7, 0);
    const plan = planNotifications(data, computeGame(data, '2026-11-04'), now);
    const ids = plan.map((p) => p.id);
    expect(ids).not.toContain('habit:h_make_bed:2026-11-04');
    expect(ids).toContain('habit:h_apex:2026-11-04');
    expect(ids).toContain('habit:h_make_bed:2026-11-05');
  });

  it('formats the Apex reminder', () => {
    const now = new Date(2026, 10, 4, 7, 0);
    const apex = planNotifications(data, computeGame(data, '2026-11-04'), now).find((p) => p.id === 'habit:h_apex:2026-11-04')!;
    expect(apex.title).toBe('3 pm · Apex (1 hour) time');
    expect(apex.body).toBe('+25 XP waiting · Day 2 of 118');
    expect(apex.date.getHours()).toBe(15);
  });

  it('never schedules in the past', () => {
    const now = new Date(2026, 10, 4, 16, 30);
    const plan = planNotifications(data, computeGame(data, '2026-11-04'), now);
    expect(plan.every((p) => p.date.getTime() > now.getTime())).toBe(true);
    expect(plan.map((p) => p.id)).not.toContain('habit:h_apex:2026-11-04');
  });

  it('evening check lists only habits not yet done', () => {
    const now = new Date(2026, 10, 4, 7, 0);
    const ev = planNotifications(data, computeGame(data, '2026-11-04'), now).find((p) => p.id === 'evening:2026-11-04')!;
    expect(ev.body).toContain('Apex');
    expect(ev.body).not.toContain('Meditate');
    expect(ev.date.getHours()).toBe(23);
    expect(ev.date.getMinutes()).toBe(15);
  });

  it('weekly review only on Sundays, and nothing when disabled', () => {
    const now = new Date(2026, 10, 4, 7, 0);
    const plan = planNotifications(data, computeGame(data, '2026-11-04'), now);
    expect(plan.filter((p) => p.id.startsWith('weekly:')).map((p) => p.id)).toEqual(['weekly:2026-11-08']);
    const off = { ...data, settings: { ...data.settings, notifications: { ...data.settings.notifications, enabled: false } } };
    expect(planNotifications(off, computeGame(off, '2026-11-04'), now)).toEqual([]);
  });
});

describe('backup', () => {
  const data = buildSeedData('2026-11-04T00:00:00Z');

  it('round-trips through JSON', () => {
    const json = JSON.stringify(makeBackup([{ name: 'Pubu', data }], new Date()));
    expect(validateBackup(JSON.parse(json))).toBeNull();
  });

  it('rejects other files', () => {
    expect(validateBackup({ hello: 1 })).not.toBeNull();
    expect(validateBackup(null)).not.toBeNull();
    const bad = makeBackup([{ name: 'Pubu', data: { ...data, checks: [{ day: 'nope', habitId: 'x', status: 'done' }] } }], new Date());
    expect(validateBackup(bad)).not.toBeNull();
  });

  it('reminds after 7 days without export', () => {
    const now = new Date('2026-11-12T12:00:00Z');
    expect(daysSinceExport(null, '2026-11-04T12:00:00Z', now)).toBe(8);
    expect(daysSinceExport('2026-11-10T12:00:00Z', '2026-11-04T12:00:00Z', now)).toBe(2);
  });
});
