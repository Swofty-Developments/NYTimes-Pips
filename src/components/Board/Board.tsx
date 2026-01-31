'use client';

import React, { useMemo, useCallback } from 'react';
import styles from './Board.module.css';
import { BoardState, RegionColor, PlacedDomino, DominoHalf, DominoLocation, DominoOrientation } from '@/types';
import { BOARD } from '@/constants';
import BoardCell from '@/components/BoardCell/BoardCell';
import { EmptyCell } from '@/components/EmptyCell';
import { VoidCell } from '@/components/VoidCell';
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
  isFoundationMode?: boolean;
  onCellClick: (row: number, col: number) => void;
  onConstraintClick: (row: number, col: number, e: React.MouseEvent) => void;
  placedDominoes?: PlacedDomino[];
  selectedId?: string | null;
  dragSourceId?: string | null;
  dropTarget?: DropTarget | null;
  onDominoClick?: (dominoId: string, location: DominoLocation) => void;
  onDominoPointerDown?: (dominoId: string, location: DominoLocation, e: React.PointerEvent) => void;
  boardCellRef?: (row: number, col: number, el: HTMLElement | null) => void;
  violatedRegions?: Set<string>;
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
  isFoundationMode,
  onCellClick,
  onConstraintClick,
  placedDominoes = [],
  selectedId,
  dragSourceId,
  dropTarget,
  onDominoClick,
  onDominoPointerDown,
  boardCellRef,
  violatedRegions,
}: BoardProps) {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const regionMap = useMemo(() => findRegions(board), [board]);
  const dominoMap = useMemo(() => buildDominoMap(placedDominoes), [placedDominoes]);
  const hasVoidCells = useMemo(() => board.some(row => row.some(cell => !cell.isFoundation)), [board]);

  // Compute foundation background bleed for each cell (only needed when board has void cells)
  const foundationBg = useMemo(() => {
    if (!hasVoidCells) return null;
    const gap = parseFloat(BOARD.gap);
    const half = gap / 2;
    const pad = 4; // board padding
    const radius = 8;
    const map = new Map<string, React.CSSProperties>();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!board[r][c].isFoundation) continue;
        const hasTop = r > 0 && board[r - 1][c].isFoundation;
        const hasBottom = r < rows - 1 && board[r + 1][c].isFoundation;
        const hasLeft = c > 0 && board[r][c - 1].isFoundation;
        const hasRight = c < cols - 1 && board[r][c + 1].isFoundation;

        // Extend into gap toward foundation neighbors, extend to board padding on edges
        const top = hasTop ? -half : -pad;
        const bottom = hasBottom ? -half : -pad;
        const left = hasLeft ? -half : -pad;
        const right = hasRight ? -half : -pad;

        // Corner radius: round outer corners where both adjacent sides are non-foundation
        const tl = !hasTop && !hasLeft ? radius : 0;
        const tr = !hasTop && !hasRight ? radius : 0;
        const br = !hasBottom && !hasRight ? radius : 0;
        const bl = !hasBottom && !hasLeft ? radius : 0;

        map.set(`${r}-${c}`, {
          '--fb-top': `${top}px`,
          '--fb-right': `${right}px`,
          '--fb-bottom': `${bottom}px`,
          '--fb-left': `${left}px`,
          '--fb-radius': `${tl}px ${tr}px ${br}px ${bl}px`,
        } as React.CSSProperties);
      }
    }
    return map;
  }, [board, rows, cols, hasVoidCells]);

  // When not in foundation mode, crop to the bounding box of foundation cells
  const showFullGrid = isFoundationMode;
  const bbox = useMemo(() => {
    if (!hasVoidCells || showFullGrid) {
      return { minR: 0, maxR: rows - 1, minC: 0, maxC: cols - 1 };
    }
    let minR = rows, maxR = -1, minC = cols, maxC = -1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].isFoundation) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }
    if (maxR === -1) return { minR: 0, maxR: rows - 1, minC: 0, maxC: cols - 1 };
    return { minR, maxR, minC, maxC };
  }, [board, rows, cols, hasVoidCells, showFullGrid]);

  const gridCols = bbox.maxC - bbox.minC + 1;
  const gridRows = bbox.maxR - bbox.minR + 1;

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
      className={`${styles.board} ${hasVoidCells ? styles.dynamicBg : styles.solidBg}`}
      style={{
        gridTemplateColumns: `repeat(${gridCols}, ${BOARD.cellSize})`,
        gridTemplateRows: `repeat(${gridRows}, ${BOARD.cellSize})`,
        gap: BOARD.gap,
      }}
    >
      {board.slice(bbox.minR, bbox.maxR + 1).map((row, ri) => {
        const r = ri + bbox.minR;
        return row.slice(bbox.minC, bbox.maxC + 1).map((cell, ci) => {
          const c = ci + bbox.minC;
          const key = `${r}-${c}`;
          const dominoInfo = dominoMap.get(key);
          const isDropTarget = dropHighlight.has(key);

          const cellContent = (() => {
            if (!cell.isFoundation) {
              return (
                <VoidCell
                  onClick={() => onCellClick(r, c)}
                  isFoundationMode={isFoundationMode}
                />
              );
            }
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
                  showError={isDisplayCell && violatedRegions?.has(key)}
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

          const isVoid = !cell.isFoundation;
          const fbStyle = !isVoid && foundationBg ? foundationBg.get(key) : undefined;

          return (
            <div
              key={key}
              ref={cellRefCallback(r, c)}
              className={`${styles.cellWrapper} ${isDropTarget ? styles.dropTarget : ''} ${isVoid ? styles.voidWrapper : ''} ${isVoid && isFoundationMode ? styles.foundationActive : ''} ${!isVoid && hasVoidCells ? styles.foundationCell : ''}`}
              style={fbStyle}
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
        });
      })}
    </div>
  );
}
