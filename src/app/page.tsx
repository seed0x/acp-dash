import OperationsDashboard from '@/components/OperationsDashboard'
import {
  countPostAndBeam,
  listBids,
  listJobAccountPending,
  listImprovements,
} from '@/lib/notion-dashboard'

export const revalidate = 60 // Re-fetch data every 60 seconds

export default async function Page() {
  // Fetch data on the server for a faster initial load
  const [postBeamCount, bids, pendingAcct, improvements] = await Promise.all([
    countPostAndBeam(),
    listBids(),
    listJobAccountPending(),
    listImprovements(true),
  ]).catch(err => {
    console.error("Failed to fetch initial data:", err);
    return [0, [], [], []]; // Return default values on error
  });

  const initialKpis = {
    postAndBeam: postBeamCount,
    activeBids: bids.length,
    jobAccountsPending: pendingAcct.length,
    openProblems: improvements.length,
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-4">
      <p className="text-sm text-[var(--muted)]">
        A real-time dashboard for job tracking, upgrades, and active issues.
      </p>
      <OperationsDashboard
        initialKpis={initialKpis}
        initialPendingAcct={pendingAcct}
        initialProblems={improvements}
      />
    </div>
  )
}