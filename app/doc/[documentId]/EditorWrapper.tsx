'use client'

import dynamic from 'next/dynamic'

type Props = {
  documentId: string
  workspaceId: string
  user: { id: string; name: string; email: string }
}

const Editor = dynamic<Props>(
  () => import('@/components/Editor').then(mod => mod),
  { ssr: false }
)

export default function EditorWrapper({ documentId, workspaceId, user }: Props) {
  return <Editor documentId={documentId} workspaceId={workspaceId} user={user} />
}