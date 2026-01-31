import { useCallback, useEffect, useRef, useState } from 'react';
import { Domino, DominoHalf, DominoLocation, DominoOrientation, PlacedDomino } from '@/types';
import { useSelectionInteraction, SelectionState } from './useSelectionInteraction';
import { useDominoDragDrop, DragState, DropTarget } from './useDominoDragDrop';

interface UseDominoInteractionOptions {
  allDominoes: Domino[];
  placedDominoes: PlacedDomino[];
  onPlacedDominoesChange: (updater: (prev: PlacedDomino[]) => PlacedDomino[]) => void;
}

interface UseDominoInteractionReturn {
  // Selection
  selection: SelectionState | null;
  handleDominoClick: (dominoId: string, location: DominoLocation) => void;
  clearSelection: () => void;
  getRotationSteps: (dominoId: string) => number;
  getEffectiveOrientation: (dominoId: string, fallback?: DominoOrientation) => DominoOrientation;
  // Drag
  dragState: DragState | null;
  dropTarget: DropTarget | null;
  handlePointerDown: (dominoId: string, location: DominoLocation, e: React.PointerEvent) => void;
  boardCellRef: (row: number, col: number, el: HTMLElement | null) => void;
  // Drag source tracking
  dragSourceId: string | null;
  /** The domino that was lifted from the board (for floating piece + ghost rendering) */
  liftedPlacement: PlacedDomino | null;
}

export function useDominoInteraction({
  allDominoes,
  placedDominoes,
  onPlacedDominoesChange,
}: UseDominoInteractionOptions): UseDominoInteractionReturn {
  const dominoMapRef = useRef(new Map<string, Domino>());

  // Keep domino lookup map in sync
  useEffect(() => {
    const map = new Map<string, Domino>();
    for (const d of allDominoes) {
      map.set(d.id, d);
    }
    dominoMapRef.current = map;
  }, [allDominoes]);

  const findDomino = useCallback((id: string): Domino | undefined => {
    return dominoMapRef.current.get(id);
  }, []);

  // Store original placement for board dominoes that get lifted.
  // State so React re-renders when a domino is lifted/restored.
  const [liftedPlacement, setLiftedPlacement] = useState<PlacedDomino | null>(null);
  // Also keep a ref in sync for use inside callbacks that shouldn't depend on state
  const liftedPlacementRef = useRef<PlacedDomino | null>(null);

  const setLifted = useCallback((val: PlacedDomino | null) => {
    liftedPlacementRef.current = val;
    setLiftedPlacement(val);
  }, []);

  const selection = useSelectionInteraction();

  // When selection changes to a different domino, restore the old one
  const prevSelectionRef = useRef<SelectionState | null>(null);

  const restoreLiftedDomino = useCallback(() => {
    const lifted = liftedPlacementRef.current;
    if (lifted) {
      onPlacedDominoesChange((prev) => [...prev, lifted]);
      setLifted(null);
    }
  }, [onPlacedDominoesChange]);

  const liftDomino = useCallback(
    (dominoId: string) => {
      const placed = placedDominoes.find((p) => p.domino.id === dominoId);
      if (placed) {
        setLifted(placed);
      }
      onPlacedDominoesChange((prev) => prev.filter((p) => p.domino.id !== dominoId));
    },
    [placedDominoes, onPlacedDominoesChange]
  );

  // Compute initial rotation steps for a board domino based on its placed state.
  // Orientation gives us step 0 (horizontal) or 1 (vertical).
  // Pip swap (comparing placed pips to original deck pips) adds +2 for steps 2/3.
  const computeBoardRotation = useCallback(
    (placed: PlacedDomino): number => {
      const original = findDomino(placed.domino.id);
      const isVertical = placed.orientation === 'vertical' ? 1 : 0;
      // Check if pips were swapped on placement
      const pipsSwapped = original
        ? placed.domino.first === original.second && placed.domino.second === original.first && original.first !== original.second
        : false;
      return pipsSwapped ? isVertical + 2 : isVertical;
    },
    [findDomino]
  );

  // Click handler — board dominoes get lifted on first click (same as deck select)
  const handleDominoClick = useCallback(
    (dominoId: string, location: DominoLocation) => {
      const prev = prevSelectionRef.current;

      // If clicking a different domino, restore the previously lifted one
      if (prev && prev.dominoId !== dominoId) {
        restoreLiftedDomino();
      }

      let initialRotation: number | undefined;

      // If selecting a new board domino, lift it
      if ((!prev || prev.dominoId !== dominoId) && location.area === 'board') {
        const placed = placedDominoes.find((p) => p.domino.id === dominoId);
        if (placed) {
          initialRotation = computeBoardRotation(placed);
          setLifted(placed);
          onPlacedDominoesChange((prev) => prev.filter((p) => p.domino.id !== dominoId));
        }
      }

      selection.handleDominoClick(dominoId, location, initialRotation);
    },
    [selection, restoreLiftedDomino, placedDominoes, onPlacedDominoesChange, setLifted, computeBoardRotation]
  );

  // Track selection changes
  useEffect(() => {
    prevSelectionRef.current = selection.selection;
  }, [selection.selection]);

  // Clear selection — restore lifted board domino to its original spot
  const clearSelection = useCallback(() => {
    restoreLiftedDomino();
    selection.clearSelection();
  }, [selection, restoreLiftedDomino]);

  // Drag-drop hooks
  const onDragPlace = useCallback(
    (placement: PlacedDomino, rotationSteps: number) => {
      const dominoId = placement.domino.id;
      // Always start from the original deck domino and apply rotation-based pip swap
      const original = findDomino(dominoId);
      if (!original) return;
      const mod = ((rotationSteps % 4) + 4) % 4;
      const shouldSwap = mod === 2 || mod === 3;
      const placedDomino = shouldSwap
        ? { ...original, first: original.second, second: original.first }
        : original;

      onPlacedDominoesChange((prev) => [
        ...prev,
        { ...placement, domino: placedDomino },
      ]);
      setLifted(null);
      selection.clearSelection();
      // Clear stale drag-occurred flag after the browser's click event has had a chance to fire
      setTimeout(() => selection.consumeDragOccurred(), 0);
    },
    [findDomino, onPlacedDominoesChange, selection]
  );

  const onDragLift = useCallback(
    (dominoId: string) => {
      // Only lift if not already lifted (board click already lifts)
      if (liftedPlacementRef.current?.domino.id === dominoId) return;
      liftDomino(dominoId);
    },
    [liftDomino]
  );

  const onDragRestore = useCallback(
    (dominoId: string, location: DominoLocation) => {
      // On failed drag, restore to original board location
      if (location.area === 'board') {
        const lifted = liftedPlacementRef.current;
        if (lifted && lifted.domino.id === dominoId) {
          onPlacedDominoesChange((prev) => [...prev, lifted]);
          setLifted(null);
          selection.clearSelection();
          setTimeout(() => selection.consumeDragOccurred(), 0);
          return;
        }
      }
      // Deck source — just clear selection, domino stays in deck
      selection.clearSelection();
      // Clear stale drag-occurred flag after the browser's click event has had a chance to fire
      setTimeout(() => selection.consumeDragOccurred(), 0);
    },
    [onPlacedDominoesChange, selection]
  );

  // Orientation/rotation getters that fall back to placed domino data
  // when the selection system doesn't have info (e.g. direct drag without click)
  const getOrientationWithFallback = useCallback(
    (id: string): DominoOrientation => {
      // If selection knows about this domino, use it
      if (selection.selection?.dominoId === id) {
        return selection.getEffectiveOrientation(id);
      }
      // Fall back to placed domino orientation
      const placed = placedDominoes.find((p) => p.domino.id === id);
      if (placed) return placed.orientation;
      // Fall back to lifted placement
      const lifted = liftedPlacementRef.current;
      if (lifted && lifted.domino.id === id) return lifted.orientation;
      return 'horizontal';
    },
    [selection, placedDominoes]
  );

  const getRotationStepsWithFallback = useCallback(
    (id: string): number => {
      // If selection knows about this domino, use it
      if (selection.selection?.dominoId === id) {
        return selection.getRotationSteps(id);
      }
      // Fall back to placed domino — compute rotation from orientation + pip swap
      const placed = placedDominoes.find((p) => p.domino.id === id);
      if (placed) return computeBoardRotation(placed);
      const lifted = liftedPlacementRef.current;
      if (lifted && lifted.domino.id === id) return computeBoardRotation(lifted);
      return 0;
    },
    [selection, placedDominoes, computeBoardRotation]
  );

  const dragDrop = useDominoDragDrop({
    placedDominoes,
    onPlace: onDragPlace,
    onLift: onDragLift,
    onRestore: onDragRestore,
    setDragOccurred: selection.setDragOccurred,
    getOrientation: getOrientationWithFallback,
    getRotationSteps: getRotationStepsWithFallback,
  });

  // Attach page-level pointer listeners
  useEffect(() => {
    const onMove = dragDrop.handlePointerMove;
    const onUp = dragDrop.handlePointerUp;

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragDrop.handlePointerMove, dragDrop.handlePointerUp]);

  return {
    selection: selection.selection,
    handleDominoClick,
    clearSelection,
    getRotationSteps: selection.getRotationSteps,
    getEffectiveOrientation: selection.getEffectiveOrientation,
    dragState: dragDrop.dragState,
    dropTarget: dragDrop.dropTarget,
    handlePointerDown: dragDrop.handlePointerDown,
    boardCellRef: dragDrop.boardCellRef,
    dragSourceId: dragDrop.dragState?.dominoId ?? null,
    liftedPlacement,
  };
}
