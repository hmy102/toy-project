export type Vec2 = { x: number; y: number };

export const ZERO: Vec2 = { x: 0, y: 0 };

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function length(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function distance(a: Vec2, b: Vec2): number {
  return length(sub(a, b));
}

export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: a.x / len, y: a.y / len };
}

export function angleOf(a: Vec2): number {
  return Math.atan2(a.y, a.x);
}

export function fromAngle(angleRad: number): Vec2 {
  return { x: Math.cos(angleRad), y: Math.sin(angleRad) };
}

export function clampMagnitude(a: Vec2, max: number): Vec2 {
  const len = length(a);
  if (len <= max || len < 1e-6) return a;
  return scale(a, max / len);
}

/** [-PI, PI] 범위로 정규화한 두 각도 사이의 최단 차이 */
export function angleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
