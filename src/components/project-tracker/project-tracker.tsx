// src/components/project-tracker/project-tracker.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Users,
  Briefcase,
  TrendingUp,
  ArrowRightToLine,
  Archive,
  ArchiveRestore,
  Activity,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTHS_COUNT = MONTH_LABELS.length;
const YEAR_LABEL = '2026';

interface Employee {
  id: string;
  name: string;
  monthlySalary: number[];
  overheadMultiple: number;
}

interface Assignment {
  id: string;
  employeeId: string;
  monthlyAllocation: number[];
}

type ProjectStatus = 'active' | 'retired';

interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  monthlyRevenue: number[];
  assignments: Assignment[];
}

interface Store {
  employees: Employee[];
  projects: Project[];
}

const FIRESTORE_COLLECTION = 'tools';
const FIRESTORE_DOC = 'projectTracker';
const SAVE_DEBOUNCE_MS = 600;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const emptyStore = (): Store => ({ employees: [], projects: [] });

const fitArray = (arr: any, length: number, fill = 0): number[] => {
  const safe = Array.isArray(arr)
    ? arr.map(v => (Number.isFinite(Number(v)) ? Number(v) : fill))
    : [];
  if (safe.length >= length) return safe.slice(0, length);
  return [...safe, ...Array(length - safe.length).fill(fill)];
};

const migrateEmployee = (raw: any): Employee => {
  let monthlySalary: number[];
  if (Array.isArray(raw?.monthlySalary)) {
    monthlySalary = fitArray(raw.monthlySalary, MONTHS_COUNT);
  } else if (Number.isFinite(Number(raw?.baseSalary))) {
    monthlySalary = Array(MONTHS_COUNT).fill(Number(raw.baseSalary) / 12);
  } else {
    monthlySalary = Array(MONTHS_COUNT).fill(0);
  }
  const overheadMultiple = Number.isFinite(Number(raw?.overheadMultiple))
    ? Number(raw.overheadMultiple)
    : 1.5;
  return {
    id: raw?.id || newId(),
    name: raw?.name || '',
    monthlySalary,
    overheadMultiple,
  };
};

const migrateProject = (raw: any): Project => {
  let monthlyRevenue: number[];
  if (Array.isArray(raw?.monthlyRevenue)) {
    monthlyRevenue = fitArray(raw.monthlyRevenue, MONTHS_COUNT);
  } else if (Number.isFinite(Number(raw?.monthlyRevenue))) {
    monthlyRevenue = Array(MONTHS_COUNT).fill(Number(raw.monthlyRevenue));
  } else {
    monthlyRevenue = Array(MONTHS_COUNT).fill(0);
  }

  const assignments: Assignment[] = (
    Array.isArray(raw?.assignments) ? raw.assignments : []
  ).map((a: any) => {
    let monthlyAllocation: number[];
    if (Array.isArray(a?.monthlyAllocation)) {
      monthlyAllocation = fitArray(a.monthlyAllocation, MONTHS_COUNT);
    } else if (Number.isFinite(Number(a?.allocation))) {
      const oldMonths = Math.max(
        0,
        Math.min(MONTHS_COUNT, Math.floor(Number(a?.months) || 0)),
      );
      monthlyAllocation = Array(MONTHS_COUNT).fill(0);
      for (let i = 0; i < oldMonths; i++)
        monthlyAllocation[i] = Number(a.allocation);
    } else {
      monthlyAllocation = Array(MONTHS_COUNT).fill(0);
    }
    return {
      id: a?.id || newId(),
      employeeId: a?.employeeId || '',
      monthlyAllocation,
    };
  });

  return {
    id: raw?.id || newId(),
    name: raw?.name || '',
    status: raw?.status === 'retired' ? 'retired' : 'active',
    monthlyRevenue,
    assignments,
  };
};

const sanitizeStore = (raw: any): Store => ({
  employees: Array.isArray(raw?.employees) ? raw.employees.map(migrateEmployee) : [],
  projects: Array.isArray(raw?.projects) ? raw.projects.map(migrateProject) : [],
});

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(isFinite(n) ? n : 0);

const fmtPct = (n: number) => (isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—');
const fmtUtil = (n: number) => (isFinite(n) ? `${Math.round(n * 100)}%` : '—');

const empMonthCost = (e: Employee, monthIdx: number) =>
  (e.monthlySalary[monthIdx] ?? 0) * (e.overheadMultiple ?? 1);

const empTotalCost = (e: Employee) => {
  let total = 0;
  for (let i = 0; i < MONTHS_COUNT; i++) total += empMonthCost(e, i);
  return total;
};

const projectMonthCost = (p: Project, monthIdx: number, employees: Employee[]) =>
  p.assignments.reduce((s, a) => {
    const emp = employees.find(e => e.id === a.employeeId);
    if (!emp) return s;
    return s + empMonthCost(emp, monthIdx) * (a.monthlyAllocation[monthIdx] ?? 0);
  }, 0);

const projectRevenue = (p: Project) =>
  p.monthlyRevenue.reduce((s, r) => s + (Number(r) || 0), 0);

const projectCost = (p: Project, employees: Employee[]) => {
  let total = 0;
  for (let i = 0; i < MONTHS_COUNT; i++)
    total += projectMonthCost(p, i, employees);
  return total;
};

const empMonthUtilization = (
  empId: string,
  monthIdx: number,
  projects: Project[],
) =>
  projects
    .filter(p => p.status === 'active')
    .reduce((s, p) => {
      const a = p.assignments.find(x => x.employeeId === empId);
      return a ? s + (a.monthlyAllocation[monthIdx] ?? 0) : s;
    }, 0);

const utilizationTone = (u: number): 'positive' | 'negative' | 'neutral' => {
  if (u > 1.0) return 'negative';
  if (u >= 0.8) return 'positive';
  return 'neutral';
};

export default function ProjectTracker() {
  const [store, setStore] = useState<Store>(emptyStore);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const hasLoaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
        const snap = await getDoc(ref);
        if (cancelled) return;
        if (snap.exists()) {
          setStore(sanitizeStore(snap.data()));
        }
      } catch (err) {
        console.error('Failed to load project tracker from Firestore:', err);
      } finally {
        if (!cancelled) {
          hasLoaded.current = true;
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(async () => {
      try {
        const ref = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
        await setDoc(ref, store, { merge: false });
        setSaveState('saved');
      } catch (err) {
        console.error('Failed to save project tracker to Firestore:', err);
        setSaveState('error');
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [store]);

  const { employees, projects } = store;

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === 'active' ? -1 : 1;
    });
  }, [projects]);

  const rollup = useMemo(() => {
    const active = projects.filter(p => p.status === 'active');
    const revenue = active.reduce((s, p) => s + projectRevenue(p), 0);
    const cost = active.reduce((s, p) => s + projectCost(p, employees), 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? profit / revenue : 0;
    return { revenue, cost, profit, margin };
  }, [projects, employees]);

  const addEmployee = () =>
    setStore(s => ({
      ...s,
      employees: [
        ...s.employees,
        {
          id: newId(),
          name: '',
          monthlySalary: Array(MONTHS_COUNT).fill(0),
          overheadMultiple: 1.5,
        },
      ],
    }));

  const updateEmployeeFields = (
    id: string,
    patch: Partial<Pick<Employee, 'name' | 'overheadMultiple'>>,
  ) =>
    setStore(s => ({
      ...s,
      employees: s.employees.map(e => (e.id === id ? { ...e, ...patch } : e)),
    }));

  const setEmployeeMonthlySalary = (
    id: string,
    monthIdx: number,
    value: number,
  ) =>
    setStore(s => ({
      ...s,
      employees: s.employees.map(e => {
        if (e.id !== id) return e;
        const next = [...e.monthlySalary];
        next[monthIdx] = value;
        return { ...e, monthlySalary: next };
      }),
    }));

  const fillEmployeeMonthlySalary = (id: string) =>
    setStore(s => ({
      ...s,
      employees: s.employees.map(e => {
        if (e.id !== id) return e;
        const v = e.monthlySalary[0] ?? 0;
        return { ...e, monthlySalary: Array(MONTHS_COUNT).fill(v) };
      }),
    }));

  const removeEmployee = (id: string) =>
    setStore(s => ({
      employees: s.employees.filter(e => e.id !== id),
      projects: s.projects.map(p => ({
        ...p,
        assignments: p.assignments.filter(a => a.employeeId !== id),
      })),
    }));

  const addProject = () =>
    setStore(s => ({
      ...s,
      projects: [
        ...s.projects,
        {
          id: newId(),
          name: '',
          status: 'active',
          monthlyRevenue: Array(MONTHS_COUNT).fill(0),
          assignments: [],
        },
      ],
    }));

  const updateProjectFields = (id: string, patch: Partial<Pick<Project, 'name'>>) =>
    setStore(s => ({
      ...s,
      projects: s.projects.map(p => (p.id === id ? { ...p, ...patch } : p)),
    }));

  const toggleProjectStatus = (id: string) =>
    setStore(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.id !== id
          ? p
          : { ...p, status: p.status === 'active' ? 'retired' : 'active' },
      ),
    }));

  const removeProject = (id: string) =>
    setStore(s => ({ ...s, projects: s.projects.filter(p => p.id !== id) }));

  const setMonthlyRevenue = (projectId: string, monthIdx: number, value: number) =>
    setStore(s => ({
      ...s,
      projects: s.projects.map(p => {
        if (p.id !== projectId) return p;
        const next = [...p.monthlyRevenue];
        next[monthIdx] = value;
        return { ...p, monthlyRevenue: next };
      }),
    }));

  const fillMonthlyRevenue = (projectId: string) =>
    setStore(s => ({
      ...s,
      projects: s.projects.map(p => {
        if (p.id !== projectId) return p;
        const v = p.monthlyRevenue[0] ?? 0;
        return { ...p, monthlyRevenue: Array(MONTHS_COUNT).fill(v) };
      }),
    }));

  const addAssignment = (projectId: string) =>
    setStore(s => ({
      ...s,
      projects: s.projects.map(p => {
        if (p.id !== projectId) return p;
        const firstEmp = s.employees[0];
        return {
          ...p,
          assignments: [
            ...p.assignments,
            {
              id: newId(),
              employeeId: firstEmp ? firstEmp.id : '',
              monthlyAllocation: Array(MONTHS_COUNT).fill(1),
            },
          ],
        };
      }),
    }));

  const setAssignmentEmployee = (
    projectId: string,
    assignmentId: string,
    employeeId: string,
  ) =>
    setStore(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.id !== projectId
          ? p
          : {
              ...p,
              assignments: p.assignments.map(a =>
                a.id === assignmentId ? { ...a, employeeId } : a,
              ),
            },
      ),
    }));

  const setMonthlyAllocation = (
    projectId: string,
    assignmentId: string,
    monthIdx: number,
    value: number,
  ) =>
    setStore(s => ({
      ...s,
      projects: s.projects.map(p => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          assignments: p.assignments.map(a => {
            if (a.id !== assignmentId) return a;
            const next = [...a.monthlyAllocation];
            next[monthIdx] = Math.max(0, value);
            return { ...a, monthlyAllocation: next };
          }),
        };
      }),
    }));

  const fillMonthlyAllocation = (projectId: string, assignmentId: string) =>
    setStore(s => ({
      ...s,
      projects: s.projects.map(p => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          assignments: p.assignments.map(a => {
            if (a.id !== assignmentId) return a;
            const v = a.monthlyAllocation[0] ?? 0;
            return { ...a, monthlyAllocation: Array(MONTHS_COUNT).fill(v) };
          }),
        };
      }),
    }));

  const removeAssignment = (projectId: string, assignmentId: string) =>
    setStore(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.id !== projectId
          ? p
          : { ...p, assignments: p.assignments.filter(a => a.id !== assignmentId) },
      ),
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const saveLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'saved'
      ? 'Saved'
      : saveState === 'error'
      ? 'Save failed'
      : '';
  const saveColor =
    saveState === 'error'
      ? 'text-red-500'
      : saveState === 'saving'
      ? 'text-gray-400'
      : 'text-green-600';

  const firstRetiredIdx = sortedProjects.findIndex(p => p.status === 'retired');

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Project Tracker</h1>
            <p className="text-sm text-gray-500">
              Tracking calendar year {YEAR_LABEL}, Jan – Dec.
            </p>
          </div>
          {saveLabel && <span className={`text-xs ${saveColor}`}>{saveLabel}</span>}
        </div>

        {/* Rollup */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <TrendingUp size={20} className="text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Portfolio Rollup</h2>
            <span className="ml-2 text-xs text-gray-400">(active projects only)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Total Revenue" value={fmtCurrency(rollup.revenue)} />
            <Stat label="Total Cost" value={fmtCurrency(rollup.cost)} />
            <Stat
              label="Total Profit"
              value={fmtCurrency(rollup.profit)}
              tone={rollup.profit >= 0 ? 'positive' : 'negative'}
            />
            <Stat
              label="Blended Margin"
              value={fmtPct(rollup.margin)}
              tone={rollup.margin >= 0 ? 'positive' : 'negative'}
            />
          </div>
        </div>

        {/* Employees */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Users size={20} className="text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">Employees</h2>
            </div>
            <button
              onClick={addEmployee}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              <Plus size={16} /> Add Employee
            </button>
          </div>

          {employees.length === 0 ? (
            <p className="text-sm text-gray-500">
              No employees yet. Add one to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-200">
                    <th className="text-left py-1.5 pr-3 font-medium w-44">Name</th>
                    <th className="text-left py-1.5 pr-3 font-medium w-20">×</th>
                    <th className="px-1 py-1.5 font-medium w-8"></th>
                    {MONTH_LABELS.map(m => (
                      <th
                        key={m}
                        className="px-1 py-1.5 font-medium text-center text-xs"
                      >
                        {m}
                      </th>
                    ))}
                    <th className="px-2 py-1.5 font-medium text-right text-xs">
                      Total
                    </th>
                    <th className="px-2 py-1.5 font-medium text-right">—</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="pr-3 py-1">
                        <input
                          type="text"
                          value={e.name}
                          onChange={ev =>
                            updateEmployeeFields(e.id, { name: ev.target.value })
                          }
                          placeholder="Name"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </td>
                      <td className="pr-3 py-1">
                        <CellInput
                          value={e.overheadMultiple}
                          step={0.1}
                          onChange={v =>
                            updateEmployeeFields(e.id, { overheadMultiple: v })
                          }
                        />
                      </td>
                      <td className="px-1 py-1">
                        <button
                          onClick={() => fillEmployeeMonthlySalary(e.id)}
                          title="Fill all months with Jan value"
                          className="text-gray-400 hover:text-blue-500"
                        >
                          <ArrowRightToLine size={14} />
                        </button>
                      </td>
                      {MONTH_LABELS.map((_, i) => (
                        <td key={i} className="px-1 py-1">
                          <CellInput
                            value={e.monthlySalary[i] ?? 0}
                            onChange={v => setEmployeeMonthlySalary(e.id, i, v)}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right text-gray-700 text-xs">
                        {fmtCurrency(empTotalCost(e))}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button
                          onClick={() => removeEmployee(e.id)}
                          className="text-gray-400 hover:text-red-500"
                          title="Remove employee"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-2">
                Enter the salary you actually pay each month. The "×" multiplier is
                the overhead factor applied on top (e.g. 1.5 = +50% overhead).
                Fully-loaded monthly cost = monthly salary × multiplier.
              </p>
            </div>
          )}
        </div>

        {/* Utilization Tracker */}
        {employees.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Activity size={20} className="text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">
                Employee Utilization
              </h2>
              <span className="ml-2 text-xs text-gray-400">
                (sum of allocations across active projects)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-200">
                    <th className="text-left py-1.5 pr-3 font-medium w-44">
                      Employee
                    </th>
                    {MONTH_LABELS.map(m => (
                      <th
                        key={m}
                        className="px-2 py-1.5 font-medium text-center text-xs"
                      >
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="pr-3 py-1.5 text-gray-700">
                        {e.name || '(unnamed)'}
                      </td>
                      {MONTH_LABELS.map((_, i) => {
                        const u = empMonthUtilization(e.id, i, projects);
                        const tone = utilizationTone(u);
                        const color =
                          tone === 'negative'
                            ? 'bg-red-50 text-red-700'
                            : tone === 'positive'
                            ? 'bg-green-50 text-green-700'
                            : u > 0
                            ? 'bg-gray-50 text-gray-700'
                            : 'text-gray-300';
                        return (
                          <td
                            key={i}
                            className={`px-2 py-1 text-center text-xs rounded ${color}`}
                          >
                            {fmtUtil(u)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-2">
                Green = 80–100%, gray = under 80%, red = over 100% (overbooked).
              </p>
            </div>
          </div>
        )}

        {/* Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Briefcase size={20} className="text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">Projects</h2>
            </div>
            <button
              onClick={addProject}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              <Plus size={16} /> Add Project
            </button>
          </div>

          {sortedProjects.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500">
                No projects yet. Add one to get started.
              </p>
            </div>
          ) : (
            sortedProjects.map((p, idx) => (
              <React.Fragment key={p.id}>
                {idx === firstRetiredIdx && firstRetiredIdx > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <div className="flex-1 border-t border-gray-300" />
                    <span className="text-xs uppercase tracking-wide text-gray-400">
                      Retired
                    </span>
                    <div className="flex-1 border-t border-gray-300" />
                  </div>
                )}
                <ProjectCard
                  project={p}
                  employees={employees}
                  onUpdateFields={patch => updateProjectFields(p.id, patch)}
                  onToggleStatus={() => toggleProjectStatus(p.id)}
                  onRemove={() => removeProject(p.id)}
                  onSetMonthlyRevenue={(i, v) => setMonthlyRevenue(p.id, i, v)}
                  onFillMonthlyRevenue={() => fillMonthlyRevenue(p.id)}
                  onAddAssignment={() => addAssignment(p.id)}
                  onSetAssignmentEmployee={(aid, eid) =>
                    setAssignmentEmployee(p.id, aid, eid)
                  }
                  onSetMonthlyAllocation={(aid, i, v) =>
                    setMonthlyAllocation(p.id, aid, i, v)
                  }
                  onFillMonthlyAllocation={aid => fillMonthlyAllocation(p.id, aid)}
                  onRemoveAssignment={aid => removeAssignment(p.id, aid)}
                />
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
}) {
  const color =
    tone === 'positive'
      ? 'text-green-600'
      : tone === 'negative'
      ? 'text-red-600'
      : 'text-gray-800';
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function CellInput({
  value,
  onChange,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step ?? 1}
      onChange={ev => {
        const n = parseFloat(ev.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      className="w-20 border border-gray-200 rounded px-1 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-200"
    />
  );
}

function ProjectCard({
  project,
  employees,
  onUpdateFields,
  onToggleStatus,
  onRemove,
  onSetMonthlyRevenue,
  onFillMonthlyRevenue,
  onAddAssignment,
  onSetAssignmentEmployee,
  onSetMonthlyAllocation,
  onFillMonthlyAllocation,
  onRemoveAssignment,
}: {
  project: Project;
  employees: Employee[];
  onUpdateFields: (patch: Partial<Pick<Project, 'name'>>) => void;
  onToggleStatus: () => void;
  onRemove: () => void;
  onSetMonthlyRevenue: (monthIdx: number, value: number) => void;
  onFillMonthlyRevenue: () => void;
  onAddAssignment: () => void;
  onSetAssignmentEmployee: (assignmentId: string, employeeId: string) => void;
  onSetMonthlyAllocation: (
    assignmentId: string,
    monthIdx: number,
    value: number,
  ) => void;
  onFillMonthlyAllocation: (assignmentId: string) => void;
  onRemoveAssignment: (assignmentId: string) => void;
}) {
  const revenue = projectRevenue(project);
  const cost = projectCost(project, employees);
  const profit = revenue - cost;
  const margin = revenue > 0 ? profit / revenue : 0;
  const monthIndices = Array.from({ length: MONTHS_COUNT }, (_, i) => i);
  const isRetired = project.status === 'retired';

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${
        isRetired ? 'opacity-70' : ''
      }`}
    >
      <div className="flex flex-wrap gap-4 items-end justify-between mb-4">
        <div className="flex flex-wrap gap-4 flex-1 min-w-0 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
              Project Name
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={project.name}
                onChange={e => onUpdateFields({ name: e.target.value })}
                placeholder="Project name"
                className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {isRetired && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded uppercase tracking-wide">
                  Retired
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleStatus}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
            title={isRetired ? 'Mark as active' : 'Retire project'}
          >
            {isRetired ? (
              <>
                <ArchiveRestore size={14} /> Reactivate
              </>
            ) : (
              <>
                <Archive size={14} /> Retire
              </>
            )}
          </button>
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500"
            title="Remove project"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 rounded-lg p-3 mb-4">
        <Stat label="Revenue" value={fmtCurrency(revenue)} />
        <Stat label="Cost" value={fmtCurrency(cost)} />
        <Stat
          label="Profit"
          value={fmtCurrency(profit)}
          tone={profit >= 0 ? 'positive' : 'negative'}
        />
        <Stat
          label="Margin"
          value={fmtPct(margin)}
          tone={margin >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">
          Month-by-Month Breakdown
        </h3>
        <button
          onClick={onAddAssignment}
          disabled={employees.length === 0}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded"
        >
          <Plus size={14} /> Add Employee
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr className="text-gray-500 border-b border-gray-200">
              <th className="text-left py-1.5 pr-3 font-medium w-48">Row</th>
              <th className="px-1 py-1.5 font-medium w-8"></th>
              {MONTH_LABELS.map(m => (
                <th
                  key={m}
                  className="px-1 py-1.5 font-medium text-center text-xs"
                >
                  {m}
                </th>
              ))}
              <th className="px-2 py-1.5 font-medium text-right text-xs">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="pr-3 py-1 text-gray-700 font-medium">Revenue</td>
              <td className="px-1 py-1">
                <button
                  onClick={onFillMonthlyRevenue}
                  title="Fill all months with Jan value"
                  className="text-gray-400 hover:text-blue-500"
                >
                  <ArrowRightToLine size={14} />
                </button>
              </td>
              {monthIndices.map(i => (
                <td key={i} className="px-1 py-1">
                  <CellInput
                    value={project.monthlyRevenue[i] ?? 0}
                    onChange={v => onSetMonthlyRevenue(i, v)}
                  />
                </td>
              ))}
              <td className="px-2 py-1 text-right text-gray-700">
                {fmtCurrency(revenue)}
              </td>
            </tr>

            {project.assignments.map(a => {
              const emp = employees.find(e => e.id === a.employeeId);
              const aTotalCost = emp
                ? a.monthlyAllocation.reduce(
                    (s, alloc, i) =>
                      s + empMonthCost(emp, i) * (alloc || 0),
                    0,
                  )
                : 0;
              return (
                <tr key={a.id} className="border-b border-gray-100">
                  <td className="pr-3 py-1">
                    <div className="flex items-center gap-1">
                      <select
                        value={a.employeeId}
                        onChange={ev =>
                          onSetAssignmentEmployee(a.id, ev.target.value)
                        }
                        className="flex-1 min-w-0 border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-200"
                      >
                        <option value="">— Select —</option>
                        {employees.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.name || '(unnamed)'}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => onRemoveAssignment(a.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Remove assignment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-1 py-1">
                    <button
                      onClick={() => onFillMonthlyAllocation(a.id)}
                      title="Fill all months with Jan value"
                      className="text-gray-400 hover:text-blue-500"
                    >
                      <ArrowRightToLine size={14} />
                    </button>
                  </td>
                  {monthIndices.map(i => (
                    <td key={i} className="px-1 py-1">
                      <CellInput
                        value={a.monthlyAllocation[i] ?? 0}
                        step={0.05}
                        onChange={v => onSetMonthlyAllocation(a.id, i, v)}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right text-gray-700">
                    {fmtCurrency(aTotalCost)}
                  </td>
                </tr>
              );
            })}

            <tr className="border-t-2 border-gray-200 text-xs">
              <td className="pr-3 py-1 text-gray-500">Cost</td>
              <td></td>
              {monthIndices.map(i => (
                <td key={i} className="px-1 py-1 text-gray-700 text-right">
                  {fmtCurrency(projectMonthCost(project, i, employees))}
                </td>
              ))}
              <td className="px-2 py-1 text-right text-gray-700">
                {fmtCurrency(cost)}
              </td>
            </tr>
            <tr className="text-xs">
              <td className="pr-3 py-1 text-gray-500">Profit</td>
              <td></td>
              {monthIndices.map(i => {
                const r = project.monthlyRevenue[i] ?? 0;
                const c = projectMonthCost(project, i, employees);
                const v = r - c;
                return (
                  <td
                    key={i}
                    className={`px-1 py-1 text-right ${
                      v >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {fmtCurrency(v)}
                  </td>
                );
              })}
              <td
                className={`px-2 py-1 text-right ${
                  profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {fmtCurrency(profit)}
              </td>
            </tr>
            <tr className="text-xs">
              <td className="pr-3 py-1 text-gray-500">Margin</td>
              <td></td>
              {monthIndices.map(i => {
                const r = project.monthlyRevenue[i] ?? 0;
                const c = projectMonthCost(project, i, employees);
                const m = r > 0 ? (r - c) / r : 0;
                return (
                  <td
                    key={i}
                    className={`px-1 py-1 text-right ${
                      m >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {fmtPct(m)}
                  </td>
                );
              })}
              <td
                className={`px-2 py-1 text-right ${
                  margin >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {fmtPct(margin)}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-2">
          Allocation is a fraction of full-time per month (0.5 = half-time, 1 =
          full-time). Use the arrow icon to copy Jan's value across all months.
        </p>
      </div>
    </div>
  );
}
