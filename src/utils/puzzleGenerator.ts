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

function growRegions(): Map<number, number> {
  // Each cell starts as its own region — domino halves can be in different regions
  const uf = new UnionFind(ROWS * COLS);

  // Collect all adjacent cell edges
  const edges: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = cellIndex(r, c);
      if (c + 1 < COLS) edges.push([idx, cellIndex(r, c + 1)]);
      if (r + 1 < ROWS) edges.push([idx, cellIndex(r + 1, c)]);
    }
  }

  // Shuffle and selectively merge — cap at 5 cells, allow odd sizes
  const MAX_REGION = 5;
  for (const [a, b] of shuffle(edges)) {
    const ra = uf.find(a), rb = uf.find(b);
    if (ra === rb) continue;
    const combined = uf.getSize(ra) + uf.getSize(rb);
    if (combined > MAX_REGION) continue;
    // Always merge single cells to avoid 24 tiny 1-cell regions
    if (uf.getSize(ra) === 1 || uf.getSize(rb) === 1) {
      uf.union(a, b);
      continue;
    }
    // Skip ~30% of other merges for variety
    if (Math.random() < 0.3) continue;
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
  // Compute pip values per cell + track which slot (domino) covers each cell
  const cellPips = new Map<number, number>();
  const cellDomino = new Map<number, number>(); // cell index → slot index
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const domino = dominoes[i];
    cellPips.set(cellIndex(slot.r1, slot.c1), domino.first);
    cellPips.set(cellIndex(slot.r2, slot.c2), domino.second);
    cellDomino.set(cellIndex(slot.r1, slot.c1), i);
    cellDomino.set(cellIndex(slot.r2, slot.c2), i);
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

    // Check if all pip values in the region are the same
    const allPips = cells.map((ci) => cellPips.get(ci) ?? 0);
    const allEqual = allPips.every((v) => v === allPips[0]);

    // For equals: require cells from at least 2 different dominoes,
    // and region must be larger than 2 if a double domino is involved
    if (allEqual && cells.length >= 2) {
      const dominoIds = new Set(cells.map((ci) => cellDomino.get(ci)!));
      const hasDouble = cells.some((ci) => {
        const si = cellDomino.get(ci)!;
        return dominoes[si].first === dominoes[si].second;
      });
      // Only use equals if cells come from multiple dominoes,
      // and if a double is involved, region must be > 2 cells
      if (dominoIds.size >= 2 && (!hasDouble || cells.length > 2)) {
        constraints.set(rid, { type: 'symbol', value: 'equal' });
        continue;
      }
    }

    // For 2-cell regions with same pips from one domino (double), use sum instead
    // No standalone notEqual — just use sum/inequality for all non-equal regions

    // ~15% chance for a sum-based inequality, otherwise exact sum
    const midpoint = cells.length * 3;
    if (Math.random() < 0.15) {
      const margin = 1 + Math.floor(Math.random() * 3);
      if (pipSum < midpoint) {
        constraints.set(rid, { type: 'text', value: `<${pipSum + margin}` });
      } else {
        constraints.set(rid, { type: 'text', value: `>${pipSum - margin}` });
      }
      continue;
    }

    constraints.set(rid, { type: 'text', value: String(pipSum) });
  }

  return constraints;
}

// ── Post-processing: nudge regions toward equal pips ─────────────

function nudgeEqualRegions(
  slots: TilingSlot[],
  dominoes: Domino[],
  cellToRegion: Map<number, number>,
): void {
  // Map cell index → which slot covers it and which half ('first' or 'second')
  const cellSlot = new Map<number, { slotIdx: number; half: 'first' | 'second' }>();
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    cellSlot.set(cellIndex(s.r1, s.c1), { slotIdx: i, half: 'first' });
    cellSlot.set(cellIndex(s.r2, s.c2), { slotIdx: i, half: 'second' });
  }

  // Group cells by region
  const regionCells = new Map<number, number[]>();
  for (let i = 0; i < ROWS * COLS; i++) {
    const rid = cellToRegion.get(i)!;
    if (!regionCells.has(rid)) regionCells.set(rid, []);
    regionCells.get(rid)!.push(i);
  }

  // Try to make several regions all-equal by flipping domino orientations
  // Prioritize larger regions first (more impressive equals), then smaller
  const regions = shuffle([...regionCells.entries()].filter(([, c]) => c.length >= 2 && c.length <= 5))
    .sort((a, b) => b[1].length - a[1].length);
  let nudged = 0;

  for (const [, cells] of regions) {
    if (nudged >= 4) break;

    // For each pip value 0-6 (shuffled), check if we can flip dominoes so every
    // cell in this region shows that pip value
    for (const targetPip of shuffle([0, 1, 2, 3, 4, 5, 6])) {
      let possible = true;

      // Collect which slots need flipping
      const flips: { slotIdx: number; needSwap: boolean }[] = [];
      for (const ci of cells) {
        const info = cellSlot.get(ci);
        if (!info) { possible = false; break; }
        const d = dominoes[info.slotIdx];
        const currentPip = info.half === 'first' ? d.first : d.second;
        const otherPip = info.half === 'first' ? d.second : d.first;

        if (currentPip === targetPip) {
          // Already correct
          flips.push({ slotIdx: info.slotIdx, needSwap: false });
        } else if (otherPip === targetPip) {
          // Need to flip this domino
          flips.push({ slotIdx: info.slotIdx, needSwap: true });
        } else {
          // Neither half has the target pip — impossible for this target
          possible = false;
          break;
        }
      }

      if (!possible) continue;

      // Check that flipping won't break another region's constraint
      // (we haven't assigned constraints yet, so flipping is safe)
      // Apply the flips
      for (const { slotIdx, needSwap } of flips) {
        if (needSwap) {
          const d = dominoes[slotIdx];
          dominoes[slotIdx] = { ...d, first: d.second, second: d.first };
        }
      }

      nudged++;
      break; // Move on to next region
    }
  }
}

// ── Main Generator ───────────────────────────────────────────────

export function generatePuzzle(): GeneratedPuzzle {
  // Stage 1: Random tiling
  const slots = generateRandomTiling();

  // Stage 2: Assign dominoes
  const dominoes = assignDominoes(slots);

  // Stage 3: Region growing
  const cellToRegion = growRegions();

  // Post-process: try to create equal-pip regions by flipping domino orientations
  // For each region, check if flipping some dominoes can make all cell pips equal
  nudgeEqualRegions(slots, dominoes, cellToRegion);

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
