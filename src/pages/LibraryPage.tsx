import { useState } from 'react'
import { usePosts } from '@/hooks/usePosts'
import { PostGrid, PostCardSkeleton } from '@/components/posts/PostCard'
import { CATEGORIES, type Category } from '@/types'
import { cn } from '@/lib/cn'

export function LibraryPage() {
  const [activeCategory, setActiveCategory] = useState<Category | undefined>()
  const { data: posts = [], isPending, error } = usePosts(activeCategory)

  // Group posts by category when no filter active
  const grouped = activeCategory
    ? { [activeCategory]: posts }
    : posts.reduce<Partial<Record<string, typeof posts>>>((acc, post) => {
        const cat = post.post_metadata?.primary_category ?? 'Other'
        if (!acc[cat]) acc[cat] = []
        acc[cat]!.push(post)
        return acc
      }, {})

  return (
    <div className="p-4 space-y-6">
      {/* Category filter strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCategory(undefined)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-sm transition-colors',
            !activeCategory ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          )}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat === activeCategory ? undefined : cat)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-sm transition-colors',
              activeCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300">
          Failed to load posts: {error.message}
        </div>
      )}

      {isPending && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <PostCardSkeleton key={i} />)}
        </div>
      )}

      {!isPending && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-slate-400">No posts yet.</p>
          <p className="mt-1 text-sm text-slate-500">Share an Instagram post into this app to get started.</p>
        </div>
      )}

      {!isPending && Object.entries(grouped).map(([category, categoryPosts]) =>
        categoryPosts && categoryPosts.length > 0 ? (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold text-slate-300">{category}</h2>
            <PostGrid posts={categoryPosts} />
          </section>
        ) : null
      )}
    </div>
  )
}
