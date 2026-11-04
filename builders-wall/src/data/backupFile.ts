/**
 * Backup to / restore from a JSON file.
 *
 * Export writes the file into the app's cache folder, then opens Android's
 * share sheet so it can be sent to Google Drive, WhatsApp, email, etc.
 * Import opens the system file picker and reads the chosen JSON file.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { makeBackup, validateBackup, type BackupFile } from '../core/backup';
import { listProfiles, loadAll, replaceProfileData, saveSettings } from './repo';
import { logicalDayKey } from '../core/dates';

export async function exportBackup(): Promise<void> {
  const profiles = listProfiles().map((p) => ({ name: p.name, data: loadAll(p.id) }));
  const now = new Date();
  const backup = makeBackup(profiles, now);
  const file = new File(Paths.cache, `builders-wall-backup-${logicalDayKey(now)}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup, null, 1));

  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone.');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: "Save your Builder's Wall backup",
  });
  // The share sheet gives no reliable "sent" signal, so opening it counts as exported.
  for (const p of profiles) saveSettings(p.data.profileId, { lastExportAt: now.toISOString() });
}

/** Lets the user pick a file and returns the parsed, validated backup (not yet applied). */
export async function pickBackup(): Promise<BackupFile | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const text = await new File(res.assets[0].uri).text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const error = validateBackup(parsed);
  if (error) throw new Error(error);
  return parsed as BackupFile;
}

/** Replaces the data of every profile in the backup. */
export function applyBackup(backup: BackupFile) {
  for (const p of backup.profiles) replaceProfileData(p.data, p.name);
}
