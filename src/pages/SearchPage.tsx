import { Search } from 'lucide-react'
import { useSearch } from '@/hooks/useSearch'
import { PostGrid, PostCardSkeleton } from '@/components/posts/PostCard'
import { CATEGORIES } from '@/types'
import { cn } from '@/lib/cn'

export function SearchPage() {
  const { query, search, results, isPending, category, setCategory } = useSearch()

  return (
    <div className="p-4 space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          placeholder="Search your saved posts…"
          value={query}
          onChange={(e) => search(e.target.value)}
          className="w-full rounded-xl bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          autoFocus
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setCategory(undefined)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-xs transition-colors',
            !category ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          )}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat === category ? undefined : cat)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs transition-colors',
              category === cat ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {isPending && query.trim() && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)}
        </div>
      )}

      {!isPending && query.trim() && results.length === 0 && (
        <div className="py-16 text-center text-slate-500">
          No results for &ldquo;{query}&rdquo;
        </div>
      )}

      {!isPending && results.length > 0 && (
        <>
          <p className="text-xs text-slate-500">{results.length} result{results.length !== 1 ? 's' : ''}</p>
          <PostGrid posts={results} />
        </>
      )}

      {!query.trim() && (
        <div className="py-16 text-center text-slate-500 text-sm">
          Search by keyword, description, or anything you remember about the post.
        </div>
      )}
    </div>
  )
}
