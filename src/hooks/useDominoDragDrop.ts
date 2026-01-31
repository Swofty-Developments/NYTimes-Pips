import { useState, useCallback, useRef } from 'react';
import { DominoLocation, DominoOrientation, DominoHalf, PlacedDomino } from '@/types';
import { BOARD } from '@/constants';

export interface DropTarget {
  row: number;
  col: number;
  orientation: DominoOrientation;
}

export interface DragState {
  dominoId: string;
  sourceLocation: DominoLocation;
  currentPos: { x: number; y: number };
  /** Which half of the domino the user grabbed */
  grabbedHalf: DominoHalf;
  /** Snapshotted at drag start so they can't change mid-drag */
  orientation: DominoOrientation;
  rotationSteps: number;
}

interface PointerStart {
  dominoId: string;
  location: DominoLocation;
  startX: number;
  startY: number;
  pointerId: number;
  /** Offset from pointer to the domino element's top-left, for half detection */
  offsetInElement: { x: number; y: number };
  /** Snapshotted at pointerDown when selection is guaranteed active */
  orientation: DominoOrientation;
  rotationSteps: number;
}

const DRAG_THRESHOLD = 5;

export interface UseDominoDragDropOptions {
  placedDominoes: PlacedDomino[];
  onPlace: (placement: PlacedDomino, rotationSteps: number) => void;
  onLift: (dominoId: string) => void;
  onRestore: (dominoId: string, location: DominoLocation) => void;
  setDragOccurred: () => void;
  getOrientation: (dominoId: string) => DominoOrientation;
  getRotationSteps: (dominoId: string) => number;
}

export interface UseDominoDragDropReturn {
  dragState: DragState | null;
  dropTarget: DropTarget | null;
  handlePointerDown: (dominoId: string, location: DominoLocation, e: React.PointerEvent) => void;
  handlePointerMove: (e: PointerEvent) => void;
  handlePointerUp: (e: PointerEvent) => void;
  boardCellRef: (row: number, col: number, el: HTMLElement | null) => void;
}

export function useDominoDragDrop({
  placedDominoes,
  onPlace,
  onLift,
  onRestore,
  setDragOccurred,
  getOrientation,
  getRotationSteps,
}: UseDominoDragDropOptions): UseDominoDragDropReturn {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const pointerStartRef = useRef<PointerStart | null>(null);
  const isDraggingRef = useRef(false);
  const cellRefsMap = useRef(new Map<string, HTMLElement>());
  const liftedRef = useRef(false);
  const grabbedHalfRef = useRef<DominoHalf>('first');
  // Snapshot orientation/rotation at drag start so they can't change mid-drag
  const dragOrientationRef = useRef<DominoOrientation>('horizontal');
  const dragRotationStepsRef = useRef(0);

  // Track which cells are occupied
  const getOccupiedCells = useCallback((): Set<string> => {
    const occupied = new Set<string>();
    for (const p of placedDominoes) {
      occupied.add(`${p.row}-${p.col}`);
      if (p.orientation === 'horizontal') {
        occupied.add(`${p.row}-${p.col + 1}`);
      } else {
        occupied.add(`${p.row + 1}-${p.col}`);
      }
    }
    return occupied;
  }, [placedDominoes]);

  const isValidPlacement = useCallback(
    (row: number, col: number, orientation: DominoOrientation): boolean => {
      const occupied = getOccupiedCells();
      const { rows, cols } = BOARD;

      if (row < 0 || row >= rows || col < 0 || col >= cols) return false;
      if (occupied.has(`${row}-${col}`)) return false;

      if (orientation === 'horizontal') {
        if (col + 1 >= cols) return false;
        if (occupied.has(`${row}-${col + 1}`)) return false;
      } else {
        if (row + 1 >= rows) return false;
        if (occupied.has(`${row + 1}-${col}`)) return false;
      }
      return true;
    },
    [getOccupiedCells]
  );

  const hitTestBoardCell = useCallback(
    (clientX: number, clientY: number): { row: number; col: number; element: HTMLElement } | null => {
      for (const [key, el] of cellRefsMap.current) {
        const rect = el.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          const [rowStr, colStr] = key.split('-');
          return { row: parseInt(rowStr), col: parseInt(colStr), element: el };
        }
      }
      return null;
    },
    []
  );

  const boardCellRef = useCallback((row: number, col: number, el: HTMLElement | null) => {
    const key = `${row}-${col}`;
    if (el) {
      cellRefsMap.current.set(key, el);
    } else {
      cellRefsMap.current.delete(key);
    }
  }, []);

  /**
   * Determine which half was grabbed based on pointer position within the element.
   * The domino is always laid out horizontally internally (first=left, second=right),
   * then CSS-rotated by rotationSteps * 90°. We need to figure out which visual half
   * the pointer hit in the rotated coordinate space.
   */
  const detectGrabbedHalf = useCallback(
    (dominoId: string, offsetX: number, offsetY: number, element: HTMLElement): DominoHalf => {
      const rect = element.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      // Normalise to 0..1
      const nx = offsetX / w;
      const ny = offsetY / h;

      const steps = ((getRotationSteps(dominoId) % 4) + 4) % 4;

      // The internal layout is always horizontal: first=left, second=right.
      // CSS rotation rotates the whole thing, so we need to map back:
      //   step 0 (0°):   left half = first
      //   step 1 (90°):  top half = first (because left rotated CW becomes top)
      //   step 2 (180°): right half = first (left flipped)
      //   step 3 (270°): bottom half = first
      switch (steps) {
        case 0:
          return nx < 0.5 ? 'first' : 'second';
        case 1:
          return ny < 0.5 ? 'first' : 'second';
        case 2:
          return nx >= 0.5 ? 'first' : 'second';
        case 3:
          return ny >= 0.5 ? 'first' : 'second';
        default:
          return 'first';
      }
    },
    [getRotationSteps]
  );

  /**
   * Given the board cell the cursor is over and which half was grabbed,
   * compute the anchor cell (top-left of the domino placement).
   * The grabbed half should go on the hovered cell; the other half extends out.
   */
  const computeAnchor = useCallback(
    (hitRow: number, hitCol: number, orientation: DominoOrientation, grabbedHalf: DominoHalf, rotationSteps: number): { row: number; col: number } => {
      const steps = ((rotationSteps % 4) + 4) % 4;
      // grabbedHalf is pip-identity ('first'/'second' referring to original deck pips).
      // At rotation steps 2/3, pips are swapped at placement time, so the pip-identity
      // 'first' half ends up in the extending cell instead of the anchor cell.
      const swapped = steps === 2 || steps === 3;
      // Is the grabbed half the one that goes in the anchor cell (top-left)?
      const grabbedIsAnchor = (grabbedHalf === 'first') !== swapped;

      if (grabbedIsAnchor) {
        return { row: hitRow, col: hitCol };
      } else {
        if (orientation === 'horizontal') {
          return { row: hitRow, col: hitCol - 1 };
        } else {
          return { row: hitRow - 1, col: hitCol };
        }
      }
    },
    []
  );

  const handlePointerDown = useCallback(
    (dominoId: string, location: DominoLocation, e: React.PointerEvent) => {
      // Only handle primary button
      if (e.button !== 0) return;
      e.stopPropagation();

      // Compute offset within the currentTarget (DominoPiece wrapper or board overlay)
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();

      pointerStartRef.current = {
        dominoId,
        location,
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        offsetInElement: {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        },
        orientation: getOrientation(dominoId),
        rotationSteps: getRotationSteps(dominoId),
      };
      isDraggingRef.current = false;
      liftedRef.current = false;
    },
    [getOrientation, getRotationSteps]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;

      const dx = e.clientX - start.startX;
      const dy = e.clientY - start.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (!isDraggingRef.current && distance >= DRAG_THRESHOLD) {
        // Enter drag mode
        isDraggingRef.current = true;
        setDragOccurred();

        // If source is board, lift it (remove from placedDominoes)
        if (start.location.area === 'board' && !liftedRef.current) {
          onLift(start.dominoId);
          liftedRef.current = true;
        }

        // Detect which half was grabbed (always as pip-identity, not positional)
        let grabbedHalf: DominoHalf = 'first';
        const steps = ((start.rotationSteps % 4) + 4) % 4;
        if (start.location.area === 'board' && start.location.half) {
          // Board overlays give us positional half (first=anchor cell, second=extending cell).
          // Convert to pip-identity: at rotation steps 2/3 the pips are swapped relative to position.
          const swapped = steps === 2 || steps === 3;
          grabbedHalf = swapped
            ? (start.location.half === 'first' ? 'second' : 'first')
            : start.location.half;
        } else {
          // Deck or floating lifted piece: detect from pointer position + rotation
          const target = document.elementFromPoint(start.startX, start.startY) as HTMLElement | null;
          let pieceEl = target;
          while (pieceEl && pieceEl.dataset.rotationMod === undefined && pieceEl.parentElement) {
            pieceEl = pieceEl.parentElement;
          }
          if (pieceEl) {
            grabbedHalf = detectGrabbedHalf(start.dominoId, start.offsetInElement.x, start.offsetInElement.y, pieceEl);
          }
        }

        grabbedHalfRef.current = grabbedHalf;
        dragOrientationRef.current = start.orientation;
        dragRotationStepsRef.current = start.rotationSteps;
        setDragState({
          dominoId: start.dominoId,
          sourceLocation: start.location,
          currentPos: { x: e.clientX, y: e.clientY },
          grabbedHalf,
          orientation: dragOrientationRef.current,
          rotationSteps: dragRotationStepsRef.current,
        });
      }

      if (isDraggingRef.current) {
        setDragState((prev) =>
          prev ? { ...prev, currentPos: { x: e.clientX, y: e.clientY } } : null
        );

        // Hit test board cells — anchor placement based on grabbed half
        const hit = hitTestBoardCell(e.clientX, e.clientY);
        if (hit) {
          const orientation = dragOrientationRef.current;
          const grabbedHalf = grabbedHalfRef.current;
          const anchor = computeAnchor(hit.row, hit.col, orientation, grabbedHalf, dragRotationStepsRef.current);
          if (isValidPlacement(anchor.row, anchor.col, orientation)) {
            setDropTarget({ row: anchor.row, col: anchor.col, orientation });
          } else {
            setDropTarget(null);
          }
        } else {
          setDropTarget(null);
        }
      }
    },
    [setDragOccurred, onLift, hitTestBoardCell, isValidPlacement, detectGrabbedHalf, computeAnchor]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;

      if (isDraggingRef.current) {
        // Try to place using the snapshotted orientation, anchored on grabbed half
        const hit = hitTestBoardCell(e.clientX, e.clientY);
        const orientation = dragOrientationRef.current;
        const grabbedHalf = grabbedHalfRef.current;
        if (hit) {
          const anchor = computeAnchor(hit.row, hit.col, orientation, grabbedHalf, dragRotationStepsRef.current);
          if (isValidPlacement(anchor.row, anchor.col, orientation)) {
            onPlace({
              domino: { id: start.dominoId, first: 0, second: 0 },
              orientation,
              row: anchor.row,
              col: anchor.col,
            }, dragRotationStepsRef.current);
          } else {
            onRestore(start.dominoId, start.location);
          }
        } else {
          onRestore(start.dominoId, start.location);
        }
      }

      pointerStartRef.current = null;
      isDraggingRef.current = false;
      liftedRef.current = false;
      setDragState(null);
      setDropTarget(null);
    },
    [hitTestBoardCell, isValidPlacement, onPlace, onRestore, computeAnchor]
  );

  return {
    dragState,
    dropTarget,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    boardCellRef,
  };
}
