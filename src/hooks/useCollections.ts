import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Collection } from '@/types'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function useCollections() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['collections', user?.id],
    queryFn: async (): Promise<Collection[]> => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })
}

export function useCollectionPosts(collectionId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['collection-posts', collectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_posts')
        .select('*, posts(*, post_metadata(*))')
        .eq('collection_id', collectionId)
        .order('added_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!user && !!collectionId,
  })
}

export function useCreateCollection() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('collections')
        .insert({ user_id: user!.id, name, slug: slugify(name), description: description ?? null })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] }),
  })
}

export function useAddToCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ collectionId, postId }: { collectionId: string; postId: string }) => {
      const { error } = await supabase
        .from('collection_posts')
        .insert({ collection_id: collectionId, post_id: postId, added_by: 'user' })
      if (error) throw error
    },
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['collection-posts', collectionId] })
    },
  })
}

export function useRemoveFromCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ collectionId, postId }: { collectionId: string; postId: string }) => {
      const { error } = await supabase
        .from('collection_posts')
        .delete()
        .eq('collection_id', collectionId)
        .eq('post_id', postId)
      if (error) throw error
    },
    onSuccess: (_data, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['collection-posts', collectionId] })
    },
  })
}

export function useDeleteCollection() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (collectionId: string) => {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collections'] }),
  })
}
