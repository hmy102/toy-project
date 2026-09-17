import { ARENA_HEIGHT, ARENA_WIDTH, SUB_RADIUS } from "./constants";
import { circlesOverlap } from "./collision";
import { damageMonster } from "./monsters";
import { applyHarpoonKnockback } from "./weapons";
import type { WorldState } from "./types";
import { add, scale } from "./vector";
import { applyDamageToSubmarine, isSubmarineInvulnerable, triggerSubmarineInvuln } from "./submarine";

const OUT_OF_BOUNDS_MARGIN = 40;

function isOutOfBounds(pos: { x: number; y: number }): boolean {
  return (
    pos.x < -OUT_OF_BOUNDS_MARGIN ||
    pos.x > ARENA_WIDTH + OUT_OF_BOUNDS_MARGIN ||
    pos.y < -OUT_OF_BOUNDS_MARGIN ||
    pos.y > ARENA_HEIGHT + OUT_OF_BOUNDS_MARGIN
  );
}

export function updateProjectiles(world: WorldState, dt: number, now: number): void {
  const alive = [];

  for (const projectile of world.projectiles) {
    projectile.pos = add(projectile.pos, scale(projectile.velocity, dt));
    let remove = now - projectile.bornAt > projectile.maxLifeSec || isOutOfBounds(projectile.pos);

    if (!remove && projectile.owner === "player") {
      for (const monster of world.monsters) {
        if (monster.hp <= 0) continue;
        if (projectile.hitMonsterIds.includes(monster.id)) continue;
        if (!circlesOverlap(projectile.pos, 6, monster.pos, monster.radius)) continue;

        projectile.hitMonsterIds.push(monster.id);
        if (projectile.explodeRadius) {
          world.effects.push({
            id: world.nextEntityId++,
            kind: "explosion",
            pos: { ...projectile.pos },
            radius: projectile.explodeRadius,
            bornAt: now,
            ttlSec: 0.35,
          });
          for (const splash of world.monsters) {
            if (splash.hp <= 0) continue;
            if (!circlesOverlap(projectile.pos, projectile.explodeRadius, splash.pos, splash.radius)) continue;
            damageMonster(world, splash, projectile.damage, projectile.pos, now);
          }
          remove = true;
        } else {
          damageMonster(world, monster, projectile.damage, projectile.pos, now);
          if (projectile.knockback) {
            applyHarpoonKnockback(monster, projectile.pos, projectile.knockback);
          }
          projectile.piercesLeft -= 1;
          if (projectile.piercesLeft < 0) remove = true;
        }
        break;
      }
    } else if (!remove && projectile.owner === "monster") {
      if (
        !isSubmarineInvulnerable(world.submarine, now) &&
        circlesOverlap(projectile.pos, 6, world.submarine.pos, SUB_RADIUS)
      ) {
        applyDamageToSubmarine(world.submarine, projectile.damage);
        triggerSubmarineInvuln(world.submarine, now);
        remove = true;
      }
    }

    if (!remove) alive.push(projectile);
  }

  world.projectiles = alive;
}
