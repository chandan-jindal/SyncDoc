'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

type Document = {
  id: string
  title: string
  updatedAt: string
  creator: { id: string; name: string }
  _count: { versions: number }
}

type Workspace = {
  id: string
  name: string
  owner: { id: string; name: string }
  members: { user: { id: string; name: string }; role: string }[]
}

export default function WorkspacePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { workspaceId } = useParams() as { workspaceId: string }

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [newDocTitle, setNewDocTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (user && workspaceId) {
      fetchWorkspace()
      fetchDocuments()
    }
  }, [user, workspaceId])

  async function fetchWorkspace() {
    try {
      const data = await api.get(`/workspaces/${workspaceId}`)
      setWorkspace(data.workspace)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function fetchDocuments() {
    try {
      const data = await api.get(`/workspaces/${workspaceId}/documents`)
      setDocuments(data.documents)
    } catch (err: any) {
      setError(err.message)
    }
  }

 async function createDocument() {
  if (!newDocTitle.trim()) return
  setCreating(true)
  try {
    await api.post(`/workspaces/${workspaceId}/documents`, {
      title: newDocTitle
    })
    setNewDocTitle('')
    await fetchDocuments()  // refetch instead of manually appending
  } catch (err: any) {
    setError(err.message)
  } finally {
    setCreating(false)
  }
}

  async function inviteMember() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg('')
    try {
      await api.post(`/workspaces/${workspaceId}/members`, {
        email: inviteEmail,
        role: 'EDITOR'
      })
      setInviteEmail('')
      setInviteMsg('Invited successfully')
      fetchWorkspace()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading || !workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* navbar */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-gray-400 hover:text-gray-900"
        >
          ← Workspaces
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-medium text-gray-900">{workspace.name}</h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-3 gap-8">

        {/* left — documents */}
        <div className="col-span-2">

          {/* create document */}
          <div className="bg-white rounded-xl border p-5 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-3">
              New Document
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newDocTitle}
                onChange={e => setNewDocTitle(e.target.value)}
                placeholder="Document title"
                onKeyDown={e => e.key === 'Enter' && createDocument()}
                className="flex-1 border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                onClick={createDocument}
                disabled={creating || !newDocTitle.trim()}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm
                           font-medium hover:bg-gray-700 disabled:opacity-50
                           transition-colors"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {/* documents list */}
          <div className="grid gap-3">
            {documents.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <p className="text-gray-400 text-sm">
                  No documents yet — create one above
                </p>
              </div>
            ) : (
              documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => router.push(`/doc/${doc.id}`)}
                  className="bg-white rounded-xl border p-5 cursor-pointer
                             hover:border-gray-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{doc.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Updated {formatDate(doc.updatedAt)} ·{' '}
                        by {doc.creator.name} ·{' '}
                        {doc._count.versions} version{doc._count.versions !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-gray-300 text-lg">→</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* right — members + invite */}
        <div>
          <div className="bg-white rounded-xl border p-5 mb-4">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Members</h2>
            <div className="space-y-3">
              {workspace.members.map((m, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center
                                    justify-center text-xs font-medium text-gray-600">
                      {m.user.name[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700">{m.user.name}</span>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">
                    {m.role.toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* invite */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-medium text-gray-700 mb-3">
              Invite Member
            </h2>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              onKeyDown={e => e.key === 'Enter' && inviteMember()}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-2
                         focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              onClick={inviteMember}
              disabled={inviting || !inviteEmail.trim()}
              className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm
                         font-medium hover:bg-gray-700 disabled:opacity-50
                         transition-colors"
            >
              {inviting ? 'Inviting...' : 'Invite'}
            </button>
            {inviteMsg && (
              <p className="text-green-600 text-xs mt-2">{inviteMsg}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}