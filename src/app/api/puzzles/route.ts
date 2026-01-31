import { NextRequest, NextResponse } from 'next/server';

const store = new Map<string, { board: unknown; placedDominoes: unknown }>();

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { board, placedDominoes } = body;

  if (!board || !placedDominoes) {
    return NextResponse.json({ error: 'Missing board or placedDominoes' }, { status: 400 });
  }

  let code = generateCode();
  while (store.has(code)) {
    code = generateCode();
  }

  store.set(code, { board, placedDominoes });

  return NextResponse.json({ code }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const puzzle = store.get(code);

  if (!puzzle) {
    return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
  }

  return NextResponse.json(puzzle);
}
