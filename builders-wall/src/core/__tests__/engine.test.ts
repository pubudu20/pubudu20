import { addDays, dayRange } from '../dates';
import { buildSeedData } from '../defaults';
import { computeGame, RULES } from '../engine';
import { levelForXp } from '../levels';
import { computeBadges } from '../badges';
import type { AppData, Check, Habit } from '../types';

const START = '2026-11-03'; // a Tuesday

function habit(id: string, xp: number, days = [0, 1, 2, 3, 4, 5, 6], extra: Partial<Habit> = {}): Habit {
  return {
    id,
    key: id,
    name: id,
    slot: '',
    reminderTime: null,
    reminderOn: false,
    xp,
    days,
    sortOrder: 0,
    isPrivate: false,
    activeFrom: START,
    archivedFrom: null,
    ...extra,
  };
}

/** A tiny world with one or two habits, so the numbers are easy to check by hand. */
function world(habits: Habit[], checks: Check[], extra: Partial<AppData> = {}): AppData {
  const seed = buildSeedData('2026-11-03T00:00:00Z');
  return {
    ...seed,
    habits,
    checks,
    goals: [],
    quests: [],
    questEntries: [],
    purchases: [],
    ...extra,
  };
}

const done = (day: string, habitId: string): Check => ({ day, habitId, status: 'done' });
const frozen = (day: string, habitId: string): Check => ({ day, habitId, status: 'freeze' });
const daysFrom = (start: string, n: number) => dayRange(start, addDays(start, n - 1));

describe('levels', () => {
  it('maps XP to the 10 ranks', () => {
    expect(levelForXp(0).name).toBe('Apprentice');
    expect(levelForXp(399).level).toBe(1);
    expect(levelForXp(400).name).toBe('Bricklayer');
    expect(levelForXp(4300).name).toBe('Builder');
    expect(levelForXp(4300).level).toBe(6);
    expect(levelForXp(14500).name).toBe('Calm & Disciplined Builder');
    expect(levelForXp(99999).progress).toBe(1);
    expect(levelForXp(700).progress).toBeCloseTo(0.5);
  });
});

describe('XP', () => {
  it('gives habit XP plus the perfect-day bonus', () => {
    const d = world([habit('a', 10), habit('b', 20)], [done(START, 'a'), done(START, 'b')]);
    const s = computeGame(d, START);
    expect(s.xpTotal).toBe(10 + 20 + RULES.perfectDayXp);
    expect(s.perfectDaysTotal).toBe(1);
  });

  it('removes XP when a habit is unticked (recalculated from history)', () => {
    const d = world([habit('a', 10), habit('b', 20)], [done(START, 'a')]);
    expect(computeGame(d, START).xpTotal).toBe(10);
    expect(computeGame({ ...d, checks: [] }, START).xpTotal).toBe(0);
  });

  it('adds +5 per tick once the streak reaches 7', () => {
    const days = daysFrom(START, 8);
    const d = world([habit('a', 10)], days.map((x) => done(x, 'a')));
    const s = computeGame(d, days[7]);
    // 8 ticks × 10, perfect bonus every day, +5 on day 7 and day 8
    expect(s.xpTotal).toBe(8 * 10 + 8 * RULES.perfectDayXp + 2 * RULES.streakBonusXp);
  });

  it('adds quest XP and coins', () => {
    const d = world([habit('a', 10)], [], {
      quests: [{ id: 'q', key: 'dates', title: 'Dates', target: 6, xpPerStep: 100, sortOrder: 0 }],
      questEntries: [{ id: 'e1', questId: 'q', day: START, note: 'Dinner', createdAt: '' }],
    });
    const s = computeGame(d, START);
    expect(s.xpTotal).toBe(100);
    expect(s.coins).toBe(RULES.coinsPerQuestStep);
    expect(s.quests[0].count).toBe(1);
  });

  it('works for the real seed data', () => {
    const s = computeGame(buildSeedData('x'), '2026-11-04');
    // 3 Nov: 15+10+10+15+20 = 70. 4 Nov: 5+70 = 75. No perfect days, no streak bonus.
    expect(s.xpTotal).toBe(145);
    expect(s.coins).toBe(11);
    expect(s.dayNumber).toBe(2);
    expect(s.todayDoneCount).toBe(6);
    expect(s.todayHabits).toHaveLength(10); // finance review is Sundays only
  });
});

describe('coins', () => {
  it('earns per tick and perfect day, and subtracts purchases', () => {
    const d = world([habit('a', 10)], [done(START, 'a')], {
      purchases: [{ id: 'p', rewardId: null, title: 'Book', cost: 5, day: START, createdAt: '' }],
    });
    const s = computeGame(d, START);
    expect(s.coinsEarned).toBe(RULES.coinsPerTick + RULES.coinsPerPerfectDay);
    expect(s.coins).toBe(s.coinsEarned - 5);
  });
});

describe('streaks', () => {
  it('counts live and best streaks', () => {
    // done 3,4,5 Nov; missed 6; done 7,8
    const checks = ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-07', '2026-11-08'].map((x) => done(x, 'a'));
    const s = computeGame(world([habit('a', 10)], checks), '2026-11-08');
    expect(s.habitStats.a.live).toBe(2);
    expect(s.habitStats.a.best).toBe(3);
  });

  it('does not break the streak just because today is not ticked yet', () => {
    const s = computeGame(world([habit('a', 10)], [done('2026-11-03', 'a'), done('2026-11-04', 'a')]), '2026-11-05');
    expect(s.habitStats.a.live).toBe(2);
  });

  it('skips days the habit is not scheduled', () => {
    // Sundays only: 8 Nov and 15 Nov
    const h = habit('f', 30, [0]);
    const s = computeGame(world([h], [done('2026-11-08', 'f'), done('2026-11-15', 'f')]), '2026-11-16');
    expect(s.habitStats.f.live).toBe(2);
  });

  it('shows "Don\'t miss twice" when yesterday was missed and today is not done', () => {
    const s = computeGame(world([habit('a', 10)], [done('2026-11-03', 'a')]), '2026-11-05');
    expect(s.warnings).toEqual([{ habitId: 'a', missedDay: '2026-11-04' }]);
    const after = computeGame(world([habit('a', 10)], [done('2026-11-03', 'a'), done('2026-11-05', 'a')]), '2026-11-05');
    expect(after.warnings).toEqual([]);
  });
});

describe('streak freezes', () => {
  // Week of Mon 9 Nov – Sun 15 Nov
  const week = daysFrom('2026-11-09', 7);

  it('earns a token for a week with 5+ perfect days, only once the week is over', () => {
    const checks = week.slice(0, 5).map((x) => done(x, 'a'));
    const d = world([habit('a', 10, [0, 1, 2, 3, 4, 5, 6], { activeFrom: '2026-11-09' })], checks, {
      cycles: [{ id: 'c', startDay: '2026-11-09', lengthDays: 118 }],
    });
    expect(computeGame(d, '2026-11-15').freezeTokens).toBe(0); // Sunday not over yet
    expect(computeGame(d, '2026-11-16').freezeTokens).toBe(1);
  });

  it('does not earn a token with only 4 perfect days', () => {
    const checks = week.slice(0, 4).map((x) => done(x, 'a'));
    const d = world([habit('a', 10, [0, 1, 2, 3, 4, 5, 6], { activeFrom: '2026-11-09' })], checks, {
      cycles: [{ id: 'c', startDay: '2026-11-09', lengthDays: 118 }],
    });
    expect(computeGame(d, '2026-11-16').freezeTokens).toBe(0);
  });

  it('holds at most 3 tokens', () => {
    const all = daysFrom('2026-11-09', 7 * 5).map((x) => done(x, 'a'));
    const d = world([habit('a', 10, [0, 1, 2, 3, 4, 5, 6], { activeFrom: '2026-11-09' })], all, {
      cycles: [{ id: 'c', startDay: '2026-11-09', lengthDays: 118 }],
    });
    expect(computeGame(d, addDays('2026-11-09', 7 * 5)).freezeTokens).toBe(RULES.freezeMaxTokens);
  });

  it('protects the streak, spends a token, but does not count for goals or XP', () => {
    const h = habit('a', 10, [0, 1, 2, 3, 4, 5, 6], { activeFrom: '2026-11-09' });
    const checks = [
      ...week.map((x) => done(x, 'a')), // perfect week → 1 token
      frozen('2026-11-16', 'a'), // Monday missed, frozen
      done('2026-11-17', 'a'),
    ];
    const d = world([h], checks, {
      cycles: [{ id: 'c', startDay: '2026-11-09', lengthDays: 118 }],
      goals: [{ id: 'g', habitId: 'a', title: 'x', target: 100, sortOrder: 0 }],
    });
    const s = computeGame(d, '2026-11-17');
    expect(s.habitStats.a.live).toBe(8); // 7 + (freeze keeps, adds nothing) + 1
    expect(s.freezeTokens).toBe(0);
    expect(s.freezesUsed).toBe(1);
    expect(s.goals[0].done).toBe(8);
    expect(s.goals[0].spare).toBe(17); // the frozen day still used a "life"
    expect(s.warnings).toEqual([]);
  });
});

describe('goals and spare days', () => {
  const goal = { id: 'g', habitId: 'a', title: 'x', target: 100, sortOrder: 0 };

  it('starts with 18 spare days (118 − 100)', () => {
    const s = computeGame(world([habit('a', 10)], [], { goals: [goal] }), START);
    expect(s.goals[0].spareStart).toBe(18);
    expect(s.goals[0].spare).toBe(18);
    expect(s.goals[0].need).toBe(100);
    expect(s.goals[0].remaining).toBe(118);
  });

  it('loses a life for each missed past day, not for today', () => {
    // Done day 1, missed day 2, today is day 3 (not done yet)
    const s = computeGame(world([habit('a', 10)], [done(START, 'a')], { goals: [goal] }), '2026-11-05');
    const g = s.goals[0];
    expect(g.done).toBe(1);
    expect(g.need).toBe(99);
    expect(g.remaining).toBe(116); // days 3…118
    expect(g.spare).toBe(17);
  });

  it('matches the seed: Apex and Phone off missed on day 1', () => {
    const s = computeGame(buildSeedData('x'), '2026-11-04');
    const byTitle = Object.fromEntries(s.goals.map((g) => [g.goal.title, g]));
    expect(byTitle['Complete 100 days of Exercise'].spare).toBe(18);
    expect(byTitle['Complete 100 days of Learn Apex'].spare).toBe(17);
    expect(byTitle['Complete 100 days of Phone off'].spare).toBe(17);
  });

  it('goes negative when the goal can no longer be reached', () => {
    // 19 misses then today
    const s = computeGame(world([habit('a', 10)], [], { goals: [goal] }), addDays(START, 19));
    expect(s.goals[0].spare).toBe(-1);
  });
});

describe('day window', () => {
  it('shows Day X of 118 and detects the end', () => {
    const d = world([habit('a', 10)], []);
    expect(computeGame(d, '2027-02-28').dayNumber).toBe(118);
    expect(computeGame(d, '2027-02-28').cycleOver).toBe(false);
    expect(computeGame(d, '2027-03-01').cycleOver).toBe(true);
    expect(computeGame(d, '2027-03-01').displayDay).toBe(118);
  });

  it('a new cycle keeps old history and XP', () => {
    const d = world([habit('a', 10)], [done(START, 'a')], {
      cycles: [
        { id: 'c1', startDay: START, lengthDays: 118 },
        { id: 'c2', startDay: '2027-03-05', lengthDays: 118 },
      ],
      goals: [{ id: 'g', habitId: 'a', title: 'x', target: 100, sortOrder: 0 }],
    });
    const s = computeGame(d, '2027-03-05');
    expect(s.cycle.id).toBe('c2');
    expect(s.dayNumber).toBe(1);
    expect(s.xpTotal).toBe(10 + RULES.perfectDayXp);
    expect(s.goals[0].done).toBe(0); // goals count the new window only
  });

  it('rotates the vision statement daily', () => {
    const d = world([habit('a', 10)], []);
    expect(computeGame(d, START).visionIndex).toBe(0);
    expect(computeGame(d, addDays(START, 6)).visionIndex).toBe(0);
    expect(computeGame(d, addDays(START, 7)).visionIndex).toBe(1);
  });
});

describe('habits added later', () => {
  it('do not spoil earlier perfect days', () => {
    const d = world([habit('a', 10), habit('b', 10, undefined, { activeFrom: '2026-11-04' })], [done(START, 'a')]);
    expect(computeGame(d, '2026-11-04').days.get(START)?.perfect).toBe(true);
  });
  it('removed habits keep their history', () => {
    const d = world([habit('a', 10, undefined, { archivedFrom: '2026-11-04' })], [done(START, 'a')]);
    const s = computeGame(d, '2026-11-05');
    expect(s.xpTotal).toBe(10 + RULES.perfectDayXp);
    expect(s.todayHabits).toHaveLength(0);
  });
});

describe('badges', () => {
  it('unlocks First brick from the seed', () => {
    const data = buildSeedData('x');
    const badges = computeBadges(data, computeGame(data, '2026-11-04'));
    expect(badges.find((b) => b.id === 'first_brick')?.unlocked).toBe(true);
    expect(badges.find((b) => b.id === 'perfect_day')?.unlocked).toBe(false);
    expect(badges.find((b) => b.id === 'halfway')?.progress).toBe('2/59');
  });
});
