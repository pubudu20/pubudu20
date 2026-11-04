/**
 * The Android home-screen widget. Widgets are not normal React Native views:
 * they're drawn with react-native-android-widget's own primitives
 * (FlexWidget, TextWidget, ListWidget) and every tap is sent to
 * widgetTaskHandler.tsx.
 */
import React from 'react';
import { FlexWidget, ListWidget, TextWidget } from 'react-native-android-widget';
import type { GameState } from '../core/engine';
import type { AppData } from '../core/types';

export const WIDGET_NAME = 'BuilderWall';
export const TOGGLE_ACTION = 'TOGGLE_HABIT';

type Hex = `#${string}`;
const c = {
  bg: '#16191C' as Hex,
  row: '#22262A' as Hex,
  rowDone: '#1D2024' as Hex,
  line: '#3A4046' as Hex,
  text: '#ECE9E2' as Hex,
  muted: '#9BA1A7' as Hex,
  amber: '#FFB000' as Hex,
  onAmber: '#1A1300' as Hex,
};
const DISPLAY_FONT = 'BigShouldersDisplay_800ExtraBold';

export function BuilderWidget({ game }: { data?: AppData; game: GameState }) {
  const done = new Set(game.days.get(game.today)?.done ?? []);
  const total = game.todayHabits.length;
  const header = game.cycleOver ? 'WALL COMPLETE' : `DAY ${game.displayDay} / ${game.cycle.lengthDays}`;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: c.bg,
        borderRadius: 18,
        padding: 12,
        flexDirection: 'column',
      }}
    >
      {/* Header — tap opens the app */}
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text={header} style={{ fontSize: 22, color: c.amber, fontFamily: DISPLAY_FONT }} />
          <TextWidget
            text={`Lv ${game.level.level} · ${game.level.name}  ·  🔥 ${game.bestLive.value}`}
            style={{ fontSize: 12, color: c.muted }}
          />
        </FlexWidget>
        <TextWidget
          text={`${game.todayDoneCount}/${total}`}
          style={{ fontSize: 26, color: c.text, fontFamily: DISPLAY_FONT }}
        />
      </FlexWidget>

      <FlexWidget style={{ height: 8, width: 'match_parent' }} />

      {/* Habit list — tap a row to tick / untick */}
      <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
        {game.todayHabits.map((h) => {
          const isDone = done.has(h.id);
          return (
            <FlexWidget
              key={h.id}
              clickAction={TOGGLE_ACTION}
              clickActionData={{ habitId: h.id, day: game.today }}
              accessibilityLabel={`${h.name}, ${isDone ? 'done' : 'not done'}`}
              style={{
                width: 'match_parent',
                height: 44,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDone ? c.rowDone : c.row,
                borderRadius: 10,
                paddingHorizontal: 10,
                marginBottom: 6,
              }}
            >
              <FlexWidget
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: isDone ? c.amber : c.line,
                  backgroundColor: isDone ? c.amber : c.row,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TextWidget text={isDone ? '✓' : ''} style={{ fontSize: 14, color: c.onAmber, fontWeight: 'bold' }} />
              </FlexWidget>
              <TextWidget
                text={h.name}
                truncate="END"
                maxLines={1}
                style={{ fontSize: 14, color: isDone ? c.muted : c.text, marginLeft: 10, width: 'match_parent' }}
              />
            </FlexWidget>
          );
        })}
      </ListWidget>
      {total === 0 ? <TextWidget text="Rest day — nothing scheduled" style={{ fontSize: 13, color: c.muted }} /> : null}
    </FlexWidget>
  );
}
