import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PASSIVE_DEFS, WEAPON_DEFS } from "../engine/constants";
import type { UpgradeChoice } from "../engine/types";

function describeChoice(choice: UpgradeChoice): { title: string; description: string } {
  if (choice.kind === "weapon") {
    const def = WEAPON_DEFS[choice.id];
    return { title: `${def.name} 레벨업`, description: `데미지 ${def.damage} · 쿨타임 ${def.cooldown}s` };
  }
  if (choice.kind === "passive") {
    const def = PASSIVE_DEFS[choice.id];
    return { title: `${def.name} 레벨업`, description: def.description };
  }
  const def = WEAPON_DEFS[choice.id];
  return { title: `오버차지: ${def.overcharge.name}`, description: `${def.name}이(가) 상위 형태로 바뀝니다.` };
}

export function LevelUpDialog({
  choices,
  onChoose,
}: {
  choices: UpgradeChoice[];
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
            const { title, description } = describeChoice(choice);
            return (
              <Button
                key={index}
                variant="outline"
                className="h-auto w-full flex-col items-start gap-1 whitespace-normal px-4 py-3 text-left"
                onClick={() => onChoose(choice)}
              >
                <span className="font-medium">{title}</span>
                <span className="text-xs font-normal text-muted-foreground">{description}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
