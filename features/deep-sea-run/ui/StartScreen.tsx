import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-2xl">심해 탈출 런</CardTitle>
          <CardDescription>
            빛이 없는 해구 바닥, 10분간 코어의 비상 부력 엔진 충전을 지켜내십시오.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="w-full" onClick={onStart}>
            시작
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
