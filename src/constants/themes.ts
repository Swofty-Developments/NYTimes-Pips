import { RegionColor, RegionTheme } from '@/types';

/**
 * Color themes for each region. Add a new entry here to support a new region color.
 */
export const REGION_THEMES: Record<RegionColor, RegionTheme> = {
  orange: {
    background: 'rgba(253, 157, 9, 0.3)',
    stroke: '#AE4300',
    fill: '#d15609',
  },
  blue: {
    background: 'rgba(18, 64, 118, 0.3)',  // navy from NYT
    stroke: '#003674',
    fill: '#124076',
  },
  pink: {
    background: 'rgba(249, 58, 122, 0.3)',
    stroke: '#C70042',
    fill: '#db137a',
  },
  teal: {
    background: 'rgba(0, 163, 184, 0.3)',
    stroke: '#005460',
    fill: '#008293',
  },
  purple: {
    background: 'rgba(128, 70, 177, 0.3)',
    stroke: '#7000CF',
    fill: '#9251ca',
  },
  green: {
    background: 'rgba(84, 118, 1, 0.3)',
    stroke: '#3F5900',
    fill: '#547601',
  },
};

/** Working grid for the editor (8 rows × 10 cols) */
export const WORK_GRID = { rows: 8, cols: 10 } as const;

/** Board-level constants */
export const BOARD = {
  bgOuter: '#dbc2b9',
  bgInner: '#e1cbc5',
  borderRadius: '5.61px',
  cellSize: '47.07px',
  gap: '4px',
  cols: 6,
  rows: 4,
} as const;
