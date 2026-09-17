import {
  ANGLER_LORD_TIME,
  CORE_MODULE_CHOICE_TIMES,
  HIGH_DENSITY_TIME,
  LEVIATHAN_TIME,
} from "./constants";
import { spawnAnglerLord, spawnKrillSwarm, spawnLeviathan, spawnSingleMonster } from "./monsters";
import type { CoreModuleId, DirectorState, WorldState } from "./types";

export function createDirectorState(): DirectorState {
  return {
    nextKrillSwarmAt: 4,
    nextEelAt: 25,
    nextEuphonophoreAt: CORE_MODULE_CHOICE_TIMES[0] + 2,
    nextGhostSquidAt: 330,
    nextVentCrabAt: 335,
    anglerLordSpawned: false,
    leviathanSpawned: false,
    coreModuleGateIndex: 0,
    nextPlanktonAt: 2,
  };
}

const ALL_CORE_MODULES: CoreModuleId[] = ["tether_discharge", "nano_drone", "searchlight_turret"];

export function updateDirector(world: WorldState, now: number): void {
  const density = now >= HIGH_DENSITY_TIME ? 0.55 : 1;
  const director = world.director;

  if (now >= director.nextKrillSwarmAt) {
    spawnKrillSwarm(world, now);
    director.nextKrillSwarmAt = now + (8 + Math.random() * 4) * density;
  }

  if (now >= director.nextEelAt) {
    spawnSingleMonster(world, "eel", now);
    director.nextEelAt = now + (6 + Math.random() * 4) * density;
  }

  if (now >= CORE_MODULE_CHOICE_TIMES[0] && now >= director.nextEuphonophoreAt) {
    spawnSingleMonster(world, "euphonophore", now);
    director.nextEuphonophoreAt = now + (12 + Math.random() * 6) * density;
  }

  if (now >= director.nextGhostSquidAt) {
    spawnSingleMonster(world, "ghost_squid", now);
    director.nextGhostSquidAt = now + (16 + Math.random() * 6) * density;
  }

  if (now >= director.nextVentCrabAt) {
    spawnSingleMonster(world, "vent_crab", now);
    director.nextVentCrabAt = now + (20 + Math.random() * 8) * density;
  }

  if (!director.anglerLordSpawned && now >= ANGLER_LORD_TIME) {
    director.anglerLordSpawned = true;
    spawnAnglerLord(world, now);
  }

  if (!director.leviathanSpawned && now >= LEVIATHAN_TIME) {
    director.leviathanSpawned = true;
    spawnLeviathan(world, now);
  }

  if (
    world.phase === "running" &&
    director.coreModuleGateIndex < CORE_MODULE_CHOICE_TIMES.length &&
    now >= CORE_MODULE_CHOICE_TIMES[director.coreModuleGateIndex]
  ) {
    const candidates = ALL_CORE_MODULES.filter((id) => !world.coreModules.includes(id));
    world.pendingCoreModuleChoices = candidates;
    world.phase = "core-module";
    director.coreModuleGateIndex += 1;
  }
}
