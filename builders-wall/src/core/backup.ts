/**
 * Backup file format (pure functions, no file access — see data/backupFile.ts).
 *
 * {
 *   "app": "builders-wall",
 *   "schemaVersion": 1,
 *   "exportedAt": "2026-11-04T10:00:00.000Z",
 *   "profiles": [ { "name": "Pubu", "data": { ...AppData } } ]
 * }
 */
import { isValidDayKey } from './dates';
import type { AppData } from './types';

export const BACKUP_APP_ID = 'builders-wall';
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  profiles: { name: string; data: AppData }[];
}

export function makeBackup(profiles: { name: string; data: AppData }[], now: Date): BackupFile {
  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    profiles,
  };
}

const isArr = Array.isArray;

/** Checks a parsed JSON value is a usable backup. Returns an error message, or null when OK. */
export function validateBackup(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return 'This file is not a backup.';
  const f = raw as Partial<BackupFile>;
  if (f.app !== BACKUP_APP_ID) return "This file isn't a Builder's Wall backup.";
  if (typeof f.schemaVersion !== 'number' || f.schemaVersion > BACKUP_FORMAT_VERSION)
    return 'This backup is from a newer version of the app. Update the app first.';
  if (!isArr(f.profiles) || f.profiles.length === 0) return 'The backup has no profiles.';
  for (const p of f.profiles) {
    const d = p?.data as AppData | undefined;
    if (!d || typeof d.profileId !== 'string') return 'A profile in the backup is damaged.';
    const lists = [d.habits, d.checks, d.dayLogs, d.goals, d.quests, d.questEntries, d.rewards, d.purchases, d.cycles];
    if (!lists.every(isArr)) return 'A profile in the backup is missing data.';
    if (!d.cycles.length) return 'The backup has no challenge window.';
    if (!d.checks.every((c) => isValidDayKey(c.day) && typeof c.habitId === 'string'))
      return 'The backup contains invalid days.';
    if (!d.settings || typeof d.settings !== 'object') return 'The backup is missing settings.';
  }
  return null;
}

/** Days since the last export (or since install, if never exported). */
export function daysSinceExport(lastExportAt: string | null, installedAt: string, now: Date): number {
  const ref = new Date(lastExportAt ?? installedAt).getTime();
  if (Number.isNaN(ref)) return 0;
  return Math.floor((now.getTime() - ref) / (24 * 60 * 60 * 1000));
}
