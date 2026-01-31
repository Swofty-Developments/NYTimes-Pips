// ── Region Colors ──────────────────────────────────────────────
export type RegionColor = 'orange' | 'blue' | 'pink' | 'teal' | 'purple' | 'green';

// ── Constraint Symbols (SVG-based) ─────────────────────────────
export type ConstraintSymbol = 'equal' | 'notEqual';

// ── Constraint (what appears in the diamond label) ─────────────
export type Constraint =
  | { type: 'symbol'; value: ConstraintSymbol }
  | { type: 'text'; value: string };

// ── Region Theme ───────────────────────────────────────────────
export interface RegionTheme {
  background: string;
  stroke: string;
  fill: string;
}

// ── Cell Props ─────────────────────────────────────────────────
export interface BoardCellProps {
  regionColor: RegionColor;
  /** Constraint to show (only on the display cell of the region) */
  constraint?: Constraint;
  /** Which borders to remove (true = remove that side) */
  removeBorders?: BorderFlags;
  /** Inside corners that need rounded notches */
  insideCorners?: { topLeft: boolean; topRight: boolean; bottomRight: boolean; bottomLeft: boolean };
  onClick?: () => void;
  onConstraintClick?: (e: React.MouseEvent) => void;
  isEditing?: boolean;
}

// ── Board State ────────────────────────────────────────────────
export interface CellState {
  regionColor: RegionColor | null;
  constraint: Constraint | null;
  isFoundation: boolean;
}

export type BoardState = CellState[][];

// ── Border Flags (which borders to remove for merged regions) ──
export interface BorderFlags {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

// ── Editor Tool ────────────────────────────────────────────────
export type EditorTool = 'foundation' | 'paint' | 'constraint' | 'erase';

// ── Domino Types ──────────────────────────────────────────────
export type DominoOrientation = 'horizontal' | 'vertical';

export type DotPosition =
  | 'top-left'
  | 'top-right'
  | 'middle-left'
  | 'middle'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-right';

export interface Domino {
  id: string;
  first: number;
  second: number;
}

export interface PlacedDomino {
  domino: Domino;
  orientation: DominoOrientation;
  row: number;
  col: number;
}

export type DominoHalf = 'first' | 'second';

// ── Domino Interaction ──────────────────────────────────────────
export type DominoLocation =
  | { area: 'deck' }
  | { area: 'board'; row: number; col: number; orientation: DominoOrientation; half?: DominoHalf };
