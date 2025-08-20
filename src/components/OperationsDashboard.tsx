// src/components/OperationsDashboard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

/* ---------- Types ---------- */
type KPI = {
  postAndBeam: number;
  activeBids: number;
  jobAccountsPending: number;
  openProblems: number;
};

type ProjectRow = {
  id: string;
  title: string;
  client?: string;
  location?: string;
  status?: string;
};

type ImprovementRow = {
  id: string;
  title: string;
  status?: string;
  projectId?: string;
};

type BoardItem = {
  id: string;
  title: string;
  status?: string;
  client?: string;
  location?: string;
};

type TaskRow = { id: string; title: string; status?: string; assignee?: string; due?: string };
type UpgradeRow = { id: string; title: string; status?: string; action?: string };
type ExpenseRow = { id: string; name: string; category?: string; value?: number };
type TimeRow = { id: string; name: string; person?: string; date?: string; hours?: number };
type NoteRow = { id: string; title: string; created?: string };
type DocRow = { id: string; title: string; description?: string };

type ProjectFull = {
  project: {
    id: string;
    title: string;
    status?: string;
    client?: string;
    location?: string;
    deadline?: string;
    jobAccount?: boolean;
    followUp?: boolean;
    budget?: number;
    spent?: number;
    // server totals
    totalExpenses?: number;
    totalHours?: number;
    openTasks?: number;
    openImprovements?: number;
  };
  tasks: TaskRow[];
  improvements: UpgradeRow[];
  expenses: ExpenseRow[];
  time: TimeRow[];
  notes: NoteRow[];
  docs: DocRow[];
};

/* ---------- Helpers ---------- */
async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...(init || {}) });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // ignore parse error; handled below
  }
  if (!res.ok) throw new Error((data?.error || data?.message) ?? `${res.status} ${res.statusText}`);
  return data as T;
}

function fmtMoney(n?: number | null) {
  if (n == null) return "-";
  try {
    return Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
  } catch {
    return String(n);
  }
}

/* ---------- Component ---------- */
export default function OperationsDashboard() {
  // KPIs + sections
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [pendingAcct, setPendingAcct] = useState<ProjectRow[]>([]);
  const [problems, setProblems] = useState<ImprovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Details drawer
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState<"Overview" | "Upgrades" | "Tasks" | "Expenses" | "Time" | "Notes" | "Docs">(
    "Overview"
  );

  // Board / real server search (debounced)
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>(["All"]);
  const [status, setStatus] = useState<string>("All");

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  // debounce the text input into "query" (actual fetch trigger)
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Job Accounts local filter
  const [acctFilter, setAcctFilter] = useState("");

  /* ----- Loaders ----- */
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, p, pr] = await Promise.all([
        fetchJSON<{ kpis: KPI }>("/api/dashboard/summary").then((d) => d.kpis),
        fetchJSON<{ rows: ProjectRow[] }>("/api/projects/job-account").then((d) => d.rows),
        fetchJSON<{ rows: ImprovementRow[] }>("/api/improvements?openOnly=true").then((d) => d.rows),
      ]);
      setKpis(k);
      setPendingAcct(p);
      setProblems(pr);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadBoard = async () => {
    setError(null);
    const qs = new URLSearchParams();
    if (query) qs.set("q", query);
    if (status && status !== "All") qs.set("status", status);
    try {
      const { items, statusOptions } = await fetchJSON<{ items: BoardItem[]; statusOptions: string[] }>(
        `/api/projects/board?${qs}`
      );
      setBoardItems(items);
      setStatusOptions(["All", ...statusOptions]);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  // fetch board initially & whenever query/status change
  useEffect(() => {
    loadBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status]);

  const grouped = useMemo(() => {
    const map: Record<string, BoardItem[]> = {};
    for (const it of boardItems) {
      const col = it.status || "Uncategorized";
      if (!map[col]) map[col] = [];
      map[col].push(it);
    }
    return map;
  }, [boardItems]);

  const filteredPending = useMemo(() => {
    const q = acctFilter.trim().toLowerCase();
    if (!q) return pendingAcct;
    return pendingAcct.filter((p) => [p.title, p.client, p.location].some((v) => (v || "").toLowerCase().includes(q)));
  }, [acctFilter, pendingAcct]);

  /* ----- Actions ----- */
  const openProject = async (id?: string | null) => {
    if (!id) return;
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    setError(null);
    setTab("Overview");
    try {
      const data = await fetchJSON<ProjectFull>(`/api/projects/${id}/full`);
      setDetail(data);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setDetailLoading(false);
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="container-responsive p-4 sm:p-6 space-y-6 bg-[var(--bg)] text-white min-h-screen">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold">ACP — Operations</h1>
        <div className="text-sm text-[var(--muted)]">
          Post &amp; Beam • Job Accounts • Upgrades • Bids • Problems
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-3 border border-red-500/30 bg-red-900/20 text-sm">
          <div className="font-semibold">Something went wrong</div>
          <div className="mt-1">{error}</div>
          <div className="mt-1">
            <a className="underline" href="/api/health" target="_blank" rel="noreferrer">
              /api/health
            </a>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <Kpi title="Post & Beam" value={kpis?.postAndBeam ?? 0} />
        <Kpi title="Active Bids" value={kpis?.activeBids ?? 0} />
        <Kpi title="Job Accounts Pending" value={kpis?.jobAccountsPending ?? 0} />
        <Kpi title="Open Problems" value={kpis?.openProblems ?? 0} />
        {loading && Array.from({ length: 2 }).map((_, i) => <div key={i} className="card p-4 skeleton h-[74px]" />)}
      </div>

      {/* Job Accounts (scrollable box) */}
      <section className="card">
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
          <div className="font-semibold">Job Account Created — Checklist</div>
          <div className="flex items-center gap-2">
            <input
              value={acctFilter}
              onChange={(e) => setAcctFilter(e.target.value)}
              placeholder="Filter jobs…"
              className="px-3 py-1.5 rounded bg-black/30 border border-[var(--border)] text-sm"
            />
            <button onClick={load} className="btn">
              Refresh
            </button>
          </div>
        </div>
        <div className="p-3">
          {loading && <RowsSkeleton count={4} />}
          {!loading && filteredPending.length === 0 && <Empty text="All projects have job accounts created." />}
          <div className="grid gap-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredPending.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between p-2 rounded bg-black/20 border border-[var(--border)]"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{row.title || "Untitled"}</div>
                  <div className="text-xs text-[var(--muted)] truncate">
                    {[row.client, row.location].filter(Boolean).join(" • ")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="btn" onClick={() => openProject(row.id)}>
                    View
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      try {
                        await fetch("/api/projects/job-account", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: row.id, value: true }),
                        });
                        await load();
                      } catch (e: any) {
                        setError(e?.message || String(e));
                      }
                    }}
                  >
                    Mark Created
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search + Kanban */}
      <section className="card">
        <div className="p-3 border-b border-[var(--border)]">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search jobs by name, client, or address…"
              className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] flex-1"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] sm:w-60"
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-3">
          {!Object.keys(grouped).length && <Empty text="No jobs match your filters." />}
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {Object.entries(grouped).map(([col, rows]) => (
              <div key={col} className="card p-3 bg-black/30">
                <div className="font-semibold mb-2">
                  {col} <span className="text-xs text-[var(--muted)]">({rows.length})</span>
                </div>
                <div className="grid gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {rows.map((r) => (
                    <div key={r.id} className="rounded bg-black/20 border border-[var(--border)] p-2">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-xs text-[var(--muted)] truncate">
                        {[r.client, r.location].filter(Boolean).join(" • ")}
                      </div>
                      <div className="mt-2">
                        <button className="btn btn-primary" onClick={() => openProject(r.id)}>
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="card">
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
          <div className="font-semibold">Active Problems</div>
          <button onClick={load} className="btn">
            Refresh
          </button>
        </div>
        <div className="p-3">
          {loading && <RowsSkeleton count={3} />}
          {!loading && problems.length === 0 && <Empty text="No open problems. Nice!" />}
          <div className="grid gap-2">
            {problems.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded bg-black/20 border border-[var(--border)]"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.title}</div>
                  <div className="text-xs text-[var(--muted)] truncate">{p.status || "Open"}</div>
                </div>
                <div className="flex items-center gap-2">
                  {p.projectId && (
                    <button className="btn" onClick={() => openProject(p.projectId!)}>
                      View Job
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      try {
                        await fetch("/api/improvements", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: p.id, status: "Done" }),
                        });
                        await load();
                      } catch (e: any) {
                        setError(e?.message || String(e));
                      }
                    }}
                  >
                    Mark Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Details drawer */}
      {openId && (
        <DetailsPanel onClose={() => setOpenId(null)} loading={detailLoading} data={detail} tab={tab} setTab={setTab} />
      )}
    </div>
  );
}

/* ---------- UI Bits ---------- */
function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-[var(--muted)]">{text}</div>;
}

function RowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[52px] rounded skeleton" />
      ))}
    </div>
  );
}

/* ---------- Details Drawer with richer Overview ---------- */
function DetailsPanel({
  onClose,
  loading,
  data,
  tab,
  setTab,
}: {
  onClose: () => void;
  loading: boolean;
  data: ProjectFull | null;
  tab: "Overview" | "Upgrades" | "Tasks" | "Expenses" | "Time" | "Notes" | "Docs";
  setTab: (t: typeof tab) => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      {/* panel */}
      <div
        className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[min(1100px,95vw)] sm:rounded-l-2xl
                      bg-[#0c1220] border border-[var(--border)] sm:border-r-0 overflow-hidden"
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="font-semibold truncate">{data?.project.title || "Job Details"}</div>
          <button onClick={onClose} className="btn">
            Close
          </button>
        </div>

        {/* tabs (sticky) */}
        <div className="px-4 py-2 border-b border-[var(--border)] sticky top-0 bg-[#0c1220] z-10">
          <div className="flex flex-wrap gap-2 text-sm">
            {(["Overview", "Upgrades", "Tasks", "Expenses", "Time", "Notes", "Docs"] as const).map((t) => (
              <button
                key={t}
                className={`px-3 py-1 rounded ${tab === t ? "bg-slate-600" : "bg-slate-800 hover:bg-slate-700"}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* content */}
        <div className="p-4 overflow-auto max-h-[75vh] sm:max-h-none sm:h-[calc(100vh-110px)]">
          {loading && (
            <div className="grid gap-3">
              <div className="h-16 skeleton rounded" />
              <div className="h-16 skeleton rounded" />
              <div className="h-16 skeleton rounded" />
            </div>
          )}

          {!loading && data && (
            <>
              {tab === "Overview" && (
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <Info title="Status" value={data.project.status || "-"} />
                  <Info title="Client" value={data.project.client || "-"} />
                  <Info title="Location" value={data.project.location || "-"} />
                  <Info title="Deadline" value={data.project.deadline || "-"} />
                  <Info title="Job Account Created" value={data.project.jobAccount ? "Yes" : "No"} />
                  <Info title="Follow-up Needed" value={data.project.followUp ? "Yes" : "No"} />
                  <Info title="Budget" value={fmtMoney(data.project.budget)} />
                  <Info title="Spent" value={fmtMoney(data.project.spent)} />
                  {/* Extra totals coming from API */}
                  <Info title="Total Expenses" value={fmtMoney(data.project.totalExpenses)} />
                  <Info title="Total Hours" value={data.project.totalHours ?? "-"} />
                  <Info title="Open Tasks" value={data.project.openTasks ?? "-"} />
                  <Info title="Open Problems" value={data.project.openImprovements ?? "-"} />
                </div>
              )}

              {tab === "Upgrades" && (
                <List
                  items={data.improvements}
                  cols={["title", "status", "action"]}
                  headers={["Title", "Status", "Action"]}
                  empty="No upgrades/problems."
                />
              )}

              {tab === "Tasks" && (
                <List
                  items={data.tasks}
                  cols={["title", "status", "assignee", "due"]}
                  headers={["Task", "Status", "Assignee", "Due"]}
                  empty="No tasks."
                />
              )}

              {tab === "Expenses" && (
                <List
                  items={data.expenses.map((e) => ({ ...e, title: e.name, value: fmtMoney(e.value) }))}
                  cols={["title", "category", "value"]}
                  headers={["Expense", "Category", "Value"]}
                  empty="No expenses."
                />
              )}

              {tab === "Time" && (
                <List
                  items={data.time}
                  cols={["name", "person", "date", "hours"]}
                  headers={["Entry", "Person", "Date", "Hours"]}
                  empty="No time entries."
                />
              )}

              {tab === "Notes" && (
                <List items={data.notes} cols={["title", "created"]} headers={["Note", "Created"]} empty="No notes." />
              )}

              {tab === "Docs" && (
                <List
                  items={data.docs}
                  cols={["title", "description"]}
                  headers={["Document", "Description"]}
                  empty="No docs."
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-lg bg-black/20 border border-[var(--border)] p-3">
      <div className="text-xs text-[var(--muted)]">{title}</div>
      <div className="font-medium">{value ?? "-"}</div>
    </div>
  );
}

function List({ items, cols, headers, empty }: { items: any[]; cols: string[]; headers: string[]; empty: string }) {
  if (!items.length) return <div className="text-sm text-[var(--muted)]">{empty}</div>;
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)]">
            {headers.map((h) => (
              <th key={h} className="py-2 pr-4 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-[var(--border)]">
              {cols.map((c) => (
                <td key={c} className="py-2 pr-4">
                  {(it as any)[c] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


