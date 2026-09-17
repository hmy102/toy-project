import {
  CORE_GLOW_RADIUS,
  CORE_VISUAL_RADIUS,
  TETHER_RADIUS,
  TURRET_BEAM_RANGE,
  TURRET_BEAM_WIDTH_DEG,
} from "../engine/constants";
import type { WorldState } from "../engine/types";
import { clamp } from "../engine/vector";

/**
 * 코어 조명색은 청록으로 고정한다. 손상은 색을 섞어 흐리게 만드는 대신
 * 별도의 붉은 경보층으로 보여 줘야 한눈에 위급함이 읽힌다.
 */
function coreAccent(alpha: number): string {
  return `rgba(95,208,255,${alpha})`;
}

/** 체력이 절반 아래로 내려가면 켜지는 경보. 낮을수록 빨리 점멸한다. */
function alarmLevel(ratio: number, now: number): number {
  if (ratio >= 0.5) return 0;
  const severity = 1 - ratio * 2;
  const blink = 0.5 + 0.5 * Math.sin(now * (4 + 8 * severity));
  return severity * (0.35 + 0.65 * blink);
}

function traceHex(ctx: CanvasRenderingContext2D, radius: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 6 + (Math.PI / 3) * i;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function drawTurretBeam(ctx: CanvasRenderingContext2D, world: WorldState): void {
  if (!world.coreModules.includes("searchlight_turret")) return;
  const core = world.core;
  const half = (TURRET_BEAM_WIDTH_DEG * Math.PI) / 180 / 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.moveTo(core.pos.x, core.pos.y);
  ctx.arc(core.pos.x, core.pos.y, TURRET_BEAM_RANGE, core.turretAngle - half, core.turretAngle + half);
  ctx.closePath();
  const beam = ctx.createRadialGradient(core.pos.x, core.pos.y, 0, core.pos.x, core.pos.y, TURRET_BEAM_RANGE);
  beam.addColorStop(0, "rgba(255,235,180,0.3)");
  beam.addColorStop(1, "rgba(255,235,180,0)");
  ctx.fillStyle = beam;
  ctx.fill();
  ctx.restore();
}

export function drawCoreNearLight(ctx: CanvasRenderingContext2D, world: WorldState): void {
  const core = world.core;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(core.pos.x, core.pos.y, 0, core.pos.x, core.pos.y, CORE_GLOW_RADIUS);
  glow.addColorStop(0, "rgba(120,220,255,0.3)");
  glow.addColorStop(1, "rgba(120,220,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(core.pos.x, core.pos.y, CORE_GLOW_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 해저에 박힌 접지 각주. 코어가 고정 구조물이라는 것을 보여 준다. */
function drawCoreStruts(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.fillStyle = "#16212e";
  ctx.strokeStyle = "rgba(120,170,205,0.45)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i += 1) {
    ctx.save();
    ctx.rotate((Math.PI / 3) * i);
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.18);
    ctx.lineTo(r * 1.24, -r * 0.09);
    ctx.lineTo(r * 1.24, r * 0.09);
    ctx.lineTo(r * 0.55, r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 1.22, 0, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

/** 육각 장갑 본체. 체력이 절반 아래로 내려가면 그을음이 드러난다. */
function drawCoreChassis(ctx: CanvasRenderingContext2D, r: number, ratio: number): void {
  traceHex(ctx, r * 0.95);
  const plate = ctx.createLinearGradient(0, -r, 0, r);
  plate.addColorStop(0, "#35506b");
  plate.addColorStop(0.5, "#22364a");
  plate.addColorStop(1, "#141e2a");
  ctx.fillStyle = plate;
  ctx.fill();
  ctx.strokeStyle = coreAccent(0.6);
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.save();
  ctx.clip();

  ctx.strokeStyle = "rgba(8,16,24,0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 6 + (Math.PI / 3) * i;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    ctx.stroke();
  }

  if (ratio < 0.5) {
    ctx.fillStyle = `rgba(6,9,13,${0.6 * (1 - ratio * 2)})`;
    for (const angle of [Math.PI * 0.22, Math.PI * 1.28]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, angle, angle + 0.75);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 서로 반대로 도는 격납링 두 겹. 코어가 살아 있다는 신호다. */
function drawCoreRings(ctx: CanvasRenderingContext2D, r: number, now: number): void {
  ctx.save();
  ctx.lineCap = "round";

  ctx.save();
  ctx.rotate(now * 0.35);
  ctx.strokeStyle = coreAccent(0.85);
  ctx.lineWidth = r * 0.09;
  for (let i = 0; i < 3; i += 1) {
    const start = ((Math.PI * 2) / 3) * i;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, start, start + ((Math.PI * 2) / 3) * 0.58);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.rotate(-now * 0.62);
  ctx.strokeStyle = coreAccent(0.5);
  ctx.lineWidth = r * 0.05;
  for (let i = 0; i < 4; i += 1) {
    const start = (Math.PI / 2) * i;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, start, start + Math.PI * 0.28);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

/** 노심. 체력이 낮을수록 맥동이 빨라져 위급함이 읽힌다. */
function drawCoreReactor(ctx: CanvasRenderingContext2D, r: number, ratio: number, now: number): void {
  const pulse = 0.7 + 0.3 * Math.sin(now * (2.2 + 5 * (1 - ratio)));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.95);
  halo.addColorStop(0, coreAccent(0.25 + 0.4 * ratio));
  halo.addColorStop(1, coreAccent(0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#0c1722";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = coreAccent(0.75);
  ctx.lineWidth = 2;
  ctx.stroke();

  const lamp = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
  lamp.addColorStop(0, "rgba(255,255,255,0.95)");
  lamp.addColorStop(0.45, coreAccent(0.95));
  lamp.addColorStop(1, coreAccent(0.2));
  ctx.fillStyle = lamp;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3 * (0.86 + 0.14 * pulse), 0, Math.PI * 2);
  ctx.fill();
}

/** 회전식 탐조등 터렛 모듈의 실물. 빛줄기만 있던 자리에 등피를 얹는다. */
function drawCoreTurret(ctx: CanvasRenderingContext2D, r: number, angle: number): void {
  ctx.save();
  ctx.rotate(angle);

  ctx.strokeStyle = "rgba(190,215,240,0.5)";
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(r * 0.42, 0);
  ctx.lineTo(r * 0.86, 0);
  ctx.stroke();

  ctx.fillStyle = "#24384c";
  ctx.strokeStyle = "rgba(255,235,180,0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(r * 0.74, -r * 0.2);
  ctx.lineTo(r * 1.06, -r * 0.12);
  ctx.lineTo(r * 1.06, r * 0.12);
  ctx.lineTo(r * 0.74, r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const lens = ctx.createRadialGradient(r * 1.04, 0, 0, r * 1.04, 0, r * 0.18);
  lens.addColorStop(0, "rgba(255,246,214,0.9)");
  lens.addColorStop(1, "rgba(255,235,180,0)");
  ctx.fillStyle = lens;
  ctx.beginPath();
  ctx.arc(r * 1.04, 0, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/** 손상 경보. 장갑 테두리를 따라 붉게 번지고 화살 모양 경고등이 돈다. */
function drawCoreAlarm(ctx: CanvasRenderingContext2D, r: number, ratio: number, now: number): void {
  const level = alarmLevel(ratio, now);
  if (level <= 0) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  traceHex(ctx, r * 0.95);
  ctx.strokeStyle = `rgba(255,90,60,${0.85 * level})`;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  const bleed = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.15);
  bleed.addColorStop(0, "rgba(255,80,50,0)");
  bleed.addColorStop(1, `rgba(255,80,50,${0.3 * level})`);
  ctx.fillStyle = bleed;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255,140,110,${level})`;
  for (let i = 0; i < 3; i += 1) {
    const angle = -now * 1.4 + ((Math.PI * 2) / 3) * i;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * r * 0.88, Math.sin(angle) * r * 0.88, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCore(ctx: CanvasRenderingContext2D, world: WorldState, now: number): void {
  const core = world.core;
  const ratio = clamp(core.hp / core.maxHp, 0, 1);

  ctx.save();
  ctx.strokeStyle = "rgba(120,160,200,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(core.pos.x, core.pos.y, TETHER_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  ctx.translate(core.pos.x, core.pos.y);
  drawCoreStruts(ctx, CORE_VISUAL_RADIUS);
  drawCoreChassis(ctx, CORE_VISUAL_RADIUS, ratio);
  drawCoreRings(ctx, CORE_VISUAL_RADIUS, now);
  drawCoreReactor(ctx, CORE_VISUAL_RADIUS, ratio, now);
  drawCoreAlarm(ctx, CORE_VISUAL_RADIUS, ratio, now);
  if (world.coreModules.includes("searchlight_turret")) {
    drawCoreTurret(ctx, CORE_VISUAL_RADIUS, core.turretAngle);
  }
  ctx.restore();
}
