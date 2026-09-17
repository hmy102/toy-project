import type { Monster, MonsterKind, WorldState } from "../engine/types";
import { angleOf } from "../engine/vector";

/**
 * 몬스터 정의의 glowColor는 16진수 문자열이라, 알파를 얹거나 어둡게 만들려면
 * 한 번 풀어야 한다. 7종 스프라이트가 모두 쓰므로 여기 한 벌만 둔다.
 */
function rgbOf(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 발광색을 그대로 채우면 다 타 버리므로, 몸통은 어둡게 눌러 쓴다. */
function shade(hex: string, factor: number, alpha = 1): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)},${alpha})`;
}

type MonsterPainter = (ctx: CanvasRenderingContext2D, monster: Monster, now: number) => void;

/** 발광 멸구. 아주 작으니 더듬이와 꼬리 부채로 실루엣을 만든다. */
const drawKrill: MonsterPainter = (ctx, monster, now) => {
  const r = monster.radius;
  const body = monster.glowColor;
  const beat = Math.sin(now * 14 + monster.id) * 0.4;

  ctx.strokeStyle = withAlpha(body, 0.65);
  ctx.lineWidth = 1;
  for (const side of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.6, side * r * 0.2);
    ctx.quadraticCurveTo(r * 1.4, side * r * 0.5, r * 1.9, side * r * (0.9 + beat * 0.3));
    ctx.stroke();
  }

  ctx.fillStyle = shade(body, 0.5);
  ctx.strokeStyle = withAlpha(body, 0.95);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.85, 0);
  ctx.lineTo(-r * 1.7, r * (-0.6 + beat * 0.3));
  ctx.lineTo(-r * 1.45, 0);
  ctx.lineTo(-r * 1.7, r * (0.6 + beat * 0.3));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(r * 0.35, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
};

/** 흡착 독사어. 돌진에 들어가면 몸을 곧게 펴고 파동이 빨라진다. */
const drawEel: MonsterPainter = (ctx, monster, now) => {
  const r = monster.radius;
  const body = monster.glowColor;
  const amplitude = monster.isDashing ? r * 0.22 : r * 0.6;
  const waveSpeed = monster.isDashing ? 22 : 11;
  const segments = 9;
  const step = (r * 3.4) / segments;

  const spine = Array.from({ length: segments + 1 }, (_, i) => ({
    x: r * 1.1 - step * i,
    y: Math.sin(now * waveSpeed - i * 0.9 + monster.id) * amplitude * (i / segments),
  }));
  const headY = spine[0].y;

  const strokeSpine = (count: number, width: number, style: string) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(spine[0].x, spine[0].y);
    for (let i = 1; i <= count; i += 1) ctx.lineTo(spine[i].x, spine[i].y);
    ctx.stroke();
  };

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  strokeSpine(segments, r * 0.5, shade(body, 0.45));
  strokeSpine(6, r * 0.85, shade(body, 0.5));
  strokeSpine(3, r * 1.15, shade(body, 0.55));
  strokeSpine(segments, r * 0.16, withAlpha(body, monster.isDashing ? 1 : 0.75));

  ctx.fillStyle = shade(body, 0.6);
  ctx.strokeStyle = withAlpha(body, 0.95);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(r * 1.15, headY, r * 0.62, r * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(r * 1.72, headY);
  ctx.lineTo(r * 0.95, headY);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (const side of [1, -1]) {
    ctx.beginPath();
    ctx.arc(r * 1.1, headY + side * r * 0.24, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** 군체 유포노포어. 유영종이 사슬처럼 이어지고 촉수가 뒤로 늘어진다. */
const drawEuphonophore: MonsterPainter = (ctx, monster, now) => {
  const r = monster.radius;
  const body = monster.glowColor;

  ctx.strokeStyle = withAlpha(body, 0.4);
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i += 1) {
    const offset = (i - 2) * r * 0.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, offset);
    ctx.quadraticCurveTo(
      -r * 1.6,
      offset + Math.sin(now * 2 + i) * r * 0.4,
      -r * 2.5,
      offset + Math.sin(now * 2 + i * 1.7) * r * 0.75
    );
    ctx.stroke();
  }

  for (let i = 3; i >= 0; i -= 1) {
    const x = r * 0.55 - i * r * 0.46;
    const scale = 1 - i * 0.15;
    const squeeze = 1 + Math.sin(now * 3 - i * 0.8) * 0.12;
    ctx.fillStyle = withAlpha(body, 0.28);
    ctx.strokeStyle = withAlpha(body, 0.8);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(x, 0, r * 0.46 * scale * squeeze, (r * 0.62 * scale) / squeeze, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = shade(body, 0.65);
  ctx.strokeStyle = withAlpha(body, 0.95);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(r * 1.2, 0);
  ctx.quadraticCurveTo(r * 0.9, r * 0.5, r * 0.35, r * 0.34);
  ctx.quadraticCurveTo(r * 0.5, 0, r * 0.35, -r * 0.34);
  ctx.quadraticCurveTo(r * 0.9, -r * 0.5, r * 1.2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = withAlpha(body, 0.6 + 0.3 * Math.sin(now * 4));
  ctx.beginPath();
  ctx.arc(r * 0.72, 0, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** 유령 오징어. 외투막과 지느러미, 흔들리는 촉수 여덟 개. */
const drawGhostSquid: MonsterPainter = (ctx, monster, now) => {
  const r = monster.radius;
  const body = monster.glowColor;

  ctx.strokeStyle = withAlpha(body, 0.75);
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i += 1) {
    const spread = (i - 3.5) / 3.5;
    const wave = Math.sin(now * 3.4 + i * 0.7) * 0.35;
    ctx.lineWidth = i % 2 === 0 ? 2.2 : 1.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.5, spread * r * 0.35);
    ctx.quadraticCurveTo(r * 1.3, (spread + wave * 0.5) * r * 0.9, r * 2.0, (spread + wave) * r * 1.3);
    ctx.stroke();
  }

  ctx.fillStyle = withAlpha(body, 0.3);
  for (const side of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, side * r * 0.35);
    ctx.quadraticCurveTo(-r * 1.4, side * r * 1.1, -r * 1.75, side * r * 0.25);
    ctx.quadraticCurveTo(-r * 1.3, side * r * 0.2, -r * 0.5, 0);
    ctx.closePath();
    ctx.fill();
  }

  const mantle = ctx.createLinearGradient(r * 0.6, 0, -r * 1.6, 0);
  mantle.addColorStop(0, withAlpha(body, 0.7));
  mantle.addColorStop(1, shade(body, 0.35, 0.9));
  ctx.fillStyle = mantle;
  ctx.strokeStyle = withAlpha(body, 0.9);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(r * 0.55, 0);
  ctx.bezierCurveTo(r * 0.5, r * 0.7, -r * 0.7, r * 0.62, -r * 1.65, 0);
  ctx.bezierCurveTo(-r * 0.7, -r * 0.62, r * 0.5, -r * 0.7, r * 0.55, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (const side of [1, -1]) {
    ctx.beginPath();
    ctx.arc(r * 0.26, side * r * 0.3, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** 열수구 단단게. 정면 장갑판이 두꺼워서 앞에서 쏘면 덜 박힌다. */
const drawVentCrab: MonsterPainter = (ctx, monster, now) => {
  const r = monster.radius;
  const body = monster.glowColor;
  const step = Math.sin(now * 5 + monster.id);

  ctx.strokeStyle = shade(body, 0.7);
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const side of [1, -1]) {
    for (let i = 0; i < 3; i += 1) {
      const baseX = r * (0.2 - i * 0.35);
      const lift = step * (i % 2 === 0 ? 1 : -1) * r * 0.12;
      ctx.beginPath();
      ctx.moveTo(baseX, side * r * 0.5);
      ctx.lineTo(baseX - r * 0.15, side * r * 0.95 + lift);
      ctx.lineTo(baseX - r * 0.45, side * r * 1.2 + lift);
      ctx.stroke();
    }
  }

  const open = (0.6 + 0.4 * Math.sin(now * 3 + monster.id)) * r * 0.18;
  for (const side of [1, -1]) {
    ctx.save();
    ctx.translate(r * 0.62, side * r * 0.6);
    ctx.fillStyle = shade(body, 0.75);
    ctx.strokeStyle = withAlpha(body, 0.85);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.34, r * 0.22, side * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.18, -open);
    ctx.lineTo(r * 0.62, -open * 1.6);
    ctx.lineTo(r * 0.2, open * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  const shell = ctx.createLinearGradient(0, -r, 0, r);
  shell.addColorStop(0, shade(body, 0.6));
  shell.addColorStop(0.5, shade(body, 0.4));
  shell.addColorStop(1, shade(body, 0.22));
  ctx.fillStyle = shell;
  ctx.strokeStyle = withAlpha(body, 0.9);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(r * 0.72, 0);
  ctx.bezierCurveTo(r * 0.68, r * 0.62, r * 0.1, r * 0.82, -r * 0.55, r * 0.6);
  ctx.bezierCurveTo(-r * 0.9, r * 0.35, -r * 0.9, -r * 0.35, -r * 0.55, -r * 0.6);
  ctx.bezierCurveTo(r * 0.1, -r * 0.82, r * 0.68, -r * 0.62, r * 0.72, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = withAlpha(body, 0.3);
  ctx.strokeStyle = withAlpha(body, 0.95);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r * 0.7, 0);
  ctx.quadraticCurveTo(r * 0.55, r * 0.5, r * 0.08, r * 0.58);
  ctx.quadraticCurveTo(r * 0.3, 0, r * 0.08, -r * 0.58);
  ctx.quadraticCurveTo(r * 0.55, -r * 0.5, r * 0.7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,240,230,0.95)";
  for (const side of [1, -1]) {
    ctx.beginPath();
    ctx.arc(r * 0.5, side * r * 0.24, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** 심해 아귀 군주. 유인등이 깜빡일 때 미끼로 끌어들인다. */
const drawAnglerLord: MonsterPainter = (ctx, monster, now) => {
  const r = monster.radius;
  const body = monster.glowColor;
  const gape = 0.5 + 0.5 * Math.sin(now * 1.6 + monster.id);
  const sway = Math.sin(now * 1.1) * r * 0.12;

  ctx.fillStyle = shade(body, 0.4, 0.95);
  ctx.strokeStyle = withAlpha(body, 0.7);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, 0);
  ctx.lineTo(-r * 1.55, -r * 0.72 + sway);
  ctx.lineTo(-r * 1.2, 0);
  ctx.lineTo(-r * 1.55, r * 0.72 + sway);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const hide = ctx.createLinearGradient(0, -r * 0.9, 0, r * 0.9);
  hide.addColorStop(0, shade(body, 0.6));
  hide.addColorStop(0.55, shade(body, 0.36));
  hide.addColorStop(1, shade(body, 0.2));
  ctx.fillStyle = hide;
  ctx.strokeStyle = withAlpha(body, 0.85);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(r * 0.85, 0);
  ctx.bezierCurveTo(r * 0.8, r * 0.85, r * 0.1, r * 0.95, -r * 0.8, r * 0.42);
  ctx.lineTo(-r * 0.8, -r * 0.42);
  ctx.bezierCurveTo(r * 0.1, -r * 0.95, r * 0.8, -r * 0.85, r * 0.85, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 위에서 보는 시점이라 아가리는 좌우로 벌어진다.
  const open = r * (0.1 + 0.42 * gape);

  ctx.fillStyle = "rgba(12,6,5,0.95)";
  ctx.beginPath();
  ctx.moveTo(r * 0.15, 0);
  ctx.lineTo(r * 1.15, -open - r * 0.14);
  ctx.lineTo(r * 1.24, 0);
  ctx.lineTo(r * 1.15, open + r * 0.14);
  ctx.closePath();
  ctx.fill();

  for (const side of [1, -1]) {
    ctx.fillStyle = shade(body, 0.5);
    ctx.strokeStyle = withAlpha(body, 0.9);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(r * 0.1, side * r * 0.32);
    ctx.quadraticCurveTo(r * 0.8, side * (open + r * 0.52), r * 1.18, side * (open + r * 0.16));
    ctx.quadraticCurveTo(r * 0.75, side * (open + r * 0.14), r * 0.12, side * r * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(245,240,225,0.95)";
    for (let i = 0; i < 7; i += 1) {
      const t = 0.15 + (i / 6) * 0.78;
      const x = r * 0.12 + r * 0.98 * t;
      const y = side * (r * 0.06 + (open + r * 0.1 - r * 0.06) * t);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.04, y);
      ctx.lineTo(x + r * 0.04, y);
      ctx.lineTo(x, y - side * r * 0.17);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (const side of [1, -1]) {
    ctx.beginPath();
    ctx.arc(r * 0.06, side * r * 0.52, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }

  // 유인등은 아가리 앞으로 드리운다. 미끼가 어디 걸려 있는지 바로 보인다.
  const lureX = r * 1.72;
  const lureY = sway * 1.6;
  ctx.strokeStyle = shade(body, 0.75);
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-r * 0.05, -r * 0.14);
  ctx.quadraticCurveTo(r * 0.9, -r * 0.55 + sway * 2, lureX, lureY);
  ctx.stroke();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const lit = monster.lureBlinkOn ? 1 : 0.25;
  const esca = ctx.createRadialGradient(lureX, lureY, 0, lureX, lureY, r * 0.45);
  esca.addColorStop(0, `rgba(255,252,220,${0.95 * lit})`);
  esca.addColorStop(1, withAlpha(body, 0));
  ctx.fillStyle = esca;
  ctx.beginPath();
  ctx.arc(lureX, lureY, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** 심연의 리바이어던. 마디가 이어진 긴 몸이 물결치며 따라온다. */
const drawLeviathan: MonsterPainter = (ctx, monster, now) => {
  const r = monster.radius;
  const body = monster.glowColor;
  const segments = 8;
  const step = r * 0.6;

  // 마디를 따로 그리면 애벌레처럼 보인다. 척추 하나에 굵기만 달리해 이어 붙인다.
  const spine = Array.from({ length: segments + 1 }, (_, i) => ({
    x: r * 0.4 - step * i,
    y: Math.sin(now * 1.4 - i * 0.55 + monster.id) * r * 0.42 * (i / segments),
  }));

  const strokeSpine = (count: number, width: number, style: string) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(spine[0].x, spine[0].y);
    for (let i = 1; i <= count; i += 1) ctx.lineTo(spine[i].x, spine[i].y);
    ctx.stroke();
  };

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  strokeSpine(segments, r * 0.3, shade(body, 0.3));
  strokeSpine(6, r * 0.66, shade(body, 0.32));
  strokeSpine(4, r * 1.0, shade(body, 0.34));
  strokeSpine(2, r * 1.28, shade(body, 0.36));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  strokeSpine(segments, r * 0.1, withAlpha(body, 0.45));
  ctx.restore();

  // 등줄기 마디
  ctx.strokeStyle = withAlpha(body, 0.45);
  ctx.lineWidth = 1.3;
  for (let i = 1; i <= segments; i += 1) {
    const width = r * (0.6 - (i / segments) * 0.42);
    ctx.beginPath();
    ctx.moveTo(spine[i].x, spine[i].y - width);
    ctx.lineTo(spine[i].x, spine[i].y + width);
    ctx.stroke();
  }

  ctx.fillStyle = withAlpha(body, 0.3);
  ctx.strokeStyle = withAlpha(body, 0.7);
  ctx.lineWidth = 1.4;
  for (const side of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, side * r * 0.5);
    ctx.quadraticCurveTo(-r * 1.1, side * r * 1.7, -r * 1.9, side * r * 1.5);
    ctx.quadraticCurveTo(-r * 1.3, side * r * 0.75, -r * 0.5, side * r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  const skull = ctx.createLinearGradient(0, -r * 0.8, 0, r * 0.8);
  skull.addColorStop(0, shade(body, 0.55));
  skull.addColorStop(0.55, shade(body, 0.32));
  skull.addColorStop(1, shade(body, 0.18));
  ctx.fillStyle = skull;
  ctx.strokeStyle = withAlpha(body, 0.85);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r * 1.55, 0);
  ctx.bezierCurveTo(r * 1.15, r * 0.46, r * 0.4, r * 0.8, -r * 0.4, r * 0.6);
  ctx.lineTo(-r * 0.4, -r * 0.6);
  ctx.bezierCurveTo(r * 0.4, -r * 0.8, r * 1.15, -r * 0.46, r * 1.55, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 벌어진 아가리. 포식자라는 것이 실루엣만으로 읽히게 한다.
  ctx.fillStyle = "rgba(6,14,16,0.95)";
  ctx.beginPath();
  ctx.moveTo(r * 0.25, 0);
  ctx.lineTo(r * 1.42, -r * 0.3);
  ctx.lineTo(r * 1.5, 0);
  ctx.lineTo(r * 1.42, r * 0.3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(235,245,240,0.9)";
  for (const side of [1, -1]) {
    for (let i = 0; i < 6; i += 1) {
      const t = 0.2 + (i / 5) * 0.72;
      const x = r * 0.25 + r * 1.15 * t;
      const y = side * r * 0.3 * t;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.035, y);
      ctx.lineTo(x + r * 0.035, y);
      ctx.lineTo(x, y - side * r * 0.12);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = withAlpha(body, 0.9);
  for (const side of [1, -1]) {
    ctx.beginPath();
    ctx.ellipse(r * 0.12, side * r * 0.44, r * 0.1, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const MONSTER_PAINTERS: Record<MonsterKind, MonsterPainter> = {
  krill: drawKrill,
  eel: drawEel,
  euphonophore: drawEuphonophore,
  ghost_squid: drawGhostSquid,
  vent_crab: drawVentCrab,
  angler_lord: drawAnglerLord,
  leviathan: drawLeviathan,
};

/** 어둠 속에서 실루엣이 뜨도록 몸체 뒤에 깔아 두는 발광. */
function drawMonsterAura(ctx: CanvasRenderingContext2D, monster: Monster): void {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const reach = monster.radius * 2.4;
  const grad = ctx.createRadialGradient(monster.pos.x, monster.pos.y, 0, monster.pos.x, monster.pos.y, reach);
  grad.addColorStop(0, withAlpha(monster.glowColor, 0.45));
  grad.addColorStop(1, withAlpha(monster.glowColor, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(monster.pos.x, monster.pos.y, reach, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 피격 직후 짧게 터지는 흰 섬광. 탄이 박혔는지 바로 읽힌다. */
function drawHitFlash(ctx: CanvasRenderingContext2D, monster: Monster, now: number): void {
  const since = now - (monster.lastHitAt ?? Number.NEGATIVE_INFINITY);
  if (since > 0.12) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - since / 0.12)})`;
  ctx.beginPath();
  ctx.arc(0, 0, monster.radius * 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 기절 상태를 도는 불꽃으로 표시한다. */
function drawStunSparks(ctx: CanvasRenderingContext2D, monster: Monster, now: number): void {
  if ((monster.stunnedUntil ?? 0) <= now) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "rgba(200,235,255,0.9)";
  for (let i = 0; i < 3; i += 1) {
    const angle = now * 6 + ((Math.PI * 2) / 3) * i;
    const reach = monster.radius * 1.3;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * reach, Math.sin(angle) * reach, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawMonsters(ctx: CanvasRenderingContext2D, world: WorldState, now: number): void {
  for (const monster of world.monsters) {
    if (!monster.visible) continue;

    drawMonsterAura(ctx, monster);

    ctx.save();
    ctx.translate(monster.pos.x, monster.pos.y);
    ctx.rotate(angleOf(monster.facing));
    MONSTER_PAINTERS[monster.kind](ctx, monster, now);
    drawHitFlash(ctx, monster, now);
    drawStunSparks(ctx, monster, now);
    ctx.restore();
  }
}
