/**
 * Types TypeScript correspondant au schéma Supabase (supabase/schema.sql).
 * Style "supabase gen types" — régénérable via :
 *   npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          theme: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          theme?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          theme?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mandala_goals: {
        Row: {
          id: string
          user_id: string
          parent_id: string | null
          level: Database['public']['Enums']['goal_level']
          code: string | null
          title: string
          full_text: string | null
          color: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          parent_id?: string | null
          level: Database['public']['Enums']['goal_level']
          code?: string | null
          title: string
          full_text?: string | null
          color?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          parent_id?: string | null
          level?: Database['public']['Enums']['goal_level']
          code?: string | null
          title?: string
          full_text?: string | null
          color?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          goal_id: string | null
          title: string
          details: string | null
          status: Database['public']['Enums']['task_status']
          priority: Database['public']['Enums']['task_priority']
          due_date: string | null
          due_time: string | null
          source: string
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          goal_id?: string | null
          title: string
          details?: string | null
          status?: Database['public']['Enums']['task_status']
          priority?: Database['public']['Enums']['task_priority']
          due_date?: string | null
          due_time?: string | null
          source?: string
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string | null
          title?: string
          details?: string | null
          status?: Database['public']['Enums']['task_status']
          priority?: Database['public']['Enums']['task_priority']
          due_date?: string | null
          due_time?: string | null
          source?: string
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          tags: string[]
          embedding: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          content?: string
          tags?: string[]
          embedding?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          tags?: string[]
          embedding?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string
          goal_id: string | null
          entry_date: string
          title: string | null
          content: string
          mood: number | null
          progress_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_id?: string | null
          entry_date?: string
          title?: string | null
          content?: string
          mood?: number | null
          progress_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string | null
          entry_date?: string
          title?: string | null
          content?: string
          mood?: number | null
          progress_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_notes: {
        Args: {
          query_embedding: string | number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          content: string
          similarity: number
        }[]
      }
    }
    Enums: {
      goal_level: 'center' | 'domain' | 'action'
      task_priority: 'p1' | 'p2' | 'p3' | 'p4'
      task_status: 'todo' | 'in_progress' | 'done' | 'archived'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ---------- Alias pratiques ----------
export type Profile = Database['public']['Tables']['profiles']['Row']
export type MandalaGoal = Database['public']['Tables']['mandala_goals']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type Note = Database['public']['Tables']['notes']['Row']
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row']

export type GoalLevel = Database['public']['Enums']['goal_level']
export type TaskPriority = Database['public']['Enums']['task_priority']
export type TaskStatus = Database['public']['Enums']['task_status']
