// ============================================================================
// Edge Function : ai-chat — Assistant IA contextuel (RAG)
// Déployer : supabase functions deploy ai-chat
// Secrets requis :
//   supabase secrets set OPENAI_API_KEY=sk-...
// La fonction reçoit le JWT utilisateur (verify_jwt) et crée un client
// Supabase "as user" => la RLS s'applique : l'IA ne voit que TES données.
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type HistoryMsg = { role: 'user' | 'assistant'; content: string }

async function embed(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  })
  if (!res.ok) throw new Error(`OpenAI embeddings: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return json.data[0].embedding as number[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Client Supabase avec le JWT de l'appelant => RLS appliquée
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { message, history = [] } = (await req.json()) as {
      message: string
      history?: HistoryMsg[]
    }
    if (!message) {
      return new Response(JSON.stringify({ error: 'message requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ---------- 1. Contexte Mandala (centre + domaines + actions) ----------
    const { data: goals } = await supabase
      .from('mandala_goals')
      .select('level, code, title, full_text')
      .order('position')

    const mandalaContext = (goals ?? [])
      .map((g) =>
        g.level === 'center'
          ? `OBJECTIF CENTRAL: ${g.title} — ${g.full_text ?? ''}`
          : g.level === 'domain'
            ? `DOMAINE ${g.code}: ${g.title}`
            : `  ${g.code} ${g.title}: ${(g.full_text ?? '').slice(0, 180)}`,
      )
      .join('\n')

    // ---------- 2. Tâches ouvertes ----------
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, priority, due_date, status')
      .neq('status', 'done')
      .neq('status', 'archived')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(20)

    const tasksContext = (tasks ?? [])
      .map((t) => `- [${t.priority.toUpperCase()}] ${t.title}${t.due_date ? ` (échéance ${t.due_date})` : ''}`)
      .join('\n')

    // ---------- 3. RAG : notes pertinentes par recherche sémantique ----------
    let notesContext = ''
    let usedNotes: { id: string; title: string; similarity: number }[] = []
    try {
      const queryEmbedding = await embed(message)
      const { data: matched } = await supabase.rpc('match_notes', {
        query_embedding: queryEmbedding,
        match_threshold: 0.25,
        match_count: 5,
      })
      usedNotes = (matched ?? []).map((n: { id: string; title: string; similarity: number }) => ({
        id: n.id,
        title: n.title,
        similarity: n.similarity,
      }))
      notesContext = (matched ?? [])
        .map((n: { title: string; content: string }) => `NOTE "${n.title}":\n${n.content.slice(0, 1200)}`)
        .join('\n\n')
    } catch (e) {
      console.warn('RAG indisponible (notes sans embeddings ?):', e)
    }

    // ---------- 4. Appel LLM ----------
    const systemPrompt = `Tu es le "second cerveau" personnel de l'utilisateur, un assistant structuré autour de sa méthode Mandala Chart.
Tu parles en français, de façon concise, directe et bienveillante. Tu es un coach pragmatique.

OBJECTIF CENTRAL ET DOMAINES DE VIE (Mandala Chart) :
${mandalaContext || '(non chargé)'}

TÂCHES EN COURS :
${tasksContext || '(aucune)'}

NOTES PERTINENTES (recherche sémantique) :
${notesContext || '(aucune note pertinente)'}

CONSIGNES :
- Appuie tes réponses sur le contexte ci-dessus quand c'est pertinent, cite le code du domaine (ex. B3.5).
- Si tu détectes dans le message de l'utilisateur une URGENCE, une ÉCHÉANCE ou un engagement à ne pas oublier, propose jusqu'à 3 tâches.
- Réponds UNIQUEMENT en JSON valide avec exactement cette forme :
{
  "answer": "ta réponse en français (markdown léger ok)",
  "suggested_tasks": [ { "title": "...", "priority": "p1|p2|p3|p4", "due_date": "YYYY-MM-DD ou omis" } ]
}
- priority : p1 = urgent & important, p2 = important, p3 = urgent mais peut attendre, p4 = à classer.
- "suggested_tasks" peut être un tableau vide. Ne suggère rien qui existe déjà dans les tâches en cours.
- Date du jour : ${new Date().toISOString().slice(0, 10)}.`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
      }),
    })
    if (!res.ok) throw new Error(`OpenAI chat: ${res.status} ${await res.text()}`)
    const json = await res.json()
    const raw = json.choices[0].message.content as string

    let parsed: { answer?: string; suggested_tasks?: unknown[] }
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = { answer: raw, suggested_tasks: [] }
    }

    return new Response(
      JSON.stringify({
        answer: parsed.answer ?? '',
        suggested_tasks: Array.isArray(parsed.suggested_tasks) ? parsed.suggested_tasks.slice(0, 3) : [],
        used_notes: usedNotes,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
