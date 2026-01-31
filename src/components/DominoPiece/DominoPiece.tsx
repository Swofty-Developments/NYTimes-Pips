import React, { useRef, useEffect, useState } from 'react';
import styles from './DominoPiece.module.css';
import { Domino, DominoOrientation } from '@/types';
import { HalfDomino } from '@/components/HalfDomino';

interface DominoPieceProps {
  domino: Domino;
  orientation?: DominoOrientation;
  isSelected?: boolean;
  isDragSource?: boolean;
  rotationSteps?: number;
  onClick?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  context?: 'tray' | 'board';
}

export default function DominoPiece({
  domino,
  orientation = 'horizontal',
  isSelected = false,
  isDragSource = false,
  rotationSteps = 0,
  onClick,
  onPointerDown,
  context = 'tray',
}: DominoPieceProps) {
  // For tray context, the wrapper handles rotation via CSS transform,
  // so HalfDomino always renders as horizontal internally.
  // For board context, orientation drives the actual layout (no wrapper rotation).
  const internalOrientation = context === 'tray' ? 'horizontal' : orientation;

  const className = [
    styles.dominoPiece,
    internalOrientation === 'horizontal' ? styles.horizontal : styles.vertical,
    isSelected ? styles.selected : '',
    isDragSource ? styles.isDragSource : '',
  ]
    .filter(Boolean)
    .join(' ');

  const rotationDeg = rotationSteps * 90;
  // Expose rotation mod 4 so HalfDomino CSS can counteract the rotation for shadows
  const rotationMod = context === 'tray' ? ((rotationSteps % 4) + 4) % 4 : undefined;

  // Trigger a brief fade animation on each rotation change
  const [fading, setFading] = useState(false);
  const prevStepsRef = useRef(rotationSteps);
  useEffect(() => {
    if (rotationSteps !== prevStepsRef.current) {
      prevStepsRef.current = rotationSteps;
      setFading(true);
    }
  }, [rotationSteps]);

  return (
    <div
      className={`${className} ${fading ? styles.rotateFade : ''}`}
      data-rotation-mod={rotationMod}
      style={{ '--rotation-deg': `${rotationDeg}deg` } as React.CSSProperties}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onAnimationEnd={() => setFading(false)}
    >
      <HalfDomino pips={domino.first} half="first" orientation={internalOrientation} context={context} />
      <HalfDomino pips={domino.second} half="second" orientation={internalOrientation} context={context} />
    </div>
  );
}
