import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  VISION_CONE_DEG,
  VISION_GLOW_RADIUS,
  VISION_RANGE,
} from "../engine/constants";
import type { WorldState } from "../engine/types";
import { drawCore, drawCoreNearLight, drawTurretBeam } from "./core";
import { drawMonsters } from "./monsters";
import { drawSubmarine } from "./submarine";

function drawVision(ctx: CanvasRenderingContext2D, world: WorldState): void {
  const sub = world.submarine;
  const half = (VISION_CONE_DEG * Math.PI) / 180 / 2;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(sub.pos.x, sub.pos.y, 0, sub.pos.x, sub.pos.y, VISION_GLOW_RADIUS);
  glow.addColorStop(0, "rgba(120,170,200,0.35)");
  glow.addColorStop(1, "rgba(120,170,200,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sub.pos.x, sub.pos.y, VISION_GLOW_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(sub.pos.x, sub.pos.y);
  ctx.arc(sub.pos.x, sub.pos.y, VISION_RANGE, sub.aimAngle - half, sub.aimAngle + half);
  ctx.closePath();
  const cone = ctx.createRadialGradient(sub.pos.x, sub.pos.y, 0, sub.pos.x, sub.pos.y, VISION_RANGE);
  cone.addColorStop(0, "rgba(210,235,255,0.28)");
  cone.addColorStop(1, "rgba(210,235,255,0)");
  ctx.fillStyle = cone;
  ctx.fill();
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

    if ((effect.kind === "pulse" || effect.kind === "core-discharge") && effect.pos && effect.radius) {
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
