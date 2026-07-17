'use client'

import { useEffect, useState, useRef } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import Cookies from 'js-cookie'

type User = {
  id: string
  name: string
  email: string
}

const COLORS = [
  '#E53E3E', '#DD6B20', '#D69E2E',
  '#38A169', '#3182CE', '#805AD5'
]

export function useCollabEditor(documentId: string, user: User) {
  const [connected, setConnected] = useState(false)
  const [awarenessUsers, setAwarenessUsers] = useState<any[]>([])
  const [ydoc] = useState(() => new Y.Doc())

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc }),
    ],
    immediatelyRender: false
  })

  useEffect(() => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]

    const token = Cookies.get('token') ?? ''

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001'

    const provider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
      `doc/${documentId}`,
      ydoc,
      { params: { token } }
    )

    provider.awareness.setLocalStateField('user', {
      name: user.name,
      color,
      id: user.id
    })

    const handleStatus = ({ status }: { status: string }) => {
      setConnected(status === 'connected')
    }

    const handleAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().values())
      setAwarenessUsers(
        states.filter((s: any) => s.user).map((s: any) => s.user)
      )
    }

    provider.on('status', handleStatus)
    provider.awareness.on('change', handleAwarenessChange)

    return () => {
      provider.off('status', handleStatus)
      provider.awareness.off('change', handleAwarenessChange)
      provider.destroy()
    }
  }, [documentId, ydoc, user])

  return { editor, connected, awarenessUsers }
}