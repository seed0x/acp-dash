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
  ] as const).catch(err => {
    console.error("Failed to fetch initial data:", err);
    return [0, [], [], []] as const;
  });

  const initialKpis = {
    postAndBeam: postBeamCount,
    activeBids: bids.length,
    jobAccountsPending: pendingAcct.length,
    openProblems: improvements.length,
  };

  return (
    <div className="max-w-screen-xl mx-auto">
      <OperationsDashboard
        initialKpis={initialKpis}
        initialPendingAcct={[...pendingAcct]}
      />
    </div>
  )
}