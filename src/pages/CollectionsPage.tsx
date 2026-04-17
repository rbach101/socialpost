import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, BookMarked } from 'lucide-react'
import { useCollections, useCreateCollection } from '@/hooks/useCollections'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function CollectionsPage() {
  const { data: collections = [], isPending } = useCollections()
  const { mutateAsync: create, isPending: isCreating } = useCreateCollection()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    await create({ name: name.trim(), description: desc.trim() || undefined })
    setName('')
    setDesc('')
    setShowCreate(false)
  }

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">Collections</h1>
        <Button size="sm" variant="secondary" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3">
          <Input
            id="cname"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Restaurants in Kona"
            autoFocus
          />
          <Input
            id="cdesc"
            label="Description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder=""
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} isLoading={isCreating} disabled={!name.trim()}>
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isPending && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      )}

      {!isPending && collections.length === 0 && (
        <div className="py-16 text-center text-slate-500 text-sm">
          No collections yet. Create one to organize your saved posts.
        </div>
      )}

      <div className="space-y-2">
        {collections.map((c) => (
          <Link
            key={c.id}
            to={`/collections/${c.id}`}
            className="flex items-center gap-4 rounded-xl bg-slate-800 p-4 hover:bg-slate-700 transition-colors"
          >
            <BookMarked className="h-5 w-5 shrink-0 text-indigo-400" />
            <div className="min-w-0">
              <p className="font-medium text-slate-200 truncate">{c.name}</p>
              {c.description && <p className="text-sm text-slate-400 truncate">{c.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
