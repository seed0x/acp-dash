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
      listImprovements(true), // open only
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
    console.error('Dashboard summary API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Server error',
      kpis: {
        postAndBeam: 0,
        activeBids: 0,
        jobAccountsPending: 0,
        openProblems: 0,
      }
    }, { status: 500 })
  }
}