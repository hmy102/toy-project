import { describe, expect, it } from "vitest";

import {
  PASSIVE_DEFS,
  PASSIVE_MAX_LEVEL,
  PLANKTON_EXP_VALUE,
  PLANKTON_SPAWN_INTERVAL_SEC,
  SUB_MAX_HULL,
  SUB_MAX_SHIELD,
  TETHER_LEAVE_GRACE_SEC,
  VISION_CONE_DEG,
  VISION_RANGE_BASE,
  VISION_RANGE_MAX,
  VISION_RANGE_PER_LEVEL,
  WEAPON_DEFS,
  WEAPON_MAX_LEVEL,
  requiredExpForLevel,
  visionRangeForLevel,
} from "./constants";
import { applyDamageToSubmarine, createSubmarine, updateTetherEffects } from "./submarine";
import { createCore } from "./core";
import { applyUpgradeChoice, buildUpgradePool } from "./growth";
import { isInVisionCone } from "./collision";
import { damageMonster } from "./monsters";
import { updateWeapons } from "./weapons";
import { createWorld } from "./world";
import type { Monster, PassiveId, Submarine, WeaponId } from "./types";

describe("배터리 실드와 선체 체력", () => {
  it("실드가 남아있는 동안에는 선체 체력이 줄지 않는다", () => {
    const sub = createSubmarine();
    applyDamageToSubmarine(sub, 30);
    expect(sub.shield).toBe(SUB_MAX_SHIELD - 30);
    expect(sub.hull).toBe(SUB_MAX_HULL);
  });

  it("실드가 0이 된 뒤부터는 선체 체력이 깎인다", () => {
    const sub = createSubmarine();
    applyDamageToSubmarine(sub, SUB_MAX_SHIELD + 20);
    expect(sub.shield).toBe(0);
    expect(sub.hull).toBe(SUB_MAX_HULL - 20);
  });
});

describe("테더 안전 반경", () => {
  it("반경 안에서는 실드가 선체보다 눈에 띄게 빠르게 회복된다", () => {
    const sub = createSubmarine();
    const core = createCore();
    sub.hull = 50;
    sub.shield = 0;
    updateTetherEffects(sub, core, 1, []);
    const hullGain = sub.hull - 50;
    const shieldGain = sub.shield - 0;
    expect(shieldGain).toBeGreaterThan(hullGain);
  });

  it("반경 밖에 7초를 넘기면 경고와 함께 실드가 깎이고, 복귀하면 멈춘다", () => {
    const sub = createSubmarine();
    const core = createCore();
    sub.pos = { x: core.pos.x + 9999, y: core.pos.y };

    for (let i = 0; i < TETHER_LEAVE_GRACE_SEC; i++) {
      updateTetherEffects(sub, core, 1, []);
    }
    expect(sub.warnedOutsideTether).toBe(false);
    const shieldBeforeDrain = sub.shield;

    updateTetherEffects(sub, core, 1, []);
    expect(sub.warnedOutsideTether).toBe(true);
    expect(sub.shield).toBeLessThan(shieldBeforeDrain);

    sub.pos = { x: core.pos.x, y: core.pos.y };
    updateTetherEffects(sub, core, 1, []);
    expect(sub.warnedOutsideTether).toBe(false);
    expect(sub.timeOutsideTether).toBe(0);
  });
});

function makeMonster(overrides: Partial<Monster>): Monster {
  return {
    id: 1,
    kind: "vent_crab",
    pos: { x: 0, y: 0 },
    facing: { x: 0, y: -1 },
    hp: 600,
    maxHp: 600,
    speed: 65,
    damage: 30,
    target: "core",
    glowColor: "#ef4444",
    radius: 26,
    visible: true,
    revealed: false,
    spawnAt: 0,
    ...overrides,
  };
}

describe("열수구 단단게", () => {
  it("정면에서 맞으면 피해가 경감되고, 배후에서 맞으면 정상 피해가 들어간다", () => {
    const world = createWorld();
    const facing = { x: 0, y: -1 }; // 위쪽(코어)을 향해 이동 중
    const frontMonster = makeMonster({ id: 1, facing });
    const backMonster = makeMonster({ id: 2, facing });
    world.monsters.push(frontMonster, backMonster);

    // 정면(위쪽)에서 피해를 준다 — 피해 발생 지점이 몬스터보다 더 위쪽.
    damageMonster(world, frontMonster, 100, { x: frontMonster.pos.x, y: frontMonster.pos.y - 100 }, 0);
    // 배후(아래쪽)에서 피해를 준다.
    damageMonster(world, backMonster, 100, { x: backMonster.pos.x, y: backMonster.pos.y + 100 }, 0);

    const frontDamage = frontMonster.maxHp - frontMonster.hp;
    const backDamage = backMonster.maxHp - backMonster.hp;
    expect(frontDamage).toBeLessThan(backDamage);
  });
});

describe("유령 오징어", () => {
  it("첫 피격 전까지는 밝혀지지 않고, 피격되는 순간 드러난다", () => {
    const world = createWorld();
    const squid = makeMonster({ id: 3, kind: "ghost_squid", hp: 110, maxHp: 110, revealed: false });
    world.monsters.push(squid);

    expect(squid.revealed).toBe(false);
    damageMonster(world, squid, 20, squid.pos, 5);
    expect(squid.revealed).toBe(true);
    expect(world.inkUntil).toBeGreaterThan(5);
  });
});

describe("무기 자동 조준", () => {
  it("시야 밖(밝혀지지 않은) 적에게는 발사하지 않고, 밝혀지면 즉시 발사한다", () => {
    const world = createWorld();
    world.weapons.sonar.level = 1;
    const monster = makeMonster({ id: 4, kind: "krill", pos: { x: world.submarine.pos.x + 50, y: world.submarine.pos.y }, hp: 14, maxHp: 14, visible: false });
    world.monsters.push(monster);

    updateWeapons(world, 0.016, 1);
    expect(monster.hp).toBe(14);
    expect(world.effects.length).toBe(0);

    monster.visible = true;
    updateWeapons(world, 0.016, 1.1);
    expect(monster.hp).toBeLessThan(14);
  });
});

describe("초전도 축전지", () => {
  it("레벨을 올리면 테슬라 방전 코일의 발사 간격만 줄어든다", () => {
    const fireOnce = (capacitorLevel: number) => {
      const world = createWorld();
      world.weapons.tesla.level = 1;
      world.weapons.harpoon.level = 1;
      world.passives.capacitor.level = capacitorLevel;
      world.monsters.push(
        makeMonster({ id: 9, kind: "krill", pos: { x: world.submarine.pos.x + 50, y: world.submarine.pos.y }, hp: 14, maxHp: 14 }),
      );
      updateWeapons(world, 0.016, 1);
      return { tesla: world.weapons.tesla.cooldownRemaining, harpoon: world.weapons.harpoon.cooldownRemaining };
    };

    const base = fireOnce(0);
    const boosted = fireOnce(PASSIVE_MAX_LEVEL);

    expect(boosted.tesla).toBeCloseTo(base.tesla * (1 - PASSIVE_DEFS.capacitor.perLevel * PASSIVE_MAX_LEVEL));
    expect(boosted.harpoon).toBeCloseTo(base.harpoon);
  });
});

describe("성장 곡선 (유보 결정 — 05:00 전후 첫 오버차지, 09:00 전 두 번째 오버차지)", () => {
  it("이상적인(즉시 습득) 파밍 속도를 가정하면 목표 시간 안에 두 차례 오버차지에 도달한다", () => {
    const world = createWorld();
    const pairs: Array<{ weapon: WeaponId; passive: PassiveId }> = [
      { weapon: "sonar", passive: "amplifier" },
      { weapon: "harpoon", passive: "piston" },
    ];
    const rate = PLANKTON_EXP_VALUE / PLANKTON_SPAWN_INTERVAL_SEC;
    let firstOverchargeAt: number | null = null;
    let secondOverchargeAt: number | null = null;
    const dt = 1;

    for (let now = dt; now <= 600; now += dt) {
      world.exp += rate * dt;

      while (world.exp >= world.expToNext) {
        world.exp -= world.expToNext;
        world.level += 1;
        world.expToNext = requiredExpForLevel(world.level + 1);

        const target = pairs.find((p) => !world.weapons[p.weapon].overcharged);
        if (!target) continue;
        const weaponSlot = world.weapons[target.weapon];
        const passiveSlot = world.passives[target.passive];
        if (weaponSlot.level >= WEAPON_MAX_LEVEL && passiveSlot.level >= PASSIVE_MAX_LEVEL) {
          applyUpgradeChoice(world, { kind: "overcharge", id: target.weapon });
        } else if (weaponSlot.level < WEAPON_MAX_LEVEL) {
          applyUpgradeChoice(world, { kind: "weapon", id: target.weapon });
        } else {
          applyUpgradeChoice(world, { kind: "passive", id: target.passive });
        }
      }

      if (firstOverchargeAt === null && world.weapons[pairs[0].weapon].overcharged) firstOverchargeAt = now;
      if (secondOverchargeAt === null && world.weapons[pairs[1].weapon].overcharged) secondOverchargeAt = now;
    }

    expect(firstOverchargeAt).not.toBeNull();
    expect(secondOverchargeAt).not.toBeNull();
    // 이상적인 파밍은 실제 왕복 이동 없이 즉시 습득하므로, 실제 플레이의 여유를 남기기 위해
    // 목표 시각(05:00=300s, 09:00=540s)보다 여유 있게 도달해야 한다.
    expect(firstOverchargeAt!).toBeLessThan(300);
    expect(secondOverchargeAt!).toBeLessThan(540);
  });
});

describe("레벨업 선택지 구성", () => {
  it("무기가 하나도 없으면 무기 4종만 후보가 되고, 그중 3개가 제시된다", () => {
    const world = createWorld();
    const pool = buildUpgradePool(world);

    expect(pool).toHaveLength(4);
    expect(pool.every((choice) => choice.kind === "weapon")).toBe(true);
    expect(new Set(pool.map((choice) => choice.id)).size).toBe(4);
  });

  it("무기를 하나 갖추면 그 무기의 대응 패시브만 후보에 추가된다", () => {
    const world = createWorld();
    world.weapons.sonar.level = 1;

    const pool = buildUpgradePool(world);
    const passives = pool.filter((choice) => choice.kind === "passive");

    expect(pool).toHaveLength(5);
    expect(passives).toEqual([{ kind: "passive", id: WEAPON_DEFS.sonar.passiveId }]);
  });

  it("보유하지 않은 무기의 패시브는 끝까지 후보에 오르지 않는다", () => {
    const world = createWorld();
    world.weapons.harpoon.level = 3;
    world.weapons.tesla.level = 2;

    const pool = buildUpgradePool(world);
    const passiveIds = pool.filter((choice) => choice.kind === "passive").map((choice) => choice.id);

    expect(passiveIds.sort()).toEqual([WEAPON_DEFS.harpoon.passiveId, WEAPON_DEFS.tesla.passiveId].sort());
    expect(passiveIds).not.toContain(WEAPON_DEFS.sonar.passiveId);
    expect(passiveIds).not.toContain(WEAPON_DEFS.torpedo.passiveId);
  });
});

describe("서치라이트 성장", () => {
  const aimedAt = (sub: Submarine, distance: number, offsetDeg: number) => ({
    x: sub.pos.x + Math.cos(sub.aimAngle + (offsetDeg * Math.PI) / 180) * distance,
    y: sub.pos.y + Math.sin(sub.aimAngle + (offsetDeg * Math.PI) / 180) * distance,
  });

  it("레벨이 오르면 같은 자리의 적이 사거리 안으로 들어온다", () => {
    const sub = createSubmarine();
    const target = aimedAt(sub, VISION_RANGE_BASE + 40, 0);

    expect(isInVisionCone(sub, target, 1)).toBe(false);
    expect(isInVisionCone(sub, target, 5)).toBe(true);
  });

  it("사거리만 늘고 부채꼴 각도는 레벨과 무관하게 고정이다", () => {
    const sub = createSubmarine();
    const beside = aimedAt(sub, 200, VISION_CONE_DEG / 2 + 10);

    expect(isInVisionCone(sub, beside, 1)).toBe(false);
    expect(isInVisionCone(sub, beside, 30)).toBe(false);
  });

  it("사거리 증가에는 상한이 있다", () => {
    expect(visionRangeForLevel(1)).toBe(VISION_RANGE_BASE);
    expect(visionRangeForLevel(2)).toBe(VISION_RANGE_BASE + VISION_RANGE_PER_LEVEL);
    expect(visionRangeForLevel(999)).toBe(VISION_RANGE_MAX);
  });
});
