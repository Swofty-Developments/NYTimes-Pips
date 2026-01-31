import { BoardState, CellState, Constraint, RegionColor, PlacedDomino, DominoOrientation } from '@/types';
import { BOARD } from '@/constants';

interface PuzzleData {
  board: BoardState;
  placedDominoes: PlacedDomino[];
}

const COLOR_MAP: Record<string, number> = {
  orange: 1,
  blue: 2,
  pink: 3,
  teal: 4,
  purple: 5,
  green: 6,
};

const COLOR_REVERSE: Record<number, RegionColor> = {
  1: 'orange',
  2: 'blue',
  3: 'pink',
  4: 'teal',
  5: 'purple',
  6: 'green',
};

function serializeConstraint(c: Constraint | null): string | null {
  if (!c) return null;
  if (c.type === 'symbol') return `s:${c.value}`;
  return `t:${c.value}`;
}

function deserializeConstraint(s: string): Constraint {
  if (s.startsWith('s:')) return { type: 'symbol', value: s.slice(2) as 'equal' | 'notEqual' };
  return { type: 'text', value: s.slice(2) };
}

export function encodePuzzle(board: BoardState, placedDominoes: PlacedDomino[] = []): string {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  // Compact board: array of [colorIndex, constraintString | null, isFoundation] per cell
  const cells: (number | string | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      const colorIdx = cell.regionColor ? COLOR_MAP[cell.regionColor] : 0;
      const constraint = serializeConstraint(cell.constraint);
      cells.push([colorIdx, constraint, cell.isFoundation ? 1 : 0]);
    }
  }

  // Compact placed dominoes
  const dominoes = placedDominoes.map((p) => [
    p.domino.id,
    p.domino.first,
    p.domino.second,
    p.orientation === 'horizontal' ? 0 : 1,
    p.row,
    p.col,
  ]);

  const json = JSON.stringify({ r: rows, k: cols, c: cells, d: dominoes });
  return btoa(json);
}

export function decodePuzzle(encoded: string): PuzzleData {
  const json = atob(encoded);
  const data = JSON.parse(json);

  // Backward compat: old puzzles without grid dimensions default to BOARD size
  const rows: number = data.r ?? BOARD.rows;
  const cols: number = data.k ?? BOARD.cols;

  const board: BoardState = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < cols; c++) {
      const entry = data.c[idx++];
      const [colorIdx, constraintStr] = entry;
      // Backward compat: old puzzles without foundation flag default to true
      const isFoundation = entry.length > 2 ? entry[2] === 1 : true;
      row.push({
        regionColor: colorIdx === 0 ? null : COLOR_REVERSE[colorIdx],
        constraint: constraintStr ? deserializeConstraint(constraintStr) : null,
        isFoundation,
      });
    }
    board.push(row);
  }

  const placedDominoes: PlacedDomino[] = (data.d || []).map(
    (d: [string, number, number, number, number, number]) => ({
      domino: { id: d[0], first: d[1], second: d[2] },
      orientation: (d[3] === 0 ? 'horizontal' : 'vertical') as DominoOrientation,
      row: d[4],
      col: d[5],
    })
  );

  return { board, placedDominoes };
}
