import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  PASSIVE_MAX_LEVEL,
  PLANKTON_EXP_VALUE,
  PLANKTON_MAX_CONCURRENT,
  PLANKTON_RADIUS,
  PLANKTON_RING_MARGIN,
  PLANKTON_SPAWN_INTERVAL_SEC,
  SUB_RADIUS,
  WEAPON_DEFS,
  WEAPON_MAX_LEVEL,
  requiredExpForLevel,
} from "./constants";
import { circlesOverlap } from "./collision";
import type {
  PassiveId,
  PassiveSlot,
  UpgradeChoice,
  WeaponId,
  WeaponSlot,
  WorldState,
} from "./types";

export function createWeaponSlots(): Record<WeaponId, WeaponSlot> {
  const ids: WeaponId[] = ["sonar", "harpoon", "tesla", "torpedo"];
  const record = {} as Record<WeaponId, WeaponSlot>;
  for (const id of ids) {
    record[id] = { id, level: 0, overcharged: false, cooldownRemaining: 0 };
  }
  return record;
}

export function createPassiveSlots(): Record<PassiveId, PassiveSlot> {
  const ids: PassiveId[] = ["amplifier", "piston", "capacitor", "thermal"];
  const record = {} as Record<PassiveId, PassiveSlot>;
  for (const id of ids) {
    record[id] = { id, level: 0 };
  }
  return record;
}

function randomPlanktonPosition(): { x: number; y: number } {
  const margin = PLANKTON_RING_MARGIN;
  const side = Math.floor(Math.random() * 4);
  const inset = 20 + Math.random() * margin;
  if (side === 0) return { x: Math.random() * ARENA_WIDTH, y: inset };
  if (side === 1) return { x: Math.random() * ARENA_WIDTH, y: ARENA_HEIGHT - inset };
  if (side === 2) return { x: inset, y: Math.random() * ARENA_HEIGHT };
  return { x: ARENA_WIDTH - inset, y: Math.random() * ARENA_HEIGHT };
}

function buildUpgradePool(world: WorldState): UpgradeChoice[] {
  const pool: UpgradeChoice[] = [];

  (Object.keys(world.weapons) as WeaponId[]).forEach((weaponId) => {
    const slot = world.weapons[weaponId];
    if (slot.overcharged) return;
    if (slot.level >= WEAPON_MAX_LEVEL) {
      const passiveId = WEAPON_DEFS[weaponId].passiveId;
      if (world.passives[passiveId].level >= PASSIVE_MAX_LEVEL) {
        pool.push({ kind: "overcharge", id: weaponId });
      }
      return;
    }
    pool.push({ kind: "weapon", id: weaponId });
  });

  (Object.keys(world.passives) as PassiveId[]).forEach((passiveId) => {
    if (world.passives[passiveId].level >= PASSIVE_MAX_LEVEL) return;
    pool.push({ kind: "passive", id: passiveId });
  });

  return pool;
}

function pickRandomChoices(pool: UpgradeChoice[], count: number): UpgradeChoice[] {
  const copy = [...pool];
  const picked: UpgradeChoice[] = [];
  while (copy.length > 0 && picked.length < count) {
    const index = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(index, 1)[0]);
  }
  return picked;
}

export function applyUpgradeChoice(world: WorldState, choice: UpgradeChoice): void {
  if (choice.kind === "weapon") {
    world.weapons[choice.id].level = Math.min(WEAPON_MAX_LEVEL, world.weapons[choice.id].level + 1);
  } else if (choice.kind === "passive") {
    world.passives[choice.id].level = Math.min(PASSIVE_MAX_LEVEL, world.passives[choice.id].level + 1);
  } else {
    world.weapons[choice.id].overcharged = true;
  }
}

function grantLevelUp(world: WorldState): void {
  world.level += 1;
  const pool = buildUpgradePool(world);
  world.pendingUpgradeChoices = pickRandomChoices(pool, Math.min(3, pool.length));
  world.phase = "levelup";
}

export function updateGrowth(world: WorldState, now: number): void {
  const planktonCount = world.pickups.length;
  if (planktonCount < PLANKTON_MAX_CONCURRENT && now >= world.director.nextPlanktonAt) {
    world.pickups.push({ id: world.nextEntityId++, pos: randomPlanktonPosition(), value: PLANKTON_EXP_VALUE });
    world.director.nextPlanktonAt = now + PLANKTON_SPAWN_INTERVAL_SEC;
  }

  const remaining = [];
  for (const pickup of world.pickups) {
    if (circlesOverlap(pickup.pos, PLANKTON_RADIUS, world.submarine.pos, SUB_RADIUS)) {
      world.exp += pickup.value;
    } else {
      remaining.push(pickup);
    }
  }
  world.pickups = remaining;

  while (world.exp >= world.expToNext) {
    world.exp -= world.expToNext;
    grantLevelUp(world);
    world.expToNext = requiredExpForLevel(world.level + 1);
    if (world.phase === "levelup") break; // 레벨업 다이얼로그가 뜨면 다음 판단은 재개 후로 미룬다
  }
}
