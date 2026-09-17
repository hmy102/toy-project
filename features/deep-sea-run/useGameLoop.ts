"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ARENA_HEIGHT, ARENA_WIDTH, RUN_DURATION_SEC } from "./engine/constants";
import { drawWorld } from "./render/draw";
import type { CoreModuleId, GamePhase, UpgradeChoice, WorldState } from "./engine/types";
import { angleOf, sub as vsub } from "./engine/vector";
import {
  createWorld,
  resolveCoreModuleChoice,
  resolveUpgradeChoice,
  startRun,
  tick,
  type GameInput,
} from "./engine/world";

export interface HudSnapshot {
  phase: GamePhase;
  timeSec: number;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  coreHp: number;
  coreMaxHp: number;
  level: number;
  exp: number;
  expToNext: number;
  outsideTetherWarning: boolean;
  pendingUpgradeChoices: UpgradeChoice[] | null;
  pendingCoreModuleChoices: CoreModuleId[] | null;
  weapons: WorldState["weapons"];
  passives: WorldState["passives"];
  coreModules: CoreModuleId[];
  result: WorldState["result"];
}

function makeSnapshot(world: WorldState): HudSnapshot {
  return {
    phase: world.phase,
    timeSec: world.timeSec,
    hull: world.submarine.hull,
    maxHull: world.submarine.maxHull,
    shield: world.submarine.shield,
    maxShield: world.submarine.maxShield,
    coreHp: world.core.hp,
    coreMaxHp: world.core.maxHp,
    level: world.level,
    exp: world.exp,
    expToNext: world.expToNext,
    outsideTetherWarning: world.submarine.warnedOutsideTether,
    pendingUpgradeChoices: world.pendingUpgradeChoices,
    pendingCoreModuleChoices: world.pendingCoreModuleChoices,
    weapons: world.weapons,
    passives: world.passives,
    coreModules: world.coreModules,
    result: world.result,
  };
}

const KEY_TO_DIRECTION: Record<string, keyof GameInput["move"] | undefined> = {
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

export function useGameLoop() {
  const worldRef = useRef<WorldState>(createWorld());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<GameInput>({
    move: { up: false, down: false, left: false, right: false },
    aimAngle: -Math.PI / 2,
  });
  const [snapshot, setSnapshot] = useState<HudSnapshot>(() => makeSnapshot(createWorld()));

  useEffect(() => {
    const handleKey = (down: boolean) => (event: KeyboardEvent) => {
      const dir = KEY_TO_DIRECTION[event.code];
      if (!dir) return;
      inputRef.current.move[dir] = down;
    };
    const onKeyDown = handleKey(true);
    const onKeyUp = handleKey(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = ARENA_WIDTH / rect.width;
      const scaleY = ARENA_HEIGHT / rect.height;
      const worldPos = {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
      const toTarget = vsub(worldPos, worldRef.current.submarine.pos);
      inputRef.current.aimAngle = angleOf(toTarget);
    };
    canvas.addEventListener("mousemove", onMove);
    return () => canvas.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    let raf = 0;
    let lastTime = performance.now();
    const ctxCanvas = canvasRef.current;
    const ctx = ctxCanvas?.getContext("2d") ?? null;

    const frame = (time: number) => {
      const dt = Math.min(0.05, Math.max(0, (time - lastTime) / 1000));
      lastTime = time;
      tick(worldRef.current, dt, inputRef.current);
      if (ctx) drawWorld(ctx, worldRef.current, worldRef.current.timeSec);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSnapshot(makeSnapshot(worldRef.current));
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    // 10분 런의 타임라인을 브라우저 콘솔에서 빠르게 검증하기 위한 개발 전용 훅.
    // 사용자에게 노출되는 기능이 아니며 window.__deepSeaRunDebug로만 접근한다.
    const globalWithDebug = window as typeof window & {
      __deepSeaRunDebug?: { forceTime: (sec: number) => void; world: () => WorldState };
    };
    globalWithDebug.__deepSeaRunDebug = {
      forceTime: (sec: number) => {
        worldRef.current.timeSec = sec;
      },
      world: () => worldRef.current,
    };
  }, []);

  const start = useCallback(() => {
    startRun(worldRef.current);
    setSnapshot(makeSnapshot(worldRef.current));
  }, []);

  const chooseUpgrade = useCallback((choice: UpgradeChoice) => {
    resolveUpgradeChoice(worldRef.current, choice);
    setSnapshot(makeSnapshot(worldRef.current));
  }, []);

  const chooseCoreModule = useCallback((moduleId: CoreModuleId) => {
    resolveCoreModuleChoice(worldRef.current, moduleId);
    setSnapshot(makeSnapshot(worldRef.current));
  }, []);

  const restart = useCallback(() => {
    worldRef.current = createWorld();
    setSnapshot(makeSnapshot(worldRef.current));
  }, []);

  return {
    canvasRef,
    snapshot,
    arenaWidth: ARENA_WIDTH,
    arenaHeight: ARENA_HEIGHT,
    runDurationSec: RUN_DURATION_SEC,
    actions: { start, chooseUpgrade, chooseCoreModule, restart },
  };
}
