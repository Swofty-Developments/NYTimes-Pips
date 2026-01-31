import React from 'react';
import styles from './BoardCell.module.css';
import { BoardCellProps, Constraint } from '@/types';
import { REGION_THEMES, BOARD, BORDER_SVGS, encodeSvgForCss } from '@/constants';
import { symbolToBackground } from '@/constants/symbols';
import { DIAMOND_CLIP_PATH } from '@/constants/shapes';
import { computeBorderRadius, computeBgRadius, computeBorderWidth, computeRegionExtent, computeBgInset } from '@/utils/borders';

const BORDER_WIDTH = '17.5px';
const DEFAULT_FLAGS = { top: false, right: false, bottom: false, left: false };
const DEFAULT_CORNERS = { topLeft: false, topRight: false, bottomRight: false, bottomLeft: false };

function ConstraintContent({ constraint }: { constraint: Constraint }) {
  if (constraint.type === 'symbol') {
    return (
      <span
        className={styles.symbolIcon}
        style={{ backgroundImage: symbolToBackground(constraint.value) }}
      />
    );
  }
  return <span className={styles.textLabel}>{constraint.value}</span>;
}

export default function BoardCell({
  regionColor,
  constraint,
  removeBorders = DEFAULT_FLAGS,
  insideCorners = DEFAULT_CORNERS,
  onClick,
  onConstraintClick,
  isEditing,
}: BoardCellProps) {
  const theme = REGION_THEMES[regionColor];
  const borderImageSrc = encodeSvgForCss(BORDER_SVGS[regionColor]);
  const borderRadius = computeBorderRadius(removeBorders, BOARD.borderRadius);
  const bgRadius = computeBgRadius(removeBorders, BOARD.borderRadius, insideCorners);
  const borderWidth = computeBorderWidth(removeBorders, BORDER_WIDTH);
  const regionExtent = computeRegionExtent(removeBorders);
  const bgInset = computeBgInset(removeBorders);

  return (
    <div
      className={`${styles.backgroundCell} ${isEditing ? styles.editable : ''}`}
      style={{
        '--cell-size': BOARD.cellSize,
        '--board-border-radius': BOARD.borderRadius,
        '--bg-board-outer': BOARD.bgOuter,
        '--bg-board-inner': BOARD.bgInner,
      } as React.CSSProperties}
      onClick={onClick}
    >
      <div className={styles.regionCell} style={regionExtent}>
        <div
          className={styles.regionBg}
          style={{
            backgroundColor: theme.background,
            borderRadius: bgRadius,
            inset: bgInset,
          }}
        />
        <div
          className={styles.regionBorder}
          style={{
            borderImage: `${borderImageSrc} 172 round`,
            borderRadius,
            borderWidth,
          }}
        />
      </div>

      {constraint && (
        <span
          className={styles.regionLabel}
          style={{
            backgroundColor: theme.fill,
            clipPath: DIAMOND_CLIP_PATH,
          }}
          onClick={onConstraintClick}
        >
          <ConstraintContent constraint={constraint} />
        </span>
      )}
    </div>
  );
}
