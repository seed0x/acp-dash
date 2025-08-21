// src/types/ops.ts
export type KPI = {
  postAndBeam: number;
  activeBids: number;
  jobAccountsPending: number;
  openProblems: number;
};

export type ProjectRow = {
  id: string;
  name: string;
  // add fields you actually use...
};

export type OpsProps = {
  initialKpis: KPI;
  initialPendingAcct: ProjectRow[];
};
