import React from 'react';
import styles from './HalfDomino.module.css';
import { DominoHalf, DominoOrientation, DotPosition } from '@/types';
import { PIP_PATTERNS } from '@/constants';

const DOT_CLASS: Record<DotPosition, string> = {
  'top-left': styles.topLeft,
  'top-right': styles.topRight,
  'middle-left': styles.middleLeft,
  'middle': styles.middle,
  'middle-right': styles.middleRight,
  'bottom-left': styles.bottomLeft,
  'bottom-right': styles.bottomRight,
};

export type DominoContext = 'tray' | 'board';

interface HalfDominoProps {
  pips: number;
  half: DominoHalf;
  orientation: DominoOrientation;
  context?: DominoContext;
}

export default function HalfDomino({ pips, half, orientation, context = 'tray' }: HalfDominoProps) {
  const dots = PIP_PATTERNS[pips] ?? [];
  const isVertical = orientation === 'vertical';

  let variantClass: string;
  if (context === 'tray') {
    variantClass = styles.tray;
  } else if (isVertical) {
    variantClass = styles.boardVertical;
  } else {
    variantClass = styles.board;
  }

  const className = [
    styles.halfDomino,
    variantClass,
    half === 'first' ? styles.isFirst : styles.isSecond,
    // Only apply .vertical for tray (uses CSS rotation)
    context === 'tray' && isVertical ? styles.vertical : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <div className={styles.dotsWrapper}>
        {dots.map((pos) => (
          <span key={pos} className={`${styles.dot} ${DOT_CLASS[pos]}`} />
        ))}
      </div>
    </div>
  );
}
