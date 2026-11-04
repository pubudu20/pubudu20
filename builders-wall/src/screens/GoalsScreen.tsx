/** Goals (100-day habit targets with spare "lives"), Quests, and Badges. */
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { prettyDay, prettyDate, type DayKey } from '../core/dates';
import type { GoalProgress, QuestProgress } from '../core/engine';
import type { QuestEntry } from '../core/types';
import { deleteQuestEntry, newId, saveQuestEntry } from '../data/repo';
import { useStore } from '../state/store';
import { Button, Card, DayStepper, Field, IconButton, Pips, ProgressBar, Row, Screen, Section, Sheet, T } from '../ui/components';
import { colors, fonts, radius, space } from '../ui/theme';
import { successHaptic } from '../ui/feedback';

const DANGER_LIVES = 5;

export function GoalsScreen() {
  const { game, badges } = useStore();
  const [entrySheet, setEntrySheet] = useState<{ questId: string; entry?: QuestEntry } | null>(null);
  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <Screen>
      <T v="small">
        Due {prettyDate(game.cycleEnd)} · Day {game.displayDay} of {game.cycle.lengthDays}
      </T>

      <Section title="100-day goals">
        {game.goals.length === 0 && <T v="small">No goals yet. Add one in Settings.</T>}
        {game.goals.map((g) => (
          <GoalCard key={g.goal.id} g={g} />
        ))}
      </Section>

      <Section title="Quests">
        {game.quests.map((q) => (
          <QuestCard
            key={q.quest.id}
            q={q}
            onAdd={() => setEntrySheet({ questId: q.quest.id })}
            onEdit={(entry) => setEntrySheet({ questId: q.quest.id, entry })}
          />
        ))}
      </Section>

      <Section title={`Badges · ${unlocked}/${badges.length}`}>
        <View style={styles.badgeGrid}>
          {badges.map((b) => (
            <View
              key={b.id}
              style={[styles.badge, b.unlocked ? styles.badgeOn : styles.badgeOff]}
              accessible
              accessibilityLabel={`${b.name}, ${b.unlocked ? 'unlocked' : 'locked'}. ${b.description}${b.progress ? `, ${b.progress}` : ''}`}
            >
              <Text style={[styles.badgeIcon, !b.unlocked && { opacity: 0.25 }]}>{b.unlocked ? b.icon : '🔒'}</Text>
              <Text style={[styles.badgeName, !b.unlocked && { color: colors.muted }]} numberOfLines={2}>
                {b.name}
              </Text>
              <Text style={styles.badgeDesc} numberOfLines={2}>
                {b.unlocked ? b.description : b.progress ?? b.description}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      {entrySheet && (
        <QuestEntrySheet questId={entrySheet.questId} entry={entrySheet.entry} onClose={() => setEntrySheet(null)} />
      )}
    </Screen>
  );
}

function GoalCard({ g }: { g: GoalProgress }) {
  const danger = g.spare <= DANGER_LIVES;
  const out = g.spare < 0 && !g.complete;
  const lifeColor = danger ? colors.red : colors.amber;
  return (
    <Card style={{ marginBottom: space.md }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <T v="bodyBold" style={{ flex: 1, marginRight: space.sm }}>
          {g.goal.title}
        </T>
        <T v="mono" style={{ fontSize: 16, color: g.complete ? colors.green : colors.text }}>
          {g.done}/{g.target}
        </T>
      </Row>
      <View style={{ marginVertical: space.sm }}>
        <ProgressBar value={g.done / Math.max(1, g.target)} color={g.complete ? colors.green : colors.amber} />
      </View>
      {g.complete ? (
        <T v="bodyBold" style={{ color: colors.green }}>
          ✓ Goal complete — every extra day is a bonus brick.
        </T>
      ) : out ? (
        <T v="small" style={{ color: colors.red }}>
          Out of spare days: {g.need} needed but only {g.remaining} days left. Keep going — every day still counts for XP.
        </T>
      ) : (
        <>
          <T v="small" style={{ color: colors.text }}>
            Need <Text style={{ color: colors.amber, fontFamily: fonts.mono }}>{g.need}</Text> of the next{' '}
            <Text style={{ fontFamily: fonts.mono }}>{g.remaining}</Text> days
          </T>
          <Row style={{ marginTop: space.sm, justifyContent: 'space-between' }}>
            <T v="label" style={{ color: lifeColor, fontSize: 13 }}>
              {danger ? '⚠ ' : ''}SPARE DAYS {g.spare}/{g.spareStart}
            </T>
          </Row>
          <View style={{ marginTop: 6 }}>
            <Pips total={Math.max(0, g.spareStart)} filled={Math.max(0, g.spare)} color={lifeColor} size={13} />
          </View>
        </>
      )}
    </Card>
  );
}

function QuestCard({ q, onAdd, onEdit }: { q: QuestProgress; onAdd: () => void; onEdit: (e: QuestEntry) => void }) {
  const { mutate } = useStore();
  const removeLatest = () => {
    const latest = q.entries[0];
    if (!latest) return;
    Alert.alert('Remove latest step?', `${prettyDay(latest.day)}${latest.note ? ` · ${latest.note}` : ''}\n−${q.quest.xpPerStep} XP`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => mutate((pid) => deleteQuestEntry(pid, latest.id)) },
    ]);
  };
  return (
    <Card style={{ marginBottom: space.md }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <T v="bodyBold">{q.quest.title}</T>
          <T v="small">
            +{q.quest.xpPerStep} XP each · {q.count}/{q.quest.target}
            {q.complete ? ' · ✓ complete' : ''}
          </T>
        </View>
        <Row style={{ gap: 8 }}>
          <IconButton label={`Remove a step from ${q.quest.title}`} glyph="−" onPress={removeLatest} disabled={!q.count} />
          <IconButton label={`Add a step to ${q.quest.title}`} glyph="+" onPress={onAdd} color={colors.amber} />
        </Row>
      </Row>
      <View style={{ marginTop: space.sm }}>
        <Pips total={Math.max(q.quest.target, q.count)} filled={q.count} size={22} />
      </View>
      {q.entries.map((e) => (
        <Pressable
          key={e.id}
          onPress={() => onEdit(e)}
          style={styles.entry}
          accessibilityRole="button"
          accessibilityLabel={`Edit entry ${prettyDay(e.day)} ${e.note}`}
        >
          <T v="mono" style={{ color: colors.muted, width: 92 }}>
            {prettyDay(e.day)}
          </T>
          <T v="small" style={{ flex: 1, color: colors.text }} numberOfLines={2}>
            {e.note || '—'}
          </T>
        </Pressable>
      ))}
    </Card>
  );
}

function QuestEntrySheet({ questId, entry, onClose }: { questId: string; entry?: QuestEntry; onClose: () => void }) {
  const { game, data, mutate } = useStore();
  const quest = data.quests.find((q) => q.id === questId);
  const [day, setDay] = useState<DayKey>(entry?.day ?? game.today);
  const [note, setNote] = useState(entry?.note ?? '');
  if (!quest) return null;

  const save = () => {
    mutate((pid) =>
      saveQuestEntry(pid, {
        id: entry?.id ?? newId('qe'),
        questId,
        day,
        note: note.trim(),
        createdAt: entry?.createdAt ?? new Date().toISOString(),
      }),
    );
    if (!entry) successHaptic();
    onClose();
  };
  const remove = () => {
    if (!entry) return;
    mutate((pid) => deleteQuestEntry(pid, entry.id));
    onClose();
  };

  return (
    <Sheet visible title={entry ? 'Edit step' : `+${quest.xpPerStep} XP · New step`} onClose={onClose}>
      <T v="small" style={{ marginBottom: space.sm }}>
        {quest.title}
      </T>
      <T v="small">Date</T>
      <DayStepper value={day} onChange={setDay} max={game.today} />
      <Field label="Note (what was it?)" value={note} onChangeText={setNote} placeholder="e.g. Sunset dinner at Galle Face" maxLength={140} />
      <Button title={entry ? 'Save' : 'Add step'} onPress={save} />
      {entry && <Button title="Delete step" kind="danger" onPress={remove} style={{ marginTop: space.sm }} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: space.sm,
    paddingTop: space.sm,
  },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  badge: {
    width: '31.5%',
    minHeight: 112,
    borderRadius: radius.md,
    padding: space.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  badgeOn: { backgroundColor: colors.amberSoft, borderColor: colors.amberDim },
  badgeOff: { backgroundColor: colors.surface, borderColor: colors.line },
  badgeIcon: { fontSize: 30, marginBottom: 4 },
  badgeName: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.text, textAlign: 'center' },
  badgeDesc: { fontFamily: fonts.body, fontSize: 11, color: colors.faint, textAlign: 'center', marginTop: 2 },
});
