'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav/TopNav';
import BoardCell from '@/components/BoardCell/BoardCell';
import { EmptyCell } from '@/components/EmptyCell';
import { BOARD } from '@/constants';
import { RegionColor } from '@/types';
import styles from './page.module.css';

const DECO_COLS = 30;
const DECO_ROWS = 14;
const REGION_COLORS: RegionColor[] = ['orange', 'blue', 'pink', 'teal', 'purple', 'green'];

/** Simple seeded PRNG to avoid layout shift between renders */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateDecorativeBoard(): (RegionColor | null)[][] {
  const rand = seededRandom(42);
  const grid: (RegionColor | null)[][] = [];
  for (let r = 0; r < DECO_ROWS; r++) {
    const row: (RegionColor | null)[] = [];
    for (let c = 0; c < DECO_COLS; c++) {
      if (rand() < 0.6) {
        row.push(REGION_COLORS[Math.floor(rand() * REGION_COLORS.length)]);
      } else {
        row.push(null);
      }
    }
    grid.push(row);
  }
  return grid;
}

export default function Home() {
  const decoBoard = useMemo(() => generateDecorativeBoard(), []);

  return (
    <div className={styles.page}>
      <TopNav activeTab="home" />

      <div className={styles.backgroundBoard}>
        <div
          className={styles.grid}
          style={{
            gridTemplateColumns: `repeat(${DECO_COLS}, ${BOARD.cellSize})`,
            gridTemplateRows: `repeat(${DECO_ROWS}, ${BOARD.cellSize})`,
          }}
        >
          {decoBoard.map((row, r) =>
            row.map((color, c) =>
              color ? (
                <BoardCell
                  key={`${r}-${c}`}
                  regionColor={color}
                />
              ) : (
                <EmptyCell key={`${r}-${c}`} />
              )
            )
          )}
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
