import { BoardState, CellState, Constraint, Domino, PlacedDomino, RegionColor } from '@/types';
import { WORK_GRID } from '@/constants';

/* ── External format (per difficulty from Supabase) ──────────── */

interface ExternalRegion {
  type: 'empty' | 'equals' | 'sum' | 'less' | 'greater';
  target?: number;
  indices: [number, number][];
}

interface ExternalPuzzle {
  regions: ExternalRegion[];
  dominoes: [number, number][];
  solution: [[number, number], [number, number]][];
}

/* ── Result (matches GeneratedPuzzle) ────────────────────────── */

export interface ConvertedPuzzle {
  board: BoardState;
  solutionDominoes: Domino[];
  solutionPlacements: PlacedDomino[];
  source: string;
}

const COLORS: RegionColor[] = ['orange', 'blue', 'pink', 'teal', 'purple', 'green'];

/* ── Graph-color regions (greedy, 6 colors) ──────────────────── */

function graphColorRegions(
  regions: ExternalRegion[],
  cellToRegion: Map<string, number>,
): RegionColor[] {
  const n = regions.length;
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set());

  for (const [regionIdx, region] of regions.entries()) {
    for (const [r, c] of region.indices) {
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nk = `${r + dr}-${c + dc}`;
        const neighborRegion = cellToRegion.get(nk);
        if (neighborRegion !== undefined && neighborRegion !== regionIdx) {
          adj[regionIdx].add(neighborRegion);
          adj[neighborRegion].add(regionIdx);
        }
      }
    }
  }

  const colorAssignment: RegionColor[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const used = new Set<RegionColor>();
    for (const neighbor of adj[i]) {
      if (colorAssignment[neighbor]) used.add(colorAssignment[neighbor]);
    }
    const available = COLORS.filter((c) => !used.has(c));
    colorAssignment[i] = available.length > 0 ? available[0] : COLORS[i % COLORS.length];
  }

  return colorAssignment;
}

/* ── Map external constraint type → internal Constraint ──────── */

function mapConstraint(region: ExternalRegion): Constraint | null {
  switch (region.type) {
    case 'empty':
      return null;
    case 'equals':
      return { type: 'symbol', value: 'equal' };
    case 'sum':
      return { type: 'text', value: String(region.target ?? 0) };
    case 'less':
      return { type: 'text', value: '<' + (region.target ?? 0) };
    case 'greater':
      return { type: 'text', value: '>' + (region.target ?? 0) };
    default:
      return null;
  }
}

/* ── Find bottom-right-most cell (display cell for constraint) ─ */

function findDisplayCell(cells: [number, number][]): [number, number] {
  let best = cells[0];
  for (const cell of cells) {
    if (cell[0] > best[0] || (cell[0] === best[0] && cell[1] > best[1])) {
      best = cell;
    }
  }
  return best;
}

/* ── Main converter ──────────────────────────────────────────── */

export function convertExternalPuzzle(data: ExternalPuzzle, source: string): ConvertedPuzzle {
  const { regions, dominoes, solution } = data;

  // 1. Collect ALL foundation cells from solution placements (where dominoes sit)
  const allCells = new Set<string>();
  for (const [[r1, c1], [r2, c2]] of solution) {
    allCells.add(`${r1}-${c1}`);
    allCells.add(`${r2}-${c2}`);
  }
  // Also include region cells (they should overlap, but just in case)
  for (const region of regions) {
    for (const [r, c] of region.indices) {
      allCells.add(`${r}-${c}`);
    }
  }

  // Compute bounding box from all foundation cells
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const key of allCells) {
    const [r, c] = key.split('-').map(Number);
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }

  const shapeH = maxR - minR + 1;
  const shapeW = maxC - minC + 1;

  // Check if puzzle fits in the work grid
  if (shapeH > WORK_GRID.rows || shapeW > WORK_GRID.cols) {
    throw new Error('Puzzle too large for grid');
  }

  // 2. Center on WORK_GRID
  const offsetR = Math.floor((WORK_GRID.rows - shapeH) / 2) - minR;
  const offsetC = Math.floor((WORK_GRID.cols - shapeW) / 2) - minC;

  // 3. Build cell-to-region map (using offset coordinates)
  const cellToRegion = new Map<string, number>();
  for (let i = 0; i < regions.length; i++) {
    for (const [r, c] of regions[i].indices) {
      cellToRegion.set(`${r + offsetR}-${c + offsetC}`, i);
    }
  }

  // 4. Graph-color regions
  // Build the regions with offset coords for adjacency
  const offsetRegions: ExternalRegion[] = regions.map((reg) => ({
    ...reg,
    indices: reg.indices.map(([r, c]) => [r + offsetR, c + offsetC] as [number, number]),
  }));
  const regionColors = graphColorRegions(offsetRegions, cellToRegion);

  // 5. Build board — first mark ALL foundation cells (colorless), then overlay regions
  const board: BoardState = Array.from({ length: WORK_GRID.rows }, () =>
    Array.from({ length: WORK_GRID.cols }, (): CellState => ({
      regionColor: null,
      constraint: null,
      isFoundation: false,
    }))
  );

  // Mark all cells from solution as foundation (no color)
  for (const key of allCells) {
    const [r, c] = key.split('-').map(Number);
    board[r + offsetR][c + offsetC].isFoundation = true;
  }

  // Overlay colored regions onto foundation (skip "empty" — those are unconstrained foundation)
  for (let i = 0; i < regions.length; i++) {
    if (regions[i].type === 'empty') continue;

    const constraint = mapConstraint(regions[i]);
    const offsetCells = offsetRegions[i].indices;
    const displayCell = findDisplayCell(offsetCells);

    for (const [r, c] of offsetCells) {
      board[r][c].regionColor = regionColors[i];
      if (r === displayCell[0] && c === displayCell[1]) {
        board[r][c].constraint = constraint;
      }
    }
  }

  // 6. Convert dominoes
  const solutionDominoes: Domino[] = dominoes.map(([first, second]) => ({
    id: `${first}-${second}`,
    first,
    second,
  }));

  // 7. Convert solution placements
  const solutionPlacements: PlacedDomino[] = solution.map(([[r1, c1], [r2, c2]], idx) => {
    const ar1 = r1 + offsetR;
    const ac1 = c1 + offsetC;
    const ar2 = r2 + offsetR;
    const ac2 = c2 + offsetC;

    const orientation = ar1 === ar2 ? 'horizontal' as const : 'vertical' as const;
    const row = Math.min(ar1, ar2);
    const col = Math.min(ac1, ac2);

    // Determine domino pip values based on position order
    const domino = solutionDominoes[idx];

    // The first entry in solution pair corresponds to `first` pip,
    // second entry to `second` pip.
    // If the min position doesn't match the first entry, we need to swap.
    const needsSwap = orientation === 'horizontal'
      ? ac1 > ac2  // first pip should be on the left
      : ar1 > ar2; // first pip should be on top

    const placedDomino: Domino = needsSwap
      ? { id: domino.id, first: domino.second, second: domino.first }
      : domino;

    return {
      domino: placedDomino,
      orientation,
      row,
      col,
    };
  });

  return { board, solutionDominoes, solutionPlacements, source };
}
