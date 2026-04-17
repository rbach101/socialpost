import { NavLink, Outlet } from 'react-router-dom'
import { Home, Search, BookMarked, Plus, LogOut } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/contexts/AuthContext'

const nav = [
  { to: '/library', icon: Home, label: 'Library' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/add', icon: Plus, label: 'Add' },
  { to: '/collections', icon: BookMarked, label: 'Collections' },
]

export function AppShell() {
  const { signOut } = useAuth()

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 px-4">
        <span className="font-semibold tracking-tight">Posts</span>
        <button onClick={signOut} className="rounded p-1.5 text-slate-400 hover:text-slate-100">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <nav className="shrink-0 border-t border-slate-800 bg-slate-950">
        <div className="flex">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors',
                  isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
