import {
  ANGLER_LORD_FIRE_INTERVAL_SEC,
  ANGLER_LORD_SONIC_SPEED,
  ARENA_HEIGHT,
  ARENA_WIDTH,
  CORE_ATTACHED_DAMAGE_INTERVAL_SEC,
  CORE_VISUAL_RADIUS,
  EEL_DASH_SPEED,
  EEL_DASH_TRIGGER_RANGE,
  EUPHONOPHORE_ZONE_DAMAGE_PER_SEC,
  EUPHONOPHORE_ZONE_DURATION_SEC,
  EUPHONOPHORE_ZONE_RADIUS,
  GHOST_SQUID_INK_SEC,
  LEVIATHAN_EMP_DURATION_SEC,
  LEVIATHAN_EMP_INTERVAL_SEC,
  MONSTER_DEFS,
  SUB_RADIUS,
  TURRET_DAMAGE_TAKEN_BONUS,
  TURRET_SLOW_RATIO,
  VENT_CRAB_FRONT_DAMAGE_REDUCTION,
} from "./constants";
import { circlesOverlap, isInTurretBeam } from "./collision";
import type { Monster, MonsterKind, WorldState } from "./types";
import {
  add,
  angleDiff,
  angleOf,
  distance,
  normalize,
  scale,
  sub as vsub,
} from "./vector";
import { applyDamageToSubmarine, isSubmarineInvulnerable, triggerSubmarineInvuln } from "./submarine";
import { applyDamageToCore } from "./core";

function randomEdgePosition(): { x: number; y: number } {
  const margin = 24;
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * ARENA_WIDTH, y: margin };
  if (side === 1) return { x: Math.random() * ARENA_WIDTH, y: ARENA_HEIGHT - margin };
  if (side === 2) return { x: margin, y: Math.random() * ARENA_HEIGHT };
  return { x: ARENA_WIDTH - margin, y: Math.random() * ARENA_HEIGHT };
}

function baseMonster(world: WorldState, kind: MonsterKind, pos: { x: number; y: number }, now: number): Monster {
  const def = MONSTER_DEFS[kind];
  return {
    id: world.nextEntityId++,
    kind,
    pos: { ...pos },
    facing: { x: 0, y: -1 },
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    damage: def.damage,
    target: def.target,
    glowColor: def.glowColor,
    radius: def.radius,
    visible: false,
    revealed: false,
    spawnAt: now,
  };
}

export function spawnKrillSwarm(world: WorldState, now: number): void {
  const count = 30 + Math.floor(Math.random() * 21);
  const cluster = randomEdgePosition();
  for (let i = 0; i < count; i++) {
    const jitter = { x: (Math.random() - 0.5) * 120, y: (Math.random() - 0.5) * 120 };
    const pos = add(cluster, jitter);
    const monster = baseMonster(world, "krill", pos, now);
    monster.chargeDir = normalize(vsub(world.submarine.pos, pos));
    world.monsters.push(monster);
  }
}

export function spawnSingleMonster(world: WorldState, kind: MonsterKind, now: number): void {
  world.monsters.push(baseMonster(world, kind, randomEdgePosition(), now));
}

export function spawnAnglerLord(world: WorldState, now: number): void {
  const core = world.core;
  const awayFromSub = normalize(vsub(core.pos, world.submarine.pos));
  const dir = awayFromSub.x === 0 && awayFromSub.y === 0 ? { x: 0, y: -1 } : awayFromSub;
  const raw = add(core.pos, scale(dir, 850));
  const pos = {
    x: Math.min(ARENA_WIDTH - 40, Math.max(40, raw.x)),
    y: Math.min(ARENA_HEIGHT - 40, Math.max(40, raw.y)),
  };
  const monster = baseMonster(world, "angler_lord", pos, now);
  monster.lureBlinkOn = true;
  world.monsters.push(monster);
}

export function spawnLeviathan(world: WorldState, now: number): void {
  const monster = baseMonster(world, "leviathan", randomEdgePosition(), now);
  world.monsters.push(monster);
  spawnLeviathanEmp(world, now);
}

function spawnLeviathanEmp(world: WorldState, now: number): void {
  world.empUntil = now + LEVIATHAN_EMP_DURATION_SEC;
  world.effects.push({
    id: world.nextEntityId++,
    kind: "emp",
    pos: { ...world.core.pos },
    radius: 2000,
    bornAt: now,
    ttlSec: 0.6,
  });
}

function moveToward(monster: Monster, target: { x: number; y: number }, speed: number, dt: number): void {
  const dir = normalize(vsub(target, monster.pos));
  monster.facing = dir;
  monster.pos = add(monster.pos, scale(dir, speed * dt));
}

function explodeEuphonophore(world: WorldState, monster: Monster, now: number): void {
  applyDamageToCore(
    world.core,
    monster.damage,
    world.coreModules,
    world.monsters,
    now,
    (effect) => {
      world.effects.push({ id: world.nextEntityId++, bornAt: now, ...effect });
    },
    now < world.empUntil
  );
  world.effects.push({
    id: world.nextEntityId++,
    kind: "zone-damage",
    pos: { ...world.core.pos },
    radius: EUPHONOPHORE_ZONE_RADIUS,
    damagePerSec: EUPHONOPHORE_ZONE_DAMAGE_PER_SEC,
    damageTarget: "core",
    bornAt: now,
    ttlSec: EUPHONOPHORE_ZONE_DURATION_SEC,
  });
  monster.hp = 0;
}

function isStunned(monster: Monster, now: number): boolean {
  return (monster.stunnedUntil ?? 0) > now;
}

export function updateMonsterBehavior(world: WorldState, dt: number, now: number): void {
  const { submarine, core } = world;

  for (const monster of world.monsters) {
    if (monster.hp <= 0) continue;
    if (isStunned(monster, now)) continue;

    const slowed =
      now >= world.empUntil &&
      world.coreModules.includes("searchlight_turret") &&
      isInTurretBeam(core, monster.pos);
    const speedMult = slowed ? 1 - TURRET_SLOW_RATIO : 1;

    switch (monster.kind) {
      case "krill": {
        const dir = monster.chargeDir ?? { x: 0, y: 1 };
        monster.facing = dir;
        monster.pos = add(monster.pos, scale(dir, monster.speed * speedMult * dt));
        break;
      }
      case "eel": {
        const dist = distance(monster.pos, submarine.pos);
        monster.isDashing = dist <= EEL_DASH_TRIGGER_RANGE;
        const speed = (monster.isDashing ? EEL_DASH_SPEED : monster.speed) * speedMult;
        moveToward(monster, submarine.pos, speed, dt);
        break;
      }
      case "euphonophore": {
        moveToward(monster, core.pos, monster.speed * speedMult, dt);
        if (distance(monster.pos, core.pos) <= CORE_VISUAL_RADIUS + monster.radius) {
          explodeEuphonophore(world, monster, now);
        }
        break;
      }
      case "ghost_squid": {
        const distToSub = distance(monster.pos, submarine.pos);
        const distToCore = distance(monster.pos, core.pos);
        const targetPos = distToSub <= distToCore ? submarine.pos : core.pos;
        moveToward(monster, targetPos, monster.speed * speedMult, dt);
        break;
      }
      case "vent_crab": {
        moveToward(monster, core.pos, monster.speed * speedMult, dt);
        break;
      }
      case "angler_lord": {
        // 코어와 잠수정을 무시하고 제자리 근방에서 유인 신호만 점멸하며 음파 탄환을 쏜다.
        monster.lureBlinkOn = Math.sin(now * 2.2) > 0;
        if (now - (monster.lastRangedAttackAt ?? -Infinity) >= ANGLER_LORD_FIRE_INTERVAL_SEC) {
          monster.lastRangedAttackAt = now;
          const dir = normalize(vsub(submarine.pos, monster.pos));
          world.projectiles.push({
            id: world.nextEntityId++,
            owner: "monster",
            weaponId: "angler-sonic",
            pos: { ...monster.pos },
            velocity: scale(dir, ANGLER_LORD_SONIC_SPEED),
            damage: monster.damage,
            piercesLeft: 0,
            hitMonsterIds: [],
            bornAt: now,
            maxLifeSec: 3,
          });
        }
        break;
      }
      case "leviathan": {
        moveToward(monster, core.pos, monster.speed * speedMult, dt);
        const sinceSpawn = now - monster.spawnAt;
        const cyclePos = sinceSpawn % LEVIATHAN_EMP_INTERVAL_SEC;
        if (cyclePos < dt && sinceSpawn > dt) {
          spawnLeviathanEmp(world, now);
        }
        break;
      }
    }
  }
}

function ventCrabDamageMultiplier(monster: Monster, sourcePos: { x: number; y: number }): number {
  const toSource = normalize(vsub(sourcePos, monster.pos));
  const facingAngle = angleOf(monster.facing);
  const sourceAngle = angleOf(toSource);
  const diff = Math.abs(angleDiff(facingAngle, sourceAngle));
  // 전방(정면) 110도 안에서 들어온 피해는 60% 경감한다.
  const isFrontal = diff <= (110 * Math.PI) / 180 / 2;
  return isFrontal ? 1 - VENT_CRAB_FRONT_DAMAGE_REDUCTION : 1;
}

/** 무기 피해를 몬스터에 적용한다. 열수구 단단게는 전면 피격 시 경감하고, 유령 오징어는 첫 피격에 정체를 드러낸다. */
export function damageMonster(
  world: WorldState,
  monster: Monster,
  rawDamage: number,
  sourcePos: { x: number; y: number },
  now: number
): void {
  let amount = rawDamage;
  if (monster.kind === "vent_crab") {
    amount *= ventCrabDamageMultiplier(monster, sourcePos);
  }
  if (
    now >= world.empUntil &&
    world.coreModules.includes("searchlight_turret") &&
    isInTurretBeam(world.core, monster.pos)
  ) {
    amount *= 1 + TURRET_DAMAGE_TAKEN_BONUS;
  }
  monster.hp -= amount;
  monster.lastHitAt = now;
  if (monster.kind === "ghost_squid" && !monster.revealed) {
    monster.revealed = true;
    world.inkUntil = now + GHOST_SQUID_INK_SEC;
    world.effects.push({ id: world.nextEntityId++, kind: "ink", bornAt: now, ttlSec: GHOST_SQUID_INK_SEC });
  }
}

export function updateMonsterContactDamage(world: WorldState, now: number): void {
  const { submarine, core } = world;

  if (!isSubmarineInvulnerable(submarine, now)) {
    let bestDamage = 0;
    for (const monster of world.monsters) {
      if (monster.hp <= 0) continue;
      if (circlesOverlap(monster.pos, monster.radius, submarine.pos, SUB_RADIUS)) {
        bestDamage = Math.max(bestDamage, monster.damage);
      }
    }
    if (bestDamage > 0) {
      applyDamageToSubmarine(submarine, bestDamage);
      triggerSubmarineInvuln(submarine, now);
    }
  }

  for (const monster of world.monsters) {
    if (monster.hp <= 0) continue;
    if (!circlesOverlap(monster.pos, monster.radius, core.pos, CORE_VISUAL_RADIUS)) {
      monster.attachedToCore = false;
      continue;
    }
    monster.attachedToCore = true;
    if ((monster.coreDamageTickAt ?? -Infinity) + CORE_ATTACHED_DAMAGE_INTERVAL_SEC <= now) {
      monster.coreDamageTickAt = now;
      applyDamageToCore(
        core,
        monster.damage,
        world.coreModules,
        world.monsters,
        now,
        (effect) => {
          world.effects.push({ id: world.nextEntityId++, bornAt: now, ...effect });
        },
        now < world.empUntil
      );
    }
  }

  world.monsters = world.monsters.filter((monster) => monster.hp > 0);
}
