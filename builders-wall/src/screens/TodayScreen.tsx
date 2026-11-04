/** Today: the HUD, motto + vision, warnings, and today's habits. */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { daysSinceExport } from '../core/backup';
import { prettyDay, prettyDate } from '../core/dates';
import { buildCheckMap } from '../core/engine';
import { useStore } from '../state/store';
import { Button, Card, ProgressBar, Row, Screen, Section, T } from '../ui/components';
import { HabitRow } from '../ui/HabitRow';
import { WeightInput } from '../ui/WeightInput';
import { colors, fonts, space } from '../ui/theme';

export function TodayScreen() {
  const { data, game, setCheck } = useStore();
  const nav = useNavigation<any>();
  const statuses = buildCheckMap(data).get(game.today);
  const total = game.todayHabits.length;
  const vision = data.settings.visions[game.visionIndex] ?? '';
  const exportAge = daysSinceExport(data.settings.lastExportAt, data.settings.installedAt, new Date());
  const habitName = (id: string) => data.habits.find((h) => h.id === id)?.name ?? '';

  return (
    <Screen>
      {/* ---- HUD ---- */}
      <Card style={styles.hud}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={styles.dayBig}>
              DAY {game.displayDay}
              <Text style={styles.dayOf}> OF {game.cycle.lengthDays}</Text>
            </Text>
            <T v="small">{prettyDay(game.today)}</T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.lvl}>LV {game.level.level}</Text>
            <Text style={styles.lvlName}>{game.level.name.toUpperCase()}</Text>
          </View>
        </Row>
        <View style={{ marginTop: space.md }}>
          <ProgressBar value={game.level.progress} />
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <T v="mono" style={{ color: colors.muted }}>
              {game.xpTotal.toLocaleString()} XP
            </T>
            <T v="mono" style={{ color: colors.muted }}>
              {game.level.nextXp ? `${(game.level.nextXp - game.xpTotal).toLocaleString()} to ${game.level.nextName}` : 'MAX RANK'}
            </T>
          </Row>
        </View>
        <Row style={styles.hudStats}>
          <Stat glyph="🪙" value={game.coins} label="coins" />
          <Stat glyph="🧊" value={game.freezeTokens} label="freezes" />
          <Stat glyph="🔥" value={game.bestLive.value} label="best streak" />
          <Stat glyph="⭐" value={game.perfectDaysCycle} label="perfect" />
        </Row>
      </Card>

      {/* ---- Identity ---- */}
      <View style={styles.motto}>
        <Text style={styles.mottoText}>“{data.settings.motto}”</Text>
        {!!vision && <T v="small" style={{ marginTop: 6, color: colors.text, opacity: 0.85 }}>{vision}</T>}
      </View>

      {game.cycleOver && (
        <Card style={[styles.banner, { borderColor: colors.amber }]}>
          <T v="h2">🏛️ Wall complete</T>
          <T v="small" style={{ marginBottom: space.md }}>
            The window ended on {prettyDate(game.cycleEnd)}. Start a new cycle whenever you're ready — your history stays.
          </T>
          <Button title="Start a new cycle" onPress={() => nav.navigate('Settings')} />
        </Card>
      )}

      {exportAge >= 7 && (
        <Card style={styles.banner}>
          <T v="bodyBold">💾 Back up your wall</T>
          <T v="small" style={{ marginBottom: space.sm }}>
            {data.settings.lastExportAt ? `Last backup ${exportAge} days ago.` : 'You haven’t made a backup yet.'} It takes 10
            seconds.
          </T>
          <Button title="Back up now" small kind="ghost" onPress={() => nav.navigate('Settings', { focus: 'backup' })} />
        </Card>
      )}

      {/* ---- Don't miss twice ---- */}
      {game.warnings.map((w) => (
        <Card key={w.habitId} style={[styles.banner, { borderColor: colors.red, backgroundColor: colors.redSoft }]}>
          <T v="bodyBold" style={{ color: colors.red }}>
            ⚠ Don’t miss twice
          </T>
          <T v="small" style={{ color: colors.text }}>
            {habitName(w.habitId)} was missed on {prettyDay(w.missedDay)}. Do it today to keep the wall standing.
          </T>
          <Row style={{ marginTop: space.sm, gap: space.sm }}>
            <Button
              title={`Use freeze (${game.freezeTokens})`}
              kind="ice"
              small
              disabled={game.freezeTokens < 1}
              onPress={() => setCheck(w.missedDay, w.habitId, 'freeze')}
              accessibilityLabel={`Use a streak freeze for ${habitName(w.habitId)} on ${prettyDay(w.missedDay)}`}
            />
            {game.freezeTokens < 1 && (
              <T v="small" style={{ flex: 1 }}>
                Earn freezes with 5 perfect days in a week.
              </T>
            )}
          </Row>
        </Card>
      ))}

      {/* ---- Habits ---- */}
      <Section
        title={`Today's bricks`}
        right={
          <T v="mono" style={{ color: game.todayPerfect ? colors.amber : colors.text }}>
            {game.todayDoneCount}/{total}
          </T>
        }
      >
        <View style={{ marginBottom: space.md }}>
          <ProgressBar value={total ? game.todayDoneCount / total : 0} height={6} />
        </View>
        {game.todayPerfect && (
          <T v="bodyBold" style={{ color: colors.amber, marginBottom: space.sm }}>
            ⭐ Perfect day — every brick laid. +50 XP
          </T>
        )}
        {total === 0 && <T v="small">Nothing scheduled today. Rest is part of building.</T>}
        {game.todayHabits.map((h) => (
          <HabitRow
            key={h.id}
            habit={h}
            status={statuses?.get(h.id)}
            live={game.habitStats[h.id]?.live ?? 0}
            best={game.habitStats[h.id]?.best ?? 0}
            onToggle={(s) => setCheck(game.today, h.id, s)}
          />
        ))}
      </Section>

      <Section title="Weight (optional)">
        <WeightInput day={game.today} />
      </Section>

      <Button
        title="Edit another day"
        kind="ghost"
        style={{ marginTop: space.xl }}
        onPress={() => nav.navigate('Wall')}
      />
    </Screen>
  );
}

function Stat({ glyph, value, label }: { glyph: string; value: number; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={styles.statValue}>
        {glyph} {value}
      </Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { borderColor: colors.amberDim, borderWidth: 1.5 },
  dayBig: { fontFamily: fonts.display, fontSize: 44, color: colors.amber, lineHeight: 48 },
  dayOf: { fontFamily: fonts.displaySemi, fontSize: 22, color: colors.muted },
  lvl: { fontFamily: fonts.display, fontSize: 30, color: colors.text, lineHeight: 34 },
  lvlName: { fontFamily: fonts.displaySemi, fontSize: 14, color: colors.amber, letterSpacing: 1 },
  hudStats: { justifyContent: 'space-between', marginTop: space.md },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontFamily: fonts.mono, fontSize: 16, color: colors.text },
  statLabel: { fontFamily: fonts.displaySemi, fontSize: 11, color: colors.faint, letterSpacing: 1, marginTop: 2 },
  motto: {
    marginTop: space.lg,
    paddingLeft: space.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
  },
  mottoText: { fontFamily: fonts.display, fontSize: 22, color: colors.text, letterSpacing: 0.3 },
  banner: { marginTop: space.md },
});
