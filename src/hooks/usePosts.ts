import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { PostWithMetadata, PostStatus } from '@/types'

export function usePosts(category?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['posts', user?.id, category],
    queryFn: async (): Promise<PostWithMetadata[]> => {
      let query = supabase
        .from('posts')
        .select('*, post_metadata(*)')
        .eq('user_id', user!.id)
        .order('shared_at', { ascending: false })

      if (category) {
        query = query.eq('post_metadata.primary_category', category)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as PostWithMetadata[]
    },
    enabled: !!user,
  })
}

export function usePost(id: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['post', id],
    queryFn: async (): Promise<PostWithMetadata | null> => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, post_metadata(*)')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single()
      if (error) throw error

      // Track view
      await supabase
        .from('posts')
        .update({ last_viewed_at: new Date().toISOString(), view_count: (data.view_count ?? 0) + 1 })
        .eq('id', id)

      return data as PostWithMetadata
    },
    enabled: !!user && !!id,
  })
}

export function useIngestPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (url: string): Promise<{ post_id: string }> => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message ?? 'Ingest failed')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export function usePostStatus(postId: string, currentStatus: PostStatus) {
  const queryClient = useQueryClient()

  // Realtime subscription for live status updates
  const subscribe = () => {
    if (currentStatus === 'ready' || currentStatus === 'failed') return

    const channel = supabase
      .channel(`post-${postId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts', filter: `id=eq.${postId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['post', postId] })
          queryClient.invalidateQueries({ queryKey: ['posts'] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }

  return subscribe
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
