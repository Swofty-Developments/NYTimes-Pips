'use client';

import React from 'react';
import Link from 'next/link';
import styles from './TopNav.module.css';

interface TopNavProps {
  activeTab?: 'home' | 'edit' | 'play';
  shareButton?: React.ReactNode;
}

export default function TopNav({ activeTab, shareButton }: TopNavProps) {
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
