'use client';

import React, { useState, useCallback, useEffect } from 'react';
import styles from './ShareButton.module.css';

interface ShareButtonProps {
  getShareUrl: () => Promise<string>;
  disabled?: boolean;
  disabledMessage?: string;
}

export default function ShareButton({ getShareUrl, disabled, disabledMessage }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const handleClick = useCallback(async () => {
    if (disabled) {
      setToast(true);
      return;
    }
    const url = await getShareUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getShareUrl, disabled]);

  // Manage toast fade-in / fade-out lifecycle
  useEffect(() => {
    if (!toast) return;
    // Fade in on next frame
    requestAnimationFrame(() => setToastVisible(true));
    // Start fade out after 2s
    const fadeOut = setTimeout(() => setToastVisible(false), 2000);
    // Remove from DOM after fade out animation
    const remove = setTimeout(() => setToast(false), 2400);
    return () => { clearTimeout(fadeOut); clearTimeout(remove); };
  }, [toast]);

  return (
    <>
      <button
        className={`${styles.shareButton} ${copied ? styles.copied : ''} ${disabled ? styles.disabled : ''}`}
        onClick={handleClick}
      >
        {copied ? 'Copied!' : 'Share'}
      </button>
      {toast && (
        <div className={`${styles.toast} ${toastVisible ? styles.toastVisible : ''}`}>
          {disabledMessage ?? 'Solve the board to share'}
        </div>
      )}
    </>
  );
}
