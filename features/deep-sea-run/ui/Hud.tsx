import { Badge } from "@/components/ui/badge";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PASSIVE_DEFS, RUN_DURATION_SEC, WEAPON_DEFS } from "../engine/constants";
import type { HudSnapshot } from "../useGameLoop";

function formatClock(totalSec: number): string {
  const remaining = Math.max(0, RUN_DURATION_SEC - Math.floor(totalSec));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Hud({ snapshot }: { snapshot: HudSnapshot }) {
  const chargeRatio = Math.min(100, (snapshot.timeSec / RUN_DURATION_SEC) * 100);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="w-56 rounded-2xl bg-black/40 p-3 backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between text-xs text-white/70">
            <span>코어 HP</span>
            <span>
              {Math.max(0, Math.round(snapshot.coreHp))} / {snapshot.coreMaxHp}
            </span>
          </div>
          <Progress value={(snapshot.coreHp / snapshot.coreMaxHp) * 100}>
            <ProgressTrack className="bg-white/10">
              <ProgressIndicator className="bg-sky-400" />
            </ProgressTrack>
          </Progress>
        </div>

        <div className="flex flex-col items-center rounded-2xl bg-black/40 px-4 py-2 backdrop-blur-sm">
          <span className="text-[11px] tracking-wide text-white/60">비상 부력 엔진 충전</span>
          <span className="font-mono text-2xl tabular-nums">{formatClock(snapshot.timeSec)}</span>
          <span className="text-xs text-white/60">{Math.floor(chargeRatio)}%</span>
        </div>

        <div className="w-56 rounded-2xl bg-black/40 p-3 backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-between text-xs text-white/70">
            <span>레벨 {snapshot.level}</span>
            <span>
              EXP {Math.floor(snapshot.exp)} / {snapshot.expToNext}
            </span>
          </div>
          <Progress value={(snapshot.exp / snapshot.expToNext) * 100}>
            <ProgressTrack className="bg-white/10">
              <ProgressIndicator className="bg-emerald-400" />
            </ProgressTrack>
          </Progress>
        </div>
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
          <div className="mb-1 flex items-center justify-between text-xs text-white/70">
            <span>배터리 실드</span>
            <span>
              {Math.round(snapshot.shield)} / {snapshot.maxShield}
            </span>
          </div>
          <Progress value={(snapshot.shield / snapshot.maxShield) * 100} className="mb-2">
            <ProgressTrack className="bg-white/10">
              <ProgressIndicator className="bg-cyan-300" />
            </ProgressTrack>
          </Progress>
          <div className="mb-1 flex items-center justify-between text-xs text-white/70">
            <span>선체 체력</span>
            <span>
              {Math.round(snapshot.hull)} / {snapshot.maxHull}
            </span>
          </div>
          <Progress value={(snapshot.hull / snapshot.maxHull) * 100}>
            <ProgressTrack className="bg-white/10">
              <ProgressIndicator className="bg-rose-400" />
            </ProgressTrack>
          </Progress>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1">
            {(Object.keys(snapshot.weapons) as (keyof typeof snapshot.weapons)[])
              .filter((id) => snapshot.weapons[id].level > 0)
              .map((id) => {
                const slot = snapshot.weapons[id];
                const name = slot.overcharged ? WEAPON_DEFS[id].overcharge.name : WEAPON_DEFS[id].name;
                return (
                  <Badge key={id} variant={slot.overcharged ? "default" : "secondary"}>
                    {name} Lv.{slot.level}
                    {slot.overcharged ? "+" : ""}
                  </Badge>
                );
              })}
          </div>
          <div className="flex gap-1">
            {(Object.keys(snapshot.passives) as (keyof typeof snapshot.passives)[])
              .filter((id) => snapshot.passives[id].level > 0)
              .map((id) => (
                <Badge key={id} variant="outline" className="border-white/30 text-white">
                  {PASSIVE_DEFS[id].name} Lv.{snapshot.passives[id].level}
                </Badge>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
