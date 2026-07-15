import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/workspaces - get all workspaces for logged in user
export async function GET(req: NextRequest) {
  const { user, error } = requireUser(req)
  if (error) return error

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: { userId: user.userId }
      }
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      _count: {
        select: { members: true, documents: true }
      }
    }
  })

  return NextResponse.json({ workspaces })
}

// POST /api/workspaces - create a workspace
export async function POST(req: NextRequest) {
  const { user, error } = requireUser(req)
  if (error) return error

  const { name } = await req.json()

  if (!name || name.trim() === '') {
    return NextResponse.json(
      { error: 'Workspace name is required' },
      { status: 400 }
    )
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: name.trim(),
      ownerId: user.userId,
      members: {
        create: {
          userId: user.userId,
          role: 'OWNER'
        }
      }
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      }
    }
  })

  return NextResponse.json({ workspace }, { status: 201 })
}