import { describe, expect, it } from "vitest";

import {
  PASSIVE_MAX_LEVEL,
  PLANKTON_EXP_VALUE,
  PLANKTON_SPAWN_INTERVAL_SEC,
  SUB_MAX_HULL,
  SUB_MAX_SHIELD,
  TETHER_LEAVE_GRACE_SEC,
  WEAPON_MAX_LEVEL,
  requiredExpForLevel,
} from "./constants";
import { applyDamageToSubmarine, createSubmarine, updateTetherEffects } from "./submarine";
import { createCore } from "./core";
import { applyUpgradeChoice } from "./growth";
import { damageMonster } from "./monsters";
import { updateWeapons } from "./weapons";
import { createWorld } from "./world";
import type { Monster, PassiveId, WeaponId } from "./types";

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
