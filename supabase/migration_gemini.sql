-- ============================================================================
-- MIGRATION — Passage aux embeddings Gemini (gemini-embedding-001, 3072 dims)
-- À exécuter UNE FOIS dans le SQL Editor AVANT de déployer les fonctions Gemini.
-- Les anciens embeddings (s'il y en a) sont invalidés — ils seront recalculés
-- à la prochaine édition de chaque note.
-- ============================================================================

-- 1. Nouvelle dimension pour la colonne embedding
alter table notes alter column embedding type vector(3072) using null;

-- 2. Recrée l'index HNSW (l'ancien pointe sur du 1536)
drop index if exists notes_embedding_hnsw;
create index notes_embedding_hnsw on notes using hnsw (embedding vector_cosine_ops);

-- 3. Recrée la fonction de recherche sémantique en 3072
create or replace function match_notes(
  query_embedding vector(3072),
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
