import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ workspaceId: string; documentId: string }> }

// helper — check membership and return it
async function getMembership(userId: string, workspaceId: string) {
  return prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId }
    }
  })
}

// GET /api/workspaces/:workspaceId/documents/:documentId
export async function GET(req: NextRequest, { params }: Params) {
  const { user, error } = requireUser(req)
  if (error) return error

  const { workspaceId, documentId } = await params

  const membership = await getMembership(user.userId, workspaceId)
  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, workspaceId },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      versions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          author: { select: { id: true, name: true } }
        }
      }
    }
  })

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  return NextResponse.json({ document })
}

// PATCH /api/workspaces/:workspaceId/documents/:documentId
export async function PATCH(req: NextRequest, { params }: Params) {
  const { user, error } = requireUser(req)
  if (error) return error

  const { workspaceId, documentId } = await params
  const { title, content } = await req.json()

  const membership = await getMembership(user.userId, workspaceId)
  if (!membership || membership.role === 'VIEWER') {
    return NextResponse.json(
      { error: 'You do not have permission to edit documents' },
      { status: 403 }
    )
  }

  const document = await prisma.document.update({
    where: { id: documentId },
    data: {
      ...(title && { title: title.trim() }),
      ...(content !== undefined && { content })
    }
  })

  // save a version snapshot whenever content changes
  if (content !== undefined) {
    await prisma.documentVersion.create({
      data: {
        documentId,
        content,
        authorId: user.userId
      }
    })
  }

  return NextResponse.json({ document })
}

// DELETE /api/workspaces/:workspaceId/documents/:documentId
export async function DELETE(req: NextRequest, { params }: Params) {
  const { user, error } = requireUser(req)
  if (error) return error

  const { workspaceId, documentId } = await params

  const membership = await getMembership(user.userId, workspaceId)
  if (!membership || membership.role === 'VIEWER') {
    return NextResponse.json(
      { error: 'You do not have permission to delete documents' },
      { status: 403 }
    )
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, workspaceId }
  })

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  await prisma.document.delete({ where: { id: documentId } })

  return NextResponse.json({ message: 'Document deleted' })
}