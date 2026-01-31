import { BoardState, CellState, RegionColor, Constraint, Domino, PlacedDomino, DominoOrientation } from '@/types';
import { BOARD } from '@/constants';
import { findRegions } from '@/utils/regions';

const ROWS = BOARD.rows; // 4
const COLS = BOARD.cols; // 6
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

export interface GeneratedPuzzle {
  board: BoardState;
  solutionDominoes: Domino[];
  solutionPlacements: PlacedDomino[];
}

// ── Utility ──────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Stage 1: Random Tiling ───────────────────────────────────────

interface TilingSlot {
  r1: number; c1: number;
  r2: number; c2: number;
}

function generateRandomTiling(): TilingSlot[] {
  const filled: boolean[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  function solve(slots: TilingSlot[]): TilingSlot[] | null {
    // Find first unfilled cell
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (filled[r][c]) continue;

        // Build candidate placements
        const candidates: TilingSlot[] = [];
        // horizontal
        if (c + 1 < COLS && !filled[r][c + 1]) {
          candidates.push({ r1: r, c1: c, r2: r, c2: c + 1 });
        }
        // vertical
        if (r + 1 < ROWS && !filled[r + 1][c]) {
          candidates.push({ r1: r, c1: c, r2: r + 1, c2: c });
        }

        for (const slot of shuffle(candidates)) {
          filled[slot.r1][slot.c1] = true;
          filled[slot.r2][slot.c2] = true;
          const result = solve([...slots, slot]);
          if (result) return result;
          filled[slot.r1][slot.c1] = false;
          filled[slot.r2][slot.c2] = false;
        }
        return null; // dead end
      }
    }
    return slots; // all filled
  }

  return solve([])!;
}

// ── Stage 2: Domino Assignment ───────────────────────────────────

function assignDominoes(slots: TilingSlot[]): Domino[] {
  // Generate full 28-piece set
  const allPieces: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      allPieces.push([i, j]);
    }
  }

  const shuffledPieces = shuffle(allPieces);
  const result: Domino[] = new Array(slots.length);
  const used: boolean[] = new Array(shuffledPieces.length).fill(false);

  function solve(idx: number): boolean {
    if (idx === slots.length) return true;

    for (let p = 0; p < shuffledPieces.length; p++) {
      if (used[p]) continue;
      const [a, b] = shuffledPieces[p];

      // Try both orientations
      used[p] = true;

      // Orientation 1: first=a, second=b
      result[idx] = { id: `${a}-${b}`, first: a, second: b };
      if (solve(idx + 1)) return true;

      // Orientation 2: first=b, second=a (only different if a !== b)
      if (a !== b) {
        result[idx] = { id: `${a}-${b}`, first: b, second: a };
        if (solve(idx + 1)) return true;
      }

      used[p] = false;
    }
    return false;
  }

  solve(0);
  return result;
}

// ── Stage 3: Region Growing (Union-Find) ─────────────────────────

class UnionFind {
  parent: number[];
  rank: number[];
  size: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.size = new Array(n).fill(1);
  }

  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(a: number, b: number): boolean {
    const ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) {
      this.parent[ra] = rb;
      this.size[rb] += this.size[ra];
    } else if (this.rank[ra] > this.rank[rb]) {
      this.parent[rb] = ra;
      this.size[ra] += this.size[rb];
    } else {
      this.parent[rb] = ra;
      this.size[ra] += this.size[rb];
      this.rank[ra]++;
    }
    return true;
  }

  getSize(x: number): number {
    return this.size[this.find(x)];
  }
}

function cellIndex(r: number, c: number): number {
  return r * COLS + c;
}

function growRegions(slots: TilingSlot[]): Map<number, number> {
  const uf = new UnionFind(ROWS * COLS);

  // Pre-union domino pairs
  for (const slot of slots) {
    uf.union(cellIndex(slot.r1, slot.c1), cellIndex(slot.r2, slot.c2));
  }

  // Collect all inter-region edges (adjacent cells in different regions)
  const edges: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = cellIndex(r, c);
      if (c + 1 < COLS) {
        const right = cellIndex(r, c + 1);
        if (uf.find(idx) !== uf.find(right)) {
          edges.push([idx, right]);
        }
      }
      if (r + 1 < ROWS) {
        const down = cellIndex(r + 1, c);
        if (uf.find(idx) !== uf.find(down)) {
          edges.push([idx, down]);
        }
      }
    }
  }

  // Shuffle and selectively merge — cap at 4 cells for more moderate regions
  const MAX_REGION = 4;
  for (const [a, b] of shuffle(edges)) {
    const ra = uf.find(a), rb = uf.find(b);
    if (ra === rb) continue;
    const combined = uf.getSize(ra) + uf.getSize(rb);
    if (combined > MAX_REGION) continue;
    // Always merge isolated domino pairs (size 2) to avoid too many tiny regions
    if (uf.getSize(ra) <= 2 || uf.getSize(rb) <= 2) {
      uf.union(a, b);
      continue;
    }
    // Skip ~25% of other merges for variety
    if (Math.random() < 0.25) continue;
    uf.union(a, b);
  }

  // Count distinct regions
  const countDistinct = () => {
    const s = new Set<number>();
    for (let i = 0; i < ROWS * COLS; i++) s.add(uf.find(i));
    return s.size;
  };

  // Force-merge smallest regions if we ended up with too many (>8)
  while (countDistinct() > 8) {
    const regionCells = new Map<number, number[]>();
    for (let i = 0; i < ROWS * COLS; i++) {
      const root = uf.find(i);
      if (!regionCells.has(root)) regionCells.set(root, []);
      regionCells.get(root)!.push(i);
    }
    // Sort smallest first
    const sorted = [...regionCells.entries()].sort((a, b) => a[1].length - b[1].length);
    let merged = false;
    for (const [, cells] of sorted) {
      if (merged) break;
      for (const cell of cells) {
        if (merged) break;
        const r = Math.floor(cell / COLS), c = cell % COLS;
        for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]) {
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
          const ni = cellIndex(nr, nc);
          if (uf.find(cell) !== uf.find(ni)) {
            uf.union(cell, ni);
            merged = true;
            break;
          }
        }
      }
    }
    if (!merged) break; // safety
  }

  // Build cell → regionId mapping
  const rootToId = new Map<number, number>();
  let nextId = 0;
  const cellToRegion = new Map<number, number>();
  for (let i = 0; i < ROWS * COLS; i++) {
    const root = uf.find(i);
    if (!rootToId.has(root)) rootToId.set(root, nextId++);
    cellToRegion.set(i, rootToId.get(root)!);
  }

  return cellToRegion;
}

// ── Graph Coloring ───────────────────────────────────────────────

function colorRegions(cellToRegion: Map<number, number>): Map<number, RegionColor> {
  // Find distinct regions and adjacencies
  const regionCount = new Set(cellToRegion.values()).size;
  const adj: Set<number>[] = Array.from({ length: regionCount }, () => new Set());

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const rid = cellToRegion.get(cellIndex(r, c))!;
      const neighbors = [
        [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
      ].filter(([nr, nc]) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS);
      for (const [nr, nc] of neighbors) {
        const nid = cellToRegion.get(cellIndex(nr, nc))!;
        if (nid !== rid) {
          adj[rid].add(nid);
          adj[nid].add(rid);
        }
      }
    }
  }

  // Greedy color assignment
  const colorAssignment = new Map<number, RegionColor>();
  for (let rid = 0; rid < regionCount; rid++) {
    const usedColors = new Set<RegionColor>();
    for (const neighbor of adj[rid]) {
      const nc = colorAssignment.get(neighbor);
      if (nc) usedColors.add(nc);
    }
    const available = COLORS.filter((c) => !usedColors.has(c));
    colorAssignment.set(rid, available.length > 0 ? available[Math.floor(Math.random() * available.length)] : COLORS[rid % COLORS.length]);
  }

  return colorAssignment;
}

// ── Stage 4: Constraint Derivation ───────────────────────────────

function deriveConstraints(
  slots: TilingSlot[],
  dominoes: Domino[],
  cellToRegion: Map<number, number>,
): Map<number, Constraint> {
  // Compute pip values per cell
  const cellPips = new Map<number, number>();
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const domino = dominoes[i];
    cellPips.set(cellIndex(slot.r1, slot.c1), domino.first);
    cellPips.set(cellIndex(slot.r2, slot.c2), domino.second);
  }

  // Group cells by region
  const regionCells = new Map<number, number[]>();
  for (let i = 0; i < ROWS * COLS; i++) {
    const rid = cellToRegion.get(i)!;
    if (!regionCells.has(rid)) regionCells.set(rid, []);
    regionCells.get(rid)!.push(i);
  }

  const constraints = new Map<number, Constraint>();

  for (const [rid, cells] of regionCells) {
    const pipSum = cells.reduce((sum, ci) => sum + (cellPips.get(ci) ?? 0), 0);
    const avg = pipSum / cells.length;

    // For 2-cell regions, prefer symbol constraints
    if (cells.length === 2) {
      const a = cellPips.get(cells[0]) ?? 0;
      const b = cellPips.get(cells[1]) ?? 0;
      if (a === b) {
        constraints.set(rid, { type: 'symbol', value: 'equal' });
        continue;
      } else {
        constraints.set(rid, { type: 'symbol', value: 'notEqual' });
        continue;
      }
    }

    // Use exact sum as the primary constraint — most intuitive
    // For variety, occasionally use a tight inequality on the sum
    // Pick the tightest true inequality (sum-based, not average-based)
    const useInequality = Math.random() < 0.3;
    if (useInequality) {
      // Try sum-based inequalities with margin of 1-3
      if (pipSum <= 4) { constraints.set(rid, { type: 'text', value: `<${pipSum + 1}` }); continue; }
      if (pipSum >= cells.length * 5) { constraints.set(rid, { type: 'text', value: `>${pipSum - 1}` }); continue; }
    }

    constraints.set(rid, { type: 'text', value: String(pipSum) });
  }

  return constraints;
}

// ── Main Generator ───────────────────────────────────────────────

export function generatePuzzle(): GeneratedPuzzle {
  // Stage 1: Random tiling
  const slots = generateRandomTiling();

  // Stage 2: Assign dominoes
  const dominoes = assignDominoes(slots);

  // Stage 3: Region growing
  const cellToRegion = growRegions(slots);

  // Graph color the regions
  const regionColors = colorRegions(cellToRegion);

  // Stage 4: Derive constraints
  const regionConstraints = deriveConstraints(slots, dominoes, cellToRegion);

  // Build the board
  const board: BoardState = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, (): CellState => ({
      regionColor: null,
      constraint: null,
    }))
  );

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const rid = cellToRegion.get(cellIndex(r, c))!;
      board[r][c].regionColor = regionColors.get(rid)!;
    }
  }

  // Place constraints on display cells (using findRegions to get display cells)
  const regionMap = findRegions(board);
  const seen = new Set<string>();
  for (const [, info] of regionMap) {
    const regionKey = `${info.displayCell[0]}-${info.displayCell[1]}`;
    if (seen.has(regionKey)) continue;
    seen.add(regionKey);

    // Find the region ID for this display cell
    const [dr, dc] = info.displayCell;
    const rid = cellToRegion.get(cellIndex(dr, dc))!;
    const constraint = regionConstraints.get(rid);
    if (constraint) {
      board[dr][dc].constraint = constraint;
    }
  }

  // Build solution placements from slots + dominoes
  const solutionPlacements: PlacedDomino[] = slots.map((slot, i) => ({
    domino: dominoes[i],
    row: slot.r1,
    col: slot.c1,
    orientation: (slot.r1 === slot.r2 ? 'horizontal' : 'vertical') as DominoOrientation,
  }));

  return { board, solutionDominoes: dominoes, solutionPlacements };
}

// ── Legacy export for edit page ──────────────────────────────────

/**
 * Generate a random puzzle board with colored regions.
 * Used by the edit page.
 */
export function generateRandomPuzzle(withConstraints = false): BoardState {
  if (withConstraints) {
    return generatePuzzle().board;
  }

  const board: BoardState = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, (): CellState => ({
      regionColor: null,
      constraint: null,
    }))
  );

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const neighbors: RegionColor[] = [];
      if (r > 0 && board[r - 1][c].regionColor) neighbors.push(board[r - 1][c].regionColor!);
      if (c > 0 && board[r][c - 1].regionColor) neighbors.push(board[r][c - 1].regionColor!);

      if (neighbors.length > 0 && Math.random() < 0.4) {
        board[r][c].regionColor = neighbors[Math.floor(Math.random() * neighbors.length)];
      } else {
        board[r][c].regionColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      }
    }
  }

  return board;
}
