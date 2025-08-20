import { NextResponse } from 'next/server'
import { countPostAndBeam, listBids, listJobAccountPending, listImprovements } from '@/lib/notion-dashboard'

export async function GET() {
  try {
    const [postAndBeam, bids, pendingAcct, problems] = await Promise.all([
      countPostAndBeam(),
      listBids(),
      listJobAccountPending(),
      listImprovements({ openOnly: true })
    ])
    return NextResponse.json({
      kpis: {
        postAndBeam,
        activeBids: bids.length,
        jobAccountsPending: pendingAcct.length,
        openProblems: problems.length,
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
