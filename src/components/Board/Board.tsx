'use client';

import React, { useMemo, useCallback } from 'react';
import styles from './Board.module.css';
import { BoardState, RegionColor, PlacedDomino, DominoHalf, DominoLocation, DominoOrientation } from '@/types';
import { BOARD } from '@/constants';
import BoardCell from '@/components/BoardCell/BoardCell';
import { EmptyCell } from '@/components/EmptyCell';
import { HalfDomino } from '@/components/HalfDomino';
import { computeBorderFlags, computeInsideCorners } from '@/utils/borders';
import { findRegions } from '@/utils/regions';

interface DropTarget {
  row: number;
  col: number;
  orientation: DominoOrientation;
}

interface BoardProps {
  board: BoardState;
  isEditing: boolean;
  onCellClick: (row: number, col: number) => void;
  onConstraintClick: (row: number, col: number, e: React.MouseEvent) => void;
  placedDominoes?: PlacedDomino[];
  selectedId?: string | null;
  dragSourceId?: string | null;
  dropTarget?: DropTarget | null;
  onDominoClick?: (dominoId: string, location: DominoLocation) => void;
  onDominoPointerDown?: (dominoId: string, location: DominoLocation, e: React.PointerEvent) => void;
  boardCellRef?: (row: number, col: number, el: HTMLElement | null) => void;
}

// Build a map from "row-col" → { half, orientation, pips, domino PlacedDomino }
function buildDominoMap(placed: PlacedDomino[]): Map<string, { half: DominoHalf; orientation: DominoOrientation; pips: number; placed: PlacedDomino }> {
  const map = new Map<string, { half: DominoHalf; orientation: DominoOrientation; pips: number; placed: PlacedDomino }>();
  for (const p of placed) {
    map.set(`${p.row}-${p.col}`, { half: 'first', orientation: p.orientation, pips: p.domino.first, placed: p });
    if (p.orientation === 'horizontal') {
      map.set(`${p.row}-${p.col + 1}`, { half: 'second', orientation: p.orientation, pips: p.domino.second, placed: p });
    } else {
      map.set(`${p.row + 1}-${p.col}`, { half: 'second', orientation: p.orientation, pips: p.domino.second, placed: p });
    }
  }
  return map;
}

export default function Board({
  board,
  isEditing,
  onCellClick,
  onConstraintClick,
  placedDominoes = [],
  selectedId,
  dragSourceId,
  dropTarget,
  onDominoClick,
  onDominoPointerDown,
  boardCellRef,
}: BoardProps) {
  const regionMap = useMemo(() => findRegions(board), [board]);
  const dominoMap = useMemo(() => buildDominoMap(placedDominoes), [placedDominoes]);

  // Determine which cells are highlighted as drop targets
  const dropHighlight = useMemo(() => {
    if (!dropTarget) return new Set<string>();
    const set = new Set<string>();
    set.add(`${dropTarget.row}-${dropTarget.col}`);
    if (dropTarget.orientation === 'horizontal') {
      set.add(`${dropTarget.row}-${dropTarget.col + 1}`);
    } else {
      set.add(`${dropTarget.row + 1}-${dropTarget.col}`);
    }
    return set;
  }, [dropTarget]);

  const cellRefCallback = useCallback(
    (r: number, c: number) => (el: HTMLElement | null) => {
      boardCellRef?.(r, c, el);
    },
    [boardCellRef]
  );

  return (
    <div
      className={styles.board}
      style={{
        gridTemplateColumns: `repeat(${BOARD.cols}, ${BOARD.cellSize})`,
        gridTemplateRows: `repeat(${BOARD.rows}, ${BOARD.cellSize})`,
        gap: BOARD.gap,
      }}
    >
      {board.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r}-${c}`;
          const dominoInfo = dominoMap.get(key);
          const isDropTarget = dropHighlight.has(key);

          const cellContent = (() => {
            if (cell.regionColor) {
              const flags = computeBorderFlags(board, r, c);
              const corners = computeInsideCorners(board, r, c);
              const region = regionMap.get(key);
              const isDisplayCell = region
                ? region.displayCell[0] === r && region.displayCell[1] === c
                : false;

              return (
                <BoardCell
                  regionColor={cell.regionColor as RegionColor}
                  constraint={isDisplayCell && region?.constraint ? region.constraint : undefined}
                  removeBorders={flags}
                  insideCorners={corners}
                  onClick={() => onCellClick(r, c)}
                  onConstraintClick={(e) => onConstraintClick(r, c, e)}
                  isEditing={isEditing}
                />
              );
            }
            return (
              <EmptyCell
                onClick={() => onCellClick(r, c)}
                isEditing={isEditing}
              />
            );
          })();

          // Exact same bleed/overlay calculations as original
          const gapHalf = parseFloat(BOARD.gap) / 2;
          const bleed = 1.9;
          let overlayStyle: React.CSSProperties | undefined;
          if (dominoInfo) {
            const { half, orientation } = dominoInfo;
            if (orientation === 'horizontal') {
              overlayStyle = half === 'first'
                ? { top: -bleed, left: -bleed, bottom: -bleed, right: -gapHalf }
                : { top: -bleed, right: -bleed, bottom: -bleed, left: -gapHalf };
            } else {
              overlayStyle = half === 'first'
                ? { top: -bleed, left: -bleed, right: -bleed, bottom: -gapHalf }
                : { left: -bleed, right: -bleed, bottom: -bleed, top: -gapHalf };
            }
          }

          const isDominoSelected = dominoInfo ? selectedId === dominoInfo.placed.domino.id : false;
          const isDomDragSource = dominoInfo ? dragSourceId === dominoInfo.placed.domino.id : false;

          return (
            <div
              key={key}
              ref={cellRefCallback(r, c)}
              className={`${styles.cellWrapper} ${isDropTarget ? styles.dropTarget : ''}`}
            >
              {cellContent}
              {dominoInfo && (
                <div
                  className={`${styles.dominoOverlay} ${isDominoSelected ? styles.selected : ''} ${isDomDragSource ? styles.isDragSource : ''}`}
                  style={overlayStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    const pd = dominoInfo.placed;
                    onDominoClick?.(pd.domino.id, {
                      area: 'board',
                      row: pd.row,
                      col: pd.col,
                      orientation: pd.orientation,
                    });
                  }}
                  onPointerDown={(e) => {
                    const pd = dominoInfo.placed;
                    onDominoPointerDown?.(pd.domino.id, {
                      area: 'board',
                      row: pd.row,
                      col: pd.col,
                      orientation: pd.orientation,
                      half: dominoInfo.half,
                    }, e);
                  }}
                >
                  <HalfDomino
                    pips={dominoInfo.pips}
                    half={dominoInfo.half}
                    orientation={dominoInfo.orientation}
                    context="board"
                  />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
