// src/app/api/projects/board/route.ts
import { NextResponse } from 'next/server';
import { listProjectsBoard } from '@/lib/notion-dashboard';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const status = url.searchParams.get('status') || 'All';

    // This will now include subdivision data and search through it
    const data = await listProjectsBoard({ q, status });
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('Projects board API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to fetch projects',
      items: [],
      statusOptions: []
    }, { status: 500 });
  }
}