import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Category, PostWithMetadata } from '@/types'

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error('Embedding failed')
  const { embedding } = await res.json()
  return embedding as number[]
}

export function useSearch() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [category, setCategory] = useState<Category | undefined>()

  const search = useCallback((q: string) => {
    setQuery(q)
    const t = setTimeout(() => setDebouncedQuery(q), 350)
    return () => clearTimeout(t)
  }, [])

  const { data: results = [], isPending } = useQuery({
    queryKey: ['search', user?.id, debouncedQuery, category],
    queryFn: async (): Promise<PostWithMetadata[]> => {
      if (!debouncedQuery.trim()) return []

      const embedding = await getEmbedding(debouncedQuery)

      const { data, error } = await supabase.rpc('search_posts', {
        p_user_id: user!.id,
        p_query: debouncedQuery,
        p_query_embedding: embedding,
        p_category: category ?? null,
        p_limit: 30,
      })
      if (error) throw error

      // Fetch full post data for each result
      const ids = (data ?? []).map((r: { post_id: string }) => r.post_id)
      if (!ids.length) return []

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*, post_metadata(*)')
        .in('id', ids)
      if (postsError) throw postsError

      // Preserve ranking order
      const postMap = new Map((posts ?? []).map((p) => [p.id, p as PostWithMetadata]))
      return ids.map((id: string) => postMap.get(id)).filter(Boolean) as PostWithMetadata[]
    },
    enabled: !!user && debouncedQuery.trim().length > 0,
  })

  return { query, search, results, isPending, category, setCategory }
}
