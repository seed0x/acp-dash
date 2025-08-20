// src/app/page.tsx
import KanbanBoard from '../components/KanbanBoard'

export default function Page() {
  return (
    <main className="max-w-7xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">ACP — Notion CRM Board</h1>
      <p className="text-sm text-[var(--muted)]">
        Post & Beam → Top Out → Trim → Ready to Invoice • Search • Bulk move
      </p>
      <KanbanBoard />
    </main>
  )
}

