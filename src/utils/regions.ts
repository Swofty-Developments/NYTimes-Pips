import { BoardState, Constraint } from '@/types';

export interface RegionInfo {
  /** All cells in this connected region */
  cells: [number, number][];
  /** Bottom-right-most cell where the constraint diamond is displayed */
  displayCell: [number, number];
  /** The constraint for this region (collected from any cell in the region) */
  constraint: Constraint | null;
}

function floodFill(
  board: BoardState,
  startRow: number,
  startCol: number,
  visited: boolean[][],
): [number, number][] {
  const color = board[startRow][startCol].regionColor;
  if (!color) return [];

  const cells: [number, number][] = [];
  const stack: [number, number][] = [[startRow, startCol]];
  const rows = board.length;
  const cols = board[0].length;

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    if (visited[r][c]) continue;
    if (board[r][c].regionColor !== color) continue;

    visited[r][c] = true;
    cells.push([r, c]);
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }

  return cells;
}

/**
 * Find the bottom-right-most cell: highest row first, then rightmost col.
 */
function findDisplayCell(cells: [number, number][]): [number, number] {
  let best = cells[0];
  for (const cell of cells) {
    if (cell[0] > best[0] || (cell[0] === best[0] && cell[1] > best[1])) {
      best = cell;
    }
  }
  return best;
}

/**
 * Build a map from "row-col" → RegionInfo for every painted cell.
 * Each cell in a connected region points to the same RegionInfo.
 */
export function findRegions(board: BoardState): Map<string, RegionInfo> {
  const rows = board.length;
  const cols = board[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false) as boolean[]);
  const regionMap = new Map<string, RegionInfo>();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (visited[r][c] || !board[r][c].regionColor) continue;

      const cells = floodFill(board, r, c, visited);
      const displayCell = findDisplayCell(cells);

      // Collect any constraint set on any cell in this region
      let constraint: Constraint | null = null;
      for (const [cr, cc] of cells) {
        if (board[cr][cc].constraint) {
          constraint = board[cr][cc].constraint;
          break;
        }
      }

      const info: RegionInfo = { cells, displayCell, constraint };
      for (const [cr, cc] of cells) {
        regionMap.set(`${cr}-${cc}`, info);
      }
    }
  }

  return regionMap;
}
