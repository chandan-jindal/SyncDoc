'use client'

import { useState } from 'react'
import { useCollabEditor } from '@/hooks/useCollabEditor'
import { EditorContent } from '@tiptap/react'
import VersionHistory from './VersionHistory'

type Props = {
  documentId: string
  workspaceId: string
  user: { id: string; name: string; email: string }
}

function xmlToHtml(xml: string): string {
  return xml
    .replace(/<paragraph>/g, '<p>')
    .replace(/<\/paragraph>/g, '</p>')
    .replace(/<heading level="1">/g, '<h1>')
    .replace(/<\/heading>/g, '</h1>')
    .replace(/<heading level="2">/g, '<h2>')
    .replace(/<bulletList>/g, '<ul>')
    .replace(/<\/bulletList>/g, '</ul>')
    .replace(/<listItem>/g, '<li>')
    .replace(/<\/listItem>/g, '</li>')
    .replace(/<hardBreak>/g, '<br>')
    .replace(/<bold>/g, '<strong>')
    .replace(/<\/bold>/g, '</strong>')
    .replace(/<italic>/g, '<em>')
    .replace(/<\/italic>/g, '</em>')
}

export default function Editor({ documentId, workspaceId, user }: Props) {
  const { editor, connected, awarenessUsers } = useCollabEditor(documentId, user)
  const [showHistory, setShowHistory] = useState(false)

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-400">Loading editor...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">

      {/* toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
        <div className="flex gap-2">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-3 py-1 rounded text-sm font-medium border
              ${editor.isActive('bold')
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-3 py-1 rounded text-sm font-medium border italic
              ${editor.isActive('italic')
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-3 py-1 rounded text-sm font-medium border
              ${editor.isActive('heading', { level: 1 })
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-3 py-1 rounded text-sm font-medium border
              ${editor.isActive('heading', { level: 2 })
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-3 py-1 rounded text-sm font-medium border
              ${editor.isActive('bulletList')
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
          >
            • List
          </button>
        </div>

        {/* presence + history */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(true)}
            className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1
                       rounded border hover:bg-gray-50 transition-colors"
          >
            History
          </button>
          <div className="flex -space-x-2">
            {awarenessUsers.map((u, i) => (
              <div
                key={i}
                title={u.name}
                style={{ backgroundColor: u.color }}
                className="w-8 h-8 rounded-full flex items-center justify-center
                           text-white text-xs font-semibold ring-2 ring-white"
              >
                {u.name?.[0]?.toUpperCase()}
              </div>
            ))}
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full
            ${connected
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
            }`}
          >
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* editor */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-3xl mx-auto my-12 bg-white shadow-sm rounded-lg p-12">
          <EditorContent
            editor={editor}
            className="prose prose-lg max-w-none min-h-[500px] focus:outline-none"
          />
        </div>
      </div>

      {/* version history modal */}
      {showHistory && (
        <VersionHistory
          documentId={documentId}
          workspaceId={workspaceId}
          onRestore={(content) => {
            editor.commands.setContent(xmlToHtml(content))
          }}
          onClose={() => setShowHistory(false)}
        />
      )}

    </div>
  )
}