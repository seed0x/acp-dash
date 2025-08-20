// src/app/api/projects/[id]/full/route.ts
import { NextResponse } from 'next/server';
import { getProjectFull } from '@/lib/notion-dashboard';

export async function GET(_: Request, ctx: { params: { id: string } }) {
  try {
    if (!process.env.NOTION_TOKEN) {
      return NextResponse.json({ error: 'Notion token missing' }, { status: 401 });
    }
    const id = ctx.params.id;
    const data = await getProjectFull(id);
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unexpected error' }, { status: 500 });
  }
}
