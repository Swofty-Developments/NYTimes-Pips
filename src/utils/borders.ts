import React from 'react';
import { BoardState, BorderFlags } from '@/types';

/**
 * Inside corners: true when both orthogonal neighbors are same region
 * but the diagonal is NOT (creating a concave corner that needs rounding).
 */
export interface InsideCorners {
  topLeft: boolean;
  topRight: boolean;
  bottomRight: boolean;
  bottomLeft: boolean;
}

/** Half the grid gap - how far to extend into the gap on each removed side */
const GAP_HALF = 2; // 4px gap / 2

/**
 * For a given cell, determine which borders should be removed
 * because an adjacent cell belongs to the same region.
 *
 * Returns `true` for each side that should be removed.
 */
export function computeBorderFlags(
  board: BoardState,
  row: number,
  col: number,
): BorderFlags {
  const cell = board[row][col];
  if (!cell.regionColor) {
    return { top: false, right: false, bottom: false, left: false };
  }

  const color = cell.regionColor;
  const rows = board.length;
  const cols = board[0].length;

  return {
    top: row > 0 && board[row - 1][col].regionColor === color,
    right: col < cols - 1 && board[row][col + 1].regionColor === color,
    bottom: row < rows - 1 && board[row + 1][col].regionColor === color,
    left: col > 0 && board[row][col - 1].regionColor === color,
  };
}

/**
 * Compute the border-radius string.
 *
 * A corner gets the radius when:
 *   - Neither adjacent side is removed (outer corner), OR
 *   - Both adjacent sides are removed but the diagonal is NOT same-region
 *     (inside/concave corner — keeps radius to round off the extension blip)
 *
 * A corner gets 0 when:
 *   - One adjacent side is removed (edge of a strip), OR
 *   - Both adjacent sides are removed AND the diagonal IS same-region
 *     (smooth interior — no corner needed)
 */
export function computeBorderRadius(
  flags: BorderFlags,
  radius: string,
): string {
  const cornerValue = (sideA: boolean, sideB: boolean) => {
    if (!sideA && !sideB) return radius;        // outer corner: full radius
    return '0';                                  // strip edge or inside: no radius
  };

  const tl = cornerValue(flags.top, flags.left);
  const tr = cornerValue(flags.top, flags.right);
  const br = cornerValue(flags.bottom, flags.right);
  const bl = cornerValue(flags.bottom, flags.left);
  return `${tl} ${tr} ${br} ${bl}`;
}

/**
 * Compute border-width with removed sides set to 0.
 */
export function computeBorderWidth(flags: BorderFlags, width: string): string {
  const t = flags.top ? '0' : width;
  const r = flags.right ? '0' : width;
  const b = flags.bottom ? '0' : width;
  const l = flags.left ? '0' : width;
  return `${t} ${r} ${b} ${l}`;
}

/**
 * Detect inside (concave) corners.
 * A corner is "inside" when both orthogonal neighbors are the same region
 * but the diagonal neighbor is NOT (or is out of bounds).
 */
export function computeInsideCorners(
  board: BoardState,
  row: number,
  col: number,
): InsideCorners {
  const color = board[row][col].regionColor;
  if (!color) return { topLeft: false, topRight: false, bottomRight: false, bottomLeft: false };

  const rows = board.length;
  const cols = board[0].length;

  const same = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols && board[r][c].regionColor === color;

  return {
    topLeft: same(row - 1, col) && same(row, col - 1) && !same(row - 1, col - 1),
    topRight: same(row - 1, col) && same(row, col + 1) && !same(row - 1, col + 1),
    bottomRight: same(row + 1, col) && same(row, col + 1) && !same(row + 1, col + 1),
    bottomLeft: same(row + 1, col) && same(row, col - 1) && !same(row + 1, col - 1),
  };
}

/**
 * Compute border-radius for the background layer only.
 * This handles inside (concave) corners by clipping the background
 * at the extension area. Separated from the border element because
 * border-image ignores border-radius.
 *
 * - Outer corner (neither side removed): full radius
 * - Inside corner (both sides removed, diagonal different): small radius
 * - Strip edge (one side removed) or smooth interior: 0
 */
export function computeBgRadius(
  flags: BorderFlags,
  radius: string,
  corners: InsideCorners,
): string {
  const INSIDE_R = `${GAP_HALF}px`;

  const cornerValue = (sideA: boolean, sideB: boolean, inside: boolean) => {
    if (!sideA && !sideB) return radius;
    if (sideA && sideB && inside) return INSIDE_R;
    return '0';
  };

  const tl = cornerValue(flags.top, flags.left, corners.topLeft);
  const tr = cornerValue(flags.top, flags.right, corners.topRight);
  const br = cornerValue(flags.bottom, flags.right, corners.bottomRight);
  const bl = cornerValue(flags.bottom, flags.left, corners.bottomLeft);
  return `${tl} ${tr} ${br} ${bl}`;
}

/**
 * Compute position and size for the regionCell so it extends into the gap.
 * Same-color sides extend GAP_HALF; non-same-color sides extend a bit more
 * so the SVG border and colour poke out slightly further.
 */
const EXTRA_BLEED = 1.2; // extra px on non-removed (gap-facing) sides

export function computeRegionExtent(flags: BorderFlags): React.CSSProperties {
  const t = flags.top ? GAP_HALF : GAP_HALF + EXTRA_BLEED;
  const r = flags.right ? GAP_HALF : GAP_HALF + EXTRA_BLEED;
  const b = flags.bottom ? GAP_HALF : GAP_HALF + EXTRA_BLEED;
  const l = flags.left ? GAP_HALF : GAP_HALF + EXTRA_BLEED;
  return {
    top: -t,
    left: -l,
    width: `calc(100% + ${l + r}px)`,
    height: `calc(100% + ${t + b}px)`,
  };
}

/**
 * Compute inset for the background layer so it only extends into the gap
 * on same-color sides. On other sides it pulls back, keeping the gap visible.
 */
const BG_PADDING = 1; // bg sits 1px inside the SVG border on all sides

export function computeBgInset(flags: BorderFlags): string {
  const t = flags.top ? 0 : GAP_HALF + BG_PADDING;
  const r = flags.right ? 0 : GAP_HALF + BG_PADDING;
  const b = flags.bottom ? 0 : GAP_HALF + BG_PADDING;
  const l = flags.left ? 0 : GAP_HALF + BG_PADDING;
  return `${t}px ${r}px ${b}px ${l}px`;
}
