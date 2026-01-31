import React from 'react';
import styles from './CongratsModal.module.css';

interface CongratsModalProps {
  timeElapsed: number;
  onClose: () => void;
  onNewPuzzle: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${m}:${pad(s)}`;
}

export default function CongratsModal({ timeElapsed, onClose, onNewPuzzle }: CongratsModalProps) {
  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose} aria-label="close">
          ✕
        </button>
        <div className={styles.content}>
          <span className={styles.star} />
          <h1 className={styles.heading}>Congrats!</h1>
          <p className={styles.message}>
            You solved the puzzle in <span className={styles.bold}>{formatTime(timeElapsed)}</span>.
          </p>
          <div className={styles.subtitle}>New puzzles generated on every reload.</div>
          <div className={styles.buttons}>
            <button className={styles.primaryButton} onClick={onNewPuzzle}>
              Play Another
            </button>
            <button className={styles.secondaryButton} onClick={onClose}>
              Back to Puzzle
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
