# 🪵 Mandala Brain — Second Cerveau PWA

PWA d'assistant personnel structurée autour de la méthode **Mandala Chart** (1 objectif central → 8 domaines → 64 actions).

## Stack

- **Frontend** : React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons
- **PWA** : vite-plugin-pwa (manifest, service worker, notifications locales)
- **Backend** : Supabase (PostgreSQL, Auth magic link, RLS, pgvector, Edge Functions Deno)
- **IA** : OpenAI via Edge Functions (clés jamais exposées au client)
- **Data** : @tanstack/react-query + @supabase/supabase-js

## Structure

```
├── index.html
├── vite.config.ts              # Vite + React + PWA (manifest, SW, cache Supabase)
├── src/
│   ├── App.tsx                 # Coquille : auth, navigation 4 onglets, rappels
│   ├── lib/
│   │   ├── supabaseClient.ts   # Client Supabase typé
│   │   ├── useAuth.ts          # Session + magic link
│   │   ├── queries.ts          # React Query (goals, tasks, notes, journal)
│   │   └── notifications.ts    # Web Notifications + rappel bilan 21h45
│   ├── components/
│   │   ├── Dashboard.tsx       # Matrice de priorités P1-P4 + agenda du jour
│   │   ├── MandalaGrid.tsx     # Matrice 3x3 → vue 9x9 par domaine
│   │   ├── SecondBrainChat.tsx # Chat IA (RAG) + gestionnaire de notes
│   │   ├── JournalEditor.tsx   # Journal quotidien lié aux domaines
│   │   └── Auth.tsx            # Connexion par lien magique
│   └── types/database.types.ts # Types TS du schéma
└── supabase/
    ├── schema.sql              # Tables + RLS + pgvector + RPC match_notes
    ├── seed_mandala.sql        # Centre + 8 domaines + 64 actions (Mandala Chart)
    └── functions/
        ├── ai-chat/index.ts    # Chat IA contextuel + suggestions de tâches
        └── embed-note/index.ts # Embeddings OpenAI des notes (RAG)
```

## Mise en route

### 1. Supabase

1. Crée un projet sur [supabase.com](https://supabase.com)
2. SQL Editor → exécute **supabase/schema.sql**
3. Crée un utilisateur (Authentication → Add User, email + mot de passe) — la magic link de connexion utilisera cet email
4. SQL Editor → exécute **supabase/seed_mandala.sql** (le script détecte automatiquement le 1er utilisateur du projet — plusieurs comptes ? colle ton UUID au début du DO block)

### 2. Front

```bash
cp .env.example .env   # renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 3. Edge Functions (IA)

```bash
npm i -g supabase
supabase login
supabase link --project-ref <ton-project-ref>
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy ai-chat
supabase functions deploy embed-note
```

> Sans les fonctions déployées, l'app fonctionne — seul l'onglet IA affiche un message d'erreur explicite.

## Modèle de données

| Table | Rôle |
|---|---|
| `profiles` | Profil (créé automatiquement à l'inscription) |
| `mandala_goals` | Arbre 3 niveaux : `center` → `domain` (B1-B8) → `action` (x.x) |
| `tasks` | Tâches : priorité `p1`-`p4`, échéance, lien `goal_id`, source `manual`/`ai` |
| `notes` | Second cerveau : Markdown + `embedding vector(1536)` + index HNSW |
| `journal_entries` | Journal daté : humeur, score de progression, domaine lié |

RLS activée partout : `auth.uid() = user_id`. La recherche sémantique (`match_notes`) s'exécute en `SECURITY INVOKER` → chacun ne fouille que ses propres notes.

## Notifications

- Permission demandée à la première connexion
- Rappel local **21h45** (bilan du soir / routine B6-B7) tant que l'app est ouverte
- Pour du vrai push serveur : ajouter VAPID + une Edge Function `web-push` sur les échéances `p1`
