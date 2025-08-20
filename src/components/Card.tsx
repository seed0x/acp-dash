'use client'

export type CardProps = {
  title: string
  customer?: string
  address?: string
  amount?: number | null
  due?: string | null
  notionUrl?: string
  /** selection state controlled by parent */
  selected?: boolean
  /** toggle handler provided by parent */
  onSelect?: () => void
}

export default function Card(props: CardProps) {
  const { title, customer, address, amount, due, notionUrl, selected, onSelect } = props

  return (
    <div className={"rounded-xl p-3 bg-[var(--card)] border " + (selected ? "border-indigo-400" : "border-white/10")}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">{title}</div>
        <input
          type="checkbox"
          checked={!!selected}
          onChange={onSelect}
          aria-label="Select card"
        />
      </div>

      {customer && <div className="text-sm text-[var(--muted)] mt-1">{customer}</div>}
      {address && <div className="text-xs text-[var(--muted)]">{address}</div>}

      <div className="flex justify-between text-xs mt-2">
        <span>{amount != null ? `$${amount.toLocaleString()}` : ''}</span>
        <span>{due ? new Date(due).toLocaleDateString() : ''}</span>
      </div>

      {notionUrl && (
        <a className="text-xs underline mt-2 inline-block" href={notionUrl} target="_blank" rel="noreferrer">
          Open in Notion
        </a>
      )}
    </div>
  )
}
