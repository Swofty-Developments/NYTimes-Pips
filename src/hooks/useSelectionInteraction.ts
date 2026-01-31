import { useState, useCallback, useRef } from 'react';
import { DominoLocation, DominoOrientation } from '@/types';

export interface SelectionState {
  dominoId: string;
  originalRotation: number;
  /** Cumulative rotation in degrees (always increases: 0, 90, 180, 270, 360, 450, ...) */
  currentRotation: number;
  originalLocation: DominoLocation;
}

export interface UseSelectionInteractionReturn {
  selection: SelectionState | null;
  handleDominoClick: (dominoId: string, location: DominoLocation, initialRotation?: number) => void;
  clearSelection: () => SelectionState | null;
  setDragOccurred: () => void;
  /** Check and consume the drag-occurred flag. Returns true if a drag just ended. */
  consumeDragOccurred: () => boolean;
  getEffectiveOrientation: (dominoId: string, fallback?: DominoOrientation) => DominoOrientation;
  getRotationSteps: (dominoId: string) => number;
}

export function useSelectionInteraction(): UseSelectionInteractionReturn {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const dragOccurredRef = useRef(false);

  const setDragOccurred = useCallback(() => {
    dragOccurredRef.current = true;
  }, []);

  const consumeDragOccurred = useCallback((): boolean => {
    if (dragOccurredRef.current) {
      dragOccurredRef.current = false;
      return true;
    }
    return false;
  }, []);

  const clearSelection = useCallback((): SelectionState | null => {
    let prev: SelectionState | null = null;
    setSelection((current) => {
      prev = current;
      return null;
    });
    return prev;
  }, []);

  const handleDominoClick = useCallback(
    (dominoId: string, location: DominoLocation, initialRotation?: number) => {
      // If a drag just happened, suppress the click
      if (dragOccurredRef.current) {
        dragOccurredRef.current = false;
        return;
      }

      setSelection((prev) => {
        if (prev && prev.dominoId === dominoId) {
          // Same domino: rotate — always increment by 90 so CSS transition never reverses
          return {
            ...prev,
            currentRotation: prev.currentRotation + 1,
          };
        }
        // Different domino or no selection: select new
        const rot = initialRotation ?? 0;
        return {
          dominoId,
          originalRotation: rot,
          currentRotation: rot,
          originalLocation: location,
        };
      });
    },
    []
  );

  const getEffectiveOrientation = useCallback(
    (dominoId: string, fallback: DominoOrientation = 'horizontal'): DominoOrientation => {
      if (selection && selection.dominoId === dominoId) {
        return selection.currentRotation % 2 === 0 ? 'horizontal' : 'vertical';
      }
      return fallback;
    },
    [selection]
  );

  const getRotationSteps = useCallback(
    (dominoId: string): number => {
      if (selection && selection.dominoId === dominoId) {
        return selection.currentRotation;
      }
      return 0;
    },
    [selection]
  );

  return {
    selection,
    handleDominoClick,
    clearSelection,
    setDragOccurred,
    consumeDragOccurred,
    getEffectiveOrientation,
    getRotationSteps,
  };
}
