import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMandalaGoals, useTasks } from '../lib/queries'
import { supabase } from '../lib/supabaseClient'
import type { Task, TaskPriority } from '../types/database.types'
import { CheckCircle2, Circle, Plus, Flame, Clock, Archive, Loader2 } from 'lucide-react'

const PRIORITIES: { id: TaskPriority; label: string; cls: string; dot: string }[] = [
  { id: 'p1', label: 'Urgent & Important', cls: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  { id: 'p2', label: 'Important', cls: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  { id: 'p3', label: 'Urgent, peut attendre', cls: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
  { id: 'p4', label: 'Non urgent / À classer', cls: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Dashboard() {
  const { data: tasks, isLoading } = useTasks()
  const { data: goals } = useMandalaGoals()
  const qc = useQueryClient()

  const [domainFilter, setDomainFilter] = useState<string>('all')
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('p2')

  const domains = useMemo(
    () => (goals ?? []).filter((g) => g.level === 'domain'),
    [goals],
  )

  const goalById = useMemo(() => {
    const m = new Map<string, { title: string; color: string | null; code: string | null }>()
    for (const g of goals ?? []) m.set(g.id, { title: g.title, color: g.color, code: g.code })
    return m
  }, [goals])

  const addTask = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('tasks').insert({
        user_id: userData.user!.id,
        title: newTitle.trim(),
        priority: newPriority,
        due_date: todayISO(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      setNewTitle('')
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const toggleDone = useMutation({
    mutationFn: async (task: Task) => {
      const done = task.status !== 'done'
      const { error } = await supabase
        .from('tasks')
        .update({ status: done ? 'done' : 'todo', completed_at: done ? new Date().toISOString() : null })
        .eq('id', task.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').update({ status: 'archived' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const filtered = useMemo(() => {
    let list = tasks ?? []
    if (domainFilter !== 'all') {
      const domain = domains.find((d) => d.id === domainFilter)
      const childIds = new Set(
        (goals ?? []).filter((g) => g.parent_id === domainFilter).map((g) => g.id),
      )
      list = list.filter(
        (t) => t.goal_id === domainFilter || (t.goal_id && childIds.has(t.goal_id)),
      )
      void domain
    }
    return list
  }, [tasks, domainFilter, domains, goals])

  const overdue = filtered.filter(
    (t) => t.status !== 'done' && t.due_date && t.due_date < todayISO(),
  )
  const today = filtered.filter((t) => t.due_date === todayISO())
  const later = filtered.filter((t) => !t.due_date || t.due_date > todayISO())

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-500" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Ajout rapide */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (newTitle.trim()) addTask.mutate()
        }}
        className="flex gap-2"
      >
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nouvelle tâche pour aujourd'hui…"
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-sm"
        >
          {PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!newTitle.trim() || addTask.isPending}
          className="rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 disabled:opacity-50 transition-colors"
        >
          <Plus size={18} />
        </button>
      </form>

      {/* Filtre par domaine du Mandala */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <button
          onClick={() => setDomainFilter('all')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
            domainFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
              : 'border-slate-300 dark:border-slate-700'
          }`}
        >
          Tous
        </button>
        {domains.map((d) => (
          <button
            key={d.id}
            onClick={() => setDomainFilter(d.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              domainFilter === d.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color ?? '#94a3b8' }} />
            {d.code}
          </button>
        ))}
      </div>

      {/* En retard */}
      {overdue.length > 0 && (
        <Section
          title={<span className="flex items-center gap-1.5 text-red-600 dark:text-red-400"><Flame size={16} /> En retard ({overdue.length})</span>}
        >
          {overdue.map((t) => (
            <TaskRow key={t.id} task={t} goalById={goalById} onToggle={toggleDone.mutate} onArchive={archive.mutate} />
          ))}
        </Section>
      )}

      {/* Aujourd'hui */}
      <Section title={<span className="flex items-center gap-1.5"><Clock size={16} className="text-amber-500" /> Aujourd'hui ({today.length})</span>}>
        {today.length === 0 && <Empty text="Rien de prévu. Pose une première pierre ci-dessus." />}
        {today.map((t) => (
          <TaskRow key={t.id} task={t} goalById={goalById} onToggle={toggleDone.mutate} onArchive={archive.mutate} />
        ))}
      </Section>

      {/* À venir / sans date — groupé par priorité */}
      {PRIORITIES.map((p) => {
        const list = later.filter((t) => t.priority === p.id)
        if (list.length === 0) return null
        return (
          <Section
            key={p.id}
            title={
              <span className={`flex items-center gap-1.5 ${p.cls}`}>
                <span className={`w-2 h-2 rounded-full ${p.dot}`} /> {p.label} ({list.length})
              </span>
            }
          >
            {list.map((t) => (
              <TaskRow key={t.id} task={t} goalById={goalById} onToggle={toggleDone.mutate} onArchive={archive.mutate} />
            ))}
          </Section>
        )
      })}
    </div>
  )
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold mb-2">{title}</h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-400 italic px-1">{text}</p>
}

function TaskRow({
  task,
  goalById,
  onToggle,
  onArchive,
}: {
  task: Task
  goalById: Map<string, { title: string; color: string | null; code: string | null }>
  onToggle: (t: Task) => void
  onArchive: (id: string) => void
}) {
  const done = task.status === 'done'
  const goal = task.goal_id ? goalById.get(task.goal_id) : undefined
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 ${
        done ? 'opacity-50' : ''
      }`}
    >
      <button onClick={() => onToggle(task)} className="shrink-0 text-amber-500">
        {done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${done ? 'line-through' : ''}`}>{task.title}</p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {goal && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: goal.color ?? '#94a3b8' }} />
              {goal.code ?? goal.title}
            </span>
          )}
          {task.due_date && <span>{task.due_date}{task.due_time ? ` ${task.due_time.slice(0, 5)}` : ''}</span>}
          {task.source === 'ai' && <span className="text-amber-500 font-medium">IA</span>}
        </div>
      </div>
      {done && (
        <button onClick={() => onArchive(task.id)} className="shrink-0 text-slate-400 hover:text-slate-600 p-1" title="Archiver">
          <Archive size={16} />
        </button>
      )}
    </div>
  )
}
