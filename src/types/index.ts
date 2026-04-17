export type PostStatus = 'pending' | 'fetching' | 'processing' | 'ready' | 'failed'
export type ContentType = 'image' | 'video' | 'reel' | 'carousel' | 'unknown'
export type SourcePlatform = 'instagram' | 'tiktok' | 'pinterest' | 'web' | 'screenshot' | 'other'

export const CATEGORIES = [
  'Food', 'Travel', 'Fashion', 'Home', 'Fitness', 'Beauty',
  'Art', 'Music', 'Tech', 'Education', 'Humor', 'Business',
  'Nature', 'Sports', 'Other',
] as const
export type Category = typeof CATEGORIES[number]

export interface Post {
  id: string
  user_id: string
  source_platform: SourcePlatform
  source_url: string
  source_post_id: string | null
  author_handle: string | null
  author_display_name: string | null
  caption: string | null
  media_urls: string[]
  thumbnail_url: string | null
  media_storage_paths: string[]
  status: PostStatus
  error_message: string | null
  shared_at: string
  created_at: string
  updated_at: string
  last_viewed_at: string | null
  view_count: number
}

export interface PostMetadata {
  post_id: string
  summary: string | null
  primary_category: Category | null
  sub_tags: string[]
  entities: {
    people: string[]
    places: string[]
    brands: string[]
    products: string[]
  }
  content_type: ContentType
  extracted_text: string | null
  audio_transcript: string | null
  extraction_model: string | null
  extraction_version: number
  extracted_at: string
}

export interface PostEmbedding {
  post_id: string
  embedding_model: string
  text_hash: string
  created_at: string
}

export interface Collection {
  id: string
  user_id: string
  name: string
  slug: string
  description: string | null
  cover_post_id: string | null
  is_smart: boolean
  created_at: string
  updated_at: string
}

export interface CollectionPost {
  collection_id: string
  post_id: string
  added_at: string
  added_by: 'user' | 'auto'
}

export interface ProcessingJob {
  id: string
  post_id: string
  stage: 'fetch' | 'transcribe' | 'vision' | 'embed'
  status: 'pending' | 'running' | 'success' | 'failed'
  attempt: number
  error: string | null
  payload: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface PostWithMetadata extends Post {
  post_metadata: PostMetadata | null
}

export interface SearchResult {
  post_id: string
  score: number
  post: PostWithMetadata
}

export interface ExtractedMetadata {
  summary: string
  primary_category: Category
  sub_tags: string[]
  entities: {
    people: string[]
    places: string[]
    brands: string[]
    products: string[]
  }
  content_type: ContentType
  extracted_text: string
}
