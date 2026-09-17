import { RUN_DURATION_SEC, requiredExpForLevel } from "./constants";
import { computeVisibility } from "./collision";
import { applyDamageToCore, createCore, updateTurret } from "./core";
import { createDirectorState, updateDirector } from "./director";
import { applyUpgradeChoice, createPassiveSlots, createWeaponSlots, updateGrowth } from "./growth";
import { damageMonster, updateMonsterBehavior, updateMonsterContactDamage } from "./monsters";
import { updateProjectiles } from "./projectiles";
import {
  createSubmarine,
  isWithinTether,
  type MoveInput,
  updateCoreRegen,
  updateSubmarineMovement,
  updateTetherEffects,
} from "./submarine";
import type { CoreModuleId, UpgradeChoice, WorldState } from "./types";
import { distance } from "./vector";
import { updateWeapons } from "./weapons";

export function createWorld(): WorldState {
  return {
    timeSec: 0,
    phase: "start",
    submarine: createSubmarine(),
    core: createCore(),
    monsters: [],
    projectiles: [],
    pickups: [],
    effects: [],
    weapons: createWeaponSlots(),
    passives: createPassiveSlots(),
    coreModules: [],
    exp: 0,
    level: 1,
    expToNext: requiredExpForLevel(2),
    pendingUpgradeChoices: null,
    pendingCoreModuleChoices: null,
    empUntil: 0,
    inkUntil: 0,
    result: null,
    nextEntityId: 1,
    director: createDirectorState(),
  };
}

export interface GameInput {
  move: MoveInput;
  aimAngle: number;
}

function applyZoneEffects(world: WorldState, dt: number, now: number): void {
  for (const effect of world.effects) {
    if (effect.kind !== "zone-damage") continue;
    if (now - effect.bornAt > effect.ttlSec) continue;
    const radius = effect.radius ?? 0;
    const dps = effect.damagePerSec ?? 0;
    if (effect.damageTarget === "core") {
      if (effect.pos && distance(effect.pos, world.core.pos) <= radius) {
        applyDamageToCore(
          world.core,
          dps * dt,
          world.coreModules,
          world.monsters,
          now,
          (created) => {
            world.effects.push({ id: world.nextEntityId++, bornAt: now, ...created });
          },
          now < world.empUntil
        );
      }
    } else if (effect.damageTarget === "monsters" && effect.pos) {
      for (const monster of world.monsters) {
        if (monster.hp <= 0) continue;
        if (distance(effect.pos, monster.pos) <= radius) {
          damageMonster(world, monster, dps * dt, effect.pos, now);
        }
      }
    }
  }
}

function pruneEffects(world: WorldState, now: number): void {
  world.effects = world.effects.filter((effect) => now - effect.bornAt <= effect.ttlSec);
}

export function tick(world: WorldState, dt: number, input: GameInput): void {
  if (world.phase !== "running") return;

  world.timeSec += dt;
  const now = world.timeSec;

  if (now >= RUN_DURATION_SEC) {
    world.timeSec = RUN_DURATION_SEC;
    world.phase = "victory";
    world.result = { outcome: "victory", survivedSec: RUN_DURATION_SEC };
    return;
  }

  const { submarine, core } = world;
  updateSubmarineMovement(submarine, input.move, dt);
  submarine.aimAngle = input.aimAngle;
  updateTetherEffects(submarine, core, dt, world.coreModules);

  const empActive = now < world.empUntil;
  updateCoreRegen(core, dt, world.coreModules, empActive);
  updateTurret(core, world.coreModules, dt);

  const turretActive = world.coreModules.includes("searchlight_turret") && !empActive;
  for (const monster of world.monsters) {
    monster.visible = computeVisibility(monster, submarine, core, turretActive, now);
  }

  updateMonsterBehavior(world, dt, now);
  updateWeapons(world, dt, now);
  updateProjectiles(world, dt, now);
  applyZoneEffects(world, dt, now);
  updateMonsterContactDamage(world, now);

  updateGrowth(world, now);
  if (world.phase === "running") {
    updateDirector(world, now);
  }

  pruneEffects(world, now);

  if (world.submarine.hull <= 0) {
    world.phase = "defeat";
    world.result = { outcome: "hull", survivedSec: now };
    return;
  }
  if (world.core.hp <= 0) {
    world.phase = "defeat";
    world.result = { outcome: "core", survivedSec: now };
    return;
  }
}

export function resolveUpgradeChoice(world: WorldState, choice: UpgradeChoice): void {
  applyUpgradeChoice(world, choice);
  world.pendingUpgradeChoices = null;
  world.phase = "running";
}

export function resolveCoreModuleChoice(world: WorldState, moduleId: CoreModuleId): void {
  world.coreModules.push(moduleId);
  world.pendingCoreModuleChoices = null;
  world.phase = "running";
}

export function startRun(world: WorldState): void {
  world.phase = "running";
}

export { isWithinTether };
