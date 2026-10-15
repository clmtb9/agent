// ============================================================================
// Edge Function : embed-note — calcule et stocke l'embedding d'une note
// Appelée par le front après chaque création / modification de note.
// Body : { note_id?: string, title: string, content: string }
// Déployer : supabase functions deploy embed-note
// ============================================================================
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Vérifie que l'appelant est bien authentifié (JWT valide)
    const authHeader = req.headers.get('Authorization')!
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: authError } = await userClient.auth.getUser()
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: 'non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { note_id, title = '', content = '' } = (await req.json()) as {
      note_id?: string
      title?: string
      content?: string
    }

    const text = `${title}\n\n${content}`.trim()
    if (!text) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Embedding OpenAI
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
    const embedding = json.data[0].embedding as number[]

    // Mise à jour de la note (service role : la note vient d'être créée côté user,
    // on borne la mise à jour à l'utilisateur appelant par sécurité)
    if (note_id) {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { error } = await admin
        .from('notes')
        .update({ embedding: JSON.stringify(embedding) })
        .eq('id', note_id)
        .eq('user_id', userData.user.id)
      if (error) throw error
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
