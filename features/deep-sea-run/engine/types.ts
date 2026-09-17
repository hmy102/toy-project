import type { Vec2 } from "./vector";

export type WeaponId = "sonar" | "harpoon" | "tesla" | "torpedo";
export type PassiveId = "amplifier" | "piston" | "capacitor" | "thermal";
export type CoreModuleId =
  | "tether_discharge"
  | "nano_drone"
  | "searchlight_turret";

export type MonsterKind =
  | "krill"
  | "eel"
  | "euphonophore"
  | "ghost_squid"
  | "vent_crab"
  | "angler_lord"
  | "leviathan";

export type MonsterTarget = "submarine" | "core" | "lure";

export interface Submarine {
  pos: Vec2;
  velocity: Vec2;
  aimAngle: number;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  invulnUntil: number;
  timeOutsideTether: number;
  warnedOutsideTether: boolean;
}

export interface Core {
  pos: Vec2;
  hp: number;
  maxHp: number;
  lastDischargeThresholdHp: number;
  turretAngle: number;
}

export interface Monster {
  id: number;
  kind: MonsterKind;
  pos: Vec2;
  facing: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  target: MonsterTarget;
  glowColor: string;
  radius: number;
  visible: boolean;
  revealed: boolean;
  chargeDir?: Vec2;
  isDashing?: boolean;
  attachedToCore?: boolean;
  coreDamageTickAt?: number;
  lastHitAt?: number;
  lureBlinkOn?: boolean;
  stunnedUntil?: number;
  forcedVisibleUntil?: number;
  lastRangedAttackAt?: number;
  spawnAt: number;
}

export interface Projectile {
  id: number;
  owner: "player" | "monster";
  weaponId: WeaponId | "angler-sonic";
  pos: Vec2;
  velocity: Vec2;
  damage: number;
  piercesLeft: number;
  explodeRadius?: number;
  hitMonsterIds: number[];
  knockback?: number;
  bornAt: number;
  maxLifeSec: number;
}

export interface Pickup {
  id: number;
  pos: Vec2;
  value: number;
}

export type EffectKind =
  | "pulse"
  | "explosion"
  | "lightning"
  | "stun-flash"
  | "core-discharge"
  | "zone-damage"
  | "ink"
  | "emp";

export interface Effect {
  id: number;
  kind: EffectKind;
  from?: Vec2;
  to?: Vec2;
  pos?: Vec2;
  radius?: number;
  damagePerSec?: number;
  damageTarget?: "core" | "monsters";
  bornAt: number;
  ttlSec: number;
}

export interface WeaponSlot {
  id: WeaponId;
  level: number;
  overcharged: boolean;
  cooldownRemaining: number;
}

export interface PassiveSlot {
  id: PassiveId;
  level: number;
}

export type UpgradeChoice =
  | { kind: "weapon"; id: WeaponId }
  | { kind: "passive"; id: PassiveId }
  | { kind: "overcharge"; id: WeaponId };

export type GamePhase =
  | "start"
  | "running"
  | "levelup"
  | "core-module"
  | "victory"
  | "defeat";

export interface DirectorState {
  nextKrillSwarmAt: number;
  nextEelAt: number;
  nextEuphonophoreAt: number;
  nextGhostSquidAt: number;
  nextVentCrabAt: number;
  anglerLordSpawned: boolean;
  leviathanSpawned: boolean;
  coreModuleGateIndex: number;
  nextPlanktonAt: number;
}

export interface DefeatInfo {
  outcome: "victory" | "hull" | "core";
  survivedSec: number;
}

export interface WorldState {
  timeSec: number;
  phase: GamePhase;
  director: DirectorState;
  submarine: Submarine;
  core: Core;
  monsters: Monster[];
  projectiles: Projectile[];
  pickups: Pickup[];
  effects: Effect[];
  weapons: Record<WeaponId, WeaponSlot>;
  passives: Record<PassiveId, PassiveSlot>;
  coreModules: CoreModuleId[];
  exp: number;
  level: number;
  expToNext: number;
  pendingUpgradeChoices: UpgradeChoice[] | null;
  pendingCoreModuleChoices: CoreModuleId[] | null;
  empUntil: number;
  inkUntil: number;
  result: DefeatInfo | null;
  nextEntityId: number;
}
