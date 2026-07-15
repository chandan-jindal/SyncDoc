import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/workspaces/:workspaceId/documents
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { user, error } = requireUser(req)
  if (error) return error

  const { workspaceId } = await params

  // verify user is a member of this workspace
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: user.userId, workspaceId }
    }
  })

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const documents = await prisma.document.findMany({
    where: { workspaceId },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      _count: { select: { versions: true } }
    },
    orderBy: { updatedAt: 'desc' }
  })

  return NextResponse.json({ documents })
}

// POST /api/workspaces/:workspaceId/documents
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { user, error } = requireUser(req)
  if (error) return error

  const { workspaceId } = await params
  const { title } = await req.json()

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: user.userId, workspaceId }
    }
  })

  if (!membership || membership.role === 'VIEWER') {
    return NextResponse.json(
      { error: 'You do not have permission to create documents' },
      { status: 403 }
    )
  }

  const document = await prisma.document.create({
    data: {
      title: title?.trim() || 'Untitled',
      workspaceId,
      creatorId: user.userId
    },
    include: {
      creator: { select: { id: true, name: true, email: true } }
    }
  })

  return NextResponse.json({ document }, { status: 201 })
}