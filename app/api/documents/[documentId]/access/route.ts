import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { user, error } = requireUser(req)
  if (error) return error

  const { documentId } = await params

  // find the document and check if user is a member of its workspace
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      workspace: {
        members: {
          some: { userId: user.userId }
        }
      }
    }
  })

  if (!document) {
    return NextResponse.json(
      { error: 'Document not found or access denied' },
      { status: 403 }
    )
  }

  return NextResponse.json({ ok: true, workspaceId: document.workspaceId })
}