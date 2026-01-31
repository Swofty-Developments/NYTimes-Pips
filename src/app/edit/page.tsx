'use client';

import React, { Suspense, useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Board } from '@/components/Board';
import { EditToolbar } from '@/components/EditToolbar';
import { ConstraintPicker } from '@/components/ConstraintPicker';
import { DominoDeck } from '@/components/DominoDeck';
import { DominoPiece } from '@/components/DominoPiece';
import { TopNav } from '@/components/TopNav';
import { ShareButton } from '@/components/ShareButton';
import { BoardState, CellState, RegionColor, EditorTool, Constraint, Domino, PlacedDomino } from '@/types';
import { BOARD, generateFullSet, shuffleDominoes } from '@/constants';
import { findRegions } from '@/utils/regions';
import { useDominoInteraction } from '@/hooks/useDominoInteraction';
import { useContentScale } from '@/hooks/useContentScale';
import { encodePuzzle, decodePuzzle } from '@/utils/puzzleEncoding';

function createEmptyBoard(): BoardState {
  return Array.from({ length: BOARD.rows }, () =>
    Array.from({ length: BOARD.cols }, (): CellState => ({
      regionColor: null,
      constraint: null,
    }))
  );
}

function createInitialDeck(): Domino[] {
  return shuffleDominoes(generateFullSet());
}

export default function EditPage() {
  return (
    <Suspense>
      <EditPageInner />
    </Suspense>
  );
}

function EditPageInner() {
  const searchParams = useSearchParams();
  const puzzleParam = searchParams.get('puzzle');

  const [board, setBoard] = useState<BoardState>(createEmptyBoard);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTool, setActiveTool] = useState<EditorTool>('paint');
  const [selectedColor, setSelectedColor] = useState<RegionColor>('orange');
  const [picker, setPicker] = useState<{
    row: number;
    col: number;
    x: number;
    y: number;
  } | null>(null);
  const [isSharedPuzzle, setIsSharedPuzzle] = useState(false);

  // Domino state
  const [deckDominoes, setDeckDominoes] = useState<Domino[]>(createInitialDeck);
  const [placedDominoes, setPlacedDominoes] = useState<PlacedDomino[]>([]);

  // Load puzzle from URL param
  useEffect(() => {
    if (puzzleParam) {
      try {
        const data = decodePuzzle(puzzleParam);
        setBoard(data.board);
        setPlacedDominoes(data.placedDominoes);
        setIsSharedPuzzle(true);
        setIsEditing(false);
      } catch {
        // Invalid puzzle param, ignore
      }
    }
  }, [puzzleParam]);

  const placedIds = useMemo(
    () => new Set(placedDominoes.map((p) => p.domino.id)),
    [placedDominoes]
  );

  const {
    selection,
    handleDominoClick,
    clearSelection,
    getRotationSteps,
    getEffectiveOrientation,
    dragState,
    dropTarget,
    handlePointerDown,
    boardCellRef,
    dragSourceId,
    liftedPlacement,
  } = useDominoInteraction({
    allDominoes: deckDominoes,
    placedDominoes,
    onPlacedDominoesChange: setPlacedDominoes,
  });

  const handleShuffle = useCallback(() => {
    clearSelection();
    setDeckDominoes(shuffleDominoes(generateFullSet()));
  }, [clearSelection]);

  const regionMap = useMemo(() => findRegions(board), [board]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!isEditing) return;

      if (activeTool === 'constraint') {
        const cell = board[row][col];
        if (!cell.regionColor) return;

        const boardEl = document.querySelector('[data-board]');
        if (boardEl) {
          const rect = boardEl.getBoundingClientRect();
          const cellW = parseFloat(BOARD.cellSize) + parseFloat(BOARD.gap);
          const x = rect.left + col * cellW + cellW / 2;
          const y = rect.top + row * cellW + cellW;
          setPicker({ row, col, x, y });
        }
        return;
      }

      setBoard((prev) => {
        const next = prev.map((r) => r.map((c) => ({ ...c })));
        const cell = next[row][col];

        if (activeTool === 'paint') {
          cell.regionColor = selectedColor;
        } else if (activeTool === 'erase') {
          cell.regionColor = null;
          cell.constraint = null;
        }
        return next;
      });
    },
    [isEditing, activeTool, selectedColor, board]
  );

  const handleConstraintClick = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      if (!isEditing) return;
      if (!board[row][col].regionColor) return;

      e.stopPropagation();
      setPicker({ row, col, x: e.clientX, y: e.clientY });
    },
    [isEditing, board]
  );

  const handleConstraintSelect = useCallback(
    (constraint: Constraint | null) => {
      if (!picker) return;

      const region = regionMap.get(`${picker.row}-${picker.col}`);
      if (!region) return;

      setBoard((prev) => {
        const next = prev.map((r) => r.map((c) => ({ ...c })));

        for (const [cr, cc] of region.cells) {
          next[cr][cc].constraint = null;
        }

        if (constraint) {
          const [dr, dc] = region.displayCell;
          next[dr][dc].constraint = constraint;
        }

        return next;
      });
    },
    [picker, regionMap]
  );

  const pickerRegion = picker ? regionMap.get(`${picker.row}-${picker.col}`) : null;

  const deckExcludeIds = useMemo(() => {
    const ids = new Set(placedIds);
    if (liftedPlacement) {
      ids.add(liftedPlacement.domino.id);
    }
    return ids;
  }, [placedIds, liftedPlacement]);

  const dragDomino = dragState
    ? (deckDominoes.find((d) => d.id === dragState.dominoId) ?? null)
    : null;

  const isLiftedSelected = liftedPlacement && selection && selection.dominoId === liftedPlacement.domino.id && !dragState;

  const { containerRef, innerRef, scale } = useContentScale();

  const getShareUrl = useCallback(() => {
    const encoded = encodePuzzle(board, placedDominoes);
    const url = new URL(window.location.href);
    url.pathname = '/edit';
    url.searchParams.set('puzzle', encoded);
    return url.toString();
  }, [board, placedDominoes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
    <TopNav
      activeTab="edit"
      shareButton={<ShareButton getShareUrl={getShareUrl} />}
    />
    <div
      ref={containerRef}
      style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      onPointerDown={clearSelection}
    >
    <div
      ref={innerRef}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 32, transformOrigin: 'center center' }}
    >

      {!isSharedPuzzle && (
        <EditToolbar
          isEditing={isEditing}
          onToggleEdit={() => {
            setIsEditing((v) => {
              if (!v) {
                setPlacedDominoes([]);
                clearSelection();
              }
              return !v;
            });
          }}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
        />
      )}

      <div data-board onPointerDown={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <Board
          board={board}
          isEditing={isEditing}
          onCellClick={handleCellClick}
          onConstraintClick={handleConstraintClick}
          placedDominoes={placedDominoes}
          selectedId={selection?.dominoId ?? null}
          dragSourceId={dragSourceId}
          dropTarget={dropTarget}
          onDominoClick={handleDominoClick}
          onDominoPointerDown={handlePointerDown}
          boardCellRef={boardCellRef}
        />

        {/* Floating DominoPiece for board domino that was lifted by clicking */}
        {isLiftedSelected && liftedPlacement && (() => {
          const cellSize = parseFloat(BOARD.cellSize);
          const gap = parseFloat(BOARD.gap);
          const padding = 4;
          const lp = liftedPlacement;

          const left = padding + lp.col * (cellSize + gap) + cellSize / 2;
          const top = padding + lp.row * (cellSize + gap) + cellSize / 2;

          const offsetX = lp.orientation === 'horizontal' ? (cellSize + gap) / 2 : 0;
          const offsetY = lp.orientation === 'vertical' ? (cellSize + gap) / 2 : 0;

          const centerX = left + offsetX;
          const centerY = top + offsetY;

          const rotSteps = getRotationSteps(lp.domino.id);
          const rotMod = ((rotSteps % 4) + 4) % 4;
          const originalDomino = deckDominoes.find((d) => d.id === lp.domino.id) ?? lp.domino;
          const needsSwap = rotMod >= 2;
          const displayDomino = needsSwap
            ? { ...originalDomino, first: originalDomino.second, second: originalDomino.first }
            : originalDomino;

          return (
            <div
              style={{
                position: 'absolute',
                left: centerX,
                top: centerY,
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleDominoClick(lp.domino.id, {
                  area: 'board',
                  row: lp.row,
                  col: lp.col,
                  orientation: lp.orientation,
                });
              }}
              onPointerDown={(e) => {
                handlePointerDown(lp.domino.id, {
                  area: 'board',
                  row: lp.row,
                  col: lp.col,
                  orientation: lp.orientation,
                }, e);
              }}
            >
              <DominoPiece
                domino={displayDomino}
                orientation={getEffectiveOrientation(lp.domino.id, lp.orientation)}
                rotationSteps={rotSteps}
                isSelected
                context="tray"
              />
            </div>
          );
        })()}
      </div>

      {!isEditing && (
        <DominoDeck
          dominoes={deckDominoes}
          placedIds={deckExcludeIds}
          onShuffle={handleShuffle}
          selectedId={selection?.dominoId ?? null}
          dragSourceId={dragSourceId}
          getRotationSteps={getRotationSteps}
          onDominoClick={handleDominoClick}
          onDominoPointerDown={handlePointerDown}
        />
      )}

    </div>
    </div>

      {/* Drag ghost */}
      {dragState && dragDomino && (() => {
        const steps = ((dragState.rotationSteps % 4) + 4) % 4;
        const orientation = dragState.orientation;

        // Ghost uses original domino data — CSS rotation handles visual orientation.
        // No pip swap here; swap is only needed at board placement time.
        const isFirst = dragState.grabbedHalf === 'first';
        const sign = isFirst ? 1 : -1;
        let tx = '-50%', ty = '-50%';
        switch (steps) {
          case 0: tx = `calc(-50% + ${sign * 25}%)`; break;
          case 1: ty = `calc(-50% + ${sign * 25}%)`; break;
          case 2: tx = `calc(-50% + ${-sign * 25}%)`; break;
          case 3: ty = `calc(-50% + ${-sign * 25}%)`; break;
        }
        return (
          <div
            style={{
              position: 'fixed',
              left: dragState.currentPos.x,
              top: dragState.currentPos.y,
              transform: `translate(${tx}, ${ty}) scale(${scale * 1.1})`,
              pointerEvents: 'none',
              zIndex: 100,
              opacity: 0.85,
            }}
          >
            <DominoPiece
              domino={dragDomino}
              orientation={orientation}
              rotationSteps={steps}
              isSelected
            />
          </div>
        );
      })()}

      {picker && board[picker.row][picker.col].regionColor && pickerRegion && (
        <ConstraintPicker
          position={{ x: picker.x, y: picker.y }}
          regionColor={board[picker.row][picker.col].regionColor!}
          currentConstraint={pickerRegion.constraint}
          onSelect={handleConstraintSelect}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
