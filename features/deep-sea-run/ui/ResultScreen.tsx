import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DefeatInfo } from "../engine/types";

function formatSurvived(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}분 ${s.toString().padStart(2, "0")}초`;
}

const REASON_TEXT: Record<DefeatInfo["outcome"], { title: string; description: string }> = {
  victory: {
    title: "탈출 성공",
    description: "비상 부력 엔진 충전이 100%에 도달했습니다. 잠수정이 급부상합니다.",
  },
  hull: {
    title: "잠수정 파괴",
    description: "선체 체력이 모두 소진되어 잠수정이 파괴되었습니다.",
  },
  core: {
    title: "코어 파괴",
    description: "코어 HP가 모두 소진되어 모함이 침몰했습니다.",
  },
};

export function ResultScreen({ result, onRestart }: { result: DefeatInfo; onRestart: () => void }) {
  const info = REASON_TEXT[result.outcome];
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/90">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-2xl">{info.title}</CardTitle>
          <CardDescription>{info.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">생존 시간: {formatSurvived(result.survivedSec)}</p>
          <Button size="lg" className="w-full" onClick={onRestart}>
            다시 시작
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
