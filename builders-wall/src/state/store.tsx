/**
 * App-wide state. Screens read `data` (raw records) and `game` (computed
 * XP, streaks, goals…) from here and call the action functions to change
 * things. Every action writes to SQLite, then reloads and recomputes.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { computeBadges, type Badge } from '../core/badges';
import { logicalDayKey, type DayKey } from '../core/dates';
import type { GameState } from '../core/engine';
import type { AppData, CheckStatus } from '../core/types';
import * as repo from '../data/repo';
import { onDataChanged } from './events';
import { ACTIVE_PROFILE, loadGame, syncOutside } from './sync';

export type Celebration =
  | { kind: 'level'; level: number; name: string }
  | { kind: 'badge'; badge: Badge }
  | { kind: 'perfect' };

interface StoreValue {
  data: AppData;
  game: GameState;
  badges: Badge[];
  profileId: string;
  /** Re-read everything from the database. */
  reload: () => void;
  /** Wrap any repo write: runs it, reloads, syncs widget + notifications. */
  mutate: (fn: (profileId: string) => void) => void;
  setCheck: (day: DayKey, habitId: string, status: CheckStatus | null) => void;
  celebrations: Celebration[];
  dismissCelebration: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => loadGame(ACTIVE_PROFILE));
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const lastPerfect = useRef(state.game.todayPerfect);
  const stateRef = useRef(state);
  stateRef.current = state;

  const badges = useMemo(() => computeBadges(state.data, state.game), [state]);

  /** Queue toasts for new badges / a new level, and remember they were shown. */
  const checkCelebrations = useCallback((next: ReturnType<typeof loadGame>, fromUserTick: boolean) => {
    const { data, game } = next;
    const queue: Celebration[] = [];
    const nowBadges = computeBadges(data, game);
    const seen = new Set(data.settings.seenBadges);
    const fresh = nowBadges.filter((b) => b.unlocked && !seen.has(b.id));
    if (fresh.length) {
      fresh.forEach((badge) => queue.push({ kind: 'badge', badge }));
      repo.saveSettings(data.profileId, { seenBadges: [...seen, ...fresh.map((b) => b.id)] });
    }
    if (game.level.level > data.settings.seenLevel) {
      queue.unshift({ kind: 'level', level: game.level.level, name: game.level.name });
      repo.saveSettings(data.profileId, { seenLevel: game.level.level });
    }
    if (fromUserTick && game.todayPerfect && !lastPerfect.current) queue.unshift({ kind: 'perfect' });
    lastPerfect.current = game.todayPerfect;
    if (queue.length) setCelebrations((q) => [...q, ...queue]);
  }, []);

  const reload = useCallback(
    (fromUserTick = false, sync = true) => {
      const next = loadGame(ACTIVE_PROFILE);
      setState(next);
      checkCelebrations(next, fromUserTick);
      if (sync) void syncOutside(next.data, next.game);
    },
    [checkCelebrations],
  );

  // First load: sync widget + reminders and show any pending celebrations.
  useEffect(() => {
    checkCelebrations(state, false);
    void syncOutside(state.data, state.game);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when the app comes back to the foreground, when the widget changes
  // something, and when the clock passes 3 am.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && reload());
    const off = onDataChanged(() => reload(false, false));
    const timer = setInterval(() => {
      if (logicalDayKey(new Date()) !== stateRef.current.game.today) reload();
    }, 60_000);
    return () => {
      sub.remove();
      off();
      clearInterval(timer);
    };
  }, [reload]);
  const mutate = useCallback(
    (fn: (profileId: string) => void) => {
      fn(ACTIVE_PROFILE);
      reload(true);
    },
    [reload],
  );

  const setCheck = useCallback(
    (day: DayKey, habitId: string, status: CheckStatus | null) =>
      mutate((pid) => repo.setCheck(pid, day, habitId, status)),
    [mutate],
  );

  const value: StoreValue = {
    data: state.data,
    game: state.game,
    badges,
    profileId: ACTIVE_PROFILE,
    reload: () => reload(),
    mutate,
    setCheck,
    celebrations,
    dismissCelebration: () => setCelebrations((q) => q.slice(1)),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
