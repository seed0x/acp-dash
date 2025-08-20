import OperationsDashboard from '@/components/OperationsDashboard'

export default function Page() {
  return (
    <main className="max-w-7xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">ACP — Operations</h1>
      <p className="text-sm text-[var(--muted)]">
        Post &amp; Beam total • Job Account checklist • Upgrades per lot • Active bids & follow-ups • Active problems
      </p>
      <OperationsDashboard />
    </main>
  )
}


