// src/app/page.tsx
import ProjectsBoard from '@/components/ProjectsBoard'

export default function Page() {
  return (
    <main className="max-w-7xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">ACP — Projects</h1>
      <p className="text-sm text-[var(--muted)]">Project status by column • Search • Budget vs Spent</p>
      <ProjectsBoard />
    </main>
  )
}


