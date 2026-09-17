import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CORE_MODULE_DEFS } from "../engine/constants";
import type { CoreModuleId } from "../engine/types";

export function CoreModuleDialog({
  choices,
  onChoose,
}: {
  choices: CoreModuleId[];
  onChoose: (moduleId: CoreModuleId) => void;
}) {
  return (
    <Dialog open modal>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>코어 증설 모듈 선택</DialogTitle>
          <DialogDescription>코어에 장착할 방어 설비를 하나 고르십시오.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {choices.map((id) => {
            const def = CORE_MODULE_DEFS[id];
            return (
              <Button
                key={id}
                variant="outline"
                className="h-auto w-full flex-col items-start gap-1 whitespace-normal px-4 py-3 text-left"
                onClick={() => onChoose(id)}
              >
                <span className="font-medium">{def.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{def.description}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
