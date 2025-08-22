// src/app/page.tsx
import OperationsDashboard from '@/components/OperationsDashboardNew'
import {
  countPostAndBeam,
  listBids,
  listJobAccountPending,
  listImprovements,
} from '@/lib/notion-dashboard'

export const revalidate = 60 // Re-fetch data every 60 seconds

export default async function Page() {
  // Fetch data on the server for a faster initial load with better error handling
  let initialKpis = {
    postAndBeam: 0,
    activeBids: 0,
    jobAccountsPending: 0,
    openProblems: 0,
  };

  try {
    const [postBeamCount, bids, pendingAcct, improvements] = await Promise.all([
      countPostAndBeam().catch(() => 0),
      listBids().catch(() => []),
      listJobAccountPending().catch(() => []),
      listImprovements(true).catch(() => []),
    ]);

    initialKpis = {
      postAndBeam: postBeamCount,
      activeBids: bids.length,
      jobAccountsPending: pendingAcct.length,
      openProblems: improvements.length,
    };
  } catch (err) {
    console.error("Failed to fetch initial data:", err);
    // KPIs will remain at default values
  }

  return (
    <div className="max-w-screen-xl mx-auto">
      <OperationsDashboard
        initialKpis={initialKpis}
      />
    </div>
  )
}