import {
  HARPOON_SPEED,
  PASSIVE_DEFS,
  TESLA_CHAIN_RANGE,
  TORPEDO_SPEED,
  WEAPON_DEFS,
} from "./constants";
import { damageMonster } from "./monsters";
import type { Monster, PassiveId, WeaponId, WeaponSlot, WorldState } from "./types";
import { add, distance, normalize, scale, sub as vsub } from "./vector";
import { weaponCooldownMultiplier } from "./submarine";

export interface EffectiveWeaponStats {
  name: string;
  damage: number;
  cooldown: number;
  extra: number;
}

export function getEffectiveWeaponStats(weaponId: WeaponId, slot: WeaponSlot): EffectiveWeaponStats {
  const def = WEAPON_DEFS[weaponId];
  if (slot.overcharged) {
    return { ...def.overcharge };
  }
  const levelStep = Math.max(0, slot.level - 1);
  return {
    name: def.name,
    damage: def.damage * (1 + 0.15 * levelStep),
    cooldown: def.cooldown * (1 - 0.03 * levelStep),
    extra: def.extra * (1 + 0.08 * levelStep),
  };
}

function passiveLevel(world: WorldState, passiveId: PassiveId): number {
  return world.passives[passiveId].level;
}

function visibleMonsters(world: WorldState): Monster[] {
  return world.monsters.filter((m) => m.hp > 0 && m.visible);
}

function nearestOf(from: { x: number; y: number }, monsters: Monster[]): Monster | null {
  let best: Monster | null = null;
  let bestDist = Infinity;
  for (const monster of monsters) {
    const d = distance(from, monster.pos);
    if (d < bestDist) {
      bestDist = d;
      best = monster;
    }
  }
  return best;
}

function fireSonar(world: WorldState, slot: WeaponSlot, now: number): void {
  const stats = getEffectiveWeaponStats("sonar", slot);
  const amplifierLevel = passiveLevel(world, "amplifier");
  const radius = stats.extra * (1 + PASSIVE_DEFS.amplifier.perLevel * amplifierLevel);

  world.effects.push({
    id: world.nextEntityId++,
    kind: "pulse",
    pos: { ...world.submarine.pos },
    radius,
    bornAt: now,
    ttlSec: 0.4,
  });

  for (const monster of world.monsters) {
    if (monster.hp <= 0) continue;
    if (distance(monster.pos, world.submarine.pos) > radius) continue;
    damageMonster(world, monster, stats.damage, world.submarine.pos, now);
    if (slot.overcharged) {
      monster.stunnedUntil = now + 0.8;
      monster.forcedVisibleUntil = now + 2;
    }
  }
}

function fireHarpoon(world: WorldState, slot: WeaponSlot, target: Monster, now: number): void {
  const stats = getEffectiveWeaponStats("harpoon", slot);
  const pistonLevel = passiveLevel(world, "piston");
  const speedMult = 1 + PASSIVE_DEFS.piston.perLevel * pistonLevel;
  const dir = normalize(vsub(target.pos, world.submarine.pos));

  world.projectiles.push({
    id: world.nextEntityId++,
    owner: "player",
    weaponId: "harpoon",
    pos: { ...world.submarine.pos },
    velocity: scale(dir, HARPOON_SPEED * speedMult),
    damage: stats.damage,
    piercesLeft: Math.round(stats.extra),
    hitMonsterIds: [],
    knockback: pistonLevel > 0 ? 40 + pistonLevel * 10 : 0,
    bornAt: now,
    maxLifeSec: 2,
  });
}

function fireTesla(world: WorldState, slot: WeaponSlot, firstTarget: Monster, now: number): void {
  const stats = getEffectiveWeaponStats("tesla", slot);
  const chainCount = Math.round(stats.extra);
  const chainPoints: Array<{ x: number; y: number }> = [{ ...world.submarine.pos }];
  const hitIds = new Set<number>();

  let current: Monster | null = firstTarget;
  let from: { x: number; y: number } = world.submarine.pos;
  for (let i = 0; i < chainCount && current; i++) {
    damageMonster(world, current, stats.damage, from, now);
    chainPoints.push({ ...current.pos });
    hitIds.add(current.id);
    from = current.pos;

    let next: Monster | null = null;
    let bestDist = TESLA_CHAIN_RANGE;
    for (const candidate of world.monsters) {
      if (candidate.hp <= 0 || hitIds.has(candidate.id)) continue;
      const d = distance(current.pos, candidate.pos);
      if (d <= bestDist) {
        bestDist = d;
        next = candidate;
      }
    }
    current = next;
  }

  for (let i = 0; i < chainPoints.length - 1; i++) {
    world.effects.push({
      id: world.nextEntityId++,
      kind: "lightning",
      from: chainPoints[i],
      to: chainPoints[i + 1],
      bornAt: now,
      ttlSec: 0.25,
    });
    if (slot.overcharged) {
      const mid = {
        x: (chainPoints[i].x + chainPoints[i + 1].x) / 2,
        y: (chainPoints[i].y + chainPoints[i + 1].y) / 2,
      };
      world.effects.push({
        id: world.nextEntityId++,
        kind: "zone-damage",
        pos: mid,
        radius: 60,
        damagePerSec: stats.damage * 0.3,
        damageTarget: "monsters",
        bornAt: now,
        ttlSec: 1.5,
      });
    }
  }
}

function fireTorpedo(world: WorldState, slot: WeaponSlot, target: Monster, now: number): void {
  const stats = getEffectiveWeaponStats("torpedo", slot);
  const thermalLevel = passiveLevel(world, "thermal");
  const critChance = PASSIVE_DEFS.thermal.perLevel * thermalLevel;
  const damage = Math.random() < critChance ? stats.damage * 1.5 : stats.damage;
  const dir = normalize(vsub(target.pos, world.submarine.pos));

  world.projectiles.push({
    id: world.nextEntityId++,
    owner: "player",
    weaponId: "torpedo",
    pos: { ...world.submarine.pos },
    velocity: scale(dir, TORPEDO_SPEED),
    damage,
    piercesLeft: 0,
    explodeRadius: stats.extra,
    hitMonsterIds: [],
    bornAt: now,
    maxLifeSec: 2.5,
  });
}

function pickTorpedoTarget(world: WorldState, visible: Monster[], overcharged: boolean): Monster | null {
  if (!overcharged) return nearestOf(world.submarine.pos, visible);
  const nearCore = visible.filter((m) => distance(m.pos, world.core.pos) <= 500);
  const pool = nearCore.length > 0 ? nearCore : visible;
  return pool.reduce<Monster | null>((best, m) => (!best || m.hp > best.hp ? m : best), null);
}

export function updateWeapons(world: WorldState, dt: number, now: number): void {
  const empActive = now < world.empUntil;
  const visible = visibleMonsters(world);
  const cooldownMult = weaponCooldownMultiplier(world.submarine, world.core);

  (Object.keys(world.weapons) as WeaponId[]).forEach((weaponId) => {
    const slot = world.weapons[weaponId];
    if (slot.level <= 0) return;

    slot.cooldownRemaining = Math.max(0, slot.cooldownRemaining - dt);
    if (empActive || slot.cooldownRemaining > 0 || visible.length === 0) return;

    let fired = false;
    if (weaponId === "sonar") {
      fireSonar(world, slot, now);
      fired = true;
    } else {
      const target =
        weaponId === "torpedo"
          ? pickTorpedoTarget(world, visible, slot.overcharged)
          : nearestOf(world.submarine.pos, visible);
      if (target) {
        if (weaponId === "harpoon") fireHarpoon(world, slot, target, now);
        else if (weaponId === "tesla") fireTesla(world, slot, target, now);
        else if (weaponId === "torpedo" && target) fireTorpedo(world, slot, target, now);
        fired = true;
      }
    }

    if (fired) {
      const stats = getEffectiveWeaponStats(weaponId, slot);
      slot.cooldownRemaining = stats.cooldown * cooldownMult;
    }
  });
}

export function applyHarpoonKnockback(monster: Monster, fromPos: { x: number; y: number }, strength: number): void {
  if (strength <= 0) return;
  const dir = normalize(vsub(monster.pos, fromPos));
  monster.pos = add(monster.pos, scale(dir, strength));
}
