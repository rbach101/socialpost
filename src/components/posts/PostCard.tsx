import { Link } from 'react-router-dom'
import { BookmarkPlus, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/cn'
import { StatusBadge } from './StatusBadge'
import type { PostWithMetadata } from '@/types'

interface PostCardProps {
  post: PostWithMetadata
  onAddToCollection?: (postId: string) => void
}

export function PostCard({ post, onAddToCollection }: PostCardProps) {
  const meta = post.post_metadata
  const thumbnail = post.thumbnail_url ?? post.media_urls[0]

  return (
    <div className="group relative overflow-hidden rounded-xl bg-slate-800 transition-transform hover:-translate-y-0.5 hover:shadow-xl">
      <Link to={`/posts/${post.id}`}>
        {thumbnail ? (
          <div className="aspect-square overflow-hidden bg-slate-900">
            <img
              src={thumbnail}
              alt={meta?.summary ?? 'Post thumbnail'}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-square bg-slate-900 flex items-center justify-center">
            <span className="text-slate-600 text-sm">No media</span>
          </div>
        )}

        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <StatusBadge status={post.status} />
            {meta?.primary_category && (
              <span className="text-xs text-slate-400">{meta.primary_category}</span>
            )}
          </div>

          {meta?.summary && (
            <p className="text-sm text-slate-200 line-clamp-2">{meta.summary}</p>
          )}

          {post.author_handle && (
            <p className="text-xs text-slate-500">@{post.author_handle}</p>
          )}

          {meta?.sub_tags && meta.sub_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {meta.sub_tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-400">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {onAddToCollection && (
          <button
            onClick={(e) => { e.preventDefault(); onAddToCollection(post.id) }}
            className="rounded-lg bg-slate-900/80 p-1.5 text-slate-300 backdrop-blur hover:text-white"
            aria-label="Add to collection"
          >
            <BookmarkPlus className="h-4 w-4" />
          </button>
        )}
        <a
          href={post.source_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg bg-slate-900/80 p-1.5 text-slate-300 backdrop-blur hover:text-white"
          aria-label="View original"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}

export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-slate-800 animate-pulse">
      <div className="aspect-square bg-slate-700" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-16 rounded bg-slate-700" />
        <div className="h-3 w-full rounded bg-slate-700" />
        <div className="h-3 w-3/4 rounded bg-slate-700" />
      </div>
    </div>
  )
}

export function PostGrid({ posts, onAddToCollection, className }: {
  posts: PostWithMetadata[]
  onAddToCollection?: (postId: string) => void
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4', className)}>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onAddToCollection={onAddToCollection} />
      ))}
    </div>
  )
}
