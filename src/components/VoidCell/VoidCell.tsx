import React from 'react';
import styles from './VoidCell.module.css';
import { BOARD } from '@/constants';

interface VoidCellProps {
  onClick?: () => void;
  isFoundationMode?: boolean;
}

export default function VoidCell({ onClick, isFoundationMode }: VoidCellProps) {
  return (
    <div
      className={`${styles.voidCell} ${isFoundationMode ? styles.foundationMode : ''}`}
      style={{
        '--cell-size': BOARD.cellSize,
        '--board-border-radius': BOARD.borderRadius,
      } as React.CSSProperties}
      onClick={onClick}
    />
  );
}
