import React from 'react';
import styles from './IncorrectModal.module.css';

interface IncorrectModalProps {
  onClose: () => void;
}

export default function IncorrectModal({ onClose }: IncorrectModalProps) {
  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose} aria-label="close">
          ✕
        </button>
        <div className={styles.content}>
          <h1 className={styles.heading}>Almost there</h1>
          <p className={styles.message}>
            {"You've used every domino, but at least one is in the wrong spot."}
          </p>
          <div className={styles.buttons}>
            <button className={styles.primaryButton} onClick={onClose}>
              Keep Trying
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
