/**
 * Settings: profile, habits, goals, quests, notifications, challenge window,
 * widget and backup.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View, type ScrollViewInstance } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { requestPinWidget } from 'react-native-android-widget';
import { addDays, diffDays, prettyDate, prettyDay, WEEKDAY_SHORT, type DayKey } from '../core/dates';
import { CYCLE_LENGTH } from '../core/defaults';
import { activeHabits, cycleEndDay } from '../core/engine';
import type { Goal, Habit, NotificationSettings, Quest } from '../core/types';
import * as repo from '../data/repo';
import { applyBackup, exportBackup, pickBackup } from '../data/backupFile';
import { hasPermission, requestPermission } from '../notifications/scheduler';
import { useStore } from '../state/store';
import { WIDGET_NAME } from '../widget/BuilderWidget';
import {
  Button,
  Card,
  Chip,
  DayStepper,
  Field,
  IconButton,
  Row,
  Section,
  Sheet,
  Stepper,
  T,
  TimeStepper,
  styles as ui,
} from '../ui/components';
import { colors, space } from '../ui/theme';

export function SettingsScreen() {
  const { data, game, mutate } = useStore();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const backupY = useRef(0);
  const focus = (useRoute().params as { focus?: string } | undefined)?.focus;

  const [habitSheet, setHabitSheet] = useState<Habit | 'new' | null>(null);
  const [goalSheet, setGoalSheet] = useState<Goal | 'new' | null>(null);
  const [questSheet, setQuestSheet] = useState<Quest | 'new' | null>(null);
  const [cycleSheet, setCycleSheet] = useState(false);
  const [profileSheet, setProfileSheet] = useState(false);
  const [notifAllowed, setNotifAllowed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hasPermission().then(setNotifAllowed).catch(() => setNotifAllowed(false));
  }, []);
  useEffect(() => {
    if (focus === 'backup') setTimeout(() => scrollRef.current?.scrollTo({ y: backupY.current, animated: true }), 300);
  }, [focus]);

  const habits = activeHabits(data.habits, game.today);
  const n = data.settings.notifications;
  const setNotif = (patch: Partial<NotificationSettings>) =>
    mutate((pid) => repo.saveSettings(pid, { notifications: { ...n, ...patch } }));

  const move = (index: number, dir: -1 | 1) => {
    const ids = habits.map((h) => h.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    // Keep archived habits after the active ones.
    const archived = data.habits.filter((h) => !ids.includes(h.id)).map((h) => h.id);
    mutate((pid) => repo.reorderHabits(pid, [...ids, ...archived]));
  };

  const doExport = async () => {
    setBusy(true);
    try {
      await exportBackup();
      mutate(() => {}); // reload so "last backup" updates
    } catch (e) {
      Alert.alert('Backup failed', String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    try {
      const backup = await pickBackup();
      if (!backup) return;
      const p = backup.profiles[0];
      Alert.alert(
        'Restore this backup?',
        `Backup from ${new Date(backup.exportedAt).toLocaleString()}\n${p.data.checks.length} ticks · ${p.data.habits.length} habits.\n\nThis REPLACES everything currently in the app.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace my data',
            style: 'destructive',
            onPress: () => {
              mutate(() => applyBackup(backup));
              Alert.alert('Restored', 'Your wall is back.');
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert('Could not restore', String((e as Error).message ?? e));
    }
  };

  return (
    <ScrollView ref={scrollRef} style={ui.screen} contentContainerStyle={[ui.screenContent, { paddingBottom: 48 + insets.bottom }]} keyboardShouldPersistTaps="handled">
      {/* ---- Profile ---- */}
      <Section title="Profile" right={<Button title="Edit" small kind="ghost" onPress={() => setProfileSheet(true)} />}>
        <Card>
          <T v="h2">{data.settings.name}</T>
          <T v="small">“{data.settings.motto}”</T>
          <T v="small" style={{ marginTop: 4 }}>
            {data.settings.visions.length} vision statements (one shown per day)
          </T>
        </Card>
      </Section>

      {/* ---- Habits ---- */}
      <Section title="Habits" right={<Button title="+ Add" small kind="ghost" onPress={() => setHabitSheet('new')} />}>
        {habits.map((h, i) => (
          <Card key={h.id} style={{ marginBottom: space.sm, paddingVertical: space.sm }}>
            <Row>
              <Pressable
                style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
                onPress={() => setHabitSheet(h)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${h.name}`}
              >
                <T v="bodyBold" numberOfLines={1}>
                  {h.name}
                </T>
                <T v="small" numberOfLines={1}>
                  {h.slot} · {h.xp} XP · {daysLabel(h.days)}
                  {h.reminderOn && h.reminderTime ? ' · 🔔' : ''}
                </T>
              </Pressable>
              <IconButton label={`Move ${h.name} up`} glyph="▲" onPress={() => move(i, -1)} disabled={i === 0} />
              <View style={{ width: 6 }} />
              <IconButton label={`Move ${h.name} down`} glyph="▼" onPress={() => move(i, 1)} disabled={i === habits.length - 1} />
            </Row>
          </Card>
        ))}
      </Section>

      {/* ---- Goals ---- */}
      <Section title="Goals" right={<Button title="+ Add" small kind="ghost" onPress={() => setGoalSheet('new')} />}>
        {[...data.goals]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((g) => (
            <ListItem key={g.id} title={g.title} sub={`${g.target} days of ${data.habits.find((h) => h.id === g.habitId)?.name ?? '?'}`} onPress={() => setGoalSheet(g)} />
          ))}
      </Section>

      {/* ---- Quests ---- */}
      <Section title="Quests" right={<Button title="+ Add" small kind="ghost" onPress={() => setQuestSheet('new')} />}>
        {[...data.quests]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((q) => (
            <ListItem key={q.id} title={q.title} sub={`${q.target} steps · +${q.xpPerStep} XP each`} onPress={() => setQuestSheet(q)} />
          ))}
      </Section>

      {/* ---- Notifications ---- */}
      <Section title="Notifications">
        <Card>
          {notifAllowed === false && (
            <View style={{ marginBottom: space.md }}>
              <T v="small" style={{ color: colors.red, marginBottom: space.sm }}>
                Notifications are blocked for this app. Tap below; if nothing appears, open Android Settings → Apps → Builder's Wall → Notifications.
              </T>
              <Button
                title="Allow notifications"
                small
                onPress={async () => {
                  const ok = await requestPermission();
                  setNotifAllowed(ok);
                  if (ok) mutate(() => {});
                }}
              />
            </View>
          )}
          <Toggle label="All notifications" value={n.enabled} onChange={(v) => setNotif({ enabled: v })} />
          {n.enabled && (
            <>
              <Toggle label="Habit reminders (per habit time)" value={n.habitReminders} onChange={(v) => setNotif({ habitReminders: v })} />
              <Toggle label="Morning briefing" value={n.morningBriefing} onChange={(v) => setNotif({ morningBriefing: v })} />
              {n.morningBriefing && <TimeStepper label="Briefing time" value={n.morningTime} onChange={(t) => setNotif({ morningTime: t })} />}
              <Toggle label="Evening “Don't miss twice” check" value={n.eveningCheck} onChange={(v) => setNotif({ eveningCheck: v })} />
              {n.eveningCheck && <TimeStepper label="Check time" value={n.eveningTime} onChange={(t) => setNotif({ eveningTime: t })} />}
              <Toggle label="Weekly review (Sundays)" value={n.weeklyReview} onChange={(v) => setNotif({ weeklyReview: v })} />
              {n.weeklyReview && <TimeStepper label="Review time" value={n.weeklyTime} onChange={(t) => setNotif({ weeklyTime: t })} />}
            </>
          )}
          <T v="small" style={{ marginTop: space.sm }}>
            Reminders skip habits you've already ticked. Times after midnight (before 3 am) belong to the previous day.
          </T>
        </Card>
      </Section>

      {/* ---- Challenge window ---- */}
      <Section title="Challenge window">
        <Card>
          <T v="bodyBold">
            {prettyDate(game.cycle.startDay)} → {prettyDate(game.cycleEnd)}
          </T>
          <T v="small">
            {game.cycle.lengthDays} days · {game.cycleOver ? 'complete' : `day ${game.displayDay}`} · day ends at 3 am
          </T>
          <Button
            title="Start a new cycle"
            kind={game.cycleOver ? 'primary' : 'ghost'}
            small
            style={{ marginTop: space.md }}
            onPress={() => setCycleSheet(true)}
          />
        </Card>
      </Section>

      {/* ---- Widget ---- */}
      <Section title="Home-screen widget">
        <Card>
          <T v="small" style={{ marginBottom: space.sm }}>
            Shows the day, today's progress, best streak and level, with tap-to-tick habits. To add it: long-press an empty spot on
            your home screen → Widgets → Builder's Wall. Or tap below.
          </T>
          <Button
            title="Add widget"
            small
            kind="ghost"
            onPress={async () => {
              const ok = await requestPinWidget({ widgetName: WIDGET_NAME }).catch(() => false);
              if (!ok) Alert.alert('Add it manually', 'Long-press your home screen → Widgets → Builder\'s Wall.');
            }}
          />
        </Card>
      </Section>

      {/* ---- Backup ---- */}
      <View onLayout={(e) => (backupY.current = e.nativeEvent.layout.y)}>
        <Section title="Backup">
          <Card>
            <T v="small" style={{ marginBottom: space.md }}>
              {data.settings.lastExportAt
                ? `Last backup: ${new Date(data.settings.lastExportAt).toLocaleDateString()}`
                : 'No backup yet.'}{' '}
              Your data lives only on this phone. Export saves a JSON file you can send to Google Drive or WhatsApp.
            </T>
            <Button title={busy ? 'Preparing…' : 'Export backup'} onPress={doExport} disabled={busy} />
            <Button title="Restore from backup" kind="ghost" onPress={doImport} style={{ marginTop: space.sm }} />
          </Card>
        </Section>
      </View>

      <T v="small" style={{ marginTop: space.xl, textAlign: 'center' }}>
        The Builder's Wall · v{Constants.expoConfig?.version ?? '1'} · all data stays on this phone
      </T>

      {habitSheet && <HabitSheet habit={habitSheet === 'new' ? null : habitSheet} onClose={() => setHabitSheet(null)} />}
      {goalSheet && <GoalSheet goal={goalSheet === 'new' ? null : goalSheet} onClose={() => setGoalSheet(null)} />}
      {questSheet && <QuestSheet quest={questSheet === 'new' ? null : questSheet} onClose={() => setQuestSheet(null)} />}
      {cycleSheet && <CycleSheet onClose={() => setCycleSheet(false)} />}
      {profileSheet && <ProfileSheet onClose={() => setProfileSheet(false)} />}
    </ScrollView>
  );
}

// ---- Helpers -----------------------------------------------------------------

function daysLabel(days: number[]) {
  if (days.length === 7) return 'Daily';
  if (days.length === 0) return 'Never';
  return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAY_SHORT[d]).join(' ');
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row style={{ minHeight: 48 }}>
      <T v="body" style={{ flex: 1 }}>
        {label}
      </T>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: colors.surface3, true: colors.amberDim }}
        thumbColor={value ? colors.amber : colors.muted}
      />
    </Row>
  );
}

function ListItem({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Edit ${title}`}>
      <Card style={{ marginBottom: space.sm, paddingVertical: space.md }}>
        <T v="bodyBold">{title}</T>
        <T v="small">{sub}</T>
      </Card>
    </Pressable>
  );
}

// ---- Sheets ------------------------------------------------------------------

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon first

function HabitSheet({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const { data, game, mutate } = useStore();
  const [name, setName] = useState(habit?.name ?? '');
  const [slot, setSlot] = useState(habit?.slot ?? '');
  const [xp, setXp] = useState(habit?.xp ?? 10);
  const [days, setDays] = useState<number[]>(habit?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [reminderOn, setReminderOn] = useState(habit?.reminderOn ?? false);
  const [time, setTime] = useState(habit?.reminderTime ?? '09:00');
  const [isPrivate, setPrivate] = useState(habit?.isPrivate ?? false);

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const save = () => {
    if (!name.trim() || days.length === 0) return;
    const sortOrder = habit?.sortOrder ?? Math.max(-1, ...data.habits.map((h) => h.sortOrder)) + 1;
    mutate((pid) =>
      repo.saveHabit(pid, {
        id: habit?.id ?? repo.newId('h'),
        key: habit?.key ?? null,
        name: name.trim(),
        slot: slot.trim(),
        xp,
        days: [...days].sort(),
        reminderOn,
        reminderTime: reminderOn ? time : habit?.reminderTime ?? null,
        isPrivate,
        sortOrder,
        // New habits count from today, so past perfect days stay perfect.
        activeFrom: habit?.activeFrom ?? game.today,
        archivedFrom: null,
      }),
    );
    onClose();
  };

  const remove = () => {
    if (!habit) return;
    Alert.alert(
      `Remove “${habit.name}”?`,
      'It disappears from today onwards. Past ticks, XP and streak history are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            mutate((pid) => repo.removeHabit(pid, habit, game.today));
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Sheet visible title={habit ? 'Edit habit' : 'New habit'} onClose={onClose}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Stretch" maxLength={60} />
      <Field label="Time slot label" value={slot} onChangeText={setSlot} placeholder="e.g. 7–7:30 am or All day" maxLength={40} />
      <Stepper label="XP" value={xp} onChange={setXp} step={5} min={5} max={200} />
      <T v="small" style={{ marginBottom: 6 }}>
        Days
      </T>
      <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: space.md }}>
        {DAY_ORDER.map((d) => (
          <Chip key={d} label={WEEKDAY_SHORT[d]} active={days.includes(d)} onPress={() => toggleDay(d)} />
        ))}
      </Row>
      <Toggle label="Reminder" value={reminderOn} onChange={setReminderOn} />
      {reminderOn && <TimeStepper label="Reminder time" value={time} onChange={setTime} />}
      <Toggle label="Private (discreet label everywhere)" value={isPrivate} onChange={setPrivate} />
      <Button title="Save" onPress={save} disabled={!name.trim() || days.length === 0} style={{ marginTop: space.md }} />
      {habit && <Button title="Remove habit" kind="danger" onPress={remove} style={{ marginTop: space.sm }} />}
    </Sheet>
  );
}

function GoalSheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { data, game, mutate } = useStore();
  const habits = activeHabits(data.habits, game.today);
  const [habitId, setHabitId] = useState(goal?.habitId ?? habits[0]?.id ?? '');
  const [target, setTarget] = useState(goal?.target ?? 100);
  const [title, setTitle] = useState(goal?.title ?? '');
  const habitName = data.habits.find((h) => h.id === habitId)?.name ?? '';

  const save = () => {
    if (!habitId) return;
    const sortOrder = goal?.sortOrder ?? Math.max(-1, ...data.goals.map((g) => g.sortOrder)) + 1;
    mutate((pid) =>
      repo.saveGoal(pid, {
        id: goal?.id ?? repo.newId('g'),
        habitId,
        target,
        title: title.trim() || `Complete ${target} days of ${habitName}`,
        sortOrder,
      }),
    );
    onClose();
  };

  return (
    <Sheet visible title={goal ? 'Edit goal' : 'New goal'} onClose={onClose}>
      <Field label="Title (optional)" value={title} onChangeText={setTitle} placeholder={`Complete ${target} days of ${habitName}`} maxLength={80} />
      <Stepper label="Target days" value={target} onChange={setTarget} step={5} min={5} max={game.cycle.lengthDays} />
      <T v="small" style={{ marginBottom: 6 }}>
        Counts done days of
      </T>
      <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: space.md }}>
        {habits.map((h) => (
          <Chip key={h.id} label={h.name} active={habitId === h.id} onPress={() => setHabitId(h.id)} />
        ))}
      </Row>
      <Button title="Save" onPress={save} disabled={!habitId} />
      {goal && (
        <Button
          title="Delete goal"
          kind="danger"
          style={{ marginTop: space.sm }}
          onPress={() => {
            mutate((pid) => repo.deleteGoal(pid, goal.id));
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

function QuestSheet({ quest, onClose }: { quest: Quest | null; onClose: () => void }) {
  const { data, mutate } = useStore();
  const [title, setTitle] = useState(quest?.title ?? '');
  const [target, setTarget] = useState(quest?.target ?? 6);
  const [xp, setXp] = useState(quest?.xpPerStep ?? 100);

  const save = () => {
    if (!title.trim()) return;
    const sortOrder = quest?.sortOrder ?? Math.max(-1, ...data.quests.map((q) => q.sortOrder)) + 1;
    mutate((pid) =>
      repo.saveQuest(pid, {
        id: quest?.id ?? repo.newId('q'),
        key: quest?.key ?? null,
        title: title.trim(),
        target,
        xpPerStep: xp,
        sortOrder,
      }),
    );
    onClose();
  };
  const remove = () => {
    if (!quest) return;
    Alert.alert(`Delete “${quest.title}”?`, 'Its steps and their XP are deleted too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          mutate((pid) => repo.deleteQuest(pid, quest.id));
          onClose();
        },
      },
    ]);
  };

  return (
    <Sheet visible title={quest ? 'Edit quest' : 'New quest'} onClose={onClose}>
      <Field label="Quest" value={title} onChangeText={setTitle} placeholder="e.g. Call grandma" maxLength={100} />
      <Stepper label="Steps" value={target} onChange={setTarget} min={1} max={100} />
      <Stepper label="XP per step" value={xp} onChange={setXp} step={25} min={25} max={1000} />
      <Button title="Save" onPress={save} disabled={!title.trim()} />
      {quest && <Button title="Delete quest" kind="danger" onPress={remove} style={{ marginTop: space.sm }} />}
    </Sheet>
  );
}

function CycleSheet({ onClose }: { onClose: () => void }) {
  const { game, mutate } = useStore();
  const defaultStart: DayKey = game.cycleOver ? game.today : addDays(game.cycleEnd, 1);
  const [start, setStart] = useState<DayKey>(defaultStart);
  const [length, setLength] = useState(CYCLE_LENGTH);
  const end = cycleEndDay({ id: '', startDay: start, lengthDays: length });
  const startsBeforeEnd = start <= game.cycleEnd;

  const create = () => {
    mutate((pid) => repo.addCycle(pid, { id: repo.newId('c'), startDay: start, lengthDays: length }));
    onClose();
  };

  return (
    <Sheet visible title="New cycle" onClose={onClose}>
      <T v="small" style={{ marginBottom: space.md }}>
        A fresh wall and fresh goal counts. All history, XP, coins, badges and streaks are kept.
      </T>
      <T v="small">Day 1</T>
      <DayStepper value={start} onChange={(d) => setStart(d < game.cycle.startDay ? game.cycle.startDay : d)} />
      <Stepper label="Length (days)" value={length} onChange={setLength} min={7} max={365} />
      <T v="bodyBold" style={{ marginBottom: space.md }}>
        {prettyDay(start)} → {prettyDay(end)} ({diffDays(start, end) + 1} days)
      </T>
      {startsBeforeEnd && (
        <T v="small" style={{ color: colors.red, marginBottom: space.md }}>
          This starts before the current window ends ({prettyDate(game.cycleEnd)}) and will replace it from that day.
        </T>
      )}
      <Button title="Start cycle" onPress={create} />
    </Sheet>
  );
}

function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { data, mutate } = useStore();
  const [name, setName] = useState(data.settings.name);
  const [motto, setMotto] = useState(data.settings.motto);
  const [visions, setVisions] = useState<string[]>(data.settings.visions);

  const save = () => {
    mutate((pid) =>
      repo.saveSettings(pid, {
        name: name.trim() || 'Builder',
        motto: motto.trim() || data.settings.motto,
        visions: visions.map((v) => v.trim()).filter(Boolean),
      }),
    );
    onClose();
  };

  return (
    <Sheet visible title="Profile" onClose={onClose}>
      <Field label="Name" value={name} onChangeText={setName} maxLength={40} />
      <Field label="Motto" value={motto} onChangeText={setMotto} multiline maxLength={120} />
      {visions.map((v, i) => (
        <Row key={i} style={{ alignItems: 'flex-start', gap: 6 }}>
          <View style={{ flex: 1 }}>
            <Field
              label={`Vision ${i + 1}`}
              value={v}
              multiline
              onChangeText={(t) => setVisions((cur) => cur.map((x, k) => (k === i ? t : x)))}
              style={[ui.input, { minHeight: 64, paddingTop: 10, textAlignVertical: 'top' }]}
            />
          </View>
          <View style={{ marginTop: 26 }}>
            <IconButton label={`Delete vision ${i + 1}`} glyph="✕" onPress={() => setVisions((cur) => cur.filter((_, k) => k !== i))} />
          </View>
        </Row>
      ))}
      <Button title="+ Add vision" kind="ghost" small onPress={() => setVisions((cur) => [...cur, ''])} style={{ marginBottom: space.md }} />
      <Button title="Save" onPress={save} />
    </Sheet>
  );
}
