import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { text } = await req.json()
  if (!text || typeof text !== 'string') {
    return new Response(JSON.stringify({ message: 'text is required' }), { status: 400, headers: corsHeaders })
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  })

  if (!res.ok) {
    const err = await res.text()
    return new Response(JSON.stringify({ message: err }), { status: 502, headers: corsHeaders })
  }

  const { data } = await res.json()
  return new Response(JSON.stringify({ embedding: data[0].embedding }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
