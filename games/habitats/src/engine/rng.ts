// 결정론 PRNG (mulberry32). 상태를 숫자 하나로 들고 있어 저장/복원이 쉽다.
export interface Rng { s: number }

export function makeRng(seed: number): Rng {
  return { s: seed >>> 0 };
}

export function next(r: Rng): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const chance = (r: Rng, p: number) => next(r) < p;
export const range = (r: Rng, a: number, b: number) => a + (b - a) * next(r);
export const int = (r: Rng, a: number, b: number) => Math.floor(range(r, a, b + 1));
export const pick = <T>(r: Rng, arr: readonly T[]): T => arr[Math.floor(next(r) * arr.length)];

export function normal(r: Rng, mu = 0, sd = 1): number {
  const u = Math.max(1e-9, next(r));
  const v = next(r);
  return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function weighted<T>(r: Rng, items: readonly T[], w: (t: T) => number): T {
  const ws = items.map((i) => Math.max(0, w(i)));
  const total = ws.reduce((a, b) => a + b, 0);
  let x = next(r) * total;
  for (let i = 0; i < items.length; i++) {
    x -= ws[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

export const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export function newSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}
