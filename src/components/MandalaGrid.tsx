import { useMemo, useState } from 'react'
import { useMandalaGoals, useTasks } from '../lib/queries'
import type { MandalaGoal } from '../types/database.types'
import { Loader2, X, CheckCircle2, Circle } from 'lucide-react'

/**
 * Grille Mandala 3x3 :
 *  - centre = objectif central
 *  - 8 cases autour = domaines B1..B8 (disposés dans l'ordre de la matrice)
 *  - clic sur un domaine = vue 9x9 (8 actions autour du domaine)
 */

// Ordre d'affichage dans la matrice 3x3 : B1 B2 B3 / B4 C B5 / B6 B7 B8
const MATRIX_ORDER = ['B1', 'B2', 'B3', 'B4', 'CENTER', 'B5', 'B6', 'B7', 'B8']
// Ordre des actions dans la vue 9x9 : 1 2 3 / 8 domaine 4 / 7 6 5 (spirale Mandala classique)
const ACTION_SLOTS = [1, 2, 3, 8, -1, 4, 7, 6, 5]

export default function MandalaGrid() {
  const { data: goals, isLoading } = useMandalaGoals()
  const { data: tasks } = useTasks()
  const [selected, setSelected] = useState<MandalaGoal | null>(null)

  const center = useMemo(() => (goals ?? []).find((g) => g.level === 'center'), [goals])
  const domains = useMemo(() => (goals ?? []).filter((g) => g.level === 'domain'), [goals])

  const domainByCode = useMemo(() => {
    const m = new Map<string, MandalaGoal>()
    domains.forEach((d) => d.code && m.set(d.code, d))
    return m
  }, [domains])

  /** Nombre de tâches ouvertes liées à un objectif ou à ses enfants */
  const openTasksFor = (goal: MandalaGoal) => {
    const ids = new Set<string>([goal.id])
    ;(goals ?? []).filter((g) => g.parent_id === goal.id).forEach((g) => ids.add(g.id))
    return (tasks ?? []).filter((t) => t.goal_id && ids.has(t.goal_id) && t.status !== 'done').length
  }

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-500" /></div>
  }

  if (!center) {
    return (
      <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
        Ta grille Mandala est vide. Exécute <strong>supabase/seed_mandala.sql</strong> dans le SQL Editor de Supabase
        pour planter le centre et les 64 actions.
      </div>
    )
  }

  // ----- Vue 9x9 d'un domaine -----
  if (selected) {
    const actions = (goals ?? [])
      .filter((g) => g.parent_id === selected.id)
      .sort((a, b) => a.position - b.position)
    const byPos = new Map(actions.map((a) => [a.position, a]))

    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
        >
          <X size={14} /> Retour à la matrice
        </button>

        <div className="grid grid-cols-3 gap-1.5">
          {ACTION_SLOTS.map((slot, i) => {
            if (slot === -1) {
              return (
                <div
                  key={i}
                  className="aspect-square rounded-lg p-2 flex items-center justify-center text-center text-white font-bold text-xs leading-tight"
                  style={{ backgroundColor: selected.color ?? '#1e293b' }}
                >
                  {selected.title}
                </div>
              )
            }
            const action = byPos.get(slot)
            if (!action) return <div key={i} className="aspect-square rounded-lg bg-slate-200 dark:bg-slate-800" />
            const count = openTasksFor(action)
            return (
              <ActionCell key={i} action={action} openTasks={count} />
            )
          })}
        </div>

        {selected.full_text && (
          <p className="text-center text-sm text-slate-500 italic">{selected.full_text}</p>
        )}
      </div>
    )
  }

  // ----- Matrice centrale 3x3 -----
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1.5">
        {MATRIX_ORDER.map((code) => {
          if (code === 'CENTER') {
            return (
              <div
                key="center"
                className="aspect-square rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 p-2 flex items-center justify-center text-center font-bold text-[11px] leading-tight"
              >
                {center.title}
              </div>
            )
          }
          const d = domainByCode.get(code)
          if (!d) return <div key={code} className="aspect-square rounded-lg bg-slate-200 dark:bg-slate-800" />
          const count = openTasksFor(d)
          return (
            <button
              key={code}
              onClick={() => setSelected(d)}
              className="aspect-square rounded-lg p-1.5 text-left flex flex-col justify-between text-white transition-transform active:scale-95"
              style={{ backgroundColor: d.color ?? '#475569' }}
            >
              <span className="text-[10px] font-bold opacity-80">{d.code}</span>
              <span className="text-[10px] leading-tight font-medium line-clamp-3">{d.title}</span>
              {count > 0 && (
                <span className="self-end text-[9px] bg-black/30 rounded-full px-1.5 py-0.5">{count} tâche{count > 1 ? 's' : ''}</span>
              )}
            </button>
          )
        })}
      </div>
      {center.full_text && (
        <p className="text-center text-sm text-slate-500 italic">{center.full_text}</p>
      )}
    </div>
  )
}

function ActionCell({ action, openTasks }: { action: MandalaGoal; openTasks: number }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="aspect-square rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 text-left flex flex-col justify-between active:scale-95 transition-transform"
      >
        <span className="text-[9px] font-bold" style={{ color: action.color ?? undefined }}>{action.code}</span>
        <span className="text-[10px] leading-tight font-medium line-clamp-3">{action.title}</span>
        {openTasks > 0 && (
          <span className="self-end text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full px-1.5 py-0.5">
            {openTasks}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold" style={{ color: action.color ?? undefined }}>{action.code}</p>
                <h3 className="font-semibold">{action.title}</h3>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 p-1"><X size={18} /></button>
            </div>
            {action.full_text && <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{action.full_text}</p>}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {openTasks > 0 ? <Circle size={12} /> : <CheckCircle2 size={12} className="text-emerald-500" />}
              {openTasks > 0 ? `${openTasks} tâche(s) en cours liée(s)` : 'Aucune tâche en cours liée'}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
