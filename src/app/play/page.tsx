'use client';

import React, { Suspense, useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Board } from '@/components/Board';
import { DominoDeck } from '@/components/DominoDeck';
import { DominoPiece } from '@/components/DominoPiece';
import { TopNav } from '@/components/TopNav';
import { ShareButton } from '@/components/ShareButton';
import { BoardState, CellState, Domino, PlacedDomino } from '@/types';
import { BOARD, generateFullSet, shuffleDominoes } from '@/constants';
import { useDominoInteraction } from '@/hooks/useDominoInteraction';
import { useContentScale } from '@/hooks/useContentScale';
import { encodePuzzle, decodePuzzle } from '@/utils/puzzleEncoding';
import { generateRandomPuzzle } from '@/utils/puzzleGenerator';

function createInitialDeck(): Domino[] {
  return shuffleDominoes(generateFullSet());
}

export default function PlayPage() {
  return (
    <Suspense>
      <PlayPageInner />
    </Suspense>
  );
}

function PlayPageInner() {
  const searchParams = useSearchParams();
  const puzzleParam = searchParams.get('puzzle');

  const [board, setBoard] = useState<BoardState>(() => {
    // Will be overridden by useEffect if puzzleParam exists
    return Array.from({ length: BOARD.rows }, () =>
      Array.from({ length: BOARD.cols }, (): CellState => ({
        regionColor: null,
        constraint: null,
      }))
    );
  });

  const [deckDominoes, setDeckDominoes] = useState<Domino[]>(createInitialDeck);
  const [placedDominoes, setPlacedDominoes] = useState<PlacedDomino[]>([]);
  const [ready, setReady] = useState(false);

  // Load puzzle from URL param or generate random
  useEffect(() => {
    if (puzzleParam) {
      try {
        const data = decodePuzzle(puzzleParam);
        setBoard(data.board);
        setPlacedDominoes(data.placedDominoes);
      } catch {
        setBoard(generateRandomPuzzle());
      }
    } else {
      setBoard(generateRandomPuzzle());
    }
    setReady(true);
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
    url.pathname = '/play';
    url.searchParams.set('puzzle', encoded);
    return url.toString();
  }, [board, placedDominoes]);

  if (!ready) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
    <TopNav
      activeTab="play"
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

      <div data-board onPointerDown={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <Board
          board={board}
          isEditing={false}
          onCellClick={() => {}}
          onConstraintClick={() => {}}
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
          // Use original deck domino — CSS rotation handles visual orientation (same as deck)
          const displayDomino = deckDominoes.find((d) => d.id === lp.domino.id) ?? lp.domino;

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
          case 0: tx = `calc(-50% + ${sign * 37.5}%)`; break;
          case 1: ty = `calc(-50% + ${sign * 37.5}%)`; break;
          case 2: tx = `calc(-50% + ${-sign * 37.5}%)`; break;
          case 3: ty = `calc(-50% + ${-sign * 37.5}%)`; break;
        }
        return (
          <div
            style={{
              position: 'fixed',
              left: dragState.currentPos.x,
              top: dragState.currentPos.y,
              transform: `translate(${tx}, ${ty}) scale(${scale})`,
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
    </div>
  );
}
