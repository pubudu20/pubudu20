/**
 * The Wall: one brick per day of the challenge, laid in staggered courses from
 * the bottom up (7 bricks per course, every other course shifted half a brick).
 * Colour shows completion: concrete (nothing) → amber tint (partial) → full
 * amber (perfect day). Today is outlined; future days are ghost outlines.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { addDays, prettyDay, type DayKey } from '../core/dates';
import { useStore } from '../state/store';
import { Card, Row, Screen, T } from '../ui/components';
import { colors, fonts, space } from '../ui/theme';
import { tapHaptic } from '../ui/feedback';

const PER_COURSE = 7;
const GAP = 4;

/** Blend concrete grey → amber by `t` (0…1). */
function brickColor(t: number): string {
  const a = [0x2e, 0x33, 0x37];
  const b = [0xff, 0xb0, 0x00];
  const mix = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

export function WallScreen() {
  const { game } = useStore();
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();
  const len = game.cycle.lengthDays;

  // Brick size: 7 bricks + half-brick offset must fit the screen width.
  const usable = Math.min(width, 520) - space.lg * 2;
  const brickW = (usable - GAP * PER_COURSE) / (PER_COURSE + 0.5);
  const brickH = Math.max(18, Math.round(brickW * 0.46));

  const courses: number[][] = [];
  for (let i = 0; i < len; i += PER_COURSE) {
    courses.push(Array.from({ length: Math.min(PER_COURSE, len - i) }, (_, k) => i + k));
  }

  let perfect = 0;
  let laid = 0;
  for (let i = 0; i < len; i++) {
    const info = game.days.get(addDays(game.cycle.startDay, i));
    if (info?.perfect) perfect++;
    if (info && info.done.length > 0) laid++;
  }
  const daysLeft = Math.max(0, len - Math.max(game.dayNumber, 0));

  const brick = (index: number) => {
    const day: DayKey = addDays(game.cycle.startDay, index);
    const isFuture = day > game.today;
    const isToday = day === game.today;
    const info = game.days.get(day);
    const ratio = info && info.scheduled.length ? info.scheduled.filter((id) => info.done.includes(id)).length / info.scheduled.length : 0;
    const frozen = !!info?.frozen.length;
    const fill = isFuture ? 'transparent' : info?.perfect ? colors.amber : brickColor(ratio * 0.7);
    const label = `Day ${index + 1}, ${prettyDay(day)}${
      isFuture ? ', not yet' : info?.perfect ? ', perfect day' : `, ${Math.round(ratio * 100)}% done`
    }`;
    return (
      <Pressable
        key={index}
        disabled={isFuture}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          tapHaptic();
          nav.navigate('Day', { day });
        }}
        style={({ pressed }) => [
          {
            width: brickW,
            height: brickH,
            marginRight: GAP,
            borderRadius: 3,
            backgroundColor: fill,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          },
          isFuture && styles.ghost,
          isToday && styles.today,
          frozen && !isToday && { borderWidth: 1.5, borderColor: colors.ice },
        ]}
      >
        <Text
          style={[
            styles.brickNum,
            { color: info?.perfect ? colors.onAmber : isFuture ? colors.faint : ratio > 0.5 ? colors.onAmber : colors.muted },
          ]}
        >
          {index + 1}
        </Text>
      </Pressable>
    );
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={styles.big}>
            DAY {game.displayDay}
            <Text style={styles.of}> / {len}</Text>
          </Text>
          <T v="small">
            {perfect} perfect · {laid} laid · {daysLeft} to go
          </T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T v="mono" style={{ color: colors.amber }}>
            {Math.round((perfect / len) * 100)}%
          </T>
          <T v="small">perfect</T>
        </View>
      </Row>

      <Card style={{ marginTop: space.lg, paddingHorizontal: space.sm, alignItems: 'center' }}>
        {/* column-reverse: the first course sits at the bottom of the wall */}
        <View style={{ flexDirection: 'column-reverse' }}>
          {courses.map((course, ci) => (
            <View key={ci} style={{ flexDirection: 'row', marginTop: GAP, paddingLeft: ci % 2 ? brickW / 2 + GAP / 2 : 0 }}>
              {course.map(brick)}
            </View>
          ))}
        </View>
        <View style={styles.ground} />
      </Card>

      <Row style={{ marginTop: space.md, flexWrap: 'wrap', gap: space.md }}>
        <Legend color={brickColor(0)} label="Nothing" />
        <Legend color={brickColor(0.35)} label="Partial" />
        <Legend color={colors.amber} label="Perfect" />
        <Legend color="transparent" label="Today" outline={colors.text} />
        <Legend color="transparent" label="Freeze used" outline={colors.ice} />
      </Row>
      <T v="small" style={{ marginTop: space.md }}>
        Tap any past brick to view or edit that day.
      </T>
    </Screen>
  );
}

function Legend({ color, label, outline }: { color: string; label: string; outline?: string }) {
  return (
    <Row style={{ gap: 6 }}>
      <View style={{ width: 18, height: 10, borderRadius: 2, backgroundColor: color, borderWidth: outline ? 1.5 : 0, borderColor: outline }} />
      <T v="small">{label}</T>
    </Row>
  );
}

const styles = StyleSheet.create({
  big: { fontFamily: fonts.display, fontSize: 40, color: colors.amber, lineHeight: 44 },
  of: { fontFamily: fonts.displaySemi, fontSize: 22, color: colors.muted },
  ghost: { borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed' },
  today: { borderWidth: 2.5, borderColor: colors.text },
  brickNum: { fontFamily: fonts.mono, fontSize: 9 },
  ground: { height: 4, alignSelf: 'stretch', backgroundColor: colors.line, marginTop: GAP, borderRadius: 2 },
});
