/** Stats & charts, drawn with react-native-svg (no chart library needed). */
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { parseDayKey, prettyDay, WEEKDAY_LONG, WEEKDAY_SHORT } from '../core/dates';
import { bestAndWorstWeekday, habitCompletion, weekdayRates, weeklyXp, weightSeries } from '../core/stats';
import { useStore } from '../state/store';
import { Card, Row, Screen, Section, T } from '../ui/components';
import { colors, fonts, space } from '../ui/theme';

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

export function StatsScreen() {
  const { data, game } = useStore();
  const { width } = useWindowDimensions();
  const chartW = Math.min(width, 560) - space.lg * 4;

  const completion = habitCompletion(data, game);
  const rates = weekdayRates(game);
  const { best, worst } = bestAndWorstWeekday(rates);
  const weeks = weeklyXp(game);
  const weight = weightSeries(data, game);
  const bestStreak = Math.max(0, ...Object.values(game.habitStats).map((s) => s.best));

  return (
    <Screen>
      <View style={styles.tiles}>
        <Tile value={game.xpTotal.toLocaleString()} label="Total XP" />
        <Tile value={String(game.perfectDaysCycle)} label="Perfect days" />
        <Tile value={String(bestStreak)} label="Best streak" />
        <Tile value={String(game.freezeTokens)} label="Freezes" />
      </View>

      <Section title="Weight trend">
        <Card>
          {weight.length < 2 ? (
            <T v="small">Log your weight on at least two days (Today screen) to see the trend.</T>
          ) : (
            <WeightChart points={weight} width={chartW} />
          )}
        </Card>
      </Section>

      <Section title="Completion by habit">
        <Card>
          <Row style={{ gap: space.md, marginBottom: space.sm }}>
            <Key color={colors.amber} label="Cycle so far" />
            <Key color={colors.blue} label="Last 7 days" />
          </Row>
          {completion.map((c) => (
            <View key={c.habitId} style={{ marginBottom: space.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="small" style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
                  {c.name}
                </T>
                <T v="mono" style={{ fontSize: 12 }}>
                  {pct(c.window)} · <Text style={{ color: colors.blue }}>{pct(c.last7)}</Text>
                </T>
              </Row>
              <Bar value={c.window ?? 0} color={colors.amber} />
              <Bar value={c.last7 ?? 0} color={colors.blue} thin />
            </View>
          ))}
        </Card>
      </Section>

      <Section title="By weekday">
        <Card>
          {best && worst ? (
            <T v="small" style={{ marginBottom: space.sm, color: colors.text }}>
              Best: <Text style={{ color: colors.amber }}>{WEEKDAY_LONG[best.weekday]} {pct(best.rate)}</Text> · Worst:{' '}
              <Text style={{ color: colors.red }}>{WEEKDAY_LONG[worst.weekday]} {pct(worst.rate)}</Text>
            </T>
          ) : (
            <T v="small">Needs at least one finished day.</T>
          )}
          <WeekdayChart rates={rates} best={best?.weekday} worst={worst?.weekday} width={chartW} />
        </Card>
      </Section>

      <Section title="XP per week">
        <Card>
          {weeks.length === 0 ? <T v="small">No weeks yet.</T> : <WeeklyXpChart weeks={weeks} width={chartW} />}
        </Card>
      </Section>

      <Section title="Streaks">
        <Card>
          {data.habits
            .filter((h) => !h.archivedFrom || h.archivedFrom > game.today)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((h) => (
              <Row key={h.id} style={styles.streakRow}>
                <T v="small" style={{ flex: 1, color: colors.text }} numberOfLines={1}>
                  {h.name}
                </T>
                <T v="mono" style={{ width: 64, textAlign: 'right', color: colors.amber }}>
                  🔥 {game.habitStats[h.id]?.live ?? 0}
                </T>
                <T v="mono" style={{ width: 72, textAlign: 'right', color: colors.muted }}>
                  best {game.habitStats[h.id]?.best ?? 0}
                </T>
              </Row>
            ))}
        </Card>
      </Section>
    </Screen>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  return (
    <Row style={{ gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
      <T v="small">{label}</T>
    </Row>
  );
}

function Bar({ value, color, thin }: { value: number; color: string; thin?: boolean }) {
  const h = thin ? 4 : 8;
  return (
    <View style={{ height: h, backgroundColor: colors.surface3, borderRadius: h / 2, marginTop: 4, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: h, backgroundColor: color }} />
    </View>
  );
}

function WeightChart({ points, width }: { points: { day: string; kg: number }[]; width: number }) {
  const height = 160;
  const padL = 36;
  const padB = 20;
  const min = Math.min(...points.map((p) => p.kg));
  const max = Math.max(...points.map((p) => p.kg));
  const lo = Math.floor(min - 0.5);
  const hi = Math.ceil(max + 0.5);
  const x = (i: number) => padL + (i / (points.length - 1)) * (width - padL - 8);
  const y = (kg: number) => 8 + (1 - (kg - lo) / (hi - lo)) * (height - padB - 8);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const delta = Math.round((last.kg - first.kg) * 10) / 10;
  return (
    <View accessible accessibilityLabel={`Weight from ${first.kg} to ${last.kg} kilograms`}>
      <Svg width={width} height={height}>
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <React.Fragment key={v}>
            <Line x1={padL} x2={width} y1={y(v)} y2={y(v)} stroke={colors.line} strokeWidth={1} />
            <SvgText x={0} y={y(v) + 4} fill={colors.faint} fontSize={10} fontFamily={fonts.mono}>
              {v.toFixed(v % 1 ? 1 : 0)}
            </SvgText>
          </React.Fragment>
        ))}
        <Path d={d} stroke={colors.amber} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        {points.map((p, i) => (
          <Circle key={p.day} cx={x(i)} cy={y(p.kg)} r={3} fill={colors.amber} />
        ))}
        <SvgText x={padL} y={height - 4} fill={colors.faint} fontSize={10} fontFamily={fonts.mono}>
          {prettyDay(first.day)}
        </SvgText>
        <SvgText x={width - 4} y={height - 4} fill={colors.faint} fontSize={10} fontFamily={fonts.mono} textAnchor="end">
          {prettyDay(last.day)}
        </SvgText>
      </Svg>
      <T v="small" style={{ marginTop: 4 }}>
        Latest {last.kg} kg · {delta > 0 ? '+' : ''}
        {delta} kg since {prettyDay(first.day)}
      </T>
    </View>
  );
}

function WeekdayChart({
  rates,
  best,
  worst,
  width,
}: {
  rates: { weekday: number; rate: number | null }[];
  best?: number;
  worst?: number;
  width: number;
}) {
  const height = 130;
  // Monday first
  const order = [1, 2, 3, 4, 5, 6, 0];
  const slot = width / 7;
  const barW = slot * 0.6;
  return (
    <Svg width={width} height={height}>
      {order.map((wd, i) => {
        const r = rates[wd].rate;
        const h = (r ?? 0) * (height - 34);
        const color = wd === best ? colors.amber : wd === worst ? colors.red : colors.surface3;
        const x = i * slot + (slot - barW) / 2;
        return (
          <React.Fragment key={wd}>
            <Rect x={x} y={height - 18 - h} width={barW} height={Math.max(h, 2)} rx={3} fill={color} />
            <SvgText x={x + barW / 2} y={height - 4} fill={colors.muted} fontSize={11} textAnchor="middle" fontFamily={fonts.body}>
              {WEEKDAY_SHORT[wd]}
            </SvgText>
            {r !== null && (
              <SvgText x={x + barW / 2} y={height - 22 - h} fill={colors.text} fontSize={10} textAnchor="middle" fontFamily={fonts.mono}>
                {Math.round(r * 100)}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function WeeklyXpChart({ weeks, width }: { weeks: { weekStart: string; xp: number }[]; width: number }) {
  const height = 140;
  const shown = weeks.slice(-10); // last 10 weeks fit comfortably
  const max = Math.max(1, ...shown.map((w) => w.xp));
  const slot = width / Math.max(shown.length, 4);
  const barW = slot * 0.62;
  return (
    <Svg width={width} height={height}>
      {shown.map((w, i) => {
        const h = (w.xp / max) * (height - 34);
        const x = i * slot + (slot - barW) / 2;
        const { d, m } = parseDayKey(w.weekStart);
        return (
          <React.Fragment key={w.weekStart}>
            <Rect x={x} y={height - 18 - h} width={barW} height={Math.max(h, 2)} rx={3} fill={i === shown.length - 1 ? colors.amber : colors.amberDim} />
            <SvgText x={x + barW / 2} y={height - 22 - h} fill={colors.text} fontSize={10} textAnchor="middle" fontFamily={fonts.mono}>
              {w.xp}
            </SvgText>
            <SvgText x={x + barW / 2} y={height - 4} fill={colors.muted} fontSize={10} textAnchor="middle" fontFamily={fonts.mono}>
              {`${d}/${m}`}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  tileValue: { fontFamily: fonts.display, fontSize: 32, color: colors.amber },
  tileLabel: { fontFamily: fonts.displaySemi, fontSize: 12, color: colors.muted, letterSpacing: 1.2 },
  streakRow: { minHeight: 36, borderBottomWidth: 1, borderBottomColor: colors.line },
});
