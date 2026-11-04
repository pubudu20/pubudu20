/**
 * SQLite storage (expo-sqlite, synchronous API — our data is tiny).
 *
 * Schema versioning: SQLite's built-in `PRAGMA user_version` holds the schema
 * version. On open we run every migration newer than that number, in order,
 * inside a transaction. To change the schema later, append a new entry to
 * MIGRATIONS — never edit an old one.
 *
 * Every table has a profile_id column so more profiles can be added later.
 */
import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'builders-wall.db';

const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE profiles (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE settings (
    profile_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (profile_id, key)
  );
  CREATE TABLE cycles (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL,
    start_day TEXT NOT NULL,
    length_days INTEGER NOT NULL
  );
  CREATE TABLE habits (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL,
    key TEXT,
    name TEXT NOT NULL,
    slot TEXT NOT NULL DEFAULT '',
    reminder_time TEXT,
    reminder_on INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL,
    days TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_private INTEGER NOT NULL DEFAULT 0,
    active_from TEXT NOT NULL,
    archived_from TEXT
  );
  CREATE TABLE checks (
    profile_id TEXT NOT NULL,
    day TEXT NOT NULL,
    habit_id TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (profile_id, day, habit_id)
  );
  CREATE TABLE day_logs (
    profile_id TEXT NOT NULL,
    day TEXT NOT NULL,
    weight_kg REAL,
    PRIMARY KEY (profile_id, day)
  );
  CREATE TABLE goals (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL,
    habit_id TEXT NOT NULL,
    title TEXT NOT NULL,
    target INTEGER NOT NULL,
    sort_order INTEGER NOT NULL
  );
  CREATE TABLE quests (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL,
    key TEXT,
    title TEXT NOT NULL,
    target INTEGER NOT NULL,
    xp_per_step INTEGER NOT NULL,
    sort_order INTEGER NOT NULL
  );
  CREATE TABLE quest_entries (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL,
    quest_id TEXT NOT NULL,
    day TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE rewards (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL,
    title TEXT NOT NULL,
    cost INTEGER NOT NULL,
    sort_order INTEGER NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE purchases (
    id TEXT PRIMARY KEY NOT NULL,
    profile_id TEXT NOT NULL,
    reward_id TEXT,
    title TEXT NOT NULL,
    cost INTEGER NOT NULL,
    day TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_checks_day ON checks (profile_id, day);
  CREATE INDEX idx_quest_entries ON quest_entries (profile_id, quest_id);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

let db: SQLite.SQLiteDatabase | null = null;

/** Opens the database once and brings the schema up to date. */
export function getDb(): SQLite.SQLiteDatabase {
  if (db) return db;
  const conn = SQLite.openDatabaseSync(DB_NAME);
  // WAL lets the home-screen widget and the app touch the DB safely.
  conn.execSync('PRAGMA journal_mode = WAL;');
  migrate(conn);
  db = conn;
  return conn;
}

function migrate(conn: SQLite.SQLiteDatabase) {
  const row = conn.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    const next = version + 1;
    conn.withTransactionSync(() => {
      conn.execSync(sql);
      conn.execSync(`PRAGMA user_version = ${next};`);
    });
    version = next;
  }
}
