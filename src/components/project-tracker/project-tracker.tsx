// src/components/project-tracker/project-tracker.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Users, Briefcase, TrendingUp, ArrowRightToLine } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';

interface Employee {
  id: string;
  name: string;
  baseSalary: number;
  overheadMultiple: number;
}

interface Assignment {
  id: string;
  employeeId: string;
  monthlyAllocation: number[];
}

interface Project {
  id: string;
  name: string;
  months: number;
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

const migrateProject = (raw: any): Project => {
  const months = Math.max(0, Math.floor(Number(raw?.months) || 0));

  let monthlyRevenue: number[];
  if (Array.isArray(raw?.monthlyRevenue)) {
    monthlyRevenue = fitArray(raw.monthlyRevenue, months);
  } else if (Number.isFinite(Number(raw?.monthlyRevenue))) {
    monthlyRevenue = Array(months).fill(Number(raw.monthlyRevenue));
  } else {
    monthlyRevenue = Array(months).fill(0);
  }

  const assignments: Assignment[] = (
    Array.isArray(raw?.assignments) ? raw.assignments : []
  ).map((a: any) => {
    let monthlyAllocation: number[];
    if (Array.isArray(a?.monthlyAllocation)) {
      monthlyAllocation = fitArray(a.monthlyAllocation, months);
    } else if (Number.isFinite(Number(a?.allocation))) {
      const allocMonths = Math.max(
        0,
        Math.min(months, Math.floor(Number(a?.months) || months)),
      );
      monthlyAllocation = Array(months).fill(0);
      for (let i = 0; i < allocMonths; i++) monthlyAllocation[i] = Number(a.allocation);
    } else {
      monthlyAllocation = Array(months).fill(0);
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
    months,
    monthlyRevenue,
    assignments,
  };
};

const sanitizeStore = (raw: any): Store => ({
  employees: Array.isArray(raw?.employees)
    ? raw.employees.map((e: any) => ({
        id: e?.id || newId(),
        name: e?.name || '',
        baseSalary: Number(e?.baseSalary) || 0,
        overheadMultiple: Number(e?.overheadMultiple) || 0,
      }))
    : [],
  projects: Array.isArray(raw?.projects) ? raw.projects.map(migrateProject) : [],
});

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(isFinite(n) ? n : 0);

const fmtPct = (n: number) => (isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—');

const monthlyCost = (e: Employee) => (e.baseSalary * e.overheadMultiple) / 12;

const monthCost = (p: Project, monthIdx: number, employees: Employee[]) =>
  p.assignments.reduce((s, a) => {
    const emp = employees.find(e => e.id === a.employeeId);
    if (!emp) return s;
    return s + monthlyCost(emp) * (a.monthlyAllocation[monthIdx] ?? 0);
  }, 0);

const projectRevenue = (p: Project) =>
  p.monthlyRevenue.reduce((s, r) => s + (Number(r) || 0), 0);

const projectCost = (p: Project, employees: Employee[]) => {
  let total = 0;
  for (let i = 0; i < p.months; i++) total += monthCost(p, i, employees);
  return total;
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

  const rollup = useMemo(() => {
    const revenue = projects.reduce((s, p) => s + projectRevenue(p), 0);
    const cost = projects.reduce((s, p) => s + projectCost(p, employees), 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? profit / revenue : 0;
    return { revenue, cost, profit, margin };
  }, [projects, employees]);

  const addEmployee = () =>
    setStore(s => ({
      ...s,
      employees: [
        ...s.employees,
        { id: newId(), name: '', baseSalary: 0, overheadMultiple: 1.5 },
      ],
    }));

  const updateEmployee = (id: string, patch: Partial<Employee>) =>
    setStore(s => ({
      ...s,
      employees: s.employees.map(e => (e.id === id ? { ...e, ...patch } : e)),
    }));

  const removeEmployee = (id: string) =>
    setStore(s => ({
      employees: s.employees.filter(e => e.id !== id),
      projects: s.projects.map(p => ({
        ...p,
        assignments: p.assignments.filter(a => a.employeeId !== id),
      })),
    }));

  const addProject = () => {
    const months = 6;
    setStore(s => ({
      ...s,
      projects: [
        ...s.projects,
        {
          id: newId(),
          name: '',
          months,
          monthlyRevenue: Array(months).fill(0),
          assignments: [],
        },
      ],
    }));
  };

  const updateProjectFields = (id: string, patch: Partial<Pick<Project, 'name'>>) =>
    setStore(s => ({
      ...s,
      projects: s.projects.map(p => (p.id === id ? { ...p, ...patch } : p)),
    }));

  const setProjectMonths = (id: string, rawMonths: number) => {
    const months = Math.max(0, Math.floor(rawMonths));
    setStore(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.id !== id
          ? p
          : {
              ...p,
              months,
              monthlyRevenue: fitArray(p.monthlyRevenue, months),
              assignments: p.assignments.map(a => ({
                ...a,
                monthlyAllocation: fitArray(a.monthlyAllocation, months),
              })),
            },
      ),
    }));
  };

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
        return { ...p, monthlyRevenue: Array(p.months).fill(v) };
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
              monthlyAllocation: Array(p.months).fill(1),
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
            next[monthIdx] = Math.max(0, Math.min(1, value));
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
            return { ...a, monthlyAllocation: Array(p.months).fill(v) };
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

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Project Tracker</h1>
            <p className="text-sm text-gray-500">
              Track project profitability based on employee fully-loaded costs.
            </p>
          </div>
          {saveLabel && <span className={`text-xs ${saveColor}`}>{saveLabel}</span>}
        </div>

        {/* Rollup */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <TrendingUp size={20} className="text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Portfolio Rollup</h2>
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Base Salary (annual)</th>
                    <th className="py-2 pr-4 font-medium">Overhead ×</th>
                    <th className="py-2 pr-4 font-medium">Fully-Loaded</th>
                    <th className="py-2 pr-4 font-medium">Monthly Cost</th>
                    <th className="py-2 pr-2 font-medium text-right">—</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(e => {
                    const loaded = e.baseSalary * e.overheadMultiple;
                    return (
                      <tr key={e.id} className="border-b border-gray-100">
                        <td className="py-2 pr-4">
                          <input
                            type="text"
                            value={e.name}
                            onChange={ev =>
                              updateEmployee(e.id, { name: ev.target.value })
                            }
                            placeholder="Employee name"
                            className="w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <NumberInput
                            value={e.baseSalary}
                            onChange={v => updateEmployee(e.id, { baseSalary: v })}
                            prefix="$"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <NumberInput
                            value={e.overheadMultiple}
                            onChange={v =>
                              updateEmployee(e.id, { overheadMultiple: v })
                            }
                            step={0.1}
                          />
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {fmtCurrency(loaded)}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {fmtCurrency(monthlyCost(e))}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <button
                            onClick={() => removeEmployee(e.id)}
                            className="text-gray-400 hover:text-red-500"
                            title="Remove employee"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

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

          {projects.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500">
                No projects yet. Add one to get started.
              </p>
            </div>
          ) : (
            projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                employees={employees}
                onUpdateFields={patch => updateProjectFields(p.id, patch)}
                onSetMonths={m => setProjectMonths(p.id, m)}
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

function NumberInput({
  value,
  onChange,
  step,
  prefix,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  prefix?: string;
}) {
  return (
    <div className="flex items-center border border-gray-200 rounded focus-within:ring-2 focus-within:ring-blue-200">
      {prefix && <span className="px-2 text-gray-400 text-xs">{prefix}</span>}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step ?? 1}
        onChange={ev => {
          const n = parseFloat(ev.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="w-full px-2 py-1 focus:outline-none bg-transparent"
      />
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
  onSetMonths,
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
  onSetMonths: (months: number) => void;
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
  const monthIndices = Array.from({ length: project.months }, (_, i) => i);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-wrap gap-4 items-end justify-between mb-4">
        <div className="flex flex-wrap gap-4 flex-1 min-w-0">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={project.name}
              onChange={e => onUpdateFields({ name: e.target.value })}
              placeholder="Project name"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
              Months
            </label>
            <NumberInput value={project.months} onChange={v => onSetMonths(v)} />
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500"
          title="Remove project"
        >
          <Trash2 size={18} />
        </button>
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
        <h3 className="text-sm font-medium text-gray-700">Month-by-Month Breakdown</h3>
        <button
          onClick={onAddAssignment}
          disabled={employees.length === 0}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded"
        >
          <Plus size={14} /> Add Employee
        </button>
      </div>

      {project.months === 0 ? (
        <p className="text-xs text-gray-500">Set the project length (in months) above.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="text-left py-1.5 pr-3 font-medium w-48">Row</th>
                <th className="px-1 py-1.5 font-medium w-8"></th>
                {monthIndices.map(i => (
                  <th
                    key={i}
                    className="px-1 py-1.5 font-medium text-center text-xs"
                  >
                    M{i + 1}
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
                    title="Fill all months with M1 value"
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
                      (s, alloc) => s + monthlyCost(emp) * (alloc || 0),
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
                        title="Fill all months with M1 value"
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
                    {fmtCurrency(monthCost(project, i, employees))}
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
                  const c = monthCost(project, i, employees);
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
                  const c = monthCost(project, i, employees);
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
            Allocation per month is a fraction of full-time (0.5 = half-time, 1 =
            full-time). Use the arrow icon to copy M1's value across all months.
          </p>
        </div>
      )}
    </div>
  );
}
