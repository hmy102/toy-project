import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  VISION_BEAM_SOLID_RANGE,
  VISION_CONE_DEG,
  VISION_GLOW_RADIUS,
  visionRangeForLevel,
} from "../engine/constants";
import type { WorldState } from "../engine/types";
import { drawCore, drawCoreNearLight, drawTurretBeam } from "./core";
import { drawMonsters } from "./monsters";
import { drawSubmarine } from "./submarine";

function drawVision(ctx: CanvasRenderingContext2D, world: WorldState): void {
  const sub = world.submarine;
  const half = (VISION_CONE_DEG * Math.PI) / 180 / 2;
  const range = visionRangeForLevel(world.level);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(sub.pos.x, sub.pos.y, 0, sub.pos.x, sub.pos.y, VISION_GLOW_RADIUS);
  glow.addColorStop(0, "rgba(120,170,200,0.35)");
  glow.addColorStop(1, "rgba(120,170,200,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sub.pos.x, sub.pos.y, VISION_GLOW_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // 밝은 구간의 길이를 고정해 두면, 사거리가 늘어난 만큼이 옅은 꼬리로 남아
  // "빛이 더 멀리 나갔다"가 눈에 들어온다. 그라디언트 전체를 늘리면 밝기 분포가
  // 그대로 확대될 뿐이라 거리 변화를 읽을 수 없다.
  const solidStop = Math.min(0.62, VISION_BEAM_SOLID_RANGE / range);
  ctx.beginPath();
  ctx.moveTo(sub.pos.x, sub.pos.y);
  ctx.arc(sub.pos.x, sub.pos.y, range, sub.aimAngle - half, sub.aimAngle + half);
  ctx.closePath();
  const cone = ctx.createRadialGradient(sub.pos.x, sub.pos.y, 0, sub.pos.x, sub.pos.y, range);
  cone.addColorStop(0, "rgba(210,235,255,0.3)");
  cone.addColorStop(solidStop, "rgba(205,232,255,0.17)");
  cone.addColorStop(0.9, "rgba(196,228,255,0.06)");
  cone.addColorStop(1, "rgba(190,224,255,0.02)");
  ctx.fillStyle = cone;
  ctx.fill();

  // 빛이 닿는 끝선. 어디까지 밝혀지는지를 한 줄로 못 박아 준다.
  ctx.beginPath();
  ctx.arc(sub.pos.x, sub.pos.y, range, sub.aimAngle - half, sub.aimAngle + half);
  ctx.strokeStyle = "rgba(200,230,255,0.16)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

function drawPickups(ctx: CanvasRenderingContext2D, world: WorldState, now: number): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const pickup of world.pickups) {
    const pulse = 0.6 + 0.4 * Math.sin(now * 3 + pickup.id);
    const grad = ctx.createRadialGradient(pickup.pos.x, pickup.pos.y, 0, pickup.pos.x, pickup.pos.y, 16);
    grad.addColorStop(0, `rgba(190,255,150,${0.8 * pulse})`);
    grad.addColorStop(1, "rgba(190,255,150,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pickup.pos.x, pickup.pos.y, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawProjectiles(ctx: CanvasRenderingContext2D, world: WorldState): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const projectile of world.projectiles) {
    const color = projectile.owner === "player" ? "rgba(180,230,255,0.9)" : "rgba(255,210,140,0.9)";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(projectile.pos.x, projectile.pos.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEffects(ctx: CanvasRenderingContext2D, world: WorldState, now: number): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const effect of world.effects) {
    const t = (now - effect.bornAt) / effect.ttlSec;
    const alpha = Math.max(0, 1 - t);

    if (effect.kind === "vision-grow" && effect.radius) {
      // 레벨업으로 늘어난 사거리까지 서치라이트 끝선이 밀려나가는 파동. 원이 아니라
      // 실제 부채꼴을 따라가므로, 빛이 어디까지 길어졌는지가 그대로 읽힌다.
      const sub = world.submarine;
      const coneHalf = (VISION_CONE_DEG * Math.PI) / 180 / 2;
      ctx.strokeStyle = `rgba(215,240,255,${alpha * 0.55})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(
        sub.pos.x,
        sub.pos.y,
        effect.radius * (0.3 + 0.7 * t),
        sub.aimAngle - coneHalf,
        sub.aimAngle + coneHalf
      );
      ctx.stroke();
    } else if ((effect.kind === "pulse" || effect.kind === "core-discharge") && effect.pos && effect.radius) {
      ctx.strokeStyle = `rgba(150,220,255,${alpha * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.pos.x, effect.pos.y, effect.radius * (0.4 + 0.6 * t), 0, Math.PI * 2);
      ctx.stroke();
    } else if (effect.kind === "explosion" && effect.pos && effect.radius) {
      ctx.fillStyle = `rgba(255,160,90,${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(effect.pos.x, effect.pos.y, effect.radius * (0.3 + 0.7 * t), 0, Math.PI * 2);
      ctx.fill();
    } else if (effect.kind === "lightning" && effect.from && effect.to) {
      ctx.strokeStyle = `rgba(200,230,255,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(effect.from.x, effect.from.y);
      ctx.lineTo(effect.to.x, effect.to.y);
      ctx.stroke();
    } else if (effect.kind === "zone-damage" && effect.pos && effect.radius) {
      ctx.strokeStyle =
        effect.damageTarget === "core" ? `rgba(255,140,80,${alpha * 0.6})` : `rgba(140,200,255,${alpha * 0.6})`;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.pos.x, effect.pos.y, effect.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

function drawInkVignette(ctx: CanvasRenderingContext2D, world: WorldState, now: number): void {
  if (now >= world.inkUntil) return;
  const grad = ctx.createRadialGradient(
    ARENA_WIDTH / 2,
    ARENA_HEIGHT / 2,
    ARENA_WIDTH * 0.15,
    ARENA_WIDTH / 2,
    ARENA_HEIGHT / 2,
    ARENA_WIDTH * 0.55
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
}

function drawEmpFlash(ctx: CanvasRenderingContext2D, world: WorldState, now: number): void {
  if (now >= world.empUntil) return;
  ctx.fillStyle = "rgba(140,200,255,0.08)";
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
}

export function drawWorld(ctx: CanvasRenderingContext2D, world: WorldState, now: number): void {
  ctx.fillStyle = "#020408";
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  drawTurretBeam(ctx, world);
  drawVision(ctx, world);
  drawCoreNearLight(ctx, world);
  drawCore(ctx, world, now);
  drawPickups(ctx, world, now);
  drawMonsters(ctx, world, now);
  drawProjectiles(ctx, world);
  drawEffects(ctx, world, now);
  drawSubmarine(ctx, world, now);
  drawEmpFlash(ctx, world, now);
  drawInkVignette(ctx, world, now);
}
