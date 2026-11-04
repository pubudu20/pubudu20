/**
 * Runs in the background whenever the widget is added, refreshed (every 30
 * min, so it rolls over after 3 am) or tapped.
 */
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { logicalDayKey } from '../core/dates';
import { setCheck } from '../data/repo';
import { emitDataChanged } from '../state/events';
import { ACTIVE_PROFILE, loadGame } from '../state/sync';
import { rescheduleAll } from '../notifications/scheduler';
import { BuilderWidget, TOGGLE_ACTION } from './BuilderWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, clickAction, clickActionData, renderWidget } = props;
  try {
    if (widgetAction === 'WIDGET_DELETED') return;

    if (widgetAction === 'WIDGET_CLICK' && clickAction === TOGGLE_ACTION) {
      const habitId = String(clickActionData?.habitId ?? '');
      const tappedDay = String(clickActionData?.day ?? '');
      const today = logicalDayKey(new Date());
      // Only tick if the widget was showing today (a stale widget just refreshes).
      if (habitId && tappedDay === today) {
        const before = loadGame();
        const isDone = before.game.days.get(today)?.done.includes(habitId) ?? false;
        setCheck(ACTIVE_PROFILE, today, habitId, isDone ? null : 'done');
      }
    }

    const { data, game } = loadGame();
    renderWidget(<BuilderWidget data={data} game={game} />);

    if (widgetAction === 'WIDGET_CLICK') {
      emitDataChanged(); // let the open app (if any) reload
      await rescheduleAll(data, game); // drop the reminder for a ticked habit
    }
  } catch (e) {
    console.warn('Widget task failed', e);
  }
}
