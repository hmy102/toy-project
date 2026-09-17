import { SUB_MAX_SPEED, SUB_RADIUS } from "../engine/constants";
import type { WorldState } from "../engine/types";
import { clamp, length } from "../engine/vector";

/** 선체 외곽선. 채우기와 클리핑에서 같은 경로를 재사용한다. */
function traceSubHull(ctx: CanvasRenderingContext2D, l: number, w: number): void {
  ctx.beginPath();
  ctx.moveTo(l, 0);
  ctx.bezierCurveTo(l, w * 0.62, l * 0.64, w, l * 0.14, w);
  ctx.lineTo(-l * 0.42, w);
  ctx.bezierCurveTo(-l * 0.78, w, -l, w * 0.62, -l, w * 0.3);
  ctx.lineTo(-l, -w * 0.3);
  ctx.bezierCurveTo(-l, -w * 0.62, -l * 0.78, -w, -l * 0.42, -w);
  ctx.lineTo(l * 0.14, -w);
  ctx.bezierCurveTo(l * 0.64, -w, l, -w * 0.62, l, 0);
  ctx.closePath();
}

function drawSubHull(ctx: CanvasRenderingContext2D, l: number, w: number): void {
  traceSubHull(ctx, l, w);
  const body = ctx.createLinearGradient(0, -w, 0, w);
  body.addColorStop(0, "#dceffd");
  body.addColorStop(0.42, "#9dc0d8");
  body.addColorStop(1, "#3f5d78");
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = "rgba(196,230,255,0.9)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 갑판선과 격벽 이음매. 작게 보여도 앞뒤가 읽히게 한다.
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(18,40,62,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(l * 0.9, 0);
  ctx.lineTo(-l * 0.95, 0);
  ctx.stroke();
  for (const x of [l * 0.45, -l * 0.15, -l * 0.6]) {
    ctx.beginPath();
    ctx.moveTo(x, -w);
    ctx.lineTo(x, w);
    ctx.stroke();
  }
  ctx.restore();
}

/** 함교(세일)와 잠망경. 조준 방향을 한눈에 구분해 주는 부분이다. */
function drawSubSail(ctx: CanvasRenderingContext2D, l: number, w: number): void {
  const front = l * 0.36;
  const back = -l * 0.16;
  const half = w * 0.46;

  ctx.beginPath();
  ctx.moveTo(front, 0);
  ctx.quadraticCurveTo(front, half, front - half * 0.9, half);
  ctx.lineTo(back + half * 0.4, half);
  ctx.quadraticCurveTo(back, half, back, half * 0.45);
  ctx.lineTo(back, -half * 0.45);
  ctx.quadraticCurveTo(back, -half, back + half * 0.4, -half);
  ctx.lineTo(front - half * 0.9, -half);
  ctx.quadraticCurveTo(front, -half, front, 0);
  ctx.closePath();

  const tower = ctx.createLinearGradient(0, -half, 0, half);
  tower.addColorStop(0, "#f2fbff");
  tower.addColorStop(1, "#7fa4bd");
  ctx.fillStyle = tower;
  ctx.fill();
  ctx.strokeStyle = "rgba(210,240,255,0.85)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = "rgba(226,243,255,0.95)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(back + half * 0.2, 0);
  ctx.lineTo(front + l * 0.12, 0);
  ctx.stroke();
}

function drawSubSternPlanes(ctx: CanvasRenderingContext2D, l: number, w: number): void {
  ctx.fillStyle = "rgba(151,190,216,0.92)";
  ctx.strokeStyle = "rgba(200,232,255,0.55)";
  ctx.lineWidth = 1;
  for (const side of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(-l * 0.58, w * 0.4 * side);
    ctx.lineTo(-l * 0.86, w * 1.25 * side);
    ctx.lineTo(-l * 1.0, w * 1.15 * side);
    ctx.lineTo(-l * 0.95, w * 0.35 * side);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/** 스크류. 회전 속도와 잔상 농도를 실제 이동 속도에 묶어 둔다. */
function drawSubPropeller(
  ctx: CanvasRenderingContext2D,
  l: number,
  w: number,
  speedRatio: number,
  now: number
): void {
  const bladeLength = w * 0.62;

  ctx.save();
  ctx.translate(-l * 1.06, 0);

  ctx.fillStyle = `rgba(178,214,240,${0.1 + 0.22 * speedRatio})`;
  ctx.beginPath();
  ctx.arc(0, 0, bladeLength, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(now * (3 + 16 * speedRatio));
  ctx.fillStyle = "rgba(226,243,255,0.9)";
  for (let i = 0; i < 4; i += 1) {
    ctx.save();
    ctx.rotate((Math.PI / 2) * i);
    ctx.beginPath();
    ctx.ellipse(0, bladeLength * 0.58, bladeLength * 0.3, bladeLength * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.fillStyle = "#c8e2f5";
  ctx.beginPath();
  ctx.arc(-l * 1.06, 0, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

/** 스크류 뒤로 흘리는 기포. 정지 상태에서는 그리지 않는다. */
function drawSubWake(
  ctx: CanvasRenderingContext2D,
  l: number,
  w: number,
  speedRatio: number,
  now: number
): void {
  if (speedRatio < 0.15) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i += 1) {
    const phase = (now * 1.6 + i * 0.25) % 1;
    ctx.fillStyle = `rgba(180,225,255,${(1 - phase) * 0.22 * speedRatio})`;
    ctx.beginPath();
    ctx.arc(
      -l * 1.15 - phase * l * 1.5,
      w * (0.3 + phase * 0.9) * Math.sin(now * 5 + i * 2.1),
      w * (0.18 + phase * 0.34),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

/** 뱃머리 서치라이트. 시야 원뿔이 시작되는 지점을 잠수정 위에서도 이어 준다. */
function drawSubBowLamp(ctx: CanvasRenderingContext2D, l: number): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const lamp = ctx.createRadialGradient(l * 0.88, 0, 0, l * 0.88, 0, l * 0.42);
  lamp.addColorStop(0, "rgba(220,245,255,0.6)");
  lamp.addColorStop(1, "rgba(220,245,255,0)");
  ctx.fillStyle = lamp;
  ctx.beginPath();
  ctx.arc(l * 0.88, 0, l * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * 위에서 내려다본 잠수정. 이미지 에셋 없이 캔버스 경로로만 그려서
 * SUB_RADIUS 하나만 바꾸면 모든 비율이 따라오게 했다.
 */
export function drawSubmarine(ctx: CanvasRenderingContext2D, world: WorldState, now: number): void {
  const sub = world.submarine;
  const halfLength = SUB_RADIUS * 1.65;
  const halfWidth = SUB_RADIUS * 0.66;
  const speedRatio = clamp(length(sub.velocity) / SUB_MAX_SPEED, 0, 1);

  ctx.save();
  ctx.translate(sub.pos.x, sub.pos.y);
  ctx.rotate(sub.aimAngle);

  drawSubWake(ctx, halfLength, halfWidth, speedRatio, now);
  drawSubPropeller(ctx, halfLength, halfWidth, speedRatio, now);
  drawSubSternPlanes(ctx, halfLength, halfWidth);
  drawSubHull(ctx, halfLength, halfWidth);
  drawSubSail(ctx, halfLength, halfWidth);
  drawSubBowLamp(ctx, halfLength);

  ctx.restore();
}
