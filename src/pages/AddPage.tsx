import { useState, useEffect, type FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useIngestPost } from '@/hooks/usePosts'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function AddPage() {
  const [url, setUrl] = useState('')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { mutateAsync, isPending, error } = useIngestPost()

  // Handle share target: /share-target?url=...&text=...
  useEffect(() => {
    const sharedUrl = searchParams.get('url') ?? searchParams.get('text') ?? ''
    if (sharedUrl.startsWith('http')) {
      setUrl(sharedUrl)
    }
  }, [searchParams])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    try {
      const { post_id } = await mutateAsync(url.trim())
      navigate(`/posts/${post_id}`)
    } catch {
      // error shown below
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Save a post</h1>
        <p className="mt-1 text-sm text-slate-400">Paste an Instagram URL or share directly from the app.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="url"
          type="url"
          label="Post URL"
          placeholder="https://www.instagram.com/p/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
        />

        {error && (
          <div className="rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300">
            {error instanceof Error ? error.message : 'Failed to save post'}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" isLoading={isPending} disabled={!url.trim()}>
          Save post
        </Button>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400 space-y-2">
        <p className="font-medium text-slate-300">Tip: Use the share sheet</p>
        <p>On iOS/Android, tap Share in Instagram → select <strong className="text-slate-200">Posts</strong> from your app list.</p>
      </div>
    </div>
  )
}
