-- ============================================================================
-- MANDALA BRAIN — Schéma Supabase complet
-- À exécuter dans le SQL Editor de Supabase (une seule fois).
-- Couvre : profiles, mandala_goals, tasks, notes (pgvector), journal_entries,
-- triggers, indexes et Row Level Security (RLS) sur toutes les tables.
-- ============================================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "uuid-ossp";
create extension if not exists vector; -- pgvector pour le RAG (recherche sémantique)

-- ---------- ENUMS ----------
create type goal_level as enum ('center', 'domain', 'action');
create type task_priority as enum (
  'p1', -- Urgent & Important
  'p2', -- Important
  'p3', -- Urgent, peut attendre
  'p4'  -- Non urgent / à classer
);
create type task_status as enum ('todo', 'in_progress', 'done', 'archived');

-- ---------- TABLE : profiles ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  theme text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- TABLE : mandala_goals ----------
-- Arbre à 3 niveaux : center (1) -> domain (8) -> action (64)
create table mandala_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  parent_id uuid references mandala_goals (id) on delete cascade,
  level goal_level not null,
  code text,                  -- ex. 'B1', 'B1.3'
  title text not null,        -- intitulé court (pour les petites cases)
  full_text text,             -- version complète / citation du domaine
  color text,                 -- hex, ex. '#3B82F6'
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un seul objectif central par utilisateur
create unique index one_center_per_user on mandala_goals (user_id) where level = 'center';
-- Un code unique par utilisateur (C0, B1, B1.1…) : rend le seed vraiment idempotent
create unique index mandala_goals_user_code_key on mandala_goals (user_id, code);
create index mandala_goals_user_parent_idx on mandala_goals (user_id, parent_id);

-- ---------- TABLE : tasks ----------
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  goal_id uuid references mandala_goals (id) on delete set null, -- lien Mandala (domaine ou action)
  title text not null,
  details text,
  status task_status not null default 'todo',
  priority task_priority not null default 'p4',
  due_date date,
  due_time time,
  source text not null default 'manual',  -- 'manual' | 'ai' (suggestions de l'assistant)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index tasks_user_due_idx on tasks (user_id, due_date) where status <> 'archived';
create index tasks_goal_idx on tasks (goal_id);

-- ---------- TABLE : notes (Second Cerveau) ----------
create table notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  title text not null default '',
  content text not null default '',       -- texte brut ou Markdown
  tags text[] not null default '{}',
  embedding vector(1536),                 -- OpenAI text-embedding-3-small
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Index vectoriel HNSW pour la recherche par similarité cosinus
create index notes_embedding_hnsw on notes using hnsw (embedding vector_cosine_ops);
create index notes_user_updated_idx on notes (user_id, updated_at desc);

-- ---------- TABLE : journal_entries (Carnet de vie) ----------
create table journal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  goal_id uuid references mandala_goals (id) on delete set null, -- domaine évalué
  entry_date date not null default current_date,
  title text,
  content text not null default '',
  mood smallint check (mood between 1 and 5),
  progress_score smallint check (progress_score between 1 and 5), -- progression vers l'objectif lié
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index journal_user_date_idx on journal_entries (user_id, entry_date desc);

-- ---------- TRIGGERS : updated_at ----------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_goals_updated before update on mandala_goals
  for each row execute function set_updated_at();
create trigger trg_tasks_updated before update on tasks
  for each row execute function set_updated_at();
create trigger trg_notes_updated before update on notes
  for each row execute function set_updated_at();
create trigger trg_journal_updated before update on journal_entries
  for each row execute function set_updated_at();

-- ---------- TRIGGER : création auto du profil à l'inscription ----------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY — chaque utilisateur ne voit que ses propres données
-- ============================================================================

alter table profiles enable row level security;
alter table mandala_goals enable row level security;
alter table tasks enable row level security;
alter table notes enable row level security;
alter table journal_entries enable row level security;

-- profiles
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- mandala_goals
create policy "goals_all_own" on mandala_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tasks
create policy "tasks_all_own" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notes
create policy "notes_all_own" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- journal_entries
create policy "journal_all_own" on journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- FONCTION RPC : recherche sémantique dans les notes (appelée par l'Edge Function)
-- SECURITY INVOKER (défaut) => la RLS s'applique, chacun ne cherche que dans SES notes
-- ============================================================================
create or replace function match_notes(
  query_embedding vector(1536),
  match_threshold float default 0.25,
  match_count int default 5
)
returns table (id uuid, title text, content text, similarity float)
language sql
stable
as $$
  select
    n.id,
    n.title,
    n.content,
    1 - (n.embedding <=> query_embedding) as similarity
  from notes n
  where n.embedding is not null
    and 1 - (n.embedding <=> query_embedding) > match_threshold
  order by n.embedding <=> query_embedding
  limit match_count;
$$;
