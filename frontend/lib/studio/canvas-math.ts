/**
 * Geometry utilities for the detection canvas.
 * Handles coordinate transforms between image space and display space.
 */

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Minimum crop region size in pixels. */
export const MIN_CROP_SIZE = 20;

/** Clamp a value between min and max. */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Scale bounds from image coordinates to display coordinates. */
export function imageToDisplay(
  bounds: Bounds,
  imageWidth: number,
  imageHeight: number,
  displayWidth: number,
  displayHeight: number,
): Bounds {
  const scaleX = displayWidth / imageWidth;
  const scaleY = displayHeight / imageHeight;
  return {
    x: bounds.x * scaleX,
    y: bounds.y * scaleY,
    width: bounds.width * scaleX,
    height: bounds.height * scaleY,
  };
}

/** Scale bounds from display coordinates to image coordinates. */
export function displayToImage(
  bounds: Bounds,
  imageWidth: number,
  imageHeight: number,
  displayWidth: number,
  displayHeight: number,
): Bounds {
  const scaleX = imageWidth / displayWidth;
  const scaleY = imageHeight / displayHeight;
  return {
    x: Math.round(bounds.x * scaleX),
    y: Math.round(bounds.y * scaleY),
    width: Math.round(bounds.width * scaleX),
    height: Math.round(bounds.height * scaleY),
  };
}

/** Constrain bounds to stay within container dimensions. */
export function constrainBounds(
  bounds: Bounds,
  containerWidth: number,
  containerHeight: number,
): Bounds {
  const x = clamp(bounds.x, 0, containerWidth - MIN_CROP_SIZE);
  const y = clamp(bounds.y, 0, containerHeight - MIN_CROP_SIZE);
  const width = clamp(bounds.width, MIN_CROP_SIZE, containerWidth - x);
  const height = clamp(bounds.height, MIN_CROP_SIZE, containerHeight - y);
  return { x, y, width, height };
}

/** Check if a point is inside bounds. */
export function pointInBounds(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/** Generate evenly distributed default crop regions for N items. */
export function generateDefaultCrops(
  count: number,
  containerWidth: number,
  containerHeight: number,
): Bounds[] {
  if (count === 0) return [];
  if (count === 1) {
    const pad = 20;
    return [{ x: pad, y: pad, width: containerWidth - pad * 2, height: containerHeight - pad * 2 }];
  }

  // Grid layout
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellW = containerWidth / cols;
  const cellH = containerHeight / rows;
  const pad = 4;

  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      x: col * cellW + pad,
      y: row * cellH + pad,
      width: cellW - pad * 2,
      height: cellH - pad * 2,
    };
  });
}
