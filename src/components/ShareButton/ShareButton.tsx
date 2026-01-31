'use client';

import React, { useState, useCallback } from 'react';
import styles from './ShareButton.module.css';

interface ShareButtonProps {
  getShareUrl: () => string;
}

export default function ShareButton({ getShareUrl }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(() => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [getShareUrl]);

  return (
    <button
      className={`${styles.shareButton} ${copied ? styles.copied : ''}`}
      onClick={handleClick}
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
