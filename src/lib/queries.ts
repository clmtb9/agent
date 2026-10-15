import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabaseClient'
import type { MandalaGoal, Task, Note, JournalEntry } from '../types/database.types'

/** Grille Mandala complète de l'utilisateur (centre + domaines + actions) */
export function useMandalaGoals() {
  return useQuery({
    queryKey: ['mandala_goals'],
    queryFn: async (): Promise<MandalaGoal[]> => {
      const { data, error } = await supabase
        .from('mandala_goals')
        .select('*')
        .order('position', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

/** Toutes les tâches actives (tri : priorité puis échéance) */
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'archived')
        .order('priority', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

/** Notes du second cerveau (les plus récentes d'abord) */
export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, user_id, title, content, tags, created_at, updated_at')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as Note[]
    },
  })
}

/** Entrées du journal, les plus récentes d'abord */
export function useJournal() {
  return useQuery({
    queryKey: ['journal'],
    queryFn: async (): Promise<JournalEntry[]> => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('entry_date', { ascending: false })
        .limit(60)
      if (error) throw error
      return data
    },
  })
}
