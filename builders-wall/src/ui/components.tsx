/** Small reusable UI building blocks. */
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, radius, space, TAP } from './theme';
import { addDays, formatTime, friendlyTime, parseTime, prettyDay, type DayKey } from '../core/dates';
import { tapHaptic } from './feedback';

// ---- Text ------------------------------------------------------------------

type Variant = 'display' | 'h1' | 'h2' | 'body' | 'bodyBold' | 'small' | 'mono' | 'label';
const textStyles: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 40, color: colors.text, letterSpacing: 0.5 },
  h1: { fontFamily: fonts.display, fontSize: 28, color: colors.text, letterSpacing: 0.5 },
  h2: { fontFamily: fonts.display, fontSize: 21, color: colors.text, letterSpacing: 0.4 },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.text, lineHeight: 21 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, lineHeight: 21 },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 18 },
  mono: { fontFamily: fonts.mono, fontSize: 13, color: colors.text },
  label: { fontFamily: fonts.displaySemi, fontSize: 14, color: colors.muted, letterSpacing: 1.6 },
};

export function T({
  v = 'body',
  style,
  children,
  ...rest
}: { v?: Variant; style?: StyleProp<TextStyle>; children?: React.ReactNode } & React.ComponentProps<typeof Text>) {
  return (
    <Text style={[textStyles[v], style]} {...rest}>
      {children}
    </Text>
  );
}

// ---- Layout ----------------------------------------------------------------

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={styles.screen}>{children}</View>;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Section({ title, right, children }: { title: string; right?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <View style={{ marginTop: space.xl }}>
      <View style={styles.sectionHead}>
        <T v="label">{title.toUpperCase()}</T>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

// ---- Buttons ---------------------------------------------------------------

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  small,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger' | 'ice';
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const bg =
    kind === 'primary' ? colors.amber : kind === 'danger' ? colors.redSoft : kind === 'ice' ? 'rgba(159,227,255,0.14)' : colors.surface2;
  const fg = kind === 'primary' ? colors.onAmber : kind === 'danger' ? colors.red : kind === 'ice' ? colors.ice : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }, small && { fontSize: 15 }]}>{title.toUpperCase()}</Text>
    </Pressable>
  );
}

export function IconButton({
  label,
  glyph,
  onPress,
  disabled,
  color = colors.text,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => [styles.iconButton, { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}
    >
      <Text style={{ fontSize: 20, color, fontFamily: fonts.bodyBold }}>{glyph}</Text>
    </Pressable>
  );
}

// ---- Progress --------------------------------------------------------------

export function ProgressBar({ value, color = colors.amber, height = 10 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.barTrack, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

/** A row of small blocks, e.g. quest steps or spare-day "lives". */
export function Pips({ total, filled, color = colors.amber, size = 14 }: { total: number; filled: number; color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {Array.from({ length: Math.max(0, total) }).map((_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size * 0.7,
            borderRadius: 2,
            backgroundColor: i < filled ? color : 'transparent',
            borderWidth: 1.5,
            borderColor: i < filled ? color : colors.line,
          }}
        />
      ))}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.amber, borderColor: colors.amber }]}
    >
      <Text style={{ color: active ? colors.onAmber : colors.text, fontFamily: fonts.bodyBold, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

// ---- Inputs ----------------------------------------------------------------

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: space.md }}>
      <T v="small" style={{ marginBottom: 4 }}>
        {label}
      </T>
      <TextInput placeholderTextColor={colors.faint} style={styles.input} {...props} />
    </View>
  );
}

/** "−  value  +" control. */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 100000,
  format = (n: number) => String(n),
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (n: number) => string;
}) {
  return (
    <View style={styles.stepperRow}>
      <T v="body" style={{ flex: 1 }}>
        {label}
      </T>
      <IconButton label={`Decrease ${label}`} glyph="−" onPress={() => onChange(Math.max(min, value - step))} disabled={value <= min} />
      <T v="mono" style={{ minWidth: 72, textAlign: 'center', fontSize: 16 }}>
        {format(value)}
      </T>
      <IconButton label={`Increase ${label}`} glyph="+" onPress={() => onChange(Math.min(max, value + step))} disabled={value >= max} />
    </View>
  );
}

/** Time picker made of two steppers (hour, minutes in steps of 5) — no extra native module needed. */
export function TimeStepper({ label, value, onChange }: { label: string; value: string; onChange: (t: string) => void }) {
  const t = parseTime(value) ?? { h: 8, m: 0 };
  const set = (h: number, m: number) => onChange(formatTime((h + 24) % 24, (m + 60) % 60));
  const down5 = t.m % 5 ? t.m - (t.m % 5) : t.m - 5;
  const up5 = t.m - (t.m % 5) + 5;
  return (
    <View style={{ marginBottom: space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="body">{label}</T>
        <T v="small">{friendlyTime(value)}</T>
      </Row>
      <View style={[styles.stepperRow, { marginBottom: 0 }]}>
        <IconButton label="Hour earlier" glyph="−" onPress={() => set(t.h - 1, t.m)} />
        <T v="mono" style={{ minWidth: 36, textAlign: 'center', fontSize: 18 }}>
          {String(t.h).padStart(2, '0')}
        </T>
        <IconButton label="Hour later" glyph="+" onPress={() => set(t.h + 1, t.m)} />
        <T v="mono" style={{ fontSize: 18, marginHorizontal: 4 }}>
          :
        </T>
        <IconButton label="Minutes earlier" glyph="−" onPress={() => set(t.h, down5)} />
        <T v="mono" style={{ minWidth: 36, textAlign: 'center', fontSize: 18 }}>
          {String(t.m).padStart(2, '0')}
        </T>
        <IconButton label="Minutes later" glyph="+" onPress={() => set(t.h, up5)} />
      </View>
    </View>
  );
}

/** ‹ Tue 3 Nov › — picks a day by stepping. */
export function DayStepper({ value, onChange, max }: { value: DayKey; onChange: (d: DayKey) => void; max?: DayKey }) {
  return (
    <View style={styles.stepperRow}>
      <IconButton label="Previous day" glyph="‹" onPress={() => onChange(addDays(value, -1))} />
      <T v="bodyBold" style={{ flex: 1, textAlign: 'center' }}>
        {prettyDay(value)}
      </T>
      <IconButton label="Next day" glyph="›" onPress={() => onChange(addDays(value, 1))} disabled={!!max && value >= max} />
    </View>
  );
}

// ---- Modal sheet -----------------------------------------------------------

export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <T v="h2" style={{ flex: 1 }}>
              {title}
            </T>
            <IconButton label="Close" glyph="✕" onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xl }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: space.lg, paddingBottom: 48 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  button: {
    minHeight: TAP,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: space.md },
  buttonText: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 1 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  barTrack: { backgroundColor: colors.surface3, overflow: 'hidden', width: '100%' },
  chip: {
    minHeight: 40,
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.surface2,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: TAP,
    fontFamily: fonts.body,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: TAP, marginBottom: space.sm },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: space.lg,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md },
});
