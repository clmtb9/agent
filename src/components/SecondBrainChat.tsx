import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotes } from '../lib/queries'
import { supabase } from '../lib/supabaseClient'
import type { Note } from '../types/database.types'
import { Brain, FileText, Loader2, Mic, MicOff, Plus, Send, Sparkles, Trash2, X } from 'lucide-react'

// --- Reconnaissance vocale (Web Speech API, zéro dépendance) ---
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null
}

type ChatMsg = { role: 'user' | 'assistant'; content: string }

type ChatResponse = {
  answer: string
  suggested_tasks?: { title: string; priority: 'p1' | 'p2' | 'p3' | 'p4'; due_date?: string }[]
  used_notes?: { id: string; title: string; similarity: number }[]
}

/**
 * Second Cerveau : notes Markdown + chat IA contextuel (RAG via Edge Function "ai-chat").
 * L'IA peut suggérer des tâches (détection d'urgences) — ajoutables d'un clic.
 */
export default function SecondBrainChat() {
  const { data: notes, isLoading } = useNotes()
  const qc = useQueryClient()

  const [view, setView] = useState<'chat' | 'notes'>('chat')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [suggested, setSuggested] = useState<ChatResponse['suggested_tasks']>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const [editing, setEditing] = useState<Note | null>(null)

  // --- Saisie vocale ---
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const speechSupported = getSpeechRecognition() !== null
  const autoSendTimer = useRef<number | null>(null)
  // Ref du transcript pour que le timer d'envoi utilise la valeur la plus fraîche
  const transcriptRef = useRef('')
  const SILENCE_MS = 1500

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop() // nettoyage au démontage
      if (autoSendTimer.current) window.clearTimeout(autoSendTimer.current)
    }
  }, [])

  function toggleListening() {
    const SR = getSpeechRecognition()
    if (!SR) return

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const rec = new SR()
    rec.lang = 'fr-FR'
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = (e) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript
      }
      setInput(transcript)
      transcriptRef.current = transcript
      // Silence détecté → envoi auto après SILENCE_MS (annulé si nouvelle parole ou frappe)
      if (autoSendTimer.current) window.clearTimeout(autoSendTimer.current)
      autoSendTimer.current = window.setTimeout(() => {
        const text = transcriptRef.current.trim()
        if (text) sendMessage(text)
      }, SILENCE_MS)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  async function sendMessage(directText?: string) {
    const text = (directText ?? input).trim()
    if (!text || thinking) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setThinking(true)
    try {
      const { data, error } = await supabase.functions.invoke<ChatResponse>('ai-chat', {
        body: { message: text, history: messages.slice(-8) },
      })
      if (error) throw error
      setMessages((m) => [...m, { role: 'assistant', content: data?.answer ?? '…' }])
      if (data?.suggested_tasks?.length) setSuggested(data.suggested_tasks)
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            "⚠️ Impossible de joindre l'assistant IA. Vérifie que l'Edge Function `ai-chat` est déployée (supabase/functions/ai-chat) et que OPENAI_API_KEY est configurée.",
        },
      ])
    } finally {
      setThinking(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  const acceptTask = useMutation({
    mutationFn: async (s: NonNullable<ChatResponse['suggested_tasks']>[number]) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('tasks').insert({
        user_id: userData.user!.id,
        title: s.title,
        priority: s.priority,
        due_date: s.due_date ?? new Date().toISOString().slice(0, 10),
        source: 'ai',
      })
      if (error) throw error
    },
    onSuccess: (_d, s) => {
      setSuggested((list) => (list ?? []).filter((x) => x.title !== s.title))
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const saveNote = useMutation({
    mutationFn: async (note: Partial<Note> & { id?: string }) => {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user!.id
      if (note.id) {
        const { error } = await supabase
          .from('notes')
          .update({ title: note.title, content: note.content, tags: note.tags })
          .eq('id', note.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('notes')
          .insert({ user_id: uid, title: note.title ?? '', content: note.content ?? '', tags: note.tags ?? [] })
        if (error) throw error
      }
    },
    onSuccess: async (_d, note) => {
      // Embedding en arrière-plan (non bloquant) pour le RAG
      supabase.functions.invoke('embed-note', { body: { title: note.title, content: note.content, note_id: note.id } }).catch(() => {})
      await qc.invalidateQueries({ queryKey: ['notes'] })
      setEditing(null)
    },
  })

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })

  return (
    <div className="space-y-4">
      {/* Bascule Chat / Notes */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200 dark:bg-slate-800 p-1">
        <button
          onClick={() => setView('chat')}
          className={`rounded-md py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
            view === 'chat' ? 'bg-white dark:bg-slate-900 shadow' : 'text-slate-500'
          }`}
        >
          <Brain size={15} /> Assistant IA
        </button>
        <button
          onClick={() => setView('notes')}
          className={`rounded-md py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
            view === 'notes' ? 'bg-white dark:bg-slate-900 shadow' : 'text-slate-500'
          }`}
        >
          <FileText size={15} /> Notes ({notes?.length ?? 0})
        </button>
      </div>

      {view === 'chat' ? (
        <div className="flex flex-col gap-3">
          {/* Fil de discussion */}
          <div className="space-y-3 min-h-[300px]">
            {messages.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-sm text-slate-500 space-y-2">
                <p className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <Sparkles size={15} className="text-amber-500" /> Assistant contextualisé
                </p>
                <p>L'IA connaît ton Mandala Chart (8 domaines, 64 actions) et fouille tes notes par recherche sémantique.</p>
                <p className="text-xs">Exemples : « Qu'est-ce que je dois prioriser cette semaine ? » · « Note : le patron m'a dit de préparer l'implantation de lundi »</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-amber-500 text-slate-950 rounded-br-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 size={14} className="animate-spin" /> L'IA réfléchit…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Tâches suggérées par l'IA */}
          {suggested && suggested.length > 0 && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">⚡ Tâches suggérées par l'IA</p>
              {suggested.map((s) => (
                <div key={s.title} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.priority === 'p1' ? 'bg-red-500' : s.priority === 'p2' ? 'bg-amber-500' : s.priority === 'p3' ? 'bg-sky-500' : 'bg-slate-400'}`} />
                  <span className="flex-1">{s.title}</span>
                  <button
                    onClick={() => acceptTask.mutate(s)}
                    className="shrink-0 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold px-2.5 py-1.5 transition-colors"
                  >
                    + Ajouter
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Champ de saisie */}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                transcriptRef.current = e.target.value
                // Frappe au clavier = l'utilisateur reprend la main → annule l'envoi auto
                if (autoSendTimer.current) window.clearTimeout(autoSendTimer.current)
                // Auto-resize : grandit avec le contenu, max 6 lignes
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (autoSendTimer.current) window.clearTimeout(autoSendTimer.current)
                  sendMessage()
                }
              }}
              rows={1}
              placeholder={listening ? 'Je t\'écoute… (silence = envoi auto)' : 'Parle à ton second cerveau… (Entrée pour envoyer)'}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 overflow-y-auto"
            />
            {speechSupported && (
              <button
                onClick={toggleListening}
                title={listening ? 'Arrêter la dictée' : 'Dicter au second cerveau'}
                className={`self-end rounded-xl p-3 transition-colors ${
                  listening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || thinking}
              className="self-end rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 p-3 disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : (
        /* ----- Gestionnaire de notes ----- */
        <div className="space-y-3">
          <button
            onClick={() => setEditing({ id: '', user_id: '', title: '', content: '', tags: [], embedding: null, created_at: '', updated_at: '' })}
            className="w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 py-3 text-sm font-medium text-slate-500 hover:text-amber-600 hover:border-amber-400 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={16} /> Nouvelle note
          </button>

          {isLoading && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-500" /></div>}

          {(notes ?? []).map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => setEditing(n)} className="flex-1 text-left">
                  <p className="text-sm font-semibold truncate">{n.title || '(sans titre)'}</p>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{n.content}</p>
                </button>
                <button
                  onClick={() => deleteNote.mutate(n.id)}
                  className="text-slate-400 hover:text-red-500 p-1 shrink-0"
                  title="Supprimer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale d'édition de note */}
      {editing && (
        <div
          className="fixed inset-0 z-20 bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{editing.id ? 'Modifier la note' : 'Nouvelle note'}</h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 p-1"><X size={18} /></button>
            </div>
            <input
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="Titre"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <textarea
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              placeholder="Contenu (Markdown supporté)…"
              rows={8}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <input
              value={editing.tags.join(', ')}
              onChange={(e) =>
                setEditing({ ...editing, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })
              }
              placeholder="Tags séparés par des virgules"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={() => saveNote.mutate(editing.id ? editing : { title: editing.title, content: editing.content, tags: editing.tags })}
              disabled={saveNote.isPending}
              className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold py-2.5 text-sm disabled:opacity-50 transition-colors"
            >
              {saveNote.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
