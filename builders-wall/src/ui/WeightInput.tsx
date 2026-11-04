/** Optional weight (kg) for a day. Saves when the keyboard closes. */
import React, { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import type { DayKey } from '../core/dates';
import { setWeight } from '../data/repo';
import { useStore } from '../state/store';
import { Button, Row, T, styles as ui } from './components';
import { colors } from './theme';

export function WeightInput({ day }: { day: DayKey }) {
  const { data, mutate } = useStore();
  const saved = data.dayLogs.find((l) => l.day === day)?.weightKg ?? null;
  const [text, setText] = useState(saved !== null ? String(saved) : '');
  useEffect(() => setText(saved !== null ? String(saved) : ''), [saved, day]);

  const parsed = text.trim() === '' ? null : Number(text.replace(',', '.'));
  const valid = parsed === null || (Number.isFinite(parsed) && parsed > 20 && parsed < 300);
  const changed = parsed !== saved;

  const save = () => {
    if (!valid || !changed) return;
    mutate((pid) => setWeight(pid, day, parsed === null ? null : Math.round(parsed * 10) / 10));
  };

  // Last recorded weight before this day, as a hint.
  const previous = [...data.dayLogs]
    .filter((l) => l.day < day && l.weightKg !== null)
    .sort((a, b) => (a.day < b.day ? 1 : -1))[0];

  return (
    <View>
      <Row style={{ gap: 8 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          onEndEditing={save}
          keyboardType="decimal-pad"
          placeholder={previous ? `Last: ${previous.weightKg} kg` : 'e.g. 72.4'}
          placeholderTextColor={colors.faint}
          accessibilityLabel="Weight in kilograms"
          style={[ui.input, { flex: 1, borderColor: valid ? colors.line : colors.red }]}
        />
        <T v="mono">kg</T>
        <Button title={saved !== null && !changed ? 'Saved' : 'Save'} small onPress={save} disabled={!valid || !changed} />
      </Row>
      {!valid && (
        <T v="small" style={{ color: colors.red, marginTop: 4 }}>
          Enter a weight between 20 and 300 kg.
        </T>
      )}
    </View>
  );
}
