'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav/TopNav';
import { Board } from '@/components/Board';
import { BOARD, WORK_GRID } from '@/constants';
import { generateRandomPuzzle } from '@/utils/puzzleGenerator';
import styles from './page.module.css';

/** Calculate how many boards we need to tile the viewport */
function getBoardCounts() {
  const cellSize = parseFloat(BOARD.cellSize);
  const gap = parseFloat(BOARD.gap);
  const boardW = WORK_GRID.cols * cellSize + (WORK_GRID.cols - 1) * gap + 8;
  const boardH = WORK_GRID.rows * cellSize + (WORK_GRID.rows - 1) * gap + 8;

  // Use large defaults for SSR, will recalc on client
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

  const cols = Math.ceil(vw / boardW) + 1;
  const rows = Math.ceil(vh / boardH) + 1;
  return { cols, rows, total: cols * rows };
}

const noop = () => {};
const noopConstraint = () => {};

export default function Home() {
  const [counts, setCounts] = useState(() => getBoardCounts());

  useEffect(() => {
    const update = () => setCounts(getBoardCounts());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const boards = useMemo(
    () => Array.from({ length: counts.total }, () => generateRandomPuzzle(true)),
    [counts.total]
  );

  return (
    <div className={styles.page}>
      <TopNav activeTab="home" />

      <div className={styles.backgroundBoard}>
        <div
          className={styles.boardGrid}
          style={{
            gridTemplateColumns: `repeat(${counts.cols}, auto)`,
          }}
        >
          {boards.map((board, i) => (
            <div
              key={i}
              className={styles.boardTile}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <Board
                board={board}
                isEditing={false}
                onCellClick={noop}
                onConstraintClick={noopConstraint}
              />
            </div>
          ))}
        </div>
        <div className={styles.fadeOverlay} />
      </div>

      <div className={styles.content}>
        <div className={styles.textWrapper}>
          <div className={styles.blurBackdrop} />
          <div className={styles.textContent}>
            <h1 className={styles.title}>{"Swofty's NYTimes Pips"}</h1>
            <p className={styles.subtitle}>The most faithful NYTimes recreation of Pips!</p>
          </div>
        </div>

        <div className={styles.cards}>
          <Link href="/edit" className={styles.card}>
            <div className={styles.cardIcon}>{'\u270F\uFE0F'}</div>
            <div className={styles.cardTitle}>Edit</div>
            <div className={styles.cardDesc}>Create a puzzle</div>
          </Link>

          <Link href="/play" className={styles.card}>
            <div className={styles.cardIcon}>{'\uD83C\uDFB2'}</div>
            <div className={styles.cardTitle}>Play</div>
            <div className={styles.cardDesc}>Random puzzle</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
