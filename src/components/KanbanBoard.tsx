'use client'

import { useEffect, useMemo, useState } from 'react'
import Card from './Card'
import TopBar from './TopBar'

export type UIItem = {
  id: string
  dbId: string
  title: string
  type?: string
  stage?: string
  customer?: string
  address?: string
  amount?: number | null
  due?: string | null
  notionUrl?: string
}

const STAGES = ['Post & Beam', 'Top Out', 'Trim', 'Ready to Invoice'] as const

export default function KanbanBoard() {
  const [items, setItems] = useState<UIItem[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [type, setType] = useState('All')
  const [query, setQuery] = useState('')

  const fetchItems = async (opts?: { q?: string; t?: string }) => {
    const q = opts?.q ?? query
    const t = opts?.t ?? type
    setLoading(true)
    try {
      const res = await fetch(`/api/notion/list?type=${encodeURIComponent(t)}&query=${encodeURIComponent(q)}`, { cache: 'no-store' })
      const data = await res.json()
      setItems(Array.isArray(data.items) ? data.items : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const grouped = useMemo(() => {
    const g: Record<string, UIItem[]> = { 'Post & Beam': [], 'Top Out': [], 'Trim': [], 'Ready to Invoice': [] }
    for (const it of items) {
      const stage = (it.stage && STAGES.includes(it.stage as any)) ? it.stage! : 'Post & Beam'
      g[stage].push(it)
    }
    return g
  }, [items])

  const toggle = (id: string) => setSelected(s => ({ ...s, [id]: !s[id] }))

  const bulkMove = async (stage: string) => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
    if (!ids.length) return
    setRefreshing(true)
    try {
      await Promise.all(ids.map(id =>
        fetch('/api/notion/update', { method: 'POST', body: JSON.stringify({ id, stage }) })
      ))
      await fetchItems()
      setSelected({})
    } finally {
      setRefreshing(false)
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length

  return (
    <div className="space-y-3">
      <TopBar
        onSearch={(q) => { setQuery(q); fetchItems({ q }) }}
        onTypeChange={(t) => { setType(t); fetchItems({ t }) }}
        selectedCount={selectedCount}
        onBulkMove={bulkMove}
        stages={[...STAGES]}
        refreshing={refreshing}
        onRefresh={() => fetchItems()}
      />
      <div className="flex gap-3 overflow-x-auto">
        {([...'Post & Beam,Top Out,Trim,Ready to Invoice'.split(',')] as string[]).map(stage => (
          <div key={stage} className="min-w-[320px] w-full">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">{stage}</h2>
              <button onClick={() => bulkMove(stage)} className="text-xs underline">Move selected here</button>
            </div>
            <div className="grid gap-2">
              {(grouped[stage] || []).map(it => (
                <Card key={it.id} {...it} selected={!!selected[it.id]} onSelect={() => toggle(it.id)} />
              ))}
              {loading && <div className="text-sm text-[var(--muted)]">Loading…</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
