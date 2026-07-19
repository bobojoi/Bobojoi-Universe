/** Minimal point contract keeps companion positioning independent of Phaser. */
export interface WorldPoint {
  x: number;
  y: number;
}

export interface WorldBounds {
  width: number;
  height: number;
  margin: number;
}

export const DOG_FOLLOW_MIN_DISTANCE = 100;
export const DOG_FOLLOW_MAX_DISTANCE = 160;
export const DOG_CATCH_UP_DISTANCE = 220;
export const DOG_AVOID_RADIUS = 112;

const REAR_OFFSET = 78;
const SIDE_OFFSET = 110;

/** Finds a side-rear companion position, preferring the side farthest from blocked props. */
export function getBubbleDogCompanionTarget(
  player: WorldPoint,
  heading: WorldPoint,
  preferredSide: -1 | 1,
  blockedPositions: readonly WorldPoint[],
  bounds: WorldBounds,
): WorldPoint {
  const normalizedHeading = normalize(heading, { x: 0, y: 1 });
  const side = { x: -normalizedHeading.y, y: normalizedHeading.x };
  const candidates = [preferredSide, preferredSide === 1 ? -1 : 1].flatMap((sideSign) => [
    offsetTarget(player, normalizedHeading, side, sideSign, REAR_OFFSET, SIDE_OFFSET),
    offsetTarget(player, normalizedHeading, side, sideSign, REAR_OFFSET + 34, SIDE_OFFSET - 14),
  ]);
  const boundedCandidates = candidates.map((candidate) => clampToBounds(candidate, bounds));
  const clearCandidate = boundedCandidates.find(
    (candidate) => nearestDistance(candidate, blockedPositions) >= DOG_AVOID_RADIUS,
  );
  if (clearCandidate) return clearCandidate;

  return boundedCandidates.reduce((best, candidate) =>
    nearestDistance(candidate, blockedPositions) > nearestDistance(best, blockedPositions)
      ? candidate
      : best,
  );
}

/** Reports whether the dog is currently occupying a protected interaction location. */
export function isBubbleDogBlocking(
  dog: WorldPoint,
  blockedPositions: readonly WorldPoint[],
): boolean {
  return nearestDistance(dog, blockedPositions) < DOG_AVOID_RADIUS;
}

function offsetTarget(
  player: WorldPoint,
  heading: WorldPoint,
  side: WorldPoint,
  sideSign: number,
  rearOffset: number,
  sideOffset: number,
): WorldPoint {
  return {
    x: player.x - heading.x * rearOffset + side.x * sideOffset * sideSign,
    y: player.y - heading.y * rearOffset + side.y * sideOffset * sideSign,
  };
}

function normalize(point: WorldPoint, fallback: WorldPoint): WorldPoint {
  const length = Math.hypot(point.x, point.y);
  return length > 0 ? { x: point.x / length, y: point.y / length } : fallback;
}

function clampToBounds(point: WorldPoint, bounds: WorldBounds): WorldPoint {
  return {
    x: Math.min(Math.max(point.x, bounds.margin), bounds.width - bounds.margin),
    y: Math.min(Math.max(point.y, bounds.margin), bounds.height - bounds.margin),
  };
}

function nearestDistance(point: WorldPoint, blockedPositions: readonly WorldPoint[]): number {
  if (blockedPositions.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(
    ...blockedPositions.map((blocked) => Math.hypot(point.x - blocked.x, point.y - blocked.y)),
  );
}
