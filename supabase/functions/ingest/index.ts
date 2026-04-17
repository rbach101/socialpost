import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  let url: string
  try {
    const body = await req.json()
    url = body.url
    if (!url || typeof url !== 'string') throw new Error('url is required')
    new URL(url) // validate
  } catch {
    return new Response(JSON.stringify({ message: 'Invalid URL' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from('posts')
    .select('id')
    .eq('user_id', user.id)
    .eq('source_url', url)
    .maybeSingle()

  if (existing) {
    return new Response(JSON.stringify({ post_id: existing.id, duplicate: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Create post in pending state
  const { data: post, error: insertError } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      source_url: url,
      source_platform: inferPlatform(url),
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !post) {
    return new Response(JSON.stringify({ message: insertError?.message ?? 'Insert failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Kick off pipeline (fire-and-forget — do not await)
  const serviceSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  serviceSupabase.functions.invoke('pipeline', {
    body: { post_id: post.id, user_id: user.id, url },
  }).catch(console.error)

  return new Response(JSON.stringify({ post_id: post.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

function inferPlatform(url: string): string {
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('pinterest.com')) return 'pinterest'
  return 'web'
}
