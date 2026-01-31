import { BoardState, PlacedDomino, Constraint } from '@/types';
import { findRegions, RegionInfo } from './regions';

function buildPipMap(placedDominoes: PlacedDomino[]): Map<string, number> {
  const pipMap = new Map<string, number>();
  for (const p of placedDominoes) {
    pipMap.set(`${p.row}-${p.col}`, p.domino.first);
    if (p.orientation === 'horizontal') {
      pipMap.set(`${p.row}-${p.col + 1}`, p.domino.second);
    } else {
      pipMap.set(`${p.row + 1}-${p.col}`, p.domino.second);
    }
  }
  return pipMap;
}

/** Check if all foundation cells are covered by dominoes. */
export function isBoardFull(board: BoardState, placedDominoes: PlacedDomino[]): boolean {
  const pipMap = buildPipMap(placedDominoes);
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isFoundation && !pipMap.has(`${r}-${c}`)) return false;
    }
  }
  return true;
}

function isConstraintViolated(constraint: Constraint, pips: number[]): boolean {
  if (constraint.type === 'symbol') {
    if (constraint.value === 'equal') {
      return !pips.every((v) => v === pips[0]);
    } else {
      return pips.every((v) => v === pips[0]);
    }
  } else {
    const text = constraint.value;
    const sum = pips.reduce((a, b) => a + b, 0);
    if (text.startsWith('<')) {
      return !(sum < parseFloat(text.slice(1)));
    } else if (text.startsWith('>')) {
      return !(sum > parseFloat(text.slice(1)));
    } else {
      return sum !== parseInt(text, 10);
    }
  }
}

/**
 * Returns a Set of "row-col" keys for the display cells of regions
 * whose constraints are violated.
 */
export function getViolatedRegions(board: BoardState, placedDominoes: PlacedDomino[]): Set<string> {
  const pipMap = buildPipMap(placedDominoes);
  const regionMap = findRegions(board);
  const violated = new Set<string>();
  const seen = new Set<RegionInfo>();

  for (const [, info] of regionMap) {
    if (seen.has(info)) continue;
    seen.add(info);

    const constraint = info.constraint;
    if (!constraint) continue;

    const pips: number[] = [];
    let allCovered = true;
    for (const [r, c] of info.cells) {
      const val = pipMap.get(`${r}-${c}`);
      if (val === undefined) { allCovered = false; break; }
      pips.push(val);
    }

    if (!allCovered) continue; // can't evaluate incomplete regions

    if (isConstraintViolated(constraint, pips)) {
      const [dr, dc] = info.displayCell;
      violated.add(`${dr}-${dc}`);
    }
  }

  return violated;
}

/**
 * Check whether every board cell is covered by a domino and
 * every region constraint is satisfied.
 */
export function validatePuzzle(board: BoardState, placedDominoes: PlacedDomino[]): boolean {
  if (!isBoardFull(board, placedDominoes)) return false;
  return getViolatedRegions(board, placedDominoes).size === 0;
}
