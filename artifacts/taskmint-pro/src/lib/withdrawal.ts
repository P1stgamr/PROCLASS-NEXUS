export const DEFAULT_MOTIVATION_THRESHOLD = 10_000;

export interface WithdrawalCooldown {
  active?: boolean;
  startAt?: number;
  endAt?: number;
  reason?: string;
}

export function isWithdrawalCooldownActive(
  cooldown: WithdrawalCooldown | null | undefined,
  currentTime = Date.now(),
) {
  const startAt = Number(cooldown?.startAt);
  const endAt = Number(cooldown?.endAt);
  return cooldown?.active === true
    && Number.isFinite(startAt)
    && Number.isFinite(endAt)
    && endAt > startAt
    && currentTime >= startAt
    && currentTime < endAt;
}

export function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safeSeconds / 86_400);
  const hours = Math.floor((safeSeconds % 86_400) / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const seconds = safeSeconds % 60;
  return { days, hours, minutes, seconds };
}

export function toDateTimeLocal(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return "";
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}