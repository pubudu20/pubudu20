/** One habit as a big tappable row: checkbox, name, time slot, streak and XP. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HABIT_HINTS } from '../core/defaults';
import { RULES } from '../core/engine';
import type { CheckStatus, Habit } from '../core/types';
import { colors, fonts, radius, space } from './theme';
import { FloatingXp, tapHaptic, tickHaptic } from './feedback';

export function HabitRow({
  habit,
  status,
  live,
  best,
  onToggle,
}: {
  habit: Habit;
  status: CheckStatus | undefined;
  live: number;
  best: number;
  onToggle: (next: CheckStatus | null) => void;
}) {
  const [floatKey, setFloatKey] = useState(0);
  const done = status === 'done';
  const frozen = status === 'freeze';
  // XP this tick is worth (includes the streak bonus once the streak hits 7).
  const willHaveStreak = done ? live : live + 1;
  const xp = habit.xp + (willHaveStreak >= RULES.streakBonusFrom ? RULES.streakBonusXp : 0);
  const hint = habit.key ? HABIT_HINTS[habit.key] : undefined;

  const press = () => {
    if (done) {
      tapHaptic();
      onToggle(null);
    } else {
      tickHaptic();
      setFloatKey((k) => k + 1);
      onToggle('done');
    }
  };

  return (
    <Pressable
      onPress={press}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`${habit.name}, ${habit.slot}, ${done ? 'done' : frozen ? 'frozen' : 'not done'}, ${xp} XP`}
      style={({ pressed }) => [styles.row, done && styles.rowDone, frozen && styles.rowFrozen, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.box, done && styles.boxDone, frozen && styles.boxFrozen]}>
        {done ? <Text style={styles.tick}>✓</Text> : frozen ? <Text style={styles.ice}>❄</Text> : null}
      </View>
      <View style={{ flex: 1, marginLeft: space.md }}>
        <Text style={[styles.name, done && { color: colors.muted }]} numberOfLines={2}>
          {habit.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {habit.slot}
          {hint ? ` · ${hint}` : ''}
        </Text>
        {(live > 0 || best > 0) && (
          <Text style={styles.streak}>
            🔥 {live}
            <Text style={{ color: colors.faint }}>{`  best ${best}`}</Text>
          </Text>
        )}
      </View>
      <Text style={[styles.xp, done && { color: colors.amberDim }]}>+{xp}</Text>
      <FloatingXp text={`+${xp} XP`} trigger={floatKey} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: space.sm,
  },
  rowDone: { backgroundColor: '#1A1C1E', borderColor: '#2A2E32' },
  rowFrozen: { borderColor: colors.ice },
  box: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: { backgroundColor: colors.amber, borderColor: colors.amber },
  boxFrozen: { borderColor: colors.ice },
  tick: { color: colors.onAmber, fontSize: 20, fontFamily: fonts.bodyBold, marginTop: -1 },
  ice: { color: colors.ice, fontSize: 18 },
  name: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12.5, marginTop: 1 },
  streak: { color: colors.amber, fontFamily: fonts.mono, fontSize: 12, marginTop: 2 },
  xp: { color: colors.amber, fontFamily: fonts.display, fontSize: 22, marginLeft: space.sm },
});
