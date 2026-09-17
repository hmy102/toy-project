import {
  TURRET_BEAM_RANGE,
  TURRET_BEAM_WIDTH_DEG,
  VISION_CONE_DEG,
  VISION_GLOW_RADIUS,
  VISION_RANGE,
} from "./constants";
import type { Core, Monster, Submarine } from "./types";
import { angleDiff, angleOf, distance, sub } from "./vector";

export function circlesOverlap(
  posA: { x: number; y: number },
  radiusA: number,
  posB: { x: number; y: number },
  radiusB: number
): boolean {
  return distance(posA, posB) <= radiusA + radiusB;
}

export function isInVisionCone(sub_: Submarine, targetPos: { x: number; y: number }): boolean {
  const toTarget = sub(targetPos, sub_.pos);
  const dist = Math.hypot(toTarget.x, toTarget.y);
  if (dist <= VISION_GLOW_RADIUS) return true;
  if (dist > VISION_RANGE) return false;
  const diff = Math.abs(angleDiff(angleOf(toTarget), sub_.aimAngle));
  return diff <= (VISION_CONE_DEG * Math.PI) / 180 / 2;
}

export function isInTurretBeam(core: Core, targetPos: { x: number; y: number }): boolean {
  const toTarget = sub(targetPos, core.pos);
  const dist = Math.hypot(toTarget.x, toTarget.y);
  if (dist > TURRET_BEAM_RANGE) return false;
  const diff = Math.abs(angleDiff(angleOf(toTarget), core.turretAngle));
  return diff <= (TURRET_BEAM_WIDTH_DEG * Math.PI) / 180 / 2;
}

/** 현재 프레임의 밝힘 상태를 계산한다. 유령 오징어는 피격 전까지 어떤 빛으로도 드러나지 않는다. */
export function computeVisibility(
  monster: Monster,
  sub_: Submarine,
  core: Core,
  turretActive: boolean,
  now: number
): boolean {
  if (monster.kind === "ghost_squid" && !monster.revealed) return false;
  if ((monster.forcedVisibleUntil ?? 0) > now) return true;
  return isInVisionCone(sub_, monster.pos) || (turretActive && isInTurretBeam(core, monster.pos));
}
