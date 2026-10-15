import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** true si .env est renseigné — sinon l'app affiche l'écran d'installation */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Client factice en mode non configuré : jamais utilisé (écran d'installation affiché)
export const supabase = createClient<Database>(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
)
