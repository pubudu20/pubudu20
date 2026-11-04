/** Rewards shop: spend coins (separate from XP) on real-life treats. */
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { prettyDay } from '../core/dates';
import { RULES } from '../core/engine';
import type { Reward } from '../core/types';
import { addPurchase, deletePurchase, newId, saveReward } from '../data/repo';
import { useStore } from '../state/store';
import { Button, Card, Field, IconButton, Row, Screen, Section, Sheet, Stepper, T } from '../ui/components';
import { colors, fonts, space } from '../ui/theme';
import { successHaptic } from '../ui/feedback';

export function ShopScreen() {
  const { data, game, mutate } = useStore();
  const [editing, setEditing] = useState<Reward | 'new' | null>(null);
  const rewards = data.rewards.filter((r) => !r.archived).sort((a, b) => a.sortOrder - b.sortOrder);

  const buy = (r: Reward) => {
    Alert.alert(`Redeem “${r.title}”?`, `${r.cost} coins · you'll have ${game.coins - r.cost} left.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Redeem',
        onPress: () => {
          mutate((pid) =>
            addPurchase(pid, {
              id: newId('p'),
              rewardId: r.id,
              title: r.title,
              cost: r.cost,
              day: game.today,
              createdAt: new Date().toISOString(),
            }),
          );
          successHaptic();
        },
      },
    ]);
  };

  const undo = (id: string, title: string, cost: number) => {
    Alert.alert('Undo this purchase?', `${title} · ${cost} coins go back to your balance.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Undo', style: 'destructive', onPress: () => mutate((pid) => deletePurchase(pid, id)) },
    ]);
  };

  return (
    <Screen>
      <Card style={{ alignItems: 'center', borderColor: colors.amberDim }}>
        <T v="label">BALANCE</T>
        <Text style={styles.balance}>🪙 {game.coins}</Text>
        <T v="small">
          Earned {game.coinsEarned} · Spent {game.coinsSpent}
        </T>
        <T v="small" style={{ marginTop: space.sm, textAlign: 'center' }}>
          +{RULES.coinsPerTick} per habit · +{RULES.coinsPerPerfectDay} per perfect day · +{RULES.coinsPerQuestStep} per quest step
        </T>
      </Card>

      <Section title="Rewards" right={<Button title="+ Add" small kind="ghost" onPress={() => setEditing('new')} />}>
        {rewards.map((r) => {
          const short = r.cost - game.coins;
          return (
            <Card key={r.id} style={{ marginBottom: space.sm, paddingVertical: space.md }}>
              <Row>
                <View style={{ flex: 1 }}>
                  <T v="bodyBold">{r.title}</T>
                  <T v="mono" style={{ color: colors.amber, marginTop: 2 }}>
                    🪙 {r.cost}
                    {short > 0 ? <Text style={{ color: colors.faint }}>{`  · ${short} to go`}</Text> : null}
                  </T>
                </View>
                <IconButton label={`Edit ${r.title}`} glyph="✎" onPress={() => setEditing(r)} />
                <Button title="Redeem" small onPress={() => buy(r)} disabled={short > 0} style={{ marginLeft: space.sm }} />
              </Row>
            </Card>
          );
        })}
      </Section>

      <Section title="Purchase history">
        {data.purchases.length === 0 && <T v="small">Nothing redeemed yet. Treat yourself when you've earned it.</T>}
        {data.purchases.map((p) => (
          <Row key={p.id} style={styles.historyRow}>
            <T v="mono" style={{ color: colors.muted, width: 92 }}>
              {prettyDay(p.day)}
            </T>
            <T v="small" style={{ flex: 1, color: colors.text }}>
              {p.title}
            </T>
            <T v="mono" style={{ marginRight: space.sm }}>
              −{p.cost}
            </T>
            <IconButton label={`Undo purchase ${p.title}`} glyph="↺" onPress={() => undo(p.id, p.title, p.cost)} />
          </Row>
        ))}
      </Section>

      {editing && <RewardSheet reward={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Screen>
  );
}

function RewardSheet({ reward, onClose }: { reward: Reward | null; onClose: () => void }) {
  const { data, mutate } = useStore();
  const [title, setTitle] = useState(reward?.title ?? '');
  const [cost, setCost] = useState(reward?.cost ?? 100);

  const save = () => {
    if (!title.trim()) return;
    const sortOrder = reward?.sortOrder ?? Math.max(-1, ...data.rewards.map((r) => r.sortOrder)) + 1;
    mutate((pid) =>
      saveReward(pid, { id: reward?.id ?? newId('r'), title: title.trim(), cost, sortOrder, archived: false }),
    );
    onClose();
  };
  const remove = () => {
    if (!reward) return;
    mutate((pid) => saveReward(pid, { ...reward, archived: true }));
    onClose();
  };

  return (
    <Sheet visible title={reward ? 'Edit reward' : 'New reward'} onClose={onClose}>
      <Field label="Reward" value={title} onChangeText={setTitle} placeholder="e.g. Massage" maxLength={80} />
      <Stepper label="Cost (coins)" value={cost} onChange={setCost} step={10} min={10} max={5000} />
      <Button title="Save" onPress={save} disabled={!title.trim()} />
      {reward && <Button title="Remove reward" kind="danger" onPress={remove} style={{ marginTop: space.sm }} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  balance: { fontFamily: fonts.display, fontSize: 52, color: colors.amber, marginVertical: 2 },
  historyRow: { minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.line },
});
