// src/components/ProjectCard.tsx
'use client'

export type ProjectCardProps = {
  title: string
  client?: string
  location?: string
  deadline?: string | null
  budget?: number | null
  spent?: number | null
  url?: string
  selected?: boolean
  onSelect?: () => void
}

export default function ProjectCard(props: ProjectCardProps) {
  const { title, client, location, deadline, budget, spent, url, selected, onSelect } = props
  const delta = (budget != null && spent != null) ? (budget - spent) : null

  return (
    <div className={"rounded-xl p-3 bg-[var(--card)] border " + (selected ? "border-indigo-400" : "border-white/10")}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">{title}</div>
        <input type="checkbox" checked={!!selected} onChange={onSelect} aria-label="Select card" />
      </div>

      <div className="text-xs text-[var(--muted)] mt-1 space-y-0.5">
        {client && <div><span className="opacity-70">Client:</span> {client}</div>}
        {location && <div><span className="opacity-70">Location:</span> {location}</div>}
        {deadline && <div><span className="opacity-70">Deadline:</span> {new Date(deadline).toLocaleDateString()}</div>}
      </div>

      {(budget != null || spent != null) && (
        <div className="text-xs mt-2 flex items-center justify-between">
          <span>Budget: {budget != null ? `$${budget.toLocaleString()}` : '—'}</span>
          <span>Spent: {spent != null ? `$${spent.toLocaleString()}` : '—'}</span>
        </div>
      )}

      {delta != null && (
        <div className={"text-xs mt-1 " + (delta < 0 ? "text-red-400" : "text-emerald-400")}>
          {delta < 0 ? 'Over' : 'Remaining'}: ${Math.abs(delta).toLocaleString()}
        </div>
      )}

      {url && <a className="text-xs underline mt-2 inline-block" href={url} target="_blank" rel="noreferrer">Open in Notion</a>}
    </div>
  )
}
