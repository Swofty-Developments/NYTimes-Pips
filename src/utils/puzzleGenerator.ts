import { BoardState, CellState, RegionColor } from '@/types';
import { BOARD } from '@/constants';

const COLORS: RegionColor[] = ['orange', 'blue', 'pink', 'teal', 'purple', 'green'];

/**
 * Generate a random puzzle board with colored regions.
 * This is a placeholder implementation that paints random connected regions.
 */
export function generateRandomPuzzle(): BoardState {
  const board: BoardState = Array.from({ length: BOARD.rows }, () =>
    Array.from({ length: BOARD.cols }, (): CellState => ({
      regionColor: null,
      constraint: null,
    }))
  );

  // Fill the board with random regions using a simple approach:
  // Walk through each cell and either extend an adjacent region or start a new one.
  const usedColors = new Map<string, RegionColor>();

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

  return board;
}
