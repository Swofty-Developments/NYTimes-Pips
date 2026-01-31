import { Domino, DotPosition } from '@/types';

// ── Domino Dimensions (from NYT) ─────────────────────────────
export const DOMINO = {
  halfSize: '35.0167px',
  borderWidth: '1.26667px',
  borderRadius: '5.27px',
  dividerWidth: '1px',
  dividerInset: '4px',
  shadowOffset: '2.666px',
} as const;

// ── Domino Colors ─────────────────────────────────────────────
export const DOMINO_COLORS = {
  bg: 'rgb(246, 246, 246)',
  border: 'rgb(18, 18, 18)',
  divider: 'rgb(226, 219, 219)',
  shadow: 'rgb(173, 173, 173)',
  dot: 'rgb(68, 68, 68)',
} as const;

// ── Dot Dimensions ────────────────────────────────────────────
export const DOT = {
  size: '6.16667px',
  wrapperWidth: '21.4667px',
  wrapperHeight: '20.1px',
} as const;

// ── Pip Patterns (which dots for each number 0–6) ─────────────
export const PIP_PATTERNS: Record<number, DotPosition[]> = {
  0: [],
  1: ['middle'],
  2: ['top-left', 'bottom-right'],
  3: ['top-left', 'middle', 'bottom-right'],
  4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  5: ['top-left', 'top-right', 'middle', 'bottom-left', 'bottom-right'],
  6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'],
};

// ── Full Set Generation ───────────────────────────────────────
export function generateFullSet(): Domino[] {
  const dominoes: Domino[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      dominoes.push({ id: `${i}-${j}`, first: i, second: j });
    }
  }
  return dominoes;
}

// ── Shuffle (Fisher-Yates) ────────────────────────────────────
export function shuffleDominoes(dominoes: Domino[]): Domino[] {
  const arr = [...dominoes];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
