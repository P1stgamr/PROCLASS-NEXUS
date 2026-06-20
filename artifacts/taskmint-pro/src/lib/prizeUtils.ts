export const PRIZE_DIST = [
  { rank: 1, label: "🥇 ১ম", pct: 0.40 },
  { rank: 2, label: "🥈 ২য়", pct: 0.20 },
  { rank: 3, label: "🥉 ৩য়", pct: 0.10 },
  { rank: "4-10", label: "৪র্থ–১০ম", pct: 0.10 },
];
export const ADMIN_PCT = 0.20;

export function calcPrizes(totalPool: number) {
  return {
    first:    Math.floor(totalPool * 0.40),
    second:   Math.floor(totalPool * 0.20),
    third:    Math.floor(totalPool * 0.10),
    fourth10: Math.floor(totalPool * 0.10),
    fourth10Each: Math.floor((totalPool * 0.10) / 7),
    admin:    Math.floor(totalPool * 0.20),
    total:    totalPool,
  };
}

export function getRankPrize(rank: number, totalPool: number): number {
  const p = calcPrizes(totalPool);
  if (rank === 1) return p.first;
  if (rank === 2) return p.second;
  if (rank === 3) return p.third;
  if (rank >= 4 && rank <= 10) return p.fourth10Each;
  return 0;
}
