/**
 * Game feel: haptics, "+15 XP" floating text, confetti, level-up and badge
 * toasts. Every animation checks Android's "Remove animations" setting
 * (AccessibilityInfo.isReduceMotionEnabled) and shows a still version instead.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radius, space } from './theme';
import type { Celebration } from '../state/store';

// ---- Haptics ---------------------------------------------------------------

export function tapHaptic() {
  Haptics.selectionAsync().catch(() => {});
}
export function tickHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
export function successHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

// ---- Reduce motion ---------------------------------------------------------

let reduceMotionCache = false;
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(reduceMotionCache);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reduceMotionCache = v;
      setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      reduceMotionCache = v;
      setReduce(v);
    });
    return () => sub.remove();
  }, []);
  return reduce;
}

// ---- Floating "+XP" text ---------------------------------------------------

/** Renders "+15 XP" that floats up and fades. Change `trigger` to replay. */
export function FloatingXp({ text, trigger }: { text: string; trigger: number }) {
  const reduce = useReduceMotion();
  const anim = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    anim.setValue(0);
    const duration = reduce ? 900 : 900;
    const a = reduce
      ? Animated.sequence([Animated.delay(duration), Animated.timing(anim, { toValue: 1, duration: 1, useNativeDriver: true })])
      : Animated.timing(anim, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start(() => setVisible(false));
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;
  const translateY = reduce ? 0 : anim.interpolate({ inputRange: [0, 1], outputRange: [0, -36] });
  const opacity = reduce ? 1 : anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.Text
      pointerEvents="none"
      style={[styles.floatXp, { opacity, transform: [{ translateY }] }]}
      accessibilityLiveRegion="polite"
    >
      {text}
    </Animated.Text>
  );
}

// ---- Confetti --------------------------------------------------------------

const CONFETTI_COLORS = [colors.amber, '#FFD266', colors.text, '#FF8A3D', colors.ice];

function Confetti({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const pieces = useRef(
    Array.from({ length: 36 }).map(() => ({
      x: Math.random() * width,
      drift: (Math.random() - 0.5) * 120,
      delay: Math.random() * 300,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      spin: Math.random() * 720 - 360,
      v: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    Animated.parallel(
      pieces.map((p) =>
        Animated.timing(p.v, {
          toValue: 1,
          duration: 1800 + Math.random() * 600,
          delay: p.delay,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ).start(onDone);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: p.size,
            height: p.size * 0.5,
            backgroundColor: p.color,
            borderRadius: 1,
            transform: [
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ---- Celebration layer (level-up, badges, perfect day) ---------------------

export function CelebrationLayer({ queue, onDismiss }: { queue: Celebration[]; onDismiss: () => void }) {
  const reduce = useReduceMotion();
  const current = queue[0];
  const fade = useRef(new Animated.Value(0)).current;
  const [confetti, setConfetti] = useState(0);

  useEffect(() => {
    if (!current) return;
    successHaptic();
    if ((current.kind === 'perfect' || current.kind === 'level') && !reduce) setConfetti((n) => n + 1);
    fade.setValue(reduce ? 1 : 0);
    if (!reduce) Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    // Badge and perfect-day toasts dismiss themselves; level-up waits for a tap.
    if (current.kind !== 'level') {
      const t = setTimeout(onDismiss, 2600);
      return () => clearTimeout(t);
    }
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {confetti > 0 && <Confetti key={confetti} onDone={() => setConfetti(0)} />}
      {current?.kind === 'level' && (
        <Pressable style={styles.levelBackdrop} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close level up">
          <Animated.View
            style={[
              styles.levelCard,
              { opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
            ]}
          >
            <Text style={styles.levelKicker}>LEVEL UP</Text>
            <Text style={styles.levelNumber}>{current.level}</Text>
            <Text style={styles.levelName}>{current.name.toUpperCase()}</Text>
            <Text style={styles.levelHint}>Tap to keep building</Text>
          </Animated.View>
        </Pressable>
      )}
      {(current?.kind === 'badge' || current?.kind === 'perfect') && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastWrap,
            { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] },
          ]}
        >
          <Pressable onPress={onDismiss} style={styles.toast} accessibilityLiveRegion="assertive">
            <Text style={{ fontSize: 30 }}>{current.kind === 'badge' ? current.badge.icon : '⭐'}</Text>
            <View style={{ flex: 1, marginLeft: space.md }}>
              <Text style={styles.toastKicker}>{current.kind === 'badge' ? 'BADGE UNLOCKED' : 'PERFECT DAY'}</Text>
              <Text style={styles.toastTitle}>
                {current.kind === 'badge' ? current.badge.name : 'Every brick laid today · +50 XP'}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  floatXp: {
    position: 'absolute',
    right: 16,
    top: 6,
    color: colors.amber,
    fontFamily: fonts.display,
    fontSize: 22,
  },
  levelBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCard: {
    backgroundColor: colors.surface,
    borderColor: colors.amber,
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    minWidth: 260,
  },
  levelKicker: { fontFamily: fonts.displaySemi, color: colors.muted, letterSpacing: 4, fontSize: 16 },
  levelNumber: { fontFamily: fonts.display, color: colors.amber, fontSize: 96, lineHeight: 104 },
  levelName: { fontFamily: fonts.display, color: colors.text, fontSize: 26, textAlign: 'center' },
  levelHint: { fontFamily: fonts.body, color: colors.muted, fontSize: 13, marginTop: 16 },
  toastWrap: { position: 'absolute', top: 12, left: 12, right: 12 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderColor: colors.amber,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: space.md,
  },
  toastKicker: { fontFamily: fonts.displaySemi, color: colors.amber, letterSpacing: 2, fontSize: 13 },
  toastTitle: { fontFamily: fonts.bodyBold, color: colors.text, fontSize: 15 },
});
