import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useJournal, useMandalaGoals } from '../lib/queries'
import { supabase } from '../lib/supabaseClient'
import type { JournalEntry } from '../types/database.types'
import { BookOpen, Loader2, PenLine, X } from 'lucide-react'

const MOODS = ['😞', '😕', '😐', '🙂', '🔥'] as const

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Carnet de vie : journal quotidien pro/perso, rattaché à un domaine du Mandala
 * avec une note de progression (1-5) et d'humeur.
 */
export default function JournalEditor() {
  const { data: entries, isLoading } = useJournal()
  const { data: goals } = useMandalaGoals()
  const qc = useQueryClient()

  const domains = useMemo(() => (goals ?? []).filter((g) => g.level === 'domain'), [goals])
  const domainById = useMemo(() => new Map(domains.map((d) => [d.id, d])), [domains])

  const [formOpen, setFormOpen] = useState(false)
  const [content, setContent] = useState('')
  const [goalId, setGoalId] = useState<string>('')
  const [mood, setMood] = useState<number | null>(null)
  const [progress, setProgress] = useState<number | null>(null)

  const todayEntry = useMemo(
    () => (entries ?? []).find((e) => e.entry_date === todayISO()),
    [entries],
  )

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      const payload = {
        user_id: userData.user!.id,
        entry_date: todayISO(),
        content: content.trim(),
        goal_id: goalId || null,
        mood,
        progress_score: progress,
      }
      const { error } = await supabase.from('journal_entries').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      setContent('')
      setGoalId('')
      setMood(null)
      setProgress(null)
      setFormOpen(false)
      qc.invalidateQueries({ queryKey: ['journal'] })
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-500" /></div>
  }

  return (
    <div className="space-y-4">
      {/* Rappel de la routine du soir */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-sm space-y-1">
        <p className="font-semibold flex items-center gap-1.5">
          <BookOpen size={15} className="text-amber-500" /> Bilan du jour
        </p>
        <p className="text-slate-500 text-xs leading-relaxed">
          Rituel 21h45 : téléphone posé, décharge (ce qui t'a frustré + l'émotion + l'issue), puis note la progression vers un domaine du Mandala.
        </p>
        {todayEntry ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Entrée du jour écrite — continue sur ta lancée.</p>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠ Pas encore d'entrée aujourd'hui.</p>
        )}
      </div>

      {/* Bouton / formulaire d'écriture */}
      {!formOpen ? (
        <button
          onClick={() => setFormOpen(true)}
          className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold py-3 text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <PenLine size={16} /> Écrire dans le journal
        </button>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Aujourd'hui — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <button onClick={() => setFormOpen(false)} className="text-slate-400 p-1"><X size={16} /></button>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Qu'est-ce qui s'est passé ? Qu'est-ce que tu as appris ? Qu'est-ce qui t'a frustré ?"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          {/* Domaine du Mandala évalué */}
          <label className="block text-xs font-medium text-slate-500">
            Domaine du Mandala concerné
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="">— Aucun / général —</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>{d.code} — {d.title}</option>
              ))}
            </select>
          </label>

          {/* Humeur */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Humeur</p>
            <div className="flex gap-1.5">
              {MOODS.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setMood(mood === i + 1 ? null : i + 1)}
                  className={`flex-1 rounded-lg py-2 text-lg border transition-colors ${
                    mood === i + 1
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Progression vers l'objectif */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Progression vers le domaine (1 = rien, 5 = gros pas)</p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setProgress(progress === v ? null : v)}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold border transition-colors ${
                    progress === v
                      ? 'border-amber-500 bg-amber-500 text-slate-950'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => save.mutate()}
            disabled={!content.trim() || save.isPending}
            className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold py-2.5 text-sm disabled:opacity-50 transition-colors"
          >
            {save.isPending ? 'Enregistrement…' : 'Graver dans le journal'}
          </button>
        </div>
      )}

      {/* Historique */}
      <div className="space-y-2">
        {(entries ?? []).map((e: JournalEntry) => {
          const domain = e.goal_id ? domainById.get(e.goal_id) : undefined
          return (
            <div key={e.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-semibold text-slate-500">
                  {new Date(e.entry_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  {e.mood && <span>{MOODS[e.mood - 1]}</span>}
                  {e.progress_score && (
                    <span className="rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 font-medium">
                      +{e.progress_score}
                    </span>
                  )}
                </div>
              </div>
              {domain && (
                <p className="text-[11px] font-medium mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: domain.color ?? '#94a3b8' }} />
                  {domain.code} — {domain.title}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{e.content}</p>
            </div>
          )
        })}
        {(entries ?? []).length === 0 && (
          <p className="text-sm text-slate-400 italic text-center py-6">Ton carnet est vierge. Première pierre à poser.</p>
        )}
      </div>
    </div>
  )
}
