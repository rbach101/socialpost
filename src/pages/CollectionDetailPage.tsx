import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useCollections, useCollectionPosts, useDeleteCollection } from '@/hooks/useCollections'
import { PostGrid, PostCardSkeleton } from '@/components/posts/PostCard'
import type { PostWithMetadata } from '@/types'

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: collections = [] } = useCollections()
  const { data: items = [], isPending } = useCollectionPosts(id!)
  const { mutate: del, isPending: isDeleting } = useDeleteCollection()

  const collection = collections.find((c) => c.id === id)

  const posts: PostWithMetadata[] = items
    .map((item: { posts: PostWithMetadata }) => item.posts)
    .filter(Boolean)

  const handleDelete = () => {
    if (!confirm(`Delete collection "${collection?.name}"?`)) return
    del(id!, { onSuccess: () => navigate('/collections') })
  }

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-100 truncate mx-3 flex-1">
          {collection?.name ?? '…'}
        </h1>
        <button onClick={handleDelete} disabled={isDeleting} className="text-slate-400 hover:text-red-400">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {collection?.description && (
        <p className="text-sm text-slate-400">{collection.description}</p>
      )}

      {isPending && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)}
        </div>
      )}

      {!isPending && posts.length === 0 && (
        <div className="py-16 text-center text-slate-500 text-sm">
          No posts in this collection yet. Add from post detail.
        </div>
      )}

      {!isPending && posts.length > 0 && <PostGrid posts={posts} />}
    </div>
  )
}
