import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PASSIVE_DEFS, WEAPON_DEFS } from "../engine/constants";
import { getEffectiveWeaponStats } from "../engine/weapons";
import type { PassiveId, PassiveSlot, UpgradeChoice, WeaponId, WeaponSlot } from "../engine/types";

interface Slots {
  weapons: Record<WeaponId, WeaponSlot>;
  passives: Record<PassiveId, PassiveSlot>;
}

interface ChoiceView {
  badge: string;
  title: string;
  description: string;
  stats: string;
}

function levelSuffix(currentLevel: number): string {
  return currentLevel === 0 ? "신규 장착" : `Lv.${currentLevel} → Lv.${currentLevel + 1}`;
}

function amount(value: number): string {
  return Math.round(value).toString();
}

function seconds(value: number): string {
  return `${value.toFixed(2)}s`;
}

// 관통이나 연쇄처럼 정수로 떨어지는 수치는 레벨이 올라도 표기가 같을 수 있다.
// 같은 값을 화살표로 이어 붙이면 오히려 혼란스러우므로 한 번만 적는다.
function transition(label: string, before: string, after: string): string {
  return before === after ? `${label} ${after}` : `${label} ${before} → ${after}`;
}

function statsAtLevel(weaponId: WeaponId, level: number) {
  return getEffectiveWeaponStats(weaponId, { id: weaponId, level, overcharged: false, cooldownRemaining: 0 });
}

// 수치는 지금 무엇을 고르는지 판단할 수 있게 쓴다. 이미 갖춘 무기는 현재 값에서 다음 값으로,
// 아직 없는 무기는 장착 직후 값만 보여준다.
function weaponStatsLine(weaponId: WeaponId, currentLevel: number): string {
  const def = WEAPON_DEFS[weaponId];
  const next = statsAtLevel(weaponId, Math.max(1, currentLevel + 1));
  if (currentLevel === 0) {
    return `데미지 ${amount(next.damage)} · 쿨타임 ${seconds(next.cooldown)} · ${def.extraLabel} ${amount(next.extra)}`;
  }
  const now = statsAtLevel(weaponId, currentLevel);
  return [
    transition("데미지", amount(now.damage), amount(next.damage)),
    transition("쿨타임", seconds(now.cooldown), seconds(next.cooldown)),
    transition(def.extraLabel, amount(now.extra), amount(next.extra)),
  ].join(" · ");
}

function describeChoice(choice: UpgradeChoice, slots: Slots): ChoiceView {
  if (choice.kind === "weapon") {
    const def = WEAPON_DEFS[choice.id];
    const level = slots.weapons[choice.id].level;
    return {
      badge: "무기",
      title: `${def.name} · ${levelSuffix(level)}`,
      description: def.description,
      stats: weaponStatsLine(choice.id, level),
    };
  }

  if (choice.kind === "passive") {
    const def = PASSIVE_DEFS[choice.id];
    const level = slots.passives[choice.id].level;
    return {
      badge: `${WEAPON_DEFS[def.weaponId].name} 강화`,
      title: `${def.name} · ${levelSuffix(level)}`,
      description: def.description,
      stats: def.effect,
    };
  }

  const def = WEAPON_DEFS[choice.id];
  const now = getEffectiveWeaponStats(choice.id, slots.weapons[choice.id]);
  const after = def.overcharge;
  return {
    badge: `${def.name} 최종 형태`,
    title: `오버차지: ${after.name}`,
    description: def.overcharge.description,
    stats: [
      transition("데미지", amount(now.damage), amount(after.damage)),
      transition("쿨타임", seconds(now.cooldown), seconds(after.cooldown)),
      transition(def.extraLabel, amount(now.extra), amount(after.extra)),
    ].join(" · "),
  };
}

export function LevelUpDialog({
  choices,
  weapons,
  passives,
  onChoose,
}: {
  choices: UpgradeChoice[];
  weapons: Record<WeaponId, WeaponSlot>;
  passives: Record<PassiveId, PassiveSlot>;
  onChoose: (choice: UpgradeChoice) => void;
}) {
  return (
    <Dialog open modal>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>레벨업</DialogTitle>
          <DialogDescription>하나를 선택하면 해당 항목의 레벨이 오릅니다.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {choices.map((choice, index) => {
            const { badge, title, description, stats } = describeChoice(choice, { weapons, passives });
            return (
              <Button
                key={index}
                variant="outline"
                className="h-auto w-full flex-col items-start gap-1.5 whitespace-normal px-4 py-3 text-left"
                onClick={() => onChoose(choice)}
              >
                <span className="flex w-full flex-wrap items-center gap-2">
                  <Badge variant={choice.kind === "overcharge" ? "default" : "secondary"}>{badge}</Badge>
                  <span className="font-medium">{title}</span>
                </span>
                <span className="text-xs font-normal text-muted-foreground">{description}</span>
                <span className="text-xs font-normal tabular-nums text-muted-foreground/80">{stats}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
