import React from 'react';
import styles from './DominoDeck.module.css';
import { Domino, DominoLocation } from '@/types';
import { DominoPiece } from '@/components/DominoPiece';

interface DominoDeckProps {
  dominoes: Domino[];
  placedIds: Set<string>;
  onShuffle?: () => void;
  showShuffle?: boolean;
  selectedId: string | null;
  dragSourceId: string | null;
  getRotationSteps: (dominoId: string) => number;
  onDominoClick: (dominoId: string, location: DominoLocation) => void;
  onDominoPointerDown: (dominoId: string, location: DominoLocation, e: React.PointerEvent) => void;
}

const DominoDeck = React.forwardRef<HTMLDivElement, DominoDeckProps>(function DominoDeck({
  dominoes,
  placedIds,
  onShuffle,
  showShuffle,
  selectedId,
  dragSourceId,
  getRotationSteps,
  onDominoClick,
  onDominoPointerDown,
}, ref) {
  const available = dominoes.filter((d) => !placedIds.has(d.id));

  return (
    <div ref={ref} className={styles.deck}>
      {showShuffle !== false && onShuffle && (
        <button className={styles.shuffleButton} onClick={onShuffle}>
          Shuffle
        </button>
      )}
      <div className={styles.deckGrid}>
        {available.map((domino) => {
          const location: DominoLocation = { area: 'deck' };
          return (
            <DominoPiece
              key={domino.id}
              domino={domino}
              isSelected={selectedId === domino.id}
              isDragSource={dragSourceId === domino.id}
              rotationSteps={getRotationSteps(domino.id)}
              onClick={(e) => {
                e.stopPropagation();
                onDominoClick(domino.id, location);
              }}
              onPointerDown={(e) => onDominoPointerDown(domino.id, location, e)}
            />
          );
        })}
      </div>
    </div>
  );
});

export default DominoDeck;
