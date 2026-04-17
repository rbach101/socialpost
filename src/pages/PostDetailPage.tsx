import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, RefreshCw, Trash2 } from 'lucide-react'
import { usePost, usePostStatus, useDeletePost } from '@/hooks/usePosts'
import { StatusBadge } from '@/components/posts/StatusBadge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: post, isPending, error, refetch } = usePost(id!)
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost()
  const subscribeToStatus = usePostStatus(id!, post?.status ?? 'pending')
  const unsubRef = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    unsubRef.current = subscribeToStatus() ?? undefined
    return () => unsubRef.current?.()
  }, [subscribeToStatus])

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return
    deletePost(id!, { onSuccess: () => navigate('/library') })
  }

  if (isPending) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 w-8 rounded bg-slate-800" />
        <div className="aspect-square rounded-xl bg-slate-800" />
        <div className="h-4 w-3/4 rounded bg-slate-800" />
        <div className="h-4 w-1/2 rounded bg-slate-800" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="p-4">
        <button onClick={() => navigate(-1)} className="mb-4 text-slate-400 hover:text-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-red-400">{error?.message ?? 'Post not found'}</p>
      </div>
    )
  }

  const meta = post.post_metadata

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <StatusBadge status={post.status} />
          {post.status === 'failed' && (
            <button onClick={() => refetch()} className="text-slate-400 hover:text-slate-100">
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={post.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1.5 text-slate-400 hover:text-slate-100"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button onClick={handleDelete} disabled={isDeleting} className="rounded p-1.5 text-slate-400 hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Media */}
      {post.media_urls.length > 0 ? (
        <div className="overflow-x-auto">
          <div className={cn('flex gap-1', post.media_urls.length === 1 ? '' : 'w-max')}>
            {post.media_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Media ${i + 1}`}
                className={cn('object-cover', post.media_urls.length === 1 ? 'w-full max-h-[60vh]' : 'h-64 w-64')}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="aspect-square bg-slate-900 flex items-center justify-center text-slate-600 text-sm">
          {post.status === 'ready' ? 'No media' : 'Media processing…'}
        </div>
      )}

      <div className="p-4 space-y-5">
        {/* Author */}
        {post.author_handle && (
          <div>
            <p className="font-medium text-slate-200">@{post.author_handle}</p>
            {post.author_display_name && <p className="text-sm text-slate-400">{post.author_display_name}</p>}
          </div>
        )}

        {/* AI summary */}
        {meta?.summary && (
          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">Summary</p>
            <p className="text-sm text-slate-200">{meta.summary}</p>
          </div>
        )}

        {/* Category + tags */}
        {meta && (
          <div className="space-y-2">
            {meta.primary_category && (
              <span className="inline-flex rounded-full bg-indigo-900 px-3 py-1 text-xs font-medium text-indigo-300">
                {meta.primary_category}
              </span>
            )}
            {meta.sub_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {meta.sub_tags.map((tag) => (
                  <span key={tag} className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Entities */}
        {meta?.entities && Object.entries(meta.entities).some(([, v]) => v.length > 0) && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Identified</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(meta.entities).map(([key, values]) =>
                values.length > 0 ? (
                  <div key={key}>
                    <p className="text-xs text-slate-500 capitalize">{key}</p>
                    {values.map((v) => <p key={v} className="text-slate-300">{v}</p>)}
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Caption</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{post.caption}</p>
          </div>
        )}

        {/* Transcript */}
        {meta?.audio_transcript && (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Transcript</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{meta.audio_transcript}</p>
          </div>
        )}

        {/* Error state */}
        {post.status === 'failed' && post.error_message && (
          <div className="rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300 space-y-2">
            <p className="font-medium">Processing failed</p>
            <p className="text-xs font-mono">{post.error_message}</p>
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
