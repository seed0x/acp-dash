// src/app/api/dashboard/summary/route.ts
import { NextResponse } from 'next/server'
import {
  countPostAndBeam,
  listBids,
  listJobAccountPending,
  listImprovements,
} from '@/lib/notion-dashboard'

export async function GET() {
  try {
    const [postBeamCount, bids, pendingAcct, improvements] = await Promise.all([
      countPostAndBeam(),
      listBids(),
      listJobAccountPending(),
      listImprovements(true), // <-- boolean, not object
    ])

    return NextResponse.json({
      kpis: {
        postAndBeam: postBeamCount,
        activeBids: bids.length,
        jobAccountsPending: pendingAcct.length,
        openProblems: improvements.length,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
