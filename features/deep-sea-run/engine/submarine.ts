import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  NANO_DRONE_CORE_REGEN_PER_SEC,
  SUB_ACCEL,
  SUB_DECEL,
  SUB_INVULN_SEC,
  SUB_MAX_HULL,
  SUB_MAX_SHIELD,
  SUB_MAX_SPEED,
  SUB_RADIUS,
  SUB_START_POS,
  TETHER_HULL_REGEN_PER_SEC,
  TETHER_LEAVE_DRAIN_PER_SEC,
  TETHER_LEAVE_GRACE_SEC,
  TETHER_RADIUS,
  TETHER_SHIELD_REGEN_PER_SEC,
  TETHER_WEAPON_COOLDOWN_MULT,
} from "./constants";
import type { CoreModuleId, Core, Submarine } from "./types";
import { clamp, clampMagnitude, distance, normalize } from "./vector";

export function createSubmarine(): Submarine {
  return {
    pos: { ...SUB_START_POS },
    velocity: { x: 0, y: 0 },
    aimAngle: -Math.PI / 2,
    hull: SUB_MAX_HULL,
    maxHull: SUB_MAX_HULL,
    shield: SUB_MAX_SHIELD,
    maxShield: SUB_MAX_SHIELD,
    invulnUntil: 0,
    timeOutsideTether: 0,
    warnedOutsideTether: false,
  };
}

export interface MoveInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export function isWithinTether(pos: { x: number; y: number }, core: Core): boolean {
  return distance(pos, core.pos) <= TETHER_RADIUS;
}

export function updateSubmarineMovement(sub: Submarine, input: MoveInput, dt: number): void {
  const dir = { x: 0, y: 0 };
  if (input.up) dir.y -= 1;
  if (input.down) dir.y += 1;
  if (input.left) dir.x -= 1;
  if (input.right) dir.x += 1;
  const hasInput = dir.x !== 0 || dir.y !== 0;

  if (hasInput) {
    const wish = normalize(dir);
    sub.velocity.x += wish.x * SUB_ACCEL * dt;
    sub.velocity.y += wish.y * SUB_ACCEL * dt;
  } else {
    const speed = Math.hypot(sub.velocity.x, sub.velocity.y);
    if (speed > 0) {
      const drop = SUB_DECEL * dt;
      const nextSpeed = Math.max(0, speed - drop);
      const ratio = speed > 0 ? nextSpeed / speed : 0;
      sub.velocity.x *= ratio;
      sub.velocity.y *= ratio;
    }
  }

  sub.velocity = clampMagnitude(sub.velocity, SUB_MAX_SPEED);
  sub.pos.x = clamp(sub.pos.x + sub.velocity.x * dt, SUB_RADIUS, ARENA_WIDTH - SUB_RADIUS);
  sub.pos.y = clamp(sub.pos.y + sub.velocity.y * dt, SUB_RADIUS, ARENA_HEIGHT - SUB_RADIUS);
}

/** 배터리 실드가 먼저 흡수하고, 실드가 0이 된 뒤에야 선체 체력이 깎인다. */
export function applyDamageToSubmarine(sub: Submarine, amount: number): void {
  if (amount <= 0) return;
  const throughShield = Math.min(sub.shield, amount);
  sub.shield -= throughShield;
  const remaining = amount - throughShield;
  if (remaining > 0) sub.hull = Math.max(0, sub.hull - remaining);
}

export function updateTetherEffects(
  sub: Submarine,
  core: Core,
  dt: number,
  coreModules: CoreModuleId[]
): void {
  const inside = isWithinTether(sub.pos, core);
  const nanoDrone = coreModules.includes("nano_drone");

  if (inside) {
    sub.timeOutsideTether = 0;
    sub.warnedOutsideTether = false;
    const hullRegenMult = nanoDrone ? 2 : 1;
    sub.hull = Math.min(sub.maxHull, sub.hull + TETHER_HULL_REGEN_PER_SEC * hullRegenMult * dt);
    sub.shield = Math.min(sub.maxShield, sub.shield + TETHER_SHIELD_REGEN_PER_SEC * dt);
  } else {
    sub.timeOutsideTether += dt;
    if (sub.timeOutsideTether > TETHER_LEAVE_GRACE_SEC) {
      sub.warnedOutsideTether = true;
      applyDamageToSubmarine(sub, TETHER_LEAVE_DRAIN_PER_SEC * dt);
    }
  }
}

export function weaponCooldownMultiplier(sub: Submarine, core: Core): number {
  return isWithinTether(sub.pos, core) ? TETHER_WEAPON_COOLDOWN_MULT : 1;
}

export function updateCoreRegen(core: Core, dt: number, coreModules: CoreModuleId[], empActive: boolean): void {
  if (empActive) return;
  if (coreModules.includes("nano_drone")) {
    core.hp = Math.min(core.maxHp, core.hp + NANO_DRONE_CORE_REGEN_PER_SEC * dt);
  }
}

export function isSubmarineInvulnerable(sub: Submarine, now: number): boolean {
  return now < sub.invulnUntil;
}

export function triggerSubmarineInvuln(sub: Submarine, now: number): void {
  sub.invulnUntil = now + SUB_INVULN_SEC;
}
