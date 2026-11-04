/** View and edit a single day (opened by tapping a brick on the Wall). */
import React, { useLayoutEffect } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { diffDays, prettyDay, type DayKey } from '../core/dates';
import { buildCheckMap, isScheduled } from '../core/engine';
import { useStore } from '../state/store';
import { Button, Card, Row, Screen, Section, T } from '../ui/components';
import { HabitRow } from '../ui/HabitRow';
import { WeightInput } from '../ui/WeightInput';
import { colors, space } from '../ui/theme';

export function DayScreen() {
  const { data, game, setCheck } = useStore();
  const nav = useNavigation<any>();
  const day = (useRoute().params as { day: DayKey }).day;
  const dayNo = diffDays(game.cycle.startDay, day) + 1;

  useLayoutEffect(() => {
    nav.setOptions({ title: dayNo >= 1 ? `Day ${dayNo} · ${prettyDay(day)}` : prettyDay(day) });
  }, [nav, day, dayNo]);

  if (day > game.today) {
    return (
      <Screen>
        <T v="body">This day hasn't happened yet.</T>
      </Screen>
    );
  }

  const statuses = buildCheckMap(data).get(day);
  const info = game.days.get(day);
  const habits = [...data.habits].filter((h) => isScheduled(h, day)).sort((a, b) => a.sortOrder - b.sortOrder);
  const doneCount = habits.filter((h) => statuses?.get(h.id) === 'done').length;

  return (
    <Screen>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h2">
            {doneCount}/{habits.length} done
          </T>
          <T v="mono" style={{ color: colors.amber }}>
            +{info?.xp ?? 0} XP
          </T>
        </Row>
        {info?.perfect && (
          <T v="bodyBold" style={{ color: colors.amber, marginTop: 4 }}>
            ⭐ Perfect day
          </T>
        )}
        {day < game.today && (
          <T v="small" style={{ marginTop: 4 }}>
            Editing a past day recalculates XP, streaks and goals.
          </T>
        )}
      </Card>

      <Section title="Habits">
        {habits.length === 0 && <T v="small">Nothing was scheduled this day.</T>}
        {habits.map((h) => (
          <View key={h.id}>
            <HabitRow
              habit={h}
              status={statuses?.get(h.id)}
              live={game.habitStats[h.id]?.live ?? 0}
              best={game.habitStats[h.id]?.best ?? 0}
              onToggle={(s) => setCheck(day, h.id, s)}
            />
            {statuses?.get(h.id) === 'freeze' && (
              <Row style={{ marginTop: -4, marginBottom: space.sm, gap: space.sm }}>
                <T v="small" style={{ flex: 1, color: colors.ice }}>
                  ❄ Streak freeze used (protects the streak, doesn't count for goals).
                </T>
                <Button title="Remove" small kind="ghost" onPress={() => setCheck(day, h.id, null)} />
              </Row>
            )}
          </View>
        ))}
      </Section>

      <Section title="Weight (optional)">
        <WeightInput day={day} />
      </Section>
    </Screen>
  );
}
