// Placeholder until `supabase gen types typescript` is run against the real project.
// Replace this entire file with generated output after the migration is applied.
import type { Post, PostMetadata, Collection, CollectionPost, ProcessingJob } from '../types'

type PartialInsert<T> = Partial<T> & Record<string, unknown>

export type Database = {
  public: {
    Tables: {
      posts: {
        Row: Post
        Insert: PartialInsert<Post>
        Update: PartialInsert<Post>
        Relationships: []
      }
      post_metadata: {
        Row: PostMetadata
        Insert: PartialInsert<PostMetadata>
        Update: PartialInsert<PostMetadata>
        Relationships: []
      }
      collections: {
        Row: Collection
        Insert: PartialInsert<Collection>
        Update: PartialInsert<Collection>
        Relationships: []
      }
      collection_posts: {
        Row: CollectionPost
        Insert: PartialInsert<CollectionPost>
        Update: PartialInsert<CollectionPost>
        Relationships: []
      }
      processing_jobs: {
        Row: ProcessingJob
        Insert: PartialInsert<ProcessingJob>
        Update: PartialInsert<ProcessingJob>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      search_posts: {
        Args: {
          p_user_id: string
          p_query: string
          p_query_embedding: number[]
          p_category?: string | null
          p_limit?: number
        }
        Returns: { post_id: string; score: number }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
