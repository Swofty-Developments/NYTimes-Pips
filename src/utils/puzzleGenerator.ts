import { BoardState, CellState, RegionColor, Constraint } from '@/types';
import { BOARD } from '@/constants';
import { findRegions } from '@/utils/regions';

const COLORS: RegionColor[] = ['orange', 'blue', 'pink', 'teal', 'purple', 'green'];

const POSSIBLE_CONSTRAINTS: Constraint[] = [
  { type: 'symbol', value: 'equal' },
  { type: 'symbol', value: 'notEqual' },
  { type: 'text', value: '<2' },
  { type: 'text', value: '<3' },
  { type: 'text', value: '>4' },
  { type: 'text', value: '>5' },
  { type: 'text', value: '7' },
  { type: 'text', value: '8' },
  { type: 'text', value: '9' },
  { type: 'text', value: '10' },
];

/**
 * Generate a random puzzle board with colored regions.
 * This is a placeholder implementation that paints random connected regions.
 */
export function generateRandomPuzzle(withConstraints = false): BoardState {
  const board: BoardState = Array.from({ length: BOARD.rows }, () =>
    Array.from({ length: BOARD.cols }, (): CellState => ({
      regionColor: null,
      constraint: null,
    }))
  );

  // Fill the board with random regions using a simple approach:
  // Walk through each cell and either extend an adjacent region or start a new one.
  for (let r = 0; r < BOARD.rows; r++) {
    for (let c = 0; c < BOARD.cols; c++) {
      // Try to extend from left or top neighbor
      const neighbors: RegionColor[] = [];
      if (r > 0 && board[r - 1][c].regionColor) neighbors.push(board[r - 1][c].regionColor!);
      if (c > 0 && board[r][c - 1].regionColor) neighbors.push(board[r][c - 1].regionColor!);

      // 40% chance to extend a neighbor's color, 60% chance for a new random color
      if (neighbors.length > 0 && Math.random() < 0.4) {
        board[r][c].regionColor = neighbors[Math.floor(Math.random() * neighbors.length)];
      } else {
        board[r][c].regionColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      }
    }
  }

  if (withConstraints) {
    const regionMap = findRegions(board);
    const seen = new Set<string>();
    for (const [key, info] of regionMap) {
      const regionKey = `${info.displayCell[0]}-${info.displayCell[1]}`;
      if (seen.has(regionKey)) continue;
      seen.add(regionKey);

      const [dr, dc] = info.displayCell;
      board[dr][dc].constraint =
        POSSIBLE_CONSTRAINTS[Math.floor(Math.random() * POSSIBLE_CONSTRAINTS.length)];
    }
  }

  return board;
}
