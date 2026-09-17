import {
  CORE_DISCHARGE_DAMAGE,
  CORE_DISCHARGE_RADIUS,
  CORE_DISCHARGE_STEP_RATIO,
  CORE_DISCHARGE_STUN_SEC,
  CORE_MAX_HP,
  CORE_POS,
  TURRET_ROTATE_SPEED,
} from "./constants";
import type { Core, CoreModuleId, Effect, Monster } from "./types";
import { distance } from "./vector";

export function createCore(): Core {
  return {
    pos: { ...CORE_POS },
    hp: CORE_MAX_HP,
    maxHp: CORE_MAX_HP,
    lastDischargeThresholdHp: CORE_MAX_HP,
    turretAngle: 0,
  };
}

export function updateTurret(core: Core, coreModules: CoreModuleId[], dt: number): void {
  if (!coreModules.includes("searchlight_turret")) return;
  core.turretAngle += TURRET_ROTATE_SPEED * dt;
}

/**
 * 코어 체력이 최대치의 10%만큼 줄어들 때마다 방전을 터뜨린다.
 * 새로 생긴 stun-flash 이펙트와, 실제 피해·마비를 받은 몬스터 id 목록을 반환한다.
 * 리바이어던의 EMP가 활성화된 동안에는 코어 증설 모듈 효과(방전)가 무력화된다.
 */
export function applyDamageToCore(
  core: Core,
  amount: number,
  coreModules: CoreModuleId[],
  monsters: Monster[],
  now: number,
  spawnEffect: (effect: Omit<Effect, "id" | "bornAt">) => void,
  empActive: boolean
): void {
  if (amount <= 0) return;
  core.hp = Math.max(0, core.hp - amount);

  if (empActive || !coreModules.includes("tether_discharge")) return;
  const step = core.maxHp * CORE_DISCHARGE_STEP_RATIO;
  while (core.lastDischargeThresholdHp - core.hp >= step) {
    core.lastDischargeThresholdHp -= step;
    spawnEffect({ kind: "core-discharge", pos: { ...core.pos }, radius: CORE_DISCHARGE_RADIUS, ttlSec: 0.4 });
    for (const monster of monsters) {
      if (monster.hp <= 0) continue;
      if (distance(monster.pos, core.pos) <= CORE_DISCHARGE_RADIUS) {
        monster.hp -= CORE_DISCHARGE_DAMAGE;
        monster.stunnedUntil = now + CORE_DISCHARGE_STUN_SEC;
      }
    }
  }
}
