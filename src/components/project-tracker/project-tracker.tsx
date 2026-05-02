// src/components/project-tracker/project-tracker.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Users, Briefcase, TrendingUp } from 'lucide-react';
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
  allocation: number;
  months: number;
}

interface Project {
  id: string;
  name: string;
  months: number;
  monthlyRevenue: number;
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

const sanitizeStore = (raw: any): Store => ({
  employees: Array.isArray(raw?.employees) ? raw.employees : [],
  projects: Array.isArray(raw?.projects) ? raw.projects : [],
});

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(isFinite(n) ? n : 0);

const fmtPct = (n: number) =>
  isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—';

const monthlyCost = (e: Employee) => (e.baseSalary * e.overheadMultiple) / 12;

const projectRevenue = (p: Project) => p.months * p.monthlyRevenue;

const projectCost = (p: Project, employees: Employee[]) =>
  p.assignments.reduce((sum, a) => {
    const emp = employees.find(e => e.id === a.employeeId);
    if (!emp) return sum;
    return sum + monthlyCost(emp) * a.allocation * a.months;
  }, 0);

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

  const addProject = () =>
    setStore(s => ({
      ...s,
      projects: [
        ...s.projects,
        {
          id: newId(),
          name: '',
          months: 6,
          monthlyRevenue: 0,
          assignments: [],
        },
      ],
    }));

  const updateProject = (id: string, patch: Partial<Project>) =>
    setStore(s => ({
      ...s,
      projects: s.projects.map(p => (p.id === id ? { ...p, ...patch } : p)),
    }));

  const removeProject = (id: string) =>
    setStore(s => ({ ...s, projects: s.projects.filter(p => p.id !== id) }));

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
              allocation: 1,
              months: p.months,
            },
          ],
        };
      }),
    }));

  const updateAssignment = (
    projectId: string,
    assignmentId: string,
    patch: Partial<Assignment>,
  ) =>
    setStore(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.id !== projectId
          ? p
          : {
              ...p,
              assignments: p.assignments.map(a =>
                a.id === assignmentId ? { ...a, ...patch } : a,
              ),
            },
      ),
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
          {saveLabel && (
            <span className={`text-xs ${saveColor}`}>{saveLabel}</span>
          )}
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
            <p className="text-sm text-gray-500">No employees yet. Add one to get started.</p>
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
                            onChange={ev => updateEmployee(e.id, { name: ev.target.value })}
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
                            onChange={v => updateEmployee(e.id, { overheadMultiple: v })}
                            step={0.1}
                          />
                        </td>
                        <td className="py-2 pr-4 text-gray-700">{fmtCurrency(loaded)}</td>
                        <td className="py-2 pr-4 text-gray-700">{fmtCurrency(monthlyCost(e))}</td>
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
              <p className="text-sm text-gray-500">No projects yet. Add one to get started.</p>
            </div>
          ) : (
            projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                employees={employees}
                onUpdate={patch => updateProject(p.id, patch)}
                onRemove={() => removeProject(p.id)}
                onAddAssignment={() => addAssignment(p.id)}
                onUpdateAssignment={(aid, patch) => updateAssignment(p.id, aid, patch)}
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

function ProjectCard({
  project,
  employees,
  onUpdate,
  onRemove,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
}: {
  project: Project;
  employees: Employee[];
  onUpdate: (patch: Partial<Project>) => void;
  onRemove: () => void;
  onAddAssignment: () => void;
  onUpdateAssignment: (assignmentId: string, patch: Partial<Assignment>) => void;
  onRemoveAssignment: (assignmentId: string) => void;
}) {
  const revenue = projectRevenue(project);
  const cost = projectCost(project, employees);
  const profit = revenue - cost;
  const margin = revenue > 0 ? profit / revenue : 0;

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
              onChange={e => onUpdate({ name: e.target.value })}
              placeholder="Project name"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
              Months
            </label>
            <NumberInput
              value={project.months}
              onChange={v => onUpdate({ months: Math.max(0, v) })}
            />
          </div>
          <div className="w-44">
            <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
              Monthly Revenue
            </label>
            <NumberInput
              value={project.monthlyRevenue}
              onChange={v => onUpdate({ monthlyRevenue: v })}
              prefix="$"
            />
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
        <h3 className="text-sm font-medium text-gray-700">Assigned Employees</h3>
        <button
          onClick={onAddAssignment}
          disabled={employees.length === 0}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded"
        >
          <Plus size={14} /> Add Employee
        </button>
      </div>

      {project.assignments.length === 0 ? (
        <p className="text-xs text-gray-500">
          {employees.length === 0
            ? 'Add an employee in the Employees section first.'
            : 'No employees assigned to this project yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-1.5 pr-4 font-medium">Employee</th>
                <th className="py-1.5 pr-4 font-medium">Allocation</th>
                <th className="py-1.5 pr-4 font-medium">Months</th>
                <th className="py-1.5 pr-4 font-medium">Cost</th>
                <th className="py-1.5 pr-2 font-medium text-right">—</th>
              </tr>
            </thead>
            <tbody>
              {project.assignments.map(a => {
                const emp = employees.find(e => e.id === a.employeeId);
                const aCost = emp ? monthlyCost(emp) * a.allocation * a.months : 0;
                return (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-4">
                      <select
                        value={a.employeeId}
                        onChange={ev =>
                          onUpdateAssignment(a.id, { employeeId: ev.target.value })
                        }
                        className="w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">— Select employee —</option>
                        {employees.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.name || '(unnamed)'}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-4 w-32">
                      <NumberInput
                        value={a.allocation}
                        onChange={v =>
                          onUpdateAssignment(a.id, {
                            allocation: Math.max(0, Math.min(1, v)),
                          })
                        }
                        step={0.05}
                      />
                    </td>
                    <td className="py-1.5 pr-4 w-24">
                      <NumberInput
                        value={a.months}
                        onChange={v =>
                          onUpdateAssignment(a.id, { months: Math.max(0, v) })
                        }
                      />
                    </td>
                    <td className="py-1.5 pr-4 text-gray-700">{fmtCurrency(aCost)}</td>
                    <td className="py-1.5 pr-2 text-right">
                      <button
                        onClick={() => onRemoveAssignment(a.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Remove assignment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2">
            Allocation is a fraction of full-time (e.g. 0.5 = half-time, 1 = full-time).
          </p>
        </div>
      )}
    </div>
  );
}
