import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LevelUpDialog } from "./LevelUpDialog";
import { PASSIVE_DEFS, WEAPON_DEFS } from "../engine/constants";
import { createPassiveSlots, createWeaponSlots, buildUpgradePool } from "../engine/growth";
import { createWorld } from "../engine/world";

describe("레벨업 다이얼로그", () => {
  it("첫 레벨업에서는 무기만 제시되고, 아직 없는 무기는 신규 장착으로 표시된다", () => {
    const world = createWorld();
    const choices = buildUpgradePool(world);

    render(
      <LevelUpDialog
        choices={choices}
        weapons={world.weapons}
        passives={world.passives}
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/신규 장착$/)).toHaveLength(4);
    expect(screen.queryByText(/음향 증폭기/)).not.toBeInTheDocument();
  });

  it("이미 갖춘 항목은 현재 레벨에서 다음 레벨로 오르는 것으로 표시된다", () => {
    const weapons = createWeaponSlots();
    const passives = createPassiveSlots();
    weapons.sonar.level = 2;
    passives.amplifier.level = 1;

    render(
      <LevelUpDialog
        choices={[
          { kind: "weapon", id: "sonar" },
          { kind: "passive", id: "amplifier" },
        ]}
        weapons={weapons}
        passives={passives}
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByText(`${WEAPON_DEFS.sonar.name} · Lv.2 → Lv.3`)).toBeInTheDocument();
    expect(screen.getByText("음향 증폭기 · Lv.1 → Lv.2")).toBeInTheDocument();
  });

  it("무기 선택지는 동작 설명과 장착 직후 수치를 함께 보여준다", () => {
    const world = createWorld();

    render(
      <LevelUpDialog
        choices={[{ kind: "weapon", id: "sonar" }]}
        weapons={world.weapons}
        passives={world.passives}
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByText(WEAPON_DEFS.sonar.description)).toBeInTheDocument();
    expect(screen.getByText("데미지 28 · 쿨타임 1.40s · 반경 190")).toBeInTheDocument();
  });

  it("패시브 선택지는 어느 무기를 강화하는지와 레벨당 효과를 밝힌다", () => {
    const weapons = createWeaponSlots();
    const passives = createPassiveSlots();
    weapons.sonar.level = 1;

    render(
      <LevelUpDialog
        choices={[{ kind: "passive", id: "amplifier" }]}
        weapons={weapons}
        passives={passives}
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByText(`${WEAPON_DEFS.sonar.name} 강화`)).toBeInTheDocument();
    expect(screen.getByText(PASSIVE_DEFS.amplifier.description)).toBeInTheDocument();
    expect(screen.getByText(PASSIVE_DEFS.amplifier.effect)).toBeInTheDocument();
  });

  it("오버차지 선택지는 어느 무기의 최종 형태인지와 바뀌는 점을 밝힌다", () => {
    const weapons = createWeaponSlots();
    const passives = createPassiveSlots();
    weapons.sonar.level = 7;
    passives.amplifier.level = 4;

    render(
      <LevelUpDialog
        choices={[{ kind: "overcharge", id: "sonar" }]}
        weapons={weapons}
        passives={passives}
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByText(`${WEAPON_DEFS.sonar.name} 최종 형태`)).toBeInTheDocument();
    expect(screen.getByText(`오버차지: ${WEAPON_DEFS.sonar.overcharge.name}`)).toBeInTheDocument();
    expect(screen.getByText(WEAPON_DEFS.sonar.overcharge.description)).toBeInTheDocument();
  });
});
