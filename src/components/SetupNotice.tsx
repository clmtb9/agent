import { KeyRound } from 'lucide-react'

/** Affiché quand VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ne sont pas renseignés */
export default function SetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-xl p-8 border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-3 gap-0.5 w-10 h-10">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-sm ${i === 4 ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-600'}`}
              />
            ))}
          </div>
          <div>
            <h1 className="text-lg font-bold">Mandala Brain</h1>
            <p className="text-xs text-slate-500">Aperçu local — Supabase non configuré</p>
          </div>
        </div>

        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-4 text-sm space-y-3">
          <p className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
            <KeyRound size={15} /> 3 pierres à poser pour activer l'app :
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
            <li>Crée un projet sur <strong>supabase.com</strong>, exécute <strong>supabase/schema.sql</strong> puis <strong>supabase/seed_mandala.sql</strong></li>
            <li>Copie <strong>.env.example</strong> en <strong>.env</strong> et colle tes clés (Project Settings → API)</li>
            <li>Relance <strong>npm run dev</strong> et connecte-toi par lien magique</li>
          </ol>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Sans base, l'aperçu s'arrête ici : toutes les données (tâches, Mandala, notes, journal)
          vivent dans Supabase, protégées par RLS. Détails dans README.md.
        </p>
      </div>
    </div>
  )
}
