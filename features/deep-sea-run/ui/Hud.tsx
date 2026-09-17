import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PASSIVE_DEFS, RUN_DURATION_SEC, WEAPON_DEFS } from "../engine/constants";
import type { WeaponId } from "../engine/types";
import type { HudSnapshot } from "../useGameLoop";

function formatClock(totalSec: number): string {
  const remaining = Math.max(0, RUN_DURATION_SEC - Math.floor(totalSec));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatBar({
  label,
  valueText,
  ratio,
  indicatorClassName,
  className,
}: {
  label: string;
  valueText: string;
  ratio: number;
  indicatorClassName: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between text-xs text-white/70">
        <span>{label}</span>
        <span>{valueText}</span>
      </div>
      <Progress
        value={Math.max(0, Math.min(100, ratio * 100))}
        trackClassName="bg-white/10"
        indicatorClassName={indicatorClassName}
      />
    </div>
  );
}

export function Hud({ snapshot }: { snapshot: HudSnapshot }) {
  const chargeRatio = Math.min(100, (snapshot.timeSec / RUN_DURATION_SEC) * 100);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 text-white">
      <div className="flex items-start justify-between gap-4">
        <StatBar
          className="w-56 rounded-2xl bg-black/40 p-3 backdrop-blur-sm"
          label="코어 HP"
          valueText={`${Math.max(0, Math.round(snapshot.coreHp))} / ${snapshot.coreMaxHp}`}
          ratio={snapshot.coreHp / snapshot.coreMaxHp}
          indicatorClassName="bg-sky-400"
        />

        <div className="flex flex-col items-center rounded-2xl bg-black/40 px-4 py-2 backdrop-blur-sm">
          <span className="text-[11px] tracking-wide text-white/60">비상 부력 엔진 충전</span>
          <span className="font-mono text-2xl tabular-nums">{formatClock(snapshot.timeSec)}</span>
          <span className="text-xs text-white/60">{Math.floor(chargeRatio)}%</span>
        </div>

        <StatBar
          className="w-56 rounded-2xl bg-black/40 p-3 backdrop-blur-sm"
          label={`레벨 ${snapshot.level}`}
          valueText={`EXP ${Math.floor(snapshot.exp)} / ${snapshot.expToNext}`}
          ratio={snapshot.exp / snapshot.expToNext}
          indicatorClassName="bg-emerald-400"
        />
      </div>

      {snapshot.outsideTetherWarning && (
        <div className="pointer-events-none flex justify-center">
          <Alert variant="destructive" className="w-fit bg-black/60">
            <AlertTitle>테더 이탈 경고</AlertTitle>
            <AlertDescription>반경 밖에 너무 오래 있습니다. 배터리 실드가 소모되고 있습니다.</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex items-end justify-between gap-4">
        <div className="w-64 rounded-2xl bg-black/40 p-3 backdrop-blur-sm">
          <StatBar
            className="mb-2"
            label="배터리 실드"
            valueText={`${Math.max(0, Math.round(snapshot.shield))} / ${snapshot.maxShield}`}
            ratio={snapshot.shield / snapshot.maxShield}
            indicatorClassName="bg-cyan-300"
          />
          <StatBar
            label="선체 체력"
            valueText={`${Math.max(0, Math.round(snapshot.hull))} / ${snapshot.maxHull}`}
            ratio={snapshot.hull / snapshot.maxHull}
            indicatorClassName="bg-rose-400"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-end gap-x-2 gap-y-1">
          {(Object.keys(snapshot.weapons) as WeaponId[])
            .filter((id) => snapshot.weapons[id].level > 0)
            .map((id) => {
              const slot = snapshot.weapons[id];
              const name = slot.overcharged ? WEAPON_DEFS[id].overcharge.name : WEAPON_DEFS[id].name;
              const passiveId = WEAPON_DEFS[id].passiveId;
              const passiveLevel = snapshot.passives[passiveId].level;
              return (
                <div key={id} className="flex flex-col items-center gap-1">
                  <Badge variant={slot.overcharged ? "default" : "secondary"}>
                    {name} Lv.{slot.level}
                    {slot.overcharged ? "+" : ""}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      passiveLevel > 0 ? "border-white/30 text-white" : "border-dashed border-white/15 text-white/40"
                    }
                  >
                    {PASSIVE_DEFS[passiveId].name} {passiveLevel > 0 ? `Lv.${passiveLevel}` : "미장착"}
                  </Badge>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
