import { BoardState, PlacedDomino } from '@/types';
import { findRegions } from './regions';

/**
 * Check whether every board cell is covered by a domino and
 * every region constraint is satisfied.
 */
export function validatePuzzle(board: BoardState, placedDominoes: PlacedDomino[]): boolean {
  // Build a map of "row-col" → pip value
  const pipMap = new Map<string, number>();
  for (const p of placedDominoes) {
    pipMap.set(`${p.row}-${p.col}`, p.domino.first);
    if (p.orientation === 'horizontal') {
      pipMap.set(`${p.row}-${p.col + 1}`, p.domino.second);
    } else {
      pipMap.set(`${p.row + 1}-${p.col}`, p.domino.second);
    }
  }

  // Check every active cell (has regionColor) on the board is covered
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].regionColor && !pipMap.has(`${r}-${c}`)) return false;
    }
  }

  const regionMap = findRegions(board);

  // Deduplicate regions (multiple cells point to same RegionInfo object)
  const seen = new Set<object>();

  for (const [, info] of regionMap) {
    if (seen.has(info)) continue;
    seen.add(info);

    // Collect pip values for every cell in the region
    const pips: number[] = [];
    for (const [r, c] of info.cells) {
      const val = pipMap.get(`${r}-${c}`);
      if (val === undefined) return false; // cell not covered
      pips.push(val);
    }

    const constraint = info.constraint;
    if (!constraint) continue; // no constraint → always OK

    if (constraint.type === 'symbol') {
      if (constraint.value === 'equal') {
        if (!pips.every((v) => v === pips[0])) return false;
      } else {
        // notEqual — not all the same
        if (pips.every((v) => v === pips[0])) return false;
      }
    } else {
      // Text constraint
      const text = constraint.value;
      const sum = pips.reduce((a, b) => a + b, 0);
      const avg = sum / pips.length;

      if (text.startsWith('<')) {
        const threshold = parseFloat(text.slice(1));
        if (!(avg < threshold)) return false;
      } else if (text.startsWith('>')) {
        const threshold = parseFloat(text.slice(1));
        if (!(avg > threshold)) return false;
      } else {
        // Exact sum
        const target = parseInt(text, 10);
        if (sum !== target) return false;
      }
    }
  }

  return true;
}
