import { convertExternalPuzzle, ConvertedPuzzle } from './convertExternalPuzzle';

const SUPABASE_URL = 'https://ovqddebgtyeetciffqsy.supabase.co/rest/v1/puzzles';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92cWRkZWJndHllZXRjaWZmcXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDYwNzYsImV4cCI6MjA3Mjg4MjA3Nn0.gKxh6SJ6R2MkA4Cb1UO8vFt2zRMPvE7KezRmuiqeebs';

const START_DATE = new Date('2025-08-18');
const DIFFICULTY_COLUMNS = ['easy_puzzle', 'medium_puzzle', 'hard_puzzle'] as const;
const DIFFICULTY_LABELS: Record<string, string> = {
  easy_puzzle: 'EASY',
  medium_puzzle: 'MEDIUM',
  hard_puzzle: 'HARD',
};

function randomDateString(): string {
  const now = new Date();
  const range = now.getTime() - START_DATE.getTime();
  const randomMs = Math.floor(Math.random() * range);
  const date = new Date(START_DATE.getTime() + randomMs);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function fetchOfficialPuzzle(): Promise<ConvertedPuzzle | null> {
  try {
    const date = randomDateString();
    const column = DIFFICULTY_COLUMNS[Math.floor(Math.random() * DIFFICULTY_COLUMNS.length)];

    const url = `${SUPABASE_URL}?select=${column}&print_date=eq.${date}&type=eq.pips&limit=1`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.pgrst.object+json',
        'accept-profile': 'public',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const row = await res.json();
    if (!row) return null;

    const puzzleData = row[column];
    if (!puzzleData?.regions || !puzzleData?.dominoes || !puzzleData?.solution) {
      return null;
    }

    // Format date for display: "18TH AUGUST" style
    const d = new Date(date + 'T00:00:00');
    const day = d.getDate();
    const suffix = [,'ST','ND','RD'][day % 10 > 3 ? 0 : (day % 100 - day % 10 !== 10 ? day % 10 : 0)] || 'TH';
    const month = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
    const source = `PIPS FROM ${day}${suffix} ${month} ${DIFFICULTY_LABELS[column]}`;

    return convertExternalPuzzle(puzzleData, source);
  } catch {
    // Network error, timeout, bad data, puzzle too large — silently fail
    return null;
  }
}
