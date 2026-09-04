/**
 * Creates a stable, human-friendly identifier from Firebase's immutable UID.
 * It does not require a shared counter, so simultaneous signups cannot clash
 * because of a client-side sequence race.
 */
export function createUserNo(uid: string): string {
  return `TM-${uid.slice(0, 10).toUpperCase()}`;
}