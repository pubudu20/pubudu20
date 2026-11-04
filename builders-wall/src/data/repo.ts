/**
 * Reading and writing app data. Every function takes a profileId.
 *
 * The pattern is simple: screens call a write function here, then reload
 * everything with `loadAll()` and recompute the game. That keeps the app,
 * the widget and the notifications always in agreement.
 */
import { getDb } from './db';
import { buildSeedData, defaultSettings, DEFAULT_PROFILE_ID } from '../core/defaults';
import type {
  AppData,
  CheckStatus,
  Cycle,
  Goal,
  Habit,
  Purchase,
  Quest,
  QuestEntry,
  Reward,
  Settings,
} from '../core/types';
import type { DayKey } from '../core/dates';

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const b = (v: boolean) => (v ? 1 : 0);

// ---------------------------------------------------------------- load -----

export function listProfiles(): { id: string; name: string }[] {
  return getDb().getAllSync<{ id: string; name: string }>('SELECT id, name FROM profiles ORDER BY created_at');
}

export function loadSettings(profileId: string): Settings {
  const rows = getDb().getAllSync<{ key: string; value: string }>(
    'SELECT key, value FROM settings WHERE profile_id = ?',
    profileId,
  );
  // Start from defaults so settings added in newer versions get sensible values.
  const s: Record<string, unknown> = { ...defaultSettings(new Date().toISOString()) };
  for (const r of rows) {
    try {
      s[r.key] = JSON.parse(r.value);
    } catch {
      /* ignore a corrupt value, keep the default */
    }
  }
  const defaults = defaultSettings('');
  s.notifications = { ...defaults.notifications, ...(s.notifications as object) };
  return s as unknown as Settings;
}

export function loadAll(profileId: string = DEFAULT_PROFILE_ID): AppData {
  const db = getDb();
  const habits = db
    .getAllSync<any>('SELECT * FROM habits WHERE profile_id = ? ORDER BY sort_order', profileId)
    .map(
      (r): Habit => ({
        id: r.id,
        key: r.key,
        name: r.name,
        slot: r.slot,
        reminderTime: r.reminder_time,
        reminderOn: !!r.reminder_on,
        xp: r.xp,
        days: JSON.parse(r.days),
        sortOrder: r.sort_order,
        isPrivate: !!r.is_private,
        activeFrom: r.active_from,
        archivedFrom: r.archived_from,
      }),
    );
  return {
    profileId,
    habits,
    checks: db
      .getAllSync<any>('SELECT day, habit_id, status FROM checks WHERE profile_id = ?', profileId)
      .map((r) => ({ day: r.day, habitId: r.habit_id, status: r.status as CheckStatus })),
    dayLogs: db
      .getAllSync<any>('SELECT day, weight_kg FROM day_logs WHERE profile_id = ?', profileId)
      .map((r) => ({ day: r.day, weightKg: r.weight_kg })),
    goals: db
      .getAllSync<any>('SELECT * FROM goals WHERE profile_id = ? ORDER BY sort_order', profileId)
      .map((r) => ({ id: r.id, habitId: r.habit_id, title: r.title, target: r.target, sortOrder: r.sort_order })),
    quests: db
      .getAllSync<any>('SELECT * FROM quests WHERE profile_id = ? ORDER BY sort_order', profileId)
      .map((r) => ({
        id: r.id,
        key: r.key,
        title: r.title,
        target: r.target,
        xpPerStep: r.xp_per_step,
        sortOrder: r.sort_order,
      })),
    questEntries: db
      .getAllSync<any>('SELECT * FROM quest_entries WHERE profile_id = ?', profileId)
      .map((r) => ({ id: r.id, questId: r.quest_id, day: r.day, note: r.note, createdAt: r.created_at })),
    rewards: db
      .getAllSync<any>('SELECT * FROM rewards WHERE profile_id = ? ORDER BY sort_order', profileId)
      .map((r) => ({ id: r.id, title: r.title, cost: r.cost, sortOrder: r.sort_order, archived: !!r.archived })),
    purchases: db
      .getAllSync<any>('SELECT * FROM purchases WHERE profile_id = ? ORDER BY created_at DESC', profileId)
      .map((r) => ({
        id: r.id,
        rewardId: r.reward_id,
        title: r.title,
        cost: r.cost,
        day: r.day,
        createdAt: r.created_at,
      })),
    cycles: db
      .getAllSync<any>('SELECT * FROM cycles WHERE profile_id = ? ORDER BY start_day', profileId)
      .map((r) => ({ id: r.id, startDay: r.start_day, lengthDays: r.length_days })),
    settings: loadSettings(profileId),
  };
}

// --------------------------------------------------------------- write -----

export function setCheck(profileId: string, day: DayKey, habitId: string, status: CheckStatus | null) {
  const db = getDb();
  if (status === null) {
    db.runSync('DELETE FROM checks WHERE profile_id = ? AND day = ? AND habit_id = ?', profileId, day, habitId);
  } else {
    db.runSync(
      'INSERT OR REPLACE INTO checks (profile_id, day, habit_id, status, updated_at) VALUES (?, ?, ?, ?, ?)',
      profileId,
      day,
      habitId,
      status,
      new Date().toISOString(),
    );
  }
}

export function setWeight(profileId: string, day: DayKey, kg: number | null) {
  const db = getDb();
  if (kg === null) db.runSync('DELETE FROM day_logs WHERE profile_id = ? AND day = ?', profileId, day);
  else
    db.runSync(
      'INSERT OR REPLACE INTO day_logs (profile_id, day, weight_kg) VALUES (?, ?, ?)',
      profileId,
      day,
      kg,
    );
}

export function saveHabit(profileId: string, h: Habit) {
  getDb().runSync(
    `INSERT OR REPLACE INTO habits
     (id, profile_id, key, name, slot, reminder_time, reminder_on, xp, days, sort_order, is_private, active_from, archived_from)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    h.id,
    profileId,
    h.key,
    h.name,
    h.slot,
    h.reminderTime,
    b(h.reminderOn),
    h.xp,
    JSON.stringify(h.days),
    h.sortOrder,
    b(h.isPrivate),
    h.activeFrom,
    h.archivedFrom,
  );
}

/**
 * Removes a habit from today onwards. If it has no history at all it is
 * deleted completely; otherwise it's archived so past XP and streaks remain.
 */
export function removeHabit(profileId: string, habit: Habit, today: DayKey) {
  const db = getDb();
  const used = db.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM checks WHERE profile_id = ? AND habit_id = ? AND day < ?',
    profileId,
    habit.id,
    today,
  );
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM checks WHERE profile_id = ? AND habit_id = ? AND day >= ?', profileId, habit.id, today);
    if (!used || used.n === 0) {
      db.runSync('DELETE FROM habits WHERE profile_id = ? AND id = ?', profileId, habit.id);
      db.runSync('DELETE FROM goals WHERE profile_id = ? AND habit_id = ?', profileId, habit.id);
    } else {
      saveHabit(profileId, { ...habit, archivedFrom: today });
    }
  });
}

export function reorderHabits(profileId: string, orderedIds: string[]) {
  const db = getDb();
  db.withTransactionSync(() => {
    orderedIds.forEach((id, i) =>
      db.runSync('UPDATE habits SET sort_order = ? WHERE profile_id = ? AND id = ?', i, profileId, id),
    );
  });
}

export function saveGoal(profileId: string, g: Goal) {
  getDb().runSync(
    'INSERT OR REPLACE INTO goals (id, profile_id, habit_id, title, target, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    g.id,
    profileId,
    g.habitId,
    g.title,
    g.target,
    g.sortOrder,
  );
}

export function deleteGoal(profileId: string, id: string) {
  getDb().runSync('DELETE FROM goals WHERE profile_id = ? AND id = ?', profileId, id);
}

export function saveQuest(profileId: string, q: Quest) {
  getDb().runSync(
    'INSERT OR REPLACE INTO quests (id, profile_id, key, title, target, xp_per_step, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    q.id,
    profileId,
    q.key,
    q.title,
    q.target,
    q.xpPerStep,
    q.sortOrder,
  );
}

export function deleteQuest(profileId: string, id: string) {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM quest_entries WHERE profile_id = ? AND quest_id = ?', profileId, id);
    db.runSync('DELETE FROM quests WHERE profile_id = ? AND id = ?', profileId, id);
  });
}

export function saveQuestEntry(profileId: string, e: QuestEntry) {
  getDb().runSync(
    'INSERT OR REPLACE INTO quest_entries (id, profile_id, quest_id, day, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    e.id,
    profileId,
    e.questId,
    e.day,
    e.note,
    e.createdAt,
  );
}

export function deleteQuestEntry(profileId: string, id: string) {
  getDb().runSync('DELETE FROM quest_entries WHERE profile_id = ? AND id = ?', profileId, id);
}

export function saveReward(profileId: string, r: Reward) {
  getDb().runSync(
    'INSERT OR REPLACE INTO rewards (id, profile_id, title, cost, sort_order, archived) VALUES (?, ?, ?, ?, ?, ?)',
    r.id,
    profileId,
    r.title,
    r.cost,
    r.sortOrder,
    b(r.archived),
  );
}

export function addPurchase(profileId: string, p: Purchase) {
  getDb().runSync(
    'INSERT INTO purchases (id, profile_id, reward_id, title, cost, day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    p.id,
    profileId,
    p.rewardId,
    p.title,
    p.cost,
    p.day,
    p.createdAt,
  );
}

export function deletePurchase(profileId: string, id: string) {
  getDb().runSync('DELETE FROM purchases WHERE profile_id = ? AND id = ?', profileId, id);
}

export function addCycle(profileId: string, c: Cycle) {
  getDb().runSync(
    'INSERT INTO cycles (id, profile_id, start_day, length_days) VALUES (?, ?, ?, ?)',
    c.id,
    profileId,
    c.startDay,
    c.lengthDays,
  );
}

function writeSettingRows(profileId: string, patch: Partial<Settings>) {
  const db = getDb();
  for (const [key, value] of Object.entries(patch)) {
    db.runSync(
      'INSERT OR REPLACE INTO settings (profile_id, key, value) VALUES (?, ?, ?)',
      profileId,
      key,
      JSON.stringify(value),
    );
  }
}

export function saveSettings(profileId: string, patch: Partial<Settings>) {
  // (Not wrapped in a transaction: SQLite can't nest them and the rows are independent.)
  writeSettingRows(profileId, patch);
}

// --------------------------------------------------- seed / import ---------

const PROFILE_TABLES = [
  'settings',
  'cycles',
  'habits',
  'checks',
  'day_logs',
  'goals',
  'quests',
  'quest_entries',
  'rewards',
  'purchases',
];

/** Replaces everything a profile owns with `data` (used by seeding and backup import). */
export function replaceProfileData(data: AppData, profileName: string) {
  const db = getDb();
  const pid = data.profileId;
  db.withTransactionSync(() => {
    for (const t of PROFILE_TABLES) db.runSync(`DELETE FROM ${t} WHERE profile_id = ?`, pid);
    db.runSync(
      'INSERT OR REPLACE INTO profiles (id, name, created_at) VALUES (?, ?, COALESCE((SELECT created_at FROM profiles WHERE id = ?), ?))',
      pid,
      profileName,
      pid,
      new Date().toISOString(),
    );
    data.cycles.forEach((c) => addCycle(pid, c));
    data.habits.forEach((h) => saveHabit(pid, h));
    data.checks.forEach((c) => setCheck(pid, c.day, c.habitId, c.status));
    data.dayLogs.forEach((l) => l.weightKg !== null && setWeight(pid, l.day, l.weightKg));
    data.goals.forEach((g) => saveGoal(pid, g));
    data.quests.forEach((q) => saveQuest(pid, q));
    data.questEntries.forEach((e) => saveQuestEntry(pid, e));
    data.rewards.forEach((r) => saveReward(pid, r));
    data.purchases.forEach((p) => addPurchase(pid, p));
    writeSettingRows(pid, data.settings);
  });
}

/** First launch: create Pubu's profile with the starting data. */
export function seedIfEmpty() {
  if (listProfiles().length > 0) return;
  const seed = buildSeedData(new Date().toISOString());
  replaceProfileData(seed, seed.settings.name);
}
