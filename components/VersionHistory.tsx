'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

type Version = {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string }
}

type Props = {
  documentId: string
  workspaceId: string
  onRestore: (content: string) => void
  onClose: () => void
}

function xmlToPlainText(xml: string): string {
  return xml
    .replace(/<paragraph>/g, '')
    .replace(/<\/paragraph>/g, '\n')
    .replace(/<heading[^>]*>/g, '')
    .replace(/<\/heading>/g, '\n')
    .replace(/<listItem>/g, '• ')
    .replace(/<\/listItem>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
}

export default function VersionHistory({
  documentId,
  workspaceId,
  onRestore,
  onClose
}: Props) {
  const [versions, setVersions] = useState<Version[]>([])
  const [selected, setSelected] = useState<Version | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVersions() {
      try {
        const data = await api.get(
          `/workspaces/${workspaceId}/documents/${documentId}`
        )
        setVersions(data.document.versions)
        if (data.document.versions.length > 0) {
          setSelected(data.document.versions[0])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchVersions()
  }, [documentId, workspaceId])

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl h-[600px]
                      flex flex-col overflow-hidden">

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Version History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Loading versions...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm">No versions saved yet</p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">

            {/* version list */}
            <div className="w-56 border-r overflow-y-auto flex-shrink-0">
              {versions.map((version, i) => (
                <div
                  key={version.id}
                  onClick={() => setSelected(version)}
                  className={`px-4 py-3 cursor-pointer border-b hover:bg-gray-50
                    ${selected?.id === version.id
                      ? 'bg-gray-50 border-l-2 border-l-gray-900'
                      : ''}`}
                >
                  <p className="text-xs font-medium text-gray-700">
                    {i === 0 ? 'Current' : `Version ${versions.length - i}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(version.createdAt)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {version.author.name}
                  </p>
                </div>
              ))}
            </div>

            {/* version preview */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                {selected ? (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700
                                  font-sans leading-relaxed">
                    {xmlToPlainText(selected.content) || '(empty document)'}
                  </pre>
                ) : (
                  <p className="text-gray-400 text-sm">
                    Select a version to preview
                  </p>
                )}
              </div>

              {selected && (
                <div className="border-t px-6 py-4 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Restoring will replace the current document content
                  </p>
                  <button
                    onClick={() => {
                      onRestore(selected.content)
                      onClose()
                    }}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg
                               text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    Restore this version
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}