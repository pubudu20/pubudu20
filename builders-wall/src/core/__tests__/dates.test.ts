import {
  addDays,
  dayRange,
  diffDays,
  friendlyTime,
  isValidDayKey,
  logicalDateTime,
  logicalDayKey,
  mondayOf,
  weekday,
} from '../dates';
import { CYCLE_LENGTH, FIRST_CYCLE_START } from '../defaults';
import { cycleEndDay } from '../engine';

// Tests run with TZ=Asia/Colombo (see package.json), like Pubu's phone.

describe('3 am day cut-off', () => {
  it('counts 11:30 pm as the same day', () => {
    expect(logicalDayKey(new Date(2026, 10, 3, 23, 30))).toBe('2026-11-03');
  });
  it('counts 00:30 and 2:59 am as the previous day', () => {
    expect(logicalDayKey(new Date(2026, 10, 4, 0, 30))).toBe('2026-11-03');
    expect(logicalDayKey(new Date(2026, 10, 4, 2, 59, 59))).toBe('2026-11-03');
  });
  it('starts the new day at exactly 3:00 am', () => {
    expect(logicalDayKey(new Date(2026, 10, 4, 3, 0))).toBe('2026-11-04');
  });
  it('handles month and year boundaries', () => {
    expect(logicalDayKey(new Date(2026, 11, 1, 1, 0))).toBe('2026-11-30');
    expect(logicalDayKey(new Date(2027, 0, 1, 2, 0))).toBe('2026-12-31');
  });
  it('really is Colombo time in tests', () => {
    // 2026-11-03 21:00 UTC = 2026-11-04 02:30 in Colombo → still 3 Nov
    expect(logicalDayKey(new Date(Date.UTC(2026, 10, 3, 21, 0)))).toBe('2026-11-03');
    // 2026-11-03 21:30 UTC = 03:00 Colombo → 4 Nov
    expect(logicalDayKey(new Date(Date.UTC(2026, 10, 3, 21, 30)))).toBe('2026-11-04');
  });
});

describe('logicalDateTime', () => {
  it('puts after-midnight times on the next calendar date', () => {
    const d = logicalDateTime('2026-11-03', '00:30')!;
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([4, 0, 30]);
  });
  it('keeps normal times on the same date', () => {
    const d = logicalDateTime('2026-11-03', '23:30')!;
    expect([d.getDate(), d.getHours()]).toEqual([3, 23]);
  });
  it('rejects bad times', () => {
    expect(logicalDateTime('2026-11-03', '25:00')).toBeNull();
  });
});

describe('118-day window', () => {
  const cycle = { id: 'c', startDay: FIRST_CYCLE_START, lengthDays: CYCLE_LENGTH };
  it('ends on 28 Feb 2027', () => {
    expect(cycleEndDay(cycle)).toBe('2027-02-28');
  });
  it('has 118 days', () => {
    expect(dayRange(cycle.startDay, cycleEndDay(cycle))).toHaveLength(118);
    expect(diffDays('2026-11-03', '2027-02-28') + 1).toBe(118);
  });
  it('day 59 is the halfway point', () => {
    expect(addDays('2026-11-03', 58)).toBe('2026-12-31');
  });
});

describe('helpers', () => {
  it('weekday and monday', () => {
    expect(weekday('2026-11-03')).toBe(2); // Tuesday
    expect(mondayOf('2026-11-03')).toBe('2026-11-02');
    expect(mondayOf('2026-11-08')).toBe('2026-11-02'); // Sunday belongs to the week before
    expect(mondayOf('2026-11-09')).toBe('2026-11-09');
  });
  it('validates day keys', () => {
    expect(isValidDayKey('2027-02-28')).toBe(true);
    expect(isValidDayKey('2027-02-29')).toBe(false);
    expect(isValidDayKey('hello')).toBe(false);
  });
  it('friendly times', () => {
    expect(friendlyTime('15:00')).toBe('3 pm');
    expect(friendlyTime('23:15')).toBe('11:15 pm');
    expect(friendlyTime('00:30')).toBe('12:30 am');
  });
});
