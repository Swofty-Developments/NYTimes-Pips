import React from 'react';
import styles from './EmptyCell.module.css';
import { BOARD } from '@/constants';

interface EmptyCellProps {
  onClick?: () => void;
  isEditing?: boolean;
}

export default function EmptyCell({ onClick, isEditing }: EmptyCellProps) {
  return (
    <div
      className={`${styles.emptyCell} ${isEditing ? styles.editable : ''}`}
      style={{
        '--cell-size': BOARD.cellSize,
        '--board-border-radius': BOARD.borderRadius,
        '--bg-board-outer': BOARD.bgOuter,
        '--bg-board-inner': BOARD.bgInner,
      } as React.CSSProperties}
      onClick={onClick}
    >
      {isEditing && <span className={styles.plusIcon}>+</span>}
    </div>
  );
}
