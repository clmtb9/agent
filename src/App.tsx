import { useEffect, useState } from 'react'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import MandalaGrid from './components/MandalaGrid'
import SecondBrainChat from './components/SecondBrainChat'
import JournalEditor from './components/JournalEditor'
import SetupNotice from './components/SetupNotice'
import { useAuth } from './lib/useAuth'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { requestNotificationPermission, scheduleEveningReminder } from './lib/notifications'
import { LayoutDashboard, LayoutGrid, Brain, BookOpen, LogOut, Loader2 } from 'lucide-react'

type Tab = 'dashboard' | 'mandala' | 'brain' | 'journal'

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Agenda', icon: LayoutDashboard },
  { id: 'mandala', label: 'Mandala', icon: LayoutGrid },
  { id: 'brain', label: 'Cerveau', icon: Brain },
  { id: 'journal', label: 'Journal', icon: BookOpen },
]

export default function App() {
  const { session, loading, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('dashboard')

  // Notifications : permission + rappel du bilan du soir (21h45)
  useEffect(() => {
    if (!session) return
    requestNotificationPermission().then((granted) => {
      if (granted) scheduleEveningReminder()
    })
  }, [session])

  if (!isSupabaseConfigured) return <SetupNotice />

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    )
  }

  if (!session) return <Auth />

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barre du haut */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2 font-bold">
            <div className="grid grid-cols-3 gap-0.5 w-6 h-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-[2px] ${i === 4 ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-600'}`}
                />
              ))}
            </div>
            <span className="hidden sm:inline">Mandala Brain</span>
          </div>
          <button
            onClick={signOut}
            className="text-slate-500 hover:text-red-500 transition-colors p-2"
            title="Se déconnecter"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-5 pb-24">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'mandala' && <MandalaGrid />}
        {tab === 'brain' && <SecondBrainChat />}
        {tab === 'journal' && <JournalEditor />}
      </main>

      {/* Navigation du bas (mobile-first) */}
      <nav className="fixed bottom-0 inset-x-0 z-10 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-t border-slate-200 dark:border-slate-800 safe-bottom">
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                tab === id
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
