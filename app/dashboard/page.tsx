'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

type Workspace = {
  id: string
  name: string
  owner: { id: string; name: string }
  _count: { members: number; documents: number }
}

export default function DashboardPage() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()

  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) fetchWorkspaces()
  }, [user])

  async function fetchWorkspaces() {
    try {
      const data = await api.get('/workspaces')
      setWorkspaces(data.workspaces)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function createWorkspace() {
  if (!newWorkspaceName.trim()) return
  setCreating(true)
  try {
    await api.post('/workspaces', { name: newWorkspaceName })
    setNewWorkspaceName('')
    await fetchWorkspaces()  // refetch instead of manually appending
  } catch (err: any) {
    setError(err.message)
  } finally {
    setCreating(false)
  }
}

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* navbar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">SyncDocs</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.name}</span>
          <button
            onClick={() => { logout(); router.push('/login') }}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* create workspace */}
        <div className="bg-white rounded-xl border p-6 mb-8">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            New Workspace
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={e => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name"
              onKeyDown={e => e.key === 'Enter' && createWorkspace()}
              className="flex-1 border rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              onClick={createWorkspace}
              disabled={creating || !newWorkspaceName.trim()}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm
                         font-medium hover:bg-gray-700 disabled:opacity-50
                         transition-colors"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        {/* workspaces list */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
            Your Workspaces
          </h2>

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          {workspaces.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <p className="text-gray-400 text-sm">
                No workspaces yet — create one above
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {workspaces.map(workspace => (
                <div
                  key={workspace.id}
                  onClick={() => router.push(`/dashboard/${workspace.id}`)}
                  className="bg-white rounded-xl border p-5 cursor-pointer
                             hover:border-gray-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {workspace.name}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {workspace._count.members} member{workspace._count.members !== 1 ? 's' : ''} ·{' '}
                        {workspace._count.documents} document{workspace._count.documents !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-gray-300 text-lg">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}