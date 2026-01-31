'use client';

import React from 'react';
import Link from 'next/link';
import styles from './TopNav.module.css';

interface TopNavProps {
  activeTab?: 'home' | 'edit' | 'play';
  shareButton?: React.ReactNode;
  onRegenerate?: () => void;
}

export default function TopNav({ activeTab, shareButton, onRegenerate }: TopNavProps) {
  return (
    <nav className={styles.nav}>
      <div className={styles.tabs}>
        <Link
          href="/"
          className={`${styles.tab} ${activeTab === 'home' ? styles.tabActive : ''}`}
        >
          Home
        </Link>
        <Link
          href="/edit"
          className={`${styles.tab} ${activeTab === 'edit' ? styles.tabActive : ''}`}
        >
          Edit
        </Link>
        <Link
          href="/play"
          className={`${styles.tab} ${activeTab === 'play' ? styles.tabActive : ''}`}
        >
          Play
        </Link>
        {onRegenerate && (
          <button
            className={styles.regenerateButton}
            onClick={onRegenerate}
            title="Generate new puzzle"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M13.65 2.35A7.96 7.96 0 0 0 8 0C3.58 0 0 3.58 0 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 8 14 6 6 0 1 1 8 2c1.66 0 3.14.69 4.22 1.78L9 7h7V0l-2.35 2.35z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
      </div>
      <div className={styles.spacer} />
      <a
        href="https://github.com/Swofty-Developments/nytimes-pips"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.githubLink}
      >
        GitHub
      </a>
      {shareButton}
    </nav>
  );
}
