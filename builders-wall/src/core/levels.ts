/** The 10 builder ranks and the XP needed to reach each. */
export const LEVELS: { name: string; minXp: number }[] = [
  { name: 'Apprentice', minXp: 0 },
  { name: 'Bricklayer', minXp: 400 },
  { name: 'Mason', minXp: 1000 },
  { name: 'Foreman', minXp: 1800 },
  { name: 'Site Engineer', minXp: 2900 },
  { name: 'Builder', minXp: 4300 },
  { name: 'Systems Builder', minXp: 6000 },
  { name: 'Architect', minXp: 8200 },
  { name: 'Strategic Architect', minXp: 11000 },
  { name: 'Calm & Disciplined Builder', minXp: 14500 },
];

export interface LevelInfo {
  level: number; // 1…10
  name: string;
  minXp: number;
  nextXp: number | null; // null at max level
  nextName: string | null;
  /** 0…1 progress towards the next level (1 at max level). */
  progress: number;
}

export function levelForXp(xp: number): LevelInfo {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].minXp) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const progress = next ? (xp - cur.minXp) / (next.minXp - cur.minXp) : 1;
  return {
    level: idx + 1,
    name: cur.name,
    minXp: cur.minXp,
    nextXp: next ? next.minXp : null,
    nextName: next ? next.name : null,
    progress: Math.max(0, Math.min(1, progress)),
  };
}
