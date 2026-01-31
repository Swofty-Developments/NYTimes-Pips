import React from 'react';
import styles from './DominoDeck.module.css';
import { Domino, DominoLocation } from '@/types';
import { DominoPiece } from '@/components/DominoPiece';

interface DominoDeckProps {
  dominoes: Domino[];
  placedIds: Set<string>;
  onShuffle: () => void;
  selectedId: string | null;
  dragSourceId: string | null;
  getRotationSteps: (dominoId: string) => number;
  onDominoClick: (dominoId: string, location: DominoLocation) => void;
  onDominoPointerDown: (dominoId: string, location: DominoLocation, e: React.PointerEvent) => void;
}

export default function DominoDeck({
  dominoes,
  placedIds,
  onShuffle,
  selectedId,
  dragSourceId,
  getRotationSteps,
  onDominoClick,
  onDominoPointerDown,
}: DominoDeckProps) {
  const available = dominoes.filter((d) => !placedIds.has(d.id));

  return (
    <div className={styles.deck}>
      <button className={styles.shuffleButton} onClick={onShuffle}>
        Shuffle
      </button>
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
}
