// src/app/api/projects/board/route.ts
import { NextResponse } from 'next/server';
import { listProjectsBoard } from '@/lib/notion-dashboard';

export async function GET(req: Request) {
  try {
    if (!process.env.NOTION_TOKEN) {
      return NextResponse.json({ error: 'Notion token missing' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;
    const status = searchParams.get('status') || undefined;

    const data = await listProjectsBoard({ q, status });
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unexpected error' }, { status: 500 });
  }
}

