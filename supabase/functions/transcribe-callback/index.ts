import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const post_id = url.searchParams.get('post_id')
  if (!post_id) return new Response('Missing post_id', { status: 400 })

  const payload = await req.json()
  // Replicate webhook: payload.output is transcript text (or array of segments)
  const transcript: string = typeof payload.output === 'string'
    ? payload.output
    : payload.output?.transcription ?? ''

  // Update transcript on post_metadata if it exists
  await supabase.from('post_metadata').upsert({
    post_id,
    audio_transcript: transcript,
    content_type: 'video',
    extraction_version: 1,
  })

  // Fetch the post data and re-run vision+embed now that we have a transcript
  const { data: post } = await supabase
    .from('posts')
    .select('source_url, caption, thumbnail_url, media_urls')
    .eq('id', post_id)
    .single()

  if (post) {
    // Resume pipeline via internal invoke
    await supabase.functions.invoke('pipeline', {
      body: {
        post_id,
        user_id: null, // not needed for service-role pipeline resume
        url: post.source_url,
        _resume: true,
        _transcript: transcript,
      },
    })
  }

  return new Response('ok')
})
