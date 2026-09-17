import type {
  CoreModuleId,
  MonsterKind,
  MonsterTarget,
  PassiveId,
  WeaponId,
} from "./types";
import type { Vec2 } from "./vector";

export const ARENA_WIDTH = 1920;
export const ARENA_HEIGHT = 1080;
export const CORE_POS: Vec2 = { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 };
export const CORE_VISUAL_RADIUS = 64;
export const TETHER_RADIUS = 280;
export const RUN_DURATION_SEC = 600;

export const SUB_START_POS: Vec2 = { x: CORE_POS.x, y: CORE_POS.y + 160 };
export const SUB_MAX_HULL = 100;
export const SUB_MAX_SHIELD = 50;
export const SUB_MAX_SPEED = 240;
export const SUB_ACCEL = 960;
export const SUB_DECEL = 780;
export const SUB_RADIUS = 16;
export const SUB_INVULN_SEC = 0.5;

export const VISION_CONE_DEG = 95;
export const VISION_GLOW_RADIUS = 90;

// 서치라이트는 레벨이 오를수록 더 멀리 닿는다. 부채꼴 각도는 고정이라 훑는 폭은
// 그대로고, 미리 볼 수 있는 거리만 길어진다. 상한을 두어 암흑의 긴장을 남긴다.
export const VISION_RANGE_BASE = 350;
export const VISION_RANGE_PER_LEVEL = 12;
export const VISION_RANGE_MAX = 560;

export function visionRangeForLevel(level: number): number {
  return Math.min(VISION_RANGE_MAX, VISION_RANGE_BASE + (level - 1) * VISION_RANGE_PER_LEVEL);
}

// 서치라이트에서 또렷하게 밝은 구간의 길이. 사거리와 무관한 고정값이라,
// 사거리가 늘면 밝은 구간이 아니라 그 너머로 옅게 퍼지는 거리가 길어진다.
export const VISION_BEAM_SOLID_RANGE = 240;
// 레벨업 직후 새 사거리까지 한 번 퍼지는 빛 파동의 지속 시간.
export const VISION_GROW_EFFECT_SEC = 1.1;

// 코어 자체가 내는 근접 미광. 터렛 모듈 유무와 무관하게 상시 켜져 있어
// 아주 가까이 붙은 적을 감지한다.
export const CORE_GLOW_RADIUS = 70;

export const TETHER_HULL_REGEN_PER_SEC = SUB_MAX_HULL * 0.025;
export const TETHER_SHIELD_REGEN_PER_SEC = 10;
export const TETHER_LEAVE_GRACE_SEC = 7;
export const TETHER_LEAVE_DRAIN_PER_SEC = 1;
export const TETHER_WEAPON_COOLDOWN_MULT = 0.85;

export const CORE_MAX_HP = 2000;

export const CORE_MODULE_CHOICE_TIMES = [120, 270, 420] as const; // 02:00, 04:30, 07:00
export const ANGLER_LORD_TIME = 300; // 05:00
export const LEVIATHAN_TIME = 540; // 09:00
export const HIGH_DENSITY_TIME = 420; // 07:00 이후 스폰량 증가

// 유보한 결정: 레벨업 EXP 곡선과 플랑크톤 공급량은 원본 사양에 수치가 없다.
// 수용 기준 13번(05:00 첫 오버차지, 09:00 전 두 번째 오버차지)을 목표로 아래 값을 잠정 확정한다.
export const PLANKTON_EXP_VALUE = 18;
export const PLANKTON_RADIUS = 14;
export const PLANKTON_SPAWN_INTERVAL_SEC = 3.2;
export const PLANKTON_MAX_CONCURRENT = 7;
export const PLANKTON_RING_MARGIN = 90; // 아레나 외곽에서 이 거리 안쪽에 생성

export function requiredExpForLevel(level: number): number {
  return 85 + (level - 1) * 2;
}

export const WEAPON_MAX_LEVEL = 7;
export const PASSIVE_MAX_LEVEL = 4;

export interface WeaponBaseStats {
  id: WeaponId;
  name: string;
  passiveId: PassiveId;
  // 레벨업 선택지에서 처음 보는 플레이어에게 무기의 동작을 설명하는 한 문장
  description: string;
  // extra 수치가 무엇을 뜻하는지 가리키는 표시용 라벨
  extraLabel: string;
  damage: number;
  cooldown: number;
  // sonar: radius(px), harpoon: pierce count, tesla: chain count, torpedo: explode radius(px)
  extra: number;
  overcharge: {
    name: string;
    description: string;
    damage: number;
    cooldown: number;
    extra: number;
  };
}

export const WEAPON_DEFS: Record<WeaponId, WeaponBaseStats> = {
  sonar: {
    id: "sonar",
    name: "고주파 소나",
    passiveId: "amplifier",
    description: "잠수정을 중심으로 음파를 터뜨려 반경 안의 적을 한꺼번에 때린다. 조준이 필요 없다.",
    extraLabel: "반경",
    damage: 28,
    cooldown: 1.4,
    extra: 190,
    overcharge: {
      name: "공진 파쇄파",
      description: "반경이 크게 넓어지고, 맞은 적은 0.8초 굳은 채 2초 동안 어둠 속에서도 드러난다.",
      damage: 95,
      cooldown: 0.9,
      extra: 340,
    },
  },
  harpoon: {
    id: "harpoon",
    name: "압축 수중 작살",
    passiveId: "piston",
    description: "가장 가까운 적에게 작살을 쏜다. 적을 꿰뚫고 나아가 뒤에 겹친 적까지 맞힌다.",
    extraLabel: "관통",
    damage: 75,
    cooldown: 1.1,
    extra: 2,
    overcharge: {
      name: "초공포 랜스",
      description: "관통 제한이 사실상 사라져 일직선에 놓인 적을 모두 꿰뚫는다.",
      damage: 280,
      cooldown: 0.65,
      extra: 99,
    },
  },
  tesla: {
    id: "tesla",
    name: "테슬라 방전 코일",
    passiveId: "capacitor",
    description: "가장 가까운 적에게 전류를 흘리고, 그 적에서 근처 적으로 번개가 연쇄한다.",
    extraLabel: "연쇄",
    damage: 18,
    cooldown: 1.2,
    extra: 4,
    overcharge: {
      name: "심해 아크 메일스트롬",
      description: "연쇄가 길어지고, 번개가 지나간 자리에 1.5초 동안 감전 지대가 남는다.",
      damage: 48,
      cooldown: 0.7,
      extra: 10,
    },
  },
  torpedo: {
    id: "torpedo",
    name: "열수 유도 어뢰",
    passiveId: "thermal",
    description: "가장 가까운 적을 향해 어뢰를 쏘고, 맞은 자리에서 터져 주변 적까지 함께 태운다.",
    extraLabel: "폭발 반경",
    damage: 160,
    cooldown: 2.8,
    extra: 100,
    overcharge: {
      name: "지열 폭심 어뢰",
      description: "코어 근처에서 가장 튼튼한 적을 우선 노리고, 폭발 반경이 크게 넓어진다.",
      damage: 520,
      cooldown: 1.8,
      extra: 180,
    },
  },
};

export interface PassiveBaseStats {
  id: PassiveId;
  name: string;
  weaponId: WeaponId;
  // 이 모듈이 대응 무기를 어떻게 바꾸는지 설명하는 한 문장
  description: string;
  // 레벨 하나당 붙는 효과의 수치 표기
  effect: string;
  perLevel: number;
}

export const PASSIVE_DEFS: Record<PassiveId, PassiveBaseStats> = {
  amplifier: {
    id: "amplifier",
    name: "음향 증폭기",
    weaponId: "sonar",
    description: "고주파 소나의 음파가 닿는 반경을 넓힌다.",
    effect: "레벨당 공격 범위 +12%",
    perLevel: 0.12,
  },
  piston: {
    id: "piston",
    name: "유압 가압 피스톤",
    weaponId: "harpoon",
    description: "압축 수중 작살을 더 빠르게 쏘고, 맞은 적을 뒤로 밀어낸다.",
    effect: "레벨당 탄속 +20%, 넉백",
    perLevel: 0.2,
  },
  capacitor: {
    id: "capacitor",
    name: "초전도 축전지",
    weaponId: "tesla",
    description: "테슬라 방전 코일의 재충전을 앞당겨 더 자주 터뜨린다.",
    effect: "레벨당 쿨타임 -10%",
    perLevel: 0.1,
  },
  thermal: {
    id: "thermal",
    name: "열감지 분석기",
    weaponId: "torpedo",
    description: "열수 유도 어뢰가 약점을 짚어 치명타를 낼 확률을 올린다.",
    effect: "레벨당 치명타 확률 +10% (피해 1.5배)",
    perLevel: 0.1,
  },
};

export interface CoreModuleDef {
  id: CoreModuleId;
  name: string;
  description: string;
}

export const CORE_MODULE_DEFS: Record<CoreModuleId, CoreModuleDef> = {
  tether_discharge: {
    id: "tether_discharge",
    name: "비상 방전 테더",
    description:
      "코어 체력이 최대치의 10%만큼 줄어들 때마다 반경 300px 안의 모든 적에게 250 피해와 2초 마비를 준다.",
  },
  nano_drone: {
    id: "nano_drone",
    name: "나노 수리 드론 사출구",
    description:
      "코어 체력을 초당 30씩 회복하고, 테더 반경 안 잠수정의 선체 회복 속도를 2배로 만든다.",
  },
  searchlight_turret: {
    id: "searchlight_turret",
    name: "회전식 탐조등 터렛",
    description:
      "코어에서 360도로 도는 탐조등이 상시 작동한다. 빛에 닿은 적은 이동 속도가 40% 느려지고 받는 피해가 25% 늘어난다.",
  },
};

export const CORE_DISCHARGE_STEP_RATIO = 0.1;
export const CORE_DISCHARGE_RADIUS = 300;
export const CORE_DISCHARGE_DAMAGE = 250;
export const CORE_DISCHARGE_STUN_SEC = 2;
export const NANO_DRONE_CORE_REGEN_PER_SEC = 30;
export const TURRET_SLOW_RATIO = 0.4;
export const TURRET_DAMAGE_TAKEN_BONUS = 0.25;
export const TURRET_ROTATE_SPEED = Math.PI * 0.6; // rad/s
export const TURRET_BEAM_WIDTH_DEG = 50;
export const TURRET_BEAM_RANGE = 470;

export interface MonsterBaseStats {
  kind: MonsterKind;
  name: string;
  glowColor: string;
  hp: number;
  speed: number;
  damage: number;
  target: MonsterTarget;
  radius: number;
}

export const MONSTER_DEFS: Record<MonsterKind, MonsterBaseStats> = {
  krill: {
    kind: "krill",
    name: "발광 멸구",
    glowColor: "#22d3ee",
    hp: 14,
    speed: 210,
    damage: 4,
    target: "submarine",
    radius: 8,
  },
  eel: {
    kind: "eel",
    name: "흡착 독사어",
    glowColor: "#34d399",
    hp: 50,
    speed: 260,
    damage: 12,
    target: "submarine",
    radius: 14,
  },
  euphonophore: {
    kind: "euphonophore",
    name: "군체 유포노포어",
    glowColor: "#fb923c",
    hp: 160,
    speed: 90,
    damage: 35,
    target: "core",
    radius: 20,
  },
  ghost_squid: {
    kind: "ghost_squid",
    name: "유령 오징어",
    glowColor: "#a78bfa",
    hp: 110,
    speed: 190,
    damage: 18,
    target: "submarine",
    radius: 16,
  },
  vent_crab: {
    kind: "vent_crab",
    name: "열수구 단단게",
    glowColor: "#ef4444",
    hp: 600,
    speed: 65,
    damage: 30,
    target: "core",
    radius: 26,
  },
  angler_lord: {
    kind: "angler_lord",
    name: "심해 아귀 군주",
    glowColor: "#facc15",
    hp: 8500,
    speed: 120,
    damage: 50,
    target: "lure",
    radius: 40,
  },
  leviathan: {
    kind: "leviathan",
    name: "심연의 리바이어던",
    glowColor: "#5eead4",
    hp: 35000,
    speed: 100,
    damage: 80,
    target: "core",
    radius: 56,
  },
};

export const EEL_DASH_TRIGGER_RANGE = 350;
export const EEL_DASH_SPEED = 400;
export const VENT_CRAB_FRONT_DAMAGE_REDUCTION = 0.6;
export const GHOST_SQUID_INK_SEC = 1.5;
export const EUPHONOPHORE_ZONE_DAMAGE_PER_SEC = 40;
export const EUPHONOPHORE_ZONE_DURATION_SEC = 3;
export const EUPHONOPHORE_ZONE_RADIUS = 90;
export const CORE_ATTACHED_DAMAGE_INTERVAL_SEC = 1;
export const LEVIATHAN_EMP_INTERVAL_SEC = 15;
export const LEVIATHAN_EMP_DURATION_SEC = 1.5;

export const TESLA_CHAIN_RANGE = 220;
export const HARPOON_SPEED = 620;
export const TORPEDO_SPEED = 320;

export const ANGLER_LORD_FIRE_INTERVAL_SEC = 3;
export const ANGLER_LORD_SONIC_SPEED = 260;
