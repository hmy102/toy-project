"use client";

import { useGameLoop } from "./useGameLoop";
import { Hud } from "./ui/Hud";
import { StartScreen } from "./ui/StartScreen";
import { ResultScreen } from "./ui/ResultScreen";
import { LevelUpDialog } from "./ui/LevelUpDialog";
import { CoreModuleDialog } from "./ui/CoreModuleDialog";

export function DeepSeaRunGame() {
  const { canvasRef, snapshot, arenaWidth, arenaHeight, actions } = useGameLoop();

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        width={arenaWidth}
        height={arenaHeight}
        className="h-full w-full max-w-full object-contain"
      />

      {snapshot.phase !== "start" && <Hud snapshot={snapshot} />}

      {snapshot.phase === "start" && <StartScreen onStart={actions.start} />}

      {snapshot.phase === "levelup" && snapshot.pendingUpgradeChoices && (
        <LevelUpDialog
          choices={snapshot.pendingUpgradeChoices}
          weapons={snapshot.weapons}
          passives={snapshot.passives}
          onChoose={actions.chooseUpgrade}
        />
      )}

      {snapshot.phase === "core-module" && snapshot.pendingCoreModuleChoices && (
        <CoreModuleDialog choices={snapshot.pendingCoreModuleChoices} onChoose={actions.chooseCoreModule} />
      )}

      {(snapshot.phase === "victory" || snapshot.phase === "defeat") && snapshot.result && (
        <ResultScreen result={snapshot.result} onRestart={actions.restart} />
      )}
    </div>
  );
}
