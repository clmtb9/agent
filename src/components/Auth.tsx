import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { LayoutGrid, Mail } from 'lucide-react'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-xl p-8 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="grid grid-cols-3 gap-0.5 w-10 h-10">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-sm ${i === 4 ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-600'}`}
              />
            ))}
          </div>
          <h1 className="text-xl font-bold">Mandala Brain</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-1.5">
          <LayoutGrid size={14} /> Ton second cerveau, ta charpente de vie.
        </p>

        {sent ? (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-4 text-sm text-emerald-800 dark:text-emerald-300">
            ✉️ Lien magique envoyé à <strong>{email}</strong>. Vérifie ta boîte mail.
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.fr"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Mail size={16} /> {loading ? 'Envoi…' : 'Recevoir le lien magique'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
