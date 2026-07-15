'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import EditorWrapper from './EditorWrapper'
import { api } from '@/lib/api'

export default function DocumentPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { documentId } = useParams() as { documentId: string }
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !documentId) return

    async function checkAccess() {
      try {
        const data = await api.get(`/documents/${documentId}/access`)
        console.log('access data:', data)
        setWorkspaceId(data.workspaceId)
        setAuthorized(true)
      } catch (err) {
        console.error('access check failed:', err)
        router.push('/dashboard')
      } finally {
        setChecking(false)
      }
    }

    checkAccess()
  }, [user, documentId])

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!authorized || !user || !workspaceId) return null

  return (
    <EditorWrapper
      documentId={documentId}
      workspaceId={workspaceId}
      user={user}
    />
  )
}