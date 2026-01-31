'use client';

import React, { Suspense, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Board } from '@/components/Board';
import { DominoDeck } from '@/components/DominoDeck';
import { DominoPiece } from '@/components/DominoPiece';
import { TopNav } from '@/components/TopNav';
import { ShareButton } from '@/components/ShareButton';
import { CongratsModal } from '@/components/CongratsModal';
import { IncorrectModal } from '@/components/IncorrectModal';
import { BoardState, CellState, Domino, PlacedDomino } from '@/types';
import { BOARD, WORK_GRID, generateFullSet, shuffleDominoes } from '@/constants';
import { useDominoInteraction } from '@/hooks/useDominoInteraction';
import { useContentScale } from '@/hooks/useContentScale';

import { generatePuzzle } from '@/utils/puzzleGenerator';
import { validatePuzzle, isBoardFull, getViolatedRegions } from '@/utils/validatePuzzle';

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

type GamePhase = 'prestart' | 'playing' | 'solved' | 'reviewing' | 'incorrect';

function PlayPageInner() {
  const searchParams = useSearchParams();
  const puzzleParam = searchParams.get('puzzle');


  const [board, setBoard] = useState<BoardState>(() =>
    Array.from({ length: WORK_GRID.rows }, () =>
      Array.from({ length: WORK_GRID.cols }, (): CellState => ({
        regionColor: null,
        constraint: null,
        isFoundation: false,
      }))
    )
  );

  const [deckDominoes, setDeckDominoes] = useState<Domino[]>(createInitialDeck);
  const [placedDominoes, setPlacedDominoes] = useState<PlacedDomino[]>([]);
  const [solutionPlacements, setSolutionPlacements] = useState<PlacedDomino[]>([]);
  const [ready, setReady] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);

  // Game phase & timer
  const [gamePhase, setGamePhase] = useState<GamePhase>('prestart');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Tick the timer every second while playing
  useEffect(() => {
    if (gamePhase !== 'playing' || !startTime) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gamePhase, startTime]);

  // Load puzzle from URL param or generate
  useEffect(() => {
    let cancelled = false;

    async function loadPuzzle() {
      if (puzzleParam) {
        try {
          const res = await fetch(`/api/puzzles?code=${encodeURIComponent(puzzleParam)}`);
          if (!res.ok) throw new Error('Not found');
          const data = await res.json();
          if (cancelled) return;
          setBoard(data.board);
          const solutionDominoes = data.placedDominoes.map((p: { domino: { id: string; first: number; second: number } }) => p.domino);
          setDeckDominoes(solutionDominoes);
          setSolutionPlacements(data.placedDominoes);
          setPlacedDominoes([]);
        } catch {
          if (cancelled) return;
          const puzzle = generatePuzzle();
          setBoard(puzzle.board);
          setDeckDominoes(puzzle.solutionDominoes);
          setSolutionPlacements(puzzle.solutionPlacements);
        }
      } else {
        const puzzle = generatePuzzle();
        setBoard(puzzle.board);
        setDeckDominoes(puzzle.solutionDominoes);
        setSolutionPlacements(puzzle.solutionPlacements);
      }
      if (cancelled) return;
      setReady(true);
      setGamePhase('prestart');
      setStartTime(null);
      setElapsedSeconds(0);
      setPlacedDominoes([]);
    }

    loadPuzzle();
    return () => { cancelled = true; };
  }, [puzzleParam]);

  // Compute violated regions for error dots
  const violatedRegions = useMemo(
    () => getViolatedRegions(board, placedDominoes),
    [board, placedDominoes]
  );

  // Check win condition whenever placed dominoes change
  useEffect(() => {
    if (gamePhase !== 'playing' || placedDominoes.length === 0) return;
    if (!isBoardFull(board, placedDominoes)) return;
    if (violatedRegions.size === 0) {
      setElapsedSeconds(Math.floor((Date.now() - (startTime ?? Date.now())) / 1000));
      setGamePhase('solved');
    } else {
      setGamePhase('incorrect');
    }
  }, [placedDominoes, board, gamePhase, startTime, violatedRegions]);

  const handleStart = useCallback(() => {
    setGamePhase('playing');
    setStartTime(Date.now());
    setElapsedSeconds(0);
  }, []);

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
    board,
    allDominoes: deckDominoes,
    placedDominoes,
    onPlacedDominoesChange: setPlacedDominoes,
    deckElementRef: deckRef,
  });


  const handleRegenerate = useCallback(() => {
    const puzzle = generatePuzzle();
    setBoard(puzzle.board);
    setDeckDominoes(puzzle.solutionDominoes);
    setSolutionPlacements(puzzle.solutionPlacements);
    setPlacedDominoes([]);
    clearSelection();
    setGamePhase('prestart');
    setStartTime(null);
    setElapsedSeconds(0);
  }, [clearSelection]);

  const handleCongratsClose = useCallback(() => {
    setGamePhase('reviewing');
  }, []);

  const handleIncorrectClose = useCallback(() => {
    setGamePhase('playing');
  }, []);

  const handleClearBoard = useCallback(() => {
    setPlacedDominoes([]);
    clearSelection();
  }, [clearSelection]);

  const handleNewPuzzle = useCallback(() => {
    handleRegenerate();
  }, [handleRegenerate]);

  const handleSolveForMe = useCallback(() => {
    if (solutionPlacements.length === 0) return;
    // Start the game if not already playing
    if (gamePhase === 'prestart') {
      setGamePhase('playing');
      setStartTime(Date.now());
      setElapsedSeconds(0);
    }
    clearSelection();
    // Pick a random domino to leave out
    const leaveOutIdx = Math.floor(Math.random() * solutionPlacements.length);
    const allButOne = solutionPlacements.filter((_, i) => i !== leaveOutIdx);
    setPlacedDominoes(allButOne);
  }, [solutionPlacements, gamePhase, clearSelection]);

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

  const getShareUrl = useCallback(async () => {
    const res = await fetch('/api/puzzles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board, placedDominoes: solutionPlacements }),
    });
    const { code } = await res.json();
    const url = new URL(window.location.href);
    url.pathname = '/play';
    url.searchParams.set('puzzle', code);
    return url.toString();
  }, [board, solutionPlacements]);

  if (!ready) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
    <TopNav
      activeTab="play"
      shareButton={<ShareButton getShareUrl={getShareUrl} />}
      onRegenerate={handleRegenerate}
      onClearBoard={handleClearBoard}
    />
    <div
      ref={containerRef}
      style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      onPointerDown={gamePhase === 'playing' || gamePhase === 'reviewing' ? clearSelection : undefined}
    >
    <div
      ref={innerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: 32,
        transformOrigin: 'center center',
        position: 'relative',
      }}
    >

      {/* Pre-start blur overlay */}
      {gamePhase === 'prestart' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'rgba(255, 255, 255, 0.5)',
            borderRadius: 16,
          }}
        >
          <button
            onClick={handleStart}
            style={{
              padding: '16px 48px',
              fontSize: 22,
              fontWeight: 700,
              fontFamily: "'nyt-franklin', var(--font-libre-franklin), 'Libre Franklin', sans-serif",
              color: 'white',
              background: '#6b5147',
              border: 'none',
              borderRadius: 28,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#5a4339'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#6b5147'; }}
          >
            Play
          </button>
        </div>
      )}

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
          violatedRegions={violatedRegions.size > 0 && isBoardFull(board, placedDominoes) ? violatedRegions : undefined}
        />

        {/* Floating DominoPiece for board domino that was lifted by clicking */}
        {isLiftedSelected && liftedPlacement && (() => {
          const cellSize = parseFloat(BOARD.cellSize);
          const gap = parseFloat(BOARD.gap);
          const padding = 4;
          const lp = liftedPlacement;

          // Compute bounding box offset — the Board crops to foundation cells
          let minR = board.length, minC = (board[0]?.length ?? 0);
          for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[0].length; c++) {
              if (board[r][c].isFoundation) {
                if (r < minR) minR = r;
                if (c < minC) minC = c;
              }
            }
          }

          const left = padding + (lp.col - minC) * (cellSize + gap) + cellSize / 2;
          const top = padding + (lp.row - minR) * (cellSize + gap) + cellSize / 2;

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
        ref={deckRef}
        dominoes={deckDominoes}
        placedIds={deckExcludeIds}
        selectedId={selection?.dominoId ?? null}
        dragSourceId={dragSourceId}
        getRotationSteps={getRotationSteps}
        onDominoClick={handleDominoClick}
        onDominoPointerDown={handlePointerDown}
        showShuffle={false}
      />

    </div>
    </div>

      {/* Solve for me button */}
      {gamePhase !== 'solved' && gamePhase !== 'reviewing' && (
        <button
          onClick={handleSolveForMe}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'nyt-franklin', var(--font-libre-franklin), 'Libre Franklin', sans-serif",
            color: '#6b5147',
            background: 'white',
            border: '1px solid #6b5147',
            borderRadius: 20,
            cursor: 'pointer',
            zIndex: 60,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#f0e6e0'; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'white'; }}
        >
          Solve for me
        </button>
      )}

      {/* Congrats modal */}
      {gamePhase === 'solved' && (
        <CongratsModal
          timeElapsed={elapsedSeconds}
          onClose={handleCongratsClose}
          onNewPuzzle={handleNewPuzzle}
        />
      )}

      {/* Incorrect modal */}
      {gamePhase === 'incorrect' && (
        <IncorrectModal onClose={handleIncorrectClose} />
      )}

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
