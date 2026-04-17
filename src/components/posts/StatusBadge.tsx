import { cn } from '@/lib/cn'
import type { PostStatus } from '@/types'

const labels: Record<PostStatus, string> = {
  pending: 'Pending',
  fetching: 'Fetching',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
}

const styles: Record<PostStatus, string> = {
  pending: 'bg-slate-700 text-slate-300',
  fetching: 'bg-blue-900 text-blue-300 animate-pulse',
  processing: 'bg-amber-900 text-amber-300 animate-pulse',
  ready: 'bg-emerald-900 text-emerald-300',
  failed: 'bg-red-900 text-red-300',
}

export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', styles[status])}>
      {labels[status]}
    </span>
  )
}
