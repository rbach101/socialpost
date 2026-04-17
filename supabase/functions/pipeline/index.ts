import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.90.0'
import { extractionTool, SYSTEM_PROMPT } from '../_shared/extractionTool.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

Deno.serve(async (req: Request) => {
  const { post_id, user_id, url } = await req.json()
  if (!post_id || !user_id || !url) return new Response('Missing params', { status: 400 })

  await setStatus(post_id, 'fetching')

  // --- Stage 1: Fetch media + caption ---
  const fetched = await runJob(post_id, 'fetch', async () => {
    const mediaData = await fetchMediaData(url)
    await supabase.from('posts').update({
      status: 'fetching',
      caption: mediaData.caption,
      media_urls: mediaData.mediaUrls,
      thumbnail_url: mediaData.thumbnailUrl,
      author_handle: mediaData.authorHandle,
      author_display_name: mediaData.authorDisplayName,
      source_post_id: mediaData.sourcePostId,
    }).eq('id', post_id)
    return mediaData
  })

  if (!fetched) return new Response('ok') // error already logged

  await setStatus(post_id, 'processing')

  // --- Stage 2: Transcribe if video (async via Replicate webhook) ---
  let transcript: string | null = null
  if (fetched.isVideo && fetched.mediaUrls[0]) {
    const webhookResult = await runJob(post_id, 'transcribe', async () => {
      return await kickoffTranscription(post_id, fetched.mediaUrls[0])
    })
    // If async webhook dispatched, pipeline will resume via transcribe-callback
    if (webhookResult?.async) return new Response('ok')
    transcript = webhookResult?.transcript ?? null
  }

  await runVisionAndEmbed(post_id, fetched, transcript)
  return new Response('ok')
})

async function runVisionAndEmbed(
  post_id: string,
  fetched: MediaData,
  transcript: string | null
) {
  // --- Stage 3: Vision extraction ---
  const extracted = await runJob(post_id, 'vision', async () => {
    if (!fetched.thumbnailUrl && !fetched.mediaUrls[0]) {
      // Graceful degrade: no media available (e.g., Instagram login wall)
      return {
        summary: fetched.caption ?? 'Post saved without media.',
        primary_category: 'Other',
        sub_tags: [],
        entities: { people: [], places: [], brands: [], products: [] },
        content_type: 'unknown',
        extracted_text: fetched.caption ?? '',
      }
    }

    const imageUrl = fetched.thumbnailUrl ?? fetched.mediaUrls[0]
    const imageData = await fetchImageAsBase64(imageUrl)

    const userText = [
      fetched.caption ? `Caption:\n${fetched.caption}` : 'Caption: (none)',
      transcript ? `\nAudio transcript:\n${transcript}` : '',
    ].join('\n')

    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [extractionTool],
      tool_choice: { type: 'tool', name: 'save_post_metadata' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imageData.mediaType, data: imageData.data } },
          { type: 'text', text: userText },
        ],
      }],
    })

    const toolUse = res.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool_use in response')
    return toolUse.input
  })

  if (!extracted) return

  await supabase.from('post_metadata').upsert({
    post_id,
    summary: extracted.summary,
    primary_category: extracted.primary_category,
    sub_tags: extracted.sub_tags,
    entities: extracted.entities,
    content_type: extracted.content_type,
    extracted_text: extracted.extracted_text,
    audio_transcript: transcript,
    extraction_model: 'claude-sonnet-4-6',
  })

  // --- Stage 4: Embed ---
  await runJob(post_id, 'embed', async () => {
    const textToEmbed = `${extracted.summary} ${extracted.extracted_text}`.trim()
    const hash = await sha256(textToEmbed)

    // Skip re-embed if text hasn't changed
    const { data: existing } = await supabase
      .from('post_embeddings')
      .select('text_hash')
      .eq('post_id', post_id)
      .maybeSingle()

    if (existing?.text_hash === hash) return

    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: textToEmbed }),
    })

    if (!embedRes.ok) throw new Error(`Embedding API error: ${await embedRes.text()}`)
    const { data } = await embedRes.json()

    await supabase.from('post_embeddings').upsert({
      post_id,
      embedding: data[0].embedding,
      embedding_model: 'text-embedding-3-small',
      text_hash: hash,
    })
  })

  await setStatus(post_id, 'ready')
}

// --- Helpers ---

interface MediaData {
  caption: string | null
  mediaUrls: string[]
  thumbnailUrl: string | null
  authorHandle: string | null
  authorDisplayName: string | null
  sourcePostId: string | null
  isVideo: boolean
}

async function fetchMediaData(url: string): Promise<MediaData> {
  // Try oEmbed first (works for Instagram public posts, may get login wall)
  try {
    const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${Deno.env.get('INSTAGRAM_APP_TOKEN') ?? ''}`
    const res = await fetch(oembedUrl)
    if (res.ok) {
      const data = await res.json()
      return {
        caption: data.title ?? null,
        mediaUrls: data.thumbnail_url ? [data.thumbnail_url] : [],
        thumbnailUrl: data.thumbnail_url ?? null,
        authorHandle: data.author_name ?? null,
        authorDisplayName: data.author_name ?? null,
        sourcePostId: null,
        isVideo: false,
      }
    }
  } catch {
    // oEmbed failed, fall through to graceful degrade
  }

  // Graceful degrade: save URL with no media (login wall or scrape failure)
  // Post will show "couldn't fetch media" state in UI
  return {
    caption: null,
    mediaUrls: [],
    thumbnailUrl: null,
    authorHandle: null,
    authorDisplayName: null,
    sourcePostId: null,
    isVideo: false,
  }
}

async function kickoffTranscription(post_id: string, mediaUrl: string): Promise<{ async: boolean; transcript?: string }> {
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/transcribe-callback`

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${Deno.env.get('REPLICATE_API_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'openai/whisper:4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2',
      input: { audio: mediaUrl, model: 'large-v3' },
      webhook: `${webhookUrl}?post_id=${post_id}`,
      webhook_events_filter: ['completed'],
    }),
  })

  if (!res.ok) {
    throw new Error(`Replicate error: ${await res.text()}`)
  }

  return { async: true }
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`)
  const buffer = await res.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const mediaType = contentType.includes('png') ? 'image/png' : contentType.includes('webp') ? 'image/webp' : 'image/jpeg'
  return { data: base64, mediaType }
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function setStatus(post_id: string, status: string, error?: string) {
  await supabase.from('posts').update({ status, ...(error ? { error_message: error } : {}) }).eq('id', post_id)
}

async function runJob<T>(
  post_id: string,
  stage: string,
  fn: () => Promise<T>
): Promise<T | null> {
  const { data: job } = await supabase
    .from('processing_jobs')
    .insert({ post_id, stage, status: 'running', started_at: new Date().toISOString() })
    .select('id')
    .single()

  try {
    const result = await fn()
    if (job) {
      await supabase.from('processing_jobs').update({
        status: 'success',
        completed_at: new Date().toISOString(),
      }).eq('id', job.id)
    }
    return result
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    if (job) {
      await supabase.from('processing_jobs').update({
        status: 'failed',
        error: errorMsg,
        completed_at: new Date().toISOString(),
      }).eq('id', job.id)
    }
    await setStatus(post_id, 'failed', errorMsg)
    return null
  }
}
