import { BoardState, CellState, RegionColor, Constraint, Domino, PlacedDomino, DominoOrientation } from '@/types';
import { WORK_GRID } from '@/constants';
import { findRegions } from '@/utils/regions';

const COLORS: RegionColor[] = ['orange', 'blue', 'pink', 'teal', 'purple', 'green'];

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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Foundation Shape Generation ─────────────────────────────────

const GRID_ROWS = WORK_GRID.rows;
const GRID_COLS = WORK_GRID.cols;

/** Hardcoded pixel-art templates for recognizable shapes. Each is a string[] where '#' = foundation.
 *  They get placed centered on the work grid. Must have even cell count. */
const SHAPE_TEMPLATES: string[][] = [
  // Heart
  [
    '.##.##.',
    '#######',
    '#######',
    '.#####.',
    '..###..',
    '...#...',
  ],
  // Plus / cross
  [
    '..##..',
    '..##..',
    '######',
    '######',
    '..##..',
    '..##..',
  ],
  // Diamond
  [
    '..##..',
    '.####.',
    '######',
    '######',
    '.####.',
    '..##..',
  ],
  // T shape
  [
    '######',
    '######',
    '..##..',
    '..##..',
    '..##..',
    '..##..',
  ],
  // U shape
  [
    '##..##',
    '##..##',
    '##..##',
    '######',
    '######',
  ],
  // L shape
  [
    '##....',
    '##....',
    '##....',
    '##....',
    '######',
    '######',
  ],
  // Arrow right
  [
    '..##....',
    '..####..',
    '########',
    '########',
    '..####..',
    '..##....',
  ],
  // H shape
  [
    '##..##',
    '##..##',
    '######',
    '######',
    '##..##',
    '##..##',
  ],
  // Zigzag / S
  [
    '..####',
    '..####',
    '.####.',
    '.####.',
    '####..',
    '####..',
  ],
  // Frame / ring
  [
    '######',
    '##..##',
    '##..##',
    '##..##',
    '######',
  ],
  // Tetris T
  [
    '########',
    '..####..',
    '..####..',
  ],
  // Two islands side by side
  [
    '###.###',
    '###.###',
    '###.###',
    '###.###',
  ],
  // Two islands stacked
  [
    '######',
    '######',
    '......',
    '######',
    '######',
  ],
  // Staircase
  [
    '##......',
    '####....',
    '..####..',
    '....####',
    '......##',
  ],
  // 1 (number)
  [
    '.##.',
    '###.',
    '.##.',
    '.##.',
    '.##.',
    '####',
  ],
  // 7 (number)
  [
    '######',
    '...##.',
    '..##..',
    '.##...',
    '.##...',
    '.##...',
  ],
  // C shape
  [
    '.####.',
    '##..##',
    '##....',
    '##....',
    '##..##',
    '.####.',
  ],
  // X shape
  [
    '##..##',
    '.####.',
    '..##..',
    '.####.',
    '##..##',
  ],
];

/** Parse a template into a list of [row, col] offsets */
function parseTemplate(tmpl: string[]): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < tmpl.length; r++) {
    for (let c = 0; c < tmpl[r].length; c++) {
      if (tmpl[r][c] === '#') cells.push([r, c]);
    }
  }
  return cells;
}

/** Ensure even cell count by removing one random edge cell if odd */
function ensureEven(cells: Set<string>, rows: number, cols: number): void {
  if (cells.size % 2 === 0) return;
  // Find edge cells (cells with fewer than 4 foundation neighbors)
  const edgeCells: string[] = [];
  for (const key of cells) {
    const [r, c] = key.split('-').map(Number);
    let neighbors = 0;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (cells.has(`${r + dr}-${c + dc}`)) neighbors++;
    }
    if (neighbors < 4) edgeCells.push(key);
  }
  // Remove a random edge cell, making sure the shape stays connected
  for (const key of shuffle(edgeCells)) {
    cells.delete(key);
    if (isConnected(cells)) return;
    cells.add(key); // wasn't safe, put it back
  }
  // Fallback: just remove any cell (shouldn't happen with reasonable shapes)
  for (const key of shuffle([...cells])) {
    cells.delete(key);
    if (isConnected(cells)) return;
    cells.add(key);
  }
}

/** BFS connectivity check */
function isConnected(cells: Set<string>): boolean {
  if (cells.size <= 1) return true;
  const start = cells.values().next().value!;
  const visited = new Set<string>();
  const queue = [start];
  visited.add(start);
  while (queue.length > 0) {
    const key = queue.shift()!;
    const [r, c] = key.split('-').map(Number);
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nk = `${r + dr}-${c + dc}`;
      if (cells.has(nk) && !visited.has(nk)) {
        visited.add(nk);
        queue.push(nk);
      }
    }
  }
  return visited.size === cells.size;
}

/** Generate a random blob by growing outward from a seed */
function generateBlob(targetSize: number, rows: number, cols: number, startR: number, startC: number): Set<string> {
  const cells = new Set<string>();
  cells.add(`${startR}-${startC}`);
  const frontier: string[] = [];

  const addFrontier = (r: number, c: number) => {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      const nk = `${nr}-${nc}`;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !cells.has(nk)) {
        frontier.push(nk);
      }
    }
  };
  addFrontier(startR, startC);

  while (cells.size < targetSize && frontier.length > 0) {
    const idx = Math.floor(Math.random() * frontier.length);
    const key = frontier[idx];
    frontier.splice(idx, 1);
    if (cells.has(key)) continue;
    cells.add(key);
    const [r, c] = key.split('-').map(Number);
    addFrontier(r, c);
  }

  return cells;
}

/** Generate a symmetric shape (vertical axis symmetry) */
function generateSymmetric(targetSize: number, rows: number, cols: number): Set<string> {
  const halfCols = Math.ceil(cols / 2);
  const centerR = Math.floor(rows / 2);
  const cells = new Set<string>();

  // Grow one half
  const halfCells = generateBlob(Math.ceil(targetSize / 2), rows, halfCols, centerR, halfCols - 1);

  // Mirror
  for (const key of halfCells) {
    const [r, c] = key.split('-').map(Number);
    cells.add(`${r}-${c}`);
    const mirror = cols - 1 - c;
    cells.add(`${r}-${mirror}`);
  }

  // Trim to target if overshot
  while (cells.size > targetSize) {
    const edgeCells: string[] = [];
    for (const key of cells) {
      const [r, c] = key.split('-').map(Number);
      const mirror = `${r}-${cols - 1 - c}`;
      // Only remove pairs (both + mirror)
      let neighbors = 0;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (cells.has(`${r + dr}-${c + dc}`)) neighbors++;
      }
      if (neighbors < 4 && cells.has(mirror)) edgeCells.push(key);
    }
    if (edgeCells.length === 0) break;
    const key = pick(edgeCells);
    const [r, c] = key.split('-').map(Number);
    const mirror = `${r}-${cols - 1 - c}`;
    cells.delete(key);
    cells.delete(mirror);
    if (!isConnected(cells)) {
      cells.add(key);
      cells.add(mirror);
      break;
    }
  }

  return cells;
}

/** Place a template centered on the grid, return foundation set */
function placeTemplate(tmpl: string[]): Set<string> | null {
  const offsets = parseTemplate(tmpl);
  if (offsets.length === 0) return null;

  const tmplRows = tmpl.length;
  const tmplCols = Math.max(...tmpl.map(r => r.length));
  const startR = Math.floor((GRID_ROWS - tmplRows) / 2);
  const startC = Math.floor((GRID_COLS - tmplCols) / 2);

  const cells = new Set<string>();
  for (const [r, c] of offsets) {
    const gr = startR + r;
    const gc = startC + c;
    if (gr < 0 || gr >= GRID_ROWS || gc < 0 || gc >= GRID_COLS) return null;
    cells.add(`${gr}-${gc}`);
  }

  ensureEven(cells, GRID_ROWS, GRID_COLS);
  return cells;
}

/** Generate a random rectangular foundation */
function generateRect(): Set<string> {
  // Random dimensions: 3–8 rows, 4–10 cols, must be even area
  const shapes = [
    { rows: 4, cols: 6 },  // classic
    { rows: 3, cols: 8 },  // wide
    { rows: 6, cols: 4 },  // tall
    { rows: 5, cols: 6 },  // medium
    { rows: 4, cols: 8 },  // wide medium
    { rows: 6, cols: 6 },  // square-ish
    { rows: 3, cols: 6 },  // small wide
    { rows: 4, cols: 4 },  // small square
    { rows: 6, cols: 8 },  // large
    { rows: 8, cols: 6 },  // tall large
    { rows: 2, cols: 8 },  // very thin wide
    { rows: 8, cols: 4 },  // very thin tall
  ];

  const shape = pick(shapes);
  const startR = Math.floor((GRID_ROWS - shape.rows) / 2);
  const startC = Math.floor((GRID_COLS - shape.cols) / 2);
  const cells = new Set<string>();
  for (let r = 0; r < shape.rows; r++) {
    for (let c = 0; c < shape.cols; c++) {
      cells.add(`${startR + r}-${startC + c}`);
    }
  }
  return cells;
}

/** Top-level: pick a random foundation strategy */
function generateFoundation(): Set<string> {
  const strategy = Math.random();

  if (strategy < 0.25) {
    // Template shape
    const tmpl = pick(SHAPE_TEMPLATES);
    const result = placeTemplate(tmpl);
    if (result && result.size >= 6) return result;
  }

  if (strategy < 0.45) {
    // Symmetric blob
    const target = 16 + Math.floor(Math.random() * 20); // 16–36
    const cells = generateSymmetric(target, GRID_ROWS, GRID_COLS);
    ensureEven(cells, GRID_ROWS, GRID_COLS);
    if (cells.size >= 6 && isConnected(cells)) return cells;
  }

  if (strategy < 0.65) {
    // Random blob
    const target = 14 + Math.floor(Math.random() * 24); // 14–38
    const startR = 1 + Math.floor(Math.random() * (GRID_ROWS - 2));
    const startC = 1 + Math.floor(Math.random() * (GRID_COLS - 2));
    const cells = generateBlob(target, GRID_ROWS, GRID_COLS, startR, startC);
    ensureEven(cells, GRID_ROWS, GRID_COLS);
    if (cells.size >= 6) return cells;
  }

  // Fallback: rectangle
  return generateRect();
}

// ── Foundation-aware helpers ─────────────────────────────────────

/** Build a foundation cell list and index mapping from the set */
function buildFoundationIndex(foundation: Set<string>): {
  cells: [number, number][];
  keyToIdx: Map<string, number>;
  rows: number;
  cols: number;
} {
  // Determine bounding box
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const key of foundation) {
    const [r, c] = key.split('-').map(Number);
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;

  // Build ordered list and index map
  const cells: [number, number][] = [];
  const keyToIdx = new Map<string, number>();
  // Sort by row then col for deterministic ordering
  const sorted = [...foundation].sort((a, b) => {
    const [ar, ac] = a.split('-').map(Number);
    const [br, bc] = b.split('-').map(Number);
    return ar !== br ? ar - br : ac - bc;
  });
  for (const key of sorted) {
    const [r, c] = key.split('-').map(Number);
    keyToIdx.set(key, cells.length);
    cells.push([r, c]);
  }

  return { cells, keyToIdx, rows, cols };
}

// ── Stage 1: Random Tiling on Foundation ─────────────────────────

interface TilingSlot {
  r1: number; c1: number;
  r2: number; c2: number;
}

function generateRandomTiling(foundation: Set<string>): TilingSlot[] | null {
  const filled = new Set<string>();

  // Get sorted foundation cells for deterministic iteration
  const sortedCells = [...foundation].sort((a, b) => {
    const [ar, ac] = a.split('-').map(Number);
    const [br, bc] = b.split('-').map(Number);
    return ar !== br ? ar - br : ac - bc;
  });

  function solve(slots: TilingSlot[]): TilingSlot[] | null {
    // Find first unfilled foundation cell
    for (const key of sortedCells) {
      if (filled.has(key)) continue;
      const [r, c] = key.split('-').map(Number);

      const candidates: TilingSlot[] = [];
      // horizontal
      const rightKey = `${r}-${c + 1}`;
      if (foundation.has(rightKey) && !filled.has(rightKey)) {
        candidates.push({ r1: r, c1: c, r2: r, c2: c + 1 });
      }
      // vertical
      const downKey = `${r + 1}-${c}`;
      if (foundation.has(downKey) && !filled.has(downKey)) {
        candidates.push({ r1: r, c1: c, r2: r + 1, c2: c });
      }

      for (const slot of shuffle(candidates)) {
        const k1 = `${slot.r1}-${slot.c1}`;
        const k2 = `${slot.r2}-${slot.c2}`;
        filled.add(k1);
        filled.add(k2);
        const result = solve([...slots, slot]);
        if (result) return result;
        filled.delete(k1);
        filled.delete(k2);
      }
      return null; // dead end
    }
    return slots; // all filled
  }

  return solve([]);
}

// ── Stage 2: Domino Assignment ───────────────────────────────────

function assignDominoes(slots: TilingSlot[]): Domino[] {
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

      used[p] = true;
      result[idx] = { id: `${a}-${b}`, first: a, second: b };
      if (solve(idx + 1)) return true;

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

// ── Stage 3: Region Growing ─────────────────────────────────────

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

function growRegions(
  foundation: Set<string>,
  keyToIdx: Map<string, number>,
): Map<number, number> {
  const n = keyToIdx.size;
  const uf = new UnionFind(n);

  // Collect edges between adjacent foundation cells
  const edges: [number, number][] = [];
  for (const key of foundation) {
    const [r, c] = key.split('-').map(Number);
    const idx = keyToIdx.get(key)!;
    const rightKey = `${r}-${c + 1}`;
    const downKey = `${r + 1}-${c}`;
    if (keyToIdx.has(rightKey)) edges.push([idx, keyToIdx.get(rightKey)!]);
    if (keyToIdx.has(downKey)) edges.push([idx, keyToIdx.get(downKey)!]);
  }

  const MAX_REGION = 5;
  for (const [a, b] of shuffle(edges)) {
    const ra = uf.find(a), rb = uf.find(b);
    if (ra === rb) continue;
    const combined = uf.getSize(ra) + uf.getSize(rb);
    if (combined > MAX_REGION) continue;
    if (uf.getSize(ra) === 1 || uf.getSize(rb) === 1) {
      uf.union(a, b);
      continue;
    }
    if (Math.random() < 0.3) continue;
    uf.union(a, b);
  }

  const countDistinct = () => {
    const s = new Set<number>();
    for (let i = 0; i < n; i++) s.add(uf.find(i));
    return s.size;
  };

  const maxRegions = Math.max(8, Math.ceil(n / 3));
  while (countDistinct() > maxRegions) {
    const regionCells = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const root = uf.find(i);
      if (!regionCells.has(root)) regionCells.set(root, []);
      regionCells.get(root)!.push(i);
    }
    const sorted = [...regionCells.entries()].sort((a, b) => a[1].length - b[1].length);
    let merged = false;
    for (const [, cells] of sorted) {
      if (merged) break;
      for (const cellIdx of cells) {
        if (merged) break;
        // Find neighbors of this cell in foundation
        const cellKey = [...keyToIdx.entries()].find(([, v]) => v === cellIdx)?.[0];
        if (!cellKey) continue;
        const [r, c] = cellKey.split('-').map(Number);
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nk = `${r + dr}-${c + dc}`;
          const ni = keyToIdx.get(nk);
          if (ni !== undefined && uf.find(cellIdx) !== uf.find(ni)) {
            uf.union(cellIdx, ni);
            merged = true;
            break;
          }
        }
      }
    }
    if (!merged) break;
  }

  const rootToId = new Map<number, number>();
  let nextId = 0;
  const cellToRegion = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    if (!rootToId.has(root)) rootToId.set(root, nextId++);
    cellToRegion.set(i, rootToId.get(root)!);
  }

  return cellToRegion;
}

// ── Graph Coloring ───────────────────────────────────────────────

function colorRegions(
  cellToRegion: Map<number, number>,
  foundation: Set<string>,
  keyToIdx: Map<string, number>,
): Map<number, RegionColor> {
  const regionCount = new Set(cellToRegion.values()).size;
  const adj: Set<number>[] = Array.from({ length: regionCount }, () => new Set());

  for (const key of foundation) {
    const [r, c] = key.split('-').map(Number);
    const idx = keyToIdx.get(key)!;
    const rid = cellToRegion.get(idx)!;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nk = `${r + dr}-${c + dc}`;
      const ni = keyToIdx.get(nk);
      if (ni !== undefined) {
        const nid = cellToRegion.get(ni)!;
        if (nid !== rid) {
          adj[rid].add(nid);
          adj[nid].add(rid);
        }
      }
    }
  }

  const colorAssignment = new Map<number, RegionColor>();
  for (let rid = 0; rid < regionCount; rid++) {
    const usedColors = new Set<RegionColor>();
    for (const neighbor of adj[rid]) {
      const nc = colorAssignment.get(neighbor);
      if (nc) usedColors.add(nc);
    }
    const available = COLORS.filter((c) => !usedColors.has(c));
    colorAssignment.set(rid, available.length > 0 ? pick(available) : COLORS[rid % COLORS.length]);
  }

  return colorAssignment;
}

// ── Constraint Derivation ───────────────────────────────────────

function deriveConstraints(
  slots: TilingSlot[],
  dominoes: Domino[],
  cellToRegion: Map<number, number>,
  keyToIdx: Map<string, number>,
): Map<number, Constraint> {
  const cellPips = new Map<number, number>();
  const cellDomino = new Map<number, number>();
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const domino = dominoes[i];
    const k1 = keyToIdx.get(`${slot.r1}-${slot.c1}`)!;
    const k2 = keyToIdx.get(`${slot.r2}-${slot.c2}`)!;
    cellPips.set(k1, domino.first);
    cellPips.set(k2, domino.second);
    cellDomino.set(k1, i);
    cellDomino.set(k2, i);
  }

  const regionCells = new Map<number, number[]>();
  for (const [idx, rid] of cellToRegion) {
    if (!regionCells.has(rid)) regionCells.set(rid, []);
    regionCells.get(rid)!.push(idx);
  }

  const constraints = new Map<number, Constraint>();

  for (const [rid, cells] of regionCells) {
    const pipSum = cells.reduce((sum, ci) => sum + (cellPips.get(ci) ?? 0), 0);
    const allPips = cells.map((ci) => cellPips.get(ci) ?? 0);
    const allEqual = allPips.every((v) => v === allPips[0]);

    if (allEqual && cells.length >= 2) {
      const dominoIds = new Set(cells.map((ci) => cellDomino.get(ci)!));
      const hasDouble = cells.some((ci) => {
        const si = cellDomino.get(ci)!;
        return dominoes[si].first === dominoes[si].second;
      });
      if (dominoIds.size >= 2 && (!hasDouble || cells.length > 2)) {
        constraints.set(rid, { type: 'symbol', value: 'equal' });
        continue;
      }
    }

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
  keyToIdx: Map<string, number>,
): void {
  const cellSlot = new Map<number, { slotIdx: number; half: 'first' | 'second' }>();
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const k1 = keyToIdx.get(`${s.r1}-${s.c1}`)!;
    const k2 = keyToIdx.get(`${s.r2}-${s.c2}`)!;
    cellSlot.set(k1, { slotIdx: i, half: 'first' });
    cellSlot.set(k2, { slotIdx: i, half: 'second' });
  }

  const regionCells = new Map<number, number[]>();
  for (const [idx, rid] of cellToRegion) {
    if (!regionCells.has(rid)) regionCells.set(rid, []);
    regionCells.get(rid)!.push(idx);
  }

  const regions = shuffle([...regionCells.entries()].filter(([, c]) => c.length >= 2 && c.length <= 5))
    .sort((a, b) => b[1].length - a[1].length);
  let nudged = 0;

  for (const [, cells] of regions) {
    if (nudged >= 4) break;

    for (const targetPip of shuffle([0, 1, 2, 3, 4, 5, 6])) {
      let possible = true;
      const flips: { slotIdx: number; needSwap: boolean }[] = [];
      for (const ci of cells) {
        const info = cellSlot.get(ci);
        if (!info) { possible = false; break; }
        const d = dominoes[info.slotIdx];
        const currentPip = info.half === 'first' ? d.first : d.second;
        const otherPip = info.half === 'first' ? d.second : d.first;

        if (currentPip === targetPip) {
          flips.push({ slotIdx: info.slotIdx, needSwap: false });
        } else if (otherPip === targetPip) {
          flips.push({ slotIdx: info.slotIdx, needSwap: true });
        } else {
          possible = false;
          break;
        }
      }

      if (!possible) continue;

      for (const { slotIdx, needSwap } of flips) {
        if (needSwap) {
          const d = dominoes[slotIdx];
          dominoes[slotIdx] = { ...d, first: d.second, second: d.first };
        }
      }

      nudged++;
      break;
    }
  }
}

// ── Main Generator ───────────────────────────────────────────────

export function generatePuzzle(): GeneratedPuzzle {
  // Try up to a few times in case tiling fails for a particular shape
  for (let attempt = 0; attempt < 10; attempt++) {
    const foundation = generateFoundation();
    const { cells: fCells, keyToIdx } = buildFoundationIndex(foundation);

    // Stage 1: Random tiling on the foundation
    const slots = generateRandomTiling(foundation);
    if (!slots) continue; // shape not tileable, retry

    // Stage 2: Assign dominoes
    const dominoes = assignDominoes(slots);

    // Stage 3: Region growing
    const cellToRegion = growRegions(foundation, keyToIdx);

    // Post-process: nudge equal regions
    nudgeEqualRegions(slots, dominoes, cellToRegion, keyToIdx);

    // Graph color
    const regionColors = colorRegions(cellToRegion, foundation, keyToIdx);

    // Stage 4: Constraints
    const regionConstraints = deriveConstraints(slots, dominoes, cellToRegion, keyToIdx);

    // Build the board on the full work grid
    const board: BoardState = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, (): CellState => ({
        regionColor: null,
        constraint: null,
        isFoundation: false,
      }))
    );

    for (const [r, c] of fCells) {
      const idx = keyToIdx.get(`${r}-${c}`)!;
      const rid = cellToRegion.get(idx)!;
      board[r][c].isFoundation = true;
      board[r][c].regionColor = regionColors.get(rid)!;
    }

    // Place constraints on display cells
    const regionMap = findRegions(board);
    const seen = new Set<string>();
    for (const [, info] of regionMap) {
      const regionKey = `${info.displayCell[0]}-${info.displayCell[1]}`;
      if (seen.has(regionKey)) continue;
      seen.add(regionKey);

      const [dr, dc] = info.displayCell;
      const idx = keyToIdx.get(`${dr}-${dc}`);
      if (idx === undefined) continue;
      const rid = cellToRegion.get(idx)!;
      const constraint = regionConstraints.get(rid);
      if (constraint) {
        board[dr][dc].constraint = constraint;
      }
    }

    // Build solution placements
    const solutionPlacements: PlacedDomino[] = slots.map((slot, i) => ({
      domino: dominoes[i],
      row: slot.r1,
      col: slot.c1,
      orientation: (slot.r1 === slot.r2 ? 'horizontal' : 'vertical') as DominoOrientation,
    }));

    return { board, solutionDominoes: dominoes, solutionPlacements };
  }

  // Ultimate fallback: classic 4×6 rectangle
  return generatePuzzleFallback();
}

function generatePuzzleFallback(): GeneratedPuzzle {
  const rows = 4, cols = 6;
  const foundation = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Center on work grid
      foundation.add(`${Math.floor((GRID_ROWS - rows) / 2) + r}-${Math.floor((GRID_COLS - cols) / 2) + c}`);
    }
  }
  const { cells: fCells, keyToIdx } = buildFoundationIndex(foundation);
  const slots = generateRandomTiling(foundation)!;
  const dominoes = assignDominoes(slots);
  const cellToRegion = growRegions(foundation, keyToIdx);
  nudgeEqualRegions(slots, dominoes, cellToRegion, keyToIdx);
  const regionColors = colorRegions(cellToRegion, foundation, keyToIdx);
  const regionConstraints = deriveConstraints(slots, dominoes, cellToRegion, keyToIdx);

  const board: BoardState = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, (): CellState => ({
      regionColor: null,
      constraint: null,
      isFoundation: false,
    }))
  );

  for (const [r, c] of fCells) {
    const idx = keyToIdx.get(`${r}-${c}`)!;
    const rid = cellToRegion.get(idx)!;
    board[r][c].isFoundation = true;
    board[r][c].regionColor = regionColors.get(rid)!;
  }

  const regionMap = findRegions(board);
  const seen = new Set<string>();
  for (const [, info] of regionMap) {
    const regionKey = `${info.displayCell[0]}-${info.displayCell[1]}`;
    if (seen.has(regionKey)) continue;
    seen.add(regionKey);
    const [dr, dc] = info.displayCell;
    const idx = keyToIdx.get(`${dr}-${dc}`);
    if (idx === undefined) continue;
    const rid = cellToRegion.get(idx)!;
    const constraint = regionConstraints.get(rid);
    if (constraint) board[dr][dc].constraint = constraint;
  }

  const solutionPlacements: PlacedDomino[] = slots.map((slot, i) => ({
    domino: dominoes[i],
    row: slot.r1,
    col: slot.c1,
    orientation: (slot.r1 === slot.r2 ? 'horizontal' : 'vertical') as DominoOrientation,
  }));

  return { board, solutionDominoes: dominoes, solutionPlacements };
}

// ── Legacy export for edit page ──────────────────────────────────

export function generateRandomPuzzle(withConstraints = false): BoardState {
  if (withConstraints) {
    return generatePuzzle().board;
  }

  const board: BoardState = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, (): CellState => ({
      regionColor: null,
      constraint: null,
      isFoundation: true,
    }))
  );

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
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
