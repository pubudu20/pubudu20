/**
 * Shared by the app and the widget: load data, compute the game, and push the
 * result to the places outside the app (home-screen widget + notifications).
 */
import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { computeGame, type GameState } from '../core/engine';
import { logicalDayKey } from '../core/dates';
import { DEFAULT_PROFILE_ID } from '../core/defaults';
import type { AppData } from '../core/types';
import { loadAll, seedIfEmpty } from '../data/repo';
import { rescheduleAll } from '../notifications/scheduler';
import { BuilderWidget, WIDGET_NAME } from '../widget/BuilderWidget';

export const ACTIVE_PROFILE = DEFAULT_PROFILE_ID;

export function loadGame(profileId = ACTIVE_PROFILE): { data: AppData; game: GameState } {
  seedIfEmpty();
  const data = loadAll(profileId);
  const game = computeGame(data, logicalDayKey(new Date()));
  return { data, game };
}

export async function refreshWidget(data: AppData, game: GameState) {
  if (Platform.OS !== 'android') return;
  try {
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => <BuilderWidget data={data} game={game} />,
    });
  } catch (e) {
    console.warn('Widget update failed', e);
  }
}

/** Call after any change so the widget and reminders match the new data. */
export async function syncOutside(data: AppData, game: GameState) {
  await Promise.all([refreshWidget(data, game), rescheduleAll(data, game)]);
}
